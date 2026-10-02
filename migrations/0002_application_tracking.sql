ALTER TABLE applications ADD COLUMN tracking_token_hash TEXT;
ALTER TABLE applications ADD COLUMN status_changed_at TEXT;
ALTER TABLE applications ADD COLUMN withdrawn_at TEXT;
ALTER TABLE applications ADD COLUMN withdrawal_reason TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_applications_tracking_token_hash
  ON applications(tracking_token_hash)
  WHERE tracking_token_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_applications_status_changed
  ON applications(status, status_changed_at);
