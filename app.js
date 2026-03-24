// ============================================
// CYBERPUNK LEADERBOARD - APP.JS
// ============================================

const SUPABASE_URL = 'https://jhlzgmpvqxeeikvnqluo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpobHpnbXB2cXhlZWlrdm5xbHVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMDAwNDIsImV4cCI6MjA4OTc3NjA0Mn0.72BkbrcBQAphO3I4IEtpGBinVgGRXPtVzVUuJWJErYk';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================
// UTILITIES
// ============================================

function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function showToast(message, type = 'success') {
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.className = 'toast';
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.className = `toast ${type}`;
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => toast.classList.remove('show'), 3500);
}

function setActiveNav() {
    const page = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-link').forEach(link => {
        const href = link.getAttribute('href');
        if (href === page || (page === '' && href === 'index.html')) {
            link.classList.add('active');
        }
    });
}

function renderRank(index) {
    const num = index + 1;
    let cls = '';
    if (num === 1) cls = 'rank-1';
    else if (num === 2) cls = 'rank-2';
    else if (num === 3) cls = 'rank-3';
    return `<span class="rank ${cls}">#${num}</span>`;
}

function renderGamertag(gamertag, realName) {
    return `<span class="gamertag" onclick="this.classList.toggle('show-name')">${escapeHtml(gamertag)}<span class="real-name">${escapeHtml(realName || '')}</span></span>`;
}

function renderPoints(pts) {
    const val = pts == null ? '0.00' : parseFloat(pts).toFixed(2);
    return `<span class="points">${val}</span>`;
}

// ============================================
// AUTH
// ============================================

async function getSession() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    return session;
}

async function isAdmin() {
    const session = await getSession();
    return !!session;
}

async function signIn(email, password) {
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
}

async function signOut() {
    const { error } = await supabaseClient.auth.signOut();
    if (error) throw error;
}

// ============================================
// DATA FETCHERS
// ============================================

async function fetchPlayers() {
    const { data, error } = await supabaseClient
        .from('players')
        .select('*')
        .order('gamertag');
    if (error) throw error;
    return data;
}

async function fetchPlayerStandings() {
    const { data, error } = await supabaseClient
        .from('player_standings')
        .select('*')
        .order('total_points', { ascending: false });
    if (error) throw error;
    return data;
}

async function fetchRounds() {
    const { data, error } = await supabaseClient
        .from('rounds')
        .select('*')
        .order('sort_order');
    if (error) throw error;
    return data;
}

async function fetchRound(id) {
    const { data, error } = await supabaseClient
        .from('rounds')
        .select('*')
        .eq('id', id)
        .single();
    if (error) throw error;
    return data;
}

async function fetchRoundPlayers(roundId) {
    const { data, error } = await supabaseClient
        .from('round_players')
        .select('*, player:players(*)')
        .eq('round_id', roundId);
    if (error) throw error;
    return data;
}

async function fetchRoundTeams(roundId) {
    const { data, error } = await supabaseClient
        .from('round_teams')
        .select('*, team:teams(*, team_players(*, player:players(*)))')
        .eq('round_id', roundId);
    if (error) throw error;
    return data;
}

async function fetchBracketMatches(roundId) {
    const { data, error } = await supabaseClient
        .from('bracket_matches')
        .select('*')
        .eq('round_id', roundId)
        .order('bracket_round', { ascending: true })
        .order('bracket_position', { ascending: true });
    if (error) throw error;
    return data;
}

async function fetchFfaResults(roundId) {
    const { data, error } = await supabaseClient
        .from('ffa_results')
        .select('*, player:players(*)')
        .eq('round_id', roundId)
        .order('placement', { ascending: true });
    if (error) throw error;
    return data;
}

async function fetchTeams() {
    const { data, error } = await supabaseClient
        .from('teams')
        .select('*, team_players(*, player:players(*))');
    if (error) throw error;
    return data;
}

async function fetchPlayerPoints(roundId) {
    const { data, error } = await supabaseClient
        .from('player_points')
        .select('*')
        .eq('round_id', roundId);
    if (error) throw error;
    return data;
}

async function fetchPeakResults(roundId) {
    const { data, error } = await supabaseClient
        .from('peak_results')
        .select('*, player:players(*), team:teams(*, team_players(*, player:players(*)))')
        .eq('round_id', roundId)
        .order('ladder_position', { ascending: true, nullsFirst: false });
    if (error) throw error;
    return data;
}

