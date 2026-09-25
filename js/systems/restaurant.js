// The restaurant: the only business with employees. Everything is physical
// and visible — guests walk in and sit, servers take orders and carry plates,
// cooks work the stoves, cleaners wipe tables, the cashier deposits takings.
// Without staff the player does those jobs (take orders, collect the register,
// clear tables). With a full team it runs while you're elsewhere.

import { G, T, bizOf, addMoney, addRep, markDirty, unlockAchievement } from './state.js';
import { Interior } from '../world/interiors.js';
import { Grid } from '../world/scene.js';
import { Actor } from '../world/actor.js';
import { F } from '../gfx/furniture.js';
import { DISHES, ICONS } from '../gfx/food.js';
import { INK, ell, circ, box, text } from '../gfx/draw.js';
import { RECIPES, BUSINESSES, ROLES, TRAITS, EMPLOYEE_NAMES, PERSONALITIES, RECIPE_UPGRADES } from '../data/game.js';
import { visitorLook, employeeLook } from '../data/looks.js';
import { addXP } from './progress.js';
import { rand, randi, choice, chance, dist, bus, clamp, rng } from '../core/util.js';
import { canMake, takeStock, recipeUses, bizRecipes, recipePrice } from './business.js';
import { PREPPED, INGREDIENTS } from '../data/game.js';
import { sfx } from '../core/audio.js';
import { fx } from '../world/render.js';

const TABLES = [[84, 214], [176, 214], [268, 214], [84, 290], [176, 290], [268, 290], [352, 214], [352, 290]];
const STOVES = [[96, 112], [156, 112]];
const PREP = [236, 112], SINK = [316, 112];
const PASS_SLOTS = [[60, 148], [100, 148], [140, 148], [180, 148], [220, 148], [260, 148]];
const REGISTER = [60, 332], BREAK = [364, 346], ENTRY_WAIT = [[236, 352], [252, 336], [268, 352]];

