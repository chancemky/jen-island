// Order counter, modelled on the reference: customer portrait + speech bubble
// with the order and a patience bar, the queue up top, the drink/food being
// assembled on the board, option toggles (size / sugar / ice / topping / chili)
// and ingredient trays with stock counts. Taps fly ingredients onto the board.

import { G, T, bizOf } from '../systems/state.js';
import { RECIPES, STATION, OPTIONS, PREPPED, INGREDIENTS, BUSINESSES, ingName, stationLabel, recipeName, bizName } from '../data/game.js';
import { rt, stockOf, takeStock, evaluate, completeOrder, failOrder, bizRecipes, openBiz, canMake, orderText } from '../systems/business.js';
import { drawCup, DISHES, ICONS, iconURL, drawIcon } from '../gfx/food.js';
import { drawHuman, EL } from '../gfx/character.js';
import { INK, ell, circ, box, shadow } from '../gfx/draw.js';
import { sfx } from '../core/audio.js';
import { escapeHtml, money, bus, clamp, TAU, clock } from '../core/util.js';
import { h, flyIcon, flyCoins } from './sheets.js';
import { toast } from './hud.js';
import { releaseJoystick } from '../core/input.js';

const EXTRA_LAYERS = { beans: { color: '#a8423a', h: 0.3 }, coconut_milk: { color: '#fffaf0', h: 0.22 } };
const ICE_LEVEL = { 'không đá': 0, 'ít đá': 1, 'đá bình thường': 2 };

let S = null; // active session

export function isServiceOpen() { return !!S; }
export function openService(bizId, { onClose, tutorial = false, single = null } = {}) {
  if (S) return;
  releaseJoystick();
  const root = document.getElementById('sheets');
  const el = h('div', 'svc');
  el.innerHTML = `
    <div class="svc-awning"></div>
    <div class="svc-top"><div class="svc-queue"></div><div class="svc-clock"><span class="sun"></span><b class="clk"></b></div><div class="svc-money"><span class="coin"></span><b class="m"></b></div><button class="svc-close" type="button" aria-label="Close">✕</button></div>
    <div class="svc-customer"><div class="svc-portrait"><canvas width="216" height="248"></canvas></div><div class="svc-bubble"><div class="svc-order"></div><div class="svc-chips"></div><div class="patience"><span>${T('PATIENCE', 'KIÊN NHẪN')}</span><div class="bar"><i></i></div></div></div><div class="svc-waiting hidden"></div></div>
    <div class="svc-counter">
      <div class="svc-label">${escapeHtml(bizName(bizId).toUpperCase())}</div>
      <div class="svc-work"><div class="svc-board"><canvas width="300" height="300"></canvas><div class="svc-steps"></div></div><div class="svc-opts"></div></div>
      <div class="svc-grid"></div>
      <div class="svc-bottom"><button class="btn trash" type="button" aria-label="Start over">↺</button><button class="btn pink serve" type="button">${T('Serve', 'Phục vụ')}</button></div>
    </div>`;
  root.appendChild(el);
  G.runtime.serviceOpen = bizId;
  document.body.classList.add('sheet-open');
  S = {
    bizId, el, onClose, tutorial, cust: null, asm: null, t: 0, react: null, talkT: 0,
    portrait: el.querySelector('.svc-portrait canvas'), board: el.querySelector('.svc-board canvas'),
    busy: false, leaving: false, single,
  };
  S.pc = S.portrait.getContext('2d'); S.bc = S.board.getContext('2d');
  el.querySelector('.svc-close').onclick = () => closeService();
  el.querySelector('.trash').onclick = () => { if (!S.asm || S.busy) return; sfx('whoosh'); resetAsm(); };
  el.querySelector('.serve').onclick = () => serve();
  buildGrid();
  resetAsm();
  sfx('page');
}
export function closeService() {
  if (!S) return;
  const s = S; S = null;
  G.runtime.serviceOpen = null;
  document.body.classList.remove('sheet-open');
  sfx('back');
  s.el.classList.add('out');
  setTimeout(() => s.el.remove(), 210);
  if (s.cust && s.cust.state === 'ordering') s.cust.state = 'waiting';
  s.onClose?.();
}

