const request = require('supertest');
const app = require('../src/server');
const { setupTestDb } = require('./utils/testSetup');

beforeAll(async () => {
    await setupTestDb();
});

describe('Authentication API', () => {

    it('should login successfully with correct credentials', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'admin@test.local', password: 'admin123' });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.token).toBeDefined();
        expect(res.body.data.user.role).toBe('ADMIN');
        expect(res.body.data.user.email).toBe('admin@test.local');
        // password hash must never be exposed
        expect(res.body.data.user.passwordHash).toBeUndefined();
    });

    it('should reject invalid password with 401', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'admin@test.local', password: 'wrongpassword' });

        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);
    });

    it('should reject non-existent email with 401', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'ghost@test.local', password: 'admin123' });

        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);
    });

    it('should fail Joi validation when email is missing', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ password: 'admin123' });

        expect(res.status).toBe(400);
        expect(res.body.message).toContain('email');
    });

    it('should fail Joi validation when password is missing', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'admin@test.local' });

        expect(res.status).toBe(400);
        expect(res.body.message).toContain('password');
    });

    it('should fail Joi validation when email format is invalid', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'not-an-email', password: 'admin123' });

        expect(res.status).toBe(400);
    });

    it('should reject structurally malformed JSON with 400', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .set('Content-Type', 'application/json')
            .send('{"email": "admin@test.local", "password": "pass"'); // missing closing brace

        expect(res.status).toBe(400);
    });

    it('should reject inactive user with 403', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'inactive@test.local', password: 'inactive123' });

        expect(res.status).toBe(403);
        expect(res.body.success).toBe(false);
    });

    it('should return a valid JWT structure in the token', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'admin@test.local', password: 'admin123' });

        expect(res.status).toBe(200);
        const token = res.body.data.token;
        // JWT has 3 dot-separated base64 parts
        expect(token.split('.').length).toBe(3);
    });

});
