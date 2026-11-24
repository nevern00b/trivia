// Ho Ho Ho's In This House: live party trivia.
// One small Node server. Game state lives in memory; the host's browser keeps a backup.
const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const QRCode = require('qrcode');
const { Server } = require('socket.io');

const PORT = process.env.PORT || 3000;
const HOST_PIN = String(process.env.HOST_PIN || 'brooklyn');
const SECONDS = Number(process.env.QUESTION_SECONDS || 20);
const GRACE_MS = 1500; // late answers still count if they arrive within this window
const QUESTIONS_FILE = path.join(__dirname, 'questions.json');
const SAVED_FILE = path.join(__dirname, 'data', 'questions.saved.json');

// ---------- questions ----------
function cleanRounds(input) {
  if (!Array.isArray(input)) return null;
  return input.slice(0, 10).map((r, i) => ({
    title: String((r && r.title) || `Round ${i + 1}`).slice(0, 120),
    questions: (Array.isArray(r && r.questions) ? r.questions : [])
      .slice(0, 50)
      .map((q) => ({ q: String((q && q.q) || '').slice(0, 500), a: String((q && q.a) || '').slice(0, 300) }))
      .filter((q) => q.q.trim()),
  }));
}
function loadRounds() {
  for (const f of [SAVED_FILE, QUESTIONS_FILE]) {
    try {
      const data = JSON.parse(fs.readFileSync(f, 'utf8'));
      const rounds = cleanRounds(data.rounds);
      if (rounds && rounds.length) return { rounds, savedAt: Number(data.savedAt) || 0 };
    } catch (_) {}
  }
  return { rounds: [{ title: 'Round 1', questions: [] }], savedAt: 0 };
}

