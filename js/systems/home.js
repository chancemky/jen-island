// Home upgrades (Anh Khoa builds them): two bigger houses, each wider with another window
// and more floor to decorate. Like a home loan on any cosy island: pay in full, or move in
// now and pay it back a little each night (15% of the day's net, only on good days, no
// interest, no deadline). Optional — the starter house is perfectly fine.
import { G, T, addMoney, canAfford, markDirty } from './state.js';
import { bus, money } from '../core/util.js';
import { buildHouse } from '../world/interiors.js';
import { scenes, setScene } from './scenes.js';
import { rebuildHouseFurniture } from '../ui/decorate.js';
import { track } from './telemetry.js';

export const HOME_UPGRADES = [null, { cost: 6000, en: 'A bigger house', vi: 'Nhà rộng hơn', note: ['+1 window and a third more floor', 'Thêm cửa sổ và rộng thêm 1/3'] }, { cost: 15000, en: 'The family house', vi: 'Nhà lớn', note: ['Another window, more wall space, room for everything', 'Thêm cửa sổ, thêm tường, đủ chỗ cho mọi thứ'] }];
export const homeLevel = () => G.state.home.size || 0;
export const nextHome = () => HOME_UPGRADES[homeLevel() + 1] || null;
export const homeLoan = () => G.state.home.loan || 0;
function apply() {
  const inside = G.scene === scenes.house, pl = G.player;
  scenes.house = buildHouse(homeLevel());
  G.scenes.house = scenes.house;
  rebuildHouseFurniture();
  if (inside) setScene('house', scenes.house.w / 2, 230, 'up');
  else if (pl) void 0;
}
// pay: 'cash' or 'loan'
export function upgradeHome(pay) {
  const up = nextHome(); if (!up || homeLoan() > 0) return false;
  if (pay === 'cash') { if (!canAfford(up.cost)) return false; addMoney(-up.cost, 'build'); }
  else G.state.home.loan = up.cost;
  G.state.home.size = homeLevel() + 1; markDirty(true); track('home_upgrade', { level: G.state.home.size, pay });
  apply(); bus.emit('stinger', 'newshop');
  bus.emit('toast', { text: T(`${up.en} — welcome home!`, `${up.vi} — về nhà thôi!`), sub: pay === 'loan' ? T(`Pay back ${money(up.cost)} a little each good night.`, `Trả dần ${money(up.cost)} vào những đêm có lãi.`) : '', icon: 'key', ms: 4200 });
  return true;
}
export function initHome() {
  if (homeLevel() > 0) apply();
  bus.on('dayEnd', sum => {
    const loan = homeLoan(); if (!loan || !(sum?.net > 0)) return;
    const pay = Math.min(loan, Math.max(1, Math.round(sum.net * 0.15)));
    addMoney(-pay, 'build'); G.state.home.loan = loan - pay; markDirty(true);
    sum.loanPaid = pay;
    if (!G.state.home.loan) bus.emit('toast', { text: T('Your house is paid off!', 'Bạn đã trả xong tiền nhà!'), icon: 'key', cls: 'ach', ms: 4200 });
  });
}
