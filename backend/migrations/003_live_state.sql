CREATE TABLE live_state_snapshots (
  id BIGSERIAL PRIMARY KEY,
  business_id BIGINT NOT NULL UNIQUE REFERENCES businesses(id) ON DELETE CASCADE,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_live_state_business_id ON live_state_snapshots(business_id);
