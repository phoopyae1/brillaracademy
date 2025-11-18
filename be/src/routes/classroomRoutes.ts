import { Router } from 'express';
import { z } from 'zod';
import { requireStaff, type AuthenticatedRequest } from '../middleware/requireStaff.js';
import {
  createClassroom,
  listClassrooms,
  listClassroomsWithAvailability,
  registerStudentForClassroom
} from '../services/classroomService.js';

const router = Router();

router.get('/', requireStaff(['IT_ADMIN']), async (_req, res) => {
  const classrooms = await listClassrooms();
  res.json({ classrooms });
});

router.get('/public/available', async (req, res) => {
  const studentId = req.query.studentId ? Number(req.query.studentId) : undefined;
  
  if (studentId !== undefined && !Number.isFinite(studentId)) {
    return res.status(400).json({ error: 'Invalid student ID.' });
  }
  
  const classrooms = await listClassroomsWithAvailability(studentId);
  res.json({ classrooms });
});

const createClassroomSchema = z.object({
  name: z.string().min(1),
  location: z.string().min(1),
  capacity: z.coerce.number().int().positive(),
  resources: z.array(z.string().min(1)).optional()
});

const classroomSelfRegistrationSchema = z.object({
  studentId: z.coerce.number().int().positive(),
  courseCode: z.string().min(1).optional(), // Optional for backward compatibility, but recommended
  weekday: z.string().min(1).optional(), // Optional: specific weekday to register for (used for conflict checking)
  startTime: z.string().min(1).optional() // Optional: specific start time to register for (used for conflict checking)
});

router.post('/', requireStaff(['IT_ADMIN']), async (req: AuthenticatedRequest, res) => {
  const parseResult = createClassroomSchema.safeParse(req.body);

  if (!parseResult.success) {
    return res.status(400).json({ error: 'Invalid classroom payload.', details: parseResult.error.flatten() });
  }

  try {
    const classroom = await createClassroom(parseResult.data, req.staff?.id);
    res.status(201).json({ classroom });
  } catch (error: any) {
    console.error('Failed to create classroom', error);
    res.status(500).json({ error: 'Unable to create classroom right now.' });
  }
});

router.post('/:id/self-registrations', async (req, res) => {
  const classroomId = Number(req.params.id);

  if (!Number.isFinite(classroomId)) {
    return res.status(400).json({ error: 'Invalid classroom id.' });
  }

  console.log('[ClassroomRoutes] Registration request body:', JSON.stringify(req.body, null, 2));

  const parseResult = classroomSelfRegistrationSchema.safeParse(req.body);

  if (!parseResult.success) {
    return res
      .status(400)
      .json({ error: 'Invalid registration payload.', details: parseResult.error.flatten() });
  }

  console.log('[ClassroomRoutes] Parsed registration data:', {
    studentId: parseResult.data.studentId,
    classroomId,
    courseCode: parseResult.data.courseCode,
    weekday: parseResult.data.weekday,
    startTime: parseResult.data.startTime
  });

  try {
    console.log(`[ClassroomRoutes] Attempting to register student ${parseResult.data.studentId} for classroom ${classroomId}${parseResult.data.courseCode ? ` (course: ${parseResult.data.courseCode})` : ''}`);
    const enrollment = await registerStudentForClassroom(
      parseResult.data.studentId, 
      classroomId,
      parseResult.data.courseCode, // Pass course code to register for specific course
      parseResult.data.weekday, // Pass specific weekday if provided (for conflict checking)
      parseResult.data.startTime // Pass specific start time if provided (for conflict checking)
    );
    console.log(`[ClassroomRoutes] ✓ Registration successful for student ${parseResult.data.studentId}, enrollment ID: ${enrollment.id}`);
    res.status(201).json({ enrollment });
  } catch (error: any) {
    const message = typeof error?.message === 'string' ? error.message : 'Unable to register for this course right now.';
    console.error(`[ClassroomRoutes] ✗ Registration failed for student ${parseResult.data.studentId}:`, {
      error: message,
      stack: error?.stack,
      code: error?.code
    });
    res.status(400).json({ error: message });
  }
});

export default router;
