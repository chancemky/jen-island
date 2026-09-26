// HUD: clock, animated money counter, reputation stars, quest pill, area
// toast, off-screen quest pointer, action button and toasts.

import { G, T, repStars } from '../systems/state.js';
import { bus, clock, money, clamp, escapeHtml } from '../core/util.js';
import { iconURL } from '../gfx/food.js';
import { ACHIEVEMENTS } from '../data/game.js';
import { sfx } from '../core/audio.js';
import { cam } from '../world/render.js';

const $ = id => document.getElementById(id);
const hud = $('hud'), actions = $('actions');
let shownMoney = null, moneyTarget = 0;

export function showHud(on) { hud.classList.toggle('hidden', !on); actions.classList.toggle('hidden', !on); $('pointer').classList.toggle('hidden', !on); }

export function initHud() {
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

let lastMinute = -1;
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
export function updatePointer(renderer) {
  const el = $('pointer');
  const tg = typeof questTarget === 'function' ? questTarget() : questTarget;
  if (!tg || !G.state.settings.arrow || document.body.classList.contains('cutscene') || tg.scene !== G.scene?.id) { el.style.opacity = 0; return; }
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
  actHandler = handler;
  actLabel.textContent = label || '';
  actBtn.classList.toggle('idle', !handler);
  actBtn.classList.toggle('ready', !!handler);
  if (icon !== actIcon.dataset.icon) { actIcon.dataset.icon = icon || ''; actIcon.style.backgroundImage = icon ? `url(${iconURL(icon, 40)})` : ''; actIcon.style.display = icon ? '' : 'none'; }
}
export function triggerAction() { if (actHandler) { sfx('tap'); actHandler(); } }
actBtn.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); triggerAction(); });

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
export function toast({ text, sub = '', icon = null, cls = '', bad = false, ms = 2800, onClick = null }) {
  const box = $('toasts');
  const el = document.createElement('div');
  el.className = 'toast ' + cls + (bad ? ' bad' : '');
  el.innerHTML = `${icon ? `<img src="${iconURL(icon, 40)}" alt="">` : ''}<div>${escapeHtml(text)}${sub ? `<small>${escapeHtml(sub)}</small>` : ''}</div>`;
  if (onClick) { el.style.pointerEvents = 'auto'; el.style.cursor = 'pointer'; el.addEventListener('click', onClick); }
  box.appendChild(el);
  while (box.children.length > 3) box.firstElementChild.remove();
  if (cls === 'ach') sfx('fanfare'); else if (bad) sfx('error'); else sfx('pop');
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 320); }, ms);
}

export function screenPosOfMoney() { const r = $('moneyChip').getBoundingClientRect(); return [r.left + 18, r.top + r.height / 2]; }
export { cam };