export function buildRestaurant() {
  const r = new Interior({ id: 'restaurant', name: 'Nhà hàng', w: 420, h: 380, WH: 72, wall: '#f7e0b8', wall2: '#f0d4a4', floor: '#c98f5a', door: { x: 210, w: 34 }, building: 'restaurant', fitW: 440 });
  r.wallItem('window', 360, { w: 44, h: 26, hgt: 58, curtain: '#e8584e' });
  r.wallItem('painting', 290);
  r.wallItem('bunting', 250, { w: 300, cols: ['#e8584e', '#ffd35a', '#e8584e', '#fff5df'] });
  r.wallItem('familyPhoto', 330); r.wallItem('wallShelf', 250);
  r.furn('mat', 150, 150, { w: 296, h: 78, col: '#e9e1d4' });            // kitchen tiles
  r.furn('rug', 210, 318, { w: 260, h: 96, col: '#efbf9c' });           // dining room carpet
  const lv = n => () => (bizOf('restaurant').level || 1) < n;
  r.furn('koi', 380, 330, { hidden: lv(4) });
  r.furn('bonsai', 40, 330, { hidden: lv(4) });
  r.furn('piano', 380, 250, { hidden: lv(5) });
  for (const [x, y] of STOVES) r.furn('stove', x, y, { w: 50, on: () => (G.runtime.rest?.cooking?.[x] || 0) > 0 }, [-25, -28, 50, 26]);
  r.furn('prepTable', PREP[0], PREP[1], { w: 56 }, [-28, -28, 56, 26]);
  r.furn('sink', SINK[0], SINK[1], { w: 46 }, [-23, -28, 46, 26]);
  r.furn('shelfJars', 30, 72, { w: 44, cols: ['#e2b270', '#e7784a', '#fbf3df', '#c96b45'] });
  // the pass: long counter between kitchen and dining room
  const pass = r.furn('pass', 160, 160, { w: 260 }, [-130, -20, 260, 20]);
  pass.sortY = 160;
  r.passProp = pass;
  r.furn('register', REGISTER[0], REGISTER[1] - 2, {});
  r.furn('pass', REGISTER[0], REGISTER[1] + 10, { w: 44 }, [-22, -18, 44, 18]);
  r.furn('cashBox', REGISTER[0] + 12, REGISTER[1] - 6, { amount: () => bizOf('restaurant').register });
  r.furn('chair', BREAK[0], BREAK[1], { col: '#9fd8c8' });
  r.furn('plant', 396, 250, { s: 1.1 }, [-6, -6, 12, 6]);
  r.furn('plant', 24, 250, { s: 1.1 }, [-6, -6, 12, 6]);
  r.furn('lantern', 130, 200, {}); r.furn('lantern', 290, 200, {});
  r.tables = TABLES.map(([x, y], i) => ({ i, x, y, seats: [{ x: x - 20, y: y + 4, dir: 'right', cust: null }, { x: x + 20, y: y + 4, dir: 'left', cust: null }], dirty: false, dishes: [], props: [] }));
  r.tableProps = [];
  for (const t of r.tables) {
    const tp = r.furn('table', t.x, t.y + 6, { w: 30, cloth: '#fff5df', col: '#b77a4f' });
    const c1 = r.furn('chair', t.seats[0].x, t.seats[0].y - 2, { noBack: true, col: '#c88a52' });
    const c2 = r.furn('chair', t.seats[1].x, t.seats[1].y - 2, { noBack: true, col: '#c88a52' });
    const deco = r.prop({ x: t.x, y: t.y + 7, sortY: t.y + 7, draw: (c, tt) => drawTableTop(c, tt, t), cull: { x: t.x - 30, y: t.y - 30, w: 60, h: 40 } });
    t.props = [tp, c1, c2, deco];
    t.solid = r.solid(t.x - 15, t.y - 4, 30, 12, { table: t.i });
  }
  r.trigger({ id: 'register', kind: 'act', x: REGISTER[0] - 24, y: REGISTER[1] - 34, w: 48, h: 26, label: 'Thu tiền', en: 'Collect', icon: 'coin', action: 'collectRegister', enabled: () => bizOf('restaurant').register > 0 });
  r.trigger({ id: 'prep', kind: 'act', x: PREP[0] - 30, y: PREP[1], w: 60, h: 22, label: 'Sơ chế', en: 'Prep', icon: 'knife', action: 'prep' });
  r.trigger({ id: 'staff', kind: 'act', x: 316, y: 318, w: 84, h: 44, label: 'Nhân viên', en: 'Staff', icon: 'person', action: 'staff' });
  r.trigger({ id: 'menu', kind: 'act', x: 8, y: 70, w: 50, h: 40, label: 'Thực đơn', en: 'Menu', icon: 'menu', action: 'menu' });
  r.trigger({ id: 'stove', kind: 'act', x: 66, y: 118, w: 120, h: 22, label: 'Nấu món', en: 'Cook', icon: 'grill', action: 'cookTicket', enabled: () => !staffByRole('cook').length && restRT().tickets.some(t => !t.claimed) });
  r.trigger({ id: 'pass', kind: 'act', x: 30, y: 160, w: 260, h: 24, label: 'Mang món', en: 'Deliver', icon: 'plate', action: 'deliverDish', enabled: () => !staffByRole('server').length && restRT().pass.some(p => !p.claimed) });
  r.applyLevel = () => {
    const n = BUSINESSES.restaurant.upgrades?.[bizOf('restaurant').level]?.tables || BUSINESSES.restaurant.tables;
    r.tables.forEach((t, i) => { const on = i < n; t.active = on; t.props.forEach(p => p.hidden = () => !t.active); t.solid.off = !on; });
    r.grid = new Grid(r, 10, 5);
  };
  r.applyLevel();
  return r;
}
function drawTableTop(c, t, table) {
  if (!table.active) return;
  if (table.dirty) { ell(c, -6, -20, 5, 2, '#f4efe4', INK, 0.6); ell(c, 5, -21, 4, 1.6, '#f4efe4', INK, 0.6); circ(c, 8, -24, 1.4, '#b8a898', null); }
  for (const [i, d] of table.dishes.entries()) { c.save(); c.translate(i ? 7 : -7, -21); c.scale(0.34, 0.34); (DISHES[RECIPES[d]?.icon] || ICONS.plate)(c, t); c.restore(); }
}

