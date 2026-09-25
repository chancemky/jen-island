// Side quests: neighbours lose things (a kite, a net, a sandal…). Ask them if
// they need help, find the sparkle on the island, bring it back for a reward.

import { G, T, tr, markDirty, addMoney, addMat, addPantry } from './state.js';
import { say } from '../ui/dialogue.js';
import { showReward } from '../ui/sheets.js';
import { toast } from '../ui/hud.js';
import { sfx } from '../core/audio.js';
import { dist, TAU } from '../core/util.js';
import { INK } from '../gfx/draw.js';
import { addXP } from './progress.js';

export const SIDE_QUESTS = [
  { id: 'net', giver: 'chu_hai', ch: 2, x: 1330, y: 2330, item: ['fishing net', 'tấm lưới'], ask: ['The tide stole my best net. It\'s somewhere on the east beach. Could you look?', 'Thủy triều cuốn mất tấm lưới tốt nhất của chú. Chắc nó ở bãi biển phía đông. Con tìm giúp chú nha?'], thanks: ['My net! Now the fish have no excuses.', 'Tấm lưới của chú! Giờ thì cá hết đường chối.'], reward: { money: 60, mat: ['wood', 4] } },
  { id: 'sandal', giver: 'ba_tu', ch: 2, x: 610, y: 1790, item: ['sandal', 'chiếc dép'], ask: ['A dog ran off with my good sandal! Somewhere south of West Village…', 'Có con chó tha mất chiếc dép đẹp của bà! Ở đâu đó phía nam Xóm Tây…'], thanks: ['Ah, my sandal! Only a little chewed. Take this, dear.', 'A, chiếc dép của bà! Chỉ bị gặm chút xíu. Cầm lấy nè con.'], reward: { money: 50, ing: ['kumquat', 8] } },
  { id: 'kite', giver: 'be_na', ch: 3, x: 1600, y: 1250, item: ['kite', 'con diều'], ask: ['My kite flew away towards the rice paddies! It\'s the one shaped like a fish.', 'Con diều của em bay về phía ruộng lúa rồi! Con diều hình con cá đó.'], thanks: ['MY KITE! You\'re the best! I\'ll name it after you.', 'CON DIỀU CỦA EM! Anh chị giỏi nhất! Em sẽ đặt tên nó theo tên anh chị.'], reward: { money: 40 } },
  { id: 'lens', giver: 'minh', ch: 3, x: 760, y: 560, item: ['camera lens', 'ống kính'], ask: ['I dropped a lens near the lotus spring while chasing a heron. Help?', 'Mình làm rơi ống kính gần hồ sen lúc đuổi theo con cò. Giúp mình với?'], thanks: ['You found it! This lens has seen things. Mostly herons.', 'Bạn tìm được rồi! Ống kính này từng thấy nhiều thứ lắm. Chủ yếu là cò.'], reward: { money: 90 } },
  { id: 'letter', giver: 'chi_mai', ch: 4, x: 1420, y: 1180, item: ['lost letter', 'lá thư thất lạc'], ask: ['A letter blew out of my bag near the paddies. It\'s addressed to Mèo Mây — very important cat business.', 'Một lá thư bay khỏi túi chị gần ruộng lúa. Gửi cho Mèo Mây — chuyện mèo rất quan trọng.'], thanks: ['Thank you! It\'s from a fish seller. Mèo Mây has been waiting.', 'Cảm ơn em! Thư của cô bán cá. Mèo Mây chờ mãi.'], reward: { money: 70, mat: ['paint', 2] } },
  { id: 'hat', giver: 'co_lan', ch: 3, x: 1020, y: 700, item: ['flower hat', 'nón hoa'], ask: ['The wind took my flower hat up the restaurant hill!', 'Gió thổi bay cái nón hoa của cô lên đồi nhà hàng rồi!'], thanks: ['My hat! The flowers are only a little squished. Here — for you.', 'Nón của cô! Hoa chỉ bẹp chút xíu. Nè — cho con.'], reward: { money: 60, ing: ['herbs', 8] } },
  { id: 'toolbox', giver: 'anh_tuan', ch: 4, x: 1560, y: 1640, item: ['toolbox', 'hộp đồ nghề'], ask: ['I left my scooter toolbox somewhere in East Village. My brain was on lunch.', 'Anh để quên hộp đồ nghề sửa xe đâu đó ở Xóm Đông. Lúc đó đầu óc anh đi ăn trưa rồi.'], thanks: ['There it is! Now I can fix the squeaky brake. Beep beep!', 'Nó đây rồi! Giờ anh sửa được cái thắng kêu kẽo kẹt. Bíp bíp!'], reward: { money: 50, mat: ['metal', 3] } },
  { id: 'notebook', giver: 'linh', ch: 3, x: 300, y: 1880, item: ['study notebook', 'cuốn vở'], ask: ['My exam notes! I studied on the west beach and forgot them. Please!', 'Vở ôn thi của mình! Mình học ở bãi biển phía tây rồi bỏ quên. Làm ơn!'], thanks: ['You saved my grades! And maybe my life.', 'Bạn cứu điểm của mình! Và chắc cứu cả cuộc đời mình.'], reward: { money: 55 } },
  { id: 'shell', giver: 'vy', ch: 8, x: 2420, y: 1800, item: ['pink conch shell', 'vỏ ốc hồng'], ask: ['I need a pink conch to mix a new colour. There\'s one on the islet\'s south beach!', 'Mình cần một vỏ ốc hồng để pha màu mới. Có một cái ở bãi nam của cù lao!'], thanks: ['So pink! I\'ll call the colour “Your Name Pink”.', 'Hồng quá! Mình sẽ đặt tên màu là “Hồng Tên Bạn”.'], reward: { money: 120, mat: ['paint', 4] } },
];
const Q = () => (G.state.sideQuests ||= {}); // id → 'active' | 'found' | 'done'

