// Things that follow the shared island calendar (60 real days a year, four seasons of 15):
//  · Season stamp cards: six little things to do each season — fill the card for a seasonal
//    keepsake for your home
//  · Letters from Tín (Cô Dừa's nephew, studying in Đà Lạt): one every five days after you
//    meet his aunt — write back, and he answers
//  · The island year in review: at the turn of each island year, a card with your year
import { G, T, markDirty, addMoney } from './state.js';
import { bus, islandSeason, islandYear, jstDayNum } from '../core/util.js';
import { present, openSheet, h } from '../ui/sheets.js';
import { addXP } from './progress.js';
import { FURNITURE } from '../data/game.js';
import { albumPhotos } from './album.js';

// ---------------------------------------------------------------- season stamp cards
export const STAMPS = [
  { id: 'serve', n: 80, icon: '🍜', en: n => `Serve ${n} customers`, vi: n => `Phục vụ ${n} khách` },
  { id: 'fish', n: 3, icon: '🎣', en: n => `Catch ${n} fish`, vi: n => `Câu ${n} con cá` },
  { id: 'cart', n: 1, icon: '🍢', en: () => 'Buy a snack from a street cart', vi: () => 'Mua món ăn vặt ở xe đẩy' },
  { id: 'nature', n: 1, icon: '🌙', en: () => 'Visit the tide pool or go stargazing', vi: () => 'Ngắm hồ triều hoặc ngắm sao' },
  { id: 'photo', n: 1, icon: '📷', en: () => 'Take a photo', vi: () => 'Chụp một tấm ảnh' },
  { id: 'gift', n: 1, icon: '🎁', en: () => 'Give a neighbour a gift', vi: () => 'Tặng quà cho hàng xóm' },
];
const REWARD = { spring: 'blossom_branch', summer: 'lotus_lamp', autumn: 'harvest_basket', winter: 'warm_lantern' };
const seasonKey = () => islandYear() + ':' + islandSeason();
function card() {
  const s = G.state, k = seasonKey();
  if (s.stamps?.key !== k) s.stamps = { key: k, n: {}, done: false };
  return s.stamps;
}
function bump(id, by = 1) {
  const c = card(), st = STAMPS.find(x => x.id === id); if (!st || c.done) return;
  const was = c.n[id] || 0; if (was >= st.n) return;
  c.n[id] = was + by; markDirty();
  if (c.n[id] >= st.n) {
    bus.emit('toast', { text: T(`Stamp! ${st.en(st.n)}`, `Đóng dấu! ${st.vi(st.n)}`), sub: T(`Season card: ${STAMPS.filter(x => (c.n[x.id] || 0) >= x.n).length}/6`, `Thẻ mùa: ${STAMPS.filter(x => (c.n[x.id] || 0) >= x.n).length}/6`), icon: 'star', ms: 2600 });
    if (STAMPS.every(x => (c.n[x.id] || 0) >= x.n)) finishCard(c);
  }
}
function finishCard(c) {
  c.done = true; const f = REWARD[islandSeason()]; (G.state.home.owned ||= []).push(f); addMoney(300, 'gift'); addXP(150, 'stamps');
  G.state.stats.stampCards = (G.state.stats.stampCards || 0) + 1; markDirty(true);
  bus.emit('toast', { text: T('Season card complete!', 'Hoàn thành thẻ mùa!'), sub: T(`${FURNITURE[f]?.en} is waiting at home, and 300k.`, `${FURNITURE[f]?.vi} đang chờ ở nhà, kèm 300k.`), icon: 'star', cls: 'ach', ms: 4800 });
}
export function stampProgress() { const c = card(); return STAMPS.map(st => ({ ...st, have: Math.min(st.n, c.n[st.id] || 0), done: (c.n[st.id] || 0) >= st.n })); }
export function openStampCard() {
  const name = { spring: ['Spring', 'Mùa xuân'], summer: ['Summer', 'Mùa hè'], autumn: ['Autumn', 'Mùa thu'], winter: ['Winter', 'Mùa đông'] }[islandSeason()];
  openSheet({ title: T(`${name[0]} stamp card`, `Thẻ đóng dấu ${name[1].toLowerCase()}`), sub: T('Fill all six before the season ends', 'Đóng đủ sáu dấu trước khi hết mùa'), build: body => {
    const grid = h('div', 'stamp-grid'); body.appendChild(grid);
    for (const st of stampProgress()) grid.appendChild(h('div', 'stamp' + (st.done ? ' done' : ''), `<i>${st.icon}</i><b>${T(st.en(st.n), st.vi(st.n))}</b><small>${st.have}/${st.n}</small>`));
    const f = FURNITURE[REWARD[islandSeason()]]; body.appendChild(h('div', 'empty-note', card().done ? T('Card complete — see you next season!', 'Đã hoàn thành — hẹn mùa sau!') : T(`Prize: ${f?.en} and 300k`, `Phần thưởng: ${f?.vi} và 300k`)));
  } });
}

