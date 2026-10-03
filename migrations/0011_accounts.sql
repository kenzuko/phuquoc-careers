PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  account_type TEXT NOT NULL CHECK (account_type IN ('candidate','employer')),
  display_name_ciphertext TEXT NOT NULL,
  email_ciphertext TEXT,
  email_hash TEXT UNIQUE,
  phone_ciphertext TEXT,
  phone_hash TEXT UNIQUE,
  password_salt TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_accounts_type_status ON accounts(account_type,status);

CREATE TABLE IF NOT EXISTS account_sessions (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  last_used_at TEXT,
  revoked_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_account_sessions_account ON account_sessions(account_id,expires_at,revoked_at);

CREATE TABLE IF NOT EXISTS candidate_account_profiles (
  account_id TEXT PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  guest_id TEXT REFERENCES guest_profiles(id) ON DELETE SET NULL,
  current_role TEXT,
  preferred_zone TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS employer_account_profiles (
  account_id TEXT PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  employer_id TEXT REFERENCES employers(id) ON DELETE SET NULL,
  requested_employer_name TEXT NOT NULL,
  requested_role TEXT NOT NULL DEFAULT 'recruiter' CHECK (requested_role IN ('owner','admin','recruiter','hiring_manager')),
  verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending','verified','rejected')),
  claim_id TEXT REFERENCES employer_claims(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_employer_account_profiles_employer ON employer_account_profiles(employer_id,verification_status);
