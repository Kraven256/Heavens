// routes/internships.js — CRUD for internship listings
const express = require('express');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/internships — all open internships (students see this)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const [rows] = await pool.execute(`
      SELECT i.*, u.company_name, u.location
      FROM internships i
      JOIN users u ON i.company_id = u.id
      WHERE i.status = 'open'
      ORDER BY i.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/internships/mine — company's own listings
router.get('/mine', authenticateToken, authorizeRole(['company']), async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const [rows] = await pool.execute(
      'SELECT * FROM internships WHERE company_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/internships — post new internship (company only)
router.post('/', authenticateToken, authorizeRole(['company']), async (req, res) => {
  try {
    const { title, description, duration, stipend, requirements } = req.body;
    const pool = req.app.locals.pool;

    if (!title) return res.status(400).json({ error: 'Title is required.' });

    const [result] = await pool.execute(
      `INSERT INTO internships (title, description, duration, stipend, requirements, company_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [title, description || null, duration || null, stipend || null, requirements || null, req.user.id]
    );
    res.status(201).json({ id: result.insertId, message: 'Internship posted successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/internships/:id/close — close a listing (company only)
router.patch('/:id/close', authenticateToken, authorizeRole(['company']), async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    await pool.execute(
      'UPDATE internships SET status = "closed" WHERE id = ? AND company_id = ?',
      [req.params.id, req.user.id]
    );
    res.json({ message: 'Listing closed.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/internships/:id — admin only
router.delete('/:id', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    await pool.execute('DELETE FROM internships WHERE id = ?', [req.params.id]);
    res.json({ message: 'Internship deleted.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
