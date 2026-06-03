-- Run in Supabase SQL Editor (safe to re-run)
ALTER TABLE placements ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE placements ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

ALTER TABLE logbooks ADD COLUMN IF NOT EXISTS supervisor_note TEXT;
