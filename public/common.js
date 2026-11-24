// Shared helpers for the player, host and TV pages.
const TAGLINES = [
  "There's some ho ho ho's in this house",
  'It was all a dream... of a white Christmas',
  "Spread love, it's the Brooklyn way",
  'Mo’ presents, mo’ problems',
  'Big Poppa, big presents',
  'Where Brooklyn at? Under the mistletoe.',
];
const RIGHT_LINE = 'It was all a dream';
const WRONG_LINE = "If you don't know, now you know";
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
    <circle cx="60" cy="60" r="${R}" stroke="rgba(200,16,46,.12)" stroke-width="10" fill="none"/>
    <circle class="arc" cx="60" cy="60" r="${R}" stroke="#e8b931" stroke-width="10" fill="none" stroke-linecap="round"
      stroke-dasharray="${C}" stroke-dashoffset="0"/></svg><div class="num">20</div>`;
  const arc = root.querySelector('.arc'), num = root.querySelector('.num');
  let endAt = 0, total = 20, raf = 0, onZero = null, fired = false;
  function tick() {
    const left = Math.max(0, endAt - Date.now());
    const secs = Math.ceil(left / 1000);
    num.textContent = secs;
    arc.style.strokeDashoffset = String(C * (1 - left / (total * 1000)));
    arc.style.stroke = secs <= 5 ? '#c8102e' : '#e8b931';
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

// When the host opens the game as "localhost" on their own laptop, guests need the
// laptop's Wi-Fi address instead. Ask the server for it and use that for the link and QR code.
function useWifiLink(cb) {
  if (!/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)) return;
  fetch('/info').then((r) => r.json()).then((info) => {
    if (info.lan && info.lan[0]) cb(info.lan[0]);
  }).catch(() => {});
}

// String lights on every page.
document.addEventListener('DOMContentLoaded', () => document.body.prepend(el('div', { class: 'lights', 'aria-hidden': 'true' })));

// The MC with a speech bubble. size: '', 'small' or 'big'.
function mcSays(text, size = '') {
  return el('div', { class: 'mc-row' },
    el('img', { class: 'mc ' + size, src: '/mc.svg', alt: 'MC Big Poppa Claus' }),
    el('div', { class: 'bubble' }, text));
}

// Gold, red and white confetti for a right answer.
function confetti(n = 70) {
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const colors = ['#e8b931', '#f5cf5a', '#c8102e', '#ffffff'];
  for (let i = 0; i < n; i++) {
    const c = el('div', { class: 'confetti' });
    c.style.left = Math.random() * 100 + 'vw';
    c.style.background = colors[i % colors.length];
    c.style.animationDuration = 1.8 + Math.random() * 1.8 + 's';
    c.style.animationDelay = Math.random() * 0.5 + 's';
    document.body.append(c);
    setTimeout(() => c.remove(), 4500);
  }
}
