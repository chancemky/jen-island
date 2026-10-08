// Home upgrades (Anh Khoa builds them): two bigger houses, each wider with another window
// and more floor to decorate. Like a home loan on any cosy island: pay in full, or move in
// now and pay it back a little each night (15% of the day's net, only on good days, no
// interest, no deadline). Optional — the starter house is perfectly fine.
// Once the house is at its biggest, he can build up and down: an upstairs (a loft, then a
// bigger floor with a wide window) and a basement (a cellar, then a finished room). Each is
// a room of its own, joined by stairs, with its own furniture.
import { G, T, addMoney, canAfford, markDirty } from './state.js';
import { bus, money, sleep } from '../core/util.js';
import { buildHouse, buildFloor, addStairs, stairsX } from '../world/interiors.js';
import { scenes, setScene, fadeOut, fadeIn } from './scenes.js';
import { rebuildHouseFurniture, clearStairs } from '../ui/decorate.js';
import { lockInput, releaseInput } from '../core/locks.js';
import { sfx } from '../core/audio.js';
import { track } from './telemetry.js';

export const HOME_UPGRADES = [null, { cost: 6000, en: 'A bigger house', vi: 'Nhà rộng hơn', note: ['+1 window and a third more floor', 'Thêm cửa sổ và rộng thêm 1/3'] }, { cost: 15000, en: 'The family house', vi: 'Nhà lớn', note: ['Another window, more wall space, room for everything', 'Thêm cửa sổ, thêm tường, đủ chỗ cho mọi thứ'] }];
export const FLOOR_UPGRADES = {
  up: [null,
    { cost: 18000, en: 'Build an upstairs', vi: 'Xây tầng trên', note: ['A whole new room up a flight of stairs', 'Cả một phòng mới trên lầu'] },
    { cost: 30000, en: 'A bigger upstairs', vi: 'Tầng trên rộng hơn', note: ['Wider, with a big bright window', 'Rộng hơn, thêm ô cửa sổ lớn'] }],
  down: [null,
    { cost: 20000, en: 'Dig a basement', vi: 'Đào tầng hầm', note: ['A cosy cellar room under the house', 'Một phòng hầm ấm cúng dưới nhà'] },
    { cost: 32000, en: 'Finish the basement', vi: 'Hoàn thiện tầng hầm', note: ['Wider, with a wooden floor and two little windows', 'Rộng hơn, sàn gỗ và hai ô cửa sổ nhỏ'] }],
};
export const homeLevel = () => G.state.home.size || 0;
export const floorLevel = which => G.state.home.floors?.[which] || 0;
export const nextHome = () => HOME_UPGRADES[homeLevel() + 1] || null;
// the next floor upgrade on offer (only once the house is at its biggest)
export const nextFloor = which => homeLevel() >= HOME_UPGRADES.length - 1 ? FLOOR_UPGRADES[which][floorLevel(which) + 1] || null : null;
export const homeLoan = () => G.state.home.loan || 0;
export const floorScene = which => which === 'up' ? 'house_up' : 'house_down';
export const isHomeScene = sc => !!sc && (sc.id === 'house' || sc.id === 'house_up' || sc.id === 'house_down');
// every piece placed anywhere in your home (all floors)
export const placedFurniture = (home = G.state.home) => [...(home.furniture || []), ...Object.values(home.rooms || {}).flat()];

function build() {
  const ground = buildHouse(homeLevel());
  scenes.house = G.scenes.house = ground;
  for (const which of ['up', 'down']) {
    const id = floorScene(which), lv = floorLevel(which);
    if (lv) { scenes[id] = G.scenes[id] = buildFloor(which, lv); addStairs(ground, which, id, which === 'up' ? ['Go upstairs', 'Lên lầu'] : ['Go downstairs', 'Xuống tầng hầm']); }
    else { delete scenes[id]; delete G.scenes[id]; }
  }
}
function apply() {
  const where = G.scene?.id, pl = G.player;
  build();
  clearStairs();
  rebuildHouseFurniture();
  if (isHomeScene({ id: where }) && scenes[where]) { const sc = scenes[where]; setScene(where, sc.noDoor ? sc.entry.x : sc.w / 2, sc.noDoor ? sc.entry.y : 230, 'up'); }
  else if (pl) void 0;
}
function pay(cost, how) {
  if (how === 'cash') { if (!canAfford(cost)) return false; addMoney(-cost, 'build'); }
  else G.state.home.loan = cost;
  return true;
}
// pay: 'cash' or 'loan'
export function upgradeHome(how) {
  const up = nextHome(); if (!up || homeLoan() > 0) return false;
  if (!pay(up.cost, how)) return false;
  G.state.home.size = homeLevel() + 1; markDirty(true); track('home_upgrade', { level: G.state.home.size, pay: how });
  apply(); bus.emit('stinger', 'newshop');
  bus.emit('toast', { text: T(`${up.en} — welcome home!`, `${up.vi} — về nhà thôi!`), sub: how === 'loan' ? T(`Pay back ${money(up.cost)} a little each good night.`, `Trả dần ${money(up.cost)} vào những đêm có lãi.`) : '', icon: 'key', ms: 4200 });
  return true;
}
export function upgradeFloor(which, how) {
  const up = nextFloor(which); if (!up || homeLoan() > 0) return false;
  if (!pay(up.cost, how)) return false;
  const h = G.state.home; (h.floors ||= {})[which] = floorLevel(which) + 1; (h.rooms ||= {})[floorScene(which)] ||= [];
  markDirty(true); track('home_floor', { which, level: h.floors[which], pay: how });
  apply(); bus.emit('stinger', 'newshop');
  bus.emit('toast', { text: T(`${up.en} — done!`, `${up.vi} — xong rồi!`), sub: T(which === 'up' ? 'Take the stairs at the back of the house.' : 'The stairs are by the back wall.', which === 'up' ? 'Đi cầu thang cuối nhà nhé.' : 'Cầu thang ở sát tường sau.') + (how === 'loan' ? ' ' + T(`Pay back ${money(up.cost)} a little each good night.`, `Trả dần ${money(up.cost)} vào những đêm có lãi.`) : ''), icon: 'key', ms: 4600 });
  return true;
}
// take the stairs to another floor of your home
let moving = false;
export async function goFloor(id) {
  const to = scenes[id]; if (!to || moving || G.runtime.visit) return;
  moving = true; lockInput('stairs');
  try {
    const from = G.scene?.id; sfx('step'); await fadeOut(240);
    // arrive in front of the flight that leads back where you came from
    const which = id === 'house' ? (from === 'house_up' ? 'up' : 'down') : id === 'house_up' ? 'down' : 'up';
    const x = stairsX(to, which) ?? to.entry.x;
    setScene(id, x, to.WH + 70, 'down');
    await sleep(60); await fadeIn(260);
  } finally { releaseInput('stairs'); moving = false; }
}
export function initHome() {
  build(); clearStairs();
  bus.on('dayEnd', sum => {
    const loan = homeLoan(); if (!loan || !(sum?.net > 0)) return;
    const amt = Math.min(loan, Math.max(1, Math.round(sum.net * 0.15)));
    addMoney(-amt, 'build'); G.state.home.loan = loan - amt; markDirty(true);
    sum.loanPaid = amt;
    if (!G.state.home.loan) bus.emit('toast', { text: T('Your house is paid off!', 'Bạn đã trả xong tiền nhà!'), icon: 'key', cls: 'ach', ms: 4200 });
  });
}
