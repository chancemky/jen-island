// Fishing off the end of the pier, once Chú Hải has told you his story (side quest
// "dawn at the pier"). Cast, wait for the bobber to dip, tap in time. A handful of
// casts a day: fish are for Mèo Mây, for the collection, and now and then a squid
// or scallop for the Cove Grill — never a way to get rich.

import { G, T, markDirty, addPantry } from './state.js';
import { sfx } from '../core/audio.js';
import { toast } from '../ui/hud.js';
import { fx } from '../world/render.js';
import { rand, bus } from '../core/util.js';
import { PIER_END } from '../world/island.js';
import { discover } from './interact.js';

export const FISH = {
  sardine: { en: 'Sardine', vi: 'Cá mòi', w: 30 }, mackerel: { en: 'Mackerel', vi: 'Cá bạc má', w: 22 }, snapper: { en: 'Red snapper', vi: 'Cá hồng', w: 10 },
  squid: { en: 'Squid', vi: 'Mực', w: 8, ing: 'squid', night: 2 }, scallop: { en: 'Scallop', vi: 'Sò điệp', w: 5, ing: 'scallop' },
  pufferfish: { en: 'Pufferfish (let go!)', vi: 'Cá nóc (thả lại!)', w: 4 }, boot: { en: 'An old boot', vi: 'Chiếc ủng cũ', w: 6, junk: true },
  moonfish: { en: 'Moonfish', vi: 'Cá mặt trăng', w: 1, rare: true, night: 3 },
};
const CASTS = 5;
export const fishingOpen = () => !!G.state.story.flags.fishing;
export function fishingAction(pl) {
  if (G.scene !== G.scenes.island || !fishingOpen()) return null;
  const E = PIER_END;
  if (pl.x < E.x - 10 || pl.x > E.x + E.w + 10 || pl.y < E.y - 30 || pl.y > E.y + E.h + 6) return null;
  const s = G.state, used = s.story.flags.fishDay === s.day ? s.story.flags.fishN || 0 : 0;
  if (used >= CASTS) return { label: T('Fish are resting', 'Cá đang nghỉ'), icon: 'fish', run: () => toast({ text: T('The fish have gone quiet for today', 'Hôm nay cá im re rồi'), sub: T('Come back tomorrow — dawn is best.', 'Mai quay lại nha — sáng sớm là tốt nhất.'), icon: 'fish' }) };
  return { label: T(`Fish (${CASTS - used} casts left)`, `Câu cá (còn ${CASTS - used} lần)`), icon: 'fish', run: () => cast() };
}
let game = null;
function pick() {
  const h = G.state.time / 60, night = h >= 19 || h < 5, dawn = h >= 5 && h < 8;
  const pool = Object.entries(FISH).map(([id, f]) => [id, f.w * (night && f.night ? f.night : 1) * (dawn && !f.junk ? 1.3 : 1)]);
  let r = Math.random() * pool.reduce((a, p) => a + p[1], 0);
  for (const [id, w] of pool) { r -= w; if (r <= 0) return id; }
  return 'sardine';
}
function cast() {
  if (game) return;
  const s = G.state, f = s.story.flags, pl = G.player;
  if (f.fishDay !== s.day) { f.fishDay = s.day; f.fishN = 0; }
  f.fishN++; markDirty();
  discover('fishing');
  pl.face('down'); pl.setAct('work'); sfx('whoosh');
  const el = document.createElement('div'); el.className = 'fishing';
  el.innerHTML = `<div class="fs-card"><div class="fs-water"><i class="fs-bob"></i></div><b>${T('Wait for the bobber to dip…', 'Chờ phao chìm xuống…')}</b><button class="btn big pink" type="button">${T('Reel in!', 'Kéo cần!')}</button></div>`;
  document.getElementById('app').appendChild(el);
  G.runtime.pause++;
  const bob = el.querySelector('.fs-bob'), msg = el.querySelector('b');
  game = { bite: false, done: false };
  const biteAt = rand(1.4, 4.2) * 1000;
  const t1 = setTimeout(() => { if (game.done) return; game.bite = true; bob.classList.add('dip'); msg.textContent = T('NOW!', 'KÉO!'); sfx('fishsplash'); game.t2 = setTimeout(() => finish(false, T('It got away…', 'Nó thoát mất rồi…')), 850); }, biteAt);
  const finish = (ok, text) => {
    if (game.done) return; game.done = true; clearTimeout(t1); clearTimeout(game.t2);
    G.runtime.pause--; el.remove(); pl.setAct(null); game = null;
    if (!ok) { toast({ text, icon: 'fish', ms: 1500 }); return; }
    const id = pick(), F = FISH[id];
    const bag = (s.fishBag ||= {}); bag[id] = (bag[id] || 0) + 1; (s.fishSeen ||= {})[id] = true; s.stats.fishCaught = (s.stats.fishCaught || 0) + 1;   // (fishSeen: every kind ever caught, for the collection)
    if (F.ing) addPantry(F.ing, 1);
    bus.emit('fish', id);
    if (!F.junk && !F.ing && id !== 'pufferfish') s.fishForMeo = (s.fishForMeo || 0) + 1;
    markDirty(true); sfx(F.rare ? 'fanfare' : F.junk ? 'sad' : 'success');
    fx.burst('splash', pl.x, pl.y + 26, 8, { up: 30, col: '#e6f7ff' });
    pl.setAct('hold', F.ing || 'fish'); setTimeout(() => pl.act === 'hold' && pl.setAct(null), 1300);
    toast({ text: T(`Caught: ${F.en}!`, `Câu được: ${F.vi}!`), sub: F.rare ? T('A rare one — Chú Hải won\'t believe you.', 'Cá hiếm — Chú Hải sẽ không tin đâu.') : F.ing ? T('Into the pantry for the grill.', 'Cho vào kho để nướng.') : F.junk ? T('…well, it\'s a catch.', '…thì cũng là “mẻ cá”.') : T('Mèo Mây will be thrilled.', 'Mèo Mây sẽ mừng lắm.'), icon: F.ing || 'fish', ms: 2200 });
  };
  el.querySelector('button').onclick = () => { if (!game || game.done) return; if (game.bite) finish(true); else finish(false, T('Too early — the fish swam off', 'Sớm quá — cá bơi mất rồi')); };
}