// ---------------------------------------------------------------- runtime
export function restRT() {
  G.runtime.rest ||= { guests: [], tickets: [], pass: [], staff: new Map(), cooking: {}, spawnT: 5, depositT: 30 };
  return G.runtime.rest;
}
const scene = () => G.scenes.restaurant;

// ---------------------------------------------------------------- hiring
export function candidates() {
  const s = G.state, r = restRT();
  if (r.candDay !== s.day) {
    r.candDay = s.day;
    const R = rng(s.day * 97 + 13);
    r.cands = Array.from({ length: 3 }, (_, i) => {
      const seed = Math.floor(R() * 1e6);
      const st = { speed: 1 + Math.floor(R() * 5), cooking: 1 + Math.floor(R() * 5), service: 1 + Math.floor(R() * 5), reliability: 1 + Math.floor(R() * 5) };
      const total = st.speed + st.cooking + st.service + st.reliability;
      return { id: 'e' + seed, seed, name: EMPLOYEE_NAMES[Math.floor(R() * EMPLOYEE_NAMES.length)], stats: st, trait: TRAITS[Math.floor(R() * TRAITS.length)].id, wage: 20 + total * 4, fee: 60 + total * 12, role: null };
    });
  }
  return r.cands.filter(c => !bizOf('restaurant').employees.some(e => e.id === c.id));
}
export function hire(cand, role) {
  const b = bizOf('restaurant');
  const e = { ...cand, role, hiredDay: G.state.day };
  b.employees.push(e);
  addMoney(-cand.fee, 'hire');
  spawnStaff(e);
  unlockAchievement('first_hire');
  const roles = new Set(b.employees.map(x => x.role));
  if (['cook', 'server', 'cleaner', 'cashier', 'prep'].every(r => roles.has(r))) unlockAchievement('full_team');
  markDirty(true);
  bus.emit('hired', e);
}
export function fire(id) {
  const b = bizOf('restaurant');
  const i = b.employees.findIndex(e => e.id === id);
  if (i < 0) return;
  b.employees.splice(i, 1);
  const a = restRT().staff.get(id);
  if (a) { scene().remove(a); restRT().staff.delete(id); }
  markDirty(true);
}
export function setRole(id, role) { const e = bizOf('restaurant').employees.find(x => x.id === id); if (e) { e.role = role; const a = restRT().staff.get(id); if (a) { a.look = employeeLook(e.seed, role); a.data.task = null; a.data.busy = false; } markDirty(true); } }

function spawnStaff(e) {
  const r = restRT(), sc = scene();
  const a = new Actor({ kind: 'human', look: employeeLook(e.seed, e.role), name: e.name, x: 210, y: 360, speed: 40 + e.stats.speed * 7 + (e.trait === 'speedy' ? 10 : 0), data: { emp: e, task: null, busy: false, breakT: rand(80, 200) } });
  a.talkable = true;
  sc.add(a);
  r.staff.set(e.id, a);
  return a;
}
export function initRestaurantRuntime() {
  const r = restRT(), b = bizOf('restaurant');
  for (const e of b.employees) if (!r.staff.has(e.id)) spawnStaff(e);
}
export const staffByRole = role => [...restRT().staff.values()].filter(a => a.data.emp.role === role);

