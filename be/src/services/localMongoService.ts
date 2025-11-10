import type { WithId, Document } from 'mongodb';
import { getMongoDb } from '../db/mongodb.js';

export type IntegrationEmbedDocument = WithId<
  Document & {
    contextKey?: string;
    iframe?: string;
    createdAt?: Date;
    updatedAt?: Date;
  }
>;

export async function fetchLatestIntegrationEmbed(): Promise<IntegrationEmbedDocument | null> {
  const db = await getMongoDb();
  if (!db) {
    return null;
  }

  try {
    const collection = db.collection<IntegrationEmbedDocument>('integrations');
    const latest = await collection.findOne({}, { sort: { createdAt: -1 } });
    return latest ?? null;
  } catch (error) {
    console.error('[LocalMongoService] Failed to fetch latest integration embed:', error);
    return null;
  }
}


