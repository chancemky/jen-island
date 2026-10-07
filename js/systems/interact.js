// Things you can do with the world, not menus: switch the TV on and flip channels,
// put a record on, play the piano, feed the fish, turn lamps off, read a book, look
// in the mirror, check the calendar — at home and in the neighbours' houses — and
// outside: toss a coin in the fountain, skip stones, read the ferry timetable,
// wave at the ferry. Every kind of thing you try is remembered in your journal
// ("Discoveries").

import { lockInput, releaseInput } from '../core/locks.js';
import { G, T, markDirty, addMoney, canAfford } from './state.js';
import { say } from '../ui/dialogue.js';
import { toast } from '../ui/hud.js';
import { openSheet, h } from '../ui/sheets.js';
import { sfx, setRoomMusic, roomMusic, playNote } from '../core/audio.js';
import { fx } from '../world/render.js';
import { choice, dist, rand, clock, bus, islandDay } from '../core/util.js';
import { PLAZA, PIER, PIER_END, isOcean } from '../world/island.js';
import { COUNTS } from '../core/counts.js';
import { npcs, visitorBoatTimes } from './npc.js';

// ---------------------------------------------------------------- discoveries
export const DISCOVERIES = {
  tv: ['Watched TV', 'Xem tivi'], radio: ['Played the radio', 'Mở radio'], record: ['Put on a record', 'Nghe đĩa hát'], piano: ['Played the piano', 'Chơi đàn piano'],
  fish: ['Fed the fish', 'Cho cá ăn'], lamp: ['Switched a lamp', 'Bật tắt đèn'], clock: ['Checked the clock', 'Xem đồng hồ'], calendar: ['Read the calendar', 'Xem lịch'],
  mirror: ['Looked in a mirror', 'Soi gương'], books: ['Read from a bookshelf', 'Đọc sách trên kệ'], photo: ['Looked at the photos', 'Ngắm ảnh'],
  coin: ['Made a wish at the fountain', 'Ước ở đài phun nước'], stones: ['Skipped stones', 'Ném thia lia'], timetable: ['Read the ferry timetable', 'Xem lịch tàu'],
  wave: ['Waved at the ferry', 'Vẫy tay chào tàu'], telescope: ['Looked through the telescope', 'Nhìn qua ống nhòm'], fishing: ['Went fishing', 'Đi câu cá'],
  garden: ['Grew something', 'Trồng cây'], trick: ['Taught a pet a trick', 'Dạy thú cưng làm xiếc'], meo_pet: ['Introduced Mèo Mây to a pet', 'Cho Mèo Mây gặp thú cưng'],
  fitting: ['Used the fitting room', 'Vào phòng thử đồ'], kitchen: ['Poked around a kitchen', 'Khám phá nhà bếp'], display: ['Browsed a shop display', 'Ngắm quầy trưng bày'],
  plaque: ['Read a plaque', 'Đọc bảng ghi chú'], gift: ['Gave a neighbour a gift', 'Tặng quà hàng xóm'], snack: ['Found a favourite snack', 'Tìm ra món vặt ruột'],
};
COUNTS.discoveries = Object.keys(DISCOVERIES).length;
export function discover(key) {
  const s = G.state, d = (s.discovered ||= {});
  if (d[key] || !DISCOVERIES[key]) return;
  d[key] = s.day; markDirty();
  toast({ text: T(`Discovery: ${DISCOVERIES[key][0]}`, `Khám phá: ${DISCOVERIES[key][1]}`), sub: T(`${Object.keys(d).length} of ${COUNTS.discoveries} things tried · journal`, `${Object.keys(d).length}/${COUNTS.discoveries} điều đã thử · sổ tay`), icon: 'star', ms: 2200 });
  bus.emit('discover', key);
}

