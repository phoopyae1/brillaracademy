import { verifyStudentToken } from '../utils/token.js';
export function requireStudent() {
    return (req, res, next) => {
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
//# sourceMappingURL=requireStudent.js.map