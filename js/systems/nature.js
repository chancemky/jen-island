// The island's little natural moments:
//  · puddles after the rain (walk through them for a splash) and frogs by the pond in the
//    rainy season, who hop away if you get close
//  · the tide pool at the west end of Sunny Beach: at low tide (6–9 and 17–20) look in and
//    find a tiny creature for your collection — one a tide
//  · fireflies on Firefly Islet (spring and summer): at night, catch some in a jar for your
//    home (one a night)
//  · stargazing at Lighthouse Point on clear nights: join the stars into tonight's constellation
//  · Chú Hải's fishing tournament on the first day of every season, in the morning until noon:
//    biggest catch wins (one prize per real day)
// Everything seasonal here follows the shared island calendar (60 real days a year), the same for everyone.
import { G, T, markDirty, addMoney } from './state.js';
import { bus, rng, dist, choice, islandDay, islandSeason, seasonDay, jstDayNum } from '../core/util.js';
import { sfx } from '../core/audio.js';
import { fx, cam } from '../world/render.js';
import { POND } from '../world/island.js';
import { discover } from './interact.js';
import { weatherOn, raining } from './weather.js';
import { present, openSheet, h } from '../ui/sheets.js';
import { addXP } from './progress.js';
import { INK, circ, ell, box, poly, line } from '../gfx/draw.js';
import { FURNITURE } from '../data/game.js';

const hr = () => G.state.time / 60 % 24;
const isl = () => G.scenes.island;
const onIsland = () => G.scene && G.scene === isl();

