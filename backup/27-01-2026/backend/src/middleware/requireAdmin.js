// src/middleware/requireAdmin.js
const jwt = require('jsonwebtoken');
const pool = require('../config/db'); // adjust path if necessary
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is required for admin authentication");
}

async function requireAdmin(req, res, next) {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Missing or invalid authorization header' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const userId = decoded.id || decoded.userId || decoded.uid;
    if (!userId) return res.status(401).json({ message: 'Invalid token payload' });

    const [rows] = await pool.query('SELECT id, role, is_blocked FROM users WHERE id = ?', [userId]);
    const user = rows && rows[0];
    if (!user) return res.status(401).json({ message: 'User not found' });
    if (user.is_blocked) return res.status(403).json({ message: 'Account is blocked' });
    if (user.role !== 'admin') return res.status(403).json({ message: 'Admin role required' });

    req.user = { id: user.id, role: user.role };
    next();
  } catch (err) {
    console.error('requireAdmin error', err?.message || err);
    return res.status(401).json({ message: 'Unauthorized' });
  }
}

module.exports = requireAdmin;