// ---------------------------------------------------------------- guests
class Guest {
  constructor(o) { Object.assign(this, o); this.state = 'entering'; this.t = 0; }
}
function freeSeat() {
  const sc = scene();
  for (const t of sc.tables) { if (!t.active || t.dirty) continue; const s = t.seats.find(s => !s.cust); if (s && !t.seats.some(x => x.cust && x.cust.state === 'leaving')) return [t, s]; }
  return null;
}
function spawnGuest() {
  const r = restRT(), sc = scene();
  const inside = r.guests.filter(g => g.state !== 'gone').length;
  const capacity = sc.tables.filter(t => t.active).length * 2;
  if (inside >= capacity + 2) return;
  const pool = bizRecipes('restaurant').filter(id => canMake('restaurant', id));
  if (!pool.length) { if (!r.warned) { r.warned = true; bus.emit('toast', { text: T('The restaurant is out of ingredients!', 'Nhà hàng hết nguyên liệu!'), bad: true }); } return; }
  r.warned = false;
  const seed = randi(1, 1e6), pers = choice(['patient', 'patient', 'excited', 'tourist', 'rushed', 'picky', 'regular']);
  const b = bizOf('restaurant');
  const recipe = b.special && pool.includes(b.special) && chance(0.45) ? b.special : choice(pool);
  const a = new Actor({ kind: 'human', look: visitorLook(seed, pers === 'tourist' ? 'tourist' : pers), x: 210, y: 395, speed: rand(44, 56) });
  sc.add(a);
  const P = PERSONALITIES[pers];
  const g = new Guest({ actor: a, personality: pers, recipe, patience: 70 * P.patience, patienceMax: 70 * P.patience, price: recipePrice('restaurant', recipe) });
  r.guests.push(g);
  a.walkTo([[210, 360]]).then(() => seatGuest(g));
}
function seatGuest(g) {
  const fs = freeSeat();
  const sc = scene();
  if (!fs) { g.state = 'waiting-table'; const w = ENTRY_WAIT[restRT().guests.filter(x => x.state === 'waiting-table').length % 3]; g.actor.walkTo([[w[0], w[1]]]).then(() => g.actor.face('up')); return; }
  const [table, seat] = fs;
  seat.cust = g; g.table = table; g.seat = seat; g.state = 'to-seat';
  g.actor.walkTo(sc.grid.path(g.actor.x, g.actor.y, seat.x, seat.y + 6)).then(() => {
    g.actor.x = seat.x; g.actor.y = seat.y; g.actor.face(seat.dir); g.actor.sit = true;
    g.state = 'thinking'; g.t = rand(2.5, 4.5); g.actor.showEmote('think', 2.4);
  });
}
function guestLeave(g, happy) {
  const sc = scene();
  if (g.seat) { g.seat.cust = null; if (happy) { g.table.dirty = true; } g.table.dishes = g.table.dishes.filter((d, i) => i !== g.dishIdx); }
  g.actor.sit = false;
  g.state = 'leaving';
  if (!happy) { g.actor.setEmo('angry', 3); g.actor.showEmote('angry', 1.6); addRep(-1); G.state.today.lost++; sfx('sad'); }
  g.actor.walkTo(sc.grid.path(g.actor.x, g.actor.y, 210, 372).concat([[210, 400]])).then(() => { sc.remove(g.actor); g.state = 'gone'; });
  // someone waiting can take the seat
  const w = restRT().guests.find(x => x.state === 'waiting-table');
  if (w && !g.table?.dirty) setTimeout(() => seatGuest(w), 300);
}
function pay(g) {
  const s = G.state, b = bizOf('restaurant');
  const P = PERSONALITIES[g.personality], lv = RECIPE_UPGRADES[s.recipeLevels[g.recipe] || 1];
  const servers = staffByRole('server');
  const svc = servers.length ? servers.reduce((m, a) => Math.max(m, a.data.emp.stats.service), 0) : 3;
  const cheerful = [...restRT().staff.values()].some(a => a.data.emp.trait === 'cheerful' || a.data.emp.trait === 'dreamy');
  const quality = g.perfect ? 1 : 0.6;
  const tip = Math.round(g.price * (0.05 + 0.04 * svc + (cheerful ? 0.05 : 0)) * P.tip * (lv?.tip || 1) * quality * (0.5 + g.patience / g.patienceMax * 0.5));
  const total = g.price + tip;
  s.stats.served++; s.today.served++; if (g.perfect) { s.stats.perfect++; s.today.perfect++; }
  addXP(g.perfect ? 10 : 6, 'serve');
  const tb = (s.today.biz.restaurant ||= { served: 0, revenue: 0, perfect: 0 }); tb.served++; tb.revenue += total; if (g.perfect) tb.perfect++;
  b.stats.served++; b.stats.revenue += total;
  s.today.revenue += total; s.today.tips += tip; s.stats.tipsTotal += tip;
  addRep(g.perfect ? 2 : 1);
  const cashier = staffByRole('cashier')[0];
  b.register += total;
  fx.burst('coin', g.actor.x, g.actor.y - 26, 4, { up: 60, speed: 20 });
  fx.float(g.actor.x, g.actor.y - 44, '+' + total + 'k', '#ffe07a', { size: 9 });
  bus.emit('rest:paid', g, total);
  markDirty();
  if (!cashier && !G.state.story.flags.registerHint) { G.state.story.flags.registerHint = true; bus.emit('toast', { text: T('Payments go to the register', 'Tiền đang ở quầy thu ngân'), sub: T('Collect the takings at the register — or hire a cashier.', 'Thu tiền ở quầy — hoặc thuê một thu ngân.'), icon: 'coin' }); }
}

