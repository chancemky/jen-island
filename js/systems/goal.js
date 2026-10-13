// Saving up: pin one big thing you want (a designer outfit, an island project, the next house)
// and a thin bar under your money fills as you earn toward it. When you can afford it, a cheer.
import { G, T, markDirty } from './state.js';
import { bus, money } from '../core/util.js';

export const savingFor = () => G.state.goal || null;          // { kind, id, en, vi, cost }
export function setGoal(g) {
  // already enough? say so once (it used to pin it and cheer "you can afford it!" in the same breath)
  if (g && G.state.money >= g.cost) { bus.emit('toast', { text: T(`You can already afford ${g.en}!`, `Bạn đã đủ tiền mua ${g.vi} rồi!`), sub: T('No need to save — go and get it.', 'Không cần để dành — mua luôn thôi.'), icon: 'coin', now: true }); return; }
  G.state.goal = g ? { kind: g.kind, id: g.id, en: g.en, vi: g.vi, cost: Math.round(g.cost), told: false } : null; markDirty(true);
  if (g) bus.emit('toast', { text: T(`📌 Saving up for ${g.en}`, `📌 Đang để dành mua ${g.vi}`), sub: T(`${money(g.cost)} — watch the bar under your money fill up.`, `${money(g.cost)} — xem thanh dưới số tiền đầy dần.`), icon: 'coin', now: true });
}
export const isGoal = (kind, id) => G.state.goal?.kind === kind && G.state.goal?.id === id;
// called when the pinned thing is bought: the goal is done
export function goalBought(kind, id) { if (isGoal(kind, id)) { G.state.goal = null; markDirty(true); } }
// every frame from the HUD: the bar, and the moment it fills
export function goalTick(bar) {
  const g = G.state?.goal; if (!bar) return;
  if (!g) { bar.classList.add('hidden'); return; }
  bar.classList.remove('hidden');
  const k = Math.max(0, Math.min(1, G.state.money / g.cost));
  bar.firstElementChild.style.width = (k * 100).toFixed(1) + '%'; bar.classList.toggle('full', k >= 1);
  if (k >= 1 && !g.told) { g.told = true; markDirty(true); bus.emit('sfx', 'success'); bus.emit('toast', { text: T(`🎉 You can afford ${g.en}!`, `🎉 Đủ tiền mua ${g.vi} rồi!`), sub: T('Go and get it!', 'Đi mua thôi!'), icon: 'coin', cls: 'ach', ms: 4200 }); }
  else if (k < 1 && g.told) g.told = false;
}
