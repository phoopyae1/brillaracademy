import { Router } from 'express';
import { z } from 'zod';
import { requireStaff, type AuthenticatedRequest } from '../middleware/requireStaff.js';
import {
  createAssignment,
  updateAssignment,
  deleteAssignment,
  listStudentAssignments,
  listTeacherAssignments
} from '../services/assignmentService.js';

const router = Router();

// Get assignments for a student (public, similar to dashboard endpoint)
router.get('/student/:studentId', async (req, res) => {
  const studentId = Number(req.params.studentId);

  if (!Number.isFinite(studentId)) {
    return res.status(400).json({ error: 'Invalid student ID.' });
  }

  try {
    const assignments = await listStudentAssignments(studentId);
    res.json({ assignments });
  } catch (error) {
    console.error('Failed to fetch student assignments', error);
    res.status(500).json({ error: 'Unable to fetch assignments right now.' });
  }
});

// Get assignments for a teacher (teacher/admin only)
router.get('/teacher/:teacherId', requireStaff(['TEACHER', 'IT_ADMIN', 'STUDENT_ADMIN']), async (req: AuthenticatedRequest, res) => {
  const teacherId = Number(req.params.teacherId);
  const courseCode = req.query.courseCode as string | undefined;

  if (!Number.isFinite(teacherId)) {
    return res.status(400).json({ error: 'Invalid teacher ID.' });
  }

  // Verify the teacher is accessing their own data (unless admin)
  if (req.staff!.role !== 'IT_ADMIN' && req.staff!.role !== 'STUDENT_ADMIN' && req.staff!.id !== teacherId) {
    return res.status(403).json({ error: 'You can only view your own assignments.' });
  }

  try {
    const assignments = await listTeacherAssignments(teacherId, courseCode);
    res.json({ assignments });
  } catch (error) {
    console.error('Failed to fetch teacher assignments', error);
    res.status(500).json({ error: 'Unable to fetch assignments right now.' });
  }
});

// Create assignment (teacher/admin only)
const createAssignmentSchema = z.object({
  teacherId: z.number().int().positive(),
  courseCode: z.string().min(1, 'Course code is required'),
  courseTitle: z.string().min(1, 'Course title is required'),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional().nullable(),
  dueDate: z.string().min(1, 'Due date is required'),
  maxPoints: z.number().positive().optional().nullable(),
  assignmentType: z.enum(['homework', 'project', 'quiz', 'exam', 'other']).default('homework')
});

router.post('/', requireStaff(['TEACHER', 'IT_ADMIN', 'STUDENT_ADMIN']), async (req: AuthenticatedRequest, res) => {
  const parseResult = createAssignmentSchema.safeParse(req.body);

  if (!parseResult.success) {
    return res.status(400).json({ error: 'Invalid assignment data.', details: parseResult.error.flatten() });
  }

  // Verify the teacher is creating their own assignment (unless admin)
  if (req.staff!.role !== 'IT_ADMIN' && req.staff!.role !== 'STUDENT_ADMIN' && req.staff!.id !== parseResult.data.teacherId) {
    return res.status(403).json({ error: 'You can only create assignments for yourself.' });
  }

  try {
    const assignment = await createAssignment(parseResult.data);
    res.status(201).json({ assignment });
  } catch (error: any) {
    console.error('Failed to create assignment', error);
    const message = typeof error?.message === 'string' ? error.message : 'Unable to create assignment right now.';
    res.status(500).json({ error: message });
  }
});

// Update assignment (teacher/admin only)
const updateAssignmentSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  dueDate: z.string().optional(),
  maxPoints: z.number().positive().optional().nullable(),
  assignmentType: z.enum(['homework', 'project', 'quiz', 'exam', 'other']).optional()
});

router.put('/:id', requireStaff(['TEACHER', 'IT_ADMIN', 'STUDENT_ADMIN']), async (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);

  if (!Number.isFinite(id)) {
    return res.status(400).json({ error: 'Invalid assignment ID.' });
  }

  const parseResult = updateAssignmentSchema.safeParse(req.body);

  if (!parseResult.success) {
    return res.status(400).json({ error: 'Invalid assignment data.', details: parseResult.error.flatten() });
  }

  try {
    const assignment = await updateAssignment({
      id,
      ...parseResult.data
    });
    res.json({ assignment });
  } catch (error: any) {
    console.error('Failed to update assignment', error);
    const message = typeof error?.message === 'string' ? error.message : 'Unable to update assignment right now.';
    res.status(500).json({ error: message });
  }
});

// Delete assignment (teacher/admin only)
router.delete('/:id', requireStaff(['TEACHER', 'IT_ADMIN', 'STUDENT_ADMIN']), async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isFinite(id)) {
    return res.status(400).json({ error: 'Invalid assignment ID.' });
  }

  try {
    await deleteAssignment(id);
    res.json({ message: 'Assignment deleted successfully.' });
  } catch (error: any) {
    console.error('Failed to delete assignment', error);
    const message = typeof error?.message === 'string' ? error.message : 'Unable to delete assignment right now.';
    res.status(500).json({ error: message });
  }
});

export default router;

