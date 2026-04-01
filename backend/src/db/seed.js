const { run, get, db } = require('./sqlite');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

const ANALYST_EMAIL = process.env.ANALYST_EMAIL;
const ANALYST_PASSWORD = process.env.ANALYST_PASSWORD;

const VIEWER_EMAIL = process.env.VIEWER_EMAIL;
const VIEWER_PASSWORD = process.env.VIEWER_PASSWORD;

async function seedAdmin() {
    if (!ADMIN_EMAIL || !ADMIN_PASSWORD || !ANALYST_EMAIL || !VIEWER_EMAIL) {
        console.error('Fatal Error: Required seed environmental variables missing (ADMIN, ANALYST, VIEWER).');
        process.exit(1);
    }
    
    const usersToSeed = [
        { email: ADMIN_EMAIL, password: ADMIN_PASSWORD, role: 'ADMIN' },
        { email: ANALYST_EMAIL, password: ANALYST_PASSWORD, role: 'ANALYST' },
        { email: VIEWER_EMAIL, password: VIEWER_PASSWORD, role: 'VIEWER' }
    ];

    try {
        const now = new Date().toISOString();

        for (const user of usersToSeed) {
            console.log(`Checking for existing ${user.role} user (${user.email})...`);
            const existingUser = await get(`SELECT id FROM users WHERE email = ?`, [user.email]);
            
            if (existingUser) {
                console.log(`- ${user.role} user already exists. Skipping.`);
                continue;
            }

            console.log(`- Creating ${user.role} user...`);
            const passwordHash = await bcrypt.hash(user.password, 10);
            const id = uuidv4();

            await run(
                `INSERT INTO users (id, email, passwordHash, role, isActive, createdAt, updatedAt) 
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [id, user.email, passwordHash, user.role, 1, now, now]
            );

            console.log(`Successfully created ${user.role}: ${user.email} / ${user.password}`);
        }
    } catch (err) {
        console.error('Error seeding users:', err);
    } finally {
        db.close();
    }
}

seedAdmin();
