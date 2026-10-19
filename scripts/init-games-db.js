import { getDb, closeDb } from '../server/db.js';

try {
  const db = await getDb();
  await db.collection('games').createIndex({ title: 1, _id: 1 });
  await db
    .collection('savedGames')
    .createIndex({ itemId: 1 }, { unique: true });
  console.log(
    'Games collections and indexes are ready. Existing records were preserved.',
  );
} catch {
  console.error(
    'Games initialization failed. Run npm run db:check first; existing duplicate saved items must be resolved before creating the unique index.',
  );
  process.exitCode = 1;
} finally {
  await closeDb();
}
