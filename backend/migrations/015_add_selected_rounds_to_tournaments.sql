ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS selected_rounds INTEGER[];
