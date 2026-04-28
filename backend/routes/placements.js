// routes/placements.js — Create and view placements
const express = require('express');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

const router = express.Router();

// POST /api/placements — company creates a placement from approved application
router.post('/', authenticateToken, authorizeRole(['company']), async (req, res) => {
  try {
    const { application_id } = req.body;
    const pool = req.app.locals.pool;

    // Get the application
    const [appRows] = await pool.execute(
      'SELECT * FROM applications WHERE id = ?', [application_id]
    );
    if (appRows.length === 0) return res.status(404).json({ error: 'Application not found.' });
    const app = appRows[0];

    if (app.status !== 'approved') {
      return res.status(400).json({ error: 'Application must be approved before creating a placement.' });
    }

    // Prevent duplicate placements
    const [existing] = await pool.execute(
      'SELECT id FROM placements WHERE application_id = ?', [application_id]
    );
    if (existing.length > 0) return res.status(400).json({ error: 'Placement already exists.' });

    const [result] = await pool.execute(
      `INSERT INTO placements (application_id, student_id, internship_id, company_id, start_date)
       VALUES (?, ?, ?, ?, CURDATE())`,
      [application_id, app.student_id, app.internship_id, req.user.id]
    );
    res.status(201).json({ id: result.insertId, message: 'Placement created successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/placements/mine — student sees their placement
router.get('/mine', authenticateToken, authorizeRole(['student']), async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const [rows] = await pool.execute(`
      SELECT p.*, i.title, u.company_name, u.location
      FROM placements p
      JOIN internships i ON p.internship_id = i.id
      JOIN users u ON p.company_id = u.id
      WHERE p.student_id = ?
    `, [req.user.id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/placements/company — company sees all their placements
router.get('/company', authenticateToken, authorizeRole(['company']), async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const [rows] = await pool.execute(`
      SELECT p.*, u.name AS student_name, u.institution, i.title AS internship_title
      FROM placements p
      JOIN users u ON p.student_id = u.id
      JOIN internships i ON p.internship_id = i.id
      WHERE p.company_id = ?
    `, [req.user.id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/placements — admin sees all placements
router.get('/', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const [rows] = await pool.execute(`
      SELECT p.*, u1.name AS student_name, u1.institution,
             i.title AS internship_title, u2.company_name
      FROM placements p
      JOIN users u1 ON p.student_id = u1.id
      JOIN internships i ON p.internship_id = i.id
      JOIN users u2 ON p.company_id = u2.id
      ORDER BY p.start_date DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
