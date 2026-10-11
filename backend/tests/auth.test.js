const request = require('supertest');
const app = require('../src/app');

describe('Dietitian Authentication APIs', () => {
  describe('POST /api/auth/login', () => {
    it('should fail with 400 when identifier is missing', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ password: 'Dietitian@123' });

      expect(res.status).toBe(400);
      expect(res.body.status).toBe('fail');
      expect(res.body.message).toMatch(/email or username is required/i);
    });

    it('should fail with 400 when password is missing', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'dietitian@ayurdiet.com' });

      expect(res.status).toBe(400);
      expect(res.body.status).toBe('fail');
      expect(res.body.message).toMatch(/password is required/i);
    });

    it('should reject with 401 when password is invalid', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'dietitian@ayurdiet.com',
          password: 'WrongPassword999',
        });

      expect(res.status).toBe(401);
      expect(res.body.status).toBe('fail');
      expect(res.body.message).toMatch(/invalid email\/username or password/i);
    });

    it('should reject with 401 when identifier does not exist', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'unknown.user@example.com',
          password: 'Dietitian@123',
        });

      expect(res.status).toBe(401);
      expect(res.body.status).toBe('fail');
      expect(res.body.message).toMatch(/invalid email\/username or password/i);
    });

    it('should authenticate successfully with valid email and password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'dietitian@ayurdiet.com',
          password: 'Dietitian@123',
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.dietitian).toBeDefined();
      expect(res.body.data.dietitian.id).toBe('dietitian-primary');
      expect(res.body.data.dietitian.role).toBe('dietitian');
      expect(res.body.data.token).toBeDefined();
      expect(typeof res.body.data.token).toBe('string');
    });

    it('should authenticate successfully with valid username and password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'dietitian',
          password: 'Dietitian@123',
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.dietitian).toBeDefined();
      expect(res.body.data.dietitian.email).toBe('dietitian@ayurdiet.com');
      expect(res.body.data.token).toBeDefined();
    });
  });

  describe('GET /api/auth/verify', () => {
    it('should return 401 when Authorization header is missing', async () => {
      const res = await request(app).get('/api/auth/verify');
      expect(res.status).toBe(401);
      expect(res.body.status).toBe('fail');
    });

    it('should return 401 when token is invalid or tampered', async () => {
      const res = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', 'Bearer invalid-token-string');

      expect(res.status).toBe(401);
      expect(res.body.status).toBe('fail');
    });

    it('should return 200 with dietitian details when token is valid', async () => {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'dietitian@ayurdiet.com',
          password: 'Dietitian@123',
        });
      const token = loginRes.body.data.token;

      const verifyRes = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${token}`);

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.status).toBe('success');
      expect(verifyRes.body.data.dietitian.id).toBe('dietitian-primary');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should return 200 on logout', async () => {
      const res = await request(app).post('/api/auth/logout');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
    });
  });
});