// ---------------------------------------------------------------- puddles & frogs
let PUDDLES = null;
function puddleSpots() {
  if (PUDDLES) return PUDDLES;
  const sc = isl(), R = rng(4471), out = [];
  for (let i = 0; i < 900 && out.length < 70; i++) {
    const x = 120 + R() * 3100, y = 300 + R() * 2100;
    if (!sc.terrain(x, y) || !sc.terrain(x + 14, y) || !sc.terrain(x - 14, y)) continue;
    if (sc.solids.some(s => x > s.x - 16 && x < s.x + s.w + 16 && y > s.y - 10 && y < s.y + s.h + 10)) continue;
    out.push({ x: Math.round(x), y: Math.round(y), rx: 9 + R() * 9, ry: 3.5 + R() * 3, splash: 0 });
  }
  return (PUDDLES = out);
}
// puddles: while it rains and for three hours after a shower
function wet() {
  const w = weatherOn(); if (!w.rain) return 0;
  const h = hr(); if (h < w.start) return 0;
  return h < w.end ? Math.min(1, (h - w.start) * 2) : Math.max(0, 1 - (h - w.end) / 3);
}
// frogs: the warm, wet seasons (spring and summer on the island calendar)
const frogTime = () => ['spring', 'summer'].includes(islandSeason());
const FROGS = [];
function frogs() {
  if (FROGS.length) return FROGS;
  const R = rng(91);
  for (let i = 0; i < 6; i++) { const a = R() * Math.PI * 2; FROGS.push({ hx: POND.x + Math.cos(a) * (POND.rx + 14), hy: POND.y + Math.sin(a) * (POND.ry + 12), x: 0, y: 0, hop: 0, croak: R() * 6, col: choice(['#7fbf5a', '#6fae4c', '#9ccf6a']) }); }
  for (const f of FROGS) { f.x = f.hx; f.y = f.hy; }
  return FROGS;
}
export function updateNature(dt) {
  if (!G.state || !onIsland()) return;
  const pl = G.player; if (!pl) return;
  // splashes
  const k = wet();
  if (k > 0.3) for (const p of puddleSpots()) {
    p.splash = Math.max(0, p.splash - dt);
    if (p.splash <= 0 && Math.abs(pl.x - p.x) < p.rx && Math.abs(pl.y - p.y) < p.ry + 3 && pl.moving > 0.3) {
      p.splash = 1.6; sfx('splash'); fx.burst('splash', p.x, p.y, 7, { up: 22, col: '#dff4ff' }); discover('puddle');
    }
  }
  // frogs hop away from you, then drift back home
  if (frogTime()) for (const f of frogs()) {
    f.croak -= dt; if (f.croak < 0) { f.croak = 4 + Math.random() * 8; if (dist(f.x, f.y, pl.x, pl.y) < 160 && Math.random() < 0.5) sfx('frog'); }
    const d = dist(f.x, f.y, pl.x, pl.y);
    if (d < 36 && f.hop <= 0) { const a = Math.atan2(f.y - pl.y, f.x - pl.x); f.tx = f.x + Math.cos(a) * 34; f.ty = f.y + Math.sin(a) * 22; f.hop = 0.45; f.fx = f.x; f.fy = f.y; discover('frog'); }
    if (f.hop > 0) { f.hop -= dt; const t = 1 - Math.max(0, f.hop) / 0.45; f.x = f.fx + (f.tx - f.fx) * t; f.y = f.fy + (f.ty - f.fy) * t; f.z = Math.sin(t * Math.PI) * 10; }
    else { f.z = 0; f.x += (f.hx - f.x) * dt * 0.15; f.y += (f.hy - f.y) * dt * 0.15; }
  }
  const r = G.runtime.rainA || 0; G.runtime.wasRaining = r > 0.4 ? true : r < 0.1 ? false : G.runtime.wasRaining;
}
export const rainbowOn = () => false;   // (the rainbow was taken out in 5.18.1)
export function natureDrawables() {
  const out = [], v = cam.view; if (!v) return out;
  const k = wet();
  if (k > 0.02) for (const p of puddleSpots()) {
    if (p.x < v.x - 30 || p.x > v.x + v.w + 30 || p.y < v.y - 20 || p.y > v.y + v.h + 20) continue;
    out.push({ x: p.x, y: p.y, flat: true, sortY: p.y - 40, draw: (c, t) => {
      c.save(); c.globalAlpha = k;
      ell(c, 0, 0, p.rx, p.ry, 'rgba(120,150,175,.45)', null); ell(c, -p.rx * 0.25, -p.ry * 0.25, p.rx * 0.45, p.ry * 0.3, 'rgba(255,255,255,.35)', null);
      if (raining()) { const q = (t * 1.3 + p.x) % 1; c.strokeStyle = `rgba(255,255,255,${0.6 * (1 - q)})`; c.lineWidth = 0.6; c.beginPath(); c.ellipse((p.x % 7) - 3, 0, q * p.rx * 0.6, q * p.ry * 0.6, 0, 0, Math.PI * 2); c.stroke(); }
      if (p.splash > 1) { const q = 1.6 - p.splash; c.strokeStyle = `rgba(255,255,255,${0.8 - q * 1.2})`; c.lineWidth = 1; c.beginPath(); c.ellipse(0, 0, p.rx * (0.6 + q * 1.5), p.ry * (0.6 + q * 1.5), 0, 0, Math.PI * 2); c.stroke(); }
      c.restore();
    } });
  }
  if (frogTime()) for (const f of frogs()) {
    if (f.x < v.x - 20 || f.x > v.x + v.w + 20 || f.y < v.y - 20 || f.y > v.y + v.h + 20) continue;
    out.push({ x: f.x, y: f.y, draw: (c, t) => {
      ell(c, 0, 1, 4.5, 1.6, 'rgba(0,0,0,.15)', null);
      c.save(); c.translate(0, -(f.z || 0));
      const puff = f.croak < 0.6 ? Math.sin((0.6 - f.croak) * 15) * 1.2 + 1.5 : 0;
      if (puff > 0) ell(c, 0, -2, 2.6 + puff * 0.4, 1.8 + puff * 0.5, '#f4f0c0', INK, 0.4);
      ell(c, 0, -3.5, 5, 3.4, f.col, INK, 0.7); for (const s of [-1, 1]) { circ(c, s * 2.4, -6.4, 1.6, f.col, INK, 0.6); circ(c, s * 2.4, -6.6, 0.7, INK, null); ell(c, s * 4.2, -1, 1.8, 1, f.col, INK, 0.5); }
      c.restore();
    } });
  }
  out.push(...tideDrawables());
  return out;
}
export function drawRainbow() {}

