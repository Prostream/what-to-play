import { Router } from 'express';
import { ObjectId } from 'mongodb';
import { getDb } from './db.js';

export const musicRouter = Router();

function validationError(res, message) {
  return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message } });
}

function serverError(res, error) {
  console.error('Music catalog request failed:', error);
  return res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'Could not load music right now.' },
  });
}

function parsePageNumber(value, fallback, maximum) {
  if (value === undefined) return fallback;
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) return null;
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number > maximum) return null;
  return number;
}

function parseFilter(value, maximumLength) {
  if (value === undefined) return '';
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed.length > maximumLength) return null;
  return trimmed;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function serializeSong(song) {
  return {
    id: song._id.toString(),
    title: song.title,
    artist: song.artist,
    genres: song.genres,
    moods: song.moods,
    tags: song.tags,
    sourceId: song.sourceId,
  };
}

musicRouter.get('/', async (req, res) => {
  const page = parsePageNumber(req.query.page, 1, Number.MAX_SAFE_INTEGER);
  const limit = parsePageNumber(req.query.limit, 20, 50);
  const q = parseFilter(req.query.q, 100);
  const genre = parseFilter(req.query.genre, 50);
  const mood = parseFilter(req.query.mood, 50);
  if (page === null || limit === null || q === null || genre === null || mood === null ||
      !Number.isSafeInteger((page - 1) * limit)) {
    return validationError(res, 'Invalid search or pagination parameter.');
  }

  const filter = {};
  if (q) filter.title = { $regex: escapeRegex(q), $options: 'i' };
  if (genre) filter.genres = genre.toLowerCase();
  if (mood) filter.moods = mood.toLowerCase();

  try {
    const songs = (await getDb()).collection('songs');
    const total = await songs.countDocuments(filter);
    const items = await songs.find(filter)
      .sort({ title: 1, _id: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray();
    return res.json({
      data: items.map(serializeSong),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return serverError(res, error);
  }
});

musicRouter.get('/:id', async (req, res) => {
  if (!/^[\da-f]{24}$/i.test(req.params.id)) {
    return validationError(res, 'Invalid music ID.');
  }

  try {
    const songs = (await getDb()).collection('songs');
    const song = await songs.findOne({ _id: new ObjectId(req.params.id) });
    if (!song) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Song not found.' } });
    }
    return res.json({ data: serializeSong(song) });
  } catch (error) {
    return serverError(res, error);
  }
});
