// routes/logbooks.js — Submit, review, archive and export logbook entries
const express = require('express');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

const router = express.Router();

// POST /api/logbooks — student submits a logbook entry
router.post('/', authenticateToken, authorizeRole(['student']), async (req, res) => {
  try {
    const { date, hours_worked, description } = req.body;
    const supabase = req.app.locals.supabase;

    if (!date || !hours_worked || !description) {
      return res.status(400).json({ error: 'Date, hours worked and description are required.' });
    }

    const { data: placements } = await supabase
      .from('placements')
      .select('id')
      .eq('student_id', req.user.id)
      .eq('status', 'active')
      .limit(1);

    const placementId = placements?.[0]?.id ?? null;

    const { data, error } = await supabase
      .from('logbooks')
      .insert({
        placement_id: placementId,
        student_id:   req.user.id,
        date,
        hours_worked,
        description,
      })
      .select('id')
      .single();

    if (error) throw error;
    res.status(201).json({ id: data.id, message: 'Logbook entry submitted and saved to your records.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/logbooks/mine — student sees their own entries (with placement context)
router.get('/mine', authenticateToken, authorizeRole(['student']), async (req, res) => {
  try {
    const supabase = req.app.locals.supabase;
    const { from, to, placement_id } = req.query;

    let q = supabase
      .from('logbooks')
      .select(`
        *,
        placements!placement_id (
          status, start_date, end_date,
          internships!internship_id (title),
          company:users!company_id (company_name)
        )
      `)
      .eq('student_id', req.user.id)
      .order('date', { ascending: false });

    if (from) q = q.gte('date', from);
    if (to) q = q.lte('date', to);
    if (placement_id) q = q.eq('placement_id', placement_id);

    const { data, error } = await q;
    if (error) throw error;

    const rows = (data || []).map(({ placements: p, ...l }) => ({
      ...l,
      company_name:     p?.company?.company_name ?? null,
      internship_title: p?.internships?.title     ?? null,
      placement_status: p?.status                  ?? null,
    }));

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/logbooks/export — student downloads CSV archive
router.get('/export', authenticateToken, authorizeRole(['student']), async (req, res) => {
  try {
    const supabase = req.app.locals.supabase;
    const { from, to } = req.query;

    let q = supabase
      .from('logbooks')
      .select(`
        id, date, hours_worked, description, approved, submitted_at,
        placements!placement_id (
          internships!internship_id (title),
          company:users!company_id (company_name)
        )
      `)
      .eq('student_id', req.user.id)
      .order('date', { ascending: true });

    if (from) q = q.gte('date', from);
    if (to) q = q.lte('date', to);

    const { data, error } = await q;
    if (error) throw error;

    const header = 'Date,Hours,Description,Approved,Company,Internship,Submitted At';
    const lines = (data || []).map(row => {
      const p = row.placements;
      const cols = [
        row.date,
        row.hours_worked,
        `"${String(row.description).replace(/"/g, '""')}"`,
        row.approved ? 'Yes' : 'Pending',
        `"${(p?.company?.company_name || '').replace(/"/g, '""')}"`,
        `"${(p?.internships?.title || '').replace(/"/g, '""')}"`,
        row.submitted_at || '',
      ];
      return cols.join(',');
    });

    const csv = [header, ...lines].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="internug-logbook-${req.user.id}.csv"`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/logbooks/company — company sees entries from their placed interns
router.get('/company', authenticateToken, authorizeRole(['company']), async (req, res) => {
  try {
    const supabase = req.app.locals.supabase;
    const { student_id, from, to } = req.query;

    const { data: companyPlacements } = await supabase
      .from('placements')
      .select('id, student_id')
      .eq('company_id', req.user.id);

    const placementIds = (companyPlacements || []).map(p => p.id);
    if (!placementIds.length) return res.json([]);

    let q = supabase
      .from('logbooks')
      .select(`
        *,
        student:users!student_id (name, institution),
        placements!placement_id (company_id, internships!internship_id (title))
      `)
      .in('placement_id', placementIds)
      .order('date', { ascending: false });

    if (student_id) q = q.eq('student_id', student_id);
    if (from) q = q.gte('date', from);
    if (to) q = q.lte('date', to);

    const { data, error } = await q;
    if (error) throw error;

    const rows = (data || []).map(({ student: s, placements: p, ...l }) => ({
      ...l,
      student_name:     s?.name        ?? null,
      institution:      s?.institution ?? null,
      internship_title: p?.internships?.title ?? null,
    }));

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/logbooks/admin — admin views all logbook records
router.get('/admin', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const supabase = req.app.locals.supabase;
    const { student_id, from, to } = req.query;

    let q = supabase
      .from('logbooks')
      .select(`
        *,
        student:users!student_id (name, institution, email),
        placements!placement_id (
          status,
          internships!internship_id (title),
          company:users!company_id (company_name)
        )
      `)
      .order('date', { ascending: false });

    if (student_id) q = q.eq('student_id', student_id);
    if (from) q = q.gte('date', from);
    if (to) q = q.lte('date', to);

    const { data, error } = await q;
    if (error) throw error;

    const rows = (data || []).map(({ student: s, placements: p, ...l }) => ({
      ...l,
      student_name:     s?.name         ?? null,
      student_email:    s?.email        ?? null,
      institution:      s?.institution  ?? null,
      company_name:     p?.company?.company_name ?? null,
      internship_title: p?.internships?.title     ?? null,
      placement_status: p?.status                  ?? null,
    }));

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/logbooks/:id/approve — company approves an entry
router.patch('/:id/approve', authenticateToken, authorizeRole(['company']), async (req, res) => {
  try {
    const supabase = req.app.locals.supabase;

    const { data: entry } = await supabase
      .from('logbooks')
      .select('id, placement_id, placements!placement_id (company_id)')
      .eq('id', req.params.id)
      .single();

    if (!entry || entry.placements?.company_id !== req.user.id) {
      return res.status(403).json({ error: 'You can only approve logbooks for your own interns.' });
    }

    const { error } = await supabase
      .from('logbooks')
      .update({ approved: true })
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ message: 'Logbook entry approved and recorded.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
