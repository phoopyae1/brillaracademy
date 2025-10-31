import type { Request, Response, NextFunction } from 'express';
import { verifyStaffToken } from '../utils/token.js';
import type { StaffRole } from '../services/types.js';

export type AuthenticatedRequest = Request & {
  staff?: {
    id: number;
    role: StaffRole;
    email: string;
  };
};

export function requireStaff(roles?: StaffRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const header = req.headers.authorization;

    if (!header?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing authorization token.' });
    }

    const token = header.slice('Bearer '.length);
    const payload = verifyStaffToken(token);

    if (!payload) {
      return res.status(401).json({ error: 'Invalid or expired session.' });
    }

    if (roles && !roles.includes(payload.role as StaffRole)) {
      return res.status(403).json({ error: 'You are not authorized to perform this action.' });
    }

    req.staff = { id: payload.staffId, role: payload.role as StaffRole, email: payload.email };
    return next();
  };
}
