// Prep table: tap a raw ingredient → it hops onto the board / grill / pan →
// tap the station → it's chopped / grilled / fried instantly with a little
// burst → tap the bowl → it slides in. A batch is 4 portions, so prep takes
// seconds. "Prep all" unlocks after the first batch.

import { G, bizOf, pantry, addPantry, markDirty, flag, setFlag } from '../systems/state.js';
import { INGREDIENTS, PREPPED, PREP_BATCH, BUSINESSES } from '../data/game.js';
import { ingredientsForBiz } from '../systems/business.js';
import { ICONS, iconURL } from '../gfx/food.js';
import { INK, circ, ell } from '../gfx/draw.js';
import { sfx } from '../core/audio.js';
import { escapeHtml, TAU, bus } from '../core/util.js';
import { h, flyIcon } from './sheets.js';
import { toast } from './hud.js';
import { releaseJoystick } from '../core/input.js';

let P = null;
const METHOD = { chop: ['board', 'Chặt · Chop'], split: ['board', 'Xẻ bánh · Split'], scoop: ['board', 'Nạo · Scoop'], grill: ['grill', 'Nướng · Grill'], fry: ['pan', 'Chiên · Fry'], boil: ['pot', 'Luộc · Boil'] };

export function isPrepOpen() { return !!P; }
export function openPrep(bizId, { onClose } = {}) {
  if (P) return;
  releaseJoystick();
  const raws = ingredientsForBiz(bizId).filter(k => INGREDIENTS[k].prep);
  const el = h('div', 'prep');
  el.innerHTML = `<div class="prep-head"><h2>Bàn sơ chế<small>${escapeHtml(BUSINESSES[bizId].name)} · Prep table</small></h2><button class="btn gold all hidden" type="button">Sơ chế hết</button><button class="svc-close" type="button">✕</button></div>
    <div class="prep-raw"></div>
    <div class="prep-table"><div class="prep-station board"><canvas width="360" height="240"></canvas><div class="tip"></div></div></div>
    <div class="prep-bowls"></div>`;
  document.getElementById('sheets').appendChild(el);
  G.runtime.pause++;
  document.body.classList.add('sheet-open');
  P = { bizId, el, raws, onClose, item: null, stage: 'empty', anim: 0, chopT: 0, cuts: 0, parts: [], t: 0 };
  P.cv = el.querySelector('canvas'); P.c = P.cv.getContext('2d');
  el.querySelector('.svc-close').onclick = closePrep;
  el.querySelector('.prep-station').addEventListener('pointerdown', e => { e.preventDefault(); tapStation(); });
  el.querySelector('.all').onclick = prepAll;
  if (flag('prepAllUnlocked')) el.querySelector('.all').classList.remove('hidden');
  build();
  sfx('page');
  if (!raws.length) el.querySelector('.tip').textContent = 'Nothing here needs prepping yet.';
}
export function closePrep() {
  if (!P) return;
  const p = P; P = null;
  G.runtime.pause--;
  document.body.classList.remove('sheet-open');
  sfx('back');
  p.el.classList.add('out'); setTimeout(() => p.el.remove(), 210);
  p.onClose?.();
}
function build() {
  const rawBox = P.el.querySelector('.prep-raw'), bowls = P.el.querySelector('.prep-bowls');
  rawBox.innerHTML = ''; bowls.innerHTML = '';
  const b = bizOf(P.bizId);
  for (const k of P.raws) {
    const g = INGREDIENTS[k], n = pantry(k);
    const btn = h('button', 'ing' + (n <= 0 ? ' out' : ''));
    btn.type = 'button'; btn.dataset.k = k;
    btn.innerHTML = `<div class="tray"><img src="${iconURL(k, 56)}" alt=""></div><b>${escapeHtml(g.vi)}</b><span class="cnt">${n}</span>`;
    btn.addEventListener('pointerdown', e => { e.preventDefault(); tapRaw(k, btn); });
    rawBox.appendChild(btn);
    const to = g.prep.to;
    const bowl = h('div', 'bowl'); bowl.dataset.k = to;
    bowl.innerHTML = `<div class="dish"><img src="${iconURL(to, 48)}" alt=""></div><b>${escapeHtml(PREPPED[to].vi)}</b><span class="cnt">${b.prepped[to] || 0}</span>`;
    bowl.addEventListener('pointerdown', e => { e.preventDefault(); tapBowl(to, bowl); });
    bowls.appendChild(bowl);
  }
  hint();
}
function hint() {
  const tip = P.el.querySelector('.tip');
  for (const e of P.el.querySelectorAll('.hint, .target')) e.classList.remove('hint', 'target');
  if (P.stage === 'empty') {
    tip.textContent = P.raws.some(k => pantry(k) > 0) ? 'Chạm nguyên liệu · Tap an ingredient' : 'Hết nguyên liệu thô · No raw ingredients — visit the supermarket';
    const first = P.raws.find(k => pantry(k) > 0);
    if (first && !flag('prepAllUnlocked')) P.el.querySelector(`.ing[data-k="${first}"]`)?.classList.add('hint');
  } else if (P.stage === 'placed') tip.textContent = METHOD[INGREDIENTS[P.item].prep.method][1] + ' — chạm vào thớt · tap the station';
  else if (P.stage === 'done') { tip.textContent = 'Cho vào tô · Tap the bowl'; P.el.querySelector(`.bowl[data-k="${INGREDIENTS[P.item].prep.to}"]`)?.classList.add('target'); }
}
function setStation(method) {
  const st = P.el.querySelector('.prep-station');
  st.className = 'prep-station ' + METHOD[method][0];
}
function tapRaw(k, btn) {
  if (P.stage !== 'empty') { if (P.stage === 'placed' && P.item !== k) { /* swap */ } else { sfx('error'); return; } }
  if (pantry(k) <= 0) { sfx('error'); btn.classList.add('shake'); setTimeout(() => btn.classList.remove('shake'), 300); toast({ text: `Hết ${INGREDIENTS[k].vi}`, sub: 'Buy more at the supermarket', bad: true }); return; }
  P.item = k; P.stage = 'placed'; P.anim = 0; P.cuts = 0;
  P.batch = Math.min(PREP_BATCH, pantry(k));
  setStation(INGREDIENTS[k].prep.method);
  sfx('pop');
  flyIcon(k, btn, P.el.querySelector('.prep-station'), { size: 56, dur: 320 });
  hint();
}
function tapStation() {
  if (P.stage !== 'placed') { if (P.stage === 'empty') sfx('error'); return; }
  const m = INGREDIENTS[P.item].prep.method;
  P.stage = 'done'; P.anim = 0; P.chopT = 0.35;
  sfx(m === 'grill' || m === 'fry' ? 'sizzle' : m === 'boil' ? 'splash' : 'chop');
  if (m === 'chop' || m === 'split' || m === 'scoop') { setTimeout(() => sfx('chop'), 90); setTimeout(() => sfx('chop'), 180); }
  for (let i = 0; i < 14; i++) P.parts.push({ x: 0, y: 0, vx: (Math.random() - 0.5) * 220, vy: -80 - Math.random() * 140, life: 0, col: m === 'grill' || m === 'fry' ? '#ffffff' : ['#ffe07a', '#b9e08a', '#fff'][i % 3], smoke: m === 'grill' || m === 'fry' });
  hint();
}
function tapBowl(to, bowlEl) {
  if (P.stage !== 'done' || INGREDIENTS[P.item].prep.to !== to) { sfx('error'); return; }
  const n = P.batch;
  addPantry(P.item, -n);
  const b = bizOf(P.bizId);
  b.prepped[to] = (b.prepped[to] || 0) + n;
  markDirty(true);
  flyIcon(to, P.el.querySelector('.prep-station'), bowlEl, { size: 56, dur: 330 }).then(() => { if (!P) return; bowlEl.classList.remove('pop'); void bowlEl.offsetWidth; bowlEl.classList.add('pop'); });
  sfx('pop'); setTimeout(() => sfx('coin'), 300);
  bus.emit('prepped', P.bizId, to, n);
  if (!flag('prepAllUnlocked')) { setFlag('prepAllUnlocked'); setTimeout(() => { if (!P) return; P.el.querySelector('.all').classList.remove('hidden'); toast({ text: 'Mở khóa: Sơ chế hết', sub: 'Tip: "Prep all" does every batch in one tap.' }); }, 600); }
  P.stage = 'empty'; P.item = null;
  build();
}
async function prepAll() {
  if (P.stage !== 'empty') return;
  const b = bizOf(P.bizId);
  let any = false;
  for (const k of P.raws) {
    const n = pantry(k); if (n <= 0) continue;
    any = true;
    const to = INGREDIENTS[k].prep.to;
    addPantry(k, -n); b.prepped[to] = (b.prepped[to] || 0) + n;
    const bowl = P.el.querySelector(`.bowl[data-k="${to}"]`), raw = P.el.querySelector(`.ing[data-k="${k}"]`);
    flyIcon(k, raw, P.el.querySelector('.prep-station'), { size: 50, dur: 260 });
    await new Promise(r => setTimeout(r, 200)); if (!P) return;
    sfx('chop');
    flyIcon(to, P.el.querySelector('.prep-station'), bowl, { size: 50, dur: 280 });
    await new Promise(r => setTimeout(r, 180)); if (!P) return;
    bus.emit('prepped', P.bizId, to, n);
  }
  markDirty(true);
  if (!any) { sfx('error'); toast({ text: 'Không còn gì để sơ chế', sub: 'Nothing left to prep', ms: 1600 }); }
  else sfx('success');
  build();
}

