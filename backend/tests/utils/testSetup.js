const { run } = require('../../src/db/sqlite');
const { initializeDatabase } = require('../../src/db/init');
const bcrypt = require('bcryptjs');

async function setupTestDb() {
    // Guarantee JWT secret exists for test signing
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'fallback-test-secret';

    // Recreate tables on the :memory: database
    await initializeDatabase(false);

    // Wipe state between test suite runs
    await run(`DELETE FROM audit_logs`);
    await run(`DELETE FROM financial_records`);
    await run(`DELETE FROM users`);

    const now = new Date().toISOString();

    // Use salt rounds of 1 for fast test hashing
    const adminHash    = await bcrypt.hash('admin123',    1);
    const analystHash  = await bcrypt.hash('analyst123',  1);
    const viewerHash   = await bcrypt.hash('viewer123',   1);
    const inactiveHash = await bcrypt.hash('inactive123', 1);

    await run(
        `INSERT OR IGNORE INTO users (id, email, passwordHash, role, isActive, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        ['admin-test-id', 'admin@test.local', adminHash, 'ADMIN', 1, now, now]
    );
    await run(
        `INSERT OR IGNORE INTO users (id, email, passwordHash, role, isActive, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        ['analyst-test-id', 'analyst@test.local', analystHash, 'ANALYST', 1, now, now]
    );
    await run(
        `INSERT OR IGNORE INTO users (id, email, passwordHash, role, isActive, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        ['viewer-test-id', 'viewer@test.local', viewerHash, 'VIEWER', 1, now, now]
    );
    // Inactive user — edge case for login rejection
    await run(
        `INSERT OR IGNORE INTO users (id, email, passwordHash, role, isActive, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        ['inactive-test-id', 'inactive@test.local', inactiveHash, 'VIEWER', 0, now, now]
    );
}

module.exports = { setupTestDb };