// ---------------------------------------------------------------- building UI
function stationKeys() {
  const keys = new Set();
  for (const r of bizRecipes(S.bizId)) for (const st of RECIPES[r].steps) keys.add(st);
  return [...keys];
}
function buildGrid() {
  const grid = S.el.querySelector('.svc-grid');
  grid.innerHTML = '';
  const keys = stationKeys();
  const cols = keys.length <= 5 ? 5 : keys.length <= 6 ? 6 : Math.ceil(keys.length / 2);
  grid.style.gridTemplateColumns = `repeat(${Math.min(cols, 6)}, 1fr)`;
  S.el.classList.toggle('rows2', keys.length > 6);
  for (const k of keys) {
    const st = STATION[k];
    const b = h('button', 'ing' + (st.action ? ' act' : ''));
    b.type = 'button'; b.dataset.k = k;
    b.innerHTML = `<div class="tray"><img src="${iconURL(st.icon, 56)}" alt=""></div><b>${escapeHtml(stationLabel(k))}</b>${st.uses ? '<span class="cnt"></span>' : ''}`;
    b.addEventListener('pointerdown', e => { e.preventDefault(); tapIngredient(k, b); });
    grid.appendChild(b);
  }
  refreshCounts();
}
function refreshCounts() {
  for (const b of S.el.querySelectorAll('.ing')) {
    const st = STATION[b.dataset.k];
    if (!st.uses) continue;
    const n = stockOf(S.bizId, st.uses);
    b.querySelector('.cnt').textContent = n;
    b.classList.toggle('out', n <= 0);
    b.classList.toggle('low', n > 0 && n <= 2);
  }
}
function buildOptions() {
  const box = S.el.querySelector('.svc-opts');
  box.innerHTML = '';
  const R = S.cust ? RECIPES[S.cust.order.recipe] : null;
  const keys = R ? R.options : [];
  if (!keys.length) { box.appendChild(h('div', '', `<small style="font-weight:900;opacity:.6;font-size:12px">${R ? escapeHtml(R.en) : ''}</small>`)); }
  for (const k of keys) {
    const o = OPTIONS[k];
    const row = h('div', 'opt-row');
    row.innerHTML = `<small>${escapeHtml(T(o.en || o.label, o.label))}</small>`;
    const seg = h('div', 'seg'); seg.dataset.k = k;
    for (const v of o.values) {
      const b = h('button', '', escapeHtml(k === 'sugar' ? v + '%' : o.btn ? T(o.btn[v][0], o.btn[v][1]) : v));
      b.type = 'button';
      b.onclick = () => setOption(k, v, seg, b);
      seg.appendChild(b);
    }
    row.appendChild(seg); box.appendChild(row);
  }
  markOptions();
}
function markOptions() {
  for (const seg of S.el.querySelectorAll('.seg[data-k]')) {
    const k = seg.dataset.k, vals = OPTIONS[k].values;
    [...seg.children].forEach((b, i) => b.classList.toggle('on', S.asm[k] === vals[i]));
  }
}
function setOption(k, v, seg, b) {
  if (S.busy) return;
  if (k === 'size' && S.asm.steps.length) { /* allow changing size mid-way */ }
  const uses = OPTIONS[k].uses;
  if (uses && v !== 'không đá' && v !== 'không ớt' && stockOf(S.bizId, uses) <= 0) { sfx('error'); seg.classList.add('shake'); setTimeout(() => seg.classList.remove('shake'), 300); toast({ text: T(`Out of ${ingName(uses).toLowerCase()}!`, `Hết ${ingName(uses).toLowerCase()}!`), bad: true }); return; }
  S.asm[k] = v;
  if (k === 'ice') S.asm.iceTouched = true;
  if (k === 'topping' && v !== 'none' && stockOf(S.bizId, v) <= 0) { S.asm[k] = 'none'; sfx('error'); toast({ text: T('Out of that topping', 'Hết topping này rồi'), bad: true }); }
  sfx(k === 'ice' ? 'ice' : k === 'sugar' ? 'pour' : 'tap');
  wobble();
  markOptions(); updateChips(); updateHint();
}

