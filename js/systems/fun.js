// Little joys: jokes, rare surprise gifts (always with a reason), a quick
// game of oẳn tù tì (rock-paper-scissors) with the neighbours, floating
// speech bubbles when you walk past, and Mèo Mây's silly antics.

import { BIRTHDAYS, isBirthday } from './interact.js';
import { applyPlayerPronouns, profileOf } from './pronouns.js';
import { G, T, tr, markDirty, addMoney, addPantry, addMat } from './state.js';
import { say, ask } from '../ui/dialogue.js';
import { showReward } from '../ui/sheets.js';
import { sfx } from '../core/audio.js';
import { choice, rand, dist } from '../core/util.js';
import { INK } from '../gfx/draw.js';
import { ingName, matName, INGREDIENTS } from '../data/game.js';
import { addXP } from './progress.js';
import { questOption, questTalk } from './sidequests.js';
import { islandDay } from '../core/util.js';

// ---------------------------------------------------------------- jokes
export const JOKES = [
  ['Why did the kumquat stop halfway up the hill? It ran out of juice.', 'Tại sao trái tắc leo nửa dốc thì dừng? Vì hết nước.'],
  ['What do you call a sleepy bánh mì? A baguette-to-bed.', 'Gọi ổ bánh mì buồn ngủ là gì? Bánh mì… ngủ gật.'],
  ['I tried to catch fog this morning. I mist.', 'Sáng nay {me} cố bắt sương mù. Mà trượt. Mù thật.'],
  ['Why don\'t crabs share their snacks? Because they\'re shellfish.', 'Sao cua không chia đồ ăn? Vì nó… “cua” lắm.'],
  ['What did the ocean say to the beach? Nothing, it just waved.', 'Biển nói gì với bờ cát? Không nói gì, chỉ vẫy tay thôi.'],
  ['Coffee has a rough life. It gets mugged every morning.', 'Cà phê khổ lắm. Sáng nào cũng bị “phin” cho một trận.'],
  ['Why was the phở so calm? It had plenty of broth-er-ly love.', 'Sao tô phở bình tĩnh thế? Vì có nước dùng… “hầm” lâu rồi.'],
  ['My fishing rod and I broke up. It was too clingy — always reeling me in.', '{Me} với cần câu chia tay rồi. Nó bám dai quá, cứ kéo {me} lại hoài.'],
  ['What do you call a noodle that tells lies? An im-pasta. Don\'t tell the phở.', 'Gọi sợi mì hay nói dối là gì? Mì… “xạo”. Đừng nói với tô phở nha.'],
  ['The seagull stole my sandwich, so now I\'m on a sea-food diet. I see food, I lose it.', 'Chim hải âu giật ổ bánh mì của {me}. Giờ {me} ăn kiêng kiểu “thấy là mất”.'],
  ['Why did the scooter get a medal? It was outstanding in its field. It was parked in a field.', 'Sao xe máy được huy chương? Vì nó nổi bật giữa đồng. Nó đậu ngoài đồng thật.'],
  ['I told the lighthouse a joke. It was very bright about it.', '{Me} kể chuyện cười cho ngọn hải đăng nghe. Nó sáng dạ lắm.'],
];
const MEO_JOKES = [
  ['Why did the cat sit on the computer? To keep an eye on the mouse. I don\'t know what a computer is.', 'Sao con mèo ngồi lên máy tính? Để canh con chuột. Mình không biết máy tính là gì.'],
  ['What\'s a cat\'s favourite colour? Purr-ple. Laugh. Please.', 'Mèo thích màu gì nhất? Màu… “meo-ve”. Cười đi mà.'],
  ['I\'m not lazy. I\'m in energy-saving mode. Forever.', 'Mình không lười. Mình đang ở chế độ tiết kiệm năng lượng. Vĩnh viễn.'],
  ['I knocked a cup off the table yesterday. Science requires it.', 'Hôm qua mình hất cái ly khỏi bàn. Vì khoa học thôi.'],
  ['Nine lives? I spent three of them on naps this week.', 'Chín mạng à? Tuần này mình tiêu ba mạng vào ngủ trưa rồi.'],
];
// more shared jokes (visitors and anyone without their own)
JOKES.push(
  ['Why did the tourist bring a ladder to the café? They heard the coffee was on the house.', 'Sao du khách mang thang tới quán cà phê? Vì nghe nói cà phê… “nhà làm”.'],
  ['I asked the sea for advice. It said: go with the flow.', '{Me} hỏi biển xin lời khuyên. Biển bảo: cứ trôi theo dòng.'],
  ['My sunscreen and I have a relationship. It protects me, I forget it at home.', 'Kem chống nắng với {me} thân lắm. Nó bảo vệ {me}, còn {me} thì bỏ quên nó ở nhà.'],
  ['What do you call a fish with no eyes? A fsh.', 'Gọi con cá không có mắt là gì? Là… cá “mù” tịt.'],
  ['I tried to take a photo of the sunset, but it went down before I found my phone.', '{Me} định chụp hoàng hôn, mà tìm ra điện thoại thì mặt trời lặn mất rồi.'],
  ['The ferry was so slow, I aged a year. Happy birthday to me.', 'Tàu chạy chậm tới mức {me} già thêm một tuổi. Chúc mừng sinh nhật {me}.'],
  ['Why don\'t mangoes ever get lonely? They hang out in bunches.', 'Sao xoài không bao giờ cô đơn? Vì tụi nó toàn đi… theo chùm.'],
  ['I came for one bánh mì. I have now eaten four. The island wins.', '{Me} định ăn một ổ bánh mì thôi. Giờ ăn tới ổ thứ tư. Hòn đảo thắng.'],
  ['What did the palm tree say to the coconut? Hang in there.', 'Cây dừa nói gì với trái dừa? Ráng bám chắc nha.'],
  ['I told a crab a secret. Now the whole beach is walking sideways about it.', '{Me} kể bí mật cho con cua. Giờ cả bãi biển đi ngang bàn tán.'],
);
// every islander has a few of their own
const CHAR_JOKES = {
  ong_loc: [['Why do old fishermen never get lost? Because they know all the knots… I mean, the nots.', 'Sao ngư dân già không bao giờ lạc? Vì họ biết hết mọi nút… à, mọi lối.'], ['I asked the sea for a raise. It sent a wave.', 'Ông xin biển tăng lương. Biển gửi một con sóng.']],
  chi_ngoc: [['My guesthouse has five-star reviews. From the geckos. They love the ceiling.', 'Nhà nghỉ chị được năm sao. Của mấy con thằn lằn. Tụi nó mê cái trần nhà.'], ['A guest asked for a room with a view. I gave them a mirror. They laughed. I gave them the real one.', 'Khách đòi phòng có view. Chị đưa cái gương. Khách cười. Chị đưa phòng thật.']],
  co_dua: [['Why did the coconut go to school? To get a little more mature. Ripe, I mean.', 'Sao trái dừa đi học? Để chín chắn hơn. Chín, ý cô là vậy.'], ['I dropped a coconut on my foot once. It was a very hard lesson.', 'Có lần cô làm rớt trái dừa trúng chân. Bài học rất… cứng.']],
  ba_tu: [['When I was young, kumquats were so sour we used them to wake the roosters.', 'Hồi bà còn trẻ, tắc chua tới mức người ta dùng nó để đánh thức gà trống.'], ['My knees predict the weather. Today they say: sit down.', 'Đầu gối bà dự báo thời tiết giỏi lắm. Hôm nay nó bảo: ngồi xuống đi.'], ['Forty years selling tea, and the best customer was a cat who never paid.', 'Bốn mươi năm bán trà, khách ruột nhất là một con mèo chưa trả đồng nào.']],
  chu_hai: [['The fish I caught yesterday was THIS big. The one I lost was bigger.', 'Con cá chú câu hôm qua to CỠ NÀY. Con bị sổng còn to hơn.'], ['I talk to the fish. They never answer. Very polite listeners.', 'Chú hay nói chuyện với cá. Tụi nó chẳng bao giờ trả lời. Nghe lịch sự lắm.'], ['Why do fishermen never lie? Because the net always tells the truth. Mostly.', 'Sao ngư dân không bao giờ nói dối? Vì tấm lưới luôn nói thật. Gần như vậy.']],
  linh: [['My exams are like the tide. They come back twice a day.', 'Mấy kỳ thi của mình như thủy triều. Ngày nào cũng quay lại hai lần.'], ['I studied so hard I dreamed in equations. The answer was milk tea.', 'Mình học nhiều tới mức nằm mơ toàn phương trình. Đáp án là trà sữa.'], ['My professor said I have a bright future. Then he looked at my phone battery: 3%.', 'Thầy nói tương lai mình sáng lạn. Rồi thầy nhìn pin điện thoại mình: 3%.']],
  minh: [['I have a thousand photos of the sunset. They\'re all the same sunset.', 'Mình có một ngàn tấm ảnh hoàng hôn. Tấm nào cũng là cùng một cái hoàng hôn.'], ['Photographers never argue. We just see things from different angles.', 'Dân chụp ảnh không bao giờ cãi nhau. Chỉ là nhìn mọi thứ từ góc khác thôi.'], ['I tried to photograph Mèo Mây. I got four hundred pictures of its tail.', 'Mình thử chụp Mèo Mây. Được bốn trăm tấm toàn cái đuôi.']],
  co_lan: [['Why did the rose go to school? To become a little bud-dy smarter.', 'Sao bông hồng đi học? Để… “nở” mày nở mặt.'], ['I talk to my flowers every morning. The sunflowers are the only ones who look at me.', 'Sáng nào cô cũng nói chuyện với hoa. Chỉ có hoa hướng dương là chịu nhìn cô.'], ['A customer asked for flowers that never die. I sold them a painting.', 'Có khách hỏi mua hoa không bao giờ tàn. Cô bán cho họ một bức tranh.']],
  be_na: [['Why is chè the best? Because it\'s sweet AND you eat it with a spoon. Two good things!', 'Sao chè ngon nhất? Vì nó ngọt MÀ còn ăn bằng muỗng. Hai điều tuyệt vời!'], ['I tried to count the stars. I got to eleven and fell asleep.', 'Em thử đếm sao. Đếm tới mười một là ngủ mất tiêu.'], ['My tooth is wobbly. Mèo Mây says that means I\'m becoming a grown-up. I\'m not ready.', 'Răng em lung lay rồi. Mèo Mây nói vậy là em sắp thành người lớn. Em chưa sẵn sàng.']],
  anh_tuan: [['My scooter and I have been together ten years. It still won\'t start on Mondays.', 'Anh với chiếc xe này mười năm rồi. Thứ Hai nó vẫn không chịu nổ máy.'], ['Why did the scooter go to therapy? Too many people honking at it.', 'Sao xe máy đi gặp bác sĩ tâm lý? Vì bị bóp còi nhiều quá.'], ['I drove a tourist to the market. They tipped me in seashells. I accepted.', 'Anh chở du khách ra chợ. Họ boa anh bằng vỏ sò. Anh nhận luôn.']],
  chi_mai: [['A patient told me they felt like a deck of cards. I said: I\'ll deal with you later.', 'Có bệnh nhân nói họ thấy mình như bộ bài. Anh bảo: để anh “chia” thời gian khám sau.'], ['The best medicine is laughter. The second best is kumquat tea. The third is actual medicine.', 'Thuốc tốt nhất là tiếng cười. Thứ hai là trà tắc. Thứ ba mới là thuốc thật.'], ['Mèo Mây came in with a cough. Turned out it just wanted a treat.', 'Mèo Mây tới khám vì ho. Hóa ra nó chỉ muốn xin đồ ăn vặt.']],
  vy: [['I painted a perfect sunset. Then the real sun came out and ruined it.', 'Mình vẽ được bức hoàng hôn hoàn hảo. Rồi mặt trời thật ló ra làm hỏng hết.'], ['Why did the painter go to the island? For a change of scenery. Literally.', 'Sao họa sĩ ra đảo? Để đổi phong cảnh. Theo đúng nghĩa đen.'], ['My brushes are always wet. My tea is always cold. That\'s art.', 'Cọ của mình lúc nào cũng ướt. Trà lúc nào cũng nguội. Nghệ thuật là vậy.']],
  chi_tien: [['A customer asked for a haircut like Mèo Mây. I said: I don\'t do fur.', 'Có khách đòi cắt tóc giống Mèo Mây. Chị nói: chị không cắt lông.'], ['Bad hair day? On this island we call it a windy day.', 'Tóc xấu hả? Trên đảo này gọi là ngày gió to.']],
  co_ba: [['I sewed a shirt so fine the needle asked for a raise.', 'Cô may cái áo khéo tới mức cây kim đòi tăng lương.'], ['Fashion tip: anything looks good if you walk like you own the beach.', 'Mẹo thời trang: mặc gì cũng đẹp nếu con đi như thể bãi biển là của mình.']],
  co_hoa: [['A customer asked if the kumquats were fresh. I said: they were on the tree this morning, gossiping.', 'Có khách hỏi tắc có tươi không. Cô nói: sáng nay tụi nó còn đang trên cây buôn chuyện.'], ['I stack the oranges so neatly that nobody dares to buy one.', 'Cô xếp cam gọn tới mức chẳng ai dám lấy trái nào.']],
  chu_bay: [['Why did the plank go to school? It wanted to be a little board-er.', 'Sao tấm ván đi học? Để “ván” sự như ý.'], ['I sold a nail to a tourist. They asked what to do with it. I said: hit it off.', 'Chú bán cây đinh cho du khách. Họ hỏi dùng làm gì. Chú nói: cứ đóng cho thân.']],
  anh_khoa: [['I made a chair so comfy, I\'ve been sitting on it since Tuesday.', 'Anh đóng cái ghế êm tới mức ngồi từ thứ Ba tới giờ chưa đứng dậy.'], ['A table walks into a bar. It had legs, it could.', 'Cái bàn đi vô quán. Nó có chân mà, sao không đi được.']],
  co_bong: [['My parrot learned to say "bánh mì". Now it won\'t say anything else.', 'Con vẹt của cô học được chữ “bánh mì”. Giờ nó không chịu nói gì khác.'], ['Ducklings follow me everywhere. Even to the bathroom. Especially to the bathroom.', 'Vịt con theo cô khắp nơi. Cả vô nhà tắm. Nhất là vô nhà tắm.']],
  ba_sau: [['In my day, the night market had one lantern, and we took turns looking at it.', 'Hồi bà còn nhỏ, chợ đêm chỉ có một cái lồng đèn, cả xóm thay phiên nhau ngắm.'], ['My grilled rice paper is so crispy, you can hear it from the pier.', 'Bánh tráng nướng của bà giòn tới mức đứng ngoài bến tàu cũng nghe tiếng.']],
  captain: [['I\'ve sailed this route a thousand times. The fish still don\'t wave back.', 'Chú chạy tuyến này cả ngàn lần. Cá vẫn chưa chịu vẫy tay chào lại.'], ['Why is the ferry always calm? It knows how to keep its boat together.', 'Sao tàu lúc nào cũng bình tĩnh? Vì nó biết “giữ thuyền” mà.']],
};
// no one repeats a joke until they've told all theirs; shared jokes also skip ones told recently
const bags = {}, recent = [];
function fromBag(key, list) {
  let b = bags[key];
  if (!b || !b.length) b = bags[key] = list.map((_, i) => i).sort(() => Math.random() - 0.5);
  return list[b.pop()];
}
export function randomJoke(who = null) {
  const own = who && CHAR_JOKES[who];
  if (own && Math.random() < 0.7) return tr(fromBag('own:' + who, own));
  for (let tries = 0; tries < 6; tries++) {
    const j = fromBag('shared:' + (who || 'visitor'), JOKES);
    if (!recent.includes(j) || tries === 5) { recent.push(j); if (recent.length > 8) recent.shift(); return tr(j); }
  }
  return tr(choice(JOKES));
}
export const meoJoke = () => tr(fromBag('meo', MEO_JOKES));

