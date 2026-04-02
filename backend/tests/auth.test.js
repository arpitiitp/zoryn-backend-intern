const request = require('supertest');
const app = require('../src/server');
const { setupTestDb } = require('./utils/testSetup');

beforeAll(async () => {
    // Generate sqlite memory tables and insert 'admin@test.local' pre-hashed
    await setupTestDb();
});

describe('Authentication API', () => {

    it('should login successfully with correct credentials', async () => {
        const response = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'admin@test.local',
                password: 'admin123'
            });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.token).toBeDefined();
        expect(response.body.data.user.role).toBe('ADMIN');
    });

    it('should reject invalid password', async () => {
        const response = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'admin@test.local',
                password: 'wrongpassword'
            });

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
    });

    it('should fail Joi validation if email is missing', async () => {
        const response = await request(app)
            .post('/api/auth/login')
            .send({
                password: 'admin123'
            });

        expect(response.status).toBe(400);
        expect(response.body.message).toContain('email');
    });

    it('should reject non-existent email', async () => {
        const response = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'ghost@test.local',
                password: 'admin123'
            });

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
    });

    it('should reject structurally malformed JSON', async () => {
        const response = await request(app)
            .post('/api/auth/login')
            .set('Content-Type', 'application/json')
            .send('{"email": "admin@test.local", "password": "pass"'); // Missing closing brace

        expect(response.status).toBe(400);
    });

});
