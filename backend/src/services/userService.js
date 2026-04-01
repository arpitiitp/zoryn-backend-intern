const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userRepository = require('../repositories/userRepository');

const JWT_SECRET = process.env.JWT_SECRET;

class UserService {
    async login(email, password) {
        const user = await userRepository.findByEmail(email);
        if (!user) {
            const err = new Error('Invalid email or password');
            err.statusCode = 401;
            throw err;
        }

        if (user.isActive === 0) {
            const err = new Error('Account disabled');
            err.statusCode = 403;
            throw err;
        }

        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
            const err = new Error('Invalid email or password');
            err.statusCode = 401;
            throw err;
        }

        if (!JWT_SECRET) {
            throw new Error('Fatal: JWT_SECRET missing from environment map.');
        }

        const token = jwt.sign(
            { id: user.id, role: user.role },
            JWT_SECRET,
            { expiresIn: '8h' }
        );

        return {
            token,
            user: { id: user.id, email: user.email, role: user.role }
        };
    }

    async getAllUsers() {
        return await userRepository.findAll();
    }

    async createUser(userData) {
        const existing = await userRepository.findByEmail(userData.email);
        if (existing) {
            const err = new Error('User with this email already exists');
            err.statusCode = 409;
            throw err;
        }

        const passwordHash = await bcrypt.hash(userData.password, 10);
        return await userRepository.create({ ...userData, passwordHash });
    }

    async updateUser(id, updates) {
        const user = await userRepository.findById(id);
        if (!user) {
            const err = new Error('User not found');
            err.statusCode = 404;
            throw err;
        }
        return await userRepository.update(id, updates);
    }

    async toggleStatus(id, isActive) {
        const user = await userRepository.findById(id);
        if (!user) {
            const err = new Error('User not found');
            err.statusCode = 404;
            throw err;
        }
        return await userRepository.updateStatus(id, isActive);
    }
}

module.exports = new UserService();
