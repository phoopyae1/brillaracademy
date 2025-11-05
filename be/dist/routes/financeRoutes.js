import { Router } from 'express';
import { z } from 'zod';
import { requireStaff } from '../middleware/requireStaff.js';
import { listFeePayments, listStudentFeePayments, recordFeePayment } from '../services/financeService.js';
const router = Router();
router.get('/payments', requireStaff(['IT_ADMIN', 'STUDENT_ADMIN']), async (req, res) => {
    const studentIdParam = req.query.studentId;
    if (typeof studentIdParam === 'string') {
        const studentId = Number(studentIdParam);
        if (!Number.isFinite(studentId)) {
            return res.status(400).json({ error: 'Invalid student id.' });
        }
        const payments = await listStudentFeePayments(studentId);
        return res.json({ payments });
    }
    const payments = await listFeePayments();
    return res.json({ payments });
});
const recordPaymentSchema = z.object({
    studentId: z.coerce.number().int().positive(),
    amount: z.coerce.number().positive(),
    description: z.string().min(1).optional(),
    status: z.enum(['pending', 'paid']).optional(),
    dueDate: z.string().datetime({ offset: true }).optional().nullable()
});
router.post('/payments', requireStaff(['STUDENT_ADMIN', 'IT_ADMIN']), async (req, res) => {
    const parseResult = recordPaymentSchema.safeParse(req.body);
    if (!parseResult.success) {
        return res.status(400).json({ error: 'Invalid payment payload.', details: parseResult.error.flatten() });
    }
    try {
        const payment = await recordFeePayment(parseResult.data, req.staff?.id);
        res.status(201).json({ payment });
    }
    catch (error) {
        console.error('Failed to record fee payment', error);
        res.status(500).json({ error: 'Unable to record payment right now.' });
    }
});
export default router;
//# sourceMappingURL=financeRoutes.js.map