// routes/placements.js — Create, complete placements and issue completion letters
const express = require('express');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { buildCompletionLetterHtml } = require('../services/completionLetter');

const router = express.Router();

async function getPlacementDetails(supabase, placementId) {
  const { data, error } = await supabase
    .from('placements')
    .select(`
      *,
      student:users!student_id (name, institution, email),
      internships!internship_id (title),
      company:users!company_id (company_name)
    `)
    .eq('id', placementId)
    .single();

  if (error || !data) return null;
  return data;
}

// POST /api/placements — company creates a placement from an approved application
router.post('/', authenticateToken, authorizeRole(['company']), async (req, res) => {
  try {
    const { application_id } = req.body;
    const supabase = req.app.locals.supabase;

    const { data: app, error: appErr } = await supabase
      .from('applications')
      .select('*, internships!internship_id (company_id)')
      .eq('id', application_id)
      .single();

    if (appErr || !app) return res.status(404).json({ error: 'Application not found.' });
    if (app.internships?.company_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied.' });
    }
    if (app.status !== 'approved') {
      return res.status(400).json({ error: 'Application must be approved before creating a placement.' });
    }

    const { data: existing } = await supabase
      .from('placements')
      .select('id')
      .eq('application_id', application_id)
      .maybeSingle();

    if (existing) return res.status(400).json({ error: 'Placement already exists.' });

    const startDate = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('placements')
      .insert({
        application_id,
        student_id:    app.student_id,
        internship_id: app.internship_id,
        company_id:    req.user.id,
        start_date:    startDate,
      })
      .select('id')
      .single();

    if (error) throw error;
    res.status(201).json({ id: data.id, message: 'Placement created successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/placements/mine — student sees their placements
router.get('/mine', authenticateToken, authorizeRole(['student']), async (req, res) => {
  try {
    const supabase = req.app.locals.supabase;

    const { data, error } = await supabase
      .from('placements')
      .select(`
        *,
        internships!internship_id (title),
        company:users!company_id (company_name, location)
      `)
      .eq('student_id', req.user.id)
      .order('start_date', { ascending: false });

    if (error) throw error;

    const rows = (data || []).map(({ internships: i, company: c, ...p }) => ({
      ...p,
      title:        i?.title          ?? null,
      company_name: c?.company_name   ?? null,
      location:     c?.location       ?? null,
    }));

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/placements/company — company sees all their placements
router.get('/company', authenticateToken, authorizeRole(['company']), async (req, res) => {
  try {
    const supabase = req.app.locals.supabase;

    const { data, error } = await supabase
      .from('placements')
      .select(`
        *,
        student:users!student_id (name, institution),
        internships!internship_id (title)
      `)
      .eq('company_id', req.user.id)
      .order('start_date', { ascending: false });

    if (error) throw error;

    const rows = (data || []).map(({ student: s, internships: i, ...p }) => ({
      ...p,
      student_name:     s?.name         ?? null,
      institution:      s?.institution  ?? null,
      internship_title: i?.title        ?? null,
    }));

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/placements — admin sees all placements
router.get('/', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const supabase = req.app.locals.supabase;

    const { data, error } = await supabase
      .from('placements')
      .select(`
        *,
        student:users!student_id (name, institution),
        internships!internship_id (title),
        company:users!company_id (company_name)
      `)
      .order('start_date', { ascending: false });

    if (error) throw error;

    const rows = (data || []).map(({ student: s, internships: i, company: c, ...p }) => ({
      ...p,
      student_name:     s?.name         ?? null,
      institution:      s?.institution  ?? null,
      internship_title: i?.title        ?? null,
      company_name:     c?.company_name ?? null,
    }));

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/placements/:id/complete — mark internship as completed
router.patch('/:id/complete', authenticateToken, authorizeRole(['company', 'admin']), async (req, res) => {
  try {
    const supabase = req.app.locals.supabase;
    const placementId = req.params.id;

    const placement = await getPlacementDetails(supabase, placementId);
    if (!placement) return res.status(404).json({ error: 'Placement not found.' });

    if (req.user.role === 'company' && placement.company_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    if (placement.status === 'completed') {
      return res.status(400).json({ error: 'Placement is already marked as completed.' });
    }

    const endDate = req.body.end_date || new Date().toISOString().split('T')[0];

    const { error } = await supabase
      .from('placements')
      .update({
        status:       'completed',
        end_date:     endDate,
        completed_at: new Date().toISOString(),
      })
      .eq('id', placementId);

    if (error) throw error;
    res.json({ message: 'Placement marked as completed. Student can now download their letter of completion.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/placements/:id/completion-letter — printable HTML letter
router.get('/:id/completion-letter', authenticateToken, authorizeRole(['student', 'company', 'admin']), async (req, res) => {
  try {
    const supabase = req.app.locals.supabase;
    const placementId = req.params.id;

    const placement = await getPlacementDetails(supabase, placementId);
    if (!placement) return res.status(404).json({ error: 'Placement not found.' });

    const allowed =
      (req.user.role === 'student' && placement.student_id === req.user.id) ||
      (req.user.role === 'company' && placement.company_id === req.user.id) ||
      req.user.role === 'admin';

    if (!allowed) return res.status(403).json({ error: 'Access denied.' });

    if (placement.status !== 'completed') {
      return res.status(400).json({ error: 'Completion letter is only available after the placement is marked completed.' });
    }

    const { data: logbooks } = await supabase
      .from('logbooks')
      .select('hours_worked, approved')
      .eq('placement_id', placementId);

    const approvedLogs = (logbooks || []).filter(l => l.approved);
    const totalApprovedHours = approvedLogs.reduce((sum, l) => sum + (l.hours_worked || 0), 0);

    const html = buildCompletionLetterHtml({
      placementId,
      studentName:         placement.student?.name,
      institution:         placement.student?.institution,
      companyName:         placement.company?.company_name,
      internshipTitle:     placement.internships?.title,
      startDate:           placement.start_date,
      endDate:             placement.end_date,
      completedAt:         placement.completed_at,
      totalApprovedHours,
      logbookEntryCount:   logbooks?.length ?? 0,
    });

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
