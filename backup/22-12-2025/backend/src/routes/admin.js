// src/routes/admin.js
const express = require('express');
const router = express.Router();
const pool = require('../config/db'); // mysql2 promise pool
const requireAdmin = require('../middleware/requireAdmin');

// GET /api/admin/users  -> list all users (paginated later if needed)
// GET /api/admin/users  -> list all non-admin users (paginated)
router.get('/users', requireAdmin, async (req, res) => {
  try {
    // optional query params
    const q = (req.query.search || '').trim();         // search term (name/email)
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const perPage = Math.max(10, Math.min(100, parseInt(req.query.perPage || '50', 10)));
    const offset = (page - 1) * perPage;

    // build where clause (exclude admin role)
    const whereClauses = ['role != ?'];
    const params = ['admin'];

    if (q) {
      whereClauses.push('(name LIKE ? OR email LIKE ?)');
      const like = `%${q}%`;
      params.push(like, like);
    }

    // count total
    const countSql = `SELECT COUNT(*) AS total FROM users WHERE ${whereClauses.join(' AND ')}`;
    const [countRows] = await pool.query(countSql, params);
    const total = countRows[0]?.total || 0;

    // fetch page
    const dataSql = `
      SELECT id, name, email, role, is_blocked,
             subscription_status, subscription_expiry, subscription_plan,
             quota_total, quota_used, free_quota
      FROM users
      WHERE ${whereClauses.join(' AND ')}
      ORDER BY id DESC
      LIMIT ? OFFSET ?
    `;
    const dataParams = params.concat([perPage, offset]);
    const [rows] = await pool.query(dataSql, dataParams);

    res.json({
      success: true,
      users: rows,
      meta: {
        total,
        page,
        perPage,
        totalPages: Math.ceil(total / perPage)
      }
    });
  } catch (err) {
    console.error('admin/users error', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});


// PATCH /api/admin/users/:id/block  -> { block: true|false }
router.patch('/users/:id/block', requireAdmin, async (req, res) => {
  try {
    const targetId = req.params.id;
    const block = !!req.body.block;
    await pool.query('UPDATE users SET is_blocked = ? WHERE id = ?', [block ? 1 : 0, targetId]);
    res.json({ success: true, message: block ? 'User blocked' : 'User unblocked' });
  } catch (err) {
    console.error('admin/block error', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Optionally add endpoint to reset quota
router.post('/users/:id/reset-quota', requireAdmin, async (req, res) => {
  try {
    const targetId = req.params.id;
    await pool.query('UPDATE users SET quota_used = 0 WHERE id = ?', [targetId]);
    res.json({ success: true, message: 'Quota reset' });
  } catch (err) {
    console.error('admin/reset-quota error', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
