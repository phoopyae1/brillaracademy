import { getMongoDb } from '../db/mongodb.js';
/**
 * Create or update an integration
 */
export async function createOrUpdateIntegration(contextKey, iframe) {
    const db = await getMongoDb();
    if (!db) {
        throw new Error('MongoDB connection not available');
    }
    const collection = db.collection('integrations');
    const now = new Date();
    // Upsert: update if exists, insert if not
    await collection.updateOne({ contextKey }, {
        $set: {
            contextKey,
            iframe,
            updatedAt: now,
        },
        $setOnInsert: {
            createdAt: now,
        },
    }, { upsert: true });
    return collection.findOne({ contextKey });
}
/**
 * Get integration by context key
 */
export async function getIntegration(contextKey) {
    const db = await getMongoDb();
    if (!db) {
        return null;
    }
    const collection = db.collection('integrations');
    return collection.findOne({ contextKey });
}
/**
 * List all integrations
 */
export async function listIntegrations() {
    const db = await getMongoDb();
    if (!db) {
        return [];
    }
    const collection = db.collection('integrations');
    return collection.find({}).sort({ createdAt: -1 }).toArray();
}
/**
 * Delete an integration by context key
 */
export async function deleteIntegration(contextKey) {
    const db = await getMongoDb();
    if (!db) {
        return false;
    }
    const collection = db.collection('integrations');
    const result = await collection.deleteOne({ contextKey });
    return result.deletedCount > 0;
}
//# sourceMappingURL=integrationService.js.map