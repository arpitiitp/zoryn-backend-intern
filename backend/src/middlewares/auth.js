const jwt = require('jsonwebtoken');
const { get } = require('../db/sqlite');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretassignmentkey';

// Middleware to parse and verify the JWT
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Format: Bearer <token>

    if (!token) {
        return res.error('Access token is missing or invalid', 401);
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Verify user still exists and is active
        const user = await get('SELECT id, role, isActive FROM users WHERE id = ?', [decoded.id]);
        if (!user || user.isActive === 0) {
            return res.error('User no longer exists or is disabled', 403);
        }

        req.user = { id: user.id, role: user.role };
        next();
    } catch (err) {
        return res.error('Access token is expired or invalid', 403);
    }
};

// Middleware to enforce RBAC
const requireRole = (rolesArray) => {
    return (req, res, next) => {
        if (!req.user || !req.user.role) {
            return res.error('Unauthorized access', 401);
        }

        if (!rolesArray.includes(req.user.role)) {
            return res.error(`Forbidden. Requires one of roles: ${rolesArray.join(', ')}`, 403);
        }

        next();
    };
};

module.exports = {
    authenticateToken,
    requireRole
};
