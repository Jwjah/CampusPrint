const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { isMaintenanceModeEnabled } = require('../utils/maintenanceManager');

const EXEMPT_PATHS = [
  '/api/health',
  '/health',
  '/api/auth/login',
  '/api/auth/me',
  '/api/admin/maintenance-mode',
];

/**
 * Global Maintenance Mode Middleware
 * Intercepts all incoming requests when maintenance mode is active.
 * Bypasses health checks, auth login/me endpoints, admin routes, and Admin users (role === 'admin').
 */
async function maintenanceMiddleware(req, res, next) {
  try {
    const isMaintenance = await isMaintenanceModeEnabled();
    if (!isMaintenance) {
      return next();
    }

    const path = (req.originalUrl || req.url || '').split('?')[0].replace(/\/$/, '');

    // 1. Check path exemption
    if (EXEMPT_PATHS.some(exempt => path === exempt || path.endsWith(exempt))) {
      return next();
    }

    // 2. Check if request belongs to an authenticated Admin
    const token = req.headers.authorization?.split(' ')[1] || req.cookies?.token || req.query?.token;
    let userRole = 'guest';

    if (token && process.env.JWT_SECRET) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded && decoded.id) {
          const [users] = await db.execute('SELECT role FROM users WHERE id = ?', [decoded.id]);
          if (users.length) {
            userRole = users[0].role;
          }
        }
      } catch (err) {
        // Token verification failed or expired - remain as guest
      }
    } else if (req.user && req.user.role) {
      userRole = req.user.role;
    }

    if (userRole === 'admin') {
      return next();
    }

    // 3. Request blocked by Maintenance Mode
    console.warn(`[MAINTENANCE MODE BLOCKED] ${new Date().toISOString()} | Role: ${userRole} | Endpoint: ${req.originalUrl} | IP: ${req.ip}`);

    return res.status(503).json({
      success: false,
      message: 'CampusPrint is temporarily unavailable due to scheduled maintenance.',
    });
  } catch (err) {
    console.error('Maintenance middleware error:', err);
    return next();
  }
}

module.exports = maintenanceMiddleware;