// ---------------------------------------------------------------- indoors: furniture that does something
const kindOf = p => p.homeFurn ? p.homeFurn.id : p.kind;
const stateOf = p => p.homeFurn ? (p.homeFurn.fs ||= {}) : p;          // your own furniture remembers (saved); elsewhere it's just for now
const WALL = new Set(['clock', 'calendar', 'wall_mirror', 'mirror', 'painting', 'familyPhoto', 'photoWall', 'lantern_red', 'hanging_plant', 'neon_sign', 'fairy_lights']);
const ACTIONS = {
  tv: p => ({ label: stateOf(p).off ? T('Turn on TV', 'Bật tivi') : T('Change channel', 'Đổi kênh'), icon: 'star', run: () => tv(p) }),
  radio: p => ({ label: roomMusic() === 'radio' ? T('Radio off', 'Tắt radio') : T('Radio on', 'Bật radio'), icon: 'note', run: () => music(p, 'radio') }),
  record_player: p => ({ label: roomMusic() === 'record' ? T('Stop the record', 'Dừng đĩa') : T('Play a record', 'Bật đĩa hát'), icon: 'note', run: () => music(p, 'record') }),
  piano: p => ({ label: T('Play piano', 'Chơi đàn'), icon: 'note', run: () => openPiano() }),
  fishtank: p => ({ label: T('Feed the fish', 'Cho cá ăn'), icon: 'fish', run: () => feedFish(p) }),
  aquarium_big: p => ACTIONS.fishtank(p), koi: p => ACTIONS.fishtank(p),
  lamp: p => ({ label: stateOf(p).off ? T('Lamp on', 'Bật đèn') : T('Lamp off', 'Tắt đèn'), icon: 'lantern', run: () => lamp(p) }),
  lamp_floor: p => ACTIONS.lamp(p), lamp_table: p => ACTIONS.lamp(p), lantern_red: p => ACTIONS.lamp(p),
  clock: p => ({ label: T('Check the time', 'Xem giờ'), icon: 'sleep_moon', run: () => clockLook() }),
  calendar: p => ({ label: T('Read calendar', 'Xem lịch'), icon: 'notebook', run: () => calendarLook() }),
  wall_mirror: p => ({ label: T('Mirror', 'Soi gương'), icon: 'heart', run: () => mirror() }), mirror: p => ACTIONS.wall_mirror(p),
  bookshelf: p => ({ label: T('Read', 'Đọc sách'), icon: 'notebook', run: () => books() }),
  familyPhoto: p => ({ label: T('Photos', 'Xem ảnh'), icon: 'photo', run: () => photos(p) }), photoWall: p => ACTIONS.familyPhoto(p),
  stove: p => G.scene?.id === 'house' ? { label: T('Recipe lab', 'Bếp thử món'), icon: 'grill', run: () => import('../ui/lab.js').then(m => m.openLab()) } : { label: T('Stove', 'Bếp'), icon: 'grill', run: () => kitchen(p, 'stove') }, sink: p => ({ label: T('Sink', 'Bồn rửa'), icon: 'ice', run: () => kitchen(p, 'sink') }),
  prepTable: p => ({ label: T('Prep table', 'Bàn sơ chế'), icon: 'bread_split', run: () => kitchen(p, 'prep') }),
  fittingRoom: p => ({ label: T('Fitting room', 'Phòng thử đồ'), icon: 'shirt', run: () => fitting(p) }),
  neon_sign: p => ACTIONS.lamp(p), moon_lamp: p => ACTIONS.lamp(p), fairy_lights: p => ACTIONS.lamp(p),
  arcade_cabinet: p => ({ label: T('Play a game', 'Chơi một ván'), icon: 'star', run: () => arcade(p) }),
  telescope: p => ({ label: T('Look through', 'Nhìn qua kính'), icon: 'star', run: () => stargaze() }),
  bird_cage: p => ({ label: T('Whistle to the bird', 'Huýt sáo với chim'), icon: 'note', run: () => { discover('bird'); sfx('sparkle'); G.player.setAct('wave'); setTimeout(() => G.player.act === 'wave' && G.player.setAct(null), 900); toast({ text: T('The canary sings back, very pleased with itself', 'Chim hoàng yến hót đáp lại, rất tự hào'), icon: 'note', ms: 1800 }); } }),
  tea_set: p => ({ label: T('Pour some tea', 'Rót trà'), icon: 'tea', run: () => { discover('tea'); sfx('pour'); G.player.setAct('drink', 'cup'); setTimeout(() => G.player.act === 'drink' && G.player.setAct(null), 2200); toast({ text: T('A small cup of hot tea. Everything slows down.', 'Một chén trà nóng nhỏ. Mọi thứ chậm lại.'), icon: 'tea', ms: 1800 }); } }),
  shelfJars: p => ({ label: T('Look', 'Xem'), icon: 'photo', run: () => display(p) }), flowerCooler: p => ACTIONS.shelfJars(p), flowerBuckets: p => ACTIONS.shelfJars(p),
};
export function nearbyThing(sc, pl) {
  let best = null, bd = 1e9;
  for (const p of sc.props || []) {
    const k = kindOf(p); if (!ACTIONS[k]) continue;
    let d;
    if (WALL.has(k) || p.sortY === -1) { if (Math.abs(p.x - pl.x) > 20 || pl.y - p.y > 46 || pl.y < p.y) continue; d = Math.abs(p.x - pl.x); }
    else { d = dist(p.x, p.y + 12, pl.x, pl.y); if (d > 30) continue; }
    if (d < bd) { bd = d; best = p; }
  }
  if (!best) return null;
  return ACTIONS[kindOf(best)](best);
}

