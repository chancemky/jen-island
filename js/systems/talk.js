// Conversations with residents, shopkeepers, staff and visitors. Lines shift
// with friendship and story progress; talking once a day builds friendship.
// Every line exists in English and Vietnamese: [en, vi].

import { G, T, markDirty } from './state.js';
import { recipeName, ROLES } from '../data/game.js';
import { say } from '../ui/dialogue.js';
import { choice } from '../core/util.js';
import { residentMenu, randomJoke } from './fun.js';

// Three tiers per resident: early game, mid game (chapter 3+), late game (chapter 5+).
const LINES = {
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
    [['Hey! Do you sell sweet soup? When will you sell sweet soup?', 'Ơi! Có bán chè không? Chừng nào mới bán chè?'], ['I saw Mèo Mây sleeping on your roof yesterday!', 'Hôm qua em thấy Mèo Mây ngủ trên mái nhà anh chị đó!']],
    [['I\'m saving my coins for your food. I have… four coins.', 'Em đang để dành tiền ăn ở quán. Em có… bốn đồng.'], ['When I grow up I want a shop just like yours!', 'Lớn lên em muốn có quán y như quán anh chị!']],
    [['SWEET SOUP! You have SWEET SOUP! This is the best day of my life!', 'CHÈ! Có CHÈ rồi! Hôm nay là ngày vui nhất đời em!'], ['Mèo Mây let me pet its tail. Only once. It\'s very busy.', 'Mèo Mây cho em vuốt đuôi. Có một lần thôi. Mèo Mây bận lắm.']],
  ],
  anh_tuan: [
    [['Need a scooter ride? Just kidding — the island is small. Walk, it\'s healthy!', 'Xe ôm không? Giỡn thôi — đảo nhỏ xíu. Đi bộ cho khỏe!'], ['I drive tourists from the dock every morning. They always ask where to eat.', 'Sáng nào anh cũng chở khách từ bến tàu. Ai cũng hỏi ăn ở đâu.']],
    [['I tell every tourist: go to the tea stand on the beach first.', 'Anh dặn du khách nào cũng vậy: ghé quán trà ngoài biển trước.'], ['Beep beep! Sorry, habit.', 'Bíp bíp! Xin lỗi, quen tay.']],
    [['The ferry is so full now I had to buy a second helmet.', 'Giờ tàu đông khách tới mức anh phải mua thêm cái nón bảo hiểm.'], ['Your restaurant is the talk of the mainland. My cousin wants a job!', 'Nhà hàng của em nổi tiếng tận đất liền. Em họ anh xin vào làm đó!']],
  ],
  chi_mai: [
    [['Letters for everyone! …None for you yet. Soon!', 'Thư đây! Thư cho mọi người! …Chưa có thư cho em. Sắp có thôi!'], ['I walk the whole island twice a day. Your shop is my favourite stop.', 'Chị đi hết hòn đảo hai lần một ngày. Quán em là trạm chị thích nhất.']],
    [['People are sending letters to the island again. That hasn\'t happened in years.', 'Người ta lại gửi thư ra đảo rồi. Mấy năm nay đâu có vậy.'], ['A package for Mèo Mây. It\'s… a lot of fish-shaped cushions.', 'Có bưu kiện cho Mèo Mây. Toàn là… gối hình con cá.']],
    [['I got a letter addressed to “the tea person, the island”. It found you!', 'Chị nhận được lá thư ghi “người bán trà, trên đảo”. Vậy mà tới được tay em!'], ['Busy, busy! No time to chat! …Okay, a little time.', 'Bận quá bận! Không rảnh nói chuyện! …Thôi, rảnh chút xíu.']],
  ],
};
const MERCH = {
  chi_tien: [['A new haircut is the cheapest holiday there is. Sit, sit!', 'Cắt tóc mới là chuyến du lịch rẻ nhất đó. Ngồi đi em!'], ['Mèo Mây came in for a trim once. It wanted a mohawk. I said no.', 'Mèo Mây từng vào đòi tỉa lông. Nó muốn kiểu mohican. Chị từ chối.'], ['Curtain bangs are very popular this season. Just saying.', 'Mùa này mái bay đang hot lắm nha. Chị nói vậy thôi.'], ['Pink hair? Blue hair? On this island, anything goes!', 'Tóc hồng? Tóc xanh? Trên đảo này cái gì cũng được hết!']],
  co_ba: [['Every outfit tells a story. Yours says "I run a very good tea stand."', 'Bộ đồ nào cũng kể một câu chuyện. Bộ của con nói "Tôi bán trà rất ngon."'], ['I sewed Mèo Mây a tiny raincoat once. It refused to wear it. Artists suffer.', 'Cô từng may cho Mèo Mây một cái áo mưa nhỏ xíu. Nó không chịu mặc. Nghệ sĩ khổ lắm.'], ['Try the áo dài! Every island girl and boy should have one for Tết.', 'Thử áo dài đi con! Ai trên đảo cũng nên có một bộ cho Tết.'], ['Come back when you level up — I keep my best pieces for famous shopkeepers.', 'Lên cấp rồi quay lại nha — cô để dành đồ đẹp nhất cho chủ quán nổi tiếng.']],
  co_hoa: [['Fresh kumquats today — the sourest, sweetest ones.', 'Hôm nay có tắc tươi — chua nhất, ngọt nhất.'], ['Buy in packs, prep at your shop. Easy!', 'Mua theo gói, về quán sơ chế. Dễ ợt!'], ['The supermarket is busier than ever thanks to you.', 'Nhờ con mà siêu thị đông khách hơn bao giờ hết.']],
  chu_bay: [['Wood, metal, paint! Everything you need to fix anything!', 'Gỗ, tôn, sơn! Đủ thứ để sửa mọi thứ!'], ['That shed of yours — I knew it had good bones.', 'Căn chòi của con đó — chú biết nó còn chắc mà.'], ['Big projects need big piles of wood. I\'ve got piles.', 'Việc lớn cần nhiều gỗ. Chú có cả đống.']],
  anh_khoa: [['Every home should have one thing that makes you smile when you walk in.', 'Nhà nào cũng nên có một món làm mình mỉm cười khi bước vào.'], ['I carve every chair myself. Well, most of them.', 'Ghế nào anh cũng tự tay đẽo. À, gần hết.'], ['Try a lantern by your bed. Very cozy at night.', 'Thử đặt một cái lồng đèn cạnh giường đi. Buổi tối ấm cúng lắm.']],
  ba_sau: [['The lanterns remember everyone who ever walked under them.', 'Lồng đèn nhớ hết những ai từng đi dưới nó.'], ['Grilled rice paper — my mother\'s recipe. Crispy edges, soft middle.', 'Bánh tráng nướng — công thức của mẹ bà. Rìa giòn, giữa mềm.'], ['The market lives again. I can finally rest my old eyes.', 'Chợ sống lại rồi. Giờ bà mới yên tâm nghỉ ngơi.']],
};
const STAFF = {
  dreamy: [['Sorry, I was thinking about clouds. What was the order?', 'Xin lỗi, em đang nghĩ về mây. Order gì vậy ạ?'], ['Do you think the fish in the tank have names?', 'Anh chị nghĩ mấy con cá trong bể có tên không?']],
  speedy: [['Table three! Table five! Coming through!', 'Bàn ba! Bàn năm! Nhường đường nào!'], ['I can carry four bowls at once. Want to see? …Maybe not.', 'Em bưng được bốn tô một lần. Muốn xem không? …Thôi khỏi.']],
  cheerful: [['I love this job! Everyone here is so nice!', 'Em mê công việc này lắm! Ai ở đây cũng dễ thương!'], ['A guest said my smile was better than the phở. The phở is very good, so that\'s a lot.', 'Có khách khen em cười còn ngon hơn phở. Mà phở ngon lắm, nên vậy là khen dữ lắm.']],
  careful: [['I double-check every order. Triple, sometimes.', 'Order nào em cũng kiểm tra hai lần. Có khi ba lần.'], ['The stove is clean, the knives are sharp, the herbs are fresh.', 'Bếp sạch, dao bén, rau tươi.']],
  steady: [['Just doing my job, boss!', 'Em làm việc thôi, sếp!'], ['The kitchen is running smoothly today.', 'Hôm nay bếp chạy êm ru.']],
};
const VISITOR = [['What a pretty island! We came on the morning ferry.', 'Đảo đẹp quá! Tụi mình đi chuyến tàu sáng.'], ['Do you know where the tea stand is? Everyone says it\'s the best!', 'Quán trà ở đâu vậy? Ai cũng khen ngon nhất!'], ['I want to live here forever. Or at least until the last ferry.', 'Muốn ở đây mãi luôn. Hoặc ít nhất tới chuyến tàu cuối.'], ['Have you seen the lanterns at the Night Market? Magical!', 'Bạn thấy lồng đèn ở Chợ Đêm chưa? Đẹp như mơ!'], ['This island smells like grilled pork and sea breeze. Perfect.', 'Hòn đảo này thơm mùi thịt nướng và gió biển. Tuyệt vời.']];
const pickT = pair => T(pair[0], pair[1]);