// ---------------------------------------------------------------- letters from Tín
const LETTERS = [
  { en: ['Dear friend of my aunt,', 'Cô Dừa says you took over my smoothie bar. Thank you! Is the blender still making that noise? Hit it twice on the left. It likes that.', 'It\'s cold in Đà Lạt. I wear three jumpers. My classmates laugh.'], vi: ['Gửi người bạn của cô Dừa,', 'Cô kể bạn đã nhận quán sinh tố của mình. Cảm ơn nhiều! Cái máy xay còn kêu không? Đập hai cái bên trái. Nó thích vậy.', 'Đà Lạt lạnh lắm. Mình mặc ba lớp áo. Bạn cùng lớp cười quá trời.'],
    replies: [['Tell him the blender sends its love', 'Kể là máy xay gửi lời thương'], ['Send him a photo of the beach', 'Gửi tấm ảnh bãi biển'], ['Ask about his studies', 'Hỏi chuyện học hành']] },
  { en: ['Hi again!', 'Thank you for writing back! Studies are hard — I\'m learning about plants, and the strawberries here are huge. Bigger than my fist.', 'Do people still order the passion fruit cooler? It was my favourite.'], vi: ['Lại là mình nè!', 'Cảm ơn bạn đã hồi âm! Học khó lắm — mình học về cây trồng, dâu ở đây to lắm. To hơn nắm tay luôn.', 'Mọi người còn gọi nước chanh dây không? Món mình thích nhất đó.'],
    replies: [['Yes — it sells out by noon!', 'Có — trưa là hết sạch!'], ['Ask him to send strawberries', 'Nhờ gửi ít dâu'], ['Tell him about the new menu', 'Kể về thực đơn mới']] },
  { en: ['Big news!', 'I got the best mark in my class for a project on coconut palms. I wrote about Bà Cả, the big palm at the cove. My teacher wants to visit the island!', 'Is it nice there this season?'], vi: ['Tin vui nè!', 'Mình được điểm cao nhất lớp với bài về cây dừa. Mình viết về Bà Cả, cây dừa to ở vịnh. Thầy mình muốn ra đảo chơi!', 'Mùa này ở đảo đẹp không?'],
    replies: [['Invite his teacher for a smoothie', 'Mời thầy ra uống sinh tố'], ['Describe the season', 'Tả cảnh mùa này'], ['Say Bà Cả is doing well', 'Kể Bà Cả vẫn khỏe']] },
  { en: ['Hello hello,', 'I miss the sea. The lake here is pretty but it doesn\'t have waves. It just sits there, like a cat.', 'Please give Mèo Mây a scratch behind the ears for me.'], vi: ['Xin chào xin chào,', 'Mình nhớ biển. Hồ ở đây đẹp mà không có sóng. Nó cứ nằm yên đó, như con mèo.', 'Gãi tai Mèo Mây giùm mình nha.'],
    replies: [['Promise to scratch Mèo Mây\'s ears', 'Hứa sẽ gãi tai Mèo Mây'], ['Send a jar of sea water (as a joke)', 'Gửi một lọ nước biển (giỡn thôi)'], ['Tell him the waves miss him too', 'Kể là sóng cũng nhớ cậu']] },
  { en: ['Dear island,', 'I\'m coming home for Tết this year! My aunt doesn\'t know yet — it\'s a surprise.', 'Can you keep a secret? Make sure there\'s mango smoothie on the menu.'], vi: ['Gửi hòn đảo,', 'Tết năm nay mình về! Cô Dừa chưa biết đâu — bí mật đó.', 'Bạn giữ bí mật giùm nha? Nhớ có sinh tố xoài trong thực đơn.'],
    replies: [['Promise to keep the secret', 'Hứa giữ bí mật'], ['Start planning a welcome', 'Lên kế hoạch đón'], ['Tell him the smoothies are ready', 'Nói sinh tố đã sẵn sàng']] },
  { en: ['Hi friend,', 'I planted a tiny coconut in a pot by my window. It looks lost in the mountains. I named it Bà Út.', 'When I graduate, I want to come back and grow things on the island.'], vi: ['Chào bạn,', 'Mình trồng một cây dừa con trong chậu cạnh cửa sổ. Nhìn nó lạc lõng giữa núi rừng ghê. Mình đặt tên nó là Bà Út.', 'Ra trường mình muốn về đảo trồng cây.'],
    replies: [['There\'s always a place here', 'Ở đây lúc nào cũng có chỗ'], ['Offer him a garden plot', 'Mời cậu một mảnh vườn'], ['Ask what he\'d grow', 'Hỏi cậu muốn trồng gì']] },
  { en: ['Hello!', 'My classmates read your letters too. They all want to visit "the island with the cat who runs things".', 'I told them the cat doesn\'t run things. Then I thought about it. Maybe she does.'], vi: ['Xin chào!', 'Bạn cùng lớp cũng đọc thư bạn. Ai cũng muốn tới "hòn đảo có con mèo làm chủ".', 'Mình bảo con mèo đâu có làm chủ. Rồi nghĩ lại. Chắc là có thật.'],
    replies: [['She definitely does', 'Chắc chắn là có'], ['Invite the whole class', 'Mời cả lớp ra chơi'], ['Say the island would love that', 'Đảo rất vui được đón']] },
  { en: ['Dear friend,', 'Thank you for every letter. You made a cold year warm. My aunt says you\'re family now — that makes us cousins, I think.', 'See you soon. Keep the blender happy. — Tín'], vi: ['Bạn thân mến,', 'Cảm ơn bạn vì từng lá thư. Bạn làm một năm lạnh lẽo trở nên ấm áp. Cô Dừa nói bạn giờ là người nhà rồi — vậy là tụi mình thành anh em họ.', 'Hẹn gặp lại. Nhớ giữ cái máy xay vui vẻ nha. — Tín'],
    replies: [['See you soon, cousin', 'Hẹn gặp lại nha, anh em'], ['The blender says hi', 'Máy xay gửi lời chào'], ['Come home whenever you like', 'Về lúc nào cũng được']] },
];
async function tinLetter() {
  const s = G.state, f = s.story.flags, L = (s.letters ||= { n: 0, last: -99, replies: [] });
  if (!f.smoothieIntro || L.n >= LETTERS.length || jstDayNum() - L.last < 5 || G.runtime.inCutscene) return;
  const letter = LETTERS[L.n]; L.n++; L.last = jstDayNum(); markDirty(true);
  await present(() => new Promise(done => {
    const el = document.createElement('div'); el.className = 'modal';
    const lines = T(letter.en.join('\n'), letter.vi.join('\n')).split('\n');
    el.innerHTML = `<div class="card letter"><div class="kicker">✉️ ${T('A letter from Đà Lạt', 'Thư từ Đà Lạt')}</div>${lines.map((l, i) => `<p style="text-align:left;opacity:.9${i === 0 ? ';font-weight:900' : ''}">${l}</p>`).join('')}<p style="text-align:right;font-weight:900">— Tín</p>
      <div class="list">${letter.replies.map((r, i) => `<button class="btn ghost" type="button" data-i="${i}">${T(r[0], r[1])}</button>`).join('')}</div></div>`;
    (document.getElementById('app') || document.body).appendChild(el);
    el.onclick = e => { const i = e.target.closest('[data-i]')?.dataset.i; if (i == null) return; L.replies.push(+i); addXP(15, 'letter'); markDirty(true); el.remove(); bus.emit('toast', { text: T('Your reply is on the morning ferry', 'Thư trả lời đã lên chuyến tàu sáng'), icon: 'letter', ms: 2400 }); done(); };
  }));
}