export function questFor(rid) {
  const s = G.state;
  return SIDE_QUESTS.find(q => q.giver === rid && (Q()[q.id] || '') !== 'done' && s.story.chapter >= q.ch);
}
export function activeQuests() { return SIDE_QUESTS.filter(q => Q()[q.id] === 'active' || Q()[q.id] === 'found'); }

// Called from the resident chat menu. Returns true if the quest took the turn.
export async function questTalk(a, rid) {
  const q = questFor(rid); if (!q) return false;
  const st = Q()[q.id];
  if (!st) {
    await say(a, tr(q.ask), { emo: 'sad' });
    Q()[q.id] = 'active'; markDirty(true);
    toast({ text: T(`Side quest: find the ${q.item[0]}`, `Nhiệm vụ phụ: tìm ${q.item[1]}`), sub: T('Look for the sparkle — it\'s on your map too.', 'Tìm chỗ lấp lánh — có trên bản đồ nữa.'), icon: 'star' });
    return true;
  }
  if (st === 'active') { await say(a, T(`Any luck with my ${q.item[0]}?`, `Có thấy ${q.item[1]} của mình chưa?`), { emo: 'think' }); return true; }
  if (st === 'found') {
    await say(a, tr(q.thanks), { emo: 'happy' });
    Q()[q.id] = 'done';
    const r = q.reward; addMoney(r.money, 'quest'); addXP(60, 'quest');
    if (r.mat) addMat(r.mat[0], r.mat[1]); if (r.ing) addPantry(r.ing[0], r.ing[1]);
    G.state.friends[rid] = (G.state.friends[rid] || 0) + 3;
    markDirty(true); sfx('fanfare');
    await showReward({ icon: r.mat?.[0] || r.ing?.[0] || 'coin', kicker: T('Side quest complete!', 'Hoàn thành nhiệm vụ phụ!'), title: `+${r.money}k · +60 XP`, text: T(`${a.name} is really grateful.`, `${a.name} biết ơn bạn lắm.`) });
    return true;
  }
  return false;
}
export const questOption = rid => { const q = questFor(rid); if (!q) return null; const st = Q()[q.id]; return st === 'found' ? T(`Here's your ${q.item[0]}!`, `${q.item[1]} của bạn nè!`) : st === 'active' ? null : T('Need any help?', 'Có cần giúp gì không?'); };

export function updateSideQuests() {
  const pl = G.player; if (!pl || G.scene !== G.scenes?.island) return;
  for (const q of SIDE_QUESTS) {
    if (Q()[q.id] !== 'active') continue;
    if (dist(pl.x, pl.y, q.x, q.y) < 26) {
      Q()[q.id] = 'found'; markDirty(true); sfx('success');
      toast({ text: T(`Found the ${q.item[0]}!`, `Tìm thấy ${q.item[1]}!`), sub: T('Bring it back to its owner.', 'Mang trả cho chủ nhân nhé.'), icon: 'star', ms: 3200 });
    }
  }
}
export function drawSideQuests(c, t) {
  if (G.scene !== G.scenes?.island) return;
  for (const q of SIDE_QUESTS) {
    if (Q()[q.id] !== 'active') continue;
    const k = (Math.sin(t * 4) + 1) / 2;
    c.save(); c.translate(q.x, q.y);
    c.fillStyle = `rgba(255,230,120,${0.25 + k * 0.25})`; c.beginPath(); c.ellipse(0, 0, 14, 5, 0, 0, TAU); c.fill();
    for (let i = 0; i < 4; i++) { const a = t * 2 + i * TAU / 4, r = 8 + k * 3; c.fillStyle = '#fff6b0'; c.strokeStyle = INK; c.lineWidth = 0.5; const x = Math.cos(a) * r, y = -8 + Math.sin(a) * r * 0.5; c.beginPath(); c.moveTo(x, y - 3); c.lineTo(x + 1, y); c.lineTo(x, y + 3); c.lineTo(x - 1, y); c.closePath(); c.fill(); }
    c.fillStyle = '#ffd35a'; c.beginPath(); c.arc(0, -10 - k * 3, 3.4, 0, TAU); c.fill(); c.strokeStyle = INK; c.stroke();
    c.restore();
  }
}
