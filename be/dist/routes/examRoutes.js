import { Router } from 'express';
import { z } from 'zod';
import { requireStaff } from '../middleware/requireStaff.js';
import { createExamAnnouncement, listExamAnnouncements } from '../services/examService.js';
const router = Router();
router.get('/', async (_req, res) => {
    const exams = await listExamAnnouncements();
    const upcoming = exams
        .filter((exam) => new Date(exam.examDate).getTime() >= Date.now())
        .sort((a, b) => new Date(a.examDate).getTime() - new Date(b.examDate).getTime());
    res.json({ exams: upcoming });
});
const createExamSchema = z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    examDate: z.string().datetime({ offset: true })
});
router.post('/', requireStaff(['IT_ADMIN']), async (req, res) => {
    const parseResult = createExamSchema.safeParse(req.body);
    if (!parseResult.success) {
        return res.status(400).json({ error: 'Invalid exam payload.', details: parseResult.error.flatten() });
    }
    try {
        const exam = await createExamAnnouncement(parseResult.data, req.staff?.id);
        res.status(201).json({ exam });
    }
    catch (error) {
        console.error('Failed to create exam announcement', error);
        res.status(500).json({ error: 'Unable to create exam announcement right now.' });
    }
});
export default router;
//# sourceMappingURL=examRoutes.js.map