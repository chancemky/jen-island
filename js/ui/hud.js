// HUD: clock, animated money counter, reputation stars, quest pill, area
// toast, off-screen quest pointer, action button and toasts.

import { G, T, repStars } from '../systems/state.js';
import { bus, clock, money, escapeHtml } from '../core/util.js';
import { iconURL } from '../gfx/food.js';
import { ACHIEVEMENTS } from '../data/game.js';
import { sfx } from '../core/audio.js';
import { input, joystickActive, startJoystick } from '../core/input.js';
import { onSongStart } from '../core/music.js';

const $ = id => document.getElementById(id);
const hud = $('hud'), actions = $('actions');
let shownMoney = null, moneyTarget = 0;
let lastMinute = -1;

export function paintHudNow() {
  const s = G.state;
  moneyTarget = s.money; shownMoney = s.money;
  $('moneyLabel').textContent = money(s.money);
  $('dayLabel').textContent = T('Day ', 'Ngày ') + s.day;
  $('clockLabel').textContent = clock(s.time);
  $('sunIcon').classList.toggle('night', s.time >= 18.5 * 60 || s.time < 6 * 60);
  const lv = s.level || 1, need = Math.round(90 * Math.pow(lv, 1.5));
  $('lvLabel').dataset.v = lv + G.lang;
  $('lvLabel').textContent = (G.lang === 'vi' ? 'Cấp ' : 'Lv ') + lv;
  $('xpFill').style.width = Math.min(100, (s.xp || 0) / need * 100).toFixed(1) + '%';
  lastMinute = Math.floor(s.time);
  renderStars();
}

export function showHud(on) {
  if (on) paintHudNow();
  hud.classList.toggle('hidden', !on); actions.classList.toggle('hidden', !on); $('pointer').classList.toggle('hidden', !on);
}

// "♪ Night Market" when a song starts (each song at most once every ten minutes)
const sungAt = {};
function announceSong(id, S) {
  const now = performance.now();
  if (G.runtime.cinematic || !G.state.story.flags.freeRoam || now - (sungAt[id] ?? -1e9) < 600000) return;
  sungAt[id] = now;
  toast({ text: '♪ ' + T(S.en, S.vi), cls: 'song', quiet: true, ms: 2600 });
}
export function initHud() {
  onSongStart(announceSong);
  const mi = document.getElementById('mapIco'); if (mi) mi.src = iconURL('map', 40);
  bus.on('money', (k) => {
    moneyTarget = G.state.money;
    const chip = $('moneyChip');
    chip.classList.remove('bump', 'drop'); void chip.offsetWidth;
    chip.classList.add(k >= 0 ? 'bump' : 'drop');
    if (k < 0) setTimeout(() => chip.classList.remove('drop'), 600);
  });
  bus.on('rep', () => renderStars());
  bus.on('achievement', id => toast({ text: T('New achievement!', 'Thành tựu mới!'), sub: T(ACHIEVEMENTS[id].en + ' — ' + ACHIEVEMENTS[id].desc, ACHIEVEMENTS[id].vi + ' — ' + ACHIEVEMENTS[id].descVi), cls: 'ach', icon: 'lantern' }));
  bus.on('lang', () => { lastMinute = -1; });
  bus.on('toast', o => toast(o));
  moneyTarget = G.state.money; shownMoney = G.state.money;
  renderStars();
}

export function renderStars() {
  const v = repStars();
  let h = '';
  for (let i = 1; i <= 5; i++) h += `<i class="${v >= i ? 'on' : v >= i - 0.5 ? 'half' : ''}"></i>`;
  $('stars').innerHTML = h;
  const rn = document.getElementById('repNum'); if (rn) rn.textContent = '★' + v.toFixed(1);
}

export function updateHud(dt) {
  const s = G.state;
  // money rolls smoothly toward the real value
  moneyTarget = s.money;
  if (shownMoney === null) shownMoney = moneyTarget;
  const diff = moneyTarget - shownMoney;
  if (Math.abs(diff) > 0.5) shownMoney += diff * Math.min(1, dt * 7) + Math.sign(diff) * 0.5;
  else shownMoney = moneyTarget;
  $('moneyLabel').textContent = money(shownMoney);
  const lv = s.level || 1, need = Math.round(90 * Math.pow(lv, 1.5));
  if ($('lvLabel').dataset.v !== lv + G.lang) { $('lvLabel').dataset.v = lv + G.lang; $('lvLabel').textContent = (G.lang === 'vi' ? 'Cấp ' : 'Lv ') + lv; }
  $('xpFill').style.width = Math.min(100, (s.xp || 0) / need * 100).toFixed(1) + '%';
  const m = Math.floor(s.time);
  if (m !== lastMinute) {
    lastMinute = m;
    $('dayLabel').textContent = T('Day ', 'Ngày ') + s.day;
    $('clockLabel').textContent = clock(s.time);
    $('sunIcon').classList.toggle('night', s.time >= 18.5 * 60 || s.time < 6 * 60);
  }
}

