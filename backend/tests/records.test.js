const request = require('supertest');
const app = require('../src/server');
const { setupTestDb } = require('./utils/testSetup');
const jwt = require('jsonwebtoken');

let adminToken;
let testRecordId;

beforeAll(async () => {
    await setupTestDb();
    adminToken = jwt.sign({ id: 'admin-test-id', role: 'ADMIN' }, process.env.JWT_SECRET);
});

describe('Financial Records API', () => {

    it('should allow ADMIN to create a valid financial record', async () => {
        const response = await request(app)
            .post('/api/records')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                amount: 1500,
                type: 'INCOME',
                category: 'Salary',
                date: '2023-10-01'
            });

        expect(response.status).toBe(201);
        expect(response.body.data.id).toBeDefined();
        testRecordId = response.body.data.id;
    });

    it('should REJECT an invalid Joi payload (amount cannot be negative)', async () => {
        const response = await request(app)
            .post('/api/records')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                amount: -50, // Intentional schema failure
                type: 'EXPENSE',
                category: 'Food',
                date: '2023-10-05'
            });

        expect(response.status).toBe(400);
        expect(response.body.message).toContain('amount');
    });

    it('should fetch the created record', async () => {
        expect(testRecordId).toBeDefined(); // fail fast
        const response = await request(app)
            .get(`/api/records/${testRecordId}`)
            .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.amount).toBe(1500);
    });

    it('should fail to fetch a 404 record', async () => {
        const response = await request(app)
            .get(`/api/records/invalid-id-ghost`)
            .set('Authorization', `Bearer ${adminToken}`);
        expect(response.status).toBe(404);
    });

    it('should allow ADMIN to update the record', async () => {
        expect(testRecordId).toBeDefined();
        const response = await request(app)
            .put(`/api/records/${testRecordId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                amount: 2000,
                type: 'INCOME',
                category: 'Bonus',
                date: '2023-10-01'
            });
        expect(response.status).toBe(200);
        expect(response.body.data.amount).toBe(2000);
    });

    it('should allow ANALYST to create a record', async () => {
        const analystToken = jwt.sign({ id: 'analyst-test-id', role: 'ANALYST' }, process.env.JWT_SECRET);
        const response = await request(app)
            .post('/api/records')
            .set('Authorization', `Bearer ${analystToken}`)
            .send({
                amount: 300, type: 'INCOME', category: 'Freelance', date: '2023-10-02'
            });
        expect(response.status).toBe(201);
        expect(response.body.data.id).toBeDefined();
    });

    it('should reject ANALYST from updating a record they did not create', async () => {
        const analystToken = jwt.sign({ id: 'analyst-test-id', role: 'ANALYST' }, process.env.JWT_SECRET);
        expect(testRecordId).toBeDefined();
        const response = await request(app)
            .put(`/api/records/${testRecordId}`)
            .set('Authorization', `Bearer ${analystToken}`)
            .send({
                amount: 400, type: 'INCOME', category: 'Bonus', date: '2023-10-02'
            });
        expect(response.status).toBe(403);
        expect(response.body.message).toContain('can only edit their own');
    });

    it('should allow ADMIN to soft-delete the record', async () => {
        expect(testRecordId).toBeDefined();
        const response = await request(app)
            .delete(`/api/records/${testRecordId}`)
            .set('Authorization', `Bearer ${adminToken}`);
        expect(response.status).toBe(200);
    });

    it('should reject a VIEWER from creating a record', async () => {
        const viewerToken = jwt.sign({ id: 'viewer-test-id', role: 'VIEWER' }, process.env.JWT_SECRET);
        const response = await request(app)
            .post('/api/records')
            .set('Authorization', `Bearer ${viewerToken}`)
            .send({
                amount: 100, type: 'EXPENSE', category: 'Food', date: '2023-10-01'
            });
        expect(response.status).toBe(403);
    });

});
