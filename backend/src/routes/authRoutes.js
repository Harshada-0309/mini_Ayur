const express = require('express');
const authController = require('../controllers/authController');

const router = express.Router();

router.post('/login', authController.login);
router.get('/verify', authController.verify);
router.post('/logout', authController.logout);

module.exports = router;
