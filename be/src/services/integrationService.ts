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
  return collection.find({}).sort({ updatedAt: -1, createdAt: -1 }).toArray();
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

/**
 * Get contextKey from MongoDB integrations collection
 * Fetches the first available integration document's contextKey
 */
export async function getContextKey(): Promise<string | null> {
  const db = await getMongoDb();
  if (!db) {
    return null;
  }

  try {
    const collection = db.collection('integrations');
    // Get the most recent integration document to extract contextKey
    const integrationDoc = await collection.findOne({}, { sort: { createdAt: -1 } });
    
    if (integrationDoc && integrationDoc.contextKey) {
      return integrationDoc.contextKey as string;
    }
    
    return null;
  } catch (error) {
    console.error('[Integration] Error fetching contextKey:', error);
    return null;
  }
}

/**
 * Get token and iframe from MongoDB integrations collection by contextKey
 * The token is stored in the 'contextKey' field, not a separate 'token' field
 */
export async function getToken(contextKey: string): Promise<{ token: string; iframe: string } | null> {
  const db = await getMongoDb();
  if (!db) {
    return null;
  }

  try {
    const collection = db.collection('integrations');
    const integrationDoc = await collection.findOne({ contextKey });
    
    // The token is stored in contextKey field, not a separate token field
    if (integrationDoc && integrationDoc.contextKey && integrationDoc.iframe) {
      return {
        token: integrationDoc.contextKey as string,
        iframe: integrationDoc.iframe as string
      };
    }
    
    return null;
  } catch (error) {
    console.error('[Integration] Error fetching token:', error);
    return null;
  }
}

/**
 * Get token and iframe from MongoDB by fetching the most recent integration
 * The token is stored in the 'contextKey' field, and we return it as 'token'
 */
export async function getTokenByContextKey(): Promise<{ token: string; iframe: string } | null> {
  const db = await getMongoDb();
  if (!db) {
    return null;
  }

  try {
    const collection = db.collection('integrations');
    // Get the most recent integration document
    const integrationDoc = await collection.findOne({}, { sort: { createdAt: -1 } });
    
    // The token is stored in contextKey field, not a separate token field
    if (integrationDoc && integrationDoc.contextKey && integrationDoc.iframe) {
      return {
        token: integrationDoc.contextKey as string,
        iframe: integrationDoc.iframe as string
      };
    }
    
    return null;
  } catch (error) {
    console.error('[Integration] Error fetching token by contextKey:', error);
    return null;
  }
}
