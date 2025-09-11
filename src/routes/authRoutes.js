const express = require('express');
const { login, verifyToken, logout } = require('../controllers/authController');

const router = express.Router();

// POST /api/auth/login - User login
router.post('/login', login);

// POST /api/auth/verify - Verify JWT token
router.post('/verify', verifyToken);

// GET /api/auth/verify - Verify JWT token (alternative endpoint)
router.get('/verify', verifyToken);

// POST /api/auth/logout - User logout
router.post('/logout', logout);

module.exports = router;
