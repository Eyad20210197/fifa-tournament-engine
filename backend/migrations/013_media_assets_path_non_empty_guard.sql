-- Enforce that future writes cannot store an empty media URL/path.
-- NOT VALID keeps this migration safe even if legacy rows are inconsistent.
ALTER TABLE media_assets
  ADD CONSTRAINT chk_media_assets_path_not_empty
  CHECK (char_length(btrim(path)) > 0) NOT VALID;

-- Rollback:
-- ALTER TABLE media_assets DROP CONSTRAINT IF EXISTS chk_media_assets_path_not_empty;
