import { getDb } from '../db.js';
import { fail, listResult, objectId, pageQuery, tags, text } from '../http.js';

export function gameJson({ _id, ...game }) {
  return { id: _id.toString(), ...game };
}

function searchFilter(query) {
  const filter = {};
  const q = text(query.q, 'Search', 100);
  const genre = text(query.genre, 'Genre', 60).toLowerCase();
  const tag = text(query.tag, 'Tag', 60).toLowerCase();
  if (q)
    filter.title = {
      $regex: q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
      $options: 'i',
    };
  if (genre) filter.genres = genre;
  if (tag) filter.tags = tag;
  return filter;
}

export async function getGame(id) {
  const db = await getDb();
  const game = await db.collection('games').findOne({ _id: objectId(id) });
  if (!game) throw fail(404, 'NOT_FOUND', 'This game was not found.');
  return gameJson(game);
}

export async function catalog(query) {
  const db = await getDb();
  const page = pageQuery(query);
  const filter = searchFilter(query);
  const [rows, total] = await Promise.all([
    db
      .collection('games')
      .find(filter)
      .sort({ title: 1, _id: 1 })
      .skip(page.skip)
      .limit(page.limit)
      .toArray(),
    db.collection('games').countDocuments(filter),
  ]);
  return listResult(rows.map(gameJson), total, page);
}

export async function filters() {
  const db = await getDb();
  const [genres, tagRows, total] = await Promise.all([
    db.collection('games').distinct('genres'),
    db
      .collection('games')
      .aggregate([
        { $unwind: '$tags' },
        { $group: { _id: '$tags', count: { $sum: 1 } } },
        { $sort: { count: -1, _id: 1 } },
        { $limit: 30 },
      ])
      .toArray(),
    db.collection('games').countDocuments(),
  ]);
  return { genres: genres.sort(), tags: tagRows.map((row) => row._id), total };
}

export async function recommendations(query) {
  const db = await getDb();
  const page = pageQuery(query);
  let liked = tags(query.likedTag);
  const disliked = tags(query.dislikedTag);
  const filter = searchFilter(query);
  if (query.sourceId) {
    const source = await getGame(query.sourceId);
    filter._id = { $ne: objectId(source.id) };
    if (!liked.length) liked = source.tags;
  }
  if (!liked.length)
    throw fail(
      400,
      'VALIDATION_ERROR',
      'Choose a game or at least one preferred tag.',
    );
  liked = liked.filter((tag) => !disliked.includes(tag));
  filter.$and = [{ tags: { $in: liked, $nin: disliked } }];
  const [rows, total] = await Promise.all([
    db
      .collection('games')
      .aggregate([
        { $match: filter },
        { $set: { matchedTags: { $setIntersection: ['$tags', liked] } } },
        { $set: { score: { $size: '$matchedTags' } } },
        { $sort: { score: -1, title: 1, _id: 1 } },
        { $skip: page.skip },
        { $limit: page.limit },
      ])
      .toArray(),
    db.collection('games').countDocuments(filter),
  ]);
  return listResult(rows.map(gameJson), total, page);
}

export async function explore(query) {
  const db = await getDb();
  const page = pageQuery(query);
  const filter = searchFilter(query);
  const disliked = tags(query.dislikedTag);
  const liked = tags(query.likedTag).filter((tag) => !disliked.includes(tag));
  if (liked.length || disliked.length)
    filter.$and = [
      { tags: { ...(liked.length ? { $in: liked } : {}), $nin: disliked } },
    ];
  const [rows, total] = await Promise.all([
    db
      .collection('games')
      .aggregate([{ $match: filter }, { $sample: { size: page.limit } }])
      .toArray(),
    db.collection('games').countDocuments(filter),
  ]);
  return listResult(rows.map(gameJson), total, page);
}
