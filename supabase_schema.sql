-- ============================================================
--  GEODUELER — SUPABASE DATABASE SCHEMA
--  Run this in Supabase → SQL Editor → New query
-- ============================================================

-- Enable RLS (Row Level Security) — we'll use permissive policies for simplicity
-- In production you'd lock these down more.

-- ── ROOMS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rooms (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        TEXT UNIQUE NOT NULL,
  host_id     TEXT NOT NULL,
  status      TEXT DEFAULT 'waiting',   -- waiting | playing | finished
  current_round INT DEFAULT 0,
  max_rounds  INT DEFAULT 5,
  time_limit  INT DEFAULT 90,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── PLAYERS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS players (
  id          TEXT PRIMARY KEY,
  room_id     UUID REFERENCES rooms(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  score       INT DEFAULT 0,
  is_host     BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── ROUNDS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rounds (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id      UUID REFERENCES rooms(id) ON DELETE CASCADE,
  round_number INT NOT NULL,
  lat          DOUBLE PRECISION NOT NULL,
  lng          DOUBLE PRECISION NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── GUESSES ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS guesses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id    UUID REFERENCES rounds(id) ON DELETE CASCADE,
  player_id   TEXT REFERENCES players(id) ON DELETE CASCADE,
  guess_lat   DOUBLE PRECISION NOT NULL,
  guess_lng   DOUBLE PRECISION NOT NULL,
  distance    DOUBLE PRECISION,
  score       INT DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(round_id, player_id)
);

-- ── LEADERBOARD ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leaderboard (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_name TEXT NOT NULL,
  score       INT NOT NULL,
  rounds      INT DEFAULT 5,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── ROW LEVEL SECURITY ─────────────────────────────────────
-- Enable RLS on all tables
ALTER TABLE rooms       ENABLE ROW LEVEL SECURITY;
ALTER TABLE players     ENABLE ROW LEVEL SECURITY;
ALTER TABLE rounds      ENABLE ROW LEVEL SECURITY;
ALTER TABLE guesses     ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;

-- Allow all operations from the anon key (public game)
-- Adjust for production use!
CREATE POLICY "allow_all_rooms"       ON rooms       FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_players"     ON players     FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_rounds"      ON rounds      FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_guesses"     ON guesses     FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_leaderboard" ON leaderboard FOR ALL USING (true) WITH CHECK (true);

-- ── REALTIME ───────────────────────────────────────────────
-- Enable Realtime on tables that need live updates
-- In Supabase Dashboard: Database → Replication → enable for: rooms, players, guesses

-- ── CLEANUP JOB (OPTIONAL) ─────────────────────────────────
-- Automatically delete old finished rooms after 24h
-- (Requires pg_cron extension — enable in Extensions)
-- SELECT cron.schedule('cleanup-old-rooms', '0 * * * *', $$
--   DELETE FROM rooms WHERE status = 'finished' AND created_at < NOW() - INTERVAL '24 hours';
-- $$);
