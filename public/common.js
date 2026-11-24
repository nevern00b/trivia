// Shared helpers for the player, host and TV pages.
const TAGLINES = [
  "There's some ho ho ho's in this house",
  'It was all a dream... of a white Christmas',
  "Spread love, it's the Brooklyn way",
  'Mo’ presents, mo’ problems',
  'Big Poppa, big presents',
  'Where Brooklyn at? Under the mistletoe.',
];
const RIGHT_LINES = ['Juicy!', 'Big Poppa approves', 'Brooklyn’s finest', 'You know very well who you are'];
const WRONG_LINES = ["If you don't know, now you know", 'Coal in your stocking', 'Fuhgeddaboudit', 'Next one, Brooklyn'];
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

const $ = (sel, root = document) => root.querySelector(sel);
function el(tag, attrs = {}, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') n.className = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) n.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false) n.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  return n;
}
function toast(msg) {
  const t = el('div', { class: 'toast' }, msg);
  document.body.append(t);
  setTimeout(() => t.remove(), 2200);
}

// Countdown ring. Call timer.set(msLeft, totalSeconds); it animates itself.
function makeTimer(root) {
  const R = 52, C = 2 * Math.PI * R;
  root.classList.add('timer');
  root.innerHTML = `<svg width="120" height="120" viewBox="0 0 120 120">
    <circle cx="60" cy="60" r="${R}" stroke="rgba(255,255,255,.12)" stroke-width="10" fill="none"/>
    <circle class="arc" cx="60" cy="60" r="${R}" stroke="#f6c453" stroke-width="10" fill="none" stroke-linecap="round"
      stroke-dasharray="${C}" stroke-dashoffset="0"/></svg><div class="num">20</div>`;
  const arc = root.querySelector('.arc'), num = root.querySelector('.num');
  let endAt = 0, total = 20, raf = 0, onZero = null, fired = false;
  function tick() {
    const left = Math.max(0, endAt - Date.now());
    const secs = Math.ceil(left / 1000);
    num.textContent = secs;
    arc.style.strokeDashoffset = String(C * (1 - left / (total * 1000)));
    arc.style.stroke = secs <= 5 ? '#e8413c' : '#f6c453';
    root.classList.toggle('low', secs <= 5 && left > 0);
    if (left > 0) raf = requestAnimationFrame(tick);
    else if (!fired) { fired = true; onZero && onZero(); }
  }
  return {
    set(msLeft, seconds) {
      cancelAnimationFrame(raf);
      total = seconds || 20;
      const next = Date.now() + msLeft;
      if (Math.abs(next - endAt) > 400) endAt = next; // ignore tiny network jitter
      fired = msLeft <= 0 ? fired : false;
      tick();
    },
    stop() { cancelAnimationFrame(raf); },
    onZero(fn) { onZero = fn; },
  };
}

function renderBoard(ol, rows, meName) {
  ol.replaceChildren(
    ...(rows || []).map((r) =>
      el('li', { class: `r${r.rank}${meName && r.name === meName ? ' me' : ''}` },
        el('span', { class: 'rank' }, r.rank === 1 ? '👑' : r.rank),
        el('span', { class: 'name' }, r.name),
        el('span', { class: 'score' }, r.score))));
  if (!rows || !rows.length) ol.append(el('li', {}, el('span', { class: 'name muted' }, 'Nobody has joined yet.')));
}

// Keep a free-tier server awake during the party.
setInterval(() => fetch('/ping').catch(() => {}), 4 * 60 * 1000);
