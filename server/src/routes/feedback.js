const express = require('express');
const router = express.Router();
const multer = require('multer');
const feedback = require('../controllers/feedbackController');
const { authenticate } = require('../middleware/auth');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

router.post('/', authenticate, upload.single('attachment'), feedback.submitFeedback);
router.get('/my', authenticate, feedback.getMyFeedback);

module.exports = router;
