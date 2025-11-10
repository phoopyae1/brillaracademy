import { Router } from 'express';
import { authenticateStudent } from '../services/studentService.js';
import { findStaffByEmail } from '../services/staffService.js';
import { signStaffToken, signStudentToken } from '../utils/token.js';

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

  // Auto-generate JWT accessToken for student (like admin login)
  const accessToken = signStudentToken({ studentId: student.id, email: student.email });

  return res.json({ 
    accessToken,
    student 
  });
});

router.post('/admin/login', async (req, res) => {
  const { email, password } = req.body ?? {};

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const account = await findStaffByEmail(email);

  if (!account) {
    console.warn(`Login attempt failed: Staff account not found for email "${email}"`);
    return res.status(401).json({ error: 'Invalid credentials.' });
  }

  if (!account.passwordHash) {
    console.error(`Login attempt failed: No password hash found for account "${email}" (ID: ${account.id})`);
    return res.status(401).json({ error: 'Invalid credentials.' });
  }

  const bcrypt = (await import('bcryptjs')).default;
  const passwordMatches = await bcrypt.compare(password, account.passwordHash);

  if (!passwordMatches) {
    console.warn(`Login attempt failed: Password mismatch for email "${email}"`);
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