function resetAsm() {
  S.asm = { steps: [], size: null, sugar: undefined, ice: undefined, topping: undefined, chili: undefined, anim: [], blended: false, servedAnim: 0 };
  if (S.cust && RECIPES[S.cust.order.recipe].options.includes('topping')) S.asm.topping = 'none';
  if (S.cust && RECIPES[S.cust.order.recipe].options.includes('ice')) S.asm.ice = 'không đá';   // no ice unless the order asks for it
  S.el.querySelector('.svc-steps').innerHTML = '';
  if (S.cust) buildSteps();
  markOptions?.(); updateChips(); updateHint();
}
function buildSteps() {
  const box = S.el.querySelector('.svc-steps');
  const R = RECIPES[S.cust.order.recipe];
  box.innerHTML = R.steps.map(() => '<i></i>').join('');
  [...box.children].forEach((d, i) => d.classList.toggle('on', i < S.asm.steps.length));
}

// ---------------------------------------------------------------- tapping
function tapIngredient(k, btnEl) {
  if (S.busy || !S.cust || S.cust.state === 'walking') { sfx('error'); return; }
  const st = STATION[k], R = RECIPES[S.cust.order.recipe];
  if (R.options.includes('size') && !S.asm.size) {
    sfx('error');
    const seg = S.el.querySelector('.seg[data-k="size"]'); seg?.classList.add('shake'); setTimeout(() => seg?.classList.remove('shake'), 300);
    toast({ text: T('Pick a cup size first!', 'Chọn size ly trước!'), ms: 1600 });
    return;
  }
  if (S.asm.steps.length >= 7) { sfx('error'); return; }
  // after midnight you're sleepy: sometimes your hand grabs the wrong thing
  if (G.runtime.sleepy && Math.random() < 0.25) {
    const others = stationKeys().filter(x => x !== k && (!STATION[x].uses || stockOf(S.bizId, STATION[x].uses) > 0));
    if (others.length) { k = others[Math.floor(Math.random() * others.length)]; toast({ text: T('So sleepy… grabbed the wrong thing!', 'Buồn ngủ quá… lấy nhầm rồi!'), icon: 'sleep_moon', ms: 1600 }); btnEl = S.el.querySelector(`.ing[data-k="${k}"]`) || btnEl; }
  }
  const st2 = STATION[k];
  if (st2.uses && !takeStock(S.bizId, st2.uses)) {
    sfx('error'); btnEl.classList.add('shake'); setTimeout(() => btnEl.classList.remove('shake'), 300);
    toast({ text: T(`Out of ${stationLabel(k).toLowerCase()}!`, `Hết ${stationLabel(k).toLowerCase()}!`), sub: T('Prep or restock', 'Sơ chế hoặc mua thêm'), bad: true, ms: 1800 });
    return;
  }
  S.asm.steps.push(k);
  S.asm.anim.push(0);
  if (k === 'blend') { S.asm.blended = true; S.asm.blendT = 0.8; sfx('blend'); }
  else if (st2.layer) sfx('pour'); else if (k === 'roll' || k === 'fold') sfx('whoosh'); else if (k === 'grill') sfx('sizzle'); else sfx('pop');
  flyIcon(st2.icon, btnEl, S.board, { size: 44, dur: 360 }).then(() => wobble());
  refreshCounts();
  const dots = S.el.querySelector('.svc-steps').children;
  const i = S.asm.steps.length - 1;
  if (dots[i]) { dots[i].classList.add('on'); if (R.steps[i] !== k) dots[i].classList.add('bad'); }
  updateHint();
}
function wobble() { const b = S?.el.querySelector('.svc-board'); if (!b) return; b.classList.remove('wobble'); void b.offsetWidth; b.classList.add('wobble'); }

