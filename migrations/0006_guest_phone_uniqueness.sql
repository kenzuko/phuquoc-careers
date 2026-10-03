CREATE UNIQUE INDEX IF NOT EXISTS idx_guest_phone_hash_unique
  ON guest_profiles(phone_hash)
  WHERE phone_hash IS NOT NULL;
