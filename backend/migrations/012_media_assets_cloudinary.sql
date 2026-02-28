ALTER TABLE media_assets
  ADD COLUMN IF NOT EXISTS public_id TEXT,
  ADD COLUMN IF NOT EXISTS resource_type VARCHAR(32) DEFAULT 'image';

CREATE INDEX IF NOT EXISTS idx_media_assets_public_id
  ON media_assets (public_id);
