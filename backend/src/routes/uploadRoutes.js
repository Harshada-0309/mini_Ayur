const express = require('express');
const router = express.Router();
const {
  uploadDietitian,
  uploadPatient,
  validateMagicBytesMiddleware,
} = require('../middleware/uploadMiddleware');
const { authenticateDietitian } = require('../middleware/authMiddleware');
const dietitianRepository = require('../repositories/dietitianRepository');
const patientRepository = require('../repositories/patientRepository');

/**
 * POST /api/upload/dietitian-photo
 * Upload and persist dietitian practitioner profile photograph
 */
router.post(
  '/dietitian-photo',
  authenticateDietitian,
  uploadDietitian.single('photo'),
  validateMagicBytesMiddleware,
  async (req, res, next) => {
    try {
      const dietitianId = req.dietitian.id;
      const photoUrl = `/uploads/dietitians/${req.file.filename}`;

      const updated = await dietitianRepository.updateProfile(dietitianId, {
        photo_url: photoUrl,
      });

      return res.status(200).json({
        status: 'success',
        message: 'Dietitian profile photograph uploaded and persisted successfully',
        data: {
          photo_url: photoUrl,
          dietitian: updated,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/upload/patient-photo/:id
 * Upload and persist patient profile photograph
 */
router.post(
  '/patient-photo/:id',
  authenticateDietitian,
  uploadPatient.single('photo'),
  validateMagicBytesMiddleware,
  async (req, res, next) => {
    try {
      const patientId = req.params.id;
      const existing = await patientRepository.findById(patientId);

      if (!existing) {
        return res.status(404).json({
          status: 'fail',
          message: `Patient with ID ${patientId} not found`,
        });
      }

      const photoUrl = `/uploads/patients/${req.file.filename}`;
      const updated = await patientRepository.update(patientId, {
        photo_url: photoUrl,
      });

      return res.status(200).json({
        status: 'success',
        message: 'Patient profile photograph uploaded and persisted successfully',
        data: {
          photo_url: photoUrl,
          patient: updated,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
