-- PhuQuocCareers marketplace core
-- Hospitality remains the deep editorial/data vertical, while the storage model accepts real demand from other industries.

CREATE TABLE IF NOT EXISTS workplaces (
  id TEXT PRIMARY KEY,
  employer_id TEXT,
  name TEXT NOT NULL,
  industry TEXT,
  address_text TEXT,
  zone TEXT,
  latitude REAL,
  longitude REAL,
  location_accuracy TEXT NOT NULL DEFAULT 'unknown' CHECK(location_accuracy IN ('exact','verified_address','approximate','unknown')),
  location_source TEXT,
  location_verified_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(employer_id) REFERENCES employers(id)
);
CREATE INDEX IF NOT EXISTS idx_workplaces_employer ON workplaces(employer_id);
CREATE INDEX IF NOT EXISTS idx_workplaces_zone ON workplaces(zone);

CREATE TABLE IF NOT EXISTS job_workplaces (
  job_id TEXT NOT NULL,
  workplace_id TEXT NOT NULL,
  is_primary INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  PRIMARY KEY(job_id, workplace_id),
  FOREIGN KEY(job_id) REFERENCES jobs(id),
  FOREIGN KEY(workplace_id) REFERENCES workplaces(id)
);

CREATE TABLE IF NOT EXISTS quick_job_posts (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  employer_id TEXT,
  title TEXT NOT NULL,
  occupation_family TEXT,
  industry TEXT,
  employer_name TEXT,
  workplace_name TEXT,
  zone TEXT,
  address_text TEXT,
  salary_text TEXT,
  shift_text TEXT,
  description TEXT,
  contact_ciphertext TEXT,
  contact_type TEXT,
  moderation_status TEXT NOT NULL DEFAULT 'pending' CHECK(moderation_status IN ('pending','approved','rejected','expired')),
  trust_state TEXT NOT NULL DEFAULT 'community_unverified' CHECK(trust_state IN ('community_unverified','employer_verified')),
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  approved_at TEXT,
  FOREIGN KEY(account_id) REFERENCES accounts(id),
  FOREIGN KEY(employer_id) REFERENCES employers(id)
);
CREATE INDEX IF NOT EXISTS idx_quick_job_status_expiry ON quick_job_posts(moderation_status, expires_at);
CREATE INDEX IF NOT EXISTS idx_quick_job_zone ON quick_job_posts(zone);
CREATE INDEX IF NOT EXISTS idx_quick_job_industry ON quick_job_posts(industry);