const PROGRAMS = [
  ['Island news: "Tourist numbers up again. Local cat takes credit."', 'Thời sự đảo: “Khách du lịch lại tăng. Một con mèo địa phương nhận công.”'],
  ['A cooking show. The chef adds far too much sugar. You shout at the TV.', 'Chương trình nấu ăn. Đầu bếp cho quá nhiều đường. Bạn la cái tivi.'],
  ['The tide report, read very seriously by a man in a raincoat.', 'Bản tin thủy triều, đọc rất nghiêm túc bởi một người mặc áo mưa.'],
  ['A cartoon about a cat who runs a shop. Suspiciously familiar.', 'Phim hoạt hình về con mèo mở quán. Nghe quen quen.'],
  ['An old film. Everyone on the ferry is in love. The ferry comes every day.', 'Một bộ phim cũ. Ai trên tàu cũng đang yêu. Tàu ngày nào cũng chạy.'],
];
async function tv(p) {
  const st = stateOf(p); discover('tv');
  if (st.off) { st.off = false; sfx('click'); }
  else { st.ch = ((st.ch || 0) + 1) % PROGRAMS.length; sfx('tap'); }
  p.ch = st.ch; p.off = st.off; markDirty();
  const pr = PROGRAMS[st.ch || 0];
  await say(null, T(pr[0], pr[1]));
  if ((st.ch || 0) === PROGRAMS.length - 1) { st.off = true; p.off = true; sfx('click'); toast({ text: T('You switched the TV off', 'Bạn tắt tivi'), icon: 'sleep_moon', ms: 1400 }); }
}
function music(p, style) {
  discover(style === 'radio' ? 'radio' : 'record');
  if (roomMusic() === style) { setRoomMusic(null); sfx('click'); return; }
  setRoomMusic(style); sfx('click');
  fx.burst('star', p.x, p.y - 24, 4, { up: 30, life: 1.4, col: '#ffd35a' });
  toast({ text: style === 'radio' ? T('The radio plays a bright tune', 'Radio phát một giai điệu vui tươi') : T('A slow old record crackles into life', 'Chiếc đĩa cũ lách tách cất tiếng chậm rãi'), icon: 'note', ms: 1600 });
}
bus.on('leave', () => setRoomMusic(null));
bus.on('enter', () => setRoomMusic(null));
function feedFish(p) {
  const s = G.state; discover('fish');
  sfx('fishsplash'); fx.burst('spark', p.x, p.y - 30, 8, { up: 16, col: '#f2c14e', life: 0.9 });
  G.player.setAct('work'); setTimeout(() => G.player.act === 'work' && G.player.setAct(null), 700);
  const k = 'fishFed:' + (G.scene?.id || '');
  if (s.story.flags[k] !== s.day) { s.story.flags[k] = s.day; markDirty(); toast({ text: T('The fish crowd to the top, mouths popping', 'Đàn cá ùa lên mặt nước, miệng lép bép'), icon: 'fish', ms: 1600 }); }
  else toast({ text: T('They\'ve eaten today — they look at you hopefully anyway', 'Hôm nay tụi nó ăn rồi — mà vẫn nhìn bạn đầy hy vọng'), icon: 'fish', ms: 1600 });
}
function lamp(p) { const st = stateOf(p); st.off = !st.off; p.off = st.off; markDirty(); sfx('click'); discover('lamp'); }
async function arcade(p) {
  discover('arcade'); sfx('click'); G.player.face('up'); G.player.setAct('work');
  const score = 1000 + Math.floor(Math.random() * 9000), st = stateOf(p), best = Math.max(st.best || 0, score); st.best = best; markDirty();
  setTimeout(() => { G.player.setAct(null); sfx(score === best ? 'fanfare' : 'pop'); toast({ text: score === best ? T(`New high score: ${score}!`, `Kỷ lục mới: ${score}!`) : T(`Score: ${score}`, `Điểm: ${score}`), sub: T(`Best: ${best}`, `Cao nhất: ${best}`), icon: 'star', ms: 2200 }); }, 1600);
}
async function stargaze() {
  discover('telescope'); G.player.face('up');
  const night = G.state.time >= 19 * 60 || G.state.time < 5 * 60;
  await say(null, night ? choice([T('The Moonfish constellation, right above the lighthouse. Lucky!', 'Chòm sao Cá Mặt Trăng, ngay trên hải đăng. May mắn ghê!'), T('A shooting star! You make a wish about tomorrow\'s customers.', 'Sao băng! Bạn ước cho khách ngày mai thật đông.'), T('The moon is so close you can see its craters smiling.', 'Trăng gần đến mức thấy cả miệng hố đang cười.')]) : T('In daylight you can see all the way to the mainland. A ferry, a cloud, a seagull.', 'Ban ngày nhìn thấy tận đất liền. Một chiếc phà, một đám mây, một con hải âu.'));
}
async function clockLook() { discover('clock'); await say(null, T(`It's ${clock(G.state.time)}. ${G.state.time >= 22 * 60 ? 'Nearly bedtime.' : G.state.time < 8 * 60 ? 'Early — the island is just waking up.' : 'Plenty of day left.'}`, `Bây giờ là ${clock(G.state.time)}. ${G.state.time >= 22 * 60 ? 'Sắp tới giờ ngủ rồi.' : G.state.time < 8 * 60 ? 'Còn sớm — hòn đảo mới thức dậy.' : 'Ngày còn dài.'}`)); }
async function calendarLook() {
  discover('calendar');
  const ev = nextEvent(G.state.day);
  await say(null, T(`Day ${G.state.day} on the island. ${ev ? `Circled on the calendar: ${ev.en} (day ${ev.day}).` : ''}`, `Ngày ${G.state.day} trên đảo. ${ev ? `Khoanh tròn trên lịch: ${ev.vi} (ngày ${ev.day}).` : ''}`));
}
async function mirror() {
  discover('mirror'); const pl = G.player;
  pl.face('up'); pl.setEmo('happy', 2); pl.showEmote('heart', 1.2); sfx('sparkle');
  await say(null, choice([T('Looking good. The island agrees.', 'Trông ổn áp lắm. Cả đảo đồng ý.'), T('You practise your "welcome, come again!" smile.', 'Bạn tập nụ cười “cảm ơn, lần sau ghé nữa nha!”.'), T('There\'s a little kumquat pulp on your collar. Much better now.', 'Có chút tép tắc dính trên cổ áo. Giờ ổn rồi.')]));
}
const BOOKS = [
  ['"A History of the Island Ferry", chapter 3: "Twice a Week".', '“Lịch sử chuyến tàu ra đảo”, chương 3: “Hai lần mỗi tuần”.'],
  ['A cookbook. Someone has written "less sugar!" in every margin.', 'Một cuốn sách nấu ăn. Ai đó ghi “bớt đường!” ở mọi lề trang.'],
  ['"How to Befriend a Cat". Page one: "You don\'t. It befriends you."', '“Làm Thân Với Mèo”. Trang một: “Bạn không làm được. Nó làm thân với bạn.”'],
  ['A book of Night Market lantern patterns, each one named after a family.', 'Sách mẫu lồng đèn Chợ Đêm, mỗi mẫu mang tên một gia đình.'],
  ['A tide table from years ago, with the fishing boats\' names written in pencil.', 'Bảng thủy triều từ nhiều năm trước, tên các thuyền đánh cá ghi bằng bút chì.'],
  ['Poems about the sea. One is just the word "blue" nine times. It\'s oddly moving.', 'Thơ về biển. Một bài chỉ có chữ “xanh” chín lần. Lạ mà cảm động.'],
];
async function books() { discover('books'); sfx('page'); await say(null, T(...choice(BOOKS))); }
async function photos(p) {
  discover('photo');
  const f = G.state.story.flags, lines = [];
  if (G.scene?.id === 'house') {
    if (f.photo_sunset) lines.push(T('Minh\'s sunset photo from the lighthouse — you look like you own the place. You sort of do.', 'Ảnh hoàng hôn Minh chụp ở hải đăng — trông bạn như chủ hòn đảo. Mà cũng gần vậy.'));
    if (f.old_photo) lines.push(T('The old photograph: the tea stand\'s opening day, and a kitten held like a teapot.', 'Tấm ảnh cũ: ngày khai trương quán trà, và chú mèo con được bế như ấm trà.'));
    if (!lines.length) lines.push(T('An empty frame, waiting for a good memory.', 'Một khung ảnh trống, chờ một kỷ niệm đẹp.'));
  } else lines.push(G.state.story.chapter >= 12 ? T('Family photos — the newest ones have your shops in the background.', 'Ảnh gia đình — mấy tấm mới nhất có quán của bạn phía sau.') : T('Family photos, a little faded. Everyone is squinting into the sun.', 'Ảnh gia đình, hơi bạc màu. Ai cũng nheo mắt vì nắng.'));
  for (const l of lines) await say(null, l);
}
async function kitchen(p, what) {
  discover('kitchen');
  if (what === 'stove') { sfx('sizzle'); fx.burst('dust', p.x, p.y - 30, 6, { up: 30, col: '#fff', life: 1 }); await say(null, T('You wave at the stove. It\'s warm. Somebody cooked something good here today.', 'Bạn vẫy tay trước bếp. Còn ấm. Hôm nay ai đó đã nấu món gì ngon ở đây.')); }
  else if (what === 'sink') { sfx('splash'); await say(null, T('You rinse a cup and put it back exactly where it was.', 'Bạn tráng cái ly rồi đặt lại đúng chỗ cũ.')); }
  else { sfx('chop'); await say(null, T('The chopping board has knife marks from years of kumquats.', 'Cái thớt đầy vết dao từ bao năm cắt tắc.')); }
}
async function display(p) { discover('display'); await say(null, choice([T('Neat rows of jars, every label handwritten.', 'Những hàng lọ ngay ngắn, nhãn nào cũng viết tay.'), T('Everything here is arranged by colour. Somebody cares a lot.', 'Mọi thứ ở đây xếp theo màu. Ai đó chăm chút lắm.'), T('A little sign: "Please touch gently — it\'s all loved."', 'Tấm bảng nhỏ: “Xin chạm nhẹ tay — món nào cũng được thương.”')])); }

