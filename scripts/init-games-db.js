import { getDb, closeDb } from '../server/db.js';
import { ensureIndexes } from '../server/indexes.js';

try {
  await ensureIndexes(await getDb());
  console.log(
    'Games and account indexes are ready. Existing records were preserved.',
  );
} catch {
  console.error(
    'Games initialization failed. Run npm run db:check first; existing duplicate saved items must be resolved before creating the unique index.',
  );
  process.exitCode = 1;
} finally {
  await closeDb();
}