// ---------------------------------------------------------------- gifts
const GIFTS = {
  ong_loc: [{ mat: 'wood', n: 5, why: ['Driftwood. The sea brings it, I keep it, you use it. That\'s how the harbour works.', 'Gỗ trôi dạt. Biển mang tới, ông giữ, con dùng. Bến cảng vận hành vậy đó.'] }],
  chi_ngoc: [{ money: 40, why: ['My guests left a tip "for the cook". That\'s you.', 'Khách của chị để lại tiền boa “cho đầu bếp”. Là em đó.'] }],
  co_dua: [{ ing: 'coconut_milk', n: 8, why: ['Fresh coconut cream. For your chè — and a spoon for me.', 'Nước cốt dừa tươi. Cho nồi chè của con — với một muỗng cho cô.'] }],
  ba_tu: [{ ing: 'kumquat', n: 6, why: ['My kumquat tree gave too many again. Take them before the birds do!', 'Cây tắc nhà bà lại sai quả quá. Cầm đi con, kẻo chim ăn hết!'] }, { money: 30, why: ['For you! You remind me of me when I had the tea stand.', 'Cho con nè! Nhìn con bà nhớ hồi bà còn bán trà.'] }],
  chu_hai: [{ ing: 'shrimp', n: 6, why: ['The net came up too full this morning. The sea likes you.', 'Sáng nay lưới đầy quá. Biển thương con đó.'] }, { mat: 'wood', n: 4, why: ['Found this driftwood. Too pretty to burn.', 'Nhặt được gỗ trôi dạt. Đẹp quá đốt thì tiếc.'] }],
  linh: [{ money: 25, why: ['I won a photo contest with a picture of your shop! Half the prize is yours.', 'Mình thắng cuộc thi ảnh nhờ chụp quán bạn! Chia bạn nửa giải nè.'] }, { ing: 'milk', n: 8, why: ['My dorm fridge is too full of milk. Long story.', 'Tủ lạnh ký túc xá đầy sữa. Chuyện dài lắm.'] }],
  minh: [{ money: 40, why: ['A magazine bought my island photos. Coffee is on me — well, this is coffee money.', 'Tạp chí mua ảnh đảo của mình. Mình bao cà phê — à, đây là tiền cà phê.'] }],
  co_lan: [{ ing: 'herbs', n: 8, why: ['My garden is basically a jungle now. Please take some herbs.', 'Vườn cô thành rừng rồi. Lấy bớt rau thơm giùm cô.'] }, { mat: 'paint', n: 2, why: ['Leftover paint from my flower cart. It\'s a very cheerful pink.', 'Sơn thừa từ xe hoa của cô. Màu hồng vui lắm.'] }],
  be_na: [{ ing: 'beans', n: 6, why: ['I saved these beans for chè! You make it, I eat it. Deal?', 'Em để dành đậu nấu chè nè! {You} nấu, em ăn. Chịu không?'] }, { money: 5, why: ['This is all my money. Five thousand! Buy something nice.', 'Đây là hết tiền của em. Năm nghìn! Mua gì đó đẹp nha.'] }],
  anh_tuan: [{ mat: 'metal', n: 3, why: ['Old scooter panels. Better on your roof than in my shed.', 'Tôn xe cũ. Lên mái nhà em còn hơn nằm trong kho của anh.'] }],
  vy: [{ mat: 'paint', n: 3, why: ['Extra paint! My easel only has two hands. I mean legs. Three legs.', 'Sơn dư nè! Giá vẽ của mình chỉ có hai tay. À không, ba chân.'] }, { money: 45, why: ['Someone bought a painting of your shop. Half is yours — it was your shop!', 'Có người mua bức tranh quán bạn. Chia bạn nửa — quán của bạn mà!'] }],
  chi_mai: [{ ing: 'lime', n: 8, why: ['Doctor\'s orders: vitamin C. Also I bought too many limes.', 'Lời khuyên của bác sĩ: vitamin C. Mà anh cũng lỡ mua nhiều chanh quá.'] }, { money: 20, why: ['A thank-you from a patient. They said the tea stand made them better!', 'Quà cảm ơn từ bệnh nhân. Họ nói uống trà quán em là khỏe!'] }],
};
function tryGift(rid) {
  const s = G.state, key = 'gift:' + rid;
  if (s.story.flags[key] === s.day || (s.story.flags.giftDay === s.day && (s.story.flags.giftsToday || 0) >= 1)) return null;   // gifts stay a nice surprise: one a day at most
  if (Math.random() > 0.05) return null;
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
  const s = G.state, key = 'rps:' + (who || a.name), cat = a === G.meo || a.kind === 'cat' || who === 'meo';
  const played = s.story.flags[key]?.day === s.day ? s.story.flags[key].n : 0;
  if (played >= 3) { await say(a, T('No more today! My hand is tired. Tomorrow — rematch!', 'Hôm nay đủ rồi! Tay mỏi quá. Mai tái đấu nha!'), { emo: 'happy' }); return; }
  for (let round = 0; round < 3; round++) {
    const pick = await ask(a, round ? T('Tie! Again — rock, paper, scissors…', 'Hòa! Lại nào — oẳn tù tì…') : T('Rock, paper, scissors… shoot! Pick one!', 'Oẳn tù tì! Ra cái gì ra cái này…'), HANDS.map(k => T(...HAND_LABEL[k])));
    const me = HANDS[pick] || 'rock', them = choice(HANDS);
    a.setAct('cheer'); sfx('pop');
    await say(a, T(`…${HAND_LABEL[them][0]}!`, `…${HAND_LABEL[them][1]}!`), { emo: 'happy' });
    a.setAct(null);
    if (me === them) continue;
    s.story.flags[key] = { day: s.day, n: played + 1 }; markDirty();
    if (beats(me, them)) {
      // a small prize for the first few wins of the day — it's a game with friends, not a job
      const f = s.story.flags; if (f.rpsPaidDay !== s.day) { f.rpsPaidDay = s.day; f.rpsPaid = 0; }
      const prize = f.rpsPaid < 3 ? Math.round(rand(5, 15)) : 0; if (prize) f.rpsPaid++;
      sfx('success'); if (prize) addMoney(prize, 'game'); addXP(8, 'game');
      if (a.data?.rid) s.friends[a.data.rid] = (s.friends[a.data.rid] || 0) + 1;
      if (!prize) await say(a, choice([T('You win! I\'m out of coins today — take my admiration instead.', '{You} thắng! Hôm nay {me} hết tiền lẻ rồi — nhận lời khen của {me} nhé.'), T('Again?! You\'re too good. No prize — just glory.', 'Lại thắng?! {You} giỏi quá. Không có quà — chỉ có vinh quang thôi.')]), { emo: 'happy' });
      else if (cat) await say(a, choice([T(`Paws can't make scissors! That's not fair. Fine — ${prize}k.`, `Chân mèo đâu ra được cái kéo! Không công bằng. Thôi — ${prize}k nè.`), T(`I demand a rematch… after my nap. Here's ${prize}k.`, `Tôi đòi đấu lại… sau giấc ngủ trưa. ${prize}k nè.`), T(`You read my whiskers. ${prize}k, and not a word to the ducks.`, `Bạn đọc được râu tôi rồi. ${prize}k, và không được kể với lũ vịt.`)]), { emo: 'sad' });
      else await say(a, choice([T(`Nooo! You win. Here's ${prize}k — a deal's a deal.`, `Khônggg! {You} thắng. ${prize}k nè — chơi là chịu.`), T(`How?! Fine, ${prize}k. You must have practised on Mèo Mây.`, `Sao được vậy?! Thôi, ${prize}k. Chắc {you} luyện với Mèo Mây rồi.`), T(`Best of three? No? Fine, ${prize}k.`, `Ba ván thắng hai nha? Không hả? Thôi, ${prize}k.`)]), { emo: 'sad' });
    } else {
      sfx('sad');
      await say(a, choice([T('Ha! I win! I\'ll tell the whole island.', 'Ha! {Me} thắng! {Me} kể cả đảo nghe.'), T('Victory! I\'m the rock-paper-scissors champion of this beach.', 'Chiến thắng! {Me} là vua oẳn tù tì của bãi biển này.'), T('Better luck next time. My scissors are undefeated. Mostly.', 'Lần sau may hơn nha {you}. Cái kéo của {me} bất bại. Gần như vậy.')]), { emo: 'happy' });
    }
    return;
  }
  await say(a, T('Three ties?! We\'re too similar. That\'s a little scary.', 'Hòa ba lần?! Tụi mình giống nhau quá. Hơi sợ đó.'), { emo: 'think' });
}

