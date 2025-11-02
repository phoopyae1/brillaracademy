import { Router } from 'express';
import { z } from 'zod';
import { requireStaff } from '../middleware/requireStaff.js';
import {
  createStudent,
  fetchStudentById,
  fetchStudentDashboard,
  listStudents
} from '../services/studentService.js';

const router = Router();

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
      createdAt: student.createdAt
    }))
  });
});

router.get('/', requireStaff(), async (_req, res) => {
  const students = await listStudents();
  res.json({ students });
});

const createStudentSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.string().optional(),
  primaryInterest: z.string().optional().nullable()
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

export default router;
