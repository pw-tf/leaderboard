# NEXUS ARENA — Game Competition Leaderboard

## Project Summary

A cyberpunk-themed public leaderboard website for tracking player points across a multi-game competition event. Roughly 30 players compete in both solo and team-based games across multiple rounds. An admin panel allows authenticated users to manage all data. The public site requires no login — anyone can view standings, per-game leaderboards, and match schedules/results.

This is a one-off event but the site may be reused later.

---

## Tech Stack

- **Frontend:** Static HTML, CSS, JavaScript (no framework)
- **Hosting:** GitHub Pages
- **Backend:** Supabase (PostgreSQL database, Auth, auto-generated REST API)
- **Auth:** Supabase Auth — admin-only login via email/password. Players do not log in.
- **Deployment:** Files pushed to GitHub repo via GitHub's web interface

---

## Design / Aesthetic

**Theme:** Cyberpunk / Blade Runner — dark, neon, synthwave

- Dark backgrounds (#06060e base, #0c0c1a panels, #10102a cards)
- Neon glow text and borders (cyan #00f0ff, magenta #ff2d95, purple #b026ff)
- Synthwave gradient accents (pink → purple → blue)
- NO CRT/scanline effects, NO sound effects
- Clean and readable, especially on mobile

**Fonts (Google Fonts):**
- Display/headings: `Orbitron` (bold, futuristic)
- Body: `Rajdhani` (clean, readable)
- Mono/data: `Share Tech Mono` (terminal feel)

**Layout:**
- Mobile-first responsive design
- Max-width 1000px centered container
- Subtle grid overlay and bottom radial glow on body background

---

## Pages

### 1. `index.html` — Standings & Recent Results (Public Home)
- Overall player standings table sorted by total points (descending)
- Shows rank, gamertag (click to reveal real name), solo points, team points, total points
- Top 3 ranks get gold/silver/bronze styling
- Below standings: most recent 10 completed match cards showing results

### 2. `games.html` — Per-Game Leaderboards (Public)
- Filter buttons for each game (shows [SOLO] or [TEAM] tag)
- Selecting a game shows that game's leaderboard: rank, gamertag, points earned in that specific game
- Auto-selects first game on load

### 3. `schedule.html` — Round-by-Round Schedule (Public)
- Displays all rounds in order with their matches
- Each match card shows: game name, status (pending/completed)
- Completed team matches show team blocks with player names, winner star, and points
- Completed solo matches show placement list with ranks and points
- Pending matches show team assignments if set, otherwise "Awaiting results"

### 4. `admin.html` — Admin Panel (Auth-Protected)
- Login gate: email + password → Supabase Auth
- Once authenticated, shows tabbed interface with 5 sections:

#### Tab: Players
- Add player form: Gamertag + Real Name
- List of all players with delete button

#### Tab: Games
- Add game form: Name, Type (solo/team)
- Solo games: comma-separated placement points (e.g. "10, 7, 5, 3, 1" for 1st through 5th)
- Team games: Win points and Lose points per player
- List of all games with config summary and delete button

#### Tab: Rounds
- Add round form: Name + Sort Order number
- List of all rounds with delete button
- Rounds are the schedule structure (Round 1, Round 2, etc.) — admin defines them manually

#### Tab: Solo Match
- Select Round and Game (filtered to solo-type games only)
- Shows placement dropdowns: #1 through #N (based on how many placements the game has configured)
- Each dropdown lists all players — admin assigns who placed where
- Points auto-calculated from game's placement_points config
- Submit creates a completed match with solo results

#### Tab: Team Match
- Select Round and Game (filtered to team-type games only)
- Player chip grid: click once = Alpha (cyan), click again = Bravo (magenta), click again = unassigned
- Live summary shows Alpha and Bravo rosters
- Winner dropdown (Alpha/Bravo)
- Win/Lose points fields (pre-filled from game config, but manually editable per match)
- Submit creates: match → two match_teams → player assignments → point results for each player
- Winning team players get win points, losing team players get lose/consolation points

---

## Database Schema (Supabase/PostgreSQL)

### Tables

**players**
- `id` UUID PK
- `gamertag` TEXT UNIQUE — public display name
- `real_name` TEXT — revealed on click
- `created_at` TIMESTAMPTZ

**games**
- `id` UUID PK
- `name` TEXT
- `type` TEXT — 'solo' or 'team'
- `placement_points` JSONB — for solo games: `{"1": 10, "2": 7, "3": 5, "4": 3, "5": 1}`
- `win_points` INTEGER — for team games: points per player on winning team
- `lose_points` INTEGER — for team games: consolation points per player on losing team
- `created_at` TIMESTAMPTZ

**rounds**
- `id` UUID PK
- `name` TEXT — e.g. "Round 1"
- `sort_order` INTEGER — display ordering
- `created_at` TIMESTAMPTZ

**matches**
- `id` UUID PK
- `round_id` UUID FK → rounds (CASCADE)
- `game_id` UUID FK → games (CASCADE)
- `status` TEXT — 'pending' or 'completed'
- `created_at` TIMESTAMPTZ

**match_teams**
- `id` UUID PK
- `match_id` UUID FK → matches (CASCADE)
- `team_label` TEXT — 'Alpha', 'Bravo', 'Charlie', etc. (NATO alphabet)
- `is_winner` BOOLEAN

**match_team_players**
- `id` UUID PK
- `match_team_id` UUID FK → match_teams (CASCADE)
- `player_id` UUID FK → players (CASCADE)

**match_solo_results**
- `id` UUID PK
- `match_id` UUID FK → matches (CASCADE)
- `player_id` UUID FK → players (CASCADE)
- `placement` INTEGER — 1st, 2nd, 3rd, etc.
- `points_awarded` INTEGER

**match_team_results**
- `id` UUID PK
- `match_team_id` UUID FK → match_teams (CASCADE)
- `player_id` UUID FK → players (CASCADE)
- `points_awarded` INTEGER

### Views

**player_standings** — Overall leaderboard
- Joins players with SUM of solo results + SUM of team results
- Returns: id, gamertag, real_name, total_points, solo_points, team_points
- Ordered by total_points DESC

**game_player_standings** — Per-game leaderboard
- Returns: game_id, game_name, game_type, player_id, gamertag, real_name, game_points
- Only includes players with > 0 points in that game
- Ordered by game_points DESC

### Row Level Security (RLS)

All tables have RLS enabled:
- **Public read** on all tables (anyone can SELECT)
- **Authenticated write** on all tables (only logged-in users can INSERT/UPDATE/DELETE)

---

## Points System

### Solo Games
- Admin configures a placement points scale per game (e.g. 1st = 10, 2nd = 7, 3rd = 5, 4th = 3, 5th = 1)
- After a solo match, admin assigns placements to players
- Points are auto-calculated from the game's scale and recorded in `match_solo_results`

### Team Games
- Admin configures win_points and lose_points per game (e.g. win = 5, lose = 2)
- These are per-player amounts (every player on the winning team gets the win points)
- Admin can override the point values per match at submission time
- Points are recorded individually in `match_team_results` per player

### Team Formation
- Teams are temporary — formed per match, not persistent
- Team labels (Alpha, Bravo, etc.) are reused each match with potentially different players
- Admin manually assigns players to teams via the chip selector UI

### Overall Standings
- Total points = sum of all solo points + sum of all team points across all games
- The player_standings view handles this calculation

---

## Scheduling / Rounds

- Admin creates rounds manually (Round 1, Round 2, etc.) with a sort order
- Matches are created within rounds and assigned a game
- Multiple matches can exist in a single round (including simultaneous IRL games)
- Admin handles one match at a time in the admin panel
- The schedule page displays rounds in order with all their matches

---

## File Structure

```
/
├── index.html          # Public home — standings + recent results
├── games.html          # Public — per-game leaderboards
├── schedule.html       # Public — round-by-round match schedule
├── admin.html          # Auth-protected admin panel
├── style.css           # Shared cyberpunk theme
├── app.js              # Shared Supabase client, auth helpers, data fetchers, render utils
└── supabase-schema.sql # Database schema (run in Supabase SQL editor)
```

---

## Setup Checklist

1. Create Supabase project
2. Run `supabase-schema.sql` in the SQL editor
3. Create an admin user in Supabase Auth (Authentication → Users → Add user)
4. Update `SUPABASE_URL` and `SUPABASE_ANON_KEY` in `app.js`
5. Push all files to GitHub Pages repo

---

## Key Behaviours & UX Details

- **Gamertag reveal:** Clicking a gamertag toggles showing the player's real name in a floating tooltip (purple neon styled)
- **Toast notifications:** Success (green) and error (magenta) toasts appear bottom-right
- **Admin tabs:** Players, Games, Rounds, Solo Match, Team Match
- **Team chip selector:** Cycles through unassigned → Alpha (cyan glow) → Bravo (magenta glow) → unassigned on each click
- **Game type toggle:** Adding a game switches between solo fields (placement points) and team fields (win/lose points)
- **Navigation:** All four pages share the same header with nav links; active page is highlighted cyan
- **No sound effects, no CRT filters** — clean, modern cyberpunk

---

## Future Considerations / Not Yet Built

- Point override / manual adjustment tool
- Season / event archiving if the site is reused
- Player profile pages with detailed stat breakdowns
- More leaderboard views (we discussed adding more later)
- Editing existing matches (currently submit-only, delete via Supabase dashboard)
- Multiple simultaneous games management in admin (currently one at a time)
