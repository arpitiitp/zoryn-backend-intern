const { run, db } = require('./sqlite');

async function initializeDatabase() {
    console.log('Initializing database tables...');

    try {
        await run(`
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                passwordHash TEXT NOT NULL,
                role TEXT NOT NULL CHECK(role IN ('VIEWER', 'ANALYST', 'ADMIN')),
                isActive INTEGER DEFAULT 1,
                createdAt TEXT NOT NULL,
                updatedAt TEXT NOT NULL
            );
        `);

        await run(`
            CREATE TABLE IF NOT EXISTS financial_records (
                id TEXT PRIMARY KEY,
                amount REAL NOT NULL,
                type TEXT NOT NULL CHECK(type IN ('INCOME', 'EXPENSE')),
                category TEXT NOT NULL,
                date TEXT NOT NULL,
                notes TEXT,
                createdBy TEXT NOT NULL,
                createdAt TEXT NOT NULL,
                updatedAt TEXT NOT NULL,
                deletedAt TEXT,
                deletedBy TEXT,
                FOREIGN KEY (createdBy) REFERENCES users(id) ON DELETE CASCADE
            );
        `);

        await run(`
            CREATE TABLE IF NOT EXISTS audit_logs (
                id TEXT PRIMARY KEY,
                entityType TEXT NOT NULL,
                entityId TEXT NOT NULL,
                action TEXT NOT NULL CHECK(action IN ('CREATE', 'UPDATE', 'DELETE')),
                performedBy TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                changes TEXT,
                FOREIGN KEY (performedBy) REFERENCES users(id) ON DELETE SET NULL
            );
        `);

        console.log('Database tables created successfully.');
    } catch (err) {
        console.error('Error creating database tables:', err);
    } finally {
        db.close();
    }
}

initializeDatabase();
