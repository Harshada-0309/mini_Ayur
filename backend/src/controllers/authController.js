const crypto = require('crypto');
const config = require('../config/env');
const dietitianRepository = require('../repositories/dietitianRepository');

/**
 * Generate a cryptographically signed session token
 * @param {Object} payload 
 * @returns {string} token
 */
function createToken(payload) {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', config.auth.jwtSecret)
    .update(data)
    .digest('base64url');
  return `${data}.${signature}`;
}

/**
 * Verify HMAC token signature and expiration
 * @param {string} token 
 * @returns {Object|null} payload
 */
function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [data, signature] = parts;

  const expectedSignature = crypto
    .createHmac('sha256', config.auth.jwtSecret)
    .update(data)
    .digest('base64url');

  const sigBuffer = Buffer.from(signature);
  const expectedSigBuffer = Buffer.from(expectedSignature);

  if (
    sigBuffer.length !== expectedSigBuffer.length ||
    !crypto.timingSafeEqual(sigBuffer, expectedSigBuffer)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
    if (payload.exp && Date.now() > payload.exp) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

/**
 * Secure password hashing using scrypt
 */
function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

/**
 * Constant-time password verification
 */
function verifyPassword(password, hash, salt) {
  if (!password || !hash || !salt) return false;
  const checkHash = hashPassword(password, salt);
  const bufferA = Buffer.from(checkHash, 'hex');
  const bufferB = Buffer.from(hash, 'hex');
  if (bufferA.length !== bufferB.length) return false;
  return crypto.timingSafeEqual(bufferA, bufferB);
}

const authController = {
  createToken,
  verifyToken,
  hashPassword,
  verifyPassword,

  /**
   * Dietitian Registration / Sign Up Endpoint
   * POST /api/auth/signup
   */
  async signup(req, res, next) {
    try {
      const { name, email, username, password, confirmPassword } = req.body;

      // Validate required fields
      if (!name || !name.trim()) {
        return res.status(400).json({
          status: 'fail',
          message: 'Full name is required',
        });
      }

      if (!email || !email.trim()) {
        return res.status(400).json({
          status: 'fail',
          message: 'Email address is required',
        });
      }

      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        return res.status(400).json({
          status: 'fail',
          message: 'Please provide a valid email address',
        });
      }

      if (!username || !username.trim()) {
        return res.status(400).json({
          status: 'fail',
          message: 'Username is required',
        });
      }

      if (username.trim().length < 3) {
        return res.status(400).json({
          status: 'fail',
          message: 'Username must be at least 3 characters long',
        });
      }

      if (!password) {
        return res.status(400).json({
          status: 'fail',
          message: 'Password is required',
        });
      }

      if (password.length < 6) {
        return res.status(400).json({
          status: 'fail',
          message: 'Password must be at least 6 characters long',
        });
      }

      if (password !== confirmPassword) {
        return res.status(400).json({
          status: 'fail',
          message: 'Passwords do not match',
        });
      }

      // Reject duplicate email address
      const existingEmail = await dietitianRepository.findByEmail(email);
      if (existingEmail) {
        return res.status(409).json({
          status: 'fail',
          message: 'Email address is already registered',
        });
      }

      // Reject duplicate username
      const existingUsername = await dietitianRepository.findByUsername(username);
      if (existingUsername) {
        return res.status(409).json({
          status: 'fail',
          message: 'Username is already taken',
        });
      }

      // Cryptographically secure salt & scrypt password hashing
      const salt = crypto.randomBytes(16).toString('hex');
      const password_hash = hashPassword(password, salt);

      const newDietitian = await dietitianRepository.create({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        username: username.trim().toLowerCase(),
        password_hash,
        salt,
        role: 'dietitian',
      });

      const userPayload = {
        id: newDietitian.id,
        username: newDietitian.username,
        email: newDietitian.email,
        name: newDietitian.name,
        role: newDietitian.role,
        exp: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
      };

      const token = createToken(userPayload);

      return res.status(201).json({
        status: 'success',
        message: 'Dietitian account created successfully',
        data: {
          dietitian: {
            id: newDietitian.id,
            username: newDietitian.username,
            email: newDietitian.email,
            name: newDietitian.name,
            role: newDietitian.role,
          },
          token,
        },
      });
    } catch (err) {
      return next(err);
    }
  },

  /**
   * Dietitian Login / Sign In Endpoint
   * POST /api/auth/login
   */
  async login(req, res, next) {
    try {
      const identifier = (req.body.username || req.body.email || req.body.identifier || '').trim();
      const password = (req.body.password || '').trim();

      if (!identifier) {
        return res.status(400).json({
          status: 'fail',
          message: 'Email or username is required',
        });
      }

      if (!password) {
        return res.status(400).json({
          status: 'fail',
          message: 'Password is required',
        });
      }

      // Look up dietitian by email or username
      const user = await dietitianRepository.findByIdentifier(identifier);

      if (!user) {
        return res.status(401).json({
          status: 'fail',
          message: 'Invalid email/username or password',
        });
      }

      // Verify password hash with salt
      const isPasswordValid = verifyPassword(password, user.password_hash, user.salt);

      if (!isPasswordValid) {
        return res.status(401).json({
          status: 'fail',
          message: 'Invalid email/username or password',
        });
      }

      const userPayload = {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        role: user.role,
        exp: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
      };

      const token = createToken(userPayload);

      return res.status(200).json({
        status: 'success',
        message: 'Dietitian authenticated successfully',
        data: {
          dietitian: {
            id: user.id,
            username: user.username,
            email: user.email,
            name: user.name,
            role: user.role,
          },
          token,
        },
      });
    } catch (err) {
      return next(err);
    }
  },

  /**
   * Verify Session Token Endpoint
   * GET /api/auth/verify
   */
  async verify(req, res, next) {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          status: 'fail',
          message: 'Authentication token missing or invalid',
        });
      }

      const token = authHeader.split(' ')[1];
      const payload = verifyToken(token);

      if (!payload) {
        return res.status(401).json({
          status: 'fail',
          message: 'Invalid or expired session token',
        });
      }

      return res.status(200).json({
        status: 'success',
        data: {
          dietitian: {
            id: payload.id,
            username: payload.username,
            email: payload.email,
            name: payload.name,
            role: payload.role,
          },
        },
      });
    } catch (err) {
      return next(err);
    }
  },

  /**
   * Dietitian Logout Endpoint
   * POST /api/auth/logout
   */
  async logout(req, res) {
    return res.status(200).json({
      status: 'success',
      message: 'Logged out successfully',
    });
  },
};

module.exports = authController;
