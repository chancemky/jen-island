// The island's background life, in sound: waves by the shore, birds by day and crickets at
// night, chatter by a busy queue, and each open shop at work (the grill crackling, the café's
// steamer, the blender, ice in glasses, a knife on the board). Quiet, irregular, and never
// more than a few at once. Follows the sound-effects volume.
import { G } from './state.js';
import { sfx } from '../core/audio.js';
import { isOcean, QUEUES } from '../world/island.js';
import { BUSINESSES } from '../data/game.js';
import { rand } from '../core/util.js';

const T0 = {}; const due = (k, a, b) => { const now = performance.now() / 1000; if ((T0[k] || 0) > now) return false; T0[k] = now + rand(a, b); return true; };
const SHOP = { grill: 'amb_crackle', cafe: 'amb_steam', smoothie: 'amb_blender', drinks: 'amb_ice', banhmi: 'amb_knife', truck: 'amb_knife', night: 'amb_crackle' };
function nearShore(x, y) { for (const [dx, dy] of [[0, 90], [90, 0], [-90, 0], [0, -90], [64, 64], [-64, 64]]) if (isOcean?.(x + dx, y + dy)) return true; return false; }
export function updateAmbience() {
  const s = G.state, pl = G.player, sc = G.scene; if (!s || !pl || !sc || G.runtime.cinematic) return;
  const h = s.time / 60 % 24, night = h >= 19 || h < 5.5;
  // at the counter: that shop's own sounds
  const svc = G.runtime.serviceOpen; if (svc) { const k = SHOP[BUSINESSES[svc]?.biz]; if (k && due('svc', 2.5, 6)) sfx(k); return; }
  if (sc !== G.scenes.island) return;
  if (nearShore(pl.x, pl.y) && due('wave', 3.5, 6)) sfx('amb_wave');
  if (!night && h > 5.5 && due('bird', 6, 14)) sfx('amb_bird');
  if (night && due('cricket', 1.5, 4)) sfx('amb_cricket');
  for (const [id, z] of Object.entries(s.biz)) {
    if (!z.open || !QUEUES[id]) continue;
    const [qx, qy] = QUEUES[id][0], d = Math.hypot(pl.x - qx, pl.y - qy); if (d > 170) continue;
    const k = SHOP[BUSINESSES[id]?.biz]; if (k && due('shop:' + id, 4, 9)) sfx(k);
    if ((G.scenes.island && d < 140) && due('chat:' + id, 6, 12)) sfx('amb_chatter');
  }
}