// ---------------------------------------------------------------- resident conversation menu
export async function residentMenu(a, rid, chat) {
  const P = x => applyPlayerPronouns(x, profileOf(rid));   // what you say, addressed properly (bà / cô / anh / bạn…)
  const opts = [T('Chat', 'Trò chuyện'), T('Tell me a joke!', P('{Them} kể chuyện cười cho {i} nghe đi!')), T('Rock, paper, scissors?', P('{Them} chơi oẳn tù tì với {i} không?')), T('Bye!', P('{I} chào {them} nha!'))];
  const canGift = BIRTHDAYS[rid] && G.state.story.flags['gift:' + rid + ':' + G.state.day] == null;
  if (canGift) opts.splice(3, 0, isBirthday(rid) ? T('🎂 Give a birthday gift', '🎂 Tặng quà sinh nhật') : T('Give a gift', 'Tặng quà'));
  const qo = questOption(rid);
  if (qo) opts.unshift(qo);
  const gear = rid === 'chu_hai' && G.state.story.flags.fishing;
  if (gear) opts.unshift(T('🎣 Fishing gear', '🎣 Đồ câu cá'));
  let pick = await ask(a, choice([T('Oh, hi!', 'Ơ, chào {you}!'), T(`Hey ${G.state.player.name}!`, `Ê ${G.state.player.name}!`), T('What\'s up?', 'Có chuyện gì vậy?')]), opts, { emo: 'happy' });
  if (gear) { if (pick === 0) { (await import('./fishing.js')).openTackle(); return; } pick--; }
  if (qo) { if (pick === 0) { await questTalk(a, rid); return; } pick--; }
  if (canGift && pick === 3) { await giveResidentGift(a, rid); return; }
  if (canGift && pick > 3) pick--;
  if (pick === 0) await chat();
  else if (pick === 1) { await say(a, randomJoke(rid), { emo: 'happy' }); a.setAct('cheer'); G.player.showEmote('happy', 1.4); sfx('pop'); setTimeout(() => a.act === 'cheer' && a.setAct(null), 1200); }
  else if (pick === 2) await playRPS(a, rid);
  else { a.setAct('wave'); await say(a, T('See you!', 'Gặp lại nha!')); a.setAct(null); }
  const g = pick !== 3 && tryGift(rid);
  if (g) await giveGift(a, g);
}