// ---------- answer checking ----------
function norm(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\b(the|a|an)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
function lev(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}
function autoMark(text, answer) {
  const t = norm(text);
  if (!t) return false;
  return String(answer || '').split('|').map(norm).filter(Boolean).some((a) => {
    if (a === t) return true;
    if (a.replace(/ /g, '') === t.replace(/ /g, '')) return true;
    const allowed = a.length >= 9 ? 2 : a.length >= 5 ? 1 : 0; // forgive small typos
    return lev(a, t) <= allowed;
  });
}

// ---------- game state ----------
const loaded = loadRounds();
let rounds = loaded.rounds;
let questionsSavedAt = loaded.savedAt;

function freshGame() {
  return {
    phase: 'lobby', // lobby | question | closed | reveal | leaderboard | final
    r: 0,
    q: -1,
    endsAt: 0,
    players: {}, // id -> { id, name, joinedAt }
    answers: {}, // "r-q" -> { playerId: { text, correct, at } }
    played: {}, // "r-q" -> true once released
    boardTitle: '',
  };
}
let game = freshGame();
let timer = null;

const key = (r, q) => `${r}-${q}`;
const currentQ = () => (rounds[game.r] && rounds[game.r].questions[game.q]) || null;
const online = new Map(); // playerId -> count of open sockets

function scores() {
  const s = {};
  for (const id of Object.keys(game.players)) s[id] = 0;
  for (const k of Object.keys(game.answers))
    for (const [pid, a] of Object.entries(game.answers[k])) if (a.correct && pid in s) s[pid] += 1;
  return s;
}
function leaderboard() {
  const s = scores();
  const rows = Object.values(game.players)
    .map((p) => ({ id: p.id, name: p.name, score: s[p.id] || 0 }))
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  let rank = 0, last = null;
  rows.forEach((row, i) => { if (row.score !== last) { rank = i + 1; last = row.score; } row.rank = rank; });
  return rows;
}
function msLeft() {
  return game.phase === 'question' ? Math.max(0, game.endsAt - Date.now()) : 0;
}

function publicState(playerId) {
  const qObj = currentQ();
  const showQ = ['question', 'closed', 'reveal'].includes(game.phase) && qObj;
  const k = key(game.r, game.q);
  const board = ['leaderboard', 'final'].includes(game.phase) ? leaderboard() : null;
  const st = {
    phase: game.phase,
    seconds: SECONDS,
    msLeft: msLeft(),
    roundIndex: game.r,
    roundCount: rounds.length,
    roundTitle: (rounds[game.r] && rounds[game.r].title) || '',
    questionNumber: game.q + 1,
    questionCount: (rounds[game.r] && rounds[game.r].questions.length) || 0,
    question: showQ ? qObj.q : null,
    answer: game.phase === 'reveal' && qObj ? qObj.a.split('|')[0] : null,
    answeredCount: showQ ? Object.keys(game.answers[k] || {}).length : 0,
    playerCount: Object.keys(game.players).length,
    leaderboard: board ? board.map(({ name, score, rank }) => ({ name, score, rank })) : null,
    boardTitle: game.boardTitle,
  };
  if (playerId && game.players[playerId]) {
    const mine = (game.answers[k] || {})[playerId];
    const lb = leaderboard();
    const me = lb.find((x) => x.id === playerId);
    st.me = { name: game.players[playerId].name, score: me ? me.score : 0, rank: me ? me.rank : null, of: lb.length };
    st.myAnswer = showQ && mine ? mine.text : null;
    st.myCorrect = game.phase === 'reveal' && mine ? !!mine.correct : null;
  }
  return st;
}

function hostState() {
  const lb = leaderboard();
  const k = key(game.r, game.q);
  const ans = game.answers[k] || {};
  return {
    ...publicState(null),
    rounds,
    questionsSavedAt,
    r: game.r,
    q: game.q,
    played: game.played,
    fullAnswer: currentQ() ? currentQ().a : '',
    players: lb.map((p) => ({ ...p, online: (online.get(p.id) || 0) > 0 })),
    currentAnswers: Object.values(game.players).map((p) => ({
      playerId: p.id,
      name: p.name,
      text: ans[p.id] ? ans[p.id].text : null,
      correct: ans[p.id] ? ans[p.id].correct : null,
      at: ans[p.id] ? ans[p.id].at : null,
    })),
    snapshot: { game, savedAt: Date.now() },
  };
}

// ---------- server ----------
const app = express();
app.use(express.static(path.join(__dirname, 'public')));
app.get('/host', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'host.html')));
app.get('/tv', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'tv.html')));
app.get('/ping', (_req, res) => res.send('ok'));
app.get('/qr.svg', async (req, res) => {
  const url = String(req.query.u || '').slice(0, 300);
  if (!/^https?:\/\//.test(url)) return res.status(400).send('bad url');
  const svg = await QRCode.toString(url, { type: 'svg', margin: 1, color: { dark: '#111111', light: '#ffffff' } });
  res.type('image/svg+xml').send(svg);
});

const server = http.createServer(app);
const io = new Server(server, { pingInterval: 10000, pingTimeout: 8000 });

let pending = null;
function broadcast() {
  // collapse bursts of changes into one push
  if (pending) return;
  pending = setImmediate(() => {
    pending = null;
    for (const s of io.sockets.sockets.values()) {
      if (s.data.role === 'host') s.emit('host:state', hostState());
      else if (s.data.role === 'player') s.emit('state', publicState(s.data.playerId));
      else if (s.data.role === 'tv') s.emit('state', publicState(null));
    }
  });
}

function closeQuestion() {
  clearTimeout(timer);
  timer = null;
  if (game.phase === 'question') {
    game.phase = 'closed';
    broadcast();
  }
}

io.on('connection', (socket) => {
  // ----- players -----
  socket.on('player:join', ({ token, name } = {}, ack) => {
    const reply = typeof ack === 'function' ? ack : () => {};
    let id = typeof token === 'string' && game.players[token] ? token : null;
    if (!id) {
      const clean = String(name || '').replace(/\s+/g, ' ').trim().slice(0, 24);
      if (!clean) return reply({ ok: false, error: 'Put your name in first.' });
      const taken = Object.values(game.players).some((p) => p.name.toLowerCase() === clean.toLowerCase());
      if (taken) return reply({ ok: false, error: `Somebody already took "${clean}". Add a last initial.` });
      id = typeof token === 'string' && /^[a-f0-9]{32}$/.test(token) ? token : crypto.randomBytes(16).toString('hex');
      game.players[id] = { id, name: clean, joinedAt: Date.now() };
    }
    socket.data.role = 'player';
    socket.data.playerId = id;
    online.set(id, (online.get(id) || 0) + 1);
    reply({ ok: true, token: id, name: game.players[id].name });
    broadcast();
  });

  socket.on('player:answer', ({ text } = {}, ack) => {
    const reply = typeof ack === 'function' ? ack : () => {};
    const pid = socket.data.playerId;
    if (!pid || !game.players[pid]) return reply({ ok: false, error: 'Rejoin first.' });
    const late = game.phase === 'closed' && Date.now() - game.endsAt < GRACE_MS;
    if (game.phase !== 'question' && !late) return reply({ ok: false, error: "Time's up!" });
    const clean = String(text || '').trim().slice(0, 200);
    if (!clean) return reply({ ok: false, error: 'Type something first.' });
    const k = key(game.r, game.q);
    game.answers[k] = game.answers[k] || {};
    game.answers[k][pid] = { text: clean, correct: autoMark(clean, currentQ() && currentQ().a), at: Date.now() };
    reply({ ok: true });
    broadcast();
  });

  // ----- tv -----
  socket.on('tv:join', () => {
    socket.data.role = 'tv';
    socket.emit('state', publicState(null));
  });

  // ----- host -----
  socket.on('host:auth', ({ pin } = {}, ack) => {
    const reply = typeof ack === 'function' ? ack : () => {};
    if (String(pin || '') !== HOST_PIN) return reply({ ok: false, error: 'Wrong PIN.' });
    socket.data.role = 'host';
    reply({ ok: true });
    socket.emit('host:state', hostState());
  });

  const hostOnly = (fn) => (payload, ack) => {
    if (socket.data.role !== 'host') return typeof ack === 'function' && ack({ ok: false, error: 'Not host.' });
    try {
      fn(payload || {});
      if (typeof ack === 'function') ack({ ok: true });
    } catch (e) {
      if (typeof ack === 'function') ack({ ok: false, error: e.message });
    }
    broadcast();
  };

  socket.on('host:release', hostOnly(({ r, q }) => {
    if (!rounds[r] || !rounds[r].questions[q]) throw new Error('No such question.');
    clearTimeout(timer);
    game.r = r;
    game.q = q;
    game.phase = 'question';
    game.endsAt = Date.now() + SECONDS * 1000;
    game.played[key(r, q)] = true;
    game.answers[key(r, q)] = game.answers[key(r, q)] || {};
    timer = setTimeout(closeQuestion, SECONDS * 1000);
  }));
  socket.on('host:close', hostOnly(() => closeQuestion()));
  socket.on('host:reveal', hostOnly(() => {
    closeQuestion();
    if (currentQ()) game.phase = 'reveal';
  }));
  socket.on('host:mark', hostOnly(({ playerId, correct }) => {
    const k = key(game.r, game.q);
    const a = game.answers[k] && game.answers[k][playerId];
    if (a) a.correct = !!correct;
  }));
  socket.on('host:leaderboard', hostOnly(({ title }) => {
    closeQuestion();
    game.phase = 'leaderboard';
    game.boardTitle = String(title || '').slice(0, 120);
  }));
  socket.on('host:final', hostOnly(() => {
    closeQuestion();
    game.phase = 'final';
    game.boardTitle = 'Final results';
  }));
  socket.on('host:lobby', hostOnly(() => {
    closeQuestion();
    game.phase = 'lobby';
  }));
  socket.on('host:kick', hostOnly(({ playerId }) => {
    delete game.players[playerId];
    for (const k of Object.keys(game.answers)) delete game.answers[k][playerId];
    for (const s of io.sockets.sockets.values())
      if (s.data.playerId === playerId) { s.emit('kicked'); s.data.role = null; s.data.playerId = null; }
  }));
  socket.on('host:resetScores', hostOnly(() => {
    clearTimeout(timer);
    const players = game.players;
    game = freshGame();
    game.players = players;
  }));
  socket.on('host:newGame', hostOnly(() => {
    clearTimeout(timer);
    game = freshGame();
    for (const s of io.sockets.sockets.values())
      if (s.data.role === 'player') { s.emit('kicked'); s.data.role = null; s.data.playerId = null; }
  }));
  socket.on('host:saveQuestions', hostOnly(({ rounds: incoming, savedAt }) => {
    const clean = cleanRounds(incoming);
    if (!clean || !clean.length) throw new Error('Need at least one round.');
    rounds = clean;
    questionsSavedAt = Number(savedAt) || Date.now();
    if (game.r >= rounds.length) { game.r = 0; game.q = -1; game.phase = 'lobby'; }
    try {
      fs.mkdirSync(path.dirname(SAVED_FILE), { recursive: true });
      fs.writeFileSync(SAVED_FILE, JSON.stringify({ savedAt: questionsSavedAt, rounds }, null, 2));
    } catch (_) {}
  }));
  socket.on('host:restore', hostOnly(({ snapshot }) => {
    // The server restarted mid-party: put the host's saved copy back.
    const g = snapshot && snapshot.game;
    if (!g || typeof g !== 'object' || typeof g.players !== 'object') throw new Error('Nothing to restore.');
    clearTimeout(timer);
    game = { ...freshGame(), ...g, phase: g.phase === 'question' ? 'closed' : g.phase };
  }));

  socket.on('disconnect', () => {
    const pid = socket.data.playerId;
    if (pid && socket.data.role === 'player') {
      online.set(pid, Math.max(0, (online.get(pid) || 1) - 1));
      broadcast();
    }
  });
});

server.listen(PORT, () => {
  console.log(`Ho ho ho trivia running on http://localhost:${PORT}`);
  console.log(`Host page: http://localhost:${PORT}/host  (PIN: ${HOST_PIN === 'brooklyn' ? 'brooklyn, the default' : 'set by HOST_PIN'})`);
});

module.exports = { autoMark, norm };
