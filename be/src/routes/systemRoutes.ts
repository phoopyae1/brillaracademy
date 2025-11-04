import { Router } from 'express';
import { z } from 'zod';
import { requireStaff, type AuthenticatedRequest } from '../middleware/requireStaff.js';
import { getSystemSetting, setSystemSetting, getCurrentSemester } from '../services/systemService.js';

const router = Router();

router.get('/settings/current-semester', requireStaff(['IT_ADMIN', 'STUDENT_ADMIN', 'TEACHER']), async (req, res) => {
  try {
    const currentSemester = await getCurrentSemester();
    res.json({ currentSemester });
  } catch (error) {
    console.error('Failed to fetch current semester', error);
    res.status(500).json({ error: 'Unable to fetch current semester right now.' });
  }
});

const updateSemesterSchema = z.object({
  semester: z.string().min(4).regex(/^\d+\/\d{4}$/, 'Semester must be in format "1/2026" or "2/2026"')
});

router.put('/settings/current-semester', requireStaff(['IT_ADMIN']), async (req: AuthenticatedRequest, res) => {
  const parseResult = updateSemesterSchema.safeParse(req.body);

  if (!parseResult.success) {
    return res.status(400).json({ error: 'Invalid semester format.', details: parseResult.error.flatten() });
  }

  try {
    await setSystemSetting('current_semester', parseResult.data.semester, req.staff?.id);
    res.json({ message: 'Current semester updated successfully.', currentSemester: parseResult.data.semester });
  } catch (error) {
    console.error('Failed to update current semester', error);
    res.status(500).json({ error: 'Unable to update current semester right now.' });
  }
});

export default router;

