CREATE TABLE IF NOT EXISTS employer_sessions (
  id TEXT PRIMARY KEY,
  hr_identity_id TEXT NOT NULL REFERENCES hr_identities(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  last_used_at TEXT,
  revoked_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_employer_sessions_identity
  ON employer_sessions(hr_identity_id, expires_at, revoked_at);