async function fetchMatchPlayerStats(matchId) {
    const { data, error } = await supabaseClient
        .from('match_player_stats')
        .select('*, player:players(*)')
        .eq('match_id', matchId);
    if (error) throw error;
    return data;
}

async function fetchPlayerPointsDetail(playerId) {
    const { data, error } = await supabaseClient
        .from('player_points_detail')
        .select('*')
        .eq('player_id', playerId);
    if (error) throw error;
    return data;
}

// ============================================
// SCORING CALCULATIONS
// ============================================

/**
 * Get win multiplier for a bracket match.
 * bracket_round: the match's round number (1-indexed).
 * maxRound: highest bracket_round in the tournament.
 */
function getWinMultiplier(bracketRound, maxRound) {
    if (bracketRound === maxRound) return 1.75;    // Final
    if (bracketRound === maxRound - 1) return 1.50; // Semis
    return 1.25;                                    // Prelim
}

/**
 * Calculate Halo CFS and points for a participant.
 * score: in-game score, kills, deaths, assists: integers.
 * winMultiplier: 1.0 if not used, or tier multiplier.
 * Returns { kda, cfs, points }.
 */
function calculateHaloPoints(score, kills, deaths, assists, winMultiplier) {
    const kda = (kills + assists) / Math.max(deaths, 1);
    const cfs = score * kda * winMultiplier;
    const points = cfs / 100;
    return { kda, cfs, points };
}

/**
 * Calculate Peak result for a single participant.
 * Returns { completed, base, speedMultiplier, cfs, points }
 */
function calculatePeakResult(completed, timeTakenSeconds, distanceAchieved, courseDistance, timeAllowedSeconds, speedMultipliersEnabled) {
    if (completed) {
        const timeBonus = timeAllowedSeconds - timeTakenSeconds;
        const base = courseDistance + timeBonus;
        let multiplier = 1.0;
        if (speedMultipliersEnabled) {
            if (timeTakenSeconds < 3600) multiplier = 1.50;
            else if (timeTakenSeconds <= 7200) multiplier = 1.25;
        }
        const cfs = Math.round(base * multiplier * 100) / 100;
        const points = Math.round(cfs / 100 * 100) / 100;
        return { completed: true, base, speedMultiplier: multiplier, cfs, points };
    } else {
        const cfs = Math.round((distanceAchieved || 0) * 100) / 100;
        const points = Math.round(cfs / 100 * 100) / 100;
        return { completed: false, base: distanceAchieved || 0, speedMultiplier: 1.0, cfs, points };
    }
}

/**
 * Rank peak results array in-place. Finishers above DNF, then by CFS desc.
 * Adds ladder_position (1-indexed) to each entry.
 */
function rankPeakResults(results) {
    const finishers = results.filter(r => r.completed).sort((a, b) => b.cfs - a.cfs);
    const dnf = results.filter(r => !r.completed).sort((a, b) => b.cfs - a.cfs);
    const ranked = [...finishers, ...dnf];
    ranked.forEach((r, i) => { r.ladder_position = i + 1; });
    return ranked;
}

/**
 * Calculate Simple Score points from placement ladder.
 * placement: integer (1-indexed).
 * ladder: object like {"1": 10, "2": 7, "3": 5}.
 * Returns points (number).
 */
function calculateSimpleScore(placement, ladder) {
    return parseFloat((ladder || {})[String(placement)] || 0);
}

// ============================================
// BRACKET ALGORITHMS
// ============================================

function nextPowerOf2(n) {
    if (n <= 1) return 1;
    let p = 1;
    while (p < n) p *= 2;
    return p;
}

/**
 * Generate bracket seeds for a given size using standard seeding.
 * Example: size=8 returns [1,8,5,4,3,6,7,2]
 * Algorithm: start with [1, 2], then expand each seed s to [s, total+1-s]
 * where total = current length * 2, repeating until we reach size.
 */
function generateBracketSeeds(size) {
    let seeds = [1, 2];
    while (seeds.length < size) {
        const total = seeds.length * 2;
        const next = [];
        for (const s of seeds) {
            next.push(s, total + 1 - s);
        }
        seeds = next;
    }
    return seeds;
}

/**
 * Generate all bracket match objects for a round.
 * participants: array of {id, type} (type='player'|'team'), sorted by points desc.
 * Returns array of match objects ready for DB insert.
 */
