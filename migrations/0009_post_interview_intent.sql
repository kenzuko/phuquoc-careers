ALTER TABLE applications ADD COLUMN post_interview_response TEXT CHECK (post_interview_response IN ('still_interested','considering','no_longer_interested'));
ALTER TABLE applications ADD COLUMN post_interview_reason TEXT CHECK (post_interview_reason IN ('salary','role_fit','schedule','location_transport','culture','accepted_other_offer','other'));
ALTER TABLE applications ADD COLUMN post_interview_response_at TEXT;