// the boutique's fitting room: step in, the curtain closes, change, step out
async function fitting(p) {
  const pl = G.player; discover('fitting');
  lockInput('fitting');
  try {
    await pl.walkTo([[p.x, p.y + 2]], { speed: 60 });
    pl.visible = false; p.occupied = true; sfx('whoosh');
    const { openWardrobe } = await import('../ui/clothes.js'), { isUiOpen } = await import('../ui/sheets.js');
    openWardrobe();
    await new Promise(r => { const iv = setInterval(() => { if (!isUiOpen()) { clearInterval(iv); r(); } }, 200); });
  } finally { sfx('whoosh'); p.occupied = false; pl.visible = true; pl.y = p.y + 16; pl.face('down'); releaseInput('fitting'); }
  pl.setEmo('happy', 2); fx.burst('spark', pl.x, pl.y - 30, 10, { up: 30, col: ['#f4a9b8', '#ffd35a', '#fff'] }); sfx('sparkle');
}

// ---------------------------------------------------------------- the piano: tap keys to play
function openPiano() {
  discover('piano');
  openSheet({ title: T('Piano', 'Đàn piano'), sub: T('Tap the keys. Try: 1 1 5 5 6 6 5', 'Chạm phím. Thử: 1 1 5 5 6 6 5'), build: body => {
    const row = h('div', 'piano'); body.appendChild(row);
    const notes = [60, 62, 64, 65, 67, 69, 71, 72];
    notes.forEach((n, i) => { const k = h('button', 'pkey', `<small>${i + 1}</small>`); k.type = 'button'; k.onpointerdown = e => { e.preventDefault(); playNote(n); k.classList.add('on'); setTimeout(() => k.classList.remove('on'), 160); G.player?.setAct('work'); }; row.appendChild(k); });
  } });
}

