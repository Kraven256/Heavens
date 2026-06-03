// routes/applications.js — Apply, view, approve/reject (with email notifications)
const express = require('express');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { sendApplicationStatusEmail } = require('../services/email');

const router = express.Router();

async function notifyStudentOfStatus(supabase, applicationId, status) {
  const { data: app } = await supabase
    .from('applications')
    .select(`
      id,
      student:users!student_id (name, email),
      internships!internship_id (
        title,
        company:users!company_id (company_name)
      )
    `)
    .eq('id', applicationId)
    .single();

  if (!app?.student?.email) return;

  await sendApplicationStatusEmail({
    toEmail:         app.student.email,
    name:            app.student.name,
    status,
    internshipTitle: app.internships?.title ?? 'Internship',
    companyName:     app.internships?.company?.company_name ?? 'Employer',
  });
}

// POST /api/applications/:internshipId — student applies
router.post('/:internshipId', authenticateToken, authorizeRole(['student']), async (req, res) => {
  try {
    const supabase      = req.app.locals.supabase;
    const internshipId  = req.params.internshipId;

    const { data: existing } = await supabase
      .from('applications')
      .select('id')
      .eq('student_id', req.user.id)
      .eq('internship_id', internshipId)
      .maybeSingle();

    if (existing) {
      return res.status(400).json({ error: 'You have already applied for this internship.' });
    }

    const { data, error } = await supabase
      .from('applications')
      .insert({ student_id: req.user.id, internship_id: internshipId })
      .select('id')
      .single();

    if (error) throw error;
    res.status(201).json({ id: data.id, message: 'Application submitted successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/applications/mine — student sees their own applications
router.get('/mine', authenticateToken, authorizeRole(['student']), async (req, res) => {
  try {
    const supabase = req.app.locals.supabase;

    const { data, error } = await supabase
      .from('applications')
      .select(`
        *,
        internships!internship_id (
          title, duration, stipend,
          company:users!company_id (company_name, location)
        )
      `)
      .eq('student_id', req.user.id)
      .order('applied_at', { ascending: false });

    if (error) throw error;

    const rows = (data || []).map(({ internships: i, ...app }) => ({
      ...app,
      title:        i?.title                    ?? null,
      duration:     i?.duration                 ?? null,
      stipend:      i?.stipend                  ?? null,
      company_name: i?.company?.company_name    ?? null,
      location:     i?.company?.location        ?? null,
    }));

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/applications/company — company sees all applications for their internships
router.get('/company', authenticateToken, authorizeRole(['company']), async (req, res) => {
  try {
    const supabase = req.app.locals.supabase;

    const { data, error } = await supabase
      .from('applications')
      .select(`
        *,
        internships!internship_id (title, company_id),
        student:users!student_id (name, email, institution)
      `)
      .order('applied_at', { ascending: false });

    if (error) throw error;

    const rows = (data || [])
      .filter(a => a.internships?.company_id === req.user.id)
      .map(({ internships: i, student: s, ...app }) => ({
        ...app,
        internship_title: i?.title        ?? null,
        student_name:     s?.name         ?? null,
        student_email:    s?.email        ?? null,
        institution:      s?.institution  ?? null,
      }));

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/applications/:id/approve — company approves + emails student
router.patch('/:id/approve', authenticateToken, authorizeRole(['company']), async (req, res) => {
  try {
    const supabase = req.app.locals.supabase;
    const appId = req.params.id;

    const { data: app } = await supabase
      .from('applications')
      .select('id, internships!internship_id (company_id)')
      .eq('id', appId)
      .single();

    if (!app || app.internships?.company_id !== req.user.id) {
      return res.status(403).json({ error: 'You can only approve applications for your internships.' });
    }

    const { error } = await supabase
      .from('applications')
      .update({ status: 'approved' })
      .eq('id', appId);

    if (error) throw error;

    try {
      await notifyStudentOfStatus(supabase, appId, 'approved');
    } catch (emailErr) {
      console.error('[Email] Approve notification failed:', emailErr.message);
    }

    res.json({ message: 'Application approved. The student has been notified by email.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/applications/:id/reject — company rejects + emails student
router.patch('/:id/reject', authenticateToken, authorizeRole(['company']), async (req, res) => {
  try {
    const supabase = req.app.locals.supabase;
    const appId = req.params.id;

    const { data: app } = await supabase
      .from('applications')
      .select('id, internships!internship_id (company_id)')
      .eq('id', appId)
      .single();

    if (!app || app.internships?.company_id !== req.user.id) {
      return res.status(403).json({ error: 'You can only reject applications for your internships.' });
    }

    const { error } = await supabase
      .from('applications')
      .update({ status: 'rejected' })
      .eq('id', appId);

    if (error) throw error;

    try {
      await notifyStudentOfStatus(supabase, appId, 'rejected');
    } catch (emailErr) {
      console.error('[Email] Reject notification failed:', emailErr.message);
    }

    res.json({ message: 'Application rejected. The student has been notified by email.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
