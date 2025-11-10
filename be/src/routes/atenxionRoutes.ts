import { Router } from 'express';
import { recordAtenxionTransaction } from '../services/atenxionService.js';

const router = Router();

/**
 * POST /api/atenxion/transaction
 * Record a transaction in Atenxion when a student makes a change.
 * Request body: { studentId: string, token?: string }
 */
router.post('/transaction', async (req, res) => {
  try {
    const { studentId, token } = req.body;

    if (!studentId || typeof studentId !== 'string' || !studentId.trim()) {
      return res.status(400).json({ error: 'studentId is required.' });
    }

    await recordAtenxionTransaction(studentId, token);
    return res.json({ success: true });
  } catch (error) {
    console.error('[Atenxion] Failed to record transaction:', error);
    return res.status(500).json({ error: 'Failed to record Atenxion transaction.' });
  }
});

export default router;