export function updatePrep(dt, t) {
  if (!P) return;
  P.t += dt; P.anim = Math.min(1, P.anim + dt * 4); P.chopT = Math.max(0, P.chopT - dt);
  const c = P.c, cv = P.cv;
  c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, cv.width, cv.height);
  c.save(); c.translate(cv.width / 2, cv.height / 2 + 6); c.lineJoin = 'round'; c.lineCap = 'round';
  if (P.item) {
    const g = INGREDIENTS[P.item];
    const id = P.stage === 'done' ? g.prep.to : P.item;
    // squash-and-stretch when landing / after the cut
    const k = P.anim, sq = 1 + Math.sin(k * Math.PI) * 0.22 * (1 - k);
    c.scale(3.8 * sq, 3.8 / sq);
    c.translate(0, -(1 - k) * 6);
    ICONS[id]?.(c, P.t);
    c.setTransform(1, 0, 0, 1, 0, 0); c.translate(cv.width / 2, cv.height / 2);
    // knife flash while chopping
    if (P.chopT > 0 && (g.prep.method === 'chop' || g.prep.method === 'split' || g.prep.method === 'scoop')) {
      const a = Math.floor(P.chopT * 30) % 2;
      c.save(); c.rotate(-0.5); c.translate(40, -40 - a * 16); c.scale(3, 3); ICONS.knife(c); c.restore();
    }
    if (P.stage === 'done' && (g.prep.method === 'grill' || g.prep.method === 'fry')) {
      for (let i = 0; i < 3; i++) { const kk = (P.t * 0.8 + i / 3) % 1; c.globalAlpha = 0.45 * (1 - kk); circ(c, -40 + i * 40, -30 - kk * 60, 8 + kk * 10, '#fff', null); } c.globalAlpha = 1;
    }
  }
  for (const p of P.parts) { p.life += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 420 * dt; c.globalAlpha = Math.max(0, 1 - p.life / 0.7); if (p.smoke) circ(c, p.x * 0.4, p.y * 0.4 - 20 - p.life * 60, 5 + p.life * 16, 'rgba(255,255,255,.7)', null); else circ(c, p.x, p.y, 3.4, p.col, INK, 0.6); }
  c.globalAlpha = 1;
  P.parts = P.parts.filter(p => p.life < 0.7);
  c.restore();
}