function generateBracketMatches(participants, type, roundId) {
    const participantType = type === 'team_bracket' ? 'team' : 'player';
    const size = nextPowerOf2(participants.length);
    const seeds = generateBracketSeeds(size);
    const numRounds = Math.log2(size);
    const matches = [];

    // Build round 1 matches
    // seeds is an array of length=size; pair them up: [seeds[0],seeds[1]], [seeds[2],seeds[3]], ...
    const round1MatchCount = size / 2;
    for (let pos = 0; pos < round1MatchCount; pos++) {
        const seed1 = seeds[pos * 2];
        const seed2 = seeds[pos * 2 + 1];
        const p1 = participants[seed1 - 1] || null;
        const p2 = participants[seed2 - 1] || null;

        let status = 'pending';
        let winnerId = null;

        if (!p1 && !p2) {
            // Both null — double bye, winner is null, skip or mark bye
            status = 'bye';
        } else if (!p2) {
            // p1 gets a bye
            status = 'bye';
            winnerId = p1.id;
        } else if (!p1) {
            // p2 gets a bye
            status = 'bye';
            winnerId = p2.id;
        }

        matches.push({
            round_id: roundId,
            bracket_round: 1,
            bracket_position: pos,
            participant_1_type: p1 ? participantType : null,
            participant_1_id: p1 ? p1.id : null,
            participant_2_type: p2 ? participantType : null,
            participant_2_id: p2 ? p2.id : null,
            winner_id: winnerId,
            score_1: null,
            score_2: null,
            status: status
        });
    }

    // Build subsequent rounds (empty placeholders)
    for (let r = 2; r <= numRounds; r++) {
        const matchCount = size / Math.pow(2, r);
        for (let pos = 0; pos < matchCount; pos++) {
            matches.push({
                round_id: roundId,
                bracket_round: r,
                bracket_position: pos,
                participant_1_type: null,
                participant_1_id: null,
                participant_2_type: null,
                participant_2_id: null,
                winner_id: null,
                score_1: null,
                score_2: null,
                status: 'pending'
            });
        }
    }

    return matches;
}

/**
 * Fisher-Yates shuffle in-place.
 */
function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

/**
 * Generate teams from players using a randomised snake draft.
 * Players are split into tiers of numTeams, each tier is shuffled before
 * assignment — this guarantees the top N players are spread across different
 * teams (the "no stacking" rule) while randomising which team each player
 * lands on and who they're paired with.
 * players: array with total_points property.
 * teamSize: desired team size.
 * Returns array of {label, players[]}.
 */
function generateTeamsFromPlayers(players, teamSize) {
    const NATO_LABELS = ['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot', 'Golf', 'Hotel', 'India', 'Juliet'];
    const sorted = [...players].sort((a, b) => (b.total_points || 0) - (a.total_points || 0));
    const numTeams = Math.ceil(sorted.length / teamSize);
    const teams = [];
    for (let i = 0; i < numTeams; i++) {
        teams.push({ label: NATO_LABELS[i] || `Team ${i + 1}`, players: [] });
    }

    // Split into tiers of numTeams, shuffle within each tier, then snake draft.
    // Shuffling within tiers keeps one player from each points-tier on each team
    // (the anti-stacking rule) while randomising team composition each time.
    const tiers = [];
    for (let i = 0; i < sorted.length; i += numTeams) {
        tiers.push(shuffleArray(sorted.slice(i, i + numTeams)));
    }

    let direction = 1;
    let teamIndex = 0;
    for (const tier of tiers) {
        for (const player of tier) {
            teams[teamIndex].players.push(player);
            if (direction === 1) {
                if (teamIndex === numTeams - 1) direction = -1;
                else teamIndex++;
            } else {
                if (teamIndex === 0) direction = 1;
                else teamIndex--;
            }
        }
    }

    return teams;
}

// ============================================
// BRACKET RENDERING
// ============================================

/**
 * Render a bracket visualization into container.
 * matches: array from DB (bracket_matches).
 * players: array of player objects.
 * teams: array of team objects.
 * isAdmin: bool — if true and match is clickable, calls onMatchClick(match).
 * onMatchClick: callback(match).
 */
