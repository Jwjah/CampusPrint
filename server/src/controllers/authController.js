const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { sendOTP } = require('../services/emailService');
const { generateOTP } = require('../utils/helpers');

const INDIAN_PHONE_REGEX = /^[6-9]\d{9}$/;

// POST /api/auth/register
// POST /api/auth/register
exports.register = async (req, res) => {
  try {
    let { name, email, password, role, phone, hostel, room_number } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    email = email.trim().toLowerCase();

    const validRoles = ['student', 'shop', 'agent'];
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const [existing] = await db.execute('SELECT id FROM users WHERE TRIM(LOWER(email)) = ?', [email]);
    if (existing.length) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const hash = await bcrypt.hash(password, 12);
    
    // Step 1: Insert with core fields that definitely exist
    const [result] = await db.execute(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [name, email, hash, role || 'student']
    );
    const userId = result.insertId;

    // Step 2: Attempt to update with extra fields (fails gracefully if columns are missing)
    try {
      await db.execute(
        'UPDATE users SET phone = ?, hostel = ?, room_number = ? WHERE id = ?',
        [phone || null, hostel || null, room_number || null, userId]
      );
    } catch (e) {
      console.warn('Optional profile fields skipped: database columns not yet created.');
    }

    // Generate and send OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
    await db.execute(
      'INSERT INTO otp_codes (email, code, purpose, expires_at) VALUES (?, ?, ?, ?)',
      [email, otp, 'register', expiresAt]
    );
    await sendOTP(email, otp, 'register');

    res.status(201).json({
      message: 'Registration successful. Check your email for OTP.',
      userId: result.insertId,
      requiresOTP: true,
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
};

// POST /api/auth/verify-otp
exports.verifyOTP = async (req, res) => {
  try {
    let { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ error: 'Email and OTP code are required' });
    }

    email = String(email).trim().toLowerCase();
    code = String(code).trim();

    // Query unused OTP for email and code, avoiding server-local vs UTC SQL timezone mismatch in NOW()
    const [otps] = await db.execute(
      'SELECT * FROM otp_codes WHERE TRIM(LOWER(email)) = ? AND TRIM(code) = ? AND is_used = 0 ORDER BY id DESC LIMIT 1',
      [email, code]
    );

    if (!otps.length) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    const otpRecord = otps[0];
    const rawExpires = String(otpRecord.expires_at || '');
    const expiryTime = new Date(rawExpires).getTime();
    const utcExpiryTime = new Date(rawExpires.replace(' ', 'T') + 'Z').getTime();
    const validExpiryTime = !isNaN(utcExpiryTime) ? utcExpiryTime : expiryTime;

    // Reject if expired (comparing timestamps safely in JS regardless of DB timezone format)
    if (!isNaN(validExpiryTime) && validExpiryTime < (Date.now() - 60000)) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    await db.execute('UPDATE otp_codes SET is_used = 1 WHERE id = ?', [otpRecord.id]);
    await db.execute('UPDATE users SET is_verified = 1 WHERE TRIM(LOWER(email)) = ?', [email]);

    const [users] = await db.execute('SELECT * FROM users WHERE TRIM(LOWER(email)) = ?', [email]);
    const user = users[0];

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    const [da] = await db.execute('SELECT agent_id, status FROM delivery_agent_availability WHERE agent_id = ?', [user.id]);
    const is_delivery_partner = da.length > 0;
    const delivery_agent_status = is_delivery_partner ? da[0].status : null;

    res.json({
      message: 'Email verified successfully',
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, is_delivery_partner, delivery_agent_status },
    });
  } catch (err) {
    console.error('OTP verify error:', err);
    res.status(500).json({ error: 'Verification failed' });
  }
};

