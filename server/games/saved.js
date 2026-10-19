import { getDb } from '../db.js';
import { fail, listResult, objectId, pageQuery, tags, text } from '../http.js';
import { gameJson } from './catalog.js';

function editableFields(body) {
  const allowed = ['status', 'rating', 'personalTags', 'notes', 'favorite'];
  if (Object.keys(body).some((key) => !allowed.includes(key)))
    throw fail(400, 'VALIDATION_ERROR', 'Unknown saved-game field.');
  const result = {};
  if ('status' in body) {
    if (!['planned', 'completed'].includes(body.status))
      throw fail(400, 'VALIDATION_ERROR', 'Choose Want to play or Played.');
    result.status = body.status;
  }
  if ('rating' in body) {
    if (
      body.rating !== null &&
      (!Number.isInteger(body.rating) || body.rating < 1 || body.rating > 5)
    )
      throw fail(
        400,
        'VALIDATION_ERROR',
        'Rating must be from 1 to 5, or empty.',
      );
    result.rating = body.rating;
  }
  if ('personalTags' in body) {
    if (!Array.isArray(body.personalTags))
      throw fail(400, 'VALIDATION_ERROR', 'Personal tags must be an array.');
    result.personalTags = tags(body.personalTags);
  }
  if ('notes' in body) result.notes = text(body.notes, 'Notes', 2000);
  if ('favorite' in body) {
    if (typeof body.favorite !== 'boolean')
      throw fail(400, 'VALIDATION_ERROR', 'Favorite must be true or false.');
    result.favorite = body.favorite;
  }
  return result;
}

function savedJson({ _id, userId: _userId, itemId, item, ...record }) {
  return {
    id: _id.toString(),
    itemId: itemId.toString(),
    ...record,
    item: gameJson(item),
  };
}

const joinGame = [
  {
    $lookup: {
      from: 'games',
      localField: 'itemId',
      foreignField: '_id',
      as: 'item',
    },
  },
  { $unwind: '$item' },
];

export async function savedList(userId, query) {
  const db = await getDb();
  const page = pageQuery(query);
  const filter = { userId: objectId(userId) };
  if (query.favorite !== undefined) {
    if (!['true', 'false'].includes(query.favorite))
      throw fail(
        400,
        'VALIDATION_ERROR',
        'Favorite filter must be true or false.',
      );
    filter.favorite = query.favorite === 'true';
  }
  const [result] = await db
    .collection('savedGames')
    .aggregate([
      { $match: filter },
      ...joinGame,
      {
        $facet: {
          data: [
            { $sort: { 'item.title': 1, _id: 1 } },
            { $skip: page.skip },
            { $limit: page.limit },
          ],
          count: [{ $count: 'total' }],
        },
      },
    ])
    .toArray();
  return listResult(
    result.data.map(savedJson),
    result.count[0]?.total || 0,
    page,
  );
}

export async function savedItem(userId, id) {
  const db = await getDb();
  const [record] = await db
    .collection('savedGames')
    .aggregate([
      { $match: { _id: objectId(id), userId: objectId(userId) } },
      ...joinGame,
    ])
    .toArray();
  if (!record) throw fail(404, 'NOT_FOUND', 'Saved game was not found.');
  return savedJson(record);
}

export async function saveGame(userId, body) {
  const { itemId, ...fields } = body;
  const item = objectId(itemId);
  const edits = editableFields(fields);
  const db = await getDb();
  const game = await db.collection('games').findOne({ _id: item });
  if (!game) throw fail(404, 'NOT_FOUND', 'Game was not found.');
  const now = new Date();
  const record = {
    userId: objectId(userId),
    itemId: item,
    status: 'planned',
    rating: null,
    personalTags: [],
    notes: '',
    favorite: false,
    ...edits,
    createdAt: now,
    updatedAt: now,
  };
  try {
    await db.collection('savedGames').insertOne(record);
  } catch (error) {
    if (error.code === 11000)
      throw fail(
        409,
        'ALREADY_SAVED',
        'This game is already in your collection.',
      );
    throw error;
  }
  return savedJson({ ...record, item: game });
}

export async function updateSaved(userId, id, body) {
  const changes = editableFields(body);
  if (!Object.keys(changes).length)
    throw fail(400, 'VALIDATION_ERROR', 'Choose a field to update.');
  const db = await getDb();
  const result = await db
    .collection('savedGames')
    .updateOne(
      { _id: objectId(id), userId: objectId(userId) },
      { $set: { ...changes, updatedAt: new Date() } },
    );
  if (!result.matchedCount)
    throw fail(404, 'NOT_FOUND', 'Saved game was not found.');
  return savedItem(userId, id);
}

export async function deleteSaved(userId, id) {
  const db = await getDb();
  const result = await db
    .collection('savedGames')
    .deleteOne({ _id: objectId(id), userId: objectId(userId) });
  if (!result.deletedCount)
    throw fail(404, 'NOT_FOUND', 'Saved game was not found.');
  return { id, deleted: true };
}
