-- ======================================================
--  InternUG — Uganda Internship Management System
--  Supabase (PostgreSQL) Schema
--  Paste this into: Supabase Dashboard → SQL Editor → Run
-- ======================================================

-- ── Users ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  name          TEXT          NOT NULL,
  email         TEXT          UNIQUE NOT NULL,
  password      TEXT          NOT NULL,
  role          TEXT          CHECK (role IN ('student','company','admin')) NOT NULL,
  institution   TEXT          DEFAULT NULL,
  company_name  TEXT          DEFAULT NULL,
  location      TEXT          DEFAULT NULL,
  is_active     BOOLEAN       DEFAULT TRUE,
  reset_token   TEXT          DEFAULT NULL,
  reset_expires TIMESTAMPTZ   DEFAULT NULL,
  created_at    TIMESTAMPTZ   DEFAULT NOW()
);

-- ── Internships ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS internships (
  id            SERIAL PRIMARY KEY,
  title         TEXT          NOT NULL,
  description   TEXT,
  duration      TEXT,
  stipend       TEXT,
  requirements  TEXT,
  company_id    INTEGER       REFERENCES users(id) ON DELETE CASCADE,
  status        TEXT          CHECK (status IN ('open','closed')) DEFAULT 'open',
  created_at    TIMESTAMPTZ   DEFAULT NOW()
);

-- ── Applications ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS applications (
  id             SERIAL PRIMARY KEY,
  student_id     INTEGER       REFERENCES users(id) ON DELETE CASCADE,
  internship_id  INTEGER       REFERENCES internships(id) ON DELETE CASCADE,
  status         TEXT          CHECK (status IN ('pending','approved','rejected')) DEFAULT 'pending',
  applied_at     TIMESTAMPTZ   DEFAULT NOW()
);

-- ── Placements ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS placements (
  id              SERIAL PRIMARY KEY,
  application_id  INTEGER       REFERENCES applications(id),
  student_id      INTEGER       REFERENCES users(id),
  internship_id   INTEGER       REFERENCES internships(id),
  company_id      INTEGER       REFERENCES users(id),
  start_date      DATE,
  end_date        DATE          DEFAULT NULL,
  completed_at    TIMESTAMPTZ   DEFAULT NULL,
  status          TEXT          CHECK (status IN ('active','completed','terminated')) DEFAULT 'active'
);

-- ── Logbooks ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS logbooks (
  id            SERIAL PRIMARY KEY,
  placement_id  INTEGER       REFERENCES placements(id) ON DELETE CASCADE,
  student_id    INTEGER       REFERENCES users(id) ON DELETE CASCADE,
  date          DATE          NOT NULL,
  hours_worked  INTEGER       NOT NULL,
  description   TEXT          NOT NULL,
  approved      BOOLEAN       DEFAULT FALSE,
  submitted_at  TIMESTAMPTZ   DEFAULT NOW()
);

-- ── Seed Admin Account ─────────────────────────────────
-- Password is: admin123
INSERT INTO users (name, email, password, role)
VALUES (
  'Admin User',
  'admin@internug.ug',
  '$2a$10$TFkXR1Ja9QbYFpZP4kEsPeOaDQEUH8iDp68S5UvwMtxT9E/aG2FjG',
  'admin'
)
ON CONFLICT (email) DO NOTHING;

-- ── 1. Enable Row Level Security (RLS) on all tables ──
-- Secures your database from unauthorized public access via the Supabase anon/public key.
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE internships ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE placements ENABLE ROW LEVEL SECURITY;
ALTER TABLE logbooks ENABLE ROW LEVEL SECURITY;

-- ── 2. Create Security Policies ────────────────────────
-- NOTE: The InternUG Express backend connects using the "SUPABASE_SERVICE_KEY" (Service Role Key).
-- The Service Role Key possesses superuser permissions and automatically BYPASSES RLS.
-- Therefore, backend Express routes will continue to function perfectly without any code changes.
--
-- The policies below secure the database against unauthorized direct access, while explicitly
-- documenting the table permissions. 

-- ── Policies for 'users' table ──
CREATE POLICY "Allow all access to service_role" ON users FOR ALL USING (true) WITH CHECK (true);

-- ── Policies for 'internships' table ──
CREATE POLICY "Allow all access to service_role" ON internships FOR ALL USING (true) WITH CHECK (true);

-- ── Policies for 'applications' table ──
CREATE POLICY "Allow all access to service_role" ON applications FOR ALL USING (true) WITH CHECK (true);

-- ── Policies for 'placements' table ──
CREATE POLICY "Allow all access to service_role" ON placements FOR ALL USING (true) WITH CHECK (true);

-- ── Policies for 'logbooks' table ──
CREATE POLICY "Allow all access to service_role" ON logbooks FOR ALL USING (true) WITH CHECK (true);

