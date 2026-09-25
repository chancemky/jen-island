// Little joys: jokes, rare surprise gifts (always with a reason), a quick
// game of oẳn tù tì (rock-paper-scissors) with the neighbours, floating
// speech bubbles when you walk past, and Mèo Mây's silly antics.

import { G, T, tr, markDirty, addMoney, addPantry, addMat } from './state.js';
import { say, ask } from '../ui/dialogue.js';
import { showReward } from '../ui/sheets.js';
import { sfx } from '../core/audio.js';
import { choice, rand, dist, TAU } from '../core/util.js';
import { INK } from '../gfx/draw.js';
import { ingName, matName } from '../data/game.js';
import { addXP } from './progress.js';
import { questOption, questTalk } from './sidequests.js';

// ---------------------------------------------------------------- jokes
export const JOKES = [
  ['Why did the kumquat stop halfway up the hill? It ran out of juice.', 'Tại sao trái tắc leo nửa dốc thì dừng? Vì hết nước.'],
  ['What do you call a sleepy bánh mì? A baguette-to-bed.', 'Gọi ổ bánh mì buồn ngủ là gì? Bánh mì… ngủ gật.'],
  ['I tried to catch fog this morning. I mist.', 'Sáng nay mình cố bắt sương mù. Mà trượt. Mù thật.'],
  ['Why don\'t crabs share their snacks? Because they\'re shellfish.', 'Sao cua không chia đồ ăn? Vì nó… “cua” lắm.'],
  ['What did the ocean say to the beach? Nothing, it just waved.', 'Biển nói gì với bờ cát? Không nói gì, chỉ vẫy tay thôi.'],
  ['Coffee has a rough life. It gets mugged every morning.', 'Cà phê khổ lắm. Sáng nào cũng bị “phin” cho một trận.'],
  ['Why was the phở so calm? It had plenty of broth-er-ly love.', 'Sao tô phở bình tĩnh thế? Vì có nước dùng… “hầm” lâu rồi.'],
  ['My fishing rod and I broke up. It was too clingy — always reeling me in.', 'Mình với cần câu chia tay rồi. Nó bám dai quá, cứ kéo mình lại hoài.'],
  ['What do you call a noodle that tells lies? An im-pasta. Don\'t tell the phở.', 'Gọi sợi mì hay nói dối là gì? Mì… “xạo”. Đừng nói với tô phở nha.'],
  ['The seagull stole my sandwich, so now I\'m on a sea-food diet. I see food, I lose it.', 'Chim hải âu giật ổ bánh mì của mình. Giờ mình ăn kiêng kiểu “thấy là mất”.'],
  ['Why did the scooter get a medal? It was outstanding in its field. It was parked in a field.', 'Sao xe máy được huy chương? Vì nó nổi bật giữa đồng. Nó đậu ngoài đồng thật.'],
  ['I told the lighthouse a joke. It was very bright about it.', 'Mình kể chuyện cười cho ngọn hải đăng nghe. Nó sáng dạ lắm.'],
];
const MEO_JOKES = [
  ['Why did the cat sit on the computer? To keep an eye on the mouse. I don\'t know what a computer is.', 'Sao con mèo ngồi lên máy tính? Để canh con chuột. Mình không biết máy tính là gì.'],
  ['What\'s a cat\'s favourite colour? Purr-ple. Laugh. Please.', 'Mèo thích màu gì nhất? Màu… “meo-ve”. Cười đi mà.'],
  ['I\'m not lazy. I\'m in energy-saving mode. Forever.', 'Mình không lười. Mình đang ở chế độ tiết kiệm năng lượng. Vĩnh viễn.'],
  ['I knocked a cup off the table yesterday. Science requires it.', 'Hôm qua mình hất cái ly khỏi bàn. Vì khoa học thôi.'],
  ['Nine lives? I spent three of them on naps this week.', 'Chín mạng à? Tuần này mình tiêu ba mạng vào ngủ trưa rồi.'],
];
export const randomJoke = () => tr(choice(JOKES));
export const meoJoke = () => tr(choice(MEO_JOKES));

