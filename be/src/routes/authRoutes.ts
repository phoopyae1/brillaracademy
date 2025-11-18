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

  try {
    console.log(`[AuthRoutes] Student login attempt for email: ${email}`);
    const student = await authenticateStudent(email, password);

    if (!student) {
      console.warn(`[AuthRoutes] Student login failed: Invalid credentials for email "${email}"`);
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    if (!student.id) {
      console.error(`[AuthRoutes] Student object missing ID field:`, JSON.stringify(student, null, 2));
      return res.status(500).json({ error: 'Invalid student data returned from authentication.' });
    }

    console.log(`[AuthRoutes] Student login successful for email: ${email}, ID: ${student.id}`);
    // Auto-generate JWT accessToken for student (like admin login)
    const accessToken = signStudentToken({ studentId: student.id, email: student.email });

    if (!accessToken) {
      console.error(`[AuthRoutes] Failed to generate access token for student ID: ${student.id}`);
      return res.status(500).json({ error: 'Failed to generate authentication token.' });
    }

    const response = { 
      accessToken,
      student 
    };

    console.log(`[AuthRoutes] Returning login response with student ID: ${response.student.id}, accessToken length: ${response.accessToken.length}`);
    return res.json(response);
  } catch (error: any) {
    console.error(`[AuthRoutes] Error during student login for email "${email}":`, error);
    console.error(`[AuthRoutes] Error stack:`, error?.stack);
    return res.status(500).json({ 
      error: 'Failed to authenticate. Please try again.',
      details: process.env.NODE_ENV === 'development' ? error?.message : undefined
    });
  }
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
