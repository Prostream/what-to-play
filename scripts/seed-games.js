import { readFile } from 'node:fs/promises';
import { getDb, closeDb } from '../server/db.js';
import { ensureIndexes } from '../server/indexes.js';

try {
  const games = JSON.parse(
    await readFile(new URL('../data/games.json', import.meta.url), 'utf8'),
  );
  const db = await getDb();
  await ensureIndexes(db);
  const result = await db.collection('games').bulkWrite(
    games.map((game) => ({
      updateOne: {
        filter: { steamId: game.steamId },
        update: { $set: game },
        upsert: true,
      },
    })),
  );
  console.log(
    `Games imported: ${result.upsertedCount} added, ${result.modifiedCount} updated; ${await db.collection('games').countDocuments()} total.`,
  );
} catch {
  console.error(
    'Game import failed. Check the snapshot, Atlas connection, and database permissions.',
  );
  process.exitCode = 1;
} finally {
  await closeDb();
}
