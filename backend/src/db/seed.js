const { run, get, db } = require('./sqlite');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

async function seedAdmin() {
    if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
        console.error('Fatal Error: ADMIN_EMAIL or ADMIN_PASSWORD missing from .env variables.');
        process.exit(1);
    }
    try {
        console.log('Checking for existing admin user...');
        const existingAdmin = await get(`SELECT id FROM users WHERE email = ?`, [ADMIN_EMAIL]);
        
        if (existingAdmin) {
            console.log('Admin user already exists. Skipping seed.');
            return;
        }

        console.log('Creating initial admin user...');
        const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
        const now = new Date().toISOString();
        const id = uuidv4();

        await run(
            `INSERT INTO users (id, email, passwordHash, role, isActive, createdAt, updatedAt) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [id, ADMIN_EMAIL, passwordHash, 'ADMIN', 1, now, now]
        );

        console.log('Successfully created initial admin user!');
        console.log(`Email: ${ADMIN_EMAIL}`);
        console.log(`Password: ${ADMIN_PASSWORD} (loaded from environment)`);
    } catch (err) {
        console.error('Error seeding admin user:', err);
    } finally {
        db.close();
    }
}

seedAdmin();