// Player serves a guest directly (when there is no server/cook). Called by the service UI flow.
export function guestNeedingOrder(x, y) {
  return restRT().guests.find(g => g.state === 'ordering' && dist(g.actor.x, g.actor.y, x, y) < 40) || null;
}
export function playerServed(g, quality) {
  if (quality === 'wrong') return;
  g.perfect = quality === 'perfect';
  deliverToTable(g);
}
function deliverToTable(g) {
  g.table.dishes.push(g.recipe); g.dishIdx = g.table.dishes.length - 1;
  g.state = 'eating'; g.t = rand(9, 14);
  g.actor.setAct('eat', RECIPES[g.recipe].vessel === 'bowl' ? 'bowl' : 'dish'); g.actor.setEmo('happy', 2); g.actor.showEmote('heart', 1.4);
}

// Manual play: the player covers whichever jobs have no staff.
export function playerTakeOrder(g) {
  if (staffByRole('cook').length) {
    g.state = 'waiting-food'; restRT().tickets.push({ guest: g, recipe: g.recipe }); sfx('page');
    G.player.setAct('write'); setTimeout(() => G.player.setAct(null), 900); g.actor.showEmote('happy', 1);
    return null;
  }
  g.state = 'player-cooking';
  return g;
}
export function nextTicketForPlayer() { const t = restRT().tickets.find(t => !t.claimed); if (t) t.claimed = 'player'; return t; }
export function ticketCooked(tk, quality) {
  const r = restRT();
  if (quality === 'wrong') { tk.claimed = null; return; }
  r.tickets.splice(r.tickets.indexOf(tk), 1);
  tk.guest.perfect = quality === 'perfect';
  const slot = PASS_SLOTS.find(s => !r.pass.some(p => p.slot === s)) || PASS_SLOTS[0];
  r.pass.push({ slot, guest: tk.guest, recipe: tk.recipe }); sfx('bell');
}
export async function playerDeliver() {
  const r = restRT(), dish = r.pass.find(p => !p.claimed);
  if (!dish) return;
  dish.claimed = 'player';
  const pl = G.player, g = dish.guest;
  pl.control = false;
  try {
    await walkGrid(pl, dish.slot[0], dish.slot[1] + 22); pl.face('up');
    r.pass.splice(r.pass.indexOf(dish), 1);
    pl.setAct('carry', 'plate');
    if (g.state === 'waiting-food') { await walkGrid(pl, g.seat.x + (g.seat.dir === 'right' ? 12 : -12), g.seat.y + 14); pl.face(g.actor); deliverToTable(g); }
    pl.setAct(null);
  } finally { pl.control = true; }
}
export function playerCookFailed(g) { if (g.state === 'player-cooking') { g.state = 'ordering'; g.patience -= g.patienceMax * 0.25; g.actor.showEmote('sweat', 1.2); } }

