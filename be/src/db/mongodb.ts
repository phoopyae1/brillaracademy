import { MongoClient, Db } from 'mongodb';

let client: MongoClient | null = null;
let db: Db | null = null;

export async function getMongoDb(): Promise<Db | null> {
  if (db) {
    return db;
  }

  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;

  if (!mongoUri) {
    console.warn('[MongoDB] No MONGODB_URI or MONGO_URI found in environment variables');
    return null;
  }

  try {
    client = new MongoClient(mongoUri);
    await client.connect();
    db = client.db(process.env.MONGODB_DB_NAME || 'brillaracademy');
    console.log('[MongoDB] Connected successfully');
    return db;
  } catch (error) {
    console.error('[MongoDB] Connection error:', error);
    return null;
  }
}

export async function closeMongoConnection(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log('[MongoDB] Connection closed');
  }
}

