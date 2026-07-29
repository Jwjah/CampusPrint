const jwt = require('jsonwebtoken');
const db = require('../config/database');

const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1] || req.cookies?.token || req.query.token;
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const [users] = await db.execute(`
      SELECT u.id, u.name, u.email, u.phone, u.role, u.is_verified, u.is_suspended,
             CASE WHEN da.agent_id IS NOT NULL THEN 1 ELSE 0 END AS is_delivery_partner
      FROM users u
      LEFT JOIN delivery_agent_availability da ON u.id = da.agent_id
      WHERE u.id = ?`, 
      [decoded.id]
    );
    
    if (!users.length) {
      return res.status(401).json({ error: 'User not found' });
    }

    if (users[0].is_suspended) {
      return res.status(403).json({ error: 'Account suspended. Contact admin.' });
    }

    const user = users[0];
    user.is_delivery_partner = !!user.is_delivery_partner;

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    const isAllowedRole = roles.includes(req.user.role);
    const isDeliveryPartnerAccessingAgentRoute = roles.includes('agent') && req.user.role === 'student' && req.user.is_delivery_partner;

    if (!isAllowedRole && !isDeliveryPartnerAccessingAgentRoute) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};

module.exports = { authenticate, authorize };
