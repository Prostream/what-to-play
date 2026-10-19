import { getDb, closeDb } from '../server/db.js';

try {
  const db = await getDb();
  await db.command({ ping: 1 });
  console.log('MongoDB connection OK.');
  for (const name of ['games', 'savedGames', 'songs', 'savedMusic']) {
    const count = await db.collection(name).countDocuments();
    console.log(`${name}: ${count} records`);
  }
} catch {
  console.error(
    'MongoDB check failed. Check MONGODB_URI, the database user permissions, and the Atlas IP access list.',
  );
  process.exitCode = 1;
} finally {
  await closeDb();
}
