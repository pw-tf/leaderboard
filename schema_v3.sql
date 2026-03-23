-- ============================================================
-- SCHEMA V3 MIGRATION
-- Run this against your Supabase project SQL editor
-- ============================================================

-- 1. Drop views that depend on columns we're altering
DROP VIEW IF EXISTS player_standings;
DROP VIEW IF EXISTS player_points_detail;

-- 2. Add scoring columns to rounds
ALTER TABLE rounds
  ADD COLUMN IF NOT EXISTS scoring_mode VARCHAR(20) NOT NULL DEFAULT 'simple_score',
  ADD COLUMN IF NOT EXISTS time_allowed_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS placement_ladder JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS use_win_multiplier BOOLEAN NOT NULL DEFAULT false;

-- 3. Upgrade player_points.points to DECIMAL and expand source constraint
ALTER TABLE player_points
  ALTER COLUMN points TYPE DECIMAL(10,2) USING points::DECIMAL(10,2);

ALTER TABLE player_points DROP CONSTRAINT IF EXISTS player_points_source_check;
ALTER TABLE player_points ADD CONSTRAINT player_points_source_check
  CHECK (source IN ('ffa_placement', 'match_win', 'placement_bonus', 'match_halo', 'match_peak'));

-- 4. Upgrade ffa_results and add Halo stat columns
ALTER TABLE ffa_results
  ALTER COLUMN points_awarded TYPE DECIMAL(10,2) USING points_awarded::DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS score DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS kills INTEGER,
  ADD COLUMN IF NOT EXISTS deaths INTEGER,
  ADD COLUMN IF NOT EXISTS assists INTEGER,
  ADD COLUMN IF NOT EXISTS kda DECIMAL(10,4),
  ADD COLUMN IF NOT EXISTS cfs DECIMAL(10,4);

-- 5. Create match_player_stats for bracket per-match stats
CREATE TABLE IF NOT EXISTS match_player_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES bracket_matches(id) ON DELETE CASCADE NOT NULL,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE NOT NULL,
  -- Halo stats
  score DECIMAL(10,2),
  kills INTEGER,
  deaths INTEGER,
  assists INTEGER,
  kda DECIMAL(10,4),
  cfs DECIMAL(10,4),
  -- Peak stats
  time_taken_seconds INTEGER,
  distance_covered DECIMAL(10,2),
  -- Result
  points_awarded DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE match_player_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read match_player_stats"
  ON match_player_stats FOR SELECT USING (true);
CREATE POLICY "Authenticated insert match_player_stats"
  ON match_player_stats FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated update match_player_stats"
  ON match_player_stats FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated delete match_player_stats"
  ON match_player_stats FOR DELETE USING (auth.role() = 'authenticated');

-- 6. Player points detail view (for breakdown modal)
CREATE VIEW player_points_detail AS
SELECT
  pp.id,
  pp.player_id,
  p.gamertag,
  p.real_name,
  pp.round_id,
  r.name AS round_name,
  r.game_name,
  r.scoring_mode,
  r.type AS round_type,
  pp.points,
  pp.source
FROM player_points pp
JOIN players p ON p.id = pp.player_id
JOIN rounds r ON r.id = pp.round_id
ORDER BY r.sort_order, pp.id;

-- 7. Update player_standings view to use DECIMAL sum
CREATE VIEW player_standings AS
SELECT
  p.id,
  p.gamertag,
  p.real_name,
  COALESCE(SUM(pp.points), 0)::DECIMAL(10,2) AS total_points
FROM players p
LEFT JOIN player_points pp ON pp.player_id = p.id
GROUP BY p.id, p.gamertag, p.real_name
ORDER BY total_points DESC;
