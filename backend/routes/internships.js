// routes/internships.js — CRUD for internship listings
const express = require('express');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/internships — all open internships with company info (students see this)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const supabase = req.app.locals.supabase;

    const { data, error } = await supabase
      .from('internships')
      .select(`
        *,
        company:users!company_id (company_name, location)
      `)
      .eq('status', 'open')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Flatten nested company object to match original API shape
    const rows = (data || []).map(({ company, ...i }) => ({
      ...i,
      company_name: company?.company_name ?? null,
      location:     company?.location     ?? null,
    }));

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/internships/mine — company's own listings
router.get('/mine', authenticateToken, authorizeRole(['company']), async (req, res) => {
  try {
    const supabase = req.app.locals.supabase;

    const { data, error } = await supabase
      .from('internships')
      .select('*')
      .eq('company_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/internships — post new internship (company only)
router.post('/', authenticateToken, authorizeRole(['company']), async (req, res) => {
  try {
    const { title, description, duration, stipend, requirements } = req.body;
    const supabase = req.app.locals.supabase;

    if (!title) return res.status(400).json({ error: 'Title is required.' });

    const { data, error } = await supabase
      .from('internships')
      .insert({
        title,
        description:  description  || null,
        duration:     duration     || null,
        stipend:      stipend      || null,
        requirements: requirements || null,
        company_id:   req.user.id,
      })
      .select('id')
      .single();

    if (error) throw error;
    res.status(201).json({ id: data.id, message: 'Internship posted successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/internships/:id/close — close a listing (company only)
router.patch('/:id/close', authenticateToken, authorizeRole(['company']), async (req, res) => {
  try {
    const supabase = req.app.locals.supabase;

    const { error } = await supabase
      .from('internships')
      .update({ status: 'closed' })
      .eq('id', req.params.id)
      .eq('company_id', req.user.id);

    if (error) throw error;
    res.json({ message: 'Listing closed.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/internships/:id — admin only
router.delete('/:id', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const supabase = req.app.locals.supabase;

    const { error } = await supabase
      .from('internships')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ message: 'Internship deleted.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
