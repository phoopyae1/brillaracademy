import jwt from 'jsonwebtoken';
const DEFAULT_SECRET = 'development-secret';
export function signStaffToken(payload) {
    const secret = process.env.JWT_SECRET ?? DEFAULT_SECRET;
    return jwt.sign(payload, secret, { expiresIn: '12h' });
}
export function signStudentToken(payload) {
    const secret = process.env.JWT_SECRET ?? DEFAULT_SECRET;
    return jwt.sign(payload, secret, { expiresIn: '24h' });
}
export function verifyStaffToken(token) {
    const secret = process.env.JWT_SECRET ?? DEFAULT_SECRET;
    try {
        return jwt.verify(token, secret);
    }
    catch (error) {
        console.warn('Invalid staff token', error);
        return null;
    }
}
export function verifyStudentToken(token) {
    const secret = process.env.JWT_SECRET ?? DEFAULT_SECRET;
    try {
        return jwt.verify(token, secret);
    }
    catch (error) {
        console.warn('Invalid student token', error);
        return null;
    }
}
//# sourceMappingURL=token.js.map