// Conversations with residents, shopkeepers, staff and visitors. Lines shift
// with friendship and story progress; talking once a day builds friendship.

import { G, markDirty } from './state.js';
import { RESIDENTS, MERCHANTS } from '../data/looks.js';
import { RECIPES, ROLES } from '../data/game.js';
import { say } from '../ui/dialogue.js';
import { choice } from '../core/util.js';

const LINES = {
  ba_tu: [
    ['Ôi, con là người sửa quán trà của bà đó hả? Bà mừng quá!', 'That was my tea stand, you know. Forty years of trà tắc. Don\'t let anyone put too much sugar in.'],
    ['Con nhớ ăn cơm đầy đủ nha. Business is a marathon, not a race.', 'The island feels young again. My knees don\'t, but the island does.'],
    ['Bà kể con nghe: Mèo Mây came on Chú Hải\'s boat as a tiny kitten and never left.', 'I come by your shop just to watch the people smile.'],
  ],
  chu_hai: [
    ['Ê, người mới! You know how to fish? No? Ah well. Tea is also important.', 'Sóng hôm nay êm. Calm sea today. Good day for business.'],
    ['I brought Mèo Mây here years ago. Best catch of my life, and I once caught a fish the size of a scooter.', 'The ferry captain owes me money. Don\'t tell him I said that.'],
    ['Your food truck is doing well? That old thing used to be my bait shop!', 'Tourists keep asking me for photos. I charge one trà tắc per photo.'],
  ],
  linh: [
    ['Hi! I\'m studying on the mainland but I come home every weekend. This island is my favourite place in the world.', 'Do you have trà sữa? No pressure. But. Trà sữa?'],
    ['I posted your shop online and now my friends want to visit!', 'Exam season is scary. Cà phê sữa đá helps.'],
    ['I told my professor about your island. He\'s coming for the Night Market!', 'You\'re kind of famous now, you know that?'],
  ],
  minh: [
    ['Hold still — the light is perfect. …Got it! You look like a local already.', 'I photograph every sunrise here. None of them are the same.'],
    ['My photos of your shop got a thousand likes. That\'s a thousand hungry people.', 'The lanterns at night are a photographer\'s dream.'],
    ['If you ever build a statue, I call dibs on the first photo.', 'Rushed? Me? I just walk fast because the light moves fast.'],
  ],
  co_lan: [
    ['Hoa sứ, hoa giấy, hoa phượng… every flower on this island has a story.', 'I\'m picky about tea. Very picky. I will know if you rush it.'],
    ['Your shop needs flowers. Everything needs flowers.', 'A perfect order is like a perfect bouquet. Each thing in its place.'],
    ['I brought you a hoa sứ for your counter. Don\'t let it wilt!', 'The Night Market smells like my childhood.'],
  ],
  be_na: [
    ['Chị/anh ơi! Do you sell chè? When will you sell chè?', 'I saw Mèo Mây sleeping on your roof yesterday!'],
    ['I\'m saving my coins for your food. I have… four coins.', 'When I grow up I want a shop just like yours!'],
    ['CHÈ! You have CHÈ! This is the best day of my life!', 'Mèo Mây let me pet its tail. Only once. It\'s very busy.'],
  ],
  anh_tuan: [
    ['Xe ôm! Need a ride? Just kidding, the island is small. Walk, it\'s healthy!', 'I drive tourists from the dock every morning. They always ask where to eat.'],
    ['I tell every tourist: go to the tea stand on the beach first.', 'Beep beep! Sorry, habit.'],
    ['The ferry has so many people now I had to buy a second helmet.', 'Your restaurant is the talk of the mainland. My cousin wants a job!'],
  ],
  chi_mai: [
    ['Thư! Letters for everyone! …None for you yet. Soon!', 'I walk the whole island twice a day. Your shop is my favourite stop.'],
    ['People are sending letters to the island again. That hasn\'t happened in years.', 'A package for Mèo Mây. It\'s… a lot of fish-shaped cushions.'],
    ['I got a letter addressed to "the tea person, the island". It found you!', 'Busy, busy! No time to chat! …Okay, a little time.'],
  ],
};
const MERCH = {
  co_hoa: ['Chào con! Fresh kumquats today — the sourest, sweetest ones.', 'Buy in packs, prep at the shop. Easy!', 'The supermarket is busier than ever thanks to you.'],
  chu_bay: ['Gỗ, tôn, sơn! Everything you need to fix anything!', 'That shed of yours — I knew it had good bones.', 'Big projects need big piles of wood. I\'ve got piles.'],
  anh_khoa: ['Every home should have one thing that makes you smile when you walk in.', 'I carve every chair myself. Well, most of them.', 'Try placing a lantern by your bed. Very cozy at night.'],
  ba_sau: ['The lanterns remember everyone who ever walked under them.', 'Bánh tráng nướng — my mother\'s recipe. Crispy edges, soft middle.', 'The market lives again. I can finally rest my old eyes.'],
};

export async function talkToResident(a) {
  const rid = a.data.rid, def = RESIDENTS[rid];
  const s = G.state, f = s.friends[rid] || 0;
  const tier = s.story.chapter >= 5 ? 2 : s.story.chapter >= 3 ? 1 : 0;
  a.stop(); a.sit = false; a.face(G.player); G.player.face(a);
  a.setEmo('happy', 2); a.showEmote(f > 10 ? 'heart' : 'happy', 1.2);
  const lines = LINES[rid]?.[tier] || ['Xin chào!'];
  const reg = s.regulars['res:' + rid];
  let line = choice(lines);
  if (reg?.visits >= 3 && Math.random() < 0.4) line = `${s.player.name}! My usual ${RECIPES[reg.fav]?.vi || 'order'} was perfect last time. Cảm ơn nha!`;
  await say(a, line);
  const key = 'talk:' + rid;
  if (s.story.flags[key] !== s.day) { s.story.flags[key] = s.day; s.friends[rid] = f + 1; markDirty(); }
  a.data.until = Math.max(a.data.until || 0, s.time + 3);
}
export async function talkToMerchant(a) {
  a.face(G.player); a.showEmote('happy', 1.2); a.setEmo('happy', 2);
  await say(a, choice(MERCH[a.data.mid] || ['Xin chào!']));
}
export async function talkToStaff(a) {
  const e = a.data.emp;
  a.face(G.player);
  const lines = e.trait === 'dreamy' ? ['Sorry, I was thinking about clouds. What was the order?', 'Do you think the fish in the tank have names?'] : e.trait === 'speedy' ? ['Table three! Table five! Coming through!', 'I can carry four bowls at once. Want to see? …Maybe not.'] : e.trait === 'cheerful' ? ['I love this job! Everyone here is so nice!', 'A guest told me my smile was better than the phở. The phở is very good, so that\'s a lot.'] : e.trait === 'careful' ? ['I double-check every order. Triple, sometimes.', 'The stove is clean, the knives are sharp, the herbs are fresh.'] : ['Just doing my job, boss!', 'The kitchen is running smoothly today.'];
  await say(a, `(${ROLES[e.role].vi}) ${choice(lines)}`);
}
export async function talkToVisitor(a) {
  a.face(G.player); a.showEmote('happy', 1.2);
  await say(a, choice(['What a pretty island! We came on the morning ferry.', 'Do you know where the tea stand is? Everyone says it\'s the best!', 'Chụp ảnh giúp mình được không? …Just kidding. The views here!', 'I want to live here forever. Or at least until the last ferry.', 'The lanterns at the Night Market — have you seen them? Magical!']));
}
