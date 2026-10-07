// Conversations with residents, shopkeepers, staff and visitors. Lines shift
// with friendship and story progress; talking once a day builds friendship.
// Every line exists in English and Vietnamese: [en, vi].

import { G, T, markDirty, unlockAchievement } from './state.js';
import { recipeName, ROLES } from '../data/game.js';
import { say, ask } from '../ui/dialogue.js';
import { questOption, questTalk } from './sidequests.js';
import { choice } from '../core/util.js';
import { residentMenu, randomJoke } from './fun.js';

// Three tiers per resident: early game, mid game (chapter 3+), late game (chapter 5+).
const LINES = {
  ong_loc: [
    [['Forty years I kept this harbour. Then the boats got fewer, and I kept the nets instead.', 'Bốn mươi năm ông giữ bến cảng này. Rồi thuyền thưa dần, ông chuyển sang giữ lưới.'], ['A knot a day. That\'s how you mend a net — and most other things.', 'Mỗi ngày một nút. Vá lưới là vậy — mà vá mấy chuyện khác cũng vậy.']],
    [['You hear that? Engines. More boats than last month. My old ears like it.', 'Con nghe không? Tiếng máy. Nhiều thuyền hơn tháng trước. Tai già của ông thích lắm.'], ['The storm took the bridge, not the people. People just needed a reason to come back.', 'Cơn bão cuốn cây cầu, chứ đâu cuốn con người. Người ta chỉ cần một lý do để quay về.']],
    [['Harbour Day used to have bunting on every mast. I think we\'ll need bunting again.', 'Ngày hội bến cảng xưa có cờ trên mọi cột buồm. Chắc sắp phải treo cờ lại rồi.'], ['That cat of yours visits me. She checks my knots. Very strict inspector.', 'Con mèo của con hay ghé ông. Nó kiểm tra từng nút lưới. Thanh tra khó tính lắm.']],
  ],
  chi_ngoc: [
    [['Welcome to the guesthouse! Well — it\'s my house, with extra pillows.', 'Chào mừng tới nhà nghỉ! À — là nhà chị, có thêm gối thôi.'], ['I have four rooms and, until last week, zero guests. Now I have two!', 'Chị có bốn phòng và, tới tuần trước, không một vị khách. Giờ có hai rồi!']],
    [['Guests ask where to eat. I send them to you. You\'re welcome!', 'Khách hỏi ăn ở đâu. Chị chỉ qua quán em. Khỏi cảm ơn!'], ['My guestbook has handwriting from thirty years ago. The ferry came every morning back then.', 'Sổ lưu bút của chị có chữ viết từ ba mươi năm trước. Hồi đó sáng nào cũng có tàu.']],
    [['Fully booked this weekend! I had to buy a second kettle.', 'Cuối tuần này kín phòng! Chị phải mua thêm cái ấm thứ hai.'], ['A guest cried at the view from Lighthouse Point. Happy tears. I gave them a coconut.', 'Có vị khách khóc khi ngắm cảnh ở Ngọn Hải Đăng. Khóc vì vui. Chị đưa họ trái dừa.']],
  ],
  co_dua: [
    [['Coconut? Fresh this morning. The tree didn\'t want to let go, but I asked nicely.', 'Dừa không con? Mới hái sáng nay. Cây không muốn buông, nhưng cô năn nỉ.'], ['The cove is the quietest place on the island. Even the waves whisper here.', 'Vịnh là chỗ yên nhất đảo. Sóng ở đây cũng nói thì thầm.']],
    [['Tourists! At my cove! I had to learn to say "coconut" in four languages.', 'Du khách! Ở vịnh của cô! Cô phải học chữ “dừa” bằng bốn thứ tiếng.'], ['Your grill smells so good the crabs line up. They\'re not paying, though.', 'Quán nướng của con thơm tới mức cua cũng xếp hàng. Mà tụi nó không trả tiền.']],
    [['When the bridge was out, I rowed coconuts to the market. My arms remember.', 'Hồi cầu còn gãy, cô chèo thuyền chở dừa ra chợ. Tay cô còn nhớ.'], ['Sunset here, with the lanterns across the water… I could sell tickets.', 'Hoàng hôn ở đây, lồng đèn bên kia mặt nước… cô bán vé được đó.']],
  ],
  vy: [
    [['Fireflies only glow when they feel safe. Same as painters.', 'Đom đóm chỉ phát sáng khi thấy an toàn. Họa sĩ cũng vậy.'], ['I\'ve painted this banyan forty times. It looks different every evening.', 'Mình vẽ cây đa này bốn mươi lần rồi. Chiều nào nhìn cũng khác.']],
    [['Your shops look lovely from the lookout tower. Like little sweets on a tray.', 'Nhìn từ tháp canh, quán của bạn đẹp lắm. Như mấy viên kẹo trên khay.'], ['Mèo Mây posed for me once. For four seconds. Then it ate my eraser.', 'Mèo Mây từng làm mẫu cho mình. Được bốn giây. Rồi nó ăn cục gôm.']],
    [['I\'m painting you next! Hold still… no, you moved. Fine, I\'ll guess.', 'Mình sẽ vẽ bạn nè! Đứng yên… ơ, bạn cử động rồi. Thôi mình đoán vậy.'], ['The festival painting sold to a gallery on the mainland! Now tourists come to find the real place.', 'Bức tranh lễ hội bán được cho một phòng tranh trong đất liền! Giờ du khách tới để tìm nơi thật.']],
  ],
  ba_tu: [
    [['That was my tea stand, you know. Forty years of kumquat tea!', 'Quán trà đó là của bà đó. Bốn mươi năm bán trà tắc!'], ['Don\'t let anyone put too much sugar in. Kumquats should be a little sour.', 'Đừng bỏ nhiều đường quá nha con. Tắc phải chua chua mới ngon.']],
    [['Remember to eat properly, dear. Business is a marathon, not a race.', 'Con nhớ ăn cơm đầy đủ nha. Buôn bán là đường dài mà.'], ['The island feels young again. My knees don\'t, but the island does.', 'Hòn đảo trẻ lại rồi. Đầu gối bà thì không, nhưng hòn đảo thì có.']],
    [['Mèo Mây came on Chú Hải\'s boat as a tiny kitten and never left.', 'Bà kể con nghe: Mèo Mây tới trên thuyền Chú Hải từ hồi còn bé xíu, rồi ở luôn.'], ['I come by your shop just to watch the people smile.', 'Bà ghé quán con chỉ để nhìn người ta cười thôi.']],
  ],
  chu_hai: [
    [['Hey, newcomer! Do you know how to fish? No? Ah well. Tea is important too.', 'Ê, người mới! Biết câu cá không? Không hả? Thôi kệ. Trà cũng quan trọng.'], ['Calm sea today. A good day for business.', 'Sóng hôm nay êm. Ngày tốt để buôn bán.']],
    [['I brought Mèo Mây here years ago. Best catch of my life.', 'Chú đưa Mèo Mây tới đây mấy năm trước. Mẻ cá quý nhất đời chú.'], ['The ferry captain owes me money. Don\'t tell him I said that.', 'Ông thuyền trưởng còn nợ chú tiền. Đừng nói với ổng là chú kể nha.']],
    [['Your food truck is doing well? That old thing used to be my bait shop!', 'Xe của con bán đắt không? Cái xe cũ đó hồi xưa là tiệm bán mồi câu của chú!'], ['Tourists keep asking me for photos. I charge one kumquat tea per photo.', 'Du khách cứ xin chụp hình với chú. Chú lấy một ly trà tắc mỗi tấm.']],
  ],
  linh: [
    [['Hi! I study on the mainland but come home every weekend. This island is my favourite place in the world.', 'Chào! Mình học trên đất liền nhưng cuối tuần nào cũng về. Đây là nơi mình thích nhất trên đời.'], ['Do you have milk tea? No pressure. But… milk tea?', 'Quán có trà sữa không? Không ép đâu. Nhưng mà… trà sữa?']],
    [['I posted your shop online and now my friends want to visit!', 'Mình đăng quán bạn lên mạng, giờ bạn bè mình đòi tới chơi!'], ['Exam season is scary. Iced milk coffee helps.', 'Mùa thi đáng sợ ghê. Cà phê sữa đá cứu mình.']],
    [['I told my professor about your island. He\'s coming for the Night Market!', 'Mình kể cho thầy nghe về đảo mình. Thầy sắp tới chơi Chợ Đêm đó!'], ['You\'re kind of famous now, you know that?', 'Bạn nổi tiếng rồi đó, biết không?']],
  ],
  minh: [
    [['Hold still — the light is perfect. …Got it! You look like a local already.', 'Đứng yên — ánh sáng đẹp quá. …Xong! Trông bạn như dân đảo rồi.'], ['I photograph every sunrise here. None of them are the same.', 'Sáng nào mình cũng chụp bình minh ở đây. Không bữa nào giống bữa nào.']],
    [['My photos of your shop got a thousand likes. That\'s a thousand hungry people.', 'Ảnh quán bạn được một ngàn lượt thích. Tức là một ngàn người đang đói.'], ['The lanterns at night are a photographer\'s dream.', 'Lồng đèn buổi tối là giấc mơ của dân chụp ảnh.']],
    [['If you ever build a statue, I call dibs on the first photo.', 'Nếu bạn có dựng tượng, mình giành chụp tấm đầu tiên nha.'], ['I\'m not rushed. I just walk fast because the light moves fast.', 'Mình đâu có vội. Mình đi nhanh vì ánh sáng thay đổi nhanh thôi.']],
  ],
  co_lan: [
    [['Frangipani, bougainvillea, flame trees… every flower on this island has a story.', 'Hoa sứ, hoa giấy, hoa phượng… hoa nào trên đảo cũng có chuyện của nó.'], ['I\'m picky about tea. Very picky. I will know if you rush it.', 'Cô khó tính chuyện trà lắm. Con làm vội là cô biết liền.']],
    [['Your shop needs flowers. Everything needs flowers.', 'Quán con cần có hoa. Cái gì cũng cần có hoa.'], ['A perfect order is like a perfect bouquet. Everything in its place.', 'Một món hoàn hảo cũng như một bó hoa đẹp. Mọi thứ đúng chỗ của nó.']],
    [['I brought you a frangipani for your counter. Don\'t let it wilt!', 'Cô mang cho con một cành hoa sứ để trên quầy. Đừng để nó héo nha!'], ['The Night Market smells like my childhood.', 'Chợ Đêm thơm như tuổi thơ của cô.']],
  ],
  be_na: [
    [['Hey! Do you sell sweet soup? When will you sell sweet soup?', 'Ơi! Có bán chè không? Chừng nào mới bán chè?'], ['I saw Mèo Mây sleeping on your roof yesterday!', 'Hôm qua em thấy Mèo Mây ngủ trên mái nhà {you} đó!']],
    [['I\'m saving my coins for your food. I have… four coins.', 'Em đang để dành tiền ăn ở quán. Em có… bốn đồng.'], ['When I grow up I want a shop just like yours!', 'Lớn lên em muốn có quán y như quán {you}!']],
    [['SWEET SOUP! You have SWEET SOUP! This is the best day of my life!', 'CHÈ! Có CHÈ rồi! Hôm nay là ngày vui nhất đời em!'], ['Mèo Mây let me pet its tail. Only once. It\'s very busy.', 'Mèo Mây cho em vuốt đuôi. Có một lần thôi. Mèo Mây bận lắm.']],
  ],
  anh_tuan: [
    [['Need a scooter ride? Just kidding — the island is small. Walk, it\'s healthy!', 'Xe ôm không? Giỡn thôi — đảo nhỏ xíu. Đi bộ cho khỏe!'], ['I drive tourists from the dock every morning. They always ask where to eat.', 'Sáng nào anh cũng chở khách từ bến tàu. Ai cũng hỏi ăn ở đâu.']],
    [['I tell every tourist: go to the tea stand on the beach first.', 'Anh dặn du khách nào cũng vậy: ghé quán trà ngoài biển trước.'], ['Beep beep! Sorry, habit.', 'Bíp bíp! Xin lỗi, quen tay.']],
    [['The ferry is so full now I had to buy a second helmet.', 'Giờ tàu đông khách tới mức anh phải mua thêm cái nón bảo hiểm.'], ['Your restaurant is the talk of the mainland. My cousin wants a job!', 'Nhà hàng của em nổi tiếng tận đất liền. Em họ anh xin vào làm đó!']],
  ],
  chi_mai: [
    [['Welcome to the island! If you ever cut yourself slicing kumquats, come see me.', 'Chào mừng em ra đảo! Lỡ có đứt tay lúc cắt tắc thì ghé anh nha.'], ['Drink water, sleep in your bed, eat real meals. Doctor\'s orders.', 'Uống nước, ngủ trên giường, ăn cơm đàng hoàng. Lời bác sĩ dặn đó.']],
    [['Half my patients now say they feel better after your kumquat tea. I\'m not complaining.', 'Nửa số bệnh nhân của anh nói uống trà tắc quán em là khỏe hẳn. Anh không có ý kiến gì đâu.'], ['Mèo Mây came in for a check-up. Diagnosis: too many naps. Treatment: more naps.', 'Mèo Mây tới khám. Chẩn đoán: ngủ nhiều quá. Điều trị: ngủ thêm.']],
    [['You work too hard. Even the busiest shop owner needs a day off. Take one!', 'Em làm việc nhiều quá. Chủ quán bận cỡ nào cũng cần một ngày nghỉ. Nghỉ đi!'], ['Busy clinic today! Tourists and sunburns. …Okay, I have a minute.', 'Hôm nay phòng khám đông ghê! Du khách với cháy nắng. …Thôi được, anh rảnh chút xíu.']],
  ],
};
const MERCH = {
  chi_tien: [['A new haircut is the cheapest holiday there is. Sit, sit!', 'Cắt tóc mới là chuyến du lịch rẻ nhất đó. Ngồi đi em!'], ['Mèo Mây came in for a trim once. It wanted a mohawk. I said no.', 'Mèo Mây từng vào đòi tỉa lông. Nó muốn kiểu mohican. Chị từ chối.'], ['Curtain bangs are very popular this season. Just saying.', 'Mùa này mái bay đang hot lắm nha. Chị nói vậy thôi.'], ['Pink hair? Blue hair? On this island, anything goes!', 'Tóc hồng? Tóc xanh? Trên đảo này cái gì cũng được hết!']],
  co_bong: [['Every pet here was chosen by its human. Well, the other way round, really.', 'Con thú nào ở đây cũng được chủ chọn. À, thật ra là ngược lại.'], ['Feed them, pet them, and they\'ll follow you to the end of the pier.', 'Cho ăn, vuốt ve, là tụi nó theo con tới cuối bến tàu.'], ['The ducklings think I\'m their mum. I have given up correcting them.', 'Mấy con vịt con tưởng cô là mẹ. Cô cũng thôi không cãi nữa.']],
  co_ba: [['Every outfit tells a story. Yours says "I run a very good tea stand."', 'Bộ đồ nào cũng kể một câu chuyện. Bộ của con nói "Tôi bán trà rất ngon."'], ['I sewed Mèo Mây a tiny raincoat once. It refused to wear it. Artists suffer.', 'Cô từng may cho Mèo Mây một cái áo mưa nhỏ xíu. Nó không chịu mặc. Nghệ sĩ khổ lắm.'], ['Try the áo dài! Every island girl and boy should have one for Tết.', 'Thử áo dài đi con! Ai trên đảo cũng nên có một bộ cho Tết.'], ['Come back when you level up — I keep my best pieces for famous shopkeepers.', 'Lên cấp rồi quay lại nha — cô để dành đồ đẹp nhất cho chủ quán nổi tiếng.']],
  co_hoa: [['Fresh kumquats today — the sourest, sweetest ones.', 'Hôm nay có tắc tươi — chua nhất, ngọt nhất.'], ['Buy in packs, prep at your shop. Easy!', 'Mua theo gói, về quán sơ chế. Dễ ợt!'], ['The supermarket is busier than ever thanks to you.', 'Nhờ con mà siêu thị đông khách hơn bao giờ hết.']],
  chu_bay: [['Wood, metal, paint! Everything you need to fix anything!', 'Gỗ, tôn, sơn! Đủ thứ để sửa mọi thứ!'], ['That shed of yours — I knew it had good bones.', 'Căn chòi của con đó — chú biết nó còn chắc mà.'], ['Big projects need big piles of wood. I\'ve got piles.', 'Việc lớn cần nhiều gỗ. Chú có cả đống.']],
  anh_khoa: [['Every home should have one thing that makes you smile when you walk in.', 'Nhà nào cũng nên có một món làm mình mỉm cười khi bước vào.'], ['I carve every chair myself. Well, most of them.', 'Ghế nào anh cũng tự tay đẽo. À, gần hết.'], ['Try a lantern by your bed. Very cozy at night.', 'Thử đặt một cái lồng đèn cạnh giường đi. Buổi tối ấm cúng lắm.']],
  ba_sau: [['The lanterns remember everyone who ever walked under them.', 'Lồng đèn nhớ hết những ai từng đi dưới nó.'], ['Grilled rice paper — my mother\'s recipe. Crispy edges, soft middle.', 'Bánh tráng nướng — công thức của mẹ bà. Rìa giòn, giữa mềm.'], ['The market lives again. I can finally rest my old eyes.', 'Chợ sống lại rồi. Giờ bà mới yên tâm nghỉ ngơi.']],
};
const STAFF = {
  dreamy: [['Sorry, I was thinking about clouds. What was the order?', 'Xin lỗi, {me} đang nghĩ về mây. Order gì vậy {you}?'], ['Do you think the fish in the tank have names?', '{You} nghĩ mấy con cá trong bể có tên không?']],
  speedy: [['Table three! Table five! Coming through!', 'Bàn ba! Bàn năm! Nhường đường nào!'], ['I can carry four bowls at once. Want to see? …Maybe not.', '{Me} bưng được bốn tô một lần. {You} muốn xem không? …Thôi khỏi.']],
  cheerful: [['I love this job! Everyone here is so nice!', '{Me} mê công việc này lắm! Ai ở đây cũng dễ thương!'], ['A guest said my smile was better than the phở. The phở is very good, so that\'s a lot.', 'Có khách khen {me} cười còn ngon hơn phở. Mà phở ngon lắm, nên vậy là khen dữ lắm.']],
  careful: [['I double-check every order. Triple, sometimes.', 'Order nào {me} cũng kiểm tra hai lần. Có khi ba lần.'], ['The stove is clean, the knives are sharp, the herbs are fresh.', 'Bếp sạch, dao bén, rau tươi.']],
  steady: [['Just doing my job, boss!', '{Me} làm việc thôi, sếp!'], ['The kitchen is running smoothly today.', 'Hôm nay bếp chạy êm ru.']],
};
const VISITOR = [['What a pretty island! We came on the morning ferry.', 'Đảo đẹp quá! {Me} đi chuyến tàu sáng tới đó.'], ['Do you know where the tea stand is? Everyone says it\'s the best!', '{You} ơi, quán trà ở đâu vậy? Ai cũng khen ngon nhất!'], ['I want to live here forever. Or at least until the last ferry.', '{Me} muốn ở đây mãi luôn. Hoặc ít nhất tới chuyến tàu cuối.'], ['Have you seen the lanterns at the Night Market? Magical!', '{You} thấy lồng đèn ở Chợ Đêm chưa? Đẹp như mơ!'], ['This island smells like grilled pork and sea breeze. Perfect.', 'Hòn đảo này thơm mùi thịt nướng và gió biển. Tuyệt vời.']];
const pickT = pair => T(pair[0], pair[1]);

