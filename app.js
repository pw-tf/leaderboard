// ============================================
// CYBERPUNK LEADERBOARD - CONFIG & UTILITIES
// ============================================

const SUPABASE_URL = 'https://jhlzgmpvqxeeikvnqluo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpobHpnbXB2cXhlZWlrdm5xbHVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMDAwNDIsImV4cCI6MjA4OTc3NjA0Mn0.72BkbrcBQAphO3I4IEtpGBinVgGRXPtVzVUuJWJErYk';

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================
// HTML ESCAPING (XSS prevention)
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

// ============================================
// TEAM LABELS
// ============================================
const TEAM_LABELS = ['Alpha', 'Bravo'];

// ============================================
// TOAST NOTIFICATIONS
// ============================================
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
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// ============================================
// AUTH HELPERS
// ============================================
async function getSession() {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
}

async function isAdmin() {
    const session = await getSession();
    return !!session;
}

async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
}

async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
}

// ============================================
// DATA FETCHERS
// ============================================
async function fetchPlayers() {
    const { data, error } = await supabase
        .from('players')
        .select('*')
        .order('gamertag');
    if (error) throw error;
    return data;
}

async function fetchGames() {
    const { data, error } = await supabase
        .from('games')
        .select('*')
        .order('name');
    if (error) throw error;
    return data;
}

async function fetchRounds() {
    const { data, error } = await supabase
        .from('rounds')
        .select('*')
        .order('sort_order');
    if (error) throw error;
    return data;
}

async function fetchMatches() {
    const { data, error } = await supabase
        .from('matches')
        .select(`
            *,
            game:games(*),
            round:rounds(*),
            match_teams(
                *,
                match_team_players(
                    *,
                    player:players(*)
                ),
                match_team_results(
                    *,
                    player:players(*)
                )
            ),
            match_solo_results(
                *,
                player:players(*)
            )
        `)
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
}

async function fetchPlayerStandings() {
    const { data, error } = await supabase
        .from('player_standings')
        .select('*')
        .order('total_points', { ascending: false });
    if (error) throw error;
    return data;
}

async function fetchGamePlayerStandings() {
    const { data, error } = await supabase
        .from('game_player_standings')
        .select('*');
    if (error) throw error;
    return data;
}

// ============================================
// RENDERING HELPERS
// ============================================
function renderRank(index) {
    const num = index + 1;
    let cls = '';
    if (num === 1) cls = 'rank-1';
    else if (num === 2) cls = 'rank-2';
    else if (num === 3) cls = 'rank-3';
    return `<span class="rank ${cls}">#${num}</span>`;
}

function renderGamertag(gamertag, realName) {
    return `<span class="gamertag" onclick="this.classList.toggle('show-name')">${escapeHtml(gamertag)}<span class="real-name">${escapeHtml(realName)}</span></span>`;
}

function renderPoints(pts) {
    return `<span class="points">${pts}</span>`;
}

function renderMatchStatus(status) {
    return `<span class="match-status ${status}">${status}</span>`;
}

// Set active nav link
function setActiveNav() {
    const page = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-link').forEach(link => {
        if (link.getAttribute('href') === page) {
            link.classList.add('active');
        }
    });
}

document.addEventListener('DOMContentLoaded', setActiveNav);