function renderBracket(container, matches, players, teams, isAdmin, onMatchClick) {
    container.innerHTML = '';

    if (!matches || matches.length === 0) {
        container.innerHTML = '<div class="empty-state">Bracket not generated yet.</div>';
        return;
    }

    // Helper: get display name for participant
    function getParticipantName(type, id) {
        if (!id) return null;
        if (type === 'player') {
            const p = players.find(pl => pl.id === id);
            return p ? p.gamertag : '?';
        } else if (type === 'team') {
            const t = teams.find(tm => tm.id === id);
            return t ? t.team_label : '?';
        }
        return '?';
    }

    // Group matches by bracket_round
    const rounds = {};
    let maxRound = 0;
    matches.forEach(m => {
        if (!rounds[m.bracket_round]) rounds[m.bracket_round] = [];
        rounds[m.bracket_round].push(m);
        if (m.bracket_round > maxRound) maxRound = m.bracket_round;
    });

    // Sort matches within each round by position
    Object.values(rounds).forEach(arr => arr.sort((a, b) => a.bracket_position - b.bracket_position));

    // Round labels
    function getRoundLabel(roundNum, totalRounds) {
        if (roundNum === totalRounds) return 'Final';
        if (roundNum === totalRounds - 1) return 'Semifinals';
        if (roundNum === totalRounds - 2 && totalRounds > 3) return 'Quarterfinals';
        return `Round ${roundNum}`;
    }

    // Outer scroll wrapper
    const scrollWrapper = document.createElement('div');
    scrollWrapper.style.cssText = 'overflow-x: auto; overflow-y: visible; padding-bottom: 16px;';

    // Inner container (relative, flex)
    const inner = document.createElement('div');
    inner.style.cssText = 'position: relative; display: flex; gap: 40px; align-items: flex-start; padding: 16px; min-width: max-content;';

    // Map: roundNum -> array of match card DOM elements (in position order)
    const matchCards = {};

    for (let r = 1; r <= maxRound; r++) {
        const roundMatches = rounds[r] || [];
        matchCards[r] = [];

        const col = document.createElement('div');
        col.className = 'bracket-round-col';
        col.style.cssText = 'display: flex; flex-direction: column; gap: 0; min-width: 180px;';

        const label = document.createElement('div');
        label.style.cssText = 'font-family: var(--font-display); font-size: 0.6rem; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: var(--text-dim); margin-bottom: 12px; text-align: center;';
        label.textContent = getRoundLabel(r, maxRound);
        col.appendChild(label);

        // We need vertical spacing between matches to match up with the previous round
        // Each match in round R corresponds to 2 matches in round R-1.
        // We achieve alignment with flex + gap by using a wrapper with justify-content: space-around.
        const matchesWrapper = document.createElement('div');
        matchesWrapper.style.cssText = 'display: flex; flex-direction: column; gap: 0; flex: 1;';

        roundMatches.forEach((match, idx) => {
            const isBye = match.status === 'bye';
            const hasP1 = !!match.participant_1_id;
            const hasP2 = !!match.participant_2_id;
            const isComplete = match.status === 'completed';
            const isClickable = isAdmin && match.status === 'pending' && hasP1 && hasP2;

            const p1Name = hasP1 ? getParticipantName(match.participant_1_type, match.participant_1_id) : null;
            const p2Name = hasP2 ? getParticipantName(match.participant_2_type, match.participant_2_id) : null;

            const p1IsWinner = isComplete && match.winner_id === match.participant_1_id;
            const p2IsWinner = isComplete && match.winner_id === match.participant_2_id;

            // Wrapper for vertical centering in slot
            const slotDiv = document.createElement('div');
            slotDiv.dataset.round = r;
            slotDiv.dataset.pos = idx;
            slotDiv.style.cssText = 'display: flex; align-items: center; justify-content: center; flex: 1;';

            const card = document.createElement('div');
            card.className = 'bracket-match';
            card.dataset.round = r;
            card.dataset.pos = idx;
            card.dataset.matchId = match.id;
            card.style.cssText = `
                background: var(--bg-card);
                border: 1px solid var(--border-dim);
                border-radius: 6px;
                overflow: hidden;
                width: 100%;
                transition: border-color 0.2s, box-shadow 0.2s;
                margin: 8px 0;
            `;

            if (isClickable) {
                card.classList.add('clickable');
                card.style.cursor = 'pointer';
                card.style.borderColor = 'var(--neon-cyan)';
                card.addEventListener('mouseenter', () => {
                    card.style.boxShadow = 'var(--glow-cyan)';
                });
                card.addEventListener('mouseleave', () => {
                    card.style.boxShadow = '';
                });
                card.addEventListener('click', () => onMatchClick && onMatchClick(match));
            }

            if (isBye && !match.participant_1_id && !match.participant_2_id) {
                // Empty bye slot
                card.innerHTML = `<div style="padding:8px 12px; text-align:center; color:var(--text-dim); font-family:var(--font-mono); font-size:0.75rem;">BYE</div>`;
            } else {
                function participantRow(name, score, isWinner, isTbd) {
                    const cls = isWinner ? 'winner' : (isTbd ? 'tbd' : '');
                    const nameStr = isTbd ? 'TBD' : escapeHtml(name || 'TBD');
                    const winnerMark = isWinner ? ' ★' : '';
                    const scoreStr = score ? `<span style="font-family:var(--font-mono);font-size:0.7rem;color:var(--neon-yellow);margin-left:4px;">${escapeHtml(score)}</span>` : '';
                    const textColor = isWinner ? 'var(--neon-green)' : (isTbd ? 'var(--text-dim)' : 'var(--text-primary)');
                    const bgColor = isWinner ? 'rgba(57,255,20,0.05)' : 'transparent';
                    return `<div class="bracket-participant ${cls}" style="padding:6px 10px; display:flex; justify-content:space-between; align-items:center; background:${bgColor}; border-bottom:1px solid var(--border-dim);">
                        <span style="font-family:var(--font-mono);font-size:0.8rem;color:${textColor};">${nameStr}${winnerMark}</span>
                        ${scoreStr}
                    </div>`;
                }

                let html = '';
                if (isBye) {
                    const byeName = match.winner_id === match.participant_1_id ? p1Name : p2Name;
                    html += participantRow(byeName, null, true, false);
                    html += `<div style="padding:4px 10px; text-align:center; color:var(--text-dim); font-family:var(--font-mono); font-size:0.65rem; background:var(--bg-panel);">BYE</div>`;
                } else {
                    html += participantRow(p1Name, match.score_1, p1IsWinner, !hasP1);
                    html += participantRow(p2Name, match.score_2, p2IsWinner, !hasP2);
                }

                card.innerHTML = html;
            }

            slotDiv.appendChild(card);
            matchesWrapper.appendChild(slotDiv);
            matchCards[r].push({ element: slotDiv, match });
        });

        col.appendChild(matchesWrapper);
        inner.appendChild(col);
    }

    scrollWrapper.appendChild(inner);
    container.appendChild(scrollWrapper);

    // Draw SVG connector lines after layout
    requestAnimationFrame(() => {
        drawBracketConnectors(inner, matchCards, maxRound);
    });
}

