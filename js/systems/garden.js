// The plaques on the places you restored, which tell their story.
// (The little vegetable garden by your house was removed in 5.3.)

import { G, T } from './state.js';
import { say } from '../ui/dialogue.js';
import { dist } from '../core/util.js';
import { discover } from './interact.js';

// ---------------------------------------------------------------- plaques on restored places
const PLAQUES = [
  { x: 640, y: 2250, need: () => G.state.biz.shed1?.repair >= 1, en: 'A little brass plaque: "Bà Tư\'s Tea Stand, since 1985 — reopened by a newcomer who stayed."', vi: 'Tấm bảng đồng nhỏ: “Quán trà Bà Tư, từ 1985 — được mở lại bởi một người mới đến và ở lại.”' },
  { x: 600, y: 1610, need: () => G.state.biz.shed2?.repair >= 1, en: 'Carved into the counter: "Lâm Bakery — bread at four, every morning." Someone added: "…again."', vi: 'Khắc trên quầy: “Lò bánh họ Lâm — bánh ra lò lúc bốn giờ, mỗi sáng.” Ai đó ghi thêm: “…lại rồi.”' },
  { x: 1700, y: 1560, need: () => G.state.story.flags.bridgeFixed, en: 'Bridge plaque: "Broken by the great storm. Mended by the island, plank by plank."', vi: 'Bảng ghi trên cầu: “Gãy trong cơn bão lớn. Được cả đảo sửa lại, từng tấm ván.”' },
  { x: 560, y: 740, need: () => G.state.nightMarket?.restored, en: 'On the lantern post: "The last lantern was blown out here. The first one was lit again here too."', vi: 'Trên cột đèn: “Chiếc lồng đèn cuối cùng tắt ở đây. Chiếc đầu tiên cũng được thắp lại ở đây.”' },
];
export function plaqueAction(pl) {
  if (G.scene !== G.scenes.island) return null;
  const p = PLAQUES.find(p => dist(pl.x, pl.y, p.x, p.y) < 26 && p.need());
  return p ? { label: T('Read', 'Đọc'), icon: 'notebook', run: async () => { discover('plaque'); await say(null, T(p.en, p.vi)); } } : null;
}
