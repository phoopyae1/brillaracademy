import { verifyStaffToken } from '../utils/token.js';
export function requireStaff(roles) {
    return (req, res, next) => {
        const header = req.headers.authorization;
        if (!header?.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Missing authorization token.' });
        }
        const token = header.slice('Bearer '.length);
        const payload = verifyStaffToken(token);
        if (!payload) {
            return res.status(401).json({ error: 'Invalid or expired session.' });
        }
        if (roles && !roles.includes(payload.role)) {
            return res.status(403).json({ error: 'You are not authorized to perform this action.' });
        }
        req.staff = { id: payload.staffId, role: payload.role, email: payload.email };
        return next();
    };
}
//# sourceMappingURL=requireStaff.js.map