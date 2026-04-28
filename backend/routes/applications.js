// routes/applications.js — Apply, view, approve/reject
const express = require('express');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

const router = express.Router();

// POST /api/applications/:internshipId — student applies
router.post('/:internshipId', authenticateToken, authorizeRole(['student']), async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const internshipId = req.params.internshipId;

    // Prevent duplicate applications
    const [existing] = await pool.execute(
      'SELECT id FROM applications WHERE student_id = ? AND internship_id = ?',
      [req.user.id, internshipId]
    );
    if (existing.length > 0) {
      return res.status(400).json({ error: 'You have already applied for this internship.' });
    }

    const [result] = await pool.execute(
      'INSERT INTO applications (student_id, internship_id) VALUES (?, ?)',
      [req.user.id, internshipId]
    );
    res.status(201).json({ id: result.insertId, message: 'Application submitted successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/applications/mine — student sees their own applications
router.get('/mine', authenticateToken, authorizeRole(['student']), async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const [rows] = await pool.execute(`
      SELECT a.*, i.title, i.duration, i.stipend, u.company_name, u.location
      FROM applications a
      JOIN internships i ON a.internship_id = i.id
      JOIN users u ON i.company_id = u.id
      WHERE a.student_id = ?
      ORDER BY a.applied_at DESC
    `, [req.user.id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/applications/company — company sees all applications for their internships
router.get('/company', authenticateToken, authorizeRole(['company']), async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const [rows] = await pool.execute(`
      SELECT a.*, i.title AS internship_title,
             u.name AS student_name, u.email AS student_email, u.institution
      FROM applications a
      JOIN internships i ON a.internship_id = i.id
      JOIN users u ON a.student_id = u.id
      WHERE i.company_id = ?
      ORDER BY a.applied_at DESC
    `, [req.user.id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/applications/:id/approve — company approves
router.patch('/:id/approve', authenticateToken, authorizeRole(['company']), async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    await pool.execute(
      'UPDATE applications SET status = "approved" WHERE id = ?',
      [req.params.id]
    );
    res.json({ message: 'Application approved.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/applications/:id/reject — company rejects
router.patch('/:id/reject', authenticateToken, authorizeRole(['company']), async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    await pool.execute(
      'UPDATE applications SET status = "rejected" WHERE id = ?',
      [req.params.id]
    );
    res.json({ message: 'Application rejected.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
