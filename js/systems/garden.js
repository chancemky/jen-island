// The plaques on the places you restored, which tell their story.
// (The little vegetable garden by your house was removed in 5.3.)

import { G, T, markDirty } from './state.js';
import { say } from '../ui/dialogue.js';
import { dist } from '../core/util.js';
import { discover } from './interact.js';

// ---------------------------------------------------------------- plaques on restored places
const PLAQUES = [
  { x: 640, y: 2250, need: () => G.state.biz.shed1?.repair >= 1, en: 'A little brass plaque: "Bà Tư\'s Tea Stand, since 1985 — reopened by a newcomer who stayed."', vi: 'Tấm bảng đồng nhỏ: “Quán trà Bà Tư, từ 1985 — được mở lại bởi một người mới đến và ở lại.”' },
  { x: 600, y: 1610, need: () => G.state.biz.shed2?.repair >= 1, en: 'Carved into the counter: "Lâm Bakery — bread at four, every morning." Someone added: "…again."', vi: 'Khắc trên quầy: “Lò bánh họ Lâm — bánh ra lò lúc bốn giờ, mỗi sáng.” Ai đó ghi thêm: “…lại rồi.”' },
  { x: 1700, y: 1560, need: () => G.state.story.flags.bridgeFixed, en: 'Bridge plaque: "Broken by the great storm. Mended by the island, plank by plank."', vi: 'Bảng ghi trên cầu: “Gãy trong cơn bão lớn. Được cả đảo sửa lại, từng tấm ván.”' },
  { x: 560, y: 740, need: () => G.state.nightMarket?.restored, en: 'On the lantern post: "The last lantern was blown out here. The first one was lit again here too."', vi: 'Trên cột đèn: “Chiếc lồng đèn cuối cùng tắt ở đây. Chiếc đầu tiên cũng được thắp lại ở đây.”' },
  { x: 1290, y: 770, need: () => G.state.biz.restaurant?.repair >= 1, en: 'By the steps: "The hill restaurant. Closed for twenty years, full again on a Tuesday."', vi: 'Cạnh bậc thềm: “Nhà hàng trên đồi. Đóng cửa hai mươi năm, lại kín bàn vào một ngày thứ Ba.”' },
  { x: 1590, y: 720, need: () => G.state.story.flags.harbourBridge, en: 'Harbour Bridge: "Built so the guesthouse could hear the market, and the market could hear the sea."', vi: 'Cầu Bến Cảng: “Xây để nhà nghỉ nghe được tiếng chợ, và chợ nghe được tiếng biển.”' },
  { x: 1600, y: 2100, need: () => G.state.story.flags.coveBridge, en: 'Cove Bridge: "For Cô Dừa, who waited a long time for company."', vi: 'Cầu Vịnh Dừa: “Tặng Cô Dừa, người đã đợi bạn bè rất lâu.”' },
  { x: 950, y: 330, need: () => !!G.state.story.flags.lighthouseVisit || (G.state.story.chapter || 0) >= 6, en: 'At the lighthouse door: "Lit every night since 1931, except one. We don\'t talk about that night."', vi: 'Cửa hải đăng: “Sáng mỗi đêm từ năm 1931, trừ một đêm. Đừng nhắc tới đêm đó.”' },
];
// (each plaque is a small brass sign on a post, and says who brought the place back)
export function plaqueDrawables() {
  if (G.scene !== G.scenes.island) return [];
  return PLAQUES.filter(p => p.need()).map(p => ({ x: p.x, y: p.y, draw: c => {
    c.fillStyle = 'rgba(0,0,0,.15)'; c.beginPath(); c.ellipse(0, 1, 5, 1.8, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#6b4a36'; c.fillRect(-1, -12, 2, 12);
    c.fillStyle = '#d9b25a'; c.strokeStyle = '#5b3f36'; c.lineWidth = 0.8; c.beginPath(); c.roundRect ? c.roundRect(-7, -20, 14, 9, 1.5) : c.rect(-7, -20, 14, 9); c.fill(); c.stroke();
    c.strokeStyle = 'rgba(91,63,54,.45)'; c.lineWidth = 0.5; for (const y of [-17.5, -15.5, -13.5]) { c.beginPath(); c.moveTo(-5, y); c.lineTo(5, y); c.stroke(); }
  } }));
}
export function plaqueAction(pl) {
  if (G.scene !== G.scenes.island) return null;
  const p = PLAQUES.find(p => dist(pl.x, pl.y, p.x, p.y) < 26 && p.need());
  return p ? { label: T('Read the plaque', 'Đọc bảng'), icon: 'notebook', run: async () => {
    discover('plaque'); const r = (G.state.plaquesRead ||= {}); const k = p.x + ',' + p.y; if (!r[k]) { r[k] = 1; markDirty(); }
    await say(null, T(p.en, p.vi));
    await say(null, T(`Underneath, newer letters: "Restored by ${G.state.player.name || 'a newcomer'}." (Plaques read: ${Object.keys(r).length}/${PLAQUES.length})`, `Bên dưới, nét chữ mới hơn: “Được ${G.state.player.name || 'một người mới tới'} phục hồi.” (Bảng đã đọc: ${Object.keys(r).length}/${PLAQUES.length})`));
  } } : null;
}
export const PLAQUE_COUNT = () => PLAQUES.length;
