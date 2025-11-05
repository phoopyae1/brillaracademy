import { getMongoDb } from '../db/mongodb.js';
import { ObjectId } from 'mongodb';

export interface Integration {
  _id?: ObjectId;
  contextKey: string;
  iframe: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Create or update an integration
 */
export async function createOrUpdateIntegration(
  contextKey: string,
  iframe: string
): Promise<Integration | null> {
  const db = await getMongoDb();
  if (!db) {
    throw new Error('MongoDB connection not available');
  }

  const collection = db.collection<Integration>('integrations');

  const now = new Date();

  // Upsert: update if exists, insert if not
  await collection.updateOne(
    { contextKey },
    {
      $set: {
        contextKey,
        iframe,
        updatedAt: now,
      },
      $setOnInsert: {
        createdAt: now,
      },
    },
    { upsert: true }
  );

  return collection.findOne({ contextKey });
}

/**
 * Get integration by context key
 */
export async function getIntegration(contextKey: string): Promise<Integration | null> {
  const db = await getMongoDb();
  if (!db) {
    return null;
  }

  const collection = db.collection<Integration>('integrations');
  return collection.findOne({ contextKey });
}

/**
 * List all integrations
 */
export async function listIntegrations(): Promise<Integration[]> {
  const db = await getMongoDb();
  if (!db) {
    return [];
  }

  const collection = db.collection<Integration>('integrations');
  return collection.find({}).sort({ createdAt: -1 }).toArray();
}

/**
 * Delete an integration by context key
 */
export async function deleteIntegration(contextKey: string): Promise<boolean> {
  const db = await getMongoDb();
  if (!db) {
    return false;
  }

  const collection = db.collection<Integration>('integrations');
  const result = await collection.deleteOne({ contextKey });
  return result.deletedCount > 0;
}
