const { getPool, checkDatabaseConnection } = require('../config/database');

// In-memory fallback store for offline development / hermetic test execution
let memoryPatients = [];
let nextPatientId = 1;

/**
 * Generate a standard sequential patient code (e.g., PAT-2026-0001)
 */
function generatePatientCode(id) {
  const year = new Date().getFullYear();
  const paddedId = String(id).padStart(4, '0');
  return `PAT-${year}-${paddedId}`;
}

async function isDbConnected() {
  try {
    const health = await checkDatabaseConnection();
    return health.connected;
  } catch {
    return false;
  }
}

const patientRepository = {
  /**
   * Reset in-memory store (useful for tests)
   */
  _resetMemoryStore() {
    memoryPatients = [];
    nextPatientId = 1;
  },

  /**
   * List / search patients
   */
  async findAll({ search, dietitian_id, limit = 50, offset = 0 } = {}) {
    const connected = await isDbConnected();

    if (connected) {
      try {
        const pool = getPool();
        let query = `
          SELECT p.*,
            (SELECT COUNT(*) FROM patient_assessments pa WHERE pa.patient_id = p.id) as assessment_count,
            (SELECT json_build_object(
                'id', pa.id,
                'assessment_date', pa.assessment_date,
                'prakriti', pa.prakriti,
                'diet_goal', pa.diet_goal
              )
             FROM patient_assessments pa
             WHERE pa.patient_id = p.id
             ORDER BY pa.assessment_date DESC, pa.id DESC
             LIMIT 1
            ) as latest_assessment
          FROM patients p
        `;
        const params = [];
        const whereClauses = [];

        if (search) {
          params.push(`%${search}%`);
          whereClauses.push(`(p.name ILIKE $${params.length} OR p.patient_code ILIKE $${params.length} OR p.phone ILIKE $${params.length})`);
        }

        if (dietitian_id) {
          params.push(parseInt(dietitian_id, 10));
          whereClauses.push(`(p.dietitian_id = $${params.length} OR p.dietitian_id IS NULL)`);
        }

        if (whereClauses.length > 0) {
          query += ` WHERE ` + whereClauses.join(' AND ');
        }

        query += ` ORDER BY p.id DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);

        const res = await pool.query(query, params);
        return res.rows;
      } catch (err) {
        console.warn('[PatientRepository] DB query failed, falling back to memory:', err.message);
      }
    }

    // In-memory fallback
    let list = [...memoryPatients];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          (p.name && p.name.toLowerCase().includes(q)) ||
          (p.patient_code && p.patient_code.toLowerCase().includes(q)) ||
          (p.phone && p.phone.toLowerCase().includes(q))
      );
    }
    if (dietitian_id) {
      list = list.filter((p) => !p.dietitian_id || p.dietitian_id === parseInt(dietitian_id, 10));
    }
    return list.slice(offset, offset + limit);
  },

  /**
   * Find patient by ID
   */
  async findById(id) {
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) return null;
    const connected = await isDbConnected();

    if (connected) {
      try {
        const pool = getPool();
        const res = await pool.query(
          `SELECT p.*,
            (SELECT json_build_object(
                'id', pa.id,
                'assessment_date', pa.assessment_date,
                'prakriti', pa.prakriti,
                'diet_goal', pa.diet_goal
              )
             FROM patient_assessments pa
             WHERE pa.patient_id = p.id
             ORDER BY pa.assessment_date DESC, pa.id DESC
             LIMIT 1
            ) as latest_assessment
           FROM patients p WHERE p.id = $1`,
          [numericId]
        );
        return res.rows[0] || null;
      } catch (err) {
        console.warn('[PatientRepository] DB findById failed, falling back to memory:', err.message);
      }
    }

    return memoryPatients.find((p) => p.id === numericId) || null;
  },

  /**
   * Find patient by patient code
   */
  async findByCode(patientCode) {
    if (!patientCode) return null;
    const connected = await isDbConnected();

    if (connected) {
      try {
        const pool = getPool();
        const res = await pool.query(`SELECT * FROM patients WHERE UPPER(patient_code) = UPPER($1)`, [patientCode]);
        return res.rows[0] || null;
      } catch (err) {
        console.warn('[PatientRepository] DB findByCode failed, falling back to memory:', err.message);
      }
    }

    return memoryPatients.find((p) => p.patient_code.toUpperCase() === patientCode.toUpperCase()) || null;
  },

  /**
   * Create new patient
   */
  async create(data) {
    const connected = await isDbConnected();
    const dietitianId = data.dietitian_id ? parseInt(data.dietitian_id, 10) : null;

    if (connected) {
      try {
        const pool = getPool();
        let code = data.patient_code;
        if (!code) {
          const countRes = await pool.query("SELECT nextval(pg_get_serial_sequence('patients', 'id')) as next_id");
          const nextId = countRes.rows[0].next_id;
          code = generatePatientCode(nextId);
          const insertRes = await pool.query(
            `INSERT INTO patients (id, patient_code, name, age, sex, occupation, phone, email, photo_url, dietitian_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             RETURNING *`,
            [
              nextId,
              code,
              data.name,
              data.age,
              data.sex,
              data.occupation || null,
              data.phone || null,
              data.email || null,
              data.photo_url || null,
              dietitianId,
            ]
          );
          return insertRes.rows[0];
        }

        const res = await pool.query(
          `INSERT INTO patients (patient_code, name, age, sex, occupation, phone, email, photo_url, dietitian_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           RETURNING *`,
          [
            code,
            data.name,
            data.age,
            data.sex,
            data.occupation || null,
            data.phone || null,
            data.email || null,
            data.photo_url || null,
            dietitianId,
          ]
        );
        return res.rows[0];
      } catch (err) {
        console.warn('[PatientRepository] DB create failed, falling back to memory:', err.message);
      }
    }

    const id = nextPatientId++;
    const code = data.patient_code || generatePatientCode(id);
    const now = new Date().toISOString();

    const newPatient = {
      id,
      patient_code: code,
      name: data.name,
      age: parseInt(data.age, 10),
      sex: data.sex,
      occupation: data.occupation || '',
      phone: data.phone || '',
      email: data.email || '',
      photo_url: data.photo_url || '',
      dietitian_id: dietitianId,
      created_at: now,
      updated_at: now,
      assessment_count: 0,
      latest_assessment: null,
    };

    memoryPatients.unshift(newPatient);
    return newPatient;
  },

  /**
   * Update existing patient
   */
  async update(id, data) {
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) return null;
    const connected = await isDbConnected();
    const dietitianId = data.dietitian_id !== undefined ? (data.dietitian_id ? parseInt(data.dietitian_id, 10) : null) : undefined;

    if (connected) {
      try {
        const pool = getPool();
        const res = await pool.query(
          `UPDATE patients
           SET name = COALESCE($1, name),
               age = COALESCE($2, age),
               sex = COALESCE($3, sex),
               occupation = COALESCE($4, occupation),
               phone = COALESCE($5, phone),
               email = COALESCE($6, email),
               photo_url = COALESCE($7, photo_url),
               dietitian_id = COALESCE($8, dietitian_id),
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $9
           RETURNING *`,
          [
            data.name !== undefined ? data.name : null,
            data.age !== undefined ? parseInt(data.age, 10) : null,
            data.sex !== undefined ? data.sex : null,
            data.occupation !== undefined ? data.occupation : null,
            data.phone !== undefined ? data.phone : null,
            data.email !== undefined ? data.email : null,
            data.photo_url !== undefined ? data.photo_url : null,
            dietitianId !== undefined ? dietitianId : null,
            numericId,
          ]
        );
        return res.rows[0] || null;
      } catch (err) {
        console.warn('[PatientRepository] DB update failed, falling back to memory:', err.message);
      }
    }

    const patient = memoryPatients.find((p) => p.id === numericId);
    if (!patient) return null;

    if (data.name !== undefined) patient.name = data.name;
    if (data.age !== undefined) patient.age = parseInt(data.age, 10);
    if (data.sex !== undefined) patient.sex = data.sex;
    if (data.occupation !== undefined) patient.occupation = data.occupation;
    if (data.phone !== undefined) patient.phone = data.phone;
    if (data.email !== undefined) patient.email = data.email;
    if (data.photo_url !== undefined) patient.photo_url = data.photo_url;
    if (dietitianId !== undefined) patient.dietitian_id = dietitianId;
    patient.updated_at = new Date().toISOString();

    return patient;
  },

  /**
   * Delete patient (for test cleanups)
   */
  async delete(id) {
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) return false;
    const connected = await isDbConnected();

    if (connected) {
      try {
        const pool = getPool();
        const res = await pool.query(`DELETE FROM patients WHERE id = $1 RETURNING id`, [numericId]);
        return res.rowCount > 0;
      } catch (err) {
        console.warn('[PatientRepository] DB delete failed:', err.message);
      }
    }

    const index = memoryPatients.findIndex((p) => p.id === numericId);
    if (index !== -1) {
      memoryPatients.splice(index, 1);
      return true;
    }
    return false;
  },
};

module.exports = patientRepository;
