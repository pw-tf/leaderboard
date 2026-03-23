-- 1. Expand rounds.type constraint to allow solo_ladder, team_ladder
ALTER TABLE rounds DROP CONSTRAINT IF EXISTS rounds_type_check;
ALTER TABLE rounds ADD CONSTRAINT rounds_type_check
    CHECK (type IN ('ffa', 'solo_bracket', 'team_bracket', 'solo_ladder', 'team_ladder'));

-- 2. Add Peak config columns to rounds
ALTER TABLE rounds
    ADD COLUMN IF NOT EXISTS course_distance DECIMAL(10,2),
    ADD COLUMN IF NOT EXISTS time_allowed_seconds INTEGER,
    ADD COLUMN IF NOT EXISTS speed_multipliers_enabled BOOLEAN NOT NULL DEFAULT false;

-- 3. Create peak_results table
CREATE TABLE IF NOT EXISTS peak_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    round_id UUID NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
    player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    completed BOOLEAN NOT NULL DEFAULT false,
    time_taken_seconds INTEGER,
    distance_achieved DECIMAL(10,2),
    cfs DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    speed_multiplier DECIMAL(4,2) DEFAULT 1.00,
    ladder_position INTEGER,
    points_awarded DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(round_id, player_id),
    UNIQUE(round_id, team_id)
);

ALTER TABLE peak_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "peak_results_public_select" ON peak_results FOR SELECT USING (true);
CREATE POLICY "peak_results_auth_insert" ON peak_results FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "peak_results_auth_update" ON peak_results FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "peak_results_auth_delete" ON peak_results FOR DELETE USING (auth.role() = 'authenticated');

-- 4. Expand player_points source constraint
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'player_points'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%source%'
  LOOP
    EXECUTE 'ALTER TABLE player_points DROP CONSTRAINT ' || quote_ident(r.conname);
  END LOOP;
END $$;

ALTER TABLE player_points ADD CONSTRAINT player_points_source_check
    CHECK (source IN ('ffa_placement', 'match_win', 'placement_bonus', 'match_halo', 'match_peak', 'peak_result', 'simple_score'));

-- 5. Refresh views
DROP VIEW IF EXISTS player_standings;
DROP VIEW IF EXISTS player_points_detail;

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

CREATE VIEW player_points_detail AS
SELECT
    pp.id AS point_id,
    pp.player_id,
    pp.round_id,
    pp.points,
    pp.source,
    r.name AS round_name,
    r.game_name,
    r.scoring_mode,
    r.type AS round_type
FROM player_points pp
JOIN rounds r ON r.id = pp.round_id
ORDER BY r.sort_order, pp.source;
