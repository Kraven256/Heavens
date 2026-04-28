// routes/logbooks.js — Submit and approve logbook entries
const express = require('express');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

const router = express.Router();

// POST /api/logbooks — student submits a logbook entry
router.post('/', authenticateToken, authorizeRole(['student']), async (req, res) => {
  try {
    const { date, hours_worked, description } = req.body;
    const pool = req.app.locals.pool;

    if (!date || !hours_worked || !description) {
      return res.status(400).json({ error: 'Date, hours worked and description are required.' });
    }

    // Find the student's active placement
    const [placements] = await pool.execute(
      'SELECT id FROM placements WHERE student_id = ? AND status = "active"',
      [req.user.id]
    );
    const placementId = placements[0]?.id || null;

    const [result] = await pool.execute(
      `INSERT INTO logbooks (placement_id, student_id, date, hours_worked, description)
       VALUES (?, ?, ?, ?, ?)`,
      [placementId, req.user.id, date, hours_worked, description]
    );
    res.status(201).json({ id: result.insertId, message: 'Logbook entry submitted.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/logbooks/mine — student sees their own entries
router.get('/mine', authenticateToken, authorizeRole(['student']), async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const [rows] = await pool.execute(
      'SELECT * FROM logbooks WHERE student_id = ? ORDER BY date DESC',
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/logbooks/company — company sees entries from their placed interns
router.get('/company', authenticateToken, authorizeRole(['company']), async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const [rows] = await pool.execute(`
      SELECT l.*, u.name AS student_name, u.institution
      FROM logbooks l
      JOIN users u ON l.student_id = u.id
      JOIN placements p ON l.placement_id = p.id
      WHERE p.company_id = ?
      ORDER BY l.date DESC
    `, [req.user.id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/logbooks/:id/approve — company approves an entry
router.patch('/:id/approve', authenticateToken, authorizeRole(['company']), async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    await pool.execute(
      'UPDATE logbooks SET approved = TRUE WHERE id = ?',
      [req.params.id]
    );
    res.json({ message: 'Logbook entry approved.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
