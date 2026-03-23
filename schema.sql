-- ============================================
-- CYBERPUNK LEADERBOARD - SCHEMA MIGRATION
-- ============================================

-- Drop old views first
DROP VIEW IF EXISTS player_standings CASCADE;
DROP VIEW IF EXISTS game_player_standings CASCADE;

-- Drop old tables (CASCADE handles FK dependencies)
DROP TABLE IF EXISTS match_team_results CASCADE;
DROP TABLE IF EXISTS match_team_players CASCADE;
DROP TABLE IF EXISTS match_teams CASCADE;
DROP TABLE IF EXISTS match_solo_results CASCADE;
DROP TABLE IF EXISTS matches CASCADE;
DROP TABLE IF EXISTS games CASCADE;

-- Drop old rounds table (different schema) before recreating
DROP TABLE IF EXISTS rounds CASCADE;

-- ============================================
-- ROUNDS
-- ============================================
CREATE TABLE rounds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    game_name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('ffa', 'solo_bracket', 'team_bracket')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
    sort_order INTEGER NOT NULL DEFAULT 0,
    match_win_points INTEGER NOT NULL DEFAULT 1,
    placement_1st_points INTEGER NOT NULL DEFAULT 5,
    placement_2nd_points INTEGER NOT NULL DEFAULT 3,
    placement_3rd_points INTEGER NOT NULL DEFAULT 1,
    ffa_placement_points JSONB NOT NULL DEFAULT '{}',
    team_size INTEGER,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- ROUND_PLAYERS
-- ============================================
CREATE TABLE round_players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    round_id UUID NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    UNIQUE(round_id, player_id)
);

-- ============================================
-- TEAMS
-- ============================================
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_label TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- TEAM_PLAYERS
-- ============================================
CREATE TABLE team_players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    UNIQUE(team_id, player_id)
);

-- ============================================
-- ROUND_TEAMS
-- ============================================
CREATE TABLE round_teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    round_id UUID NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    UNIQUE(round_id, team_id)
);

-- ============================================
-- BRACKET_MATCHES
-- ============================================
CREATE TABLE bracket_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    round_id UUID NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
    bracket_position INTEGER NOT NULL,
    bracket_round INTEGER NOT NULL,
    participant_1_type TEXT CHECK (participant_1_type IN ('player', 'team')),
    participant_1_id UUID,
    participant_2_type TEXT CHECK (participant_2_type IN ('player', 'team')),
    participant_2_id UUID,
    winner_id UUID,
    score_1 TEXT,
    score_2 TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'bye')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- FFA_RESULTS
-- ============================================
CREATE TABLE ffa_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    round_id UUID NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    placement INTEGER NOT NULL,
    points_awarded INTEGER NOT NULL DEFAULT 0,
    UNIQUE(round_id, player_id)
);

-- ============================================
-- PLAYER_POINTS
-- ============================================
CREATE TABLE player_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    round_id UUID NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    points INTEGER NOT NULL DEFAULT 0,
    source TEXT NOT NULL CHECK (source IN ('match_win', 'placement_bonus', 'ffa_placement'))
);

-- ============================================
-- VIEW: PLAYER_STANDINGS
-- ============================================
CREATE VIEW player_standings AS
SELECT
    p.id,
    p.gamertag,
    p.real_name,
    COALESCE(SUM(pp.points), 0)::INTEGER AS total_points
FROM players p
LEFT JOIN player_points pp ON pp.player_id = p.id
GROUP BY p.id, p.gamertag, p.real_name
ORDER BY total_points DESC;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE round_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE round_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE bracket_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE ffa_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_points ENABLE ROW LEVEL SECURITY;

-- PUBLIC SELECT policies
CREATE POLICY "rounds_public_select" ON rounds FOR SELECT USING (true);
CREATE POLICY "round_players_public_select" ON round_players FOR SELECT USING (true);
CREATE POLICY "teams_public_select" ON teams FOR SELECT USING (true);
CREATE POLICY "team_players_public_select" ON team_players FOR SELECT USING (true);
CREATE POLICY "round_teams_public_select" ON round_teams FOR SELECT USING (true);
CREATE POLICY "bracket_matches_public_select" ON bracket_matches FOR SELECT USING (true);
CREATE POLICY "ffa_results_public_select" ON ffa_results FOR SELECT USING (true);
CREATE POLICY "player_points_public_select" ON player_points FOR SELECT USING (true);

-- AUTHENTICATED INSERT policies
CREATE POLICY "rounds_auth_insert" ON rounds FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "round_players_auth_insert" ON round_players FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "teams_auth_insert" ON teams FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "team_players_auth_insert" ON team_players FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "round_teams_auth_insert" ON round_teams FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "bracket_matches_auth_insert" ON bracket_matches FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "ffa_results_auth_insert" ON ffa_results FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "player_points_auth_insert" ON player_points FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- AUTHENTICATED UPDATE policies
CREATE POLICY "rounds_auth_update" ON rounds FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "round_players_auth_update" ON round_players FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "teams_auth_update" ON teams FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "team_players_auth_update" ON team_players FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "round_teams_auth_update" ON round_teams FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "bracket_matches_auth_update" ON bracket_matches FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "ffa_results_auth_update" ON ffa_results FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "player_points_auth_update" ON player_points FOR UPDATE USING (auth.role() = 'authenticated');

-- AUTHENTICATED DELETE policies
CREATE POLICY "rounds_auth_delete" ON rounds FOR DELETE USING (auth.role() = 'authenticated');
CREATE POLICY "round_players_auth_delete" ON round_players FOR DELETE USING (auth.role() = 'authenticated');
CREATE POLICY "teams_auth_delete" ON teams FOR DELETE USING (auth.role() = 'authenticated');
CREATE POLICY "team_players_auth_delete" ON team_players FOR DELETE USING (auth.role() = 'authenticated');
CREATE POLICY "round_teams_auth_delete" ON round_teams FOR DELETE USING (auth.role() = 'authenticated');
CREATE POLICY "bracket_matches_auth_delete" ON bracket_matches FOR DELETE USING (auth.role() = 'authenticated');
CREATE POLICY "ffa_results_auth_delete" ON ffa_results FOR DELETE USING (auth.role() = 'authenticated');
CREATE POLICY "player_points_auth_delete" ON player_points FOR DELETE USING (auth.role() = 'authenticated');
