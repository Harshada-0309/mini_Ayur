const crypto = require('crypto');
const config = require('../config/env');

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

const authController = {
  /**
   * Dietitian Login Endpoint
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

      const validIdentifiers = [
        config.auth.dietitianUsername.toLowerCase(),
        config.auth.dietitianEmail.toLowerCase(),
      ];

      const matchesIdentifier = validIdentifiers.includes(identifier.toLowerCase());
      const matchesPassword = password === config.auth.dietitianPassword;

      if (!matchesIdentifier || !matchesPassword) {
        return res.status(401).json({
          status: 'fail',
          message: 'Invalid email/username or password',
        });
      }

      const userPayload = {
        id: 'dietitian-primary',
        username: config.auth.dietitianUsername,
        email: config.auth.dietitianEmail,
        name: 'Clinical Dietitian',
        role: 'dietitian',
        exp: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
      };

      const token = createToken(userPayload);

      return res.status(200).json({
        status: 'success',
        message: 'Dietitian authenticated successfully',
        data: {
          dietitian: {
            id: userPayload.id,
            username: userPayload.username,
            email: userPayload.email,
            name: userPayload.name,
            role: userPayload.role,
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
