const request = require('supertest');
const app = require('../src/server');
const { setupTestDb } = require('./utils/testSetup');
const jwt = require('jsonwebtoken');

let adminToken;
let analystToken;
let viewerToken;
let adminRecordId;
let analystRecordId;

beforeAll(async () => {
    await setupTestDb();
    adminToken   = jwt.sign({ id: 'admin-test-id',   role: 'ADMIN'   }, process.env.JWT_SECRET);
    analystToken = jwt.sign({ id: 'analyst-test-id', role: 'ANALYST' }, process.env.JWT_SECRET);
    viewerToken  = jwt.sign({ id: 'viewer-test-id',  role: 'VIEWER'  }, process.env.JWT_SECRET);
});

describe('Financial Records API', () => {

    // ── Create ───────────────────────────────────────────────────────────────

    it('ADMIN can create a valid financial record', async () => {
        const res = await request(app)
            .post('/api/records')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ amount: 1500, type: 'INCOME', category: 'Salary', date: '2024-01-15' });

        expect(res.status).toBe(201);
        expect(res.body.data.id).toBeDefined();
        expect(res.body.data.amount).toBe(1500);
        expect(res.body.data.type).toBe('INCOME');
        adminRecordId = res.body.data.id;
    });

    it('ANALYST can create a record (owns it)', async () => {
        const res = await request(app)
            .post('/api/records')
            .set('Authorization', `Bearer ${analystToken}`)
            .send({ amount: 300, type: 'INCOME', category: 'Freelance', date: '2024-01-20' });

        expect(res.status).toBe(201);
        expect(res.body.data.id).toBeDefined();
        analystRecordId = res.body.data.id;
    });

    it('VIEWER cannot create a record', async () => {
        const res = await request(app)
            .post('/api/records')
            .set('Authorization', `Bearer ${viewerToken}`)
            .send({ amount: 100, type: 'EXPENSE', category: 'Food', date: '2024-01-01' });

        expect(res.status).toBe(403);
    });

    it('unauthenticated request to create is rejected with 401', async () => {
        const res = await request(app)
            .post('/api/records')
            .send({ amount: 100, type: 'EXPENSE', category: 'Food', date: '2024-01-01' });

        expect(res.status).toBe(401);
    });

    // ── Joi Validation ───────────────────────────────────────────────────────

    it('rejects negative amount', async () => {
        const res = await request(app)
            .post('/api/records')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ amount: -50, type: 'EXPENSE', category: 'Food', date: '2024-01-05' });

        expect(res.status).toBe(400);
        expect(res.body.message).toContain('amount');
    });

    it('rejects zero amount', async () => {
        const res = await request(app)
            .post('/api/records')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ amount: 0, type: 'EXPENSE', category: 'Food', date: '2024-01-05' });

        expect(res.status).toBe(400);
    });

    it('rejects invalid type value', async () => {
        const res = await request(app)
            .post('/api/records')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ amount: 100, type: 'TRANSFER', category: 'Food', date: '2024-01-05' });

        expect(res.status).toBe(400);
    });

    it('rejects missing required fields', async () => {
        const res = await request(app)
            .post('/api/records')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ amount: 100 }); // missing type, category, date

        expect(res.status).toBe(400);
    });

    it('rejects invalid ISO date format', async () => {
        const res = await request(app)
            .post('/api/records')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ amount: 100, type: 'INCOME', category: 'Salary', date: 'not-a-date' });

        expect(res.status).toBe(400);
    });

    // ── Read ─────────────────────────────────────────────────────────────────

    it('ADMIN can fetch a single record by ID', async () => {
        expect(adminRecordId).toBeDefined();
        const res = await request(app)
            .get(`/api/records/${adminRecordId}`)
            .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.amount).toBe(1500);
    });

    it('VIEWER can fetch a single record', async () => {
        expect(adminRecordId).toBeDefined();
        const res = await request(app)
            .get(`/api/records/${adminRecordId}`)
            .set('Authorization', `Bearer ${viewerToken}`);

        expect(res.status).toBe(200);
    });

    it('returns 404 for non-existent record ID', async () => {
        const res = await request(app)
            .get('/api/records/non-existent-ghost-id')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(404);
    });

    it('ADMIN can list all records with pagination metadata', async () => {
        const res = await request(app)
            .get('/api/records?page=1&limit=5')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.meta).toBeDefined();
        expect(res.body.meta.page).toBe(1);
        expect(res.body.meta.limit).toBe(5);
        expect(res.body.meta.total).toBeDefined();
        expect(res.body.meta.totalPages).toBeDefined();
    });

    it('VIEWER can list records', async () => {
        const res = await request(app)
            .get('/api/records')
            .set('Authorization', `Bearer ${viewerToken}`);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('can filter records by type=INCOME', async () => {
        const res = await request(app)
            .get('/api/records?type=INCOME')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.every(r => r.type === 'INCOME')).toBe(true);
    });

    it('can filter records by category', async () => {
        const res = await request(app)
            .get('/api/records?category=Salary')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.every(r => r.category === 'Salary')).toBe(true);
    });

    it('can filter records by date range', async () => {
        const res = await request(app)
            .get('/api/records?from=2024-01-01&to=2024-01-31')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);
    });

    // ── Update ───────────────────────────────────────────────────────────────

    it('ADMIN can update any record', async () => {
        expect(adminRecordId).toBeDefined();
        const res = await request(app)
            .put(`/api/records/${adminRecordId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ amount: 2000, type: 'INCOME', category: 'Bonus', date: '2024-01-15' });

        expect(res.status).toBe(200);
        expect(res.body.data.amount).toBe(2000);
        expect(res.body.data.category).toBe('Bonus');
    });

    it('ANALYST can update their own record', async () => {
        expect(analystRecordId).toBeDefined();
        const res = await request(app)
            .put(`/api/records/${analystRecordId}`)
            .set('Authorization', `Bearer ${analystToken}`)
            .send({ amount: 450, type: 'INCOME', category: 'Freelance', date: '2024-01-20' });

        expect(res.status).toBe(200);
        expect(res.body.data.amount).toBe(450);
    });

    it('ANALYST cannot update a record they did not create', async () => {
        expect(adminRecordId).toBeDefined();
        const res = await request(app)
            .put(`/api/records/${adminRecordId}`)
            .set('Authorization', `Bearer ${analystToken}`)
            .send({ amount: 999, type: 'INCOME', category: 'Bonus', date: '2024-01-15' });

        expect(res.status).toBe(403);
        expect(res.body.message).toContain('can only edit their own');
    });

    it('VIEWER cannot update a record', async () => {
        expect(adminRecordId).toBeDefined();
        const res = await request(app)
            .put(`/api/records/${adminRecordId}`)
            .set('Authorization', `Bearer ${viewerToken}`)
            .send({ amount: 999, type: 'INCOME', category: 'Bonus', date: '2024-01-15' });

        expect(res.status).toBe(403);
    });

    it('updating a non-existent record returns 404', async () => {
        const res = await request(app)
            .put('/api/records/ghost-id-xyz')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ amount: 100, type: 'INCOME', category: 'Salary', date: '2024-01-01' });

        expect(res.status).toBe(404);
    });

    // ── Audit Logs ───────────────────────────────────────────────────────────

    it('can retrieve audit logs for a record', async () => {
        expect(adminRecordId).toBeDefined();
        const res = await request(app)
            .get(`/api/records/${adminRecordId}/audit-logs`)
            .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);
    });

    // ── Delete (soft) ────────────────────────────────────────────────────────

    it('ANALYST cannot delete a record', async () => {
        expect(adminRecordId).toBeDefined();
        const res = await request(app)
            .delete(`/api/records/${adminRecordId}`)
            .set('Authorization', `Bearer ${analystToken}`);

        expect(res.status).toBe(403);
    });

    it('VIEWER cannot delete a record', async () => {
        expect(adminRecordId).toBeDefined();
        const res = await request(app)
            .delete(`/api/records/${adminRecordId}`)
            .set('Authorization', `Bearer ${viewerToken}`);

        expect(res.status).toBe(403);
    });

    it('ADMIN can soft-delete a record', async () => {
        expect(adminRecordId).toBeDefined();
        const res = await request(app)
            .delete(`/api/records/${adminRecordId}`)
            .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
    });

    it('soft-deleted record is no longer accessible via GET', async () => {
        expect(adminRecordId).toBeDefined();
        const res = await request(app)
            .get(`/api/records/${adminRecordId}`)
            .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(404);
    });

    it('deleting a non-existent record returns 404', async () => {
        const res = await request(app)
            .delete('/api/records/ghost-id-xyz')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(404);
    });

});
