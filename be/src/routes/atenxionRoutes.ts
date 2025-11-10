import { Router } from 'express';
import { recordAtenxionTransaction } from '../services/atenxionService.js';

const router = Router();

router.post('/transaction', async (req, res) => {
  const { studentId } = req.body;

  if (!studentId || (typeof studentId !== 'string' && typeof studentId !== 'number')) {
    return res.status(400).json({ error: 'studentId is required.' });
  }

  try {
    await recordAtenxionTransaction(String(studentId));
  } catch (error) {
    console.warn('[Atenxion] Failed to record transaction:', error);
  }

  return res.json({ success: true });
});

export default router;

