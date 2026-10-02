PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS employers (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  operator TEXT,
  website TEXT,
  claim_status TEXT NOT NULL DEFAULT 'unclaimed' CHECK (claim_status IN ('unclaimed','pending','verified','rejected')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS hr_identities (
  id TEXT PRIMARY KEY,
  email_ciphertext TEXT,
  email_hash TEXT UNIQUE,
  email_domain TEXT,
  phone_hash TEXT,
  verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending','verified','rejected')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_hr_identities_email_hash ON hr_identities(email_hash);

CREATE TABLE IF NOT EXISTS employer_memberships (
  id TEXT PRIMARY KEY,
  hr_identity_id TEXT NOT NULL REFERENCES hr_identities(id) ON DELETE CASCADE,
  employer_id TEXT NOT NULL REFERENCES employers(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'recruiter' CHECK (role IN ('owner','admin','recruiter','hiring_manager','viewer')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','suspended','revoked')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(hr_identity_id, employer_id)
);
CREATE INDEX IF NOT EXISTS idx_memberships_identity ON employer_memberships(hr_identity_id, status);
CREATE INDEX IF NOT EXISTS idx_memberships_employer ON employer_memberships(employer_id, status);

CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  canonical_key TEXT NOT NULL UNIQUE,
  employer_id TEXT REFERENCES employers(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  original_title TEXT,
  department TEXT,
  location TEXT NOT NULL DEFAULT 'Phú Quốc',
  zone TEXT,
  employment TEXT,
  experience TEXT,
  english TEXT,
  salary_text TEXT,
  service_charge_state TEXT NOT NULL DEFAULT 'unknown' CHECK (service_charge_state IN ('yes','no','mentioned','unknown')),
  staff_house_state TEXT NOT NULL DEFAULT 'unknown' CHECK (staff_house_state IN ('yes','no','mentioned','unknown')),
  meals_text TEXT,
  shuttle_state TEXT NOT NULL DEFAULT 'unknown' CHECK (shuttle_state IN ('yes','no','mentioned','unknown')),
  off_days_text TEXT,
  urgent INTEGER NOT NULL DEFAULT 0 CHECK (urgent IN (0,1)),
  freshness_status TEXT NOT NULL DEFAULT 'fresh' CHECK (freshness_status IN ('fresh','needs_recheck','expired')),
  first_seen_at TEXT,
  last_seen_at TEXT,
  employer_confirmed_at TEXT,
  description TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_jobs_fresh_department ON jobs(freshness_status, department);
CREATE INDEX IF NOT EXISTS idx_jobs_zone ON jobs(zone);
CREATE INDEX IF NOT EXISTS idx_jobs_employer ON jobs(employer_id);

CREATE TABLE IF NOT EXISTS job_sources (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  source_id TEXT NOT NULL,
  source_job_id TEXT,
  source_url TEXT NOT NULL,
  observed_at TEXT NOT NULL,
  source_priority INTEGER NOT NULL DEFAULT 0,
  raw_snapshot_path TEXT,
  UNIQUE(job_id, source_id, source_job_id, source_url)
);
CREATE INDEX IF NOT EXISTS idx_job_sources_job ON job_sources(job_id);

CREATE TABLE IF NOT EXISTS guest_profiles (
  id TEXT PRIMARY KEY,
  name_ciphertext TEXT,
  phone_ciphertext TEXT,
  phone_hash TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_guest_phone_hash ON guest_profiles(phone_hash);

CREATE TABLE IF NOT EXISTS candidate_intents (
  id TEXT PRIMARY KEY,
  guest_id TEXT NOT NULL REFERENCES guest_profiles(id) ON DELETE CASCADE,
  job_id TEXT REFERENCES jobs(id) ON DELETE CASCADE,
  intent TEXT NOT NULL CHECK (intent IN ('browsing','open_to_offers','actively_looking','available_soon','available_now')),
  confirmed_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  paused_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_intents_active ON candidate_intents(intent, expires_at, paused_at);
CREATE INDEX IF NOT EXISTS idx_intents_job ON candidate_intents(job_id);

CREATE TABLE IF NOT EXISTS applications (
  id TEXT PRIMARY KEY,
  guest_id TEXT NOT NULL REFERENCES guest_profiles(id) ON DELETE CASCADE,
  job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','viewed','shortlisted','interview','offer','joined','rejected','withdrawn')),
  interview_preference TEXT,
  available_date TEXT,
  consent_scope TEXT NOT NULL DEFAULT 'this_employer_only',
  submitted_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(guest_id, job_id)
);
CREATE INDEX IF NOT EXISTS idx_applications_job_status ON applications(job_id, status);
CREATE INDEX IF NOT EXISTS idx_applications_guest ON applications(guest_id);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('guest','candidate','hr_identity','system')),
  actor_id TEXT,
  event_type TEXT NOT NULL,
  job_id TEXT REFERENCES jobs(id) ON DELETE SET NULL,
  employer_id TEXT REFERENCES employers(id) ON DELETE SET NULL,
  source_channel TEXT,
  payload_json TEXT,
  occurred_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_events_type_time ON events(event_type, occurred_at);
CREATE INDEX IF NOT EXISTS idx_events_job ON events(job_id, occurred_at);