// ---------------------------------------------------------------- the tide pool
export const TIDE = { x: 380, y: 2290 };
const CREATURES = [
  { id: 'hermit', em: '🐚', en: 'Hermit crab', vi: 'Ốc mượn hồn', w: 26 }, { id: 'starfish', em: '⭐', en: 'Cushion starfish', vi: 'Sao biển gối', w: 20 }, { id: 'anemone', em: '🌺', en: 'Sea anemone', vi: 'Hải quỳ', w: 18 },
  { id: 'shrimp', em: '🦐', en: 'Glass shrimp', vi: 'Tôm kính', w: 16 }, { id: 'urchin', em: '🦔', en: 'Sea urchin', vi: 'Nhím biển', w: 12 }, { id: 'blenny', em: '🐟', en: 'Rock blenny', vi: 'Cá bống đá', w: 10 },
  { id: 'nudibranch', em: '🐌', en: 'Purple sea slug', vi: 'Sên biển tím', w: 5 }, { id: 'octopus', em: '🐙', en: 'Baby octopus', vi: 'Bạch tuộc con', w: 3 }, { id: 'seahorse', em: '🌊', en: 'Tiny seahorse', vi: 'Cá ngựa tí hon', w: 1.5 },
];
export const CREATURE_COUNT = CREATURES.length;
const lowTide = () => { const h = hr(); return (h >= 6 && h < 9) ? 'am' : (h >= 17 && h < 20) ? 'pm' : null; };
function tideDrawables() {
  const v = cam.view, X = TIDE.x, Y = TIDE.y;
  if (X < v.x - 80 || X > v.x + v.w + 80 || Y < v.y - 60 || Y > v.y + v.h + 60) return [];
  const low = !!lowTide();
  return [{ x: X, y: Y, flat: true, sortY: Y - 30, draw: (c, t) => {
    for (const [dx, dy, r] of [[-30, -4, 9], [-22, 8, 7], [26, -6, 10], [30, 7, 7], [-6, -14, 8], [12, -15, 7], [0, 13, 6]]) ell(c, dx, dy, r, r * 0.6, '#9a958b', INK, 0.8);
    ell(c, 0, 0, low ? 22 : 28, low ? 9 : 12, low ? '#6fb4c8' : '#7fc8db', INK, 0.7); ell(c, -5, -2, 9, 3, 'rgba(255,255,255,.3)', null);
    if (low) { circ(c, 8, 2, 2, '#f28f7c', null); poly(c, [-10, 3, -8, -1, -6, 3, -10, 1, -6, 1], '#f2c14e', null); ell(c, 2, -3, 1.6, 1, '#c9b6e8', null); }
    else { const q = (t * 0.5) % 1; c.strokeStyle = `rgba(255,255,255,${0.5 * (1 - q)})`; c.lineWidth = 0.7; c.beginPath(); c.ellipse(0, 0, 10 + q * 16, 4 + q * 7, 0, 0, Math.PI * 2); c.stroke(); }
  } }];
}
function lookInPool() {
  const s = G.state, tide = lowTide(), key = s.day + tide, f = s.story.flags;
  if (f.tidepool === key) return bus.emit('toast', { text: T('You\'ve had a good look this tide', 'Bạn đã ngắm kỹ lượt triều này rồi'), sub: T('Next low tide: 6–9 or 17–20.', 'Triều xuống lần tới: 6–9 giờ hoặc 17–20 giờ.'), icon: 'fish', now: true });
  f.tidepool = key;
  const tot = CREATURES.reduce((a, c) => a + c.w, 0); let r = Math.random() * tot, got = CREATURES[0];
  for (const cr of CREATURES) { r -= cr.w; if (r <= 0) { got = cr; break; } }
  const col = (s.tidepool ||= {}), first = !col[got.id]; col[got.id] = (col[got.id] || 0) + 1;
  discover('tidepool'); bus.emit('tidepool', got.id); addXP(first ? 25 : 8, 'nature'); markDirty(true);
  G.player.setAct('think'); setTimeout(() => G.player.act === 'think' && G.player.setAct(null), 1200);
  sfx(first ? 'sparkle' : 'pop'); fx.burst('splash', TIDE.x, TIDE.y, 6, { up: 16, col: '#dff4ff' });
  bus.emit('toast', { text: T(`In the tide pool: a ${got.en.toLowerCase()}!`, `Trong hồ triều: ${got.vi.toLowerCase()}!`), sub: first ? T(`New for your collection · ${Object.keys(col).length}/${CREATURES.length}`, `Mới trong bộ sưu tập · ${Object.keys(col).length}/${CREATURES.length}`) : T('You watch it for a while, then leave it be.', 'Bạn ngắm nó một lúc rồi để nó yên.'), icon: 'fish', ms: 3400, now: true });
  if (Object.keys(col).length === CREATURES.length && first) bus.emit('toast', { text: T('Tide pool collection complete!', 'Hoàn thành bộ sưu tập hồ triều!'), icon: 'star', cls: 'ach', ms: 4200 });
}
export function openTideBook() {
  const col = G.state.tidepool || {};
  openSheet({ title: T('Tide pool friends', 'Bạn bè hồ triều'), sub: T(`${Object.keys(col).length} of ${CREATURES.length} found · low tide 6–9 and 17–20`, `Tìm được ${Object.keys(col).length}/${CREATURES.length} · triều xuống 6–9 và 17–20 giờ`), build: body => {
    const l = h('div', 'list'); body.appendChild(l);
    for (const cr of CREATURES) l.appendChild(h('div', 'row' + (col[cr.id] ? '' : ' locked'), `<div class="ico">${col[cr.id] ? cr.em : '❔'}</div><div class="info"><b>${col[cr.id] ? T(cr.en, cr.vi) : '???'}</b><small>${col[cr.id] ? T(`Seen ${col[cr.id]}×`, `Đã thấy ${col[cr.id]} lần`) : T(cr.w < 4 ? 'Rare' : 'Keep looking', cr.w < 4 ? 'Hiếm' : 'Cứ tìm tiếp')}</small></div>`));
  } });
}

