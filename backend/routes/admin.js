// routes/admin.js — Admin-only routes
const express = require('express');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/admin/users — all users
router.get('/users', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const supabase = req.app.locals.supabase;

    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, role, institution, company_name, location, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/users/:id — delete a user
router.delete('/users/:id', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const supabase = req.app.locals.supabase;

    if (parseInt(req.params.id) === req.user.id) {
      return res.status(400).json({ error: 'You cannot delete your own account.' });
    }

    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ message: 'User deleted.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/stats — dashboard stats
router.get('/stats', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const supabase = req.app.locals.supabase;

    const [
      { count: users },
      { count: internships },
      { count: applications },
      { count: placements },
    ] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('internships').select('*', { count: 'exact', head: true }),
      supabase.from('applications').select('*', { count: 'exact', head: true }),
      supabase.from('placements').select('*', { count: 'exact', head: true }),
    ]);

    res.json({ users, internships, applications, placements });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