// ---------------------------------------------------------------- staff AI
function assign(a) {
  const d = a.data, e = d.emp, r = restRT(), sc = scene();
  if (d.busy) return;
  // breaks: less reliable (and dreamy) staff rest more often
  d.breakT -= 1;
  if (d.breakT <= 0) {
    d.breakT = (e.trait === 'steady' ? 400 : 120) + e.stats.reliability * 60 + rand(0, 80);
    if (chance(e.trait === 'dreamy' ? 0.7 : 0.5 - e.stats.reliability * 0.07)) return task(a, 'break', BREAK, async () => { a.face('down'); a.sit = true; if (chance(0.5)) { a.setAct('drink', 'cup'); a.showEmote('note', 3); } else { a.setAct('sleep'); a.showEmote('zzz', 20); } await wait(rand(14, 26)); a.sit = false; a.setAct(null); a.emote = null; });
  }
  const role = e.role, speedK = 1.4 - e.stats.speed * 0.12;
  if (role === 'server') {
    // 1) deliver ready dishes
    const dish = r.pass.find(p => !p.claimed);
    if (dish) { dish.claimed = a; return task(a, 'pickup', [dish.slot[0], dish.slot[1] + 22], async () => { a.face('up'); await wait(0.4); r.pass.splice(r.pass.indexOf(dish), 1); a.setAct('carry', 'plate'); const g = dish.guest; if (g.state !== 'waiting-food') { a.setAct(null); return; } await walkGrid(a, g.seat.x + (g.seat.dir === 'right' ? 12 : -12), g.seat.y + 14); a.face(g.actor); await wait(0.3); a.setAct(null); deliverToTable(g); a.showEmote('happy', 1); }); }
    // 2) take orders
    const g = r.guests.find(g => g.state === 'ordering' && !g.claimed);
    if (g) { g.claimed = a; return task(a, 'order', [g.seat.x + (g.seat.dir === 'right' ? 14 : -14), g.seat.y + 14], async () => { a.face(g.actor); a.setAct('write'); await wait(1.6 * speedK); a.setAct(null); if (g.state !== 'ordering') return; g.state = 'waiting-food'; g.claimed = null; r.tickets.push({ guest: g, recipe: g.recipe }); g.actor.showEmote('happy', 1); sfx('page'); }); }
    // 3) help clearing when there's no cleaner
    if (!staffByRole('cleaner').length) { const t = sc.tables.find(t => t.active && t.dirty && !t.claimed); if (t) return cleanTask(a, t, speedK * 1.3); }
    // 4) seat waiting guests (host duty)
    return idleNear(a, [300, 190]);
  }
  if (role === 'cook') {
    const tk = r.tickets.find(t => !t.claimed);
    if (tk) {
      const stoveCount = bizOf('restaurant').level >= 2 ? 2 : 1;
      const busy = new Set(staffByRole('cook').filter(o => o !== a && o.data.stove).map(o => o.data.stove));
      const stove = STOVES.slice(0, stoveCount).find(s => !busy.has(s[0])) || STOVES[0];
      tk.claimed = a; d.stove = stove[0];
      return task(a, 'cook', [stove[0], stove[1] + 16], async () => {
        a.face('up');
        // ingredients
        const ok = recipeUses(tk.recipe).every(u => takeStockSafe(u));
        if (!ok) { a.showEmote('?', 2); a.setAct(null); tk.claimed = null; d.stove = null; await wait(3); return; }
        r.cooking[stove[0]] = 1; a.setAct('stir'); sfx('sizzle');
        await wait((6 - e.stats.cooking * 0.7) * speedK + 2);
        r.cooking[stove[0]] = 0; a.setAct(null); d.stove = null;
        r.tickets.splice(r.tickets.indexOf(tk), 1);
        const slot = PASS_SLOTS.find(s => !r.pass.some(p => p.slot === s)) || PASS_SLOTS[0];
        await walkGrid(a, slot[0], slot[1] - 16);
        a.face('down'); a.setAct('carry', 'plate'); await wait(0.3); a.setAct(null);
        tk.guest.perfect = chance(0.45 + e.stats.cooking * 0.1 + (e.trait === 'careful' ? 0.15 : 0));
        r.pass.push({ slot, guest: tk.guest, recipe: tk.recipe });
        sfx('bell');
        if (!staffByRole('server').length) bus.emit('toast', { text: T('A dish is ready!', 'Món đã xong!'), sub: T('It\'s on the pass — carry it to the table.', 'Món đang ở quầy chuyển — mang ra bàn nhé.'), icon: RECIPES[tk.recipe].icon, ms: 1800 });
      });
    }
    return idleNear(a, [STOVES[0][0] + 30, 132]);
  }
  if (role === 'cleaner') {
    const t = sc.tables.find(t => t.active && t.dirty && !t.claimed);
    if (t) return cleanTask(a, t, speedK);
    if (chance(0.2)) return task(a, 'sweep', [rand(60, 360), rand(190, 330)], async () => { a.setAct('sweep'); await wait(3); a.setAct(null); });
    return idleNear(a, [380, 300]);
  }
  if (role === 'cashier') {
    if (bizOf('restaurant').register > 0 && dist(a.x, a.y, REGISTER[0], REGISTER[1] - 18) > 6) return task(a, 'register', [REGISTER[0], REGISTER[1] - 20], async () => { a.face('down'); });
    return idleNear(a, [REGISTER[0], REGISTER[1] - 20], 4);
  }
  if (role === 'prep') {
    const need = neededPrep();
    if (need) return task(a, 'prep', [PREP[0], PREP[1] + 16], async () => { a.face('up'); a.setAct('chop'); sfx('chop'); await wait(4 * speedK); a.setAct(null); const b = bizOf('restaurant'); const n = Math.min(4, G.state.pantry[need] || 0); if (n > 0) { G.state.pantry[need] -= n; const to = INGREDIENTS[need].prep.to; b.prepped[to] = (b.prepped[to] || 0) + n; markDirty(); } });
    return idleNear(a, [PREP[0], PREP[1] + 18], 6);
  }
}
function takeStockSafe(u) { return takeStock('restaurant', u); }
function neededPrep() {
  const b = bizOf('restaurant');
  for (const r of bizRecipes('restaurant')) for (const u of recipeUses(r)) if (PREPPED[u] && (b.prepped[u] || 0) < 4 && (G.state.pantry[PREPPED[u].from] || 0) > 0) return PREPPED[u].from;
  return null;
}
function cleanTask(a, t, speedK) {
  t.claimed = a;
  return task(a, 'clean', [t.x, t.y + 16], async () => { a.face('up'); a.setAct('clean'); await wait(2.4 * speedK); a.setAct(null); t.dirty = false; t.claimed = null; fx.burst('spark', t.x, t.y - 14, 5, { up: 30, col: '#fff' }); const w = restRT().guests.find(x => x.state === 'waiting-table'); if (w) seatGuest(w); });
}
function idleNear(a, [x, y], r = 16) {
  if (dist(a.x, a.y, x, y) > r + 10) return task(a, 'idle', [x + rand(-r, r), y + rand(-r / 2, r / 2)], async () => { a.face('down'); });
  a.data.idleT = (a.data.idleT || 0) - 1;
  if (a.data.idleT <= 0) { a.data.idleT = randi(3, 8); a.face(choice(['down', 'left', 'right'])); if (chance(0.15)) a.showEmote('note', 1.4); }
}
async function task(a, name, [x, y], fn) {
  const d = a.data; d.busy = true; d.task = name;
  try { await walkGrid(a, x, y); await fn(); }
  catch (e) { console.warn('staff task', e); }
  finally { d.busy = false; d.task = null; }
}
function walkGrid(a, x, y) { const sc = scene(); return a.walkTo(sc.grid.path(a.x, a.y, x, y)); }
const wait = s => new Promise(r => setTimeout(r, s * 1000 / Math.max(0.2, G.runtime.simSpeed || 1)));

