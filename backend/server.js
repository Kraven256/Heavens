// ================================================
//  InternUG — Main Express Server
//  Database: Supabase (PostgreSQL)
// ================================================
const express               = require('express');
const cors                  = require('cors');
const { createClient }      = require('@supabase/supabase-js');
const ws                    = require('ws');   // Required for Node.js < 22
require('dotenv').config();

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Validate required env vars ───────────────────
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env');
  process.exit(1);
}

// ── Middleware ───────────────────────────────────
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Supabase Client (service-role — bypasses RLS) ─
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  {
    auth:     { persistSession: false },
    realtime: { transport: ws },          // Node.js 20 WebSocket fix
  }
);

// Make supabase client available to all route files
app.locals.supabase = supabase;

// Test Supabase connection on startup
async function testConnection() {
  try {
    const { error } = await supabase.from('users').select('id').limit(1);
    if (error) throw error;
    console.log('✅ Supabase connected successfully');
  } catch (err) {
    console.error('❌ Supabase connection failed:', err.message);
    console.error('   Check SUPABASE_URL and SUPABASE_SERVICE_KEY in .env');
  }
}

// ── Routes ───────────────────────────────────────
app.use('/api/auth',         require('./routes/auth'));
app.use('/api/internships',  require('./routes/internships'));
app.use('/api/applications', require('./routes/applications'));
app.use('/api/placements',   require('./routes/placements'));
app.use('/api/logbooks',     require('./routes/logbooks'));
app.use('/api/admin',        require('./routes/admin'));

// ── Health Check ─────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'InternUG backend is running!', db: 'Supabase' });
});

// ── DB Test ──────────────────────────────────────
app.get('/api/test-db', async (req, res) => {
  try {
    const { error } = await supabase.from('users').select('id').limit(1);
    if (error) throw error;
    res.json({ success: true, message: 'Supabase connected!', provider: 'Supabase' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── 404 ──────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// ── Global Error Handler ─────────────────────────
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ── Start ────────────────────────────────────────
testConnection();
app.listen(PORT, () => {
  console.log(`\n🚀 InternUG backend running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🗄  DB test:      http://localhost:${PORT}/api/test-db\n`);
});

module.exports = { app, supabase };