// ---------------------------------------------------------------- gifts
const GIFTS = {
  ba_tu: [{ ing: 'kumquat', n: 6, why: ['My kumquat tree gave too many again. Take them before the birds do!', 'Cây tắc nhà bà lại sai quả quá. Cầm đi con, kẻo chim ăn hết!'] }, { money: 30, why: ['For you! You remind me of me when I had the tea stand.', 'Cho con nè! Nhìn con bà nhớ hồi bà còn bán trà.'] }],
  chu_hai: [{ ing: 'shrimp', n: 6, why: ['The net came up too full this morning. The sea likes you.', 'Sáng nay lưới đầy quá. Biển thương con đó.'] }, { mat: 'wood', n: 4, why: ['Found this driftwood. Too pretty to burn.', 'Nhặt được gỗ trôi dạt. Đẹp quá đốt thì tiếc.'] }],
  linh: [{ money: 25, why: ['I won a photo contest with a picture of your shop! Half the prize is yours.', 'Mình thắng cuộc thi ảnh nhờ chụp quán bạn! Chia bạn nửa giải nè.'] }, { ing: 'milk', n: 8, why: ['My dorm fridge is too full of milk. Long story.', 'Tủ lạnh ký túc xá đầy sữa. Chuyện dài lắm.'] }],
  minh: [{ money: 40, why: ['A magazine bought my island photos. Coffee is on me — well, this is coffee money.', 'Tạp chí mua ảnh đảo của mình. Mình bao cà phê — à, đây là tiền cà phê.'] }],
  co_lan: [{ ing: 'herbs', n: 8, why: ['My garden is basically a jungle now. Please take some herbs.', 'Vườn cô thành rừng rồi. Lấy bớt rau thơm giùm cô.'] }, { mat: 'paint', n: 2, why: ['Leftover paint from my flower cart. It\'s a very cheerful pink.', 'Sơn thừa từ xe hoa của cô. Màu hồng vui lắm.'] }],
  be_na: [{ ing: 'beans', n: 6, why: ['I saved these beans for chè! You make it, I eat it. Deal?', 'Em để dành đậu nấu chè nè! Anh chị nấu, em ăn. Chịu không?'] }, { money: 5, why: ['This is all my money. Five thousand! Buy something nice.', 'Đây là hết tiền của em. Năm nghìn! Mua gì đó đẹp nha.'] }],
  anh_tuan: [{ mat: 'metal', n: 3, why: ['Old scooter panels. Better on your roof than in my shed.', 'Tôn xe cũ. Lên mái nhà bạn còn hơn nằm trong kho.'] }],
  vy: [{ mat: 'paint', n: 3, why: ['Extra paint! My easel only has two hands. I mean legs. Three legs.', 'Sơn dư nè! Giá vẽ của mình chỉ có hai tay. À không, ba chân.'] }, { money: 45, why: ['Someone bought a painting of your shop. Half is yours — it was your shop!', 'Có người mua bức tranh quán bạn. Chia bạn nửa — quán của bạn mà!'] }],
  chi_mai: [{ ing: 'lime', n: 8, why: ['Doctor\'s orders: vitamin C. Also I bought too many limes.', 'Lời khuyên của y tá: vitamin C. Mà chị cũng lỡ mua nhiều chanh quá.'] }, { money: 20, why: ['A thank-you from a patient. They said the tea stand made them better!', 'Quà cảm ơn từ bệnh nhân. Họ nói uống trà quán em là khỏe!'] }],
};
function tryGift(rid) {
  const s = G.state, key = 'gift:' + rid;
  if (s.story.flags[key] === s.day || (s.story.flags.giftDay === s.day && (s.story.flags.giftsToday || 0) >= 2)) return null;
  if (Math.random() > 0.07) return null;
  const g = choice(GIFTS[rid] || []); if (!g) return null;
  s.story.flags[key] = s.day;
  if (s.story.flags.giftDay !== s.day) { s.story.flags.giftDay = s.day; s.story.flags.giftsToday = 0; }
  s.story.flags.giftsToday++;
  markDirty(true);
  return g;
}
async function giveGift(a, g) {
  await say(a, tr(g.why), { emo: 'happy' });
  let label;
  if (g.ing) { addPantry(g.ing, g.n); label = `${ingName(g.ing)} ×${g.n}`; }
  else if (g.mat) { addMat(g.mat, g.n); label = `${matName(g.mat)} ×${g.n}`; }
  else { addMoney(g.money, 'gift'); label = `+${g.money}k`; }
  sfx('fanfare');
  await showReward({ icon: g.ing || g.mat || 'coin', kicker: T('A surprise gift!', 'Quà bất ngờ!'), title: label, text: T(`From ${a.name}`, `Từ ${a.name}`) });
}