// ---------------------------------------------------------------- per frame
let staffTick = 0;
export function updateRestaurant(dt, gameMin) {
  const b = bizOf('restaurant');
  if (!b.owned || b.repair < 1 || !scene()) return;
  const r = restRT(), sc = scene();
  if (sc !== G.scene) sc.update(dt, G.t);   // keep simulating while the player is elsewhere
  // guests arrive while open
  if (b.open) {
    if (G.state.time >= 24 * 60) { b.open = false; bus.emit('biz:close', 'restaurant', 'hours'); }
    r.spawnT -= dt;
    if (r.spawnT <= 0) {
      const rep = 1 + Math.min(3, G.state.reputation / 80);
      const h = G.state.time / 60;
      const tf = (h >= 11 && h < 13.5) || (h >= 17.5 && h < 20.5) ? 1.6 : 1;
      const att = BUSINESSES.restaurant.upgrades?.[b.level]?.attract || 1;
      r.spawnT = clamp(rand(26, 44) / (rep * tf * att * 1.25), 5, 50);
      spawnGuest();
    }
  }
  // guest state machine
  for (const g of r.guests) {
    if (g.state === 'gone' || g.state === 'leaving') continue;
    if (g.state === 'thinking') { g.t -= dt; if (g.t <= 0) { g.state = 'ordering'; g.actor.showEmote('!', 1.2); } }
    else if (g.state === 'eating') { g.t -= dt; if (g.t <= 0) { g.actor.setAct(null); pay(g); g.actor.setEmo('happy', 2); guestLeave(g, true); } continue; }
    if (['waiting-table', 'ordering', 'waiting-food', 'thinking', 'player-cooking'].includes(g.state)) {
      g.patience -= dt * (g.state === 'thinking' ? 0.2 : 1);
      if (g.patience < g.patienceMax * 0.3 && !g.sweat) { g.sweat = true; g.actor.showEmote('sweat', 1.4); }
      if (g.patience <= 0) guestLeave(g, false);
    }
  }
  r.guests = r.guests.filter(g => g.state !== 'gone');
  // staff decisions ~4 times a second
  staffTick += dt;
  if (staffTick > 0.25) { staffTick = 0; for (const a of r.staff.values()) assign(a); }
  // cashier deposits the register to your wallet
  r.depositT -= dt;
  if (r.depositT <= 0) {
    r.depositT = 20;
    const cashier = staffByRole('cashier')[0];
    if (cashier && b.register > 0) { const k = Math.round(b.register); b.register = 0; addMoney(k, 'deposit'); cashier.showEmote('coin', 1.4); bus.emit('toast', { text: T(`${cashier.name} deposited ${k}k`, `${cashier.name} đã nộp ${k}k`), sub: T('The restaurant\'s takings', 'Tiền bán hàng của nhà hàng'), icon: 'coin', ms: 1800 }); }
  }
}
export function collectRegister() {
  const b = bizOf('restaurant');
  const k = Math.round(b.register);
  if (k <= 0) return 0;
  b.register = 0; addMoney(k, 'deposit'); sfx('cash'); markDirty(true);
  return k;
}
export function restaurantAutomated() { return ['cook', 'server'].every(r => staffByRole(r).length); }
export function dailyWages() { return bizOf('restaurant').employees.reduce((s, e) => s + e.wage, 0); }
export function resetRestaurantDay() {
  const r = restRT(), sc = scene();
  for (const g of r.guests) sc?.remove(g.actor);
  r.guests.length = 0; r.tickets.length = 0; r.pass.length = 0; r.cooking = {};
  sc?.tables.forEach(t => { t.dirty = false; t.dishes = []; t.seats.forEach(s => s.cust = null); t.claimed = null; });
  for (const a of r.staff.values()) { a.stop(); a.x = 210 + rand(-40, 40); a.y = 250; a.data.busy = false; a.sit = false; a.setAct(null); }
}
export { ROLES, TRAITS };