function serve() {
  if (S.busy || !S.cust) return;
  if (!S.asm.steps.length) { sfx('error'); toast({ text: T('Build the order first!', 'Chưa làm gì cả!'), ms: 1400 }); return; }
  const c = S.cust, R = RECIPES[c.order.recipe];
  // missing required option choices
  for (const k of R.options) if (S.asm[k] === undefined || S.asm[k] === null) {
    sfx('error'); const seg = S.el.querySelector(`.seg[data-k="${k}"]`); seg?.classList.add('shake'); setTimeout(() => seg?.classList.remove('shake'), 300);
    toast({ text: T(`Choose the ${(OPTIONS[k].en || OPTIONS[k].label).toLowerCase()} first`, `Chưa chọn ${OPTIONS[k].label.toLowerCase()}`), ms: 1600 });
    return;
  }
  // consume option stock (sugar, ice, topping, chili)
  const optUse = [];
  if (R.options.includes('sugar') && S.asm.sugar) optUse.push('sugar');
  if (R.options.includes('ice') && S.asm.ice !== 'không đá') optUse.push('ice');
  if (S.asm.topping && S.asm.topping !== 'none') optUse.push(S.asm.topping);
  if (S.asm.chili === 'có ớt') optUse.push('chili');
  for (const u of optUse) if (stockOf(S.bizId, u) <= 0) { sfx('error'); toast({ text: T(`Out of ${ingName(u).toLowerCase()}!`, `Hết ${ingName(u).toLowerCase()}!`), bad: true }); return; }
  for (const u of optUse) takeStock(S.bizId, u);
  refreshCounts();
  S.asm.triedServe = true;
  const res = evaluate(c.order, S.asm);
  S.busy = true;
  S.asm.servedAnim = 0.001;
  if (S.single) {
    const one = S.single;
    if (res.q === 'wrong') { verdict(T('Oops… not quite!', 'Ơ… chưa đúng!'), hintFor(res, c.order), 'bad'); sfx('sad'); S.react = { emo: 'sad', t: 1.2 }; one.onResult(res.q); setTimeout(() => { if (S) { S.busy = false; resetAsm(); } }, 1000); return; }
    verdict(res.q === 'perfect' ? T('Perfect!', 'Hoàn hảo!') : T('Delicious!', 'Ngon lắm!'), T('Dish ready', 'Món đã xong'), res.q); sfx('success');
    S.react = { emo: 'love', t: 1.4 }; one.done = true; one.onResult(res.q);
    setTimeout(() => { if (S) closeService(); }, 1100);
    return;
  }
  if (res.q === 'wrong') {
    verdict(T('Oops… not quite!', 'Ơ… chưa đúng!'), hintFor(res, c.order), 'bad');
    S.react = { emo: 'sad', t: 1.5 };
    sfx('sad');
    failOrder(c);
    bus.emit('service:wrong', c);
    setTimeout(() => { if (!S) return; S.busy = false; if (S.cust === c && c.state !== 'leaving') resetAsm(); else nextCustomer(); }, 1100);
    return;
  }
  const { price, tip } = completeOrder(c, res.q);
  S.react = { emo: res.q === 'perfect' ? 'love' : 'happy', t: 1.6 };
  verdict(res.q === 'perfect' ? T('Perfect!', 'Hoàn hảo!') : T('Delicious!', 'Ngon lắm!'), `+${price}k${tip ? T(` · tip ${tip}k`, ` · boa ${tip}k`) : ''}`, res.q);
  sfx(res.q === 'perfect' ? 'success' : 'cash'); setTimeout(() => sfx('cash'), 300);
  flyCoins(S.portrait, document.querySelector('.svc-money'), res.q === 'perfect' ? 8 : 5);
  if (S.tutorial) bus.emit('tutorial:served');
  const leaving = c;
  setTimeout(() => {
    if (!S) return;
    S.el.querySelector('.svc-portrait').classList.add('leave');
    setTimeout(() => { if (!S) return; S.busy = false; if (S.cust === leaving) S.cust = null; nextCustomer(); }, 420);
  }, 900);
}
function hintFor(res, order) {
  if (res.why === 'options') {
    const k = res.mism[0];
    return T({ size: 'Wrong cup size', sugar: 'Wrong amount of sugar', ice: 'Wrong amount of ice', topping: 'Wrong topping', chili: 'Chili isn\'t right' }[k], { size: 'Sai size ly', sugar: 'Sai lượng đường', ice: 'Sai lượng đá', topping: 'Sai topping', chili: 'Ớt chưa đúng' }[k]);
  }
  return T('Missing or extra ingredients', 'Thiếu hoặc thừa nguyên liệu');
}
function verdict(big, small, q) {
  const v = h('div', 'verdict', `<b>${escapeHtml(big)}</b>${small ? `<small>${escapeHtml(small)}</small>` : ''}`);
  if (q === 'bad') v.querySelector('b').style.color = '#ffd6cf';
  if (q === 'perfect') { v.querySelector('b').style.color = '#ffe07a'; }
  S.el.appendChild(v);
  setTimeout(() => v.remove(), 1250);
}

