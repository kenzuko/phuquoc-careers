CREATE TABLE IF NOT EXISTS retention_checkins (
  id TEXT PRIMARY KEY,
  application_id TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  guest_id TEXT NOT NULL REFERENCES guest_profiles(id) ON DELETE CASCADE,
  window_days INTEGER NOT NULL CHECK (window_days IN (30,90)),
  response TEXT NOT NULL CHECK (response IN ('still_working','left','prefer_not_to_say')),
  reason TEXT CHECK (reason IN ('salary','schedule','location_transport','role_fit','culture','management','personal','other')),
  responded_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(application_id, window_days)
);
CREATE INDEX IF NOT EXISTS idx_retention_application ON retention_checkins(application_id, window_days);
CREATE INDEX IF NOT EXISTS idx_retention_guest ON retention_checkins(guest_id, responded_at);

CREATE TABLE IF NOT EXISTS notification_outbox (
  id TEXT PRIMARY KEY,
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('guest','hr_identity')),
  recipient_ref TEXT NOT NULL,
  channel_hint TEXT NOT NULL DEFAULT 'unknown' CHECK (channel_hint IN ('unknown','zalo','sms','email')),
  template_key TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  scheduled_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','leased','sent','failed','cancelled')),
  attempt_count INTEGER NOT NULL DEFAULT 0,
  last_error_code TEXT,
  sent_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(recipient_type, recipient_ref, template_key, entity_type, entity_id)
);
CREATE INDEX IF NOT EXISTS idx_outbox_due ON notification_outbox(status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_outbox_entity ON notification_outbox(entity_type, entity_id);