// ---------------------------------------------------------------- the year in review
function yearSnap() { const s = G.state; return { year: islandYear(), served: s.stats.served || 0, lifetime: s.lifetime || 0, fish: s.stats.fishCaught || 0, photos: s.stats.photos || 0, discovered: Object.keys(s.discovered || {}).length, level: s.level || 1, day: s.day }; }
async function yearReview() {
  const s = G.state;
  if (!s.yearSnap) { s.yearSnap = yearSnap(); markDirty(); return; }
  if (islandYear() <= s.yearSnap.year) return;
  const a = s.yearSnap, b = yearSnap(); s.yearSnap = b; markDirty(true);
  const photos = albumPhotos().slice(-3);
  await present(() => new Promise(done => {
    const el = document.createElement('div'); el.className = 'modal';
    const stat = (n, en, vi) => `<div class="yr-stat"><b>${Math.max(0, n).toLocaleString()}</b><small>${T(en, vi)}</small></div>`;
    el.innerHTML = `<div class="card year"><div class="kicker">${T(`Island year ${a.year} in review`, `Nhìn lại năm thứ ${a.year} trên đảo`)}</div><h2>${s.island.name || 'Bistro Island'}</h2>
      <div class="yr-grid">${stat(b.served - a.served, 'customers served', 'lượt khách')}${stat(Math.round(b.lifetime - a.lifetime), 'k earned', 'k kiếm được')}${stat(b.fish - a.fish, 'fish caught', 'con cá')}${stat(b.photos - a.photos, 'photos taken', 'tấm ảnh')}${stat(b.discovered - a.discovered, 'new things tried', 'điều mới thử')}${stat(b.level - a.level, 'levels gained', 'cấp độ tăng')}</div>
      ${photos.length ? `<div class="yr-photos">${photos.map(p => `<img src="${p.img}" alt="">`).join('')}</div>` : ''}
      <p>${T('Happy new island year! Spring is here again.', 'Chúc mừng năm mới trên đảo! Mùa xuân lại về.')}</p><button class="btn primary" type="button">${T('Here\'s to another year', 'Chào năm mới')}</button></div>`;
    (document.getElementById('app') || document.body).appendChild(el); bus.emit('stinger', 'award');
    el.querySelector('button').onclick = () => { el.remove(); done(); };
  }));
}

export async function seasonalCheck() { card(); await yearReview(); await tinLetter(); }
export function initSeasonal() {
  bus.on('served', () => bump('serve'));
  bus.on('fish', (id, size, junk) => { if (!junk) bump('fish'); });
  bus.on('vendorBuy', () => bump('cart'));
  bus.on('discover', k => { if (k === 'tidepool' || k === 'stars') bump('nature'); });
  bus.on('tidepool', () => bump('nature')); bus.on('stargazed', () => bump('nature'));
  bus.on('photo', () => bump('photo'));
  bus.on('gift', () => bump('gift'));
  setTimeout(() => seasonalCheck(), 12000);
}
