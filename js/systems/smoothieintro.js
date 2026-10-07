// The Beach Smoothie Bar's story (Chapter 15): Cô Dừa's nephew opened it, then went off to
// study in Đà Lạt. The morning you reach Chapter 15 a note points you to Sunny Beach; walk up
// to the shuttered bar and Cô Dừa tells you about it and hands you his recipe card.
import { G, T, markDirty } from './state.js';
import { cs, say, wait } from './cutscene.js';
import { RESIDENTS } from '../data/looks.js';
import { Actor } from '../world/actor.js';
import { setWaypoint } from '../ui/hud.js';
import { BUSINESSES } from '../data/game.js';
import { bus } from '../core/util.js';

const B = () => G.scenes.island?.buildings?.smoothie;
function check() {
  const s = G.state, f = s?.story?.flags, b = B(); if (!f?.freeRoam || !b || s.biz.smoothie?.owned || (s.story.chapter || 1) < BUSINESSES.smoothie.chapter) return;
  if (!f.smoothieNote) { f.smoothieNote = true; markDirty(); setWaypoint({ scene: 'island', x: b.x, y: b.y + 30 }, T('the old smoothie bar', 'quán sinh tố cũ')); bus.emit('toast', { text: T('A note under your door', 'Một mẩu giấy dưới cửa'), sub: T('"Come by the smoothie bar on Sunny Beach? — Cô Dừa"', '"Ghé quán sinh tố ở Bãi Biển nhé? — Cô Dừa"'), icon: 'letter', ms: 5200 }); return; }
  if (f.smoothieIntro || cs.active || G.runtime.inCutscene || G.scene !== G.scenes.island) return;
  const pl = G.player; if (!pl || Math.hypot(pl.x - b.x, pl.y - (b.y + 30)) > 90) return;
  f.smoothieIntro = true; markDirty(true);
  cs.run('smoothieIntro', async () => {
    G.runtime.inCutscene = true;
    const def = RESIDENTS.co_dua, who = new Actor({ kind: 'human', look: def.look, name: def.name, x: b.x + 70, y: b.y + 40 });
    G.scenes.island.add(who); who.face('left'); pl.face('right');
    try {
      await say(who, T('You found it! My nephew Tín built this bar with his own hands. Mango, coconut, passion fruit — he made the whole beach smile.', 'Bạn tìm ra rồi! Thằng Tín cháu cô tự tay dựng quán này. Xoài, dừa, chanh dây — nó làm cả bãi biển cười tươi.'));
      await say(who, T('Then he got into university in Đà Lạt. Proud auntie! But the bar has been shut ever since.', 'Rồi nó đậu đại học ở Đà Lạt. Cô tự hào lắm! Mà quán đóng cửa từ đó tới giờ.'));
      who.setAct('wave'); await wait(0.6); who.setAct(null);
      await say(who, T('He says it should go to someone who loves this island. That\'s you. Buy it when you\'re ready, and his recipes come with it.', 'Nó nói quán nên về tay người thương hòn đảo này. Là bạn đó. Khi nào sẵn sàng thì mua nha, công thức của nó đi kèm luôn.'));
    } finally { G.scenes.island.remove(who); G.runtime.inCutscene = false; }
  });
}
export function initSmoothieIntro() { setInterval(check, 2000); }
