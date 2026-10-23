import { app } from './app.js';
import { getDb } from './db.js';
import { ensureIndexes } from './indexes.js';

try {
  // Music indexes only get created on the first save/blacklist request right
  // now. Worth calling ensureMusicIndexes here too so it fails at startup.
  await ensureIndexes(await getDb());
  const port = process.env.PORT || 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`What to Play is running at http://localhost:${port}`);
  });
} catch {
  console.error(
    'Cannot start: check the MongoDB connection and database permissions.',
  );
  process.exit(1);
}
