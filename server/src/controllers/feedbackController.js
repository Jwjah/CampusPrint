const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const db = require('../config/database');

const ALLOWED_CATEGORIES = [
  'Bug Report',
  'Feature Request',
  'Payment Issue',
  'Refund Issue',
  'Print Quality',
  'Delivery Issue',
  'Shop Issue',
  'Account Issue',
  'User Experience',
  'General Feedback'
];

const ALLOWED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'application/pdf'
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Helper to generate unique Feedback ID
function generateFeedbackId() {
  const randomHex = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `FB-${randomHex}`;
}

// POST /api/feedback — Submit feedback (User)
exports.submitFeedback = async (req, res) => {
  try {
    const { category, subject, message, rating, order_id } = req.body;

    // 1. Category validation
    if (!category || !ALLOWED_CATEGORIES.includes(category)) {
      return res.status(400).json({ error: `Invalid category. Allowed categories are: ${ALLOWED_CATEGORIES.join(', ')}` });
    }

    // 2. Subject validation
    if (!subject || typeof subject !== 'string' || !subject.trim()) {
      return res.status(400).json({ error: 'Subject is required.' });
    }
    const cleanSubject = subject.trim();
    if (cleanSubject.length > 120) {
      return res.status(400).json({ error: 'Subject cannot exceed 120 characters.' });
    }

    // 3. Message validation
    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'Message is required.' });
    }
    const cleanMessage = message.trim();
    if (cleanMessage.length > 3000) {
      return res.status(400).json({ error: 'Message cannot exceed 3000 characters.' });
    }

    // 4. Rating validation (Optional 1-5)
    let numRating = null;
    if (rating !== undefined && rating !== null && rating !== '') {
      numRating = parseInt(rating, 10);
      if (isNaN(numRating) || numRating < 1 || numRating > 5) {
        return res.status(400).json({ error: 'Rating must be an integer between 1 and 5.' });
      }
    }

    // 5. File Attachment validation & saving
    let attachmentUrl = null;
    if (req.file) {
      const file = req.file;

      if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        return res.status(400).json({ error: 'Invalid file type. Only PNG, JPG, JPEG, and PDF files are allowed.' });
      }

      if (file.size > MAX_FILE_SIZE) {
        return res.status(400).json({ error: 'File size exceeds maximum limit of 10 MB.' });
      }

      // Save file to local uploads/feedback directory
      const isVercel = !!process.env.VERCEL;
      const uploadDir = isVercel ? '/tmp/uploads/feedback' : path.join(__dirname, '../../uploads/feedback');

      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const ext = path.extname(file.originalname) || (file.mimetype === 'application/pdf' ? '.pdf' : '.jpg');
      const filename = `feedback_${Date.now()}_${crypto.randomBytes(4).toString('hex')}${ext}`;
      const filePath = path.join(uploadDir, filename);

      fs.writeFileSync(filePath, file.buffer);
      attachmentUrl = `/uploads/feedback/${filename}`;
    }

    // 6. Generate Feedback ID
    let feedbackId = generateFeedbackId();
    // Ensure uniqueness
    let attempts = 0;
    while (attempts < 5) {
      const [existing] = await db.execute('SELECT id FROM feedback WHERE feedback_id = ?', [feedbackId]);
      if (!existing.length) break;
      feedbackId = generateFeedbackId();
      attempts++;
    }

    const orderIdNum = order_id ? parseInt(order_id, 10) : null;
    const nowStr = new Date().toISOString().slice(0, 19).replace('T', ' ');

    // 7. Insert feedback record
    const [result] = await db.execute(
      `INSERT INTO feedback 
       (feedback_id, user_id, role, category, subject, message, rating, attachment_url, order_id, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'New', ?, ?)`,
      [
        feedbackId,
        req.user.id,
        req.user.role,
        category,
        cleanSubject,
        cleanMessage,
        numRating,
        attachmentUrl,
        orderIdNum,
        nowStr,
        nowStr
      ]
    );

    return res.status(201).json({
      success: true,
      feedback_id: feedbackId,
      message: 'Your feedback has been submitted successfully.',
      id: result.insertId
    });
  } catch (err) {
    console.error('Submit feedback error:', err);
    return res.status(500).json({ error: 'Failed to submit feedback' });
  }
};