// ---------------------------------------------------------------- quest pill + pointer
let questTarget = null;
let waypoint = null;
// A side-quest guide ("return the sandal to Bà Tư") temporarily takes over the
// quest pill and the arrow; the story goal comes back once it's returned.
let guide = null, story = [null, null];
export function setGuide(g) {
  const was = guide?.text; guide = g;
  if (g) showQuest('↩ ' + g.text, g.target); else if (was !== undefined) showQuest(story[0], story[1]);
}
export function setQuest(text, target = null) {
  story = [text, target];
  if (guide) return;
  showQuest(text, target);
}
function showQuest(text, target) {
  const pill = $('questPill');
  const t = $('questText');
  if (!text) { pill.classList.add('empty'); questTarget = null; return; }
  if (t.dataset.v !== text) {
    t.dataset.v = text; t.innerHTML = escapeHtml(text);
    pill.classList.remove('empty', 'pulse'); void pill.offsetWidth; pill.classList.add('pulse');
  }
  questTarget = target;
}
export function setWaypoint(target, label) {
  waypoint = target;
  toast({
    text: T(`Waypoint: ${label}`, `Điểm đến: ${label}`),
    sub: T('Follow the gold arrow.', 'Đi theo mũi tên vàng nhé.'),
    icon: 'map',
  });
}
export function updatePointer(renderer) {
  const el = $('pointer');
  if (waypoint?.scene === G.scene?.id && Math.hypot(G.player.x - waypoint.x, G.player.y - waypoint.y) < 70) waypoint = null;
  let tg = waypoint || (typeof questTarget === 'function' ? questTarget() : questTarget);
  // the goal is somewhere else and you're indoors: point at the door out
  const sc = G.scene;
  if (tg && sc && tg.scene !== sc.id && sc.kind === 'interior' && sc.door) tg = { scene: sc.id, x: sc.door.x, y: sc.h, lift: 14 };
  if (!tg || (!waypoint && !G.state.settings.arrow) || document.body.classList.contains('cutscene') || tg.scene !== G.scene?.id) { el.style.opacity = 0; return; }
  const [sx, sy] = renderer.toScreen(tg.x, tg.y - (tg.lift || 30));
  const W = renderer.w, H = renderer.h, m = 40, top = 110, bottom = 150;
  const inside = sx > m && sx < W - m && sy > top && sy < H - bottom;
  let x = sx, y = sy, ang = Math.PI / 2;
  if (!inside) {
    const cx = W / 2, cy = H / 2, dx = sx - cx, dy = sy - cy;
    const k = Math.min(Math.abs((W / 2 - m) / (dx || 1e-6)), Math.abs(((dy > 0 ? H - bottom : top) - cy) / (dy || 1e-6)));
    x = cx + dx * k; y = cy + dy * k; ang = Math.atan2(dy, dx);
  } else { y = sy - 8 + Math.sin(performance.now() / 220) * 5; }
  el.style.opacity = 1;
  el.style.transform = `translate(${x}px, ${y}px) rotate(${ang - Math.PI / 2}rad)`;
  el.firstElementChild.style.transform = `rotate(-45deg)`;
}

// ---------------------------------------------------------------- area toast
let areaTimer = 0, lastArea = '';
export function showArea(name, en) {
  if (name === lastArea) return;
  lastArea = name;
  $('areaName').textContent = name; $('areaEn').textContent = en || '';
  const a = $('areaToast'); a.classList.add('on');
  clearTimeout(areaTimer); areaTimer = setTimeout(() => a.classList.remove('on'), 2200);
}
export function resetArea() { lastArea = ''; }

