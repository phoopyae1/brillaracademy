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
    return collection.find({}).sort({ updatedAt: -1, createdAt: -1 }).toArray();
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
/**
 * Get contextKey from MongoDB integrations collection
 * Fetches the first available integration document's contextKey
 */
export async function getContextKey() {
    const db = await getMongoDb();
    if (!db) {
        return null;
    }
    try {
        const collection = db.collection('integrations');
        // Get the most recent integration document to extract contextKey
        const integrationDoc = await collection.findOne({}, { sort: { createdAt: -1 } });
        if (integrationDoc && integrationDoc.contextKey) {
            return integrationDoc.contextKey;
        }
        return null;
    }
    catch (error) {
        console.error('[Integration] Error fetching contextKey:', error);
        return null;
    }
}
/**
 * Get token and iframe from MongoDB integrations collection by contextKey
 * The token is stored in the 'contextKey' field, not a separate 'token' field
 */
export async function getToken(contextKey) {
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
                token: integrationDoc.contextKey,
                iframe: integrationDoc.iframe
            };
        }
        return null;
    }
    catch (error) {
        console.error('[Integration] Error fetching token:', error);
        return null;
    }
}
/**
 * Get token and iframe from MongoDB by fetching the most recent integration
 * The token is stored in the 'contextKey' field, and we return it as 'token'
 */
export async function getTokenByContextKey() {
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
                token: integrationDoc.contextKey,
                iframe: integrationDoc.iframe
            };
        }
        return null;
    }
    catch (error) {
        console.error('[Integration] Error fetching token by contextKey:', error);
        return null;
    }
}
//# sourceMappingURL=integrationService.js.map