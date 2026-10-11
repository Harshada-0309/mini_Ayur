const request = require('supertest');
const app = require('../src/app');
const dietitianRepository = require('../src/repositories/dietitianRepository');
const patientRepository = require('../src/repositories/patientRepository');

describe('Dietitian Authentication & Registration APIs', () => {
  beforeEach(() => {
    dietitianRepository._resetMemoryStore();
    patientRepository._resetMemoryStore();
  });

  describe('Sign In (Existing Users)', () => {
    it('1. Existing users can sign in with valid email and password', async () => {
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
      expect(res.body.data.dietitian.email).toBe('dietitian@ayurdiet.com');
      expect(res.body.data.token).toBeDefined();
    });

    it('1b. Existing users can sign in with valid username and password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'dietitian',
          password: 'Dietitian@123',
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.dietitian.username).toBe('dietitian');
      expect(res.body.data.token).toBeDefined();
    });

    it('2. Invalid credentials are rejected with 401', async () => {
      const wrongPasswordRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'dietitian@ayurdiet.com',
          password: 'WrongPassword999',
        });
      expect(wrongPasswordRes.status).toBe(401);
      expect(wrongPasswordRes.body.status).toBe('fail');
      expect(wrongPasswordRes.body.message).toMatch(/invalid email\/username or password/i);

      const nonExistentRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'AnyPassword123',
        });
      expect(nonExistentRes.status).toBe(401);
      expect(nonExistentRes.body.status).toBe('fail');
    });

    it('2b. Rejects missing fields with 400', async () => {
      const noIdentifier = await request(app)
        .post('/api/auth/login')
        .send({ password: 'Dietitian@123' });
      expect(noIdentifier.status).toBe(400);

      const noPass = await request(app)
        .post('/api/auth/login')
        .send({ email: 'dietitian@ayurdiet.com' });
      expect(noPass.status).toBe(400);
    });
  });

  describe('Sign Up (Registration)', () => {
    it('3. New users can register with valid information', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          name: 'Dr. Aarav Mehta',
          email: 'aarav.mehta@ayurvediccare.com',
          username: 'dr_aarav',
          password: 'SecurePassword123',
          confirmPassword: 'SecurePassword123',
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.dietitian).toBeDefined();
      expect(res.body.data.dietitian.name).toBe('Dr. Aarav Mehta');
      expect(res.body.data.dietitian.email).toBe('aarav.mehta@ayurvediccare.com');
      expect(res.body.data.dietitian.username).toBe('dr_aarav');
      expect(res.body.data.dietitian.role).toBe('dietitian');
      expect(res.body.data.token).toBeDefined();
    });

    it('4. Duplicate accounts are rejected', async () => {
      // First registration
      await request(app)
        .post('/api/auth/signup')
        .send({
          name: 'Dr. Sunita Sen',
          email: 'sunita@clinic.com',
          username: 'dr_sunita',
          password: 'Password123',
          confirmPassword: 'Password123',
        });

      // Attempt duplicate email
      const dupEmailRes = await request(app)
        .post('/api/auth/signup')
        .send({
          name: 'Sunita Duplicate',
          email: 'sunita@clinic.com',
          username: 'sunita_different_user',
          password: 'Password123',
          confirmPassword: 'Password123',
        });
      expect(dupEmailRes.status).toBe(409);
      expect(dupEmailRes.body.status).toBe('fail');
      expect(dupEmailRes.body.message).toMatch(/email address is already registered/i);

      // Attempt duplicate username
      const dupUserRes = await request(app)
        .post('/api/auth/signup')
        .send({
          name: 'Another User',
          email: 'different@clinic.com',
          username: 'dr_sunita',
          password: 'Password123',
          confirmPassword: 'Password123',
        });
      expect(dupUserRes.status).toBe(409);
      expect(dupUserRes.body.status).toBe('fail');
      expect(dupUserRes.body.message).toMatch(/username is already taken/i);

      // Attempt registering with default dietitian email or username
      const dupDefaultRes = await request(app)
        .post('/api/auth/signup')
        .send({
          name: 'Impressionist',
          email: 'dietitian@ayurdiet.com',
          username: 'new_unique_name',
          password: 'Password123',
          confirmPassword: 'Password123',
        });
      expect(dupDefaultRes.status).toBe(409);
    });

    it('5. Password mismatch is handled with 400', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          name: 'Dr. Rohit Sharma',
          email: 'rohit@ayurveda.org',
          username: 'dr_rohit',
          password: 'SecretPassword123',
          confirmPassword: 'MismatchedPassword999',
        });

      expect(res.status).toBe(400);
      expect(res.body.status).toBe('fail');
      expect(res.body.message).toMatch(/passwords do not match/i);
    });

    it('5b. Field validation catches invalid email format, short username, short password', async () => {
      // Missing name
      const noName = await request(app).post('/api/auth/signup').send({
        email: 'test@example.com',
        username: 'user1',
        password: 'Password123',
        confirmPassword: 'Password123',
      });
      expect(noName.status).toBe(400);

      // Invalid email
      const invalidEmail = await request(app).post('/api/auth/signup').send({
        name: 'Test Name',
        email: 'invalid-email-format',
        username: 'user1',
        password: 'Password123',
        confirmPassword: 'Password123',
      });
      expect(invalidEmail.status).toBe(400);
      expect(invalidEmail.body.message).toMatch(/valid email/i);

      // Short password
      const shortPass = await request(app).post('/api/auth/signup').send({
        name: 'Test Name',
        email: 'valid@example.com',
        username: 'user1',
        password: '123',
        confirmPassword: '123',
      });
      expect(shortPass.status).toBe(400);
      expect(shortPass.body.message).toMatch(/at least 6 characters/i);
    });

    it('6. Passwords are NOT stored in plain text', async () => {
      const rawPassword = 'MySecretPlainPassword@2026';
      await request(app)
        .post('/api/auth/signup')
        .send({
          name: 'Dr. Kavita Verma',
          email: 'kavita@holisticayur.com',
          username: 'dr_kavita',
          password: rawPassword,
          confirmPassword: rawPassword,
        });

      const storedUser = await dietitianRepository.findByEmail('kavita@holisticayur.com');
      expect(storedUser).toBeDefined();
      expect(storedUser.password_hash).not.toBe(rawPassword);
      expect(storedUser.password_hash).not.toContain(rawPassword);
      expect(storedUser.password_hash).toMatch(/^[0-9a-f]{64,}$/); // 64-byte hex digest
      expect(storedUser.salt).toBeDefined();
      expect(storedUser.salt.length).toBeGreaterThanOrEqual(16);
    });

    it('7. Newly registered users can sign in with their chosen credentials', async () => {
      // Register
      await request(app)
        .post('/api/auth/signup')
        .send({
          name: 'Dr. Nikhil Kulkarni',
          email: 'nikhil@clinic.org',
          username: 'dr_nikhil',
          password: 'NikhilPassword@789',
          confirmPassword: 'NikhilPassword@789',
        });

      // Sign in with email
      const emailLogin = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: 'nikhil@clinic.org',
          password: 'NikhilPassword@789',
        });
      expect(emailLogin.status).toBe(200);
      expect(emailLogin.body.data.dietitian.name).toBe('Dr. Nikhil Kulkarni');

      // Sign in with username
      const userLogin = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: 'dr_nikhil',
          password: 'NikhilPassword@789',
        });
      expect(userLogin.status).toBe(200);
      expect(userLogin.body.data.dietitian.username).toBe('dr_nikhil');
    });

    it('7b. Newly registered accounts do NOT automatically see existing patient data (isolation)', async () => {
      // Seed a patient for dietitian-primary
      await patientRepository.create({
        name: 'Primary Patient A',
        age: 40,
        sex: 'male',
        dietitian_id: 'dietitian-primary',
      });

      // Register a brand new dietitian
      const signupRes = await request(app)
        .post('/api/auth/signup')
        .send({
          name: 'Dr. New Dietitian',
          email: 'newdietitian@ayurveda.com',
          username: 'new_dietitian_user',
          password: 'Password@123',
          confirmPassword: 'Password@123',
        });

      const newToken = signupRes.body.data.token;

      // New dietitian queries patients
      const patientListRes = await request(app)
        .get('/api/patients')
        .set('Authorization', `Bearer ${newToken}`);

      expect(patientListRes.status).toBe(200);
      // New dietitian should see 0 patients (no access to dietitian-primary's patients!)
      expect(patientListRes.body.results).toBe(0);
      expect(patientListRes.body.data.patients).toHaveLength(0);

      // Now new dietitian creates their own patient
      const createRes = await request(app)
        .post('/api/patients')
        .set('Authorization', `Bearer ${newToken}`)
        .send({
          name: 'New Dietitian Patient 1',
          age: 29,
          sex: 'female',
        });
      expect(createRes.status).toBe(201);

      // New dietitian now sees only their 1 patient
      const updatedListRes = await request(app)
        .get('/api/patients')
        .set('Authorization', `Bearer ${newToken}`);
      expect(updatedListRes.body.results).toBe(1);
      expect(updatedListRes.body.data.patients[0].name).toBe('New Dietitian Patient 1');
    });

    it('8. Logout works correctly', async () => {
      const res = await request(app).post('/api/auth/logout');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.message).toMatch(/logged out successfully/i);
    });

    it('8b. Token verification succeeds for valid token and fails for invalid token', async () => {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'dietitian@ayurdiet.com',
          password: 'Dietitian@123',
        });
      const token = loginRes.body.data.token;

      const verifySuccess = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${token}`);
      expect(verifySuccess.status).toBe(200);

      const verifyFail = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', 'Bearer invalid-corrupt-token');
      expect(verifyFail.status).toBe(401);
    });
  });
});
