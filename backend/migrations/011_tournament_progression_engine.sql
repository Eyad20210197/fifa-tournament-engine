ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS progression_format VARCHAR(20),
  ADD COLUMN IF NOT EXISTS current_stage INT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS current_round INT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS auto_advance BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS progression_locked BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS hybrid_qualifiers_count INT NOT NULL DEFAULT 4;

UPDATE tournaments
SET progression_format = CASE
  WHEN progression_format IS NOT NULL THEN progression_format
  WHEN lower(trim(format)) IN ('خروج مغلوب', 'knockout') THEN 'knockout'
  WHEN lower(trim(format)) IN ('hybrid') THEN 'hybrid'
  ELSE 'round_robin'
END;

ALTER TABLE tournament_matches
  ADD COLUMN IF NOT EXISTS stage_number INT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS result_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS winner_team_id BIGINT REFERENCES tournament_teams(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS manual_override BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_tournament_matches_stage_round
  ON tournament_matches (tournament_id, stage_number, round_number);

CREATE INDEX IF NOT EXISTS idx_tournament_matches_confirmed
  ON tournament_matches (tournament_id, result_confirmed);
