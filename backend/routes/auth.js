// routes/auth.js — Register, Login, Profile, Password Reset
const express  = require('express');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const crypto   = require('crypto');
const { authenticateToken }       = require('../middleware/auth');
const { sendPasswordResetEmail }  = require('../services/email');

const router = express.Router();

function getAllowedAdminEmails() {
  const envEmail = process.env.ADMIN_EMAIL || 'admin@internug.ug';
  return envEmail.split(',').map(e => e.trim().toLowerCase());
}

// ── POST /api/auth/register ───────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, institution, company_name, location } = req.body;
    const supabase = req.app.locals.supabase;
    const normalizedEmail = (email || '').trim().toLowerCase();

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Name, email, password and role are required.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }
    if (role === 'admin' && !getAllowedAdminEmails().includes(normalizedEmail)) {
      return res.status(403).json({ error: 'Admin registration is restricted to authorized accounts.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const { data: newUser, error } = await supabase
      .from('users')
      .insert({
        name,
        email:        normalizedEmail,
        password:     hashedPassword,
        role,
        institution:  institution  || null,
        company_name: company_name || null,
        location:     location     || null,
      })
      .select('id, name, email, role')
      .single();

    if (error) {
      // Unique violation code in PostgreSQL is '23505'
      if (error.code === '23505') {
        return res.status(400).json({ error: 'Email already registered.' });
      }
      throw error;
    }

    const token = jwt.sign(
      { userId: newUser.id },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Account created successfully.',
      token,
      user: newUser,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/auth/login ──────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const supabase = req.app.locals.supabase;
    const normalizedEmail = (email || '').trim().toLowerCase();

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', normalizedEmail)
      .eq('is_active', true)
      .single();

    if (error || !user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    if (user.role === 'admin' && !getAllowedAdminEmails().includes(user.email.toLowerCase())) {
      return res.status(403).json({ error: 'Admin access is restricted to authorized accounts.' });
    }

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id:           user.id,
        name:         user.name,
        email:        user.email,
        role:         user.role,
        institution:  user.institution,
        company_name: user.company_name,
        location:     user.location,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/auth/profile ─────────────────────────────
router.get('/profile', authenticateToken, (req, res) => {
  const { password, ...safeUser } = req.user;
  res.json(safeUser);
});

// ── POST /api/auth/forgot-password ───────────────────
// Body: { email }
// Sends a 6-digit reset code to the user's email
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required.' });

    const supabase = req.app.locals.supabase;

    const { data: user } = await supabase
      .from('users')
      .select('id, name')
      .eq('email', email.toLowerCase())
      .eq('is_active', true)
      .single();

    // Always respond the same way to avoid leaking which emails are registered
    if (!user) {
      return res.json({ message: 'If that email is registered, a reset code has been sent.' });
    }

    // Generate a 6-digit numeric code
    const code    = String(Math.floor(100000 + Math.random() * 900000));
    const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Store the code and expiry in the database
    const { error: updateError } = await supabase
      .from('users')
      .update({ reset_token: code, reset_expires: expires.toISOString() })
      .eq('id', user.id);

    if (updateError) throw updateError;

    // Send the code via email
    await sendPasswordResetEmail(email.toLowerCase(), user.name, code);

    res.json({ message: 'If that email is registered, a reset code has been sent.' });
  } catch (err) {
    console.error('Forgot-password error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/auth/reset-password ────────────────────
// Body: { email, reset_code, new_password }
router.post('/reset-password', async (req, res) => {
  try {
    const { email, reset_code, new_password } = req.body;
    if (!email || !reset_code || !new_password) {
      return res.status(400).json({ error: 'Email, reset code and new password are required.' });
    }
    if (new_password.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters.' });
    }

    const supabase = req.app.locals.supabase;

    const { data: user } = await supabase
      .from('users')
      .select('id, reset_token, reset_expires')
      .eq('email', email.toLowerCase())
      .eq('is_active', true)
      .single();

    if (!user) {
      return res.status(400).json({ error: 'Invalid email or reset code.' });
    }

    if (!user.reset_token || user.reset_token !== reset_code) {
      return res.status(400).json({ error: 'Invalid reset code.' });
    }

    if (!user.reset_expires || new Date() > new Date(user.reset_expires)) {
      return res.status(400).json({ error: 'Reset code has expired. Please request a new one.' });
    }

    const hashedPassword = await bcrypt.hash(new_password, 10);

    const { error: updateError } = await supabase
      .from('users')
      .update({ password: hashedPassword, reset_token: null, reset_expires: null })
      .eq('id', user.id);

    if (updateError) throw updateError;

    res.json({ message: 'Password reset successfully. You can now sign in with your new password.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
