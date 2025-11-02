import { Router } from 'express';
import { authenticateStudent } from '../services/studentService.js';
import { findStaffByEmail } from '../services/staffService.js';
import { signStaffToken } from '../utils/token.js';

const router = Router();

router.post('/login', async (req, res) => {
  const { email, password } = req.body ?? {};

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const student = await authenticateStudent(email, password);

  if (!student) {
    return res.status(401).json({ error: 'Invalid credentials.' });
  }

  return res.json({ student });
});

router.post('/admin/login', async (req, res) => {
  const { email, password } = req.body ?? {};

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const account = await findStaffByEmail(email);

  if (!account) {
    return res.status(401).json({ error: 'Invalid credentials.' });
  }

  const passwordMatches = await import('bcryptjs').then(({ default: bcrypt }) =>
    bcrypt.compare(password, account.passwordHash)
  );

  if (!passwordMatches) {
    return res.status(401).json({ error: 'Invalid credentials.' });
  }

  const token = signStaffToken({ staffId: account.id, role: account.role, email: account.email });

  return res.json({
    token,
    staff: {
      id: account.id,
      displayName: account.displayName,
      email: account.email,
      role: account.role,
      createdAt: account.createdAt
    }
  });
});

export default router;