// ---------------------------------------------------------------- customer flow
function frontCustomer() {
  if (S.single) return S.single.done ? null : S.single;
  const q = rt(S.bizId).queue;
  return q.find(c => c.slot === 0 && (c.state === 'waiting' || c.state === 'ordering')) || null;
}
function nextCustomer() {
  const c = frontCustomer();
  if (c === S.cust) return;
  S.cust = c;
  const port = S.el.querySelector('.svc-portrait');
  port.classList.remove('leave', 'in'); void port.offsetWidth;
  if (c) {
    port.classList.add('in');
    if (c.state === 'waiting') c.state = 'ordering';
    S.talkT = 1.4; S.react = null;
    sfx(c.personality === 'tourist' ? 'blip' : 'pop');
  }
  resetAsm(); buildOptions(); renderOrder();
}
function renderOrder() {
  const c = S.cust;
  const bubble = S.el.querySelector('.svc-bubble'), wait = S.el.querySelector('.svc-waiting');
  if (!c) {
    bubble.classList.add('hidden'); wait.classList.remove('hidden');
    const b = bizOf(S.bizId);
    if (!b.open) {
      wait.innerHTML = T('The shop is closed.', 'Quán đang đóng cửa.') + '<br><br>';
      const ob = h('button', 'btn gold', T('Open the shop', 'Mở cửa')); ob.type = 'button';
      ob.onclick = () => { const r = openBiz(S.bizId); if (!r.ok) toast({ text: r.why.split('\n')[0], sub: r.why.split('\n')[1] || '', bad: true }); renderOrder(); };
      wait.appendChild(ob);
    } else if (rt(S.bizId).queue.some(c => c.state === 'walking')) wait.innerHTML = T('A customer is on the way…', 'Có khách đang tới!');
    else wait.innerHTML = T('Waiting for the next customer…', 'Đang chờ khách…');
    S.el.querySelector('.svc-portrait').style.visibility = 'hidden';
    return;
  }
  S.el.querySelector('.svc-portrait').style.visibility = '';
  bubble.classList.remove('hidden'); wait.classList.add('hidden');
  const txt = escapeHtml(c.order.text || orderText(c.order, c)).replace(/\*(.+?)\*/g, '<em>$1</em>');
  const reg = G.state.regulars[c.key]?.visits >= 3;
  S.el.querySelector('.svc-order').innerHTML = `<b style="font-size:12px;opacity:.6">${escapeHtml(c.name)}${reg ? T(' · regular ♥', ' · khách quen ♥') : c.personality === 'tourist' ? T(' · tourist', ' · du khách') : ''}</b><br>${txt}`;
  updateChips();
}
function updateChips() {
  if (!S?.cust) return;
  const o = S.cust.order, chips = S.el.querySelector('.svc-chips');
  const R = RECIPES[o.recipe];
  const parts = [[recipeName(o.recipe), S.asm.steps.length ? (S.asm.steps.every((s, i) => R.steps[i] === s) ? (S.asm.steps.length === R.steps.length ? 'done' : '') : 'bad') : '']];
  for (const k of R.options) {
    const want = o.opts[k], have = S.asm[k];
    const up = x => x.replace(/^./, ch => ch.toUpperCase());
    const label = k === 'size' ? 'Size ' + want : k === 'sugar' ? T(want + '% sugar', want + '% đường') : up(T(OPTIONS[k].say[want][0], OPTIONS[k].say[want][1]));
    const untouched = k === 'ice' && !S.asm.iceTouched && !S.asm.triedServe;
    parts.push([label, have === undefined || have === null || (untouched && have !== want) ? '' : have === want ? 'done' : 'bad']);
  }
  if (o.special) parts.push([T('★ Special', '★ Đặc biệt'), 'done']);
  chips.innerHTML = parts.map(([l, c]) => `<span class="${c}">${escapeHtml(l)}</span>`).join('');
}
// Tutorial: highlight what to tap next.
function updateHint() {
  if (!S) return;
  for (const b of S.el.querySelectorAll('.hint')) b.classList.remove('hint');
  if (!S.tutorial || !S.cust) return;
  const R = RECIPES[S.cust.order.recipe], o = S.cust.order;
  if (R.options.includes('size') && !S.asm.size) { markHint(`.seg[data-k="size"] button:nth-child(${OPTIONS.size.values.indexOf(o.opts.size) + 1})`); return; }
  const i = S.asm.steps.length;
  if (i < R.steps.length && S.asm.steps.every((s, k) => R.steps[k] === s)) { markHint(`.ing[data-k="${R.steps[i]}"]`); return; }
  for (const k of R.options) if (S.asm[k] !== o.opts[k]) { markHint(`.seg[data-k="${k}"] button:nth-child(${OPTIONS[k].values.indexOf(o.opts[k]) + 1})`); return; }
  markHint('.serve');
}
function markHint(sel) { const e = S.el.querySelector(sel); if (e) e.classList.add('hint'); }