// ---------------------------------------------------------------- outdoors
export function outdoorAction(pl) {
  if (G.scene !== G.scenes.island) return null;
  const s = G.state;
  // the fountain: toss a coin and make a wish
  if (dist(pl.x, pl.y, PLAZA.x, PLAZA.y + 40) < 46) return { label: T('Toss a coin (1k)', 'Ném đồng xu (1k)'), icon: 'coin', run: coinToss };
  // the pier: timetable, waving, skipping stones
  if (Math.abs(pl.x - (PIER.x + PIER.w / 2)) < 40 && pl.y > PIER.y - 30 && pl.y < PIER.y + 30) return { label: T('Ferry timetable', 'Lịch tàu'), icon: 'notebook', run: timetable };
  const f = npcs.ferry;
  if (f && (f.state === 'arriving' || f.state === 'docked' || f.state === 'leaving') && pl.y > PIER.y + 40 && dist(pl.x, pl.y, f.x, f.y) < 260) return { label: T('Wave', 'Vẫy tay'), icon: 'heart', run: waveFerry };
  if (f && f.state !== 'away' && dist(pl.x, pl.y, f.x, f.y) < 260) return { label: T('Ferry', 'Tàu'), icon: 'notebook', run: ferryStatus };
  if (nearShore(pl)) return { label: T('Skip a stone', 'Ném thia lia'), icon: 'rock', run: skipStone };
  return null;
}
// Where a skimmed stone would go: out over open sea, from the beach or the very end of the
// pier (never along the pier's planks). The way you face is tried first. Null if there's no
// open water to throw into.
const inR = (r, x, y) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
function throwDir(pl) {
  const sc = G.scene; if (sc !== G.scenes?.island || !sc.terrain(pl.x, pl.y)) return null;
  const onPier = inR(PIER, pl.x, pl.y) || inR(PIER_END, pl.x, pl.y);
  if (onPier && pl.y < PIER_END.y - 4) return null;                       // walk out to the end first
  const face = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] }[pl.dir] || [0, 1];
  const dirs = [face, [0, 1], [-1, 0], [1, 0]].filter((d, i, a) => a.findIndex(e => e[0] === d[0] && e[1] === d[1]) === i);
  for (const d of dirs) if ([30, 52, 74].every(k => isOcean(pl.x + d[0] * k, pl.y + d[1] * k + (d[1] ? 0 : 12)))) return d;
  return null;
}
const nearShore = pl => !!throwDir(pl);
async function coinToss() {
  if (!canAfford(1)) { await say(null, T('Not enough money.', 'Không đủ tiền.')); return; }
  addMoney(-1, 'other'); discover('coin'); sfx('coin');
  const pl = G.player; pl.setAct('cheer'); fx.burst('coin', PLAZA.x, PLAZA.y - 10, 1, { up: 60, life: 0.8 }); setTimeout(() => { sfx('splash'); fx.burst('splash', PLAZA.x + rand(-10, 10), PLAZA.y, 6, { up: 20, col: '#dff6ff' }); pl.setAct(null); }, 600);
  const s = G.state, k = 'wish';
  if (s.story.flags[k] !== s.day) { s.story.flags[k] = s.day; s.today.wish = true; }
  await say(null, choice([T('You wish for a busy day and a quiet evening.', 'Bạn ước một ngày đông khách và một buổi tối yên bình.'), T('You wish for Mèo Mây to finally get that fish.', 'Bạn ước Mèo Mây cuối cùng cũng có con cá đó.'), T('You wish… no, it\'s a secret. Wishes are.', 'Bạn ước… thôi, bí mật. Điều ước là vậy mà.')]));
}
async function timetable() {
  discover('timetable');
  await say(null, ferryStatusText());
}
function ferryStatusText(atBoat = false) {
  const boats = visitorBoatTimes(), times = boats.map(m => clock(m)), nxt = boats.find(m => m > G.state.time);
  return T(`FERRY — a shuttle boat runs back and forth all day: a new one pulls in a few moments after the last one leaves. Big visitor boats: ${times.join(' · ')}. ${nxt ? `Next visitor boat: ${clock(nxt)}.` : 'No more visitor boats today.'} ${atBoat ? 'This boat is for visitors.' : 'Someone has crossed out "twice a week" and written "EVERY DAY" in marker.'}`, `TÀU — tàu con thoi chạy qua lại cả ngày: chuyến trước vừa đi một lát là có chuyến mới cập bến. Tàu chở khách lớn: ${times.join(' · ')}. ${nxt ? `Chuyến khách kế: ${clock(nxt)}.` : 'Hôm nay hết tàu khách.'} ${atBoat ? 'Chiếc tàu này dành cho khách.' : 'Có ai gạch chữ “hai lần một tuần” rồi ghi “MỖI NGÀY” bằng bút lông.'}`);
}
async function ferryStatus() { await say(null, ferryStatusText(true)); }
async function waveFerry() {
  discover('wave'); const pl = G.player;
  pl.setAct('wave'); sfx('horn'); setTimeout(() => pl.setAct(null), 1400);
  fx.burst('heart', npcs.ferry.x, npcs.ferry.y - 40, 5, { up: 30, life: 1.2 });
  toast({ text: T('The passengers wave back — and the captain sounds the horn', 'Hành khách vẫy lại — và thuyền trưởng kéo còi chào'), icon: 'heart', ms: 1800 });
}
async function skipStone() {
  const pl = G.player; discover('stones');
  pl.setAct('wave'); sfx('whoosh');
  const d = throwDir(pl) || [0, 1]; pl.face(d[0] < 0 ? 'left' : d[0] > 0 ? 'right' : d[1] < 0 ? 'up' : 'down');
  // every skip lands on open water: the throw ends where the sea does
  const at = i => [pl.x + d[0] * (8 + i * 22), pl.y + d[1] * (8 + i * 22) + (d[1] ? 0 : 12)];
  let room = 0; while (room < 7 && isOcean(...at(room + 1))) room++;
  const n = Math.max(1, Math.min(room, Math.round(rand(0.6, 1) * rand(1, 7))));
  for (let i = 1; i <= n; i++) setTimeout(() => { const [x, y] = at(i); sfx('splash'); fx.burst('splash', x, y, 4, { up: 12, col: '#e6f7ff' }); }, 200 + i * 170);
  setTimeout(() => pl.setAct(null), 500);
  const s = G.state; s.stats.bestSkip = Math.max(s.stats.bestSkip || 0, n); markDirty();
  await new Promise(r => setTimeout(r, 300 + n * 170));
  toast({ text: T(`${n} skip${n > 1 ? 's' : ''}!`, `${n} lần nảy!`), sub: T(`Your best: ${s.stats.bestSkip}`, `Kỷ lục: ${s.stats.bestSkip}`), icon: 'rock', ms: 1500 });
}