// ---------------------------------------------------------------- fireflies in a jar
export const FIREFLY_SPOT = { x: 2250, y: 1340 };
const night = () => { const h = hr(); return h >= 19.5 || h < 4.5; };
const fireflySeason = () => ['spring', 'summer'].includes(islandSeason());
function catchFireflies() {
  const s = G.state, f = s.story.flags;
  if (f.fireflyNight === islandDay() + ':' + s.day) return bus.emit('toast', { text: T('Let the rest of them glow tonight', 'Để những con còn lại tỏa sáng đêm nay'), sub: T('One jar a night.', 'Mỗi đêm một lọ.'), icon: 'lantern', now: true });
  f.fireflyNight = islandDay() + ':' + s.day; (s.home.owned ||= []).push('firefly_jar'); s.stats.fireflyJars = (s.stats.fireflyJars || 0) + 1;
  discover('fireflies'); addXP(20, 'nature'); markDirty(true);
  G.player.setAct('wave'); setTimeout(() => G.player.act === 'wave' && G.player.setAct(null), 900); sfx('sparkle');
  fx.burst('spark', FIREFLY_SPOT.x, FIREFLY_SPOT.y - 30, 10, { up: 30, col: '#fff6a0' });
  bus.emit('toast', { text: T('A jar of fireflies!', 'Một lọ đom đóm!'), sub: T('It\'s waiting at home — they glow all night (and you let them go at dawn).', 'Đang chờ ở nhà — chúng sáng cả đêm (và bạn thả chúng lúc bình minh).'), icon: 'lantern', ms: 3800, now: true });
}

