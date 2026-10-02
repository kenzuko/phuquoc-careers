CREATE TABLE IF NOT EXISTS hr_login_links (
  id TEXT PRIMARY KEY,
  hr_identity_id TEXT NOT NULL REFERENCES hr_identities(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  revoked_at TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_hr_login_links_identity
  ON hr_login_links(hr_identity_id, expires_at, used_at, revoked_at);

ALTER TABLE employer_sessions ADD COLUMN login_link_id TEXT REFERENCES hr_login_links(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_employer_sessions_login_link
  ON employer_sessions(login_link_id)
  WHERE login_link_id IS NOT NULL;
