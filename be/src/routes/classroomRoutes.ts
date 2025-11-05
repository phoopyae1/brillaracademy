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
  courseCode: z.string().min(1).optional() // Optional for backward compatibility, but recommended
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

  const parseResult = classroomSelfRegistrationSchema.safeParse(req.body);

  if (!parseResult.success) {
    return res
      .status(400)
      .json({ error: 'Invalid registration payload.', details: parseResult.error.flatten() });
  }

  try {
    const enrollment = await registerStudentForClassroom(
      parseResult.data.studentId, 
      classroomId,
      parseResult.data.courseCode // Pass course code to register for specific course
    );
    res.status(201).json({ enrollment });
  } catch (error: any) {
    const message = typeof error?.message === 'string' ? error.message : 'Unable to register for this course right now.';
    res.status(400).json({ error: message });
  }
});

export default router;
