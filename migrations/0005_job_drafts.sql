CREATE TABLE IF NOT EXISTS job_drafts (
  id TEXT PRIMARY KEY,
  hr_identity_id TEXT NOT NULL REFERENCES hr_identities(id) ON DELETE CASCADE,
  employer_id TEXT NOT NULL REFERENCES employers(id) ON DELETE CASCADE,
  input_type TEXT NOT NULL CHECK (input_type IN ('text','url','poster')),
  source_url TEXT,
  upload_name TEXT,
  raw_text TEXT,
  title TEXT NOT NULL,
  department TEXT,
  experience TEXT,
  salary_text TEXT,
  staff_house_state TEXT NOT NULL DEFAULT 'unknown' CHECK (staff_house_state IN ('mentioned','unknown')),
  service_charge_state TEXT NOT NULL DEFAULT 'unknown' CHECK (service_charge_state IN ('mentioned','unknown')),
  off_days_text TEXT,
  parser_status TEXT NOT NULL DEFAULT 'parsed' CHECK (parser_status IN ('parsed','needs_parser','confirmed')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','ready','published','archived')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_job_drafts_owner ON job_drafts(hr_identity_id, employer_id, status);
