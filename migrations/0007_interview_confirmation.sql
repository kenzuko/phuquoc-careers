ALTER TABLE applications ADD COLUMN interview_scheduled_at TEXT;
ALTER TABLE applications ADD COLUMN interview_response TEXT CHECK (interview_response IS NULL OR interview_response IN ('confirmed','reschedule','cannot_attend'));
ALTER TABLE applications ADD COLUMN interview_response_at TEXT;
ALTER TABLE applications ADD COLUMN interview_proposed_at TEXT;

CREATE INDEX IF NOT EXISTS idx_applications_interview
  ON applications(job_id, status, interview_scheduled_at, interview_response);
