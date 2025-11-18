import { Router } from 'express';
import { z } from 'zod';
import { requireStaff, type AuthenticatedRequest } from '../middleware/requireStaff.js';
import { 
  getSystemSetting, 
  setSystemSetting, 
  getCurrentSemester,
  getSemesterDate,
  setSemesterDate,
  listSemesterDates
} from '../services/systemService.js';

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

router.put('/settings/current-semester', requireStaff(['IT_ADMIN', 'STUDENT_ADMIN']), async (req: AuthenticatedRequest, res) => {
  const parseResult = updateSemesterSchema.safeParse(req.body);

  if (!parseResult.success) {
    return res.status(400).json({ error: 'Invalid semester format.', details: parseResult.error.flatten() });
  }

  try {
    await setSystemSetting('current_semester', parseResult.data.semester, req.staff?.id);
    res.json({ message: 'Current semester updated successfully.', currentSemester: parseResult.data.semester });
  } catch (error: any) {
    console.error('Failed to update current semester', error);
    const errorMessage = error?.message || 'Unable to update current semester right now.';
    res.status(500).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
    });
  }
});

// Semester dates management
router.get('/settings/semester-dates', requireStaff(['IT_ADMIN', 'STUDENT_ADMIN']), async (req, res) => {
  try {
    const semesterDates = await listSemesterDates();
    res.json({ semesterDates });
  } catch (error) {
    console.error('Failed to fetch semester dates', error);
    res.status(500).json({ error: 'Unable to fetch semester dates right now.' });
  }
});

router.get('/settings/semester-dates/:semester', requireStaff(['IT_ADMIN', 'STUDENT_ADMIN']), async (req, res) => {
  try {
    const { semester } = req.params;
    const semesterDate = await getSemesterDate(semester);
    
    if (!semesterDate) {
      return res.status(404).json({ error: 'Semester date not found.' });
    }
    
    res.json({ semesterDate });
  } catch (error) {
    console.error('Failed to fetch semester date', error);
    res.status(500).json({ error: 'Unable to fetch semester date right now.' });
  }
});

const updateSemesterDateSchema = z.object({
  semester: z.string().min(4).regex(/^\d+\/\d{4}$/, 'Semester must be in format "1/2026" or "2/2026"'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be in format YYYY-MM-DD'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be in format YYYY-MM-DD')
}).refine((data) => {
  const start = new Date(data.startDate);
  const end = new Date(data.endDate);
  return end >= start;
}, {
  message: 'End date must be after or equal to start date'
});

router.put('/settings/semester-dates', requireStaff(['IT_ADMIN', 'STUDENT_ADMIN']), async (req: AuthenticatedRequest, res) => {
  const parseResult = updateSemesterDateSchema.safeParse(req.body);

  if (!parseResult.success) {
    return res.status(400).json({ error: 'Invalid semester date format.', details: parseResult.error.flatten() });
  }

  try {
    const semesterDate = await setSemesterDate(
      parseResult.data.semester,
      parseResult.data.startDate,
      parseResult.data.endDate,
      req.staff?.id
    );
    res.json({ 
      message: 'Semester dates updated successfully.', 
      semesterDate 
    });
  } catch (error) {
    console.error('Failed to update semester dates', error);
    res.status(500).json({ error: 'Unable to update semester dates right now.' });
  }
});

export default router;

