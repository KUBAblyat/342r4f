// ============================================================
//  GEODUELER — DATABASE (Supabase)
// ============================================================

let supabaseClient = null;

function initSupabase() {
  if (!CONFIG.SUPABASE_URL || CONFIG.SUPABASE_URL === "YOUR_SUPABASE_URL") {
    console.warn("Supabase not configured — running in solo mode only.");
    return null;
  }
  supabaseClient = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
  return supabaseClient;
}

function getDB() {
  return supabaseClient;
}

// ── ROOMS ─────────────────────────────────────────────────

async function createRoom(hostId, hostName, settings = {}) {
  const db = getDB();
  if (!db) return null;

  const code = generateRoomCode();
  const { data, error } = await db
    .from("rooms")
    .insert({
      code,
      host_id: hostId,
      status: "waiting",
      current_round: 0,
      max_rounds: settings.rounds || CONFIG.DEFAULT_ROUNDS,
      time_limit: settings.timeLimit || CONFIG.DEFAULT_TIME_LIMIT,
    })
    .select()
    .single();

  if (error) { console.error("createRoom:", error); return null; }

  // Add host as first player
  await joinRoomAsPlayer(data.id, hostId, hostName, true);
  return data;
}

async function getRoomByCode(code) {
  const db = getDB();
  if (!db) return null;
  const { data, error } = await db
    .from("rooms")
    .select("*")
    .eq("code", code.toUpperCase())
    .single();
  if (error) return null;
  return data;
}

async function updateRoomStatus(roomId, status, currentRound = null) {
  const db = getDB();
  if (!db) return;
  const update = { status };
  if (currentRound !== null) update.current_round = currentRound;
  await db.from("rooms").update(update).eq("id", roomId);
}

// ── PLAYERS ───────────────────────────────────────────────

async function joinRoomAsPlayer(roomId, playerId, name, isHost = false) {
  const db = getDB();
  if (!db) return null;

  // Upsert player (in case rejoining)
  const { data, error } = await db
    .from("players")
    .upsert({ id: playerId, room_id: roomId, name, score: 0, is_host: isHost })
    .select()
    .single();

  if (error) { console.error("joinRoom:", error); return null; }
  return data;
}

async function getPlayersInRoom(roomId) {
  const db = getDB();
  if (!db) return [];
  const { data } = await db
    .from("players")
    .select("*")
    .eq("room_id", roomId)
    .order("score", { ascending: false });
  return data || [];
}

async function updatePlayerScore(playerId, additionalScore) {
  const db = getDB();
  if (!db) return;
  const { data: player } = await db
    .from("players").select("score").eq("id", playerId).single();
  if (player) {
    await db.from("players")
      .update({ score: player.score + additionalScore })
      .eq("id", playerId);
  }
}

async function removePlayer(playerId) {
  const db = getDB();
  if (!db) return;
  await db.from("players").delete().eq("id", playerId);
}

// ── ROUNDS ────────────────────────────────────────────────

async function createRound(roomId, roundNumber, lat, lng) {
  const db = getDB();
  if (!db) return null;
  const { data, error } = await db
    .from("rounds")
    .insert({ room_id: roomId, round_number: roundNumber, lat, lng })
    .select()
    .single();
  if (error) { console.error("createRound:", error); return null; }
  return data;
}

async function getCurrentRound(roomId, roundNumber) {
  const db = getDB();
  if (!db) return null;
  const { data } = await db
    .from("rounds")
    .select("*")
    .eq("room_id", roomId)
    .eq("round_number", roundNumber)
    .single();
  return data;
}

// ── GUESSES ───────────────────────────────────────────────

async function submitGuess(roundId, playerId, guessLat, guessLng, distance, score) {
  const db = getDB();
  if (!db) return null;
  const { data, error } = await db
    .from("guesses")
    .upsert({ round_id: roundId, player_id: playerId, guess_lat: guessLat, guess_lng: guessLng, distance, score })
    .select()
    .single();
  if (error) { console.error("submitGuess:", error); return null; }
  return data;
}

async function getGuessesForRound(roundId) {
  const db = getDB();
  if (!db) return [];
  const { data } = await db
    .from("guesses")
    .select("*, players(name)")
    .eq("round_id", roundId);
  return data || [];
}

async function getGuessCount(roundId) {
  const db = getDB();
  if (!db) return 0;
  const { count } = await db
    .from("guesses")
    .select("*", { count: "exact", head: true })
    .eq("round_id", roundId);
  return count || 0;
}

// ── LEADERBOARD ───────────────────────────────────────────

async function addToLeaderboard(playerName, score, rounds) {
  const db = getDB();
  if (!db) return;
  await db.from("leaderboard").insert({ player_name: playerName, score, rounds });
}

async function getLeaderboard(limit = 20) {
  const db = getDB();
  if (!db) return [];
  const { data } = await db
    .from("leaderboard")
    .select("*")
    .order("score", { ascending: false })
    .limit(limit);
  return data || [];
}

// ── REALTIME ──────────────────────────────────────────────

function subscribeToRoom(roomId, callbacks) {
  const db = getDB();
  if (!db) return null;

  const channel = db.channel(`room:${roomId}`)
    .on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "rooms",
      filter: `id=eq.${roomId}`,
    }, (payload) => callbacks.onRoomChange?.(payload.new))
    .on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "players",
      filter: `room_id=eq.${roomId}`,
    }, (payload) => callbacks.onPlayerChange?.(payload))
    .on("postgres_changes", {
      event: "INSERT",
      schema: "public",
      table: "guesses",
    }, (payload) => callbacks.onNewGuess?.(payload.new))
    .on("broadcast", { event: "game_event" },
      (payload) => callbacks.onGameEvent?.(payload.payload))
    .subscribe();

  return channel;
}

function broadcastGameEvent(channel, event, data) {
  if (!channel) return;
  channel.send({ type: "broadcast", event: "game_event", payload: { event, data } });
}

function unsubscribe(channel) {
  if (channel) channel.unsubscribe();
}

// ── UTILS ─────────────────────────────────────────────────

function generateRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function generatePlayerId() {
  return "p_" + Math.random().toString(36).substr(2, 12) + Date.now().toString(36);
}
