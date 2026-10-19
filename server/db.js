import { MongoClient } from 'mongodb';

let client;

export async function getDb() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is required to use the database');
  }

  if (!client) {
    client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
  }

  return client.db(process.env.MONGODB_DB || 'what_to_play');
}
