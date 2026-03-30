const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/login', authController.login);
// Optional: add a hardcoded setup route for initial admin seed if needed
router.get('/setup', authController.setupAdmin);

module.exports = router;
