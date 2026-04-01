const { run, get, all } = require('../db/sqlite');
const { v4: uuidv4 } = require('uuid');

class UserRepository {
    async findByEmail(email) {
        return await get('SELECT * FROM users WHERE email = ?', [email]);
    }

    async findById(id) {
        return await get('SELECT * FROM users WHERE id = ?', [id]);
    }

    async findAll() {
        return await all('SELECT id, email, role, isActive, createdAt, updatedAt FROM users');
    }

    async create(userData) {
        const id = uuidv4();
        const now = new Date().toISOString();
        const { email, passwordHash, role, isActive } = userData;

        await run(
            `INSERT INTO users (id, email, passwordHash, role, isActive, createdAt, updatedAt) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [id, email, passwordHash, role, isActive === false ? 0 : 1, now, now]
        );
        return { id, email, role, isActive, createdAt: now };
    }

    async update(id, updates) {
        const { role } = updates;
        const now = new Date().toISOString();

        await run(
            `UPDATE users SET role = ?, updatedAt = ? WHERE id = ?`,
            [role, now, id]
        );
        return await this.findById(id);
    }

    async updateStatus(id, isActive) {
        const now = new Date().toISOString();
        const statusVal = isActive ? 1 : 0;
        await run(
            `UPDATE users SET isActive = ?, updatedAt = ? WHERE id = ?`,
            [statusVal, now, id]
        );
        return await this.findById(id);
    }
}

module.exports = new UserRepository();