export async function talkToResident(a) {
  const rid = a.data.rid;
  const s = G.state, f = s.friends[rid] || 0;
  const tier = s.story.chapter >= 5 ? 2 : s.story.chapter >= 3 ? 1 : 0;
  a.stop(); a.sit = false; a.face(G.player); G.player.face(a);
  a.setEmo('happy', 2); a.showEmote(f > 10 ? 'heart' : 'happy', 1.2);
  const pool = LINES[rid]?.[tier] || [['Hello!', 'Xin chào!']];
  const reg = s.regulars['res:' + rid];
  let line = pickT(choice(pool));
  if (reg?.visits >= 3 && Math.random() < 0.4) line = T(`${s.player.name}! My usual ${reg.fav ? recipeName(reg.fav) : 'order'} was perfect last time. Thank you!`, `${s.player.name}! Lần trước món ${reg.fav ? recipeName(reg.fav) : 'quen'} ngon lắm. Cảm ơn nha!`);
  await residentMenu(a, rid, () => say(a, line));
  const key = 'talk:' + rid;
  if (s.story.flags[key] !== s.day) { s.story.flags[key] = s.day; s.friends[rid] = f + 1; markDirty(); }
  a.data.until = Math.max(a.data.until || 0, s.time + 3);
}
export async function talkToMerchant(a) {
  a.face(G.player); a.showEmote('happy', 1.2); a.setEmo('happy', 2);
  await say(a, pickT(choice(MERCH[a.data.mid] || [['Hello!', 'Xin chào!']])));
}
export async function talkToStaff(a) {
  const e = a.data.emp;
  a.face(G.player);
  const role = T(ROLES[e.role].en, ROLES[e.role].vi);
  await say(a, `(${role}) ${pickT(choice(STAFF[e.trait] || STAFF.steady))}`);
}
export async function talkToVisitor(a) {
  a.face(G.player); a.showEmote('happy', 1.2);
  if (Math.random() < 0.3) { await say(a, randomJoke(), { emo: 'happy' }); return; }
  await say(a, pickT(choice(VISITOR)));
}
