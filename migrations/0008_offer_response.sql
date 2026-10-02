ALTER TABLE applications ADD COLUMN offer_response TEXT CHECK (offer_response IS NULL OR offer_response IN ('accepted','considering','waiting_other_offer','declined'));
ALTER TABLE applications ADD COLUMN offer_response_reason TEXT CHECK (offer_response_reason IS NULL OR offer_response_reason IN ('salary','housing','shift','transport','days_off','family','current_job','other'));
ALTER TABLE applications ADD COLUMN offer_response_at TEXT;

CREATE INDEX IF NOT EXISTS idx_applications_offer
  ON applications(job_id, status, offer_response, offer_response_at);
