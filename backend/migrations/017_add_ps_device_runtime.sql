ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS ps_device_count INT NOT NULL DEFAULT 0;

ALTER TABLE businesses
  DROP CONSTRAINT IF EXISTS chk_businesses_ps_device_count_non_negative;

ALTER TABLE businesses
  ADD CONSTRAINT chk_businesses_ps_device_count_non_negative CHECK (ps_device_count >= 0);

CREATE TABLE IF NOT EXISTS business_ps_device_sessions (
  id BIGSERIAL PRIMARY KEY,
  business_id BIGINT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  device_number INT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_seconds BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_ps_sessions_device_number CHECK (device_number > 0),
  CONSTRAINT chk_ps_sessions_time_order CHECK (ended_at IS NULL OR ended_at >= started_at),
  CONSTRAINT chk_ps_sessions_duration_non_negative CHECK (duration_seconds IS NULL OR duration_seconds >= 0)
);

CREATE INDEX IF NOT EXISTS idx_ps_sessions_business_device
  ON business_ps_device_sessions (business_id, device_number);

CREATE INDEX IF NOT EXISTS idx_ps_sessions_business_started_at
  ON business_ps_device_sessions (business_id, started_at);

CREATE UNIQUE INDEX IF NOT EXISTS uq_ps_sessions_open_session
  ON business_ps_device_sessions (business_id, device_number)
  WHERE ended_at IS NULL;
