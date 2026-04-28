// middleware/auth.js — JWT verification + role guard
const jwt   = require('jsonwebtoken');
require('dotenv').config();

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({ error: 'Access token required. Please log in.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    const pool = req.app.locals.pool;
    const [rows] = await pool.execute(
      'SELECT id, name, email, role, institution, company_name, location FROM users WHERE id = ? AND is_active = 1',
      [decoded.userId]
    );
    if (rows.length === 0) {
      return res.status(403).json({ error: 'User not found or account disabled.' });
    }
    req.user = rows[0];
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token. Please log in again.' });
  }
};

const authorizeRole = (roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: `Access denied. Required role: ${roles.join(' or ')}` });
    }
    next();
  };
};

module.exports = { authenticateToken, authorizeRole };
