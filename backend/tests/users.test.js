const request = require('supertest');
const app = require('../src/server');
const { setupTestDb } = require('./utils/testSetup');
const jwt = require('jsonwebtoken');

let adminToken;
let viewerToken;

beforeAll(async () => {
    await setupTestDb();
    
    // Generate valid tokens
    adminToken = jwt.sign({ id: 'admin-test-id', role: 'ADMIN' }, process.env.JWT_SECRET);
    viewerToken = jwt.sign({ id: 'viewer-test-id', role: 'VIEWER' }, process.env.JWT_SECRET);
});

describe('Users API (RBAC Guarantees)', () => {

    it('should allow ADMIN to fetch user lists', async () => {
        const response = await request(app)
            .get('/api/users')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should block VIEWER from fetching user lists', async () => {
        const response = await request(app)
            .get('/api/users')
            .set('Authorization', `Bearer ${viewerToken}`);

        expect(response.status).toBe(403);
        expect(response.body.message).toContain('Forbidden');
    });

    it('should block totally anonymous requests without token', async () => {
        const response = await request(app).get('/api/users');
        expect(response.status).toBe(401);
    });

    it('should allow ADMIN to create another user', async () => {
        const response = await request(app)
            .post('/api/users')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                email: 'newanalyst@test.local',
                password: 'password123',
                role: 'ANALYST'
            });

        expect(response.status).toBe(201);
        expect(response.body.data.role).toBe('ANALYST');
    });

    it('should block duplicate emails', async () => {
        const response = await request(app)
            .post('/api/users')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                email: 'newanalyst@test.local',
                password: 'password123',
                role: 'ANALYST'
            });

        expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should block VIEWER from creating a user', async () => {
        const response = await request(app)
            .post('/api/users')
            .set('Authorization', `Bearer ${viewerToken}`)
            .send({
                email: 'rogue@test.local',
                password: 'password123',
                role: 'VIEWER'
            });

        expect(response.status).toBe(403);
    });

});
