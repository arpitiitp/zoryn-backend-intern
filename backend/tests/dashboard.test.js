const request = require('supertest');
const app = require('../src/server');
const { setupTestDb } = require('./utils/testSetup');
const { run } = require('../src/db/sqlite');
const jwt = require('jsonwebtoken');

let viewerToken;

beforeAll(async () => {
    await setupTestDb();
    viewerToken = jwt.sign({ id: 'viewer-test-id', role: 'VIEWER' }, process.env.JWT_SECRET);

    // Inject exact mock data to predict the arithmetic
    // 2000 Income - 500 Expense = 1500 Balance
    // Clear state specifically for deterministic math outputs here
    await run(`DELETE FROM financial_records`);

    const now = new Date().toISOString();
    await run(`INSERT OR IGNORE INTO financial_records (id, amount, type, category, date, createdBy, createdAt, updatedAt) VALUES (?, 2000, 'INCOME', 'Salary', '2023-01-01', 'admin-test-id', ?, ?)`, ['mock-1', now, now]);
    await run(`INSERT OR IGNORE INTO financial_records (id, amount, type, category, date, createdBy, createdAt, updatedAt) VALUES (?, 500, 'EXPENSE', 'Food', '2023-01-02', 'admin-test-id', ?, ?)`, ['mock-2', now, now]);
});

describe('Dashboard Math Arithmetic Guarantee', () => {

    it('should aggregate totals flawlessly', async () => {
        const response = await request(app)
            .get('/api/dashboard/summary')
            .set('Authorization', `Bearer ${viewerToken}`);

        expect(response.status).toBe(200);
        
        // Ensure SQL GROUP BY natively returned predictable outputs correctly!
        expect(response.body.data.totalIncome).toBe(2000);
        expect(response.body.data.totalExpenses).toBe(500);
        expect(response.body.data.netBalance).toBe(1500);
        expect(Array.isArray(response.body.data.categories)).toBe(true);
    });

    it('should reject unauthenticated requests', async () => {
        const response = await request(app).get('/api/dashboard/summary');
        expect(response.status).toBe(401);
    });

});
