import { Router } from 'express';
import { ObjectId } from 'mongodb';
import { requireUser } from './auth/routes.js';
import { getMusicDb } from './music-db.js';
import { ensureMusicIndexes } from './music-indexes.js';

export const blacklistedMusicRouter = Router();
blacklistedMusicRouter.use(requireUser);

function errorResponse(res, status, code, message) {
  return res.status(status).json({ error: { code, message } });
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

function serverError(res, error) {
  console.error('Blacklisted music request failed:', error);
  return errorResponse(
    res,
    500,
    'INTERNAL_ERROR',
    'Could not update the music blacklist right now.',
  );
}

function serializeRecord(record) {
  return {
    itemId: record.itemId.toString(),
    createdAt: record.createdAt.toISOString(),
    item: record.item
      ? {
          id: record.item._id.toString(),
          title: record.item.title,
          artist: record.item.artist,
        }
      : null,
  };
}

blacklistedMusicRouter.get('/', async (req, res) => {
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
    const collection = (await getMusicDb()).collection('blacklistedMusic');
    const userId = new ObjectId(req.user.id);
    const total = await collection.countDocuments({ userId });
    const records = await collection
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
      data: records.map(serializeRecord),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return serverError(res, error);
  }
});

blacklistedMusicRouter.post('/', async (req, res) => {
  const itemId = objectId(req.body?.itemId);
  if (
    !req.body ||
    typeof req.body !== 'object' ||
    Array.isArray(req.body) ||
    Object.keys(req.body).length !== 1 ||
    !itemId
  ) {
    return errorResponse(
      res,
      400,
      'VALIDATION_ERROR',
      'Provide a valid song ID.',
    );
  }

  try {
    const db = await getMusicDb();
    await ensureMusicIndexes(db);
    const userId = new ObjectId(req.user.id);
    const item = await db
      .collection('songs')
      .findOne({ _id: itemId }, { projection: { title: 1, artist: 1 } });
    if (!item) return errorResponse(res, 404, 'NOT_FOUND', 'Song not found.');

    const record = { userId, itemId, createdAt: new Date() };
    const result = await db.collection('blacklistedMusic').insertOne(record);
    return res.status(201).json({
      data: serializeRecord({ ...record, _id: result.insertedId, item }),
    });
  } catch (error) {
    if (error.code === 11000) {
      return errorResponse(
        res,
        409,
        'ALREADY_BLACKLISTED',
        'This song is already blacklisted.',
      );
    }
    return serverError(res, error);
  }
});

blacklistedMusicRouter.delete('/:id', async (req, res) => {
  const itemId = objectId(req.params.id);
  if (!itemId) {
    return errorResponse(res, 400, 'VALIDATION_ERROR', 'Invalid song ID.');
  }

  try {
    const userId = new ObjectId(req.user.id);
    const result = await (
      await getMusicDb()
    )
      .collection('blacklistedMusic')
      .deleteOne({ userId, itemId });
    if (!result.deletedCount) {
      return errorResponse(res, 404, 'NOT_FOUND', 'Song is not blacklisted.');
    }
    return res.json({ data: { itemId: req.params.id, deleted: true } });
  } catch (error) {
    return serverError(res, error);
  }
});
