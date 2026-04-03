const request = require('supertest');
const app = require('../src/server');
const { setupTestDb } = require('./utils/testSetup');
const { run } = require('../src/db/sqlite');
const jwt = require('jsonwebtoken');

let adminToken;
let analystToken;
let viewerToken;

beforeAll(async () => {
    await setupTestDb();

    adminToken   = jwt.sign({ id: 'admin-test-id',   role: 'ADMIN'   }, process.env.JWT_SECRET);
    analystToken = jwt.sign({ id: 'analyst-test-id', role: 'ANALYST' }, process.env.JWT_SECRET);
    viewerToken  = jwt.sign({ id: 'viewer-test-id',  role: 'VIEWER'  }, process.env.JWT_SECRET);

    // Inject deterministic data for predictable arithmetic
    await run(`DELETE FROM financial_records`);
    const now = new Date().toISOString();

    // Jan 2024: 2000 income, 500 expense
    await run(`INSERT INTO financial_records (id, amount, type, category, date, createdBy, createdAt, updatedAt) VALUES (?, 2000, 'INCOME', 'Salary',    '2024-01-15', 'admin-test-id', ?, ?)`, ['dash-1', now, now]);
    await run(`INSERT INTO financial_records (id, amount, type, category, date, createdBy, createdAt, updatedAt) VALUES (?, 500,  'EXPENSE', 'Food',      '2024-01-20', 'admin-test-id', ?, ?)`, ['dash-2', now, now]);
    // Feb 2024: 1000 income, 300 expense
    await run(`INSERT INTO financial_records (id, amount, type, category, date, createdBy, createdAt, updatedAt) VALUES (?, 1000, 'INCOME', 'Freelance', '2024-02-10', 'admin-test-id', ?, ?)`, ['dash-3', now, now]);
    await run(`INSERT INTO financial_records (id, amount, type, category, date, createdBy, createdAt, updatedAt) VALUES (?, 300,  'EXPENSE', 'Transport', '2024-02-15', 'admin-test-id', ?, ?)`, ['dash-4', now, now]);
    // Soft-deleted record — must NOT appear in totals
    await run(`INSERT INTO financial_records (id, amount, type, category, date, createdBy, createdAt, updatedAt, deletedAt) VALUES (?, 9999, 'INCOME', 'Other', '2024-01-01', 'admin-test-id', ?, ?, ?)`, ['dash-deleted', now, now, now]);
});

describe('Dashboard API', () => {

    // ── Summary ──────────────────────────────────────────────────────────────

    it('returns correct totalIncome, totalExpenses, netBalance', async () => {
        const res = await request(app)
            .get('/api/dashboard/summary')
            .set('Authorization', `Bearer ${viewerToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        // 2000 + 1000 = 3000 income; 500 + 300 = 800 expense; net = 2200
        expect(res.body.data.totalIncome).toBe(3000);
        expect(res.body.data.totalExpenses).toBe(800);
        expect(res.body.data.netBalance).toBe(2200);
    });

    it('soft-deleted records are excluded from summary totals', async () => {
        const res = await request(app)
            .get('/api/dashboard/summary')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        // If soft-deleted 9999 were included, totalIncome would be 12999
        expect(res.body.data.totalIncome).toBe(3000);
    });

    it('returns category breakdown array', async () => {
        const res = await request(app)
            .get('/api/dashboard/summary')
            .set('Authorization', `Bearer ${viewerToken}`);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.data.categories)).toBe(true);
        expect(res.body.data.categories.length).toBeGreaterThan(0);

        const salaryEntry = res.body.data.categories.find(c => c.category === 'Salary');
        expect(salaryEntry).toBeDefined();
        expect(salaryEntry.total).toBe(2000);
    });

    it('ANALYST can access dashboard summary', async () => {
        const res = await request(app)
            .get('/api/dashboard/summary')
            .set('Authorization', `Bearer ${analystToken}`);

        expect(res.status).toBe(200);
    });

    it('ADMIN can access dashboard summary', async () => {
        const res = await request(app)
            .get('/api/dashboard/summary')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
    });

    it('unauthenticated request to summary is rejected with 401', async () => {
        const res = await request(app).get('/api/dashboard/summary');
        expect(res.status).toBe(401);
    });

    // ── Trends ───────────────────────────────────────────────────────────────

    it('returns monthly trends with correct structure', async () => {
        const res = await request(app)
            .get('/api/dashboard/trends?period=monthly')
            .set('Authorization', `Bearer ${viewerToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.period).toBe('monthly');
        expect(Array.isArray(res.body.data.trends)).toBe(true);
        expect(res.body.data.trends.length).toBeGreaterThan(0);

        const jan = res.body.data.trends.find(t => t.periodKey === '2024-01');
        expect(jan).toBeDefined();
        expect(jan.income).toBe(2000);
        expect(jan.expense).toBe(500);
    });

    it('returns weekly trends with correct structure', async () => {
        const res = await request(app)
            .get('/api/dashboard/trends?period=weekly')
            .set('Authorization', `Bearer ${viewerToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.period).toBe('weekly');
        expect(Array.isArray(res.body.data.trends)).toBe(true);
    });

    it('defaults to monthly when period param is omitted', async () => {
        const res = await request(app)
            .get('/api/dashboard/trends')
            .set('Authorization', `Bearer ${viewerToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.period).toBe('monthly');
    });

    it('unauthenticated request to trends is rejected with 401', async () => {
        const res = await request(app).get('/api/dashboard/trends');
        expect(res.status).toBe(401);
    });

    it('VIEWER can access trends', async () => {
        const res = await request(app)
            .get('/api/dashboard/trends')
            .set('Authorization', `Bearer ${viewerToken}`);

        expect(res.status).toBe(200);
    });

    it('returns empty trends array when no records exist', async () => {
        // Temporarily clear records
        await run(`DELETE FROM financial_records`);

        const res = await request(app)
            .get('/api/dashboard/trends')
            .set('Authorization', `Bearer ${viewerToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.trends).toEqual([]);
    });

    it('returns zero totals in summary when no records exist', async () => {
        // Records already cleared from previous test
        const res = await request(app)
            .get('/api/dashboard/summary')
            .set('Authorization', `Bearer ${viewerToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.totalIncome).toBe(0);
        expect(res.body.data.totalExpenses).toBe(0);
        expect(res.body.data.netBalance).toBe(0);
    });

});
