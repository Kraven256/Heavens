// ================================================
//  InternUG — Main Express Server
// ================================================
const express = require('express');
const cors    = require('cors');
const mysql   = require('mysql2/promise');
require('dotenv').config();

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ───────────────────────────────────
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Shared Database Pool ─────────────────────────
const pool = mysql.createPool({
  host:               process.env.DB_HOST || 'localhost',
  user:               process.env.DB_USER || 'root',
  password:           process.env.DB_PASS || '',
  database:           process.env.DB_NAME || 'internship_management',
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0
});

// Make pool available to all route files
app.locals.pool = pool;

// Test DB connection on startup
async function testConnection() {
  try {
    const conn = await pool.getConnection();
    console.log('✅ MySQL connected successfully');
    conn.release();
  } catch (err) {
    console.error('❌ MySQL connection failed:', err.message);
    console.error('   Make sure MySQL is running in XAMPP and your .env is correct.');
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
  res.json({ status: 'OK', message: 'InternUG backend is running!' });
});

// ── DB Test ──────────────────────────────────────
app.get('/api/test-db', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT 1 AS test');
    res.json({ success: true, message: 'Database connected!' });
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

module.exports = { app, pool };