// POST /api/auth/login
exports.login = async (req, res) => {
  try {
    let { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    email = email.trim().toLowerCase();
    password = password.trim();

    const adminEmail = (process.env.ADMIN_EMAIL || 'support.campusprint@gmail.com').trim().toLowerCase();
    const adminPassword = (process.env.ADMIN_PASSWORD || 'admin').trim();

    let [users] = await db.execute('SELECT * FROM users WHERE TRIM(LOWER(email)) = ?', [email]);

    // Auto-seed the admin user if they don't exist yet in the database
    if (!users.length && email === adminEmail) {
      if (password === adminPassword) {
        const hash = await bcrypt.hash(password, 12);
        const [insertResult] = await db.execute(
          'INSERT INTO users (name, email, password, role, is_verified) VALUES (?, ?, ?, ?, ?)',
          ['Super Admin', email, hash, 'admin', 1]
        );
        const [newUsers] = await db.execute('SELECT * FROM users WHERE id = ?', [insertResult.insertId]);
        users = newUsers;
      } else {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
    }

    if (!users.length) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = users[0];

    if (user.is_suspended) {
      return res.status(403).json({ error: 'Account suspended. Contact admin.' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Auto-promote and verify user if their email matches the admin email
    if (user.email.trim().toLowerCase() === adminEmail) {
      if (user.role !== 'admin' || !user.is_verified) {
        await db.execute(
          'UPDATE users SET role = ?, is_verified = 1 WHERE id = ?',
          ['admin', user.id]
        );
        user.role = 'admin';
        user.is_verified = 1;
      }
    }

    const isAdmin = user.role === 'admin';

    if (!user.is_verified && !isAdmin) {
      // Only require OTP for non-admin users
      try {
        const otp = generateOTP();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
        await db.execute(
          'INSERT INTO otp_codes (email, code, purpose, expires_at) VALUES (?, ?, ?, ?)',
          [email, otp, 'login', expiresAt]
        );
        await sendOTP(email, otp, 'login');
        return res.status(200).json({
          message: 'Account not verified. OTP sent.',
          requiresOTP: true,
          email,
        });
      } catch (emailErr) {
        console.error('Failed to send login OTP:', emailErr);
        // Fallback: if email fails, we still have to block them unless we want to be insecure.
        // But for the sake of getting you in, let's keep the isAdmin bypass above.
        return res.status(500).json({ error: 'Failed to send verification email. Please try again later.' });
      }
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Force verify admin account
    if (isAdmin && !user.is_verified) {
        await db.execute('UPDATE users SET is_verified = 1 WHERE id = ?', [user.id]);
        user.is_verified = 1;
    }

    const [da] = await db.execute('SELECT agent_id, status FROM delivery_agent_availability WHERE agent_id = ?', [user.id]);
    const is_delivery_partner = da.length > 0;
    const delivery_agent_status = is_delivery_partner ? da[0].status : null;

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar || null,
        // Safely access optional fields
        phone: user.phone || null,
        hostel: user.hostel || null,
        room_number: user.room_number || null,
        is_delivery_partner,
        delivery_agent_status,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
};

// POST /api/auth/resend-otp
exports.resendOTP = async (req, res) => {
  try {
    const { email } = req.body;
    const [users] = await db.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (!users.length) {
      return res.status(404).json({ error: 'User not found' });
    }

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
    await db.execute(
      'INSERT INTO otp_codes (email, code, purpose, expires_at) VALUES (?, ?, ?, ?)',
      [email, otp, 'login', expiresAt]
    );
    await sendOTP(email, otp, 'login');

    res.json({ message: 'OTP sent successfully' });
  } catch (err) {
    console.error('Resend OTP error:', err);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
};

// GET /api/auth/me
exports.getMe = async (req, res) => {
  try {
    const [users] = await db.execute(
      `SELECT u.id, u.name, u.email, u.role, u.phone, u.avatar, u.hostel, u.room_number, u.is_verified, u.created_at,
              CASE WHEN da.agent_id IS NOT NULL THEN 1 ELSE 0 END AS is_delivery_partner,
              da.status AS delivery_agent_status
       FROM users u
       LEFT JOIN delivery_agent_availability da ON u.id = da.agent_id
       WHERE u.id = ?`,
      [req.user.id]
    );

    if (!users.length) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[0];
    // Convert SQL integer to boolean for JS
    user.is_delivery_partner = !!user.is_delivery_partner;

    // If user is a shop owner, include shop info
    let shop = null;
    if (users[0].role === 'shop') {
      const [shops] = await db.execute(
        'SELECT id, shop_name AS name, is_open AS is_active, is_approved FROM shops WHERE user_id = ?',
        [req.user.id]
      );
      if (shops.length) shop = shops[0];
    }

    res.json({ user, shop });
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ error: 'Failed to fetch user data' });
  }
};
// PATCH /api/users/profile — Update user profile
exports.updateProfile = async (req, res) => {
  try {
    const { name, phone, hostel, room_number } = req.body;
    await db.execute(
      'UPDATE users SET name = ?, phone = ?, hostel = ?, room_number = ? WHERE id = ?',
      [name, phone, hostel || null, room_number || null, req.user.id]
    );
    res.json({ message: 'Profile updated successfully' });
  } catch (err) {
    console.error('UpdateProfile error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

// GET /api/auth/transactions — List wallet transactions
exports.getTransactions = async (req, res) => {
  try {
    const { type, startDate, endDate } = req.query;
    let query = 'SELECT * FROM transactions WHERE user_id = ?';
    const params = [req.user.id];

    if (type) { query += ' AND type = ?'; params.push(type); }
    if (startDate) { query += ' AND created_at >= ?'; params.push(startDate); }
    if (endDate) { query += ' AND created_at <= ?'; params.push(endDate); }

    query += ' ORDER BY created_at DESC LIMIT 100';
    const [transactions] = await db.execute(query, params);
    return res.json({ transactions });
  } catch (err) {
    console.error('Get transactions error:', err);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
};

// POST /api/auth/send-agent-otp
exports.sendAgentOTP = async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone || !INDIAN_PHONE_REGEX.test(phone)) {
      return res.status(400).json({ error: 'Invalid Indian mobile number. Must be 10 digits starting with 6, 7, 8, or 9.' });
    }

    // Check if phone number is already verified by another user/agent
    const [existingPhone] = await db.execute(
      'SELECT id FROM users WHERE phone = ? AND id != ? AND phone_verified = 1',
      [phone, req.user.id]
    );
    if (existingPhone.length) {
      console.warn(`[OTP SECURITY ALERT] Duplicate phone registration attempt for ${phone} by user ${req.user.email}`);
      return res.status(409).json({ error: 'This phone number is already registered and verified by another delivery agent.' });
    }

    // 1. Cooldown check (60 seconds)
    const [recentOtps] = await db.execute(
      `SELECT created_at FROM otp_codes 
       WHERE email = ? AND purpose = 'agent_phone_verify' 
       ORDER BY created_at DESC LIMIT 1`,
      [req.user.email]
    );

    if (recentOtps.length) {
      const lastCreated = new Date(recentOtps[0].created_at).getTime();
      const elapsedSeconds = (Date.now() - lastCreated) / 1000;
      if (elapsedSeconds < 60) {
        const waitTime = Math.ceil(60 - elapsedSeconds);
        return res.status(429).json({ error: `Please wait ${waitTime} seconds before requesting a new OTP.` });
      }
    }

    // 2. Per-user Rate limit (Max 3 requests per 15 minutes)
    const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
    const [fifteenMinOtps] = await db.execute(
      `SELECT COUNT(*) as count FROM otp_codes 
       WHERE email = ? AND purpose = 'agent_phone_verify' AND created_at >= ?`,
      [req.user.email, fifteenMinsAgo]
    );
    const recentCount = fifteenMinOtps[0]?.count || 0;
    if (recentCount >= 3) {
      console.warn(`[OTP SECURITY ALERT] Per-user rate limit exceeded for user: ${req.user.email}`);
      return res.status(429).json({ error: 'Rate limit exceeded. Maximum 3 OTP requests allowed per 15 minutes.' });
    }

    // 3. Daily Limit (Max 10 requests per 24 hours)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
    const [dailyOtps] = await db.execute(
      `SELECT COUNT(*) as count FROM otp_codes 
       WHERE email = ? AND purpose = 'agent_phone_verify' AND created_at >= ?`,
      [req.user.email, twentyFourHoursAgo]
    );
    const dailyCount = dailyOtps[0]?.count || 0;
    if (dailyCount >= 10) {
      console.warn(`[OTP SECURITY ALERT] Daily limit exceeded for user: ${req.user.email}`);
      return res.status(429).json({ error: 'Daily OTP generation limit reached (10 per 24 hours). Please try again tomorrow.' });
    }

    // Generate 6-digit numeric OTP
    const rawOtp = generateOTP();
    // Store hashed OTP instead of plaintext
    const hashedOtp = await bcrypt.hash(rawOtp, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');

    await db.execute(
      'INSERT INTO otp_codes (email, code, purpose, expires_at, is_used, attempts) VALUES (?, ?, ?, ?, 0, 0)',
      [req.user.email, hashedOtp, 'agent_phone_verify', expiresAt]
    );

    // Send OTP email/SMS notification
    await sendOTP(req.user.email, rawOtp, 'agent_phone_verify');

    const responseData = {
      message: 'OTP sent successfully to your registered email/phone.',
      expiresIn: '10 minutes',
    };

    if (process.env.NODE_ENV !== 'production') {
      responseData.otp = rawOtp;
    }

    return res.json(responseData);
  } catch (err) {
    console.error('Send agent OTP error:', err);
    return res.status(500).json({ error: 'Failed to send OTP' });
  }
};

// POST /api/auth/verify-agent-otp
exports.verifyAgentOTP = async (req, res) => {
  try {
    const { phone, code, hostel, room_number } = req.body;

    if (!phone || !INDIAN_PHONE_REGEX.test(phone)) {
      return res.status(400).json({ error: 'Invalid Indian mobile number. Must be 10 digits starting with 6, 7, 8, or 9.' });
    }

    if (!code) {
      return res.status(400).json({ error: 'OTP code is required' });
    }

    // Re-verify phone uniqueness before completing verification
    const [existingPhone] = await db.execute(
      'SELECT id FROM users WHERE phone = ? AND id != ? AND phone_verified = 1',
      [phone, req.user.id]
    );
    if (existingPhone.length) {
      console.warn(`[OTP SECURITY ALERT] Blocked duplicate phone verification for ${phone} by user ${req.user.email}`);
      return res.status(409).json({ error: 'This phone number is already registered and verified by another delivery agent.' });
    }

    // Find active non-expired OTP record
    const [otps] = await db.execute(
      `SELECT * FROM otp_codes 
       WHERE email = ? AND purpose = 'agent_phone_verify' AND is_used = 0 
       ORDER BY created_at DESC LIMIT 1`,
      [req.user.email]
    );

    if (!otps.length) {
      return res.status(400).json({ error: 'Invalid or expired OTP. Please request a new OTP.' });
    }

    const otpRecord = otps[0];

    // Check expiration using JS Dates to avoid MySQL/SQLite timezone discrepancies
    if (new Date(otpRecord.expires_at) < new Date()) {
      return res.status(400).json({ error: 'OTP has expired. Please request a new OTP.' });
    }

    // Check maximum verification attempts (max 5)
    if (otpRecord.attempts >= 5) {
      return res.status(400).json({ error: 'Maximum OTP verification attempts exceeded. Please request a new OTP.' });
    }

    // Compare code against hashed code stored in DB
    const isMatch = await bcrypt.compare(code, otpRecord.code);
    if (!isMatch) {
      // Increment attempt counter
      await db.execute('UPDATE otp_codes SET attempts = attempts + 1 WHERE id = ?', [otpRecord.id]);
      const remaining = 5 - (otpRecord.attempts + 1);
      return res.status(400).json({ error: `Invalid OTP code. ${remaining > 0 ? `${remaining} attempts remaining.` : 'Maximum attempts reached.'}` });
    }

    // Success: Delete OTP after successful verification
    await db.execute('DELETE FROM otp_codes WHERE id = ?', [otpRecord.id]);

    // Update user profile and set phone_verified = 1
    await db.execute(
      `UPDATE users SET phone = ?, hostel = COALESCE(?, hostel), room_number = COALESCE(?, room_number), phone_verified = 1 WHERE id = ?`,
      [phone, hostel || null, room_number || null, req.user.id]
    );

    // Register delivery partner availability
    const [existingAgent] = await db.execute('SELECT agent_id FROM delivery_agent_availability WHERE agent_id = ?', [req.user.id]);
    if (!existingAgent.length) {
      await db.execute("INSERT INTO delivery_agent_availability (agent_id, status) VALUES (?, 'AVAILABLE')", [req.user.id]);
    }

    return res.json({
      success: true,
      message: 'Phone verified successfully! You are now registered as a delivery partner.',
      phone_verified: true
    });
  } catch (err) {
    console.error('Verify agent OTP error:', err);
    return res.status(500).json({ error: 'Verification failed' });
  }
};

// POST /api/auth/register-agent
exports.registerAgent = async (req, res) => {
  try {
    const { phone, hostel, room_number } = req.body;

    // Check user's current phone verification status
    const [users] = await db.execute('SELECT phone, phone_verified FROM users WHERE id = ?', [req.user.id]);
    const currentUser = users[0];

    const isVerified = currentUser && currentUser.phone_verified === 1;
    const samePhone = currentUser && currentUser.phone && currentUser.phone === phone;

    // If phone is not verified or user is submitting a new phone number, OTP verification is required
    if (!isVerified || (phone && !samePhone)) {
      if (phone && !INDIAN_PHONE_REGEX.test(phone)) {
        return res.status(400).json({ error: 'Invalid Indian mobile number. Must be 10 digits starting with 6, 7, 8, or 9.' });
      }
      return res.status(400).json({
        requiresOTP: true,
        error: 'Phone verification required before becoming a delivery agent.'
      });
    }

    // User is already phone_verified with the same phone number -> skip OTP
    await db.execute(
      'UPDATE users SET hostel = COALESCE(?, hostel), room_number = COALESCE(?, room_number) WHERE id = ?',
      [hostel || null, room_number || null, req.user.id]
    );

    const [existing] = await db.execute("SELECT agent_id FROM delivery_agent_availability WHERE agent_id = ?", [req.user.id]);
    if (!existing.length) {
      await db.execute("INSERT INTO delivery_agent_availability (agent_id, status) VALUES (?, 'AVAILABLE')", [req.user.id]);
    }

    return res.json({
      success: true,
      message: 'Successfully registered as a delivery partner',
      phone_verified: true
    });
  } catch (err) {
    console.error('Register agent error:', err);
    res.status(500).json({ error: 'Failed to register as delivery partner' });
  }
};

// POST /api/auth/audit
exports.audit = async (req, res) => {
  try {
    const { event } = req.body;
    console.log(`[AUDIT] User ${req.user.id} (${req.user.email}) triggered: ${event}`);
    res.json({ success: true });
  } catch (err) {
    console.error('Audit error:', err);
    res.status(500).json({ error: 'Failed to log audit event' });
  }
};
