import { MongoClient } from 'mongodb';

let clientPromise;

export async function getMusicDb() {
  const uri = process.env.MUSIC_MONGODB_URI;
  if (!uri) {
    throw new Error('MUSIC_MONGODB_URI is required to use the database');
  }

  if (!clientPromise) {
    clientPromise = new MongoClient(uri).connect();
  }

  try {
    const client = await clientPromise;
    return client.db(process.env.MUSIC_MONGODB_DB || 'what_to_play_music');
  } catch (error) {
    clientPromise = undefined;
    throw error;
  }
}
