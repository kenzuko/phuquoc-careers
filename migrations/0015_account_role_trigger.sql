-- Keep identity and business roles separate.
-- New native accounts receive their initial role automatically; additional roles are opt-in.

CREATE TRIGGER IF NOT EXISTS trg_accounts_seed_role
AFTER INSERT ON accounts
BEGIN
  INSERT OR IGNORE INTO account_roles(account_id,role,created_at)
  VALUES(NEW.id,NEW.account_type,NEW.created_at);
END;

INSERT OR IGNORE INTO account_roles(account_id,role,created_at)
SELECT id,account_type,created_at FROM accounts WHERE account_type IN ('candidate','employer');
