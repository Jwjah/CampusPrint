const originalPort = process.env.PORT;
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const path = require('path');
require('dotenv').config();

// ── Critical Configuration Guard ────────────────────────────────────────────
// Crash the process immediately if any required secrets are missing.
// This prevents the server from launching in a broken or insecure state.
// Only enforce in production — dev/test can use defaults.
if (process.env.NODE_ENV === 'production') {
  const REQUIRED_SECRETS = [
    { key: 'JWT_SECRET',              label: 'JWT signing secret' },
    { key: 'JWT_EXPIRES_IN',          label: 'JWT expiration time' },
    { key: 'DB_HOST',                 label: 'Database host' },
    { key: 'DB_USER',                 label: 'Database user' },
    { key: 'DB_PASS',                 label: 'Database password' },
    { key: 'DB_NAME',                 label: 'Database name' },
    { key: 'CLIENT_URL',              label: 'Client URL (Frontend)' },
    { key: 'RAZORPAY_KEY_ID',         label: 'Razorpay key ID' },
    { key: 'RAZORPAY_KEY_SECRET',     label: 'Razorpay key secret' },
    { key: 'RAZORPAY_WEBHOOK_SECRET', label: 'Razorpay webhook secret' },
    { key: 'PAYOUT_ENCRYPTION_KEY',   label: 'Payout data encryption key' },
    { key: 'ADMIN_EMAIL',             label: 'Admin email' },
    { key: 'ADMIN_PASSWORD',          label: 'Admin password' },
  ];

  const missing = REQUIRED_SECRETS.filter(({ key }) => !process.env[key]);
  if (missing.length > 0) {
    missing.forEach(({ key, label }) => {
      console.error(`❌ FATAL: Missing required environment variable: ${key} (${label})`);
    });
    process.exit(1);
  }
} else {
  // In non-production, still require JWT_SECRET so dev tokens are not insecure
  if (!process.env.JWT_SECRET) {
    console.error('❌ FATAL: JWT_SECRET environment variable is not set. Server cannot start.');
    process.exit(1);
  }
}

const lastErrors = [];

const originalConsoleError = console.error;
console.error = (...args) => {
  lastErrors.push({
    time: new Date().toISOString(),
    message: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')
  });
  if (lastErrors.length > 100) lastErrors.shift();
  originalConsoleError(...args);
};

const app = express();

// Trust reverse proxy headers (for Render, Vercel, etc.)
app.set('trust proxy', true);

// Security
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
const clientUrl = (process.env.CLIENT_URL || 'http://localhost:3000').replace(/\/$/, '');
const allowedOrigins = [clientUrl];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));




// Body parsing
app.use(express.json({
  limit: '10mb',
  verify: (req, res, buf) => {
    if (req.originalUrl && req.originalUrl.replace(/\/$/, '') === '/api/payments/webhook') {
      req.rawBody = Buffer.from(buf);
    }
  }
}));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Static files (uploads)
const isVercel = !!process.env.VERCEL;
const uploadStaticPath = isVercel ? '/tmp/uploads' : path.join(__dirname, '../uploads');
app.use('/uploads', express.static(uploadStaticPath));

// Auth Middleware Import for protecting endpoints
const { authenticate, authorize } = require('./middleware/auth');

// ── Rate Limiting ────────────────────────────────────────────────────────────
// Auth endpoints: strict limits to block brute force & OTP abuse
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 minutes
  max: parseInt(process.env.AUTH_RATE_LIMIT || '20', 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please wait 15 minutes before trying again.' },
  skip: () => process.env.NODE_ENV === 'test',
});

// OTP-specific: very tight limit to prevent OTP spray attacks
const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,   // 10 minutes
  max: parseInt(process.env.OTP_RATE_LIMIT || '5', 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many OTP requests. Please wait 10 minutes before trying again.' },
  skip: () => process.env.NODE_ENV === 'test',
});

// Payment endpoints: per-IP limit to prevent payment abuse
const paymentLimiter = rateLimit({
  windowMs: 60 * 1000,         // 1 minute
  max: parseInt(process.env.PAYMENT_RATE_LIMIT || '10', 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many payment requests. Please wait before trying again.' },
  skip: () => process.env.NODE_ENV === 'test',
});

// File upload limiter
const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,         // 1 minute
  max: parseInt(process.env.UPLOAD_RATE_LIMIT || '15', 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many file upload requests. Please wait before trying again.' },
  skip: () => process.env.NODE_ENV === 'test',
});

// General API limiter (catch-all, generous limit)
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,         // 1 minute
  max: parseInt(process.env.API_RATE_LIMIT || '300', 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' },
  skip: () => process.env.NODE_ENV === 'test',
});

// Maintenance Mode Middleware
const maintenanceMiddleware = require('./middleware/maintenance');