// ---------------------------------------------------------------- action button
const actBtn = $('actBtn'), actLabel = $('actLabel'), actIcon = $('actIcon');
let actHandler = null;
export function setAction(label, handler, icon = null) {
  // The gesture owns this corner until release. Do not let a newly-near shore/NPC/door
  // replace the stick with Skip-a-stone, Talk or another action under the held pointer.
  if (joystickActive()) return;
  actHandler = handler;
  actLabel.textContent = label || '';
  actBtn.classList.toggle('idle', !handler);
  actBtn.classList.toggle('ready', !!handler);
  if (icon !== actIcon.dataset.icon) { actIcon.dataset.icon = icon || ''; actIcon.style.backgroundImage = icon ? `url(${iconURL(icon, 40)})` : ''; actIcon.style.display = icon ? '' : 'none'; }
}
// one press, one action: a burst of taps (or a tap while the last action is still starting)
// can't run the same thing twice
let actBusyUntil = 0;
export function triggerAction(handler = actHandler) {
  const now = performance.now();
  if (!handler || now < actBusyUntil) return;
  actBusyUntil = now + 450;
  sfx('tap');
  try { const r = handler(); if (r?.catch) r.catch(e => console.error('[action]', e)); } catch (e) { console.error('[action]', e); }
}
const actionTapAt = (x, y) => {
  if (!actHandler || actions.classList.contains('hidden')) return null;
  const style = getComputedStyle(actBtn);
  if (style.display === 'none' || style.visibility === 'hidden' || style.pointerEvents === 'none') return null;
  const r = actBtn.getBoundingClientRect();
  if (x < r.left || x > r.right || y < r.top || y > r.bottom) return null;
  const handler = actHandler;
  return () => triggerAction(handler);
};
input.tapOverrideAt = actionTapAt;
actBtn.addEventListener('pointerdown', e => {
  e.stopPropagation();
  // A tap is the action; a drag that begins on the pink button still belongs to the floating stick.
  // Keep direct synthetic pointerdowns working for the browser test harness.
  const action = actionTapAt(e.clientX, e.clientY);
  if (!e.isTrusted) { e.preventDefault(); action?.(); return; }
  startJoystick(e, action);
});
// Keyboard activation and element.click() do not emit pointer events.
actBtn.addEventListener('click', e => { if (!e.detail) triggerAction(); });

const bizBtn = $('bizBtn');
let bizHandler = null;
export function setBizButton(label, handler, closing = false) {
  bizHandler = handler;
  bizBtn.classList.toggle('hidden', !handler);
  bizBtn.classList.toggle('closing', closing);
  if (label) bizBtn.textContent = label;
}
bizBtn.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); if (bizHandler) { sfx('ui'); bizHandler(); } });

// ---------------------------------------------------------------- toasts
// Toasts wait their turn: while a card or menu-blocking popup is up they queue, the same
// message is never shown twice in a row, achievements and warnings go first, and at most
// two are on screen (a short gap between them so each can be read).
const tq = []; let tTimer = null, lastShown = { text: '', at: 0 };
const blocking = () => !!document.querySelector('.reward:not(.out), .levelup:not(.out), .summary, .modal, .wn-wrap:not(.out)');
export function toast(o) {
  if (lastShown.text === o.text && Date.now() - lastShown.at < 2500) return;
  if (tq.some(q => q.text === o.text && q.sub === o.sub)) return;
  const urgent = o.cls === 'ach' || o.bad;
  if (urgent) tq.unshift(o); else tq.push(o);
  while (tq.length > 8) { const i = tq.findIndex(q => q.cls !== 'ach' && !q.bad); tq.splice(i < 0 ? 0 : i, 1); }
  pumpToasts();
}
function pumpToasts() {
  if (tTimer) return;
  const box = $('toasts'); if (!box || !tq.length) return;
  if (blocking() || [...box.children].filter(e => !e.classList.contains('out')).length >= 2) { tTimer = setTimeout(() => { tTimer = null; pumpToasts(); }, 450); return; }
  showToast(tq.shift());
  tTimer = setTimeout(() => { tTimer = null; pumpToasts(); }, 650);
}
function showToast({ text, sub = '', icon = null, cls = '', bad = false, ms = 2800, onClick = null, quiet = false }) {
  lastShown = { text, at: Date.now() };
  const box = $('toasts');
  const el = document.createElement('div');
  el.className = 'toast ' + cls + (bad ? ' bad' : '');
  el.innerHTML = `${icon ? `<img src="${iconURL(icon, 40)}" alt="">` : ''}<div>${escapeHtml(text)}${sub ? `<small>${escapeHtml(sub)}</small>` : ''}</div>`;
  if (onClick) { el.style.pointerEvents = 'auto'; el.style.cursor = 'pointer'; el.addEventListener('click', onClick); }
  // just below the quest bar, however many lines it has
  const q = $('questPill'), qr = q?.offsetParent ? q.getBoundingClientRect() : null;
  if (qr?.height) box.style.setProperty('--toast-top', `${qr.bottom - $('app').getBoundingClientRect().top + 8}px`); else box.style.removeProperty('--toast-top');
  box.appendChild(el);
  while (box.children.length > 2) box.firstElementChild.remove();
  if (!quiet) sfx(cls === 'ach' ? 'fanfare' : bad ? 'error' : 'pop');
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 320); }, ms);
}

export function moneyShortfall(required) {
  const need = Math.max(0, Math.round(required || 0));
  const have = Math.round(G.state.money || 0);
  toast({
    text: T('Not enough money', 'Không đủ tiền'),
    sub: T(`Need ${money(need)} · Have ${money(have)} · Short ${money(Math.max(0, need - have))}`, `Cần ${money(need)} · Có ${money(have)} · Thiếu ${money(Math.max(0, need - have))}`),
    bad: true,
  });
}

