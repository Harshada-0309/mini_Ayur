const express = require('express');
const authController = require('../controllers/authController');

const router = express.Router();

router.post('/login', authController.login);
router.post('/signup', authController.signup);
router.post('/register', authController.signup);
router.get('/verify', authController.verify);
router.post('/logout', authController.logout);

module.exports = router;

