// routes/admin.js — Admin-only routes
const express = require('express');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/admin/users — all users
router.get('/users', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const [rows] = await pool.execute(
      'SELECT id, name, email, role, institution, company_name, location, created_at FROM users ORDER BY created_at DESC'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/users/:id — delete a user
router.delete('/users/:id', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    if (parseInt(req.params.id) === req.user.id) {
      return res.status(400).json({ error: "You cannot delete your own account." });
    }
    await pool.execute('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ message: 'User deleted.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/stats — dashboard stats
router.get('/stats', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const [[{ users }]]        = await pool.execute('SELECT COUNT(*) AS users FROM users');
    const [[{ internships }]]  = await pool.execute('SELECT COUNT(*) AS internships FROM internships');
    const [[{ applications }]] = await pool.execute('SELECT COUNT(*) AS applications FROM applications');
    const [[{ placements }]]   = await pool.execute('SELECT COUNT(*) AS placements FROM placements');
    res.json({ users, internships, applications, placements });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
