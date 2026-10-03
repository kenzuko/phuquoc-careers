-- Identity bridge: authentication provider is separate from PhuQuocCareers business roles.
-- Existing native accounts remain valid. Clerk can be linked later without moving employer verification or profile data out of D1.

CREATE TABLE IF NOT EXISTS external_identities (
  provider TEXT NOT NULL,
  provider_subject TEXT NOT NULL,
  account_id TEXT NOT NULL,
  email_verified INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY(provider, provider_subject),
  FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_external_identities_account ON external_identities(account_id);

CREATE TABLE IF NOT EXISTS account_roles (
  account_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('candidate','employer')),
  created_at TEXT NOT NULL,
  PRIMARY KEY(account_id, role),
  FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

INSERT OR IGNORE INTO account_roles(account_id,role,created_at)
SELECT id,account_type,created_at FROM accounts WHERE account_type IN ('candidate','employer');
