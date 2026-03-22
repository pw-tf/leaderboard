-- ============================================
-- CYBERPUNK GAME LEADERBOARD - SUPABASE SCHEMA
-- ============================================

-- Players table
CREATE TABLE players (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    gamertag TEXT NOT NULL UNIQUE,
    real_name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Games table
CREATE TABLE games (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('solo', 'team')),
    -- For solo games: JSON object like {"1": 10, "2": 7, "3": 5, "4": 3, "5": 1}
    placement_points JSONB DEFAULT '{}',
    -- For team games
    win_points INTEGER DEFAULT 0,
    lose_points INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rounds (admin-defined schedule structure)
CREATE TABLE rounds (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Matches (a specific game instance within a round)
CREATE TABLE matches (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    round_id UUID NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Match teams (for team-based matches)
CREATE TABLE match_teams (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    team_label TEXT NOT NULL, -- 'Alpha', 'Bravo', 'Charlie', etc.
    is_winner BOOLEAN DEFAULT FALSE
);

-- Players assigned to teams
CREATE TABLE match_team_players (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    match_team_id UUID NOT NULL REFERENCES match_teams(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE
);

-- Solo match results (individual placements)
CREATE TABLE match_solo_results (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    placement INTEGER NOT NULL,
    points_awarded INTEGER NOT NULL DEFAULT 0
);

-- Team match results (points per player from team matches)
CREATE TABLE match_team_results (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    match_team_id UUID NOT NULL REFERENCES match_teams(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    points_awarded INTEGER NOT NULL DEFAULT 0
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_team_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_solo_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_team_results ENABLE ROW LEVEL SECURITY;

-- Public read access for all tables
CREATE POLICY "Public read" ON players FOR SELECT USING (true);
CREATE POLICY "Public read" ON games FOR SELECT USING (true);
CREATE POLICY "Public read" ON rounds FOR SELECT USING (true);
CREATE POLICY "Public read" ON matches FOR SELECT USING (true);
CREATE POLICY "Public read" ON match_teams FOR SELECT USING (true);
CREATE POLICY "Public read" ON match_team_players FOR SELECT USING (true);
CREATE POLICY "Public read" ON match_solo_results FOR SELECT USING (true);
CREATE POLICY "Public read" ON match_team_results FOR SELECT USING (true);

-- Authenticated users (admins) can do everything
CREATE POLICY "Admin insert" ON players FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Admin update" ON players FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Admin delete" ON players FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Admin insert" ON games FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Admin update" ON games FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Admin delete" ON games FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Admin insert" ON rounds FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Admin update" ON rounds FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Admin delete" ON rounds FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Admin insert" ON matches FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Admin update" ON matches FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Admin delete" ON matches FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Admin insert" ON match_teams FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Admin update" ON match_teams FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Admin delete" ON match_teams FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Admin insert" ON match_team_players FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Admin update" ON match_team_players FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Admin delete" ON match_team_players FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Admin insert" ON match_solo_results FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Admin update" ON match_solo_results FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Admin delete" ON match_solo_results FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Admin insert" ON match_team_results FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Admin update" ON match_team_results FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Admin delete" ON match_team_results FOR DELETE USING (auth.role() = 'authenticated');

-- ============================================
-- USEFUL VIEWS
-- ============================================

-- Overall player standings (total points across all games)
CREATE OR REPLACE VIEW player_standings AS
SELECT
    p.id,
    p.gamertag,
    p.real_name,
    COALESCE(solo.total, 0) + COALESCE(team.total, 0) AS total_points,
    COALESCE(solo.total, 0) AS solo_points,
    COALESCE(team.total, 0) AS team_points
FROM players p
LEFT JOIN (
    SELECT player_id, SUM(points_awarded) AS total
    FROM match_solo_results
    GROUP BY player_id
) solo ON solo.player_id = p.id
LEFT JOIN (
    SELECT player_id, SUM(points_awarded) AS total
    FROM match_team_results
    GROUP BY player_id
) team ON team.player_id = p.id
ORDER BY total_points DESC;

-- Per-game player standings
CREATE OR REPLACE VIEW game_player_standings AS
SELECT
    g.id AS game_id,
    g.name AS game_name,
    g.type AS game_type,
    p.id AS player_id,
    p.gamertag,
    p.real_name,
    COALESCE(SUM(
        CASE
            WHEN g.type = 'solo' THEN msr.points_awarded
            ELSE mtr.points_awarded
        END
    ), 0) AS game_points
FROM games g
CROSS JOIN players p
LEFT JOIN matches m ON m.game_id = g.id AND m.status = 'completed'
LEFT JOIN match_solo_results msr ON msr.match_id = m.id AND msr.player_id = p.id AND g.type = 'solo'
LEFT JOIN match_teams mt ON mt.match_id = m.id AND g.type = 'team'
LEFT JOIN match_team_results mtr ON mtr.match_team_id = mt.id AND mtr.player_id = p.id AND g.type = 'team'
GROUP BY g.id, g.name, g.type, p.id, p.gamertag, p.real_name
HAVING COALESCE(SUM(
    CASE
        WHEN g.type = 'solo' THEN msr.points_awarded
        ELSE mtr.points_awarded
    END
), 0) > 0
ORDER BY game_points DESC;
