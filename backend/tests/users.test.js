const request = require('supertest');
const app = require('../src/server');
const { setupTestDb } = require('./utils/testSetup');
const jwt = require('jsonwebtoken');

let adminToken;
let analystToken;
let viewerToken;
let createdUserId;

beforeAll(async () => {
    await setupTestDb();
    adminToken   = jwt.sign({ id: 'admin-test-id',   role: 'ADMIN'   }, process.env.JWT_SECRET);
    analystToken = jwt.sign({ id: 'analyst-test-id', role: 'ANALYST' }, process.env.JWT_SECRET);
    viewerToken  = jwt.sign({ id: 'viewer-test-id',  role: 'VIEWER'  }, process.env.JWT_SECRET);
});

describe('Users API — RBAC & Management', () => {

    // ── List Users ──────────────────────────────────────────────────────────

    it('ADMIN can list all users', async () => {
        const res = await request(app)
            .get('/api/users')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('VIEWER is forbidden from listing users', async () => {
        const res = await request(app)
            .get('/api/users')
            .set('Authorization', `Bearer ${viewerToken}`);

        expect(res.status).toBe(403);
        expect(res.body.message).toContain('Forbidden');
    });

    it('ANALYST is forbidden from listing users', async () => {
        const res = await request(app)
            .get('/api/users')
            .set('Authorization', `Bearer ${analystToken}`);

        expect(res.status).toBe(403);
    });

    it('unauthenticated request is rejected with 401', async () => {
        const res = await request(app).get('/api/users');
        expect(res.status).toBe(401);
    });

    it('expired/invalid token is rejected with 403', async () => {
        const res = await request(app)
            .get('/api/users')
            .set('Authorization', 'Bearer totally.invalid.token');
        expect(res.status).toBe(403);
    });

    // ── Create User ─────────────────────────────────────────────────────────

    it('ADMIN can create a new ANALYST user', async () => {
        const res = await request(app)
            .post('/api/users')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ email: 'newanalyst@test.local', password: 'password123', role: 'ANALYST' });

        expect(res.status).toBe(201);
        expect(res.body.data.role).toBe('ANALYST');
        expect(res.body.data.email).toBe('newanalyst@test.local');
        // password hash must never be returned
        expect(res.body.data.passwordHash).toBeUndefined();
        createdUserId = res.body.data.id;
    });

    it('ADMIN can create a VIEWER user', async () => {
        const res = await request(app)
            .post('/api/users')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ email: 'newviewer@test.local', password: 'password123', role: 'VIEWER' });

        expect(res.status).toBe(201);
        expect(res.body.data.role).toBe('VIEWER');
    });

    it('duplicate email is rejected with 409', async () => {
        const res = await request(app)
            .post('/api/users')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ email: 'newanalyst@test.local', password: 'password123', role: 'ANALYST' });

        expect(res.status).toBe(409);
    });

    it('VIEWER cannot create a user', async () => {
        const res = await request(app)
            .post('/api/users')
            .set('Authorization', `Bearer ${viewerToken}`)
            .send({ email: 'rogue@test.local', password: 'password123', role: 'VIEWER' });

        expect(res.status).toBe(403);
    });

    it('ANALYST cannot create a user', async () => {
        const res = await request(app)
            .post('/api/users')
            .set('Authorization', `Bearer ${analystToken}`)
            .send({ email: 'rogue2@test.local', password: 'password123', role: 'VIEWER' });

        expect(res.status).toBe(403);
    });

    it('Joi rejects invalid role value', async () => {
        const res = await request(app)
            .post('/api/users')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ email: 'badrole@test.local', password: 'password123', role: 'SUPERUSER' });

        expect(res.status).toBe(400);
    });

    it('Joi rejects password shorter than 6 chars', async () => {
        const res = await request(app)
            .post('/api/users')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ email: 'shortpass@test.local', password: '123', role: 'VIEWER' });

        expect(res.status).toBe(400);
    });

    // ── Update User Role ─────────────────────────────────────────────────────

    it('ADMIN can update a user role', async () => {
        expect(createdUserId).toBeDefined();
        const res = await request(app)
            .put(`/api/users/${createdUserId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ role: 'VIEWER' });

        expect(res.status).toBe(200);
        expect(res.body.data.role).toBe('VIEWER');
    });

    it('updating a non-existent user returns 404', async () => {
        const res = await request(app)
            .put('/api/users/non-existent-id-xyz')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ role: 'VIEWER' });

        expect(res.status).toBe(404);
    });

    // ── Toggle User Status ───────────────────────────────────────────────────

    it('ADMIN can deactivate a user', async () => {
        expect(createdUserId).toBeDefined();
        const res = await request(app)
            .patch(`/api/users/${createdUserId}/status`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ isActive: false });

        expect(res.status).toBe(200);
    });

    it('ADMIN can reactivate a user', async () => {
        expect(createdUserId).toBeDefined();
        const res = await request(app)
            .patch(`/api/users/${createdUserId}/status`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ isActive: true });

        expect(res.status).toBe(200);
    });

    it('Joi rejects missing isActive on status update', async () => {
        expect(createdUserId).toBeDefined();
        const res = await request(app)
            .patch(`/api/users/${createdUserId}/status`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({});

        expect(res.status).toBe(400);
    });

    // ── Filter Users ─────────────────────────────────────────────────────────

    it('ADMIN can filter users by role', async () => {
        const res = await request(app)
            .get('/api/users?role=ADMIN')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.every(u => u.role === 'ADMIN')).toBe(true);
    });

    it('ADMIN can filter users by isActive=true', async () => {
        const res = await request(app)
            .get('/api/users?isActive=true')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.every(u => u.isActive === 1)).toBe(true);
    });

});
