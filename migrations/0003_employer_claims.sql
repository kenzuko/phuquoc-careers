ALTER TABLE employer_users ADD COLUMN email_ciphertext TEXT;
ALTER TABLE employer_users ADD COLUMN email_hash TEXT;
ALTER TABLE employer_users ADD COLUMN email_domain TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_employer_users_email_hash
  ON employer_users(email_hash)
  WHERE email_hash IS NOT NULL;

CREATE TABLE IF NOT EXISTS employer_claims (
  id TEXT PRIMARY KEY,
  employer_id TEXT NOT NULL REFERENCES employers(id) ON DELETE CASCADE,
  requested_role TEXT NOT NULL DEFAULT 'recruiter' CHECK (requested_role IN ('owner','admin','recruiter','hiring_manager')),
  email_ciphertext TEXT NOT NULL,
  email_hash TEXT NOT NULL,
  email_domain TEXT NOT NULL,
  verification_method TEXT NOT NULL CHECK (verification_method IN ('work_email','manual')),
  proof_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','cancelled')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  reviewed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_employer_claims_status ON employer_claims(status, created_at);
CREATE INDEX IF NOT EXISTS idx_employer_claims_employer ON employer_claims(employer_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_employer_claims_pending_identity
  ON employer_claims(employer_id, email_hash)
  WHERE status='pending';
