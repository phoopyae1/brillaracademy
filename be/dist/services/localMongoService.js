import { getMongoDb } from '../db/mongodb.js';
export async function fetchLatestIntegrationEmbed() {
    const db = await getMongoDb();
    if (!db) {
        return null;
    }
    try {
        const collection = db.collection('integrations');
        const latest = await collection.findOne({}, { sort: { createdAt: -1 } });
        return latest ?? null;
    }
    catch (error) {
        console.error('[LocalMongoService] Failed to fetch latest integration embed:', error);
        return null;
    }
}
//# sourceMappingURL=localMongoService.js.map