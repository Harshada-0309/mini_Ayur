const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateDietitian } = require('../middleware/authMiddleware');

// Public routes: Dietitian login & registration
router.post('/login', authController.login);
router.post('/register', authController.register);

// Public route: Active clinic dietitians list (for practitioner switcher / credentials display)
router.get('/dietitians', authController.listDietitians);

// Protected routes
router.get('/me', authenticateDietitian, authController.me);
router.put('/profile', authenticateDietitian, authController.updateProfile);
router.post('/logout', authenticateDietitian, authController.logout);

module.exports = router;