// ---------------------------------------------------------------- stargazing
export const STAR_SPOT = { x: 960, y: 380 };
export const CONSTELLATIONS = [
  { id: 'ferry', en: 'The Ferry', vi: 'Con Thuyền', pts: [[20, 70], [40, 78], [70, 78], [90, 70], [55, 40], [55, 78]], lines: [[0, 1], [1, 2], [2, 3], [4, 5], [4, 3]] },
  { id: 'cat', en: 'Mèo Mây', vi: 'Mèo Mây', pts: [[30, 40], [38, 25], [46, 38], [60, 38], [68, 25], [74, 42], [52, 70], [80, 70]], lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 0], [5, 7]] },
  { id: 'bowl', en: 'The Rice Bowl', vi: 'Bát Cơm', pts: [[20, 40], [35, 70], [65, 70], [80, 40], [50, 52]], lines: [[0, 1], [1, 2], [2, 3], [0, 4], [4, 3]] },
  { id: 'lantern', en: 'The Lantern', vi: 'Lồng Đèn', pts: [[50, 15], [50, 30], [30, 50], [50, 72], [70, 50], [50, 86]], lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 1], [3, 5]] },
  { id: 'moonfish', en: 'The Moonfish', vi: 'Cá Mặt Trăng', pts: [[20, 50], [40, 32], [65, 34], [80, 50], [65, 66], [40, 68], [88, 36], [88, 64]], lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0], [3, 6], [3, 7]] },
  { id: 'kite', en: 'The Kite', vi: 'Cánh Diều', pts: [[50, 12], [75, 40], [50, 60], [25, 40], [45, 78], [55, 92]], lines: [[0, 1], [1, 2], [2, 3], [3, 0], [0, 2], [2, 4], [4, 5]] },
  { id: 'lotus', en: 'The Lotus', vi: 'Hoa Sen', pts: [[50, 20], [35, 45], [50, 62], [65, 45], [20, 55], [80, 55], [50, 82]], lines: [[0, 1], [1, 2], [2, 3], [3, 0], [1, 4], [3, 5], [2, 6]] },
  { id: 'buffalo', en: 'The Water Buffalo', vi: 'Con Trâu', pts: [[15, 30], [30, 42], [70, 42], [85, 30], [30, 70], [70, 70], [50, 42]], lines: [[0, 1], [1, 6], [6, 2], [2, 3], [1, 4], [2, 5]] },
];
function stargaze() {
  const s = G.state, seen = (s.constellations ||= {}), todo = CONSTELLATIONS.filter(c => !seen[c.id]);
  const con = (todo.length ? todo : CONSTELLATIONS)[s.day % (todo.length || CONSTELLATIONS.length)];
  return present(() => new Promise(done => {
    const el = document.createElement('div'); el.className = 'modal stargaze';
    el.innerHTML = `<div class="card"><div class="kicker">✨ ${T('Lighthouse Point, tonight', 'Mũi Hải Đăng, đêm nay')}</div><canvas width="600" height="600"></canvas><p class="sg-msg">${T('Tap the brightest stars to join them up', 'Chạm vào những ngôi sao sáng nhất để nối chúng lại')}</p><button class="btn ghost" type="button">${T('Done', 'Xong')}</button></div>`;
    (document.getElementById('app') || document.body).appendChild(el);
    const cv = el.querySelector('canvas'), c = cv.getContext('2d'), msg = el.querySelector('.sg-msg'), R = rng(s.day * 31 + 7), bg = Array.from({ length: 140 }, () => [R() * 600, R() * 600, R() * 1.4 + 0.3]);
    const P = con.pts.map(([x, y]) => [x * 6, y * 6]), lit = new Set(); let won = false, raf = 0;
    const frame = t => {
      const g = c.createLinearGradient(0, 0, 0, 600); g.addColorStop(0, '#141a3a'); g.addColorStop(1, '#2c2f5c'); c.fillStyle = g; c.fillRect(0, 0, 600, 600);
      for (const [x, y, r] of bg) { c.globalAlpha = 0.4 + 0.4 * Math.sin(t / 700 + x); c.fillStyle = '#fff'; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); } c.globalAlpha = 1;
      c.strokeStyle = 'rgba(255,230,150,.75)'; c.lineWidth = 3;
      for (const [a, b] of con.lines) if (lit.has(a) && lit.has(b)) { c.beginPath(); c.moveTo(...P[a]); c.lineTo(...P[b]); c.stroke(); }
      P.forEach(([x, y], i) => { const on = lit.has(i), k = on ? 1 : 0.7 + 0.3 * Math.sin(t / 300 + i); c.fillStyle = on ? '#ffe9a0' : '#fff'; c.shadowColor = '#fff3c0'; c.shadowBlur = on ? 18 : 10 * k; c.beginPath(); c.arc(x, y, on ? 8 : 6 * k, 0, Math.PI * 2); c.fill(); c.shadowBlur = 0; });
      if (won) { c.fillStyle = '#ffe9a0'; c.font = '900 34px Nunito, sans-serif'; c.textAlign = 'center'; c.fillText(T(con.en, con.vi), 300, 560); }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    cv.addEventListener('pointerdown', e => {
      const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) * 600 / r.width, y = (e.clientY - r.top) * 600 / r.height;
      let best = -1, bd = 60; P.forEach(([px, py], i) => { const d = Math.hypot(px - x, py - y); if (d < bd && !lit.has(i)) { bd = d; best = i; } });
      if (best < 0) return; lit.add(best); sfx('tap');
      if (lit.size === P.length && !won) {
        won = true; sfx('fanfare'); const first = !seen[con.id]; seen[con.id] = s.day; discover('stars'); bus.emit('stargazed', con.id); addXP(first ? 40 : 10, 'nature'); markDirty(true);
        msg.textContent = first ? T(`New constellation: ${con.en} · ${Object.keys(seen).length}/${CONSTELLATIONS.length}`, `Chòm sao mới: ${con.vi} · ${Object.keys(seen).length}/${CONSTELLATIONS.length}`) : T(`${con.en} — an old friend.`, `${con.vi} — người bạn cũ.`);
      }
    });
    el.querySelector('button').onclick = () => { cancelAnimationFrame(raf); el.remove(); done(); };
  }));
}