// ---------------------------------------------------------------- the island calendar (seasonal events)
// A year on the island is 60 days. Tết opens it; summer beach days, Mid-Autumn and
// special Night Market Saturdays follow. (The Lantern Festival stays its own story night.)
export const YEAR = 60;
export const EVENTS = [
  { id: 'tet', from: 1, to: 3, en: 'Tết — the New Year', vi: 'Tết Nguyên Đán', boost: { all: 1.25 }, tip: 1.2, line: ['Chúc mừng năm mới! Red envelopes, apricot blossoms and everybody in their best clothes.', 'Chúc mừng năm mới! Lì xì đỏ, hoa mai vàng và ai cũng diện đồ đẹp nhất.'] },
  { id: 'summer', from: 20, to: 22, en: 'Summer Beach Days', vi: 'Những ngày hè trên biển', boost: { drinks: 1.4, truck: 1.3 }, line: ['The beach is full! Everyone wants something cold.', 'Bãi biển kín người! Ai cũng muốn thứ gì đó mát lạnh.'] },
  { id: 'midautumn', from: 40, to: 41, en: 'Mid-Autumn Festival', vi: 'Tết Trung Thu', boost: { night: 1.35, cafe: 1.2 }, line: ['Children parade with star lanterns, and the moon is enormous tonight.', 'Trẻ con rước đèn ông sao, và trăng đêm nay to tròn.'] },
];
// Real-world festivals: everyone celebrates together, on the real dates (Tết and
// Mid-Autumn follow the lunar calendar). While one is on it takes over the island calendar.
const LUNAR = { tet: ['2027-02-06', '2028-01-26', '2029-02-13', '2030-02-03', '2031-01-23'], midautumn: ['2026-09-25', '2027-09-15', '2028-10-03', '2029-09-22', '2030-09-12', '2031-10-01'] };
const REAL = [
  // Bistro Island opens to everyone: the Grand Opening (takes over Pumpkin Nights for its three days)
  { id: 'launch', span: [-1, 1], days: y => y === 2026 ? ['2026-10-31'] : [], en: 'Grand Opening Festival', vi: 'Lễ Hội Khai Trương', boost: { all: 1.3 }, tip: 1.2, fireworks: true, line: ['Bistro Island is open to the world! Balloons, music and fireworks over the plaza tonight.', 'Bistro Island chính thức mở cửa! Bóng bay, âm nhạc và pháo hoa trên quảng trường tối nay.'], hat: 'opening_party', gift: 'opening_balloons' },
  { id: 'newyear', span: [-1, 0], days: y => [`${y}-01-01`], en: 'New Year\'s Eve', vi: 'Đón Năm Mới', boost: { all: 1.15, night: 1.3 }, fireworks: true, line: ['Countdown tonight! Fireworks over the water at midnight.', 'Đếm ngược tối nay! Pháo hoa trên biển lúc nửa đêm.'], hat: 'newyear_party' },
  { id: 'valentine', span: [-3, 0], days: y => [`${y}-02-14`], en: 'Sweethearts\' Day', vi: 'Lễ Tình Nhân', boost: { cafe: 1.3, drinks: 1.25 }, tip: 1.1, line: ['Heart balloons on the plaza, and couples sharing one drink with two straws.', 'Bóng bay trái tim trên quảng trường, và các cặp đôi uống chung một ly hai ống hút.'], hat: 'sweetheart_boppers' },
  { id: 'womensday', span: [-1, 0], days: y => [`${y}-03-08`, `${y}-10-20`], en: 'Women\'s Day', vi: 'Ngày Phụ Nữ', boost: { all: 1.1, cafe: 1.2 }, line: ['Flowers for every mother, sister and friend — Cô Lan\'s buckets are empty by noon.', 'Hoa cho mẹ, cho chị, cho bạn — xô hoa của Cô Lan hết sạch trước trưa.'], hat: 'ao_dai_crown' },
  { id: 'childrensday', span: [-2, 0], days: y => [`${y}-06-01`], en: 'Children\'s Day', vi: 'Tết Thiếu Nhi', boost: { drinks: 1.25, truck: 1.2 }, line: ['Balloons, kites and a very long line for chè. Bé Na is in charge today.', 'Bóng bay, diều và hàng chè dài ơi là dài. Hôm nay Bé Na làm chủ.'], hat: 'propeller_cap' },
  { id: 'nationalday', span: [-1, 1], days: y => [`${y}-09-02`], en: 'National Day', vi: 'Quốc Khánh', boost: { all: 1.2 }, fireworks: true, line: ['Red flags along every street, and fireworks over the harbour tonight.', 'Cờ đỏ sao vàng khắp phố, và pháo hoa trên bến cảng tối nay.'], hat: 'star_band' },
  { id: 'tet', span: [-6, 6], days: () => LUNAR.tet, ...EVENTS[0], hat: 'lucky_nonla' },
  { id: 'midautumn', span: [-5, 2], days: () => LUNAR.midautumn, ...EVENTS[2], hat: 'moon_bow' },
  { id: 'halloween', span: [-7, 0], days: y => [`${y}-10-31`], en: 'Pumpkin Nights', vi: 'Đêm Bí Ngô', boost: { night: 1.3, all: 1.1 }, line: ['Pumpkin lanterns all over the island, and the Night Market is spooky tonight!', 'Đèn bí ngô khắp đảo, và Chợ Đêm tối nay rùng rợn lắm!'], hat: 'black_cat_ears' },
  { id: 'christmas', span: [-6, 1], days: y => [`${y}-12-25`], en: 'Christmas Lights', vi: 'Đèn Giáng Sinh', boost: { cafe: 1.3, all: 1.15 }, tip: 1.15, line: ['Fairy lights over the plaza and hot drinks everywhere.', 'Đèn lấp lánh trên quảng trường và đồ uống nóng khắp nơi.'], hat: 'snow_beanie' },
];
export function realEvent(now = new Date(islandDay() + 'T00:00:00Z')) {   // (the date in Việt Nam)
  const y = now.getUTCFullYear(), day = Date.UTC(y, now.getUTCMonth(), now.getUTCDate()) / 864e5;
  for (const e of REAL) for (const ds of [...e.days(y), ...e.days(y + 1)]) {
    const d = Date.parse(ds + 'T00:00:00Z') / 864e5;
    if (day >= d + e.span[0] && day <= d + e.span[1]) return { ...e, real: true };
  }
  return null;
}
export function eventOn(day = G.state.day) {
  if (day === G.state.day) { const r = realEvent(); if (r) return r; }
  const d = ((day - 1) % YEAR) + 1;
  const ev = EVENTS.find(e => d >= e.from && d <= e.to);
  if (ev) return ev;
  if (d % 7 === 6 && G.state.nightMarket?.restored) return { id: 'nmnight', en: 'Night Market Saturday', vi: 'Tối thứ Bảy ở Chợ Đêm', boost: { night: 1.3 }, line: ['Night Market Saturday — music at the stalls and a longer line for skewers.', 'Tối thứ Bảy ở Chợ Đêm — nhạc ở các sạp và hàng xiên que dài hơn.'] };
  return null;
}
export function nextEvent(day) {
  for (let k = 0; k <= YEAR; k++) { const ev = eventOn(day + k); if (ev && ev.id !== 'nmnight') return { ...ev, day: day + k }; }
  return null;
}
// how much busier a business is today
export function eventBoost(biz) { const ev = eventOn(); return ev ? (ev.boost[biz] || ev.boost.all || 1) : 1; }
export function morningEvent() {
  const ev = eventOn(); if (!ev) return;
  toast({ text: T(`Today: ${ev.en}`, `Hôm nay: ${ev.vi}`), sub: T(ev.line[0], ev.line[1]), icon: 'lantern', ms: 5200 });
}

