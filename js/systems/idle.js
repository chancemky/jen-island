// Your character's idle moments: stand still for a while and they stretch, look around,
// yawn, hum a tune or check the time — never while you're busy, in a menu or a scene.
import { G } from './state.js';
import { rand, choice } from '../core/util.js';

let still = 0, next = rand(8, 11);
const MOMENTS = [
  a => { a.setAct('stretch'); return 1.9; },
  a => { a.face('left'); setTimeout(() => a.face('right'), 700); setTimeout(() => a.face('down'), 1400); return 1.6; },   // looks around
  a => { a.showEmote('zzz', 1.6); a.squash = 0.6; return 1.6; },                                                        // a big yawn
  a => { a.showEmote('note', 2); a.setAct('dance'); return 2.2; },                                                       // hums a tune
  a => { a.setAct('think'); a.showEmote('think', 1.4); return 1.8; },
  a => { a.setAct('phone'); return 2.6; },
];
export function updatePlayerIdle(dt, busy) {
  const a = G.player; if (!a) return;
  if (busy || (a.moving || 0) > 0.05 || a.path || a.sit || a.lie) { still = 0; next = rand(8, 11); if (a.data?.idleAct && a.act === a.data.idleAct) a.setAct(null); if (a.data) a.data.idleAct = null; return; }
  still += dt;
  if (still < next) return;
  (a.data ||= {}).idleAct = null;
  const dur = choice(MOMENTS)(a); a.data.idleAct = a.act;
  setTimeout(() => { if (a.data?.idleAct && a.act === a.data.idleAct) { a.setAct(null); a.data.idleAct = null; } }, dur * 1000);
  still = 0; next = rand(7, 12);
}