// ---------------------------------------------------------------- per frame
export function updateService(dt, t) {
  if (!S) return;
  S.t += dt;
  S.el.querySelector('.svc-money .m').textContent = money(G.state.money);
  S.el.querySelector('.svc-clock .clk').textContent = clock(G.state.time);
  S.el.querySelector('.svc-clock .sun').classList.toggle('night', G.state.time >= 18.5 * 60);
  // pick up a new front customer
  const f = frontCustomer();
  if (!S.busy && f !== S.cust) nextCustomer();
  else if (!S.cust && !S.busy && (S.waitT = (S.waitT || 0) - dt) <= 0) { S.waitT = 0.5; renderOrder(); }
  if (S.cust && S.cust.state === 'waiting') S.cust.state = 'ordering';
  if (S.single && S.single.gone?.()) { closeService(); return; }
  if (S.cust && (S.cust.state === 'leaving') && !S.busy) { S.react = { emo: 'angry', t: 1 }; S.cust = null; setTimeout(() => S && nextCustomer(), 500); }
  // patience bar
  if (S.cust) {
    const k = S.cust.patienceRatio;
    const bar = S.el.querySelector('.patience .bar i');
    bar.style.width = (k * 100).toFixed(1) + '%';
    bar.className = k < 0.3 ? 'low' : k < 0.6 ? 'mid' : '';
  }
  drawQueue(t);
  drawPortrait(dt, t);
  drawBoard(dt, t);
}
function drawQueue(t) {
  const q = rt(S.bizId).queue.filter(c => c.state !== 'leaving');
  const box = S.el.querySelector('.svc-queue');
  const key = q.map(c => c.id).join(',');
  if (box.dataset.k !== key) {
    box.dataset.k = key;
    box.innerHTML = q.slice(0, 5).map((c, i) => `<div class="qface${i === 0 ? ' cur' : ''}" data-id="${c.id}"><canvas width="88" height="88"></canvas><svg viewBox="0 0 36 36"><circle cx="18" cy="18" r="16" fill="none" stroke="#86cf8a" stroke-width="3" stroke-dasharray="100.5" stroke-linecap="round"/></svg></div>`).join('');
    for (const el of box.children) {
      const c = q.find(x => x.id === el.dataset.id), cv = el.querySelector('canvas'), cc = cv.getContext('2d');
      cc.save(); cc.lineJoin = 'round'; cc.translate(44, 88 + 70 + EL * 4.1); cc.scale(4.1, 4.1); drawHuman(cc, { look: c.actor.look, dir: 'down', emo: 'neutral', blinkAmt: 0, moving: 0 }, 1); cc.restore();
    }
  }
  for (const el of box.children) {
    const c = q.find(x => x.id === el.dataset.id); if (!c) continue;
    const circle = el.querySelector('circle'), k = c.patienceRatio;
    circle.setAttribute('stroke-dashoffset', String(100.5 * (1 - k)));
    circle.setAttribute('stroke', k < 0.3 ? '#ef7a6a' : k < 0.6 ? '#f2c14e' : '#86cf8a');
  }
}
function drawPortrait(dt, t) {
  const c = S.pc, cv = S.portrait, cust = S.cust;
  c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, cv.width, cv.height);
  if (!cust) return;
  S.talkT = Math.max(0, S.talkT - dt);
  if (S.react) { S.react.t -= dt; if (S.react.t <= 0) S.react = null; }
  const k = cust.patienceRatio;
  const emo = S.react?.emo || (k < 0.25 ? 'angry' : k < 0.45 ? 'sad' : S.talkT > 0 ? 'neutral' : S.asm.steps.length ? 'think' : 'neutral');
  const a = { look: cust.actor.look, dir: 'down', moving: 0, walkPh: 0, seed: 1, emo, talking: S.talkT > 0.15, blinkAmt: (Math.sin(t * 1.3 + 1) > 0.985) ? 1 : 0, hop: S.react && (S.react.emo === 'love' || S.react.emo === 'happy') ? Math.abs(Math.sin(t * 9)) * 2 : 0, act: S.react?.emo === 'love' ? 'cheer' : k < 0.45 && !S.react ? 'wait' : null, actT: t, headTilt: S.asm.steps.length && !S.react ? Math.sin(t * 1.2) * 0.06 : 0 };
  c.save(); c.lineJoin = 'round'; c.lineCap = 'round';
  const sc = 6.3; c.translate(cv.width / 2, cv.height + 34 + EL * sc); c.scale(sc, sc);
  drawHuman(c, a, t);
  c.restore();
}