function drawBracketConnectors(inner, matchCards, maxRound) {
    const innerRect = inner.getBoundingClientRect();

    // Remove any existing SVG
    inner.querySelectorAll('.bracket-connector-svg').forEach(el => el.remove());

    // Create a full-size SVG overlay
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.classList.add('bracket-connector-svg');
    svg.style.cssText = `
        position: absolute;
        top: 0; left: 0;
        width: ${inner.scrollWidth}px;
        height: ${inner.scrollHeight}px;
        pointer-events: none;
        z-index: 0;
        overflow: visible;
    `;

    for (let r = 1; r < maxRound; r++) {
        const currentRoundCards = matchCards[r] || [];
        const nextRoundCards = matchCards[r + 1] || [];

        // Each match in round r+1 receives winners from 2 matches in round r
        nextRoundCards.forEach((nextItem, nextIdx) => {
            const srcIdx1 = nextIdx * 2;
            const srcIdx2 = nextIdx * 2 + 1;

            [srcIdx1, srcIdx2].forEach(srcIdx => {
                const srcItem = currentRoundCards[srcIdx];
                if (!srcItem) return;

                const srcEl = srcItem.element;
                const dstEl = nextItem.element;

                const srcRect = srcEl.getBoundingClientRect();
                const dstRect = dstEl.getBoundingClientRect();

                // Calculate positions relative to inner container
                const x1 = srcRect.right - innerRect.left + inner.scrollLeft;
                const y1 = srcRect.top - innerRect.top + inner.scrollTop + srcRect.height / 2;
                const x2 = dstRect.left - innerRect.left + inner.scrollLeft;
                const y2 = dstRect.top - innerRect.top + inner.scrollTop + dstRect.height / 2;

                const midX = (x1 + x2) / 2;

                const path = document.createElementNS(svgNS, 'path');
                path.setAttribute('d', `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`);
                path.setAttribute('stroke', 'rgba(0,240,255,0.25)');
                path.setAttribute('stroke-width', '1.5');
                path.setAttribute('fill', 'none');
                svg.appendChild(path);
            });
        });
    }

    inner.insertBefore(svg, inner.firstChild);
}

// ============================================
// INIT
// ============================================

document.addEventListener('DOMContentLoaded', setActiveNav);