// ---------------------------------------------------------------- rock paper scissors
const HANDS = ['rock', 'paper', 'scissors'];
const HAND_LABEL = { rock: ['✊ Rock', '✊ Búa'], paper: ['✋ Paper', '✋ Bao'], scissors: ['✌️ Scissors', '✌️ Kéo'] };
const beats = (x, y) => (x === 'rock' && y === 'scissors') || (x === 'paper' && y === 'rock') || (x === 'scissors' && y === 'paper');
export async function playRPS(a, who) {
  const s = G.state, key = 'rps:' + (who || a.name);
  const played = s.story.flags[key]?.day === s.day ? s.story.flags[key].n : 0;
  if (played >= 3) { await say(a, T('No more today! My hand is tired. Tomorrow — rematch!', 'Hôm nay đủ rồi! Tay mỏi quá. Mai tái đấu nha!'), { emo: 'happy' }); return; }
  for (let round = 0; round < 3; round++) {
    const pick = await ask(a, round ? T('Tie! Again — oẳn tù tì…', 'Hòa! Lại nào — oẳn tù tì…') : T('Oẳn tù tì! Rock, paper, scissors… pick one!', 'Oẳn tù tì! Ra cái gì ra cái này…'), HANDS.map(k => T(...HAND_LABEL[k])));
    const me = HANDS[pick] || 'rock', them = choice(HANDS);
    a.setAct('cheer'); sfx('pop');
    await say(a, T(`…${HAND_LABEL[them][0]}!`, `…${HAND_LABEL[them][1]}!`), { emo: 'happy' });
    a.setAct(null);
    if (me === them) continue;
    s.story.flags[key] = { day: s.day, n: played + 1 }; markDirty();
    if (beats(me, them)) {
      const prize = Math.round(rand(8, 25));
      sfx('success'); addMoney(prize, 'game'); addXP(8, 'game');
      if (a.data?.rid) s.friends[a.data.rid] = (s.friends[a.data.rid] || 0) + 1;
      await say(a, choice([T(`Nooo! You win. Here's ${prize}k — a deal's a deal.`, `Khônggg! Bạn thắng. ${prize}k nè — chơi là chịu.`), T(`How?! Fine, ${prize}k. You must have practised on Mèo Mây.`, `Sao được vậy?! Thôi, ${prize}k. Chắc bạn luyện với Mèo Mây rồi.`)]), { emo: 'sad' });
    } else {
      sfx('sad');
      await say(a, choice([T('Ha! I win! I\'ll tell the whole island.', 'Ha! Tui thắng! Tui kể cả đảo nghe.'), T('Victory! I\'m the rock-paper-scissors champion of this beach.', 'Chiến thắng! Tui là vua oẳn tù tì của bãi biển này.'), T('Better luck next time. My scissors are undefeated. Mostly.', 'Lần sau may hơn nha. Cái kéo của tui bất bại. Gần như vậy.')]), { emo: 'happy' });
    }
    return;
  }
  await say(a, T('Three ties?! We\'re too similar. That\'s a little scary.', 'Hòa ba lần?! Tụi mình giống nhau quá. Hơi sợ đó.'), { emo: 'think' });
}

// ---------------------------------------------------------------- resident conversation menu
export async function residentMenu(a, rid, chat) {
  const opts = [T('Chat', 'Trò chuyện'), T('Tell me a joke!', 'Kể chuyện cười đi!'), T('Oẳn tù tì?', 'Oẳn tù tì không?'), T('Bye!', 'Tạm biệt!')];
  const qo = questOption(rid);
  if (qo) opts.unshift(qo);
  let pick = await ask(a, choice([T('Oh, hi!', 'Ơ, chào!'), T(`Hey ${G.state.player.name}!`, `Ê ${G.state.player.name}!`), T('What\'s up?', 'Có chuyện gì vậy?')]), opts, { emo: 'happy' });
  if (qo) { if (pick === 0) { await questTalk(a, rid); return; } pick--; }
  if (pick === 0) await chat();
  else if (pick === 1) { await say(a, randomJoke(), { emo: 'happy' }); a.setAct('cheer'); G.player.showEmote('happy', 1.4); sfx('pop'); setTimeout(() => a.act === 'cheer' && a.setAct(null), 1200); }
  else if (pick === 2) await playRPS(a, rid);
  else { a.setAct('wave'); await say(a, T('See you!', 'Gặp lại nha!')); a.setAct(null); }
  const g = pick !== 3 && tryGift(rid);
  if (g) await giveGift(a, g);
}

