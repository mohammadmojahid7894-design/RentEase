const express = require('express');
const router = express.Router();
const { createAccount, loginUser, getUserProfile } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/create-account', createAccount);
router.post('/login', loginUser);
router.get('/profile', protect, getUserProfile);

module.exports = router;
