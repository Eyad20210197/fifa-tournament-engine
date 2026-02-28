ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS home_away_stages TEXT[];

UPDATE tournaments
SET home_away_stages = CASE
  WHEN home_away_stage IS NULL THEN NULL
  ELSE ARRAY[home_away_stage]
END
WHERE home_away_stages IS NULL;

