import { Router } from 'express';
import { ObjectId } from 'mongodb';
import { requireUser } from './auth/routes.js';
import { getMusicDb } from './music-db.js';
import { ensureMusicIndexes } from './music-indexes.js';

export const savedMusicRouter = Router();
savedMusicRouter.use(requireUser);

function errorResponse(res, status, code, message) {
  return res.status(status).json({ error: { code, message } });
}

function serverError(res, error) {
  console.error('Saved music request failed:', error);
  return errorResponse(
    res,
    500,
    'INTERNAL_ERROR',
    'Could not update saved music right now.',
  );
}

function objectId(value) {
  return typeof value === 'string' && /^[\da-f]{24}$/i.test(value)
    ? new ObjectId(value)
    : null;
}

function parsePageNumber(value, fallback, maximum) {
  if (value === undefined) return fallback;
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) return null;
  const number = Number(value);
  return Number.isSafeInteger(number) && number <= maximum ? number : null;
}

function parseBody(body, creating) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const allowed = creating
    ? ['itemId', 'status', 'rating', 'personalTags', 'notes']
    : ['status', 'rating', 'personalTags', 'notes'];
  if (Object.keys(body).some((key) => !allowed.includes(key))) return null;
  if (creating && !objectId(body.itemId)) return null;
  if (!creating && Object.keys(body).length === 0) return null;

  const fields = {};
  if (creating || Object.hasOwn(body, 'status')) {
    fields.status = body.status ?? (creating ? 'planned' : undefined);
    if (!['planned', 'completed'].includes(fields.status)) return null;
  }
  if (creating || Object.hasOwn(body, 'rating')) {
    fields.rating = body.rating ?? null;
    if (
      fields.rating !== null &&
      (!Number.isInteger(fields.rating) ||
        fields.rating < 1 ||
        fields.rating > 5)
    )
      return null;
  }
  if (creating || Object.hasOwn(body, 'personalTags')) {
    const tags = body.personalTags ?? (creating ? [] : null);
    if (
      !Array.isArray(tags) ||
      tags.some(
        (tag) =>
          typeof tag !== 'string' || !tag.trim() || tag.trim().length > 50,
      )
    )
      return null;
    fields.personalTags = [
      ...new Set(tags.map((tag) => tag.trim().toLowerCase())),
    ];
  }
  if (creating || Object.hasOwn(body, 'notes')) {
    fields.notes = body.notes ?? (creating ? '' : null);
    if (typeof fields.notes !== 'string') return null;
    fields.notes = fields.notes.trim();
  }
  return fields;
}

function serializeSaved(saved, item) {
  return {
    id: saved._id.toString(),
    itemId: saved.itemId.toString(),
    status: saved.status,
    rating: saved.rating,
    personalTags: saved.personalTags,
    notes: saved.notes,
    createdAt: saved.createdAt.toISOString(),
    updatedAt: saved.updatedAt.toISOString(),
    item: item
      ? { id: item._id.toString(), title: item.title, artist: item.artist }
      : null,
  };
}