// ---------------------------------------------------------------- the season-opener fishing tournament
// the first (real) day of each island season; each in-game morning that day is a round
export const tourneyToday = () => seasonDay() === 1 && !!G.state.story.flags.fishing;
export const tourneyOn = () => tourneyToday() && hr() >= 6 && hr() < 12;
const RIVALS = [['Chú Hải', 50, 78], ['Ông Lộc', 34, 60], ['Anh Tuấn', 28, 56]];
function tourneyResults() {
  const s = G.state, tr = s.tourney; if (!tr || tr.day !== s.day || tr.done) return;
  tr.done = true; markDirty(true);
  const R = rng(s.day * 13 + jstDayNum()), rivals = RIVALS.map(([n, a, b]) => ({ n, cm: Math.round(a + R() * (b - a)) }));
  const all = [...rivals, { n: T('You', 'Bạn'), cm: tr.best || 0, me: true }].sort((a, b) => b.cm - a.cm), place = all.findIndex(x => x.me) + 1;
  const paid = s.story.flags.tourneyPaid === islandDay(), prize = tr.best && !paid ? [0, 600, 300, 150, 30][place] : 0;
  if (prize) s.story.flags.tourneyPaid = islandDay();
  if (prize) addMoney(prize, 'festival');
  const firstWin = place === 1 && !s.stats.tourneyWins; if (place === 1) { s.stats.tourneyWins = (s.stats.tourneyWins || 0) + 1; if (firstWin && FURNITURE.fish_plaque) (s.home.owned ||= []).push('fish_plaque'); }
  present(() => new Promise(done => {
    const el = document.createElement('div'); el.className = 'modal';
    el.innerHTML = `<div class="card" style="text-align:center"><div class="kicker">🎣 ${T('Chú Hải\'s fishing tournament', 'Giải câu cá của Chú Hải')}</div><h2>${tr.best ? T(['', '1st place!', '2nd place', '3rd place', '4th place'][place], ['', 'Hạng nhất!', 'Hạng nhì', 'Hạng ba', 'Hạng tư'][place]) : T('No catch this time', 'Lần này chưa câu được')}</h2>
      <div class="list">${all.map((x, i) => `<div class="row${x.me ? ' me' : ''}"><div class="info"><b>${i + 1}. ${x.n}</b></div><b>${x.cm ? x.cm + ' cm' : '—'}</b></div>`).join('')}</div>
      <p style="font-weight:800">${prize ? T(`Prize: ${prize}k${firstWin ? ' and a mounted fish for your wall' : ''}`, `Giải thưởng: ${prize}k${firstWin ? ' và một bảng cá treo tường' : ''}`) : (paid && tr.best ? T('You\'ve already won a prize today — this round is just for glory.', 'Hôm nay bạn đã nhận giải rồi — vòng này chỉ để lấy danh.') : T('Next tournament: the first day of next season.', 'Giải tiếp theo: ngày đầu tiên của mùa sau.'))}</p><button class="btn primary" type="button">${T('See you next time!', 'Hẹn lần sau!')}</button></div>`;
    (document.getElementById('app') || document.body).appendChild(el); bus.emit('stinger', place === 1 ? 'award' : 'friend');
    el.querySelector('button').onclick = () => { el.remove(); done(); };
  }));
}

