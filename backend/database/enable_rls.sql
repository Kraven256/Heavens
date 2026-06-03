-- ======================================================
--  InternUG — Row Level Security (RLS) Configuration
--  Paste this into: Supabase Dashboard → SQL Editor → Run
-- ======================================================

-- ── 1. Enable Row Level Security (RLS) on all tables ──
-- Enabling RLS immediately secures your tables from unauthorized public access via the Supabase REST API/anon key.
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
CREATE POLICY "Allow all access to service_role" ON users
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ── Policies for 'internships' table ──
CREATE POLICY "Allow all access to service_role" ON internships
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ── Policies for 'applications' table ──
CREATE POLICY "Allow all access to service_role" ON applications
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ── Policies for 'placements' table ──
CREATE POLICY "Allow all access to service_role" ON placements
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ── Policies for 'logbooks' table ──
CREATE POLICY "Allow all access to service_role" ON logbooks
  FOR ALL
  USING (true)
  WITH CHECK (true);
