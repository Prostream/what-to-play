import { readFile } from 'node:fs/promises';
import { MongoClient } from 'mongodb';

const inputFile = new URL('../data/music/songs.json', import.meta.url);
const songs = JSON.parse(await readFile(inputFile, 'utf8'));

if (!Array.isArray(songs) || songs.length === 0) {
  throw new Error('Music seed data must be a nonempty array');
}

for (const song of songs) {
  if (
    typeof song.sourceId !== 'string' ||
    typeof song.title !== 'string' ||
    !song.title.trim() ||
    typeof song.artist !== 'string' ||
    !song.artist.trim() ||
    !Array.isArray(song.genres) ||
    song.genres.length === 0 ||
    !Array.isArray(song.moods) ||
    song.moods.length === 0 ||
    !Array.isArray(song.tags) ||
    song.tags.length === 0
  ) {
    throw new Error(
      `Invalid music seed record: ${song.sourceId ?? 'missing sourceId'}`,
    );
  }
}

const uri = process.env.MUSIC_MONGODB_URI;
if (!uri) throw new Error('MUSIC_MONGODB_URI is required to import music data');

const client = new MongoClient(uri);
try {
  await client.connect();
  const songsCollection = client
    .db(process.env.MUSIC_MONGODB_DB || 'what_to_play_music')
    .collection('songs');
  await songsCollection.createIndex(
    { sourceId: 1 },
    { unique: true, partialFilterExpression: { sourceId: { $exists: true } } },
  );

  const operations = songs.map((song) => ({
    updateOne: {
      filter: { sourceId: song.sourceId },
      update: { $set: song },
      upsert: true,
    },
  }));
  const result = await songsCollection.bulkWrite(operations, {
    ordered: false,
  });
  const importedCount = await songsCollection.countDocuments({
    sourceId: { $in: songs.map((song) => song.sourceId) },
  });
  console.log(
    `Music import: ${result.upsertedCount} inserted, ${result.matchedCount} existing; ${importedCount} seed songs present.`,
  );
} finally {
  await client.close();
}
