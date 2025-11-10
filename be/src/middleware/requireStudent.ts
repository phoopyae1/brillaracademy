import type { Request, Response, NextFunction } from 'express';
import { verifyStudentToken } from '../utils/token.js';

export type AuthenticatedStudentRequest = Request & {
  student?: {
    id: number;
    email: string;
  };
};

export function requireStudent() {
  return (req: AuthenticatedStudentRequest, res: Response, next: NextFunction) => {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing authorization token.' });
    }

    const token = header.slice('Bearer '.length);
    const payload = verifyStudentToken(token);
    if (!payload) {
      return res.status(401).json({ error: 'Invalid or expired session.' });
    }

    req.student = { id: payload.studentId, email: payload.email };
    return next();
  };
}

