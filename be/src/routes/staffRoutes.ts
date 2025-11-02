import { Router } from 'express';
import { z } from 'zod';
import { requireStaff, type AuthenticatedRequest } from '../middleware/requireStaff.js';
import { createStaffAccount, listStaff } from '../services/staffService.js';

const router = Router();

router.get('/', requireStaff(['IT_ADMIN']), async (_req, res) => {
  const staff = await listStaff();
  res.json({ staff });
});

const createStaffSchema = z.object({
  displayName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['IT_ADMIN', 'TEACHER', 'STUDENT_ADMIN'])
});

router.post('/', requireStaff(['IT_ADMIN']), async (req: AuthenticatedRequest, res) => {
  const parseResult = createStaffSchema.safeParse(req.body);

  if (!parseResult.success) {
    return res.status(400).json({ error: 'Invalid staff payload.', details: parseResult.error.flatten() });
  }

  try {
    const staff = await createStaffAccount(
      parseResult.data.displayName,
      parseResult.data.email,
      parseResult.data.password,
      parseResult.data.role,
      req.staff?.id
    );

    res.status(201).json({ staff });
  } catch (error: any) {
    const duplicate = error?.code === '23505';
    res.status(duplicate ? 409 : 500).json({
      error: duplicate ? 'A staff account with this email already exists.' : 'Unable to create staff account right now.'
    });
  }
});

export default router;