// Apply general API rate limiter & maintenance middleware to all routes
app.use('/api/', apiLimiter);
app.use('/api/', maintenanceMiddleware);

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/shops', require('./routes/shops'));
app.use('/api/agent', require('./routes/agent'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/withdrawals', require('./routes/withdrawal'));
app.use('/api/export', require('./routes/export'));
app.use('/api/push', require('./routes/push'));
app.use('/api/feedback', require('./routes/feedback'));

// Apply targeted rate limiters to high-risk auth routes
// (applied after router mount so they run before route handlers)
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/verify-otp', otpLimiter);
app.use('/api/auth/resend-otp', otpLimiter);

const paymentsRouter = require('./payments/routes/payments').default;
const { dispatcher } = require('./payments/routes/payments');

app.use('/api/payments', paymentLimiter, paymentsRouter);
app.use('/api/print-jobs', require('./payments/routes/print_jobs').default);

// Register Fulfillment Module
const { FulfillmentModule } = require('./fulfillment/fulfillment');
FulfillmentModule.register(app, dispatcher);

// Register Delivery Module
const { DeliveryModule } = require('./delivery/delivery');
DeliveryModule.register(app, dispatcher);

// Register Scheduling Bounded Context (RFC-008)
const { SchedulingModule } = require('./scheduling/scheduling');
SchedulingModule.register(app);

// Register Notification Bounded Context (RFC-009)
const { NotificationModule } = require('./notification/notification');
NotificationModule.register(app);

// Register Analytics Bounded Context (RFC-010)
const { AnalyticsModule } = require('./analytics/analytics');
AnalyticsModule.register(app);

// Health check (Protected in production)
app.get('/api/debug-errors', authenticate, authorize('admin'), (req, res) => {
  res.json({
    errors: lastErrors,
    dbMode: process.env.DB_HOST === 'mysql9.serv00.com' ? 'sqlite_forced' : 'mysql',
    env: process.env.NODE_ENV
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString(), env: process.env.NODE_ENV });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err);
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File too large. Maximum 50MB.' });
  }
  const errorMessage = process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message || 'Internal server error';
  res.status(500).json({ error: errorMessage });
});

// Background Delivery Timeout Checker
const startDeliveryTimeoutChecker = () => {
  const db = require('./config/database');
  const crypto = require('crypto');
  
  setInterval(async () => {
    try {
      const timeoutMinutes = parseInt(process.env.DELIVERY_TIMEOUT_MINUTES || '15', 10);
      const cutoffTime = new Date(Date.now() - timeoutMinutes * 60000).toISOString().slice(0, 19).replace('T', ' ');
      
      // Select orders that have timed out
      // status = 'ready', delivery_type = 'hostel', agent_id = null, delivery_timeout_notified = 0, ready_at < cutoffTime
      const [orders] = await db.execute(
        `SELECT * FROM orders 
         WHERE status = 'ready' 
           AND delivery_type = 'hostel' 
           AND agent_id IS NULL 
           AND delivery_timeout_notified = 0 
           AND ready_at IS NOT NULL 
           AND ready_at < ?`,
        [cutoffTime]
      );
      
      for (const order of orders) {
        await db.transaction(async (conn) => {
          // Double check status and columns inside transaction
          const [[freshOrder]] = await conn.execute('SELECT * FROM orders WHERE id = ?', [order.id]);
          if (!freshOrder || freshOrder.status !== 'ready' || freshOrder.agent_id !== null || freshOrder.delivery_timeout_notified !== 0) {
            return;
          }
          
          // Mark order as timeout notified
          await conn.execute(
            'UPDATE orders SET delivery_timeout_notified = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [order.id]
          );
          
          // Publish outbox event DELIVERY_TIMEOUT
          const occurredAtStr = new Date().toISOString().slice(0, 19).replace('T', ' ');
          const payload = {
            orderId: order.id,
            orderHash: order.order_hash,
            studentId: order.student_id,
            shopId: order.shop_id
          };
          
          await conn.execute(
            `INSERT INTO outbox_events (
              event_id, event_type, aggregate_type, aggregate_id, payload, 
              status, retry_count, error_log, correlation_id, event_version, occurred_at
            ) VALUES (?, 'DELIVERY_TIMEOUT', 'ORDER', ?, ?, 'PENDING', 0, NULL, ?, 1, ?)`,
            [
              crypto.randomUUID(),
              String(order.id),
              JSON.stringify(payload),
              crypto.randomUUID(),
              occurredAtStr
            ]
          );
          
          console.log(`⏰ [Delivery Timeout] Triggered for Order #${order.order_hash}`);
        });
      }
    } catch (err) {
      console.error('❌ Error in delivery timeout checker:', err);
    }
  }, 30000); // Check every 30 seconds
};

const PORT = originalPort || process.env.PORT || 5000;
const migrate = require('./migrations/migrate');

migrate()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`\n🚀 CampusPrint API running on port ${PORT}`);
      console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`   Client URL:  ${process.env.CLIENT_URL}\n`);
      
      // Start timeout checker
      startDeliveryTimeoutChecker();
    });
  })
  .catch(err => {
    console.error('❌ Failed to run database migrations during startup:', err);
    app.listen(PORT, () => {
      console.log(`\n🚀 CampusPrint API running on port ${PORT} (migrations failed)`);
    });
  });
