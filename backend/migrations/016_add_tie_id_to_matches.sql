ALTER TABLE tournament_matches
  ADD COLUMN IF NOT EXISTS tie_id UUID,
  ADD COLUMN IF NOT EXISTS is_tie_resolved BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tournament_matches_tie_id ON tournament_matches(tie_id);