// ---------------------------------------------------------------- gifts for neighbours
async function giveResidentGift(a, rid) {
  const s = G.state, likes = BIRTHDAYS[rid].likes, bkey = 'bday:' + rid + ':' + islandDay(), bday = isBirthday(rid) && !s.story.flags[bkey];   // (the birthday bonus once per real birthday)
  const have = Object.keys(s.pantry).filter(k => s.pantry[k] > 0 && INGREDIENTS[k]);
  const fav = likes.filter(k => have.includes(k)), other = have.filter(k => !likes.includes(k)).slice(0, 3);
  const choices = [...fav, ...other];
  if (!choices.length) { await say(a, T('That\'s sweet — but your bag is empty! Bring something from the market another time.', 'Dễ thương ghê — mà túi {you} trống trơn! Lần sau mang gì đó từ chợ nha.'), { emo: 'happy' }); return; }
  const pick = await ask(null, T('What will you give?', 'Tặng gì đây?'), [...choices.map(k => ingName(k) + (likes.includes(k) ? ' ♥' : '')), T('Never mind', 'Thôi')]);
  const k = choices[pick]; if (!k) return;
  addPantry(k, -1); s.story.flags['gift:' + rid + ':' + s.day] = 1; if (bday) s.story.flags[bkey] = 1; markDirty(true);
  const loved = likes.includes(k), pts = (loved ? 4 : 1) * (bday ? 2 : 1) + (bday ? 1 : 0);
  s.friends[rid] = (s.friends[rid] || 0) + pts;
  a.setEmo('love', 2.5); a.showEmote('heart', 1.8); a.doHop?.(60); sfx(loved ? 'success' : 'pop');
  import('./interact.js').then(m => m.discover('gift'));
  await say(a, bday ? (loved ? T('For my birthday — and it\'s my favourite! You remembered!', 'Quà sinh nhật — lại đúng món {me} thích nhất! {You} nhớ luôn!') : T('A birthday present! Thank you, that\'s so thoughtful.', 'Quà sinh nhật! Cảm ơn {you}, chu đáo quá.')) : loved ? T('Oh! This is exactly what I like. How did you know?', 'Ơ! Đúng món {me} thích luôn. Sao {you} biết vậy?') : T('For me? Thank you!', 'Cho {me} hả? Cảm ơn nha!'), { emo: 'happy' });
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
    const top = a.kind === 'cat' ? 40 : 50;
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
  { act: 'pounce', dur: 1.4, say: ['A leaf! I have defeated a leaf!', 'Một chiếc lá! Mình đã hạ gục chiếc lá!'] },
  { act: 'stretch', dur: 2, say: ['Big stretch… management is exhausting.', 'Vươn vai cái… làm quản lý mệt ghê.'] },
  { act: 'loaf', dur: 2.4, say: ['I am a loaf now. Do not disturb the loaf.', 'Giờ mình là ổ bánh mì. Đừng làm phiền ổ bánh mì.'] },
];
export function meoAntic(m) {
  const a = choice(ANTICS);
  m.setAct(a.act); m.actT = 0;
  if (a.act === 'sneeze') sfx('pop'); else if (a.act !== 'faint') sfx('meow');
  bark(m, tr(a.say), a.dur + 1);
  setTimeout(() => { if (m.act === a.act) m.setAct(null); }, a.dur * 1000);
}
