const { run, get, db } = require('./sqlite');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

async function seedAdmin() {
    try {
        console.log('Checking for existing admin user...');
        const existingAdmin = await get(`SELECT id FROM users WHERE email = ?`, ['admin@finance.local']);
        
        if (existingAdmin) {
            console.log('Admin user already exists. Skipping seed.');
            return;
        }

        console.log('Creating initial admin user...');
        const passwordHash = await bcrypt.hash('admin123', 10);
        const now = new Date().toISOString();
        const id = uuidv4();

        await run(
            `INSERT INTO users (id, email, passwordHash, role, isActive, createdAt, updatedAt) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [id, 'admin@finance.local', passwordHash, 'ADMIN', 1, now, now]
        );

        console.log('Successfully created initial admin user!');
        console.log('Email: admin@finance.local');
        console.log('Password: admin123');
    } catch (err) {
        console.error('Error seeding admin user:', err);
    } finally {
        db.close();
    }
}

seedAdmin();