// GET /api/feedback/my — Get authenticated user's submitted feedback
exports.getMyFeedback = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT feedback_id, category, subject, message, rating, attachment_url, status, admin_notes, created_at 
       FROM feedback 
       WHERE user_id = ? 
       ORDER BY created_at DESC LIMIT 50`,
      [req.user.id]
    );

    return res.json({ feedback: rows });
  } catch (err) {
    console.error('Get my feedback error:', err);
    return res.status(500).json({ error: 'Failed to fetch user feedback' });
  }
};

// GET /api/admin/feedback — Fetch all feedback (Admin)
exports.getAdminFeedback = async (req, res) => {
  try {
    const { status, category, role, search, startDate, endDate } = req.query;

    let query = `
      SELECT f.*, u.name as user_name, u.email as user_email 
      FROM feedback f 
      JOIN users u ON f.user_id = u.id 
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ' AND f.status = ?';
      params.push(status);
    }

    if (category) {
      query += ' AND f.category = ?';
      params.push(category);
    }

    if (role) {
      query += ' AND f.role = ?';
      params.push(role);
    }

    if (startDate) {
      query += ' AND f.created_at >= ?';
      params.push(startDate);
    }

    if (endDate) {
      query += ' AND f.created_at <= ?';
      params.push(endDate);
    }

    if (search) {
      query += ' AND (f.feedback_id LIKE ? OR f.subject LIKE ? OR f.message LIKE ? OR u.name LIKE ? OR u.email LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term, term, term);
    }

    query += ' ORDER BY f.created_at DESC LIMIT 200';

    const [rows] = await db.execute(query, params);
    return res.json({ feedback: rows });
  } catch (err) {
    console.error('Get admin feedback error:', err);
    return res.status(500).json({ error: 'Failed to fetch feedback' });
  }
};

// GET /api/admin/feedback/:id — Fetch feedback detail (Admin)
exports.getFeedbackById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.execute(
      `SELECT f.*, u.name as user_name, u.email as user_email 
       FROM feedback f 
       JOIN users u ON f.user_id = u.id 
       WHERE f.id = ? OR f.feedback_id = ?`,
      [id, id]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Feedback record not found' });
    }

    return res.json({ feedback: rows[0] });
  } catch (err) {
    console.error('Get feedback detail error:', err);
    return res.status(500).json({ error: 'Failed to fetch feedback details' });
  }
};

// PATCH /api/admin/feedback/:id — Update feedback status & admin notes (Admin)
exports.updateFeedbackStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, admin_notes } = req.body;

    const ALLOWED_STATUSES = ['New', 'In Review', 'Resolved', 'Closed'];
    if (status && !ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${ALLOWED_STATUSES.join(', ')}` });
    }

    const [existing] = await db.execute('SELECT * FROM feedback WHERE id = ? OR feedback_id = ?', [id, id]);
    if (!existing.length) {
      return res.status(404).json({ error: 'Feedback record not found' });
    }

    const current = existing[0];
    const newStatus = status || current.status;
    const newNotes = admin_notes !== undefined ? admin_notes : current.admin_notes;
    const nowStr = new Date().toISOString().slice(0, 19).replace('T', ' ');

    await db.execute(
      'UPDATE feedback SET status = ?, admin_notes = ?, updated_at = ? WHERE id = ?',
      [newStatus, newNotes, nowStr, current.id]
    );

    return res.json({
      success: true,
      message: 'Feedback updated successfully',
      feedback: {
        ...current,
        status: newStatus,
        admin_notes: newNotes,
        updated_at: nowStr
      }
    });
  } catch (err) {
    console.error('Update feedback error:', err);
    return res.status(500).json({ error: 'Failed to update feedback' });
  }
};