function drawBoard(dt, t) {
  const c = S.bc, cv = S.board;
  c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, cv.width, cv.height);
  if (!S.cust) return;
  const R = RECIPES[S.cust.order.recipe], asm = S.asm;
  for (let i = 0; i < asm.anim.length; i++) asm.anim[i] = Math.min(1, asm.anim[i] + dt * 3);
  if (asm.blendT > 0) asm.blendT -= dt;
  if (asm.servedAnim > 0) asm.servedAnim = Math.min(1, asm.servedAnim + dt * 2);
  c.save(); c.lineJoin = 'round'; c.lineCap = 'round';
  c.translate(cv.width / 2, cv.height / 2 + 14);
  const shake = asm.blendT > 0 ? Math.sin(t * 60) * 3 : 0;
  c.translate(shake, 0);
  if (R.vessel === 'cup' || R.vessel === 'glass') {
    const comp = { size: R.options.includes('size') ? (asm.size || 'M') : null, layers: [], bits: [], ice: 0, sugar: 0 };
    asm.steps.forEach((k, i) => {
      const st = STATION[k], L = st.layer || EXTRA_LAYERS[k];
      if (L) comp.layers.push({ ...L, anim: asm.anim[i] });
      if (st.bits) for (let n = 0; n < 3; n++) comp.bits.push({ kind: st.bits, float: st.bits !== 'jelly' });
    });
    // milk poured into tea swirls into one creamy colour
    if (asm.steps.includes('tea') && asm.steps.includes('milk')) { const tot = comp.layers.reduce((s, l) => s + l.h, 0); const k = Math.min(asm.anim[asm.steps.indexOf('milk')] || 0, 1); comp.layers = [{ color: k < 1 ? '#e2b27a' : '#d9b28a', h: tot, swirl: k < 1 }]; }
    if (asm.blended && asm.blendT <= 0) { const tot = comp.layers.reduce((s, l) => s + l.h, 0); comp.layers = [{ color: '#c5e08a', h: tot || 1 }]; }
    comp.ice = asm.ice === undefined ? 0 : ICE_LEVEL[asm.ice] ?? 0;
    if (R.vessel === 'glass' && asm.ice === undefined && !R.options.includes('ice')) comp.ice = 1;
    comp.sugar = asm.sugar || 0;
    if (asm.topping === 'tapioca') for (let n = 0; n < 5; n++) comp.bits.push({ kind: 'tapioca' });
    if (asm.topping === 'jelly') for (let n = 0; n < 4; n++) comp.bits.push({ kind: 'jelly' });
    if (asm.topping === 'cheese_foam') { comp.foam = true; comp.foamColor = '#fff4d0'; }
    if (!asm.size && R.options.includes('size')) { c.globalAlpha = 0.35; c.setLineDash([6, 6]); }
    if (asm.servedAnim > 0) { comp.lid = true; comp.straw = true; }
    c.scale(1.55, 1.55);
    drawCup(c, comp, t);
    c.setLineDash([]); c.globalAlpha = 1;
  } else {
    // food: base vessel, then the pile of added ingredients; the finished dish pops in when complete
    const done = asm.steps.length === R.steps.length && [...asm.steps].sort().join() === [...R.steps].sort().join();
    c.scale(3.6, 3.6);
    shadow(c, 0, 12, 22, 6, 0.18);
    if (done) {
      const k = Math.min(1, (asm.anim[asm.anim.length - 1] || 1));
      c.save(); c.scale(0.8 + 0.3 * k, 0.8 + 0.3 * k); (DISHES[R.icon] || ICONS[R.icon])?.(c, t); c.restore();
      if (k < 1) for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + t * 3; circ(c, Math.cos(a) * 20 * k, Math.sin(a) * 14 * k, 1.2, '#ffd35a', null); }
    } else {
      if (R.vessel === 'bowl' || R.vessel === 'pan' || R.vessel === 'grill') drawBase(c, R.vessel);
      else if (R.vessel === 'plate') { ell(c, 0, 4, 20, 10, '#fffdf5'); ell(c, 0, 3, 14, 7, null, 'rgba(91,63,54,.25)', 1); }
      asm.steps.forEach((k, i) => {
        const st = STATION[k]; if (st.action) return;
        const a = asm.anim[i], y = -2 - i * 3.2 - (1 - a) * 18, x = ((i * 7) % 11) - 5;
        c.save(); c.translate(x, y); c.scale(0.62, 0.62); c.globalAlpha = Math.min(1, a * 2);
        (ICONS[st.icon] || (() => {}))(c, t);
        c.restore();
      });
      if (!asm.steps.length) { c.globalAlpha = 0.35; c.save(); c.scale(0.9, 0.9); (DISHES[R.icon] || ICONS[R.icon])?.(c, t); c.restore(); c.globalAlpha = 1; }
    }
  }
  c.restore();
}
function drawBase(c, v) {
  if (v === 'bowl') { ell(c, 0, -2, 18, 6, '#fffdf6'); ell(c, 0, -2, 15, 4.5, '#f4efe4', null); c.beginPath(); c.moveTo(-18, -2); c.quadraticCurveTo(0, 20, 18, -2); c.fillStyle = '#fffdf6'; c.fill(); c.strokeStyle = INK; c.lineWidth = 1; c.stroke(); c.strokeStyle = '#6aa5d8'; c.beginPath(); c.moveTo(-14, 4); c.quadraticCurveTo(0, 12, 14, 4); c.stroke(); }
  else if (v === 'pan') { ell(c, 0, 0, 20, 10, '#4a4550'); ell(c, 0, -1, 17, 8, '#6b6572', null); c.strokeStyle = INK; c.lineWidth = 3; c.beginPath(); c.moveTo(18, 2); c.lineTo(32, 8); c.stroke(); }
  else if (v === 'grill') { box(c, -20, -6, 40, 14, 3, '#4a4550'); for (let x = -16; x <= 16; x += 5) { c.strokeStyle = '#8f9aa3'; c.lineWidth = 1; c.beginPath(); c.moveTo(x, -6); c.lineTo(x, 8); c.stroke(); } }
}
export { canMake };