// ---------------------------------------------------------------- actions & set-up
export function natureAction(pl) {
  if (!onIsland()) return null;
  if (lowTide() && dist(pl.x, pl.y, TIDE.x, TIDE.y + 18) < 44) return { label: T('Look in the tide pool', 'Ngắm hồ triều'), icon: 'fish', run: lookInPool };
  if (night() && dist(pl.x, pl.y, FIREFLY_SPOT.x, FIREFLY_SPOT.y) < 60) return fireflySeason() ? { label: T('Catch fireflies in a jar', 'Bắt đom đóm vào lọ'), icon: 'lantern', run: catchFireflies }
    : { label: T('Look for fireflies', 'Tìm đom đóm'), icon: 'lantern', run: () => bus.emit('toast', { text: T('Only a few fireflies this time of year', 'Mùa này chỉ có vài con đom đóm'), sub: T('They come out in their thousands in spring and summer.', 'Mùa xuân và mùa hè chúng bay ra hàng nghìn con.'), icon: 'lantern', now: true }) };
  if ((hr() >= 21 || hr() < 4) && !raining() && dist(pl.x, pl.y, STAR_SPOT.x, STAR_SPOT.y) < 50) return { label: T('Stargaze', 'Ngắm sao'), icon: 'star', run: stargaze };
  return null;
}
export function initNature() {
  bus.on('fish', (id, size, junk) => {
    if (!tourneyOn() || junk) return;
    const s = G.state, tr = (s.tourney && s.tourney.day === s.day) ? s.tourney : (s.tourney = { day: s.day, best: 0 });
    if (size > tr.best) { tr.best = size; tr.fish = id; markDirty(); bus.emit('toast', { text: T(`Tournament: new best — ${size} cm!`, `Giải câu: kỷ lục mới — ${size} cm!`), sub: T('Results at noon.', 'Công bố kết quả lúc 12 giờ trưa.'), icon: 'fish', ms: 2600, now: true }); }
  });
  let warned = -1;
  setInterval(() => {
    const s = G.state; if (!s?.story || G.runtime.inCutscene) return;
    if (tourneyToday() && hr() >= 6 && hr() < 12 && warned !== s.day) { warned = s.day; bus.emit('toast', { cat: 'island', text: T('Fishing tournament today!', 'Hôm nay có giải câu cá!'), sub: T('Chú Hải\'s season opener — biggest catch by noon wins. End of the pier.', 'Giải mở mùa của Chú Hải — cá to nhất trước 12 giờ trưa thắng. Cuối cầu tàu.'), icon: 'fish', ms: 5000 }); }
    if (tourneyToday() && hr() >= 12 && s.tourney?.day === s.day && !s.tourney.done) tourneyResults();
  }, 3000);
}