export async function talkToResident(a) {
  const rid = a.data.rid;
  const s = G.state, f = s.friends[rid] || 0;
  const tier = s.story.chapter >= 8 ? 2 : s.story.chapter >= 3 ? 1 : 0;
  a.stop(); a.sit = false; a.face(G.player); G.player.face(a);
  a.setEmo('happy', 2); a.showEmote(f > 10 ? 'heart' : 'happy', 1.2);
  const pool = LINES[rid]?.[tier] || [['Hello!', 'Xin chào!']];
  const reg = s.regulars['res:' + rid];
  let line = pickT(choice(pool));
  if (reg?.visits >= 3 && Math.random() < 0.4) line = T(`${s.player.name}! My usual ${reg.fav ? recipeName(reg.fav) : 'order'} was perfect last time. Thank you!`, `${s.player.name}! Lần trước món ${reg.fav ? recipeName(reg.fav) : 'quen'} ngon lắm. Cảm ơn nha!`);
  await residentMenu(a, rid, () => say(a, line));
  const key = 'talk:' + rid;
  if (s.story.flags[key] !== s.day) { s.story.flags[key] = s.day; s.friends[rid] = f + 1; markDirty(); }
  // said hello to everyone on the island today?
  const talked = (s.today.talked ||= {}); talked[rid] = 1;
  const here = (G.npcs?.residents || []).map(r => r.data.rid).filter(Boolean);
  if (here.length >= 6 && here.every(r => talked[r])) unlockAchievement('social_day');
  a.data.until = Math.max(a.data.until || 0, s.time + 3);
}
export async function talkToMerchant(a) {
  a.face(G.player); a.showEmote('happy', 1.2); a.setEmo('happy', 2);
  const qo = questOption(a.data.mid);
  if (qo) {
    const pick = await ask(a, pickT(choice(MERCH[a.data.mid] || [['Hello!', 'Xin chào!']])), [qo, T('Bye!', 'Tạm biệt!')], { emo: 'happy' });
    if (pick === 0) await questTalk(a, a.data.mid);
    return;
  }
  await say(a, pickT(choice(MERCH[a.data.mid] || [['Hello!', 'Xin chào!']])));
}
const KEEPER_TALK = {
  quick: [['Order, make, hand over, smile. I could do this in my sleep. I might be doing it in my sleep.', 'Nhận order, làm, đưa, cười. {Me} làm trong mơ cũng được. Có khi đang mơ thật.'], ['Fastest hands on the island. Ask anyone. Actually, don\'t, they\'ll say Bà Tư.', 'Tay nhanh nhất đảo đó. Hỏi ai cũng biết. Mà thôi đừng hỏi, họ sẽ nói Bà Tư.']],
  careful: [['I measure everything twice. The ice cubes are a little scared of me.', '{Me} đo mọi thứ hai lần. Mấy viên đá hơi sợ {me}.'], ['Not one complaint this week. I keep a little notebook.', 'Tuần này không có lời phàn nàn nào. {Me} ghi vào sổ nhỏ đó.']],
  friendly: [['I know every regular\'s name, their kids\' names and two of their dogs.', '{Me} biết tên mọi khách quen, tên con họ và hai con chó của họ.'], ['A tourist cried because the tea was so good. I gave her a napkin and a free one.', 'Có du khách khóc vì trà ngon quá. {Me} đưa khăn giấy và tặng thêm một ly.']],
  steady: [['Another good day. Nothing broken, nobody angry. That\'s the job.', 'Thêm một ngày tốt. Không vỡ gì, không ai giận. Việc là vậy đó.']],
};
// your own shopkeepers: they chat in character, and you can pay for training or promote an expert
async function talkToKeeper(a, id) {
  const E = await import('./economy.js'), k = E.keeperOf(id); if (!k) return;
  a.face(G.player); a.setEmo('happy', 2);
  const sk = E.keeperSkill(k), lines = KEEPER_TALK[k.trait] || KEEPER_TALK.steady;
  await say(a, pickT(choice(lines)) + (k.head ? T(' (Head keeper, by the way.)', ' (Trưởng quán đó nha.)') : ''));
  const opts = [];
  if (E.canTrain(id)) opts.push({ id: 'train', label: T(`Send for training · ${E.trainCost(id)}k`, `Cho đi học nghề · ${E.trainCost(id)}k`) });
  if (sk >= 3 && !k.head) opts.push({ id: 'promote', label: T(`Promote to head keeper · ${E.promoteCost(id)}k`, `Thăng trưởng quán · ${E.promoteCost(id)}k`) });
  if (!opts.length) return;
  opts.push({ id: 'no', label: T('Keep up the good work!', 'Cứ làm tốt như vậy nha!') });
  const pick = await ask(a, T('Anything you need from me?', 'Sếp cần gì không ạ?'), opts.map(o => o.label));
  const o = opts[pick]; if (!o || o.id === 'no') return;
  if (o.id === 'train') { if (E.trainKeeper(id)) { a.showEmote('sparkle', 1.6); await say(a, T('I\'ll come back sharper. Thank you, boss!', '{Me} sẽ giỏi hơn. Cảm ơn sếp!')); } else await say(a, T('Maybe when the till is a bit fuller, boss.', 'Chắc đợi két đầy thêm chút nha sếp.')); }
  if (o.id === 'promote') { if (E.promoteKeeper(id)) { a.showEmote('heart', 2); await say(a, T('Head keeper?! I\'m telling my mum right now.', 'Trưởng quán?! {Me} phải báo mẹ ngay.')); } else await say(a, T('Maybe when the till is a bit fuller, boss.', 'Chắc đợi két đầy thêm chút nha sếp.')); }
}
export async function talkToStaff(a) {
  if (a.data.keeper) return talkToKeeper(a, a.data.keeper);
  const e = a.data.emp;
  a.face(G.player);
  const role = T(ROLES[e.role].en, ROLES[e.role].vi);
  // they talk about their day, their growing skill, or just their personality
  const d = e.today || {}, did = Object.entries(d).filter(([, n]) => n > 0).sort((x, y) => y[1] - x[1])[0];
  const WHAT = { served: ['dishes to the tables', 'món ra bàn'], orders: ['orders', 'order'], cooked: ['dishes', 'món'], cleaned: ['tables', 'bàn'], prepped: ['batches of prep', 'mẻ sơ chế'], deposits: ['trips to the register', 'lần nộp tiền'], helped: ['guests', 'khách'], };
  const lines = [pickT(choice(STAFF[e.trait] || STAFF.steady))];
  if (did && did[1] >= 3) lines.push(T(`${did[1]} ${WHAT[did[0]][0]} today so far. Not bad, right?`, `Hôm nay {me} đã xong ${did[1]} ${WHAT[did[0]][1]} rồi. Cũng được ha?`));
  if ((e.grown || 0) >= 1) lines.push(T('I\'m getting quicker at this. You noticed? You noticed.', '{Me} ngày càng nhanh tay hơn đó. Sếp thấy không? Thấy mà.'));
  if (e.role === 'manager') lines.push(T('Everyone\'s on schedule, the pantry\'s stocked, and I only had to hum twice to keep morale up.', 'Mọi người đúng giờ, kho đủ hàng, và {me} chỉ phải ngân nga hai lần để giữ tinh thần.'));
  a.setEmo('happy', 2);
  await say(a, `(${role}) ${choice(lines)}`);
}
export async function talkToVisitor(a) {
  a.face(G.player); a.showEmote('happy', 1.2);
  if (Math.random() < 0.3) { await say(a, randomJoke(), { emo: 'happy' }); return; }
  await say(a, pickT(choice(VISITOR)));
}
