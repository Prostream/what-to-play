export async function ensureIndexes(db) { //Interesting way to track user game collections
  await db.collection('games').createIndex({ title: 1, _id: 1 });
  await db
    .collection('games')
    .createIndex({ steamId: 1 }, { unique: true, sparse: true });
  await db
    .collection('savedGames')
    .createIndex({ userId: 1, itemId: 1 }, { unique: true });
  const savedIndexes = await db.collection('savedGames').indexes();
  if (savedIndexes.some((index) => index.name === 'itemId_1')) {
    await db.collection('savedGames').dropIndex('itemId_1');
  }
  await db.collection('users').createIndex({ email: 1 }, { unique: true });
  await db
    .collection('sessions')
    .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  await db
    .collection('authAttempts')
    .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
}
