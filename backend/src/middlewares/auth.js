const jwt = require('jsonwebtoken');
const { get } = require('../db/sqlite');

const JWT_SECRET = process.env.JWT_SECRET;

// interceptor to parse and verify JWTs so we know exactly who is talking to the API
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Format: Bearer <token>

    if (!token) {
        return res.error('Access token is missing or invalid', 401);
    }
    
    if (!JWT_SECRET) {
        console.error('Fatal Error: JWT_SECRET missing from environment map.');
        return res.error('Internal Server Config Error', 500);
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // extra check just in case the user got deleted or banned after the token was issued
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

// simple guard hook to lock down endpoints to specific roles
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
