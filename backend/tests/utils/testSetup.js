const { db, run } = require('../../src/db/sqlite');
const { initializeDatabase } = require('../../src/db/init');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

async function setupTestDb() {
    // Guarantee JWT secret exists for test signing
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'fallback-test-secret';

    // Recreate tables on the :memory: database
    await initializeDatabase(false);

    // Wipe isolated shared memory db state between runs
    await run(`DELETE FROM audit_logs`);
    await run(`DELETE FROM financial_records`);
    await run(`DELETE FROM users`);

    // Hardcode an admin test user directly instead of running the full seed.js script
    const passwordHash = await bcrypt.hash('admin123', 1); // 1 salt for fast testing
    const now = new Date().toISOString();
    
    await run(
        `INSERT OR IGNORE INTO users (id, email, passwordHash, role, isActive, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        ['admin-test-id', 'admin@test.local', passwordHash, 'ADMIN', 1, now, now]
    );

    // Hardcode a viewer test user
    const viewerHash = await bcrypt.hash('viewer123', 1);
    await run(
        `INSERT OR IGNORE INTO users (id, email, passwordHash, role, isActive, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        ['viewer-test-id', 'viewer@test.local', viewerHash, 'VIEWER', 1, now, now]
    );
}

module.exports = { setupTestDb };
