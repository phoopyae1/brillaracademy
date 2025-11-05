import { Router } from 'express';
import { z } from 'zod';
import { createOrUpdateIntegration, getIntegration, listIntegrations, deleteIntegration, } from '../services/integrationService.js';
const router = Router();
// Validation schema
const integrationSchema = z.object({
    contextKey: z.string().min(1),
    iframe: z.string().min(1),
});
/**
 * GET /api/integration
 * List all integrations
 */
router.get('/', async (_req, res) => {
    try {
        const integrations = await listIntegrations();
        res.json({ integrations });
    }
    catch (error) {
        console.error('[Integration] Error listing integrations:', error);
        res.status(500).json({ error: 'Failed to list integrations' });
    }
});
/**
 * GET /api/integration/:contextKey
 * Get integration by context key
 */
router.get('/:contextKey', async (req, res) => {
    try {
        const { contextKey } = req.params;
        if (!contextKey) {
            return res.status(400).json({ error: 'Context key is required' });
        }
        const integration = await getIntegration(contextKey);
        if (!integration) {
            return res.status(404).json({ error: 'Integration not found' });
        }
        res.json({
            contextKey: integration.contextKey,
            iframe: integration.iframe,
            createdAt: integration.createdAt,
            updatedAt: integration.updatedAt,
        });
    }
    catch (error) {
        console.error('[Integration] Error getting integration:', error);
        res.status(500).json({ error: 'Failed to get integration' });
    }
});
/**
 * POST /api/integration
 * Create or update an integration
 */
router.post('/', async (req, res) => {
    try {
        const validation = integrationSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({
                error: 'Invalid request data',
                details: validation.error.errors,
            });
        }
        const { contextKey, iframe } = validation.data;
        const integration = await createOrUpdateIntegration(contextKey.trim(), iframe.trim());
        if (!integration) {
            return res.status(500).json({ error: 'Failed to create or update integration' });
        }
        res.status(201).json({
            contextKey: integration.contextKey,
            iframe: integration.iframe,
            createdAt: integration.createdAt,
            updatedAt: integration.updatedAt,
        });
    }
    catch (error) {
        console.error('[Integration] Error creating integration:', error);
        res.status(500).json({ error: 'Failed to create or update integration' });
    }
});
/**
 * DELETE /api/integration/:contextKey
 * Delete an integration
 */
router.delete('/:contextKey', async (req, res) => {
    try {
        const { contextKey } = req.params;
        if (!contextKey) {
            return res.status(400).json({ error: 'Context key is required' });
        }
        const deleted = await deleteIntegration(contextKey);
        if (!deleted) {
            return res.status(404).json({ error: 'Integration not found' });
        }
        res.json({ message: 'Integration deleted successfully' });
    }
    catch (error) {
        console.error('[Integration] Error deleting integration:', error);
        res.status(500).json({ error: 'Failed to delete integration' });
    }
});
export default router;
//# sourceMappingURL=integrationRoutes.js.map