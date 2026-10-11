const crypto = require('crypto');
const { getPool, checkDatabaseConnection } = require('../config/database');
const config = require('../config/env');

function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

// In-memory fallback store for offline development / test execution
let memoryDietitians = [];

function initDefaultDietitian() {
  const defaultSalt = 'a1b2c3d4e5f60718293a4b5c6d7e8f90';
  const defaultHash = hashPassword(config.auth.dietitianPassword || 'Dietitian@123', defaultSalt);

  return [
    {
      id: 'dietitian-primary',
      name: 'Dr. Ayur Dietitian',
      email: (config.auth.dietitianEmail || 'dietitian@ayurdiet.com').toLowerCase(),
      username: (config.auth.dietitianUsername || 'dietitian').toLowerCase(),
      password_hash: defaultHash,
      salt: defaultSalt,
      role: 'dietitian',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];
}

memoryDietitians = initDefaultDietitian();

async function isDbConnected() {
  const health = await checkDatabaseConnection();
  return health.connected;
}

const dietitianRepository = {
  /**
   * Reset in-memory store for hermetic tests
   */
  _resetMemoryStore() {
    memoryDietitians = initDefaultDietitian();
  },

  /**
   * Find dietitian by email (case-insensitive)
   */
  async findByEmail(email) {
    if (!email) return null;
    const normalized = email.trim().toLowerCase();
    const connected = await isDbConnected();

    if (connected) {
      const pool = getPool();
      const res = await pool.query(
        'SELECT * FROM dietitians WHERE LOWER(email) = LOWER($1)',
        [normalized]
      );
      return res.rows[0] || null;
    }

    return memoryDietitians.find((d) => d.email.toLowerCase() === normalized) || null;
  },

  /**
   * Find dietitian by username (case-insensitive)
   */
  async findByUsername(username) {
    if (!username) return null;
    const normalized = username.trim().toLowerCase();
    const connected = await isDbConnected();

    if (connected) {
      const pool = getPool();
      const res = await pool.query(
        'SELECT * FROM dietitians WHERE LOWER(username) = LOWER($1)',
        [normalized]
      );
      return res.rows[0] || null;
    }

    return memoryDietitians.find((d) => d.username.toLowerCase() === normalized) || null;
  },

  /**
   * Find dietitian by either email or username
   */
  async findByIdentifier(identifier) {
    if (!identifier) return null;
    const normalized = identifier.trim().toLowerCase();
    const connected = await isDbConnected();

    if (connected) {
      const pool = getPool();
      const res = await pool.query(
        'SELECT * FROM dietitians WHERE LOWER(email) = LOWER($1) OR LOWER(username) = LOWER($1)',
        [normalized]
      );
      return res.rows[0] || null;
    }

    return (
      memoryDietitians.find(
        (d) => d.email.toLowerCase() === normalized || d.username.toLowerCase() === normalized
      ) || null
    );
  },

  /**
   * Find dietitian by ID
   */
  async findById(id) {
    if (!id) return null;
    const connected = await isDbConnected();

    if (connected) {
      const pool = getPool();
      const res = await pool.query('SELECT * FROM dietitians WHERE id = $1', [id]);
      return res.rows[0] || null;
    }

    return memoryDietitians.find((d) => d.id === id) || null;
  },

  /**
   * Register and create a new dietitian record
   */
  async create({ name, email, username, password_hash, salt, role = 'dietitian' }) {
    const id = `dietitian-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const now = new Date().toISOString();
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedUsername = username.trim().toLowerCase();

    const newDietitian = {
      id,
      name: name.trim(),
      email: normalizedEmail,
      username: normalizedUsername,
      password_hash,
      salt,
      role,
      created_at: now,
      updated_at: now,
    };

    const connected = await isDbConnected();
    if (connected) {
      const pool = getPool();
      await pool.query(
        `INSERT INTO dietitians (id, name, email, username, password_hash, salt, role, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          newDietitian.id,
          newDietitian.name,
          newDietitian.email,
          newDietitian.username,
          newDietitian.password_hash,
          newDietitian.salt,
          newDietitian.role,
          newDietitian.created_at,
          newDietitian.updated_at,
        ]
      );
      return newDietitian;
    }

    memoryDietitians.push(newDietitian);
    return newDietitian;
  },
};

module.exports = dietitianRepository;

