let pending;

export async function ensureMusicIndexes(db) {
  if (!pending) {
    pending = (async () => {
      const saved = db.collection('savedMusic');
      const ownedRecords = {
        userId: { $exists: true },
        itemId: { $exists: true },
      };
      await saved.createIndex(
        { userId: 1, itemId: 1 },
        { unique: true, partialFilterExpression: ownedRecords },
      );
      const indexes = await saved.indexes();
      if (indexes.some((index) => index.name === 'itemId_1')) {
        await saved.dropIndex('itemId_1');
      }
      await db
        .collection('blacklistedMusic')
        .createIndex(
          { userId: 1, itemId: 1 },
          { unique: true, partialFilterExpression: ownedRecords },
        );
    })().catch((error) => {
      pending = undefined;
      throw error;
    });
  }
  return pending;
}
