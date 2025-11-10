import { Router } from 'express';
import { z } from 'zod';
import { requireStaff } from '../middleware/requireStaff.js';
import {
  createStudent,
  fetchStudentById,
  fetchStudentDashboard,
  listStudents,
  registerStudentForSemesterCourse
} from '../services/studentService.js';
import { AVAILABLE_MAJORS, getSubjectsForMajor, listMajorsWithSubjects } from '../utils/majors.js';

const router = Router();

router.get('/public/majors', (_req, res) => {
  res.json({ majors: listMajorsWithSubjects() });
});

router.get('/public/all', async (_req, res) => {
  const students = await listStudents();
  res.json({
    students: students.map((student) => ({
      id: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
      email: student.email,
      role: student.role,
      primaryInterest: student.primaryInterest,
      createdAt: student.createdAt,
      selectedSubjects: student.selectedSubjects ?? []
    }))
  });
});

router.get('/', requireStaff(), async (_req, res) => {
  const students = await listStudents();
  res.json({ students });
});

const baseStudentSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  primaryInterest: z.enum([...AVAILABLE_MAJORS] as [string, ...string[]])
});

const createStudentSchema = baseStudentSchema
  .extend({
    role: z.string().optional(),
    selectedSubjects: z.array(z.string().min(1)).optional()
  })
  .superRefine((data, ctx) => {
    if (!data.selectedSubjects?.length) {
      return;
    }

    const availableSubjects = getSubjectsForMajor(data.primaryInterest);
    const invalidSubjects = data.selectedSubjects.filter((subject) => !availableSubjects.includes(subject));

    if (invalidSubjects.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Selected subjects are not available for ${data.primaryInterest}.`,
        path: ['selectedSubjects']
      });
    }
  });

const registerForCourseSchema = z.object({
  semester: z.string().min(1),
  courseCode: z.string().min(1)
});

const selfRegistrationSchema = baseStudentSchema
  .extend({
    selectedSubjects: z.array(z.string().min(1)).min(1)
  })
  .superRefine((data, ctx) => {
    const availableSubjects = getSubjectsForMajor(data.primaryInterest);
    const invalidSubjects = data.selectedSubjects.filter((subject) => !availableSubjects.includes(subject));

    if (invalidSubjects.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Selected subjects are not available for ${data.primaryInterest}.`,
        path: ['selectedSubjects']
      });
    }
  });

router.post('/', requireStaff(['IT_ADMIN', 'STUDENT_ADMIN']), async (req, res) => {
  const parseResult = createStudentSchema.safeParse(req.body);

  if (!parseResult.success) {
    return res.status(400).json({ error: 'Invalid student payload.', details: parseResult.error.flatten() });
  }

  try {
    const student = await createStudent(parseResult.data);
    return res.status(201).json({ student });
  } catch (error: any) {
    const duplicate = error?.code === '23505';
    return res.status(duplicate ? 409 : 500).json({
      error: duplicate ? 'An account with this email already exists.' : 'Unable to create student account right now.'
    });
  }
});

router.post('/public/self-register', async (req, res) => {
  const parseResult = selfRegistrationSchema.safeParse(req.body);

  if (!parseResult.success) {
    return res.status(400).json({ error: 'Invalid registration payload.', details: parseResult.error.flatten() });
  }

  try {
    const student = await createStudent({
      ...parseResult.data,
      role: 'Student'
    });

    return res.status(201).json({ student });
  } catch (error: any) {
    const duplicate = error?.code === '23505';
    return res.status(duplicate ? 409 : 500).json({
      error: duplicate
        ? 'An account with this email already exists. Try signing in instead.'
        : 'Unable to create your account right now. Please try again later.'
    });
  }
});

router.get('/:id/dashboard', async (req, res) => {
  const studentId = Number(req.params.id);

  const dashboard = await fetchStudentDashboard(studentId);
  if (!dashboard) {
    return res.status(404).json({ error: 'Student dashboard not found.' });
  }

  return res.json({ dashboard });
});

router.get('/:id', requireStaff(), async (req, res) => {
  const studentId = Number(req.params.id);
  const student = await fetchStudentById(studentId);

  if (!student) {
    return res.status(404).json({ error: 'Student not found.' });
  }

  return res.json({ student });
});

router.post('/:id/registrations', async (req, res) => {
  const studentId = Number(req.params.id);

  if (!Number.isFinite(studentId)) {
    return res.status(400).json({ error: 'Invalid student id.' });
  }

  const parseResult = registerForCourseSchema.safeParse(req.body);

  if (!parseResult.success) {
    return res.status(400).json({ error: 'Invalid registration payload.', details: parseResult.error.flatten() });
  }

  try {
    const registration = await registerStudentForSemesterCourse(
      studentId,
      parseResult.data.semester,
      parseResult.data.courseCode
    );

    return res.status(201).json({ registration });
  } catch (error: any) {
    const message = typeof error?.message === 'string' ? error.message : 'Unable to register for this course.';
    return res.status(400).json({ error: message });
  }
});

// DEBUG: Clear all registrations for a student (for testing only)
router.delete('/:id/registrations', async (req, res) => {
  const studentId = Number(req.params.id);

  if (!Number.isFinite(studentId)) {
    return res.status(400).json({ error: 'Invalid student id.' });
  }

  try {
    const { getPool } = await import('../db/pool.js');
    const pool = getPool();
    
    if (!pool) {
      return res.status(500).json({ error: 'Database not available.' });
    }

    // Clear all registrations for this student
    await pool.query('DELETE FROM timetables WHERE student_id = $1', [studentId]);
    await pool.query('DELETE FROM class_registrations WHERE student_id = $1', [studentId]);
    await pool.query('DELETE FROM teacher_rosters WHERE student_id = $1', [studentId]);
    await pool.query('DELETE FROM classroom_registrations WHERE student_id = $1', [studentId]);

    console.log(`[StudentRoutes] Cleared all registrations for student ${studentId}`);
    return res.json({ message: `Cleared all registrations for student ${studentId}` });
  } catch (error: any) {
    console.error('Failed to clear registrations:', error);
    return res.status(500).json({ error: 'Failed to clear registrations.' });
  }
});

export default router;