savedMusicRouter.get('/', async (req, res) => {
  const page = parsePageNumber(req.query.page, 1, Number.MAX_SAFE_INTEGER);
  const limit = parsePageNumber(req.query.limit, 20, 50);
  if (
    page === null ||
    limit === null ||
    !Number.isSafeInteger((page - 1) * limit)
  ) {
    return errorResponse(
      res,
      400,
      'VALIDATION_ERROR',
      'Invalid pagination parameter.',
    );
  }

  try {
    const savedMusic = (await getMusicDb()).collection('savedMusic');
    const userId = new ObjectId(req.user.id);
    const total = await savedMusic.countDocuments({ userId });
    const records = await savedMusic
      .aggregate([
        { $match: { userId } },
        {
          $lookup: {
            from: 'songs',
            localField: 'itemId',
            foreignField: '_id',
            as: 'item',
          },
        },
        { $unwind: { path: '$item', preserveNullAndEmptyArrays: true } },
        { $sort: { 'item.title': 1, _id: 1 } },
        { $skip: (page - 1) * limit },
        { $limit: limit },
      ])
      .toArray();
    return res.json({
      data: records.map((record) => serializeSaved(record, record.item)),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return serverError(res, error);
  }
});

savedMusicRouter.post('/', async (req, res) => {
  const fields = parseBody(req.body, true);
  if (!fields)
    return errorResponse(
      res,
      400,
      'VALIDATION_ERROR',
      'Invalid saved music fields.',
    );

  try {
    const db = await getMusicDb();
    await ensureMusicIndexes(db);
    const userId = new ObjectId(req.user.id);
    const itemId = objectId(req.body.itemId);
    const item = await db
      .collection('songs')
      .findOne({ _id: itemId }, { projection: { title: 1, artist: 1 } });
    if (!item) return errorResponse(res, 404, 'NOT_FOUND', 'Song not found.');

    const savedMusic = db.collection('savedMusic');
    const now = new Date();
    const saved = { userId, itemId, ...fields, createdAt: now, updatedAt: now };
    const result = await savedMusic.insertOne(saved);
    return res.status(201).json({
      data: serializeSaved({ ...saved, _id: result.insertedId }, item),
    });
  } catch (error) {
    if (error.code === 11000) {
      return errorResponse(
        res,
        409,
        'ALREADY_SAVED',
        'This song is already saved.',
      );
    }
    return serverError(res, error);
  }
});

savedMusicRouter.get('/:id', async (req, res) => {
  const id = objectId(req.params.id);
  if (!id)
    return errorResponse(
      res,
      400,
      'VALIDATION_ERROR',
      'Invalid saved music ID.',
    );

  try {
    const db = await getMusicDb();
    const userId = new ObjectId(req.user.id);
    const saved = await db
      .collection('savedMusic')
      .findOne({ _id: id, userId });
    if (!saved)
      return errorResponse(res, 404, 'NOT_FOUND', 'Saved song not found.');
    const item = await db
      .collection('songs')
      .findOne({ _id: saved.itemId }, { projection: { title: 1, artist: 1 } });
    return res.json({ data: serializeSaved(saved, item) });
  } catch (error) {
    return serverError(res, error);
  }
});

savedMusicRouter.patch('/:id', async (req, res) => {
  const id = objectId(req.params.id);
  const fields = parseBody(req.body, false);
  if (!id || !fields)
    return errorResponse(
      res,
      400,
      'VALIDATION_ERROR',
      'Invalid saved music ID or fields.',
    );

  try {
    const db = await getMusicDb();
    const userId = new ObjectId(req.user.id);
    const savedMusic = db.collection('savedMusic');
    const result = await savedMusic.updateOne(
      { _id: id, userId },
      { $set: { ...fields, updatedAt: new Date() } },
    );
    if (result.matchedCount === 0) {
      return errorResponse(res, 404, 'NOT_FOUND', 'Saved song not found.');
    }
    const saved = await savedMusic.findOne({ _id: id, userId });
    const item = await db
      .collection('songs')
      .findOne({ _id: saved.itemId }, { projection: { title: 1, artist: 1 } });
    return res.json({ data: serializeSaved(saved, item) });
  } catch (error) {
    return serverError(res, error);
  }
});

savedMusicRouter.delete('/:id', async (req, res) => {
  const id = objectId(req.params.id);
  if (!id)
    return errorResponse(
      res,
      400,
      'VALIDATION_ERROR',
      'Invalid saved music ID.',
    );

  try {
    const userId = new ObjectId(req.user.id);
    const result = await (
      await getMusicDb()
    )
      .collection('savedMusic')
      .deleteOne({ _id: id, userId });
    if (result.deletedCount === 0) {
      return errorResponse(res, 404, 'NOT_FOUND', 'Saved song not found.');
    }
    return res.json({ data: { id: req.params.id, deleted: true } });
  } catch (error) {
    return serverError(res, error);
  }
});