// ---------------------------------------------------------------- birthdays & gifts
// Every resident has a birthday on the island calendar and a favourite thing.
export const BIRTHDAYS = {
  ba_tu: { day: 8, likes: ['kumquat', 'tea'] }, chu_hai: { day: 14, likes: ['shrimp', 'squid'] }, linh: { day: 25, likes: ['milk', 'tapioca'] },
  minh: { day: 31, likes: ['coffee', 'condensed_milk'] }, co_lan: { day: 18, likes: ['herbs', 'peach'] }, be_na: { day: 5, likes: ['beans', 'coconut_milk'] },
  anh_tuan: { day: 44, likes: ['bread', 'pork'] }, chi_mai: { day: 37, likes: ['lime', 'orange'] }, vy: { day: 52, likes: ['avocado', 'peach'] },
  ong_loc: { day: 12, likes: ['tea', 'rice'] }, chi_ngoc: { day: 28, likes: ['coffee', 'egg_yolk'] }, co_dua: { day: 47, likes: ['coconut_milk', 'lime'] },
};
export function isBirthday(rid, day = G.state.day) { const b = BIRTHDAYS[rid]; return !!b && ((day - 1) % YEAR) + 1 === b.day; }
export function birthdaysToday() { return Object.keys(BIRTHDAYS).filter(r => isBirthday(r)); }

