import jwt from 'jsonwebtoken';

const DEFAULT_SECRET = 'development-secret';

export type StaffTokenPayload = {
  staffId: number;
  role: string;
  email: string;
};

export function signStaffToken(payload: StaffTokenPayload): string {
  const secret = process.env.JWT_SECRET ?? DEFAULT_SECRET;
  return jwt.sign(payload, secret, { expiresIn: '12h' });
}

export function verifyStaffToken(token: string): StaffTokenPayload | null {
  const secret = process.env.JWT_SECRET ?? DEFAULT_SECRET;

  try {
    return jwt.verify(token, secret) as StaffTokenPayload;
  } catch (error) {
    console.warn('Invalid staff token', error);
    return null;
  }
}
