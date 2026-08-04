const express = require('express');
const router = express.Router();
const auth = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

router.post('/register', auth.register);
router.post('/verify-otp', auth.verifyOTP);
router.post('/login', auth.login);
router.post('/resend-otp', auth.resendOTP);
router.get('/me', authenticate, auth.getMe);
router.get('/transactions', authenticate, auth.getTransactions);
router.post('/register-agent', authenticate, auth.registerAgent);
router.post('/send-agent-otp', authenticate, auth.sendAgentOTP);
router.post('/verify-agent-otp', authenticate, auth.verifyAgentOTP);
router.post('/audit', authenticate, auth.audit);

module.exports = router;