// ---------------------------------------------------------------- little things that happen around the island
let evT = 90;
export function updateWorldEvents(dt) {
  if (!G.state.story.flags.freeRoam || G.runtime.inCutscene || G.scene !== G.scenes.island) return;
  evT -= dt; if (evT > 0) return;
  evT = rand(120, 240);
  const pl = G.player, near = (list, r = 320) => list.filter(a => a.visible !== false && dist(a.x, a.y, pl.x, pl.y) < r);
  const tourists = near(npcs.tourists || []), residents = near(npcs.residents || []).filter(a => a.data.state === 'idle');
  const bark = (a, t, d) => import('./fun.js').then(m => m.bark(a, t, d));
  const events = [];
  if (tourists.length) events.push(() => { const a = choice(tourists); fx.burst('leaf', a.x, a.y - 40, 3, { up: 60, col: '#fff' }); sfx('coo'); bark(a, T('Hey! That seagull took my bánh mì!', 'Ê! Con hải âu cướp ổ bánh mì của tui!'), 2.8); a.showEmote('angry', 1.6); });
  if (tourists.length) events.push(() => { const a = choice(tourists); a.setAct?.('wave'); bark(a, T('Excuse me! Is this the way to the Night Market?', 'Cho hỏi! Đường này ra Chợ Đêm phải không?'), 3); setTimeout(() => a.setAct?.(null), 1600); });
  if (tourists.length && dist(pl.x, pl.y, PLAZA.x, PLAZA.y) < 300) events.push(() => { const a = choice(tourists); a.setAct?.('cheer'); a.showEmote('note', 4); bark(a, T('♪ A song for the plaza! ♪', '♪ Một bài hát cho quảng trường! ♪'), 3.4); for (const r of residents.slice(0, 3)) setTimeout(() => r.showEmote('heart', 1.4), 900); setTimeout(() => a.setAct?.(null), 4000); });
  const na = residents.find(a => a.data.rid === 'be_na'); if (na) events.push(() => { bark(na, T('Look how high my kite goes!', 'Nhìn diều của em bay cao chưa!'), 3); na.setAct('cheer'); setTimeout(() => na.setAct(null), 2000); });
  const tuan = residents.find(a => a.data.rid === 'anh_tuan'); if (tuan) events.push(() => { sfx('beep'); bark(tuan, T('Beep beep! Scooter taxi, cheap and fast!', 'Bíp bíp! Xe ôm đây, rẻ mà nhanh!'), 2.6); });
  if (residents.length >= 2) events.push(() => { const [a, b] = residents; a.face(b); b.face(a); bark(a, T(`Have you tried ${G.state.player.name}'s shop yet?`, `Ghé quán của ${G.state.player.name} chưa?`), 2.8); setTimeout(() => bark(b, T('Every day!', 'Ngày nào cũng ghé!'), 2.4), 1600); });
  if (events.length) choice(events)();
}

// ---------------------------------------------------------------- the neighbours' homes change with their stories
const f = k => () => !!G.state.story.flags[k];
export const LATER = {
  'home_ba_tu:look150': [{ when: f('batu_tin'), text: ['Beside the 1985 photo there\'s a new one: you, at the reopened stand, holding the old tea tin.', 'Cạnh tấm ảnh năm 1985 có thêm một tấm mới: bạn, ở quán trà mở lại, tay cầm hộp trà cũ.'] }, { when: f('batu_tea'), text: ['A second teacup has appeared on the shelf, washed and ready: "for Hải".', 'Trên kệ có thêm một chiếc chén, rửa sạch sẵn sàng: “cho Hải”.'] }],
  'home_linh:look190': [{ when: f('linh_uni'), text: ['An acceptance letter is pinned above the desk: Marine Biology. Around it, doodles of kumquats wearing graduation caps.', 'Một lá thư báo trúng tuyển ghim trên bàn: Sinh học biển. Xung quanh là hình trái tắc đội mũ tốt nghiệp.'] }],
  'home_chu_hai:look150': [{ when: f('fishing'), text: ['Tucked into the frame of the stormy sea: a child\'s drawing of a kitten in a net. "Mây, day one."', 'Giắt trong khung tranh biển động: bức vẽ trẻ con một chú mèo trong lưới. “Mây, ngày đầu tiên.”'] }],
  'home_anh_tuan:look160': [{ when: f('minh_exhibit'), text: ['Minh\'s exhibition poster: "The Island, Then and Now". Your shop is in the middle of it.', 'Áp phích triển lãm của Minh: “Hòn Đảo, Xưa và Nay”. Quán của bạn nằm ngay giữa.'] }],
  'home_vy:look160': [{ when: f('vy_portrait'), text: ['The painting is finished now: your shops from the lookout, every one of them full of people.', 'Bức tranh đã vẽ xong: những quán của bạn nhìn từ tháp canh, quán nào cũng đông người.'] }],
  'home_chi_mai:look150': [{ when: f('letters_home'), text: ['The pile of letters for Mèo Mây is gone. A note: "Delivered — with help."', 'Chồng thư gửi Mèo Mây không còn nữa. Một mẩu giấy: “Đã giao — có người giúp.”'] }],
  'home_co_lan:look160': [{ when: () => (G.state.achievements || []).includes('lantern_festival'), text: ['The flower crown hangs on the wall now, dried and pressed: "from the festival".', 'Vòng hoa giờ treo trên tường, đã khô và ép phẳng: “từ lễ hội”.'] }],
};
export function lookText(tr) {
  const key = `${G.scene?.id}:${tr.id}`, later = (LATER[key] || []).filter(l => l.when()).pop();
  return later ? later.text : tr.text;
}