// ---------------------------------------------------------------- floating speech bubbles
const barks = [];
export function bark(actor, text, dur = 2.6) { if (barks.some(b => b.actor === actor)) return; barks.push({ actor, text, t: 0, dur }); }
const IDLE_BARKS = [
  ['Nice weather for bánh mì.', 'Trời đẹp ghê, hợp ăn bánh mì.'], ['Have you seen my sandal?', 'Có ai thấy chiếc dép của tui không?'], ['*hums a song*', '*ngân nga hát*'],
  ['The ferry\'s late again…', 'Tàu lại trễ nữa rồi…'], ['I could eat a whole pot of phở.', 'Tui ăn được nguyên nồi phở.'], ['Mèo Mây stole my hat again.', 'Mèo Mây lại lấy nón của tui.'],
  ['So sunny!', 'Nắng ghê!'], ['Hi hi!', 'Hí hí!'], ['*yawns*', '*ngáp*'], ['Is it lunch yet?', 'Tới giờ ăn trưa chưa?'],
];
let barkT = 4;
export function updateBarks(dt) {
  for (let i = barks.length - 1; i >= 0; i--) { barks[i].t += dt; if (barks[i].t > barks[i].dur || !barks[i].actor.visible) barks.splice(i, 1); }
  barkT -= dt;
  if (barkT > 0 || G.scene !== G.scenes?.island || !G.player) return;
  barkT = rand(5, 10);
  const near = (G.npcs?.residents || []).concat(G.npcs?.tourists || []).filter(a => a.visible && dist(a.x, a.y, G.player.x, G.player.y) < 150 && !a.path);
  if (near.length) bark(choice(near), tr(choice(IDLE_BARKS)));
}
export function drawBarks(c, t) {
  if (G.scene !== G.scenes?.island) return;
  c.save(); c.font = '800 7px Nunito, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  for (const b of barks) {
    const a = b.actor, k = b.t / b.dur, pop = Math.min(1, b.t * 6), fade = k > 0.85 ? (1 - k) / 0.15 : 1;
    const top = a.kind === 'cat' ? 40 : (a.look?.sprite ? 54 : 50);
    const w = Math.min(120, c.measureText(b.text).width + 12);
    c.save(); c.globalAlpha = fade; c.translate(a.x, a.y - top - 6 - b.t * 2); c.scale(pop, pop);
    c.beginPath(); c.roundRect ? c.roundRect(-w / 2, -8, w, 15, 7) : c.rect(-w / 2, -8, w, 15);
    c.fillStyle = '#fffaf0'; c.fill(); c.strokeStyle = INK; c.lineWidth = 0.8; c.stroke();
    c.beginPath(); c.moveTo(-3, 7); c.lineTo(0, 11); c.lineTo(3, 7); c.fillStyle = '#fffaf0'; c.fill();
    c.fillStyle = INK; c.fillText(b.text, 0, 0, w - 8);
    c.restore();
  }
  c.restore();
}

// ---------------------------------------------------------------- Mèo Mây antics
const ANTICS = [
  { act: 'spin', dur: 2.2, say: ['Almost got it! Almost! …the tail wins again.', 'Suýt bắt được! Suýt! …cái đuôi lại thắng.'] },
  { act: 'dance', dur: 2.6, say: ['♪ Cha-cha-cha, fish fish fish ♪', '♪ Cha-cha-cha, cá cá cá ♪'] },
  { act: 'faint', dur: 2.6, say: ['*smells grilled fish* …I\'m fine. I\'m FINE.', '*ngửi thấy cá nướng* …mình ổn. Mình ỔN.'] },
  { act: 'roll', dur: 1.6, say: ['Belly rub? Just kidding, it\'s a trap.', 'Gãi bụng hông? Đùa thôi, bẫy đó.'] },
  { act: 'sneeze', dur: 1.2, say: ['Achoo! …pardon me. Pollen.', 'Hắt xì! …xin lỗi nha. Phấn hoa.'] },
];
export function meoAntic(m) {
  const a = choice(ANTICS);
  m.setAct(a.act); m.actT = 0;
  if (a.act === 'sneeze') sfx('pop'); else if (a.act === 'faint') sfx('sad'); else sfx('meow');
  bark(m, tr(a.say), a.dur + 1);
  setTimeout(() => { if (m.act === a.act) m.setAct(null); }, a.dur * 1000);
}
// transform for the antics, applied in drawCat before the body is drawn
export function anticTransform(c, a) {
  const at = a.actT || 0;
  switch (a.act) {
    case 'spin': { const k = Math.cos(at * 14); c.translate(0, -Math.abs(Math.sin(at * 7)) * 3); c.scale(Math.sign(k) * Math.max(0.15, Math.abs(k)), 1); break; }
    case 'dance': c.translate(Math.sin(at * 8) * 3, -Math.abs(Math.sin(at * 8)) * 4); c.rotate(Math.sin(at * 8) * 0.18); break;
    case 'faint': { const k = Math.min(1, at / 0.35); c.rotate(-k * Math.PI / 2 * 0.95); c.translate(-k * 3, 0); break; }
    case 'roll': c.translate(0, -8); c.rotate(at / 1.6 * TAU); c.translate(0, 8); break;
    case 'sneeze': { const k = at < 0.5 ? at / 0.5 : 1 - (at - 0.5) / 0.7; c.rotate(-k * 0.2); c.scale(1 + k * 0.06, 1 - k * 0.06); break; }
  }
}
