// Minh and Linh's wedding. Once you're good friends with both (and the island is busy — Chapter
// 17 on), they ask you to the wedding: the next evening, 17:00–20:00, on Wind Plaza. The two
// of them in áo dài under a red double-happiness arch, the neighbours gathered round. Go along,
// give a red envelope (mừng cưới) if you like, and keep a lantern to remember it by.
import { G, T, markDirty, addMoney, canAfford } from './state.js';
import { bus, dist } from '../core/util.js';
import { PLAZA } from '../world/island.js';
import { npcs } from './npc.js';
import { friendLevel, befriend } from './friends.js';
import { RESIDENTS } from '../data/looks.js';
import { addXP } from './progress.js';
import { cs, wait, say, ask } from './cutscene.js';
import { fx } from '../world/render.js';
import { celebratePhoto } from './album.js';

const SPOT = { x: PLAZA.x - 74, y: PLAZA.y + 70 };
const W = () => (G.state.story.flags.wedding ||= {});
const hour = () => G.state.time / 60;
export const weddingOn = () => W().day === G.state.day && hour() >= 17 && hour() < 20 && !W().done;
let gathered = null;
const outfit = { minh: { top: '#3f6f9f', topStyle: 'aodai', bottom: '#fff6ea', bottomLen: 5, hat: 'khandong', hatColor: '#3f6f9f' }, linh: { top: '#d9433a', topStyle: 'aodai', bottom: '#fff1d6', bottomLen: 5, hat: 'khanvan', hatColor: '#f2c14e', flower: '#f2c14e' } };
function gather() {
  if (gathered) return;
  const couple = ['minh', 'linh'].map(rid => npcs.residents.find(a => a.data.rid === rid)).filter(Boolean);
  const guests = npcs.residents.filter(a => !couple.includes(a) && a.visible && !a.data.inTalk && a.data.state !== 'busy').slice(0, 5);
  gathered = { couple, guests, looks: couple.map(a => a.look) };
  couple.forEach((a, i) => { a.look = { ...a.look, ...outfit[a.data.rid] }; a.stop?.(); a.data.state = 'busy'; a.walkTo?.([[SPOT.x - 10 + i * 20, SPOT.y - 6]]).then(() => a.face?.('down')); });
  guests.forEach((a, i) => { const ang = Math.PI * (0.2 + i * 0.15), x = SPOT.x + Math.cos(ang) * 46 - 0, y = SPOT.y + 26 + Math.sin(ang) * 12; a.stop?.(); a.data.state = 'busy'; a.walkTo?.([[x, y]]).then(() => { a.face?.('up'); a.showEmote?.('heart', 2); }); });
}
function disperse() {
  if (!gathered) return;
  gathered.couple.forEach((a, i) => { a.look = gathered.looks[i]; });
  for (const a of [...gathered.couple, ...gathered.guests]) { a.data.state = 'idle'; a.data.until = 0; }
  gathered = null;
}
async function attend() {
  const w = W(); if (w.done) return; w.done = true; markDirty(true);
  const [groom, bride] = gathered?.couple || [];
  await cs.run('wedding', async () => {
    G.runtime.inCutscene = true;
    try {
      if (groom) await say(groom, T('You came! Linh, look who\'s here!', 'Bạn tới rồi! Linh ơi, coi ai tới nè!'), { emo: 'happy' });
      if (bride) await say(bride, T('Thank you for everything. Half our first dates were at your shop, you know.', 'Cảm ơn bạn vì tất cả. Nửa số buổi hẹn đầu tiên của tụi mình là ở quán bạn đó.'), { emo: 'love' });
      const pick = await ask(null, T('A red envelope for the couple (mừng cưới)?', 'Mừng cưới cô dâu chú rể một phong bì đỏ?'), [T('100k', '100k'), T('300k', '300k'), T('Just my best wishes', 'Chỉ gửi lời chúc')]);
      const gift = [100, 300, 0][pick] || 0;
      if (gift && canAfford(gift)) { addMoney(-gift, 'gift'); befriend('minh', gift / 50); befriend('linh', gift / 50); }
      for (const a of [...(gathered?.guests || []), groom, bride].filter(Boolean)) { a.setAct('cheer'); a.doHop?.(); }
      G.player.setAct('clap'); bus.emit('stinger', 'award');
      fx.burst('confetti', SPOT.x, SPOT.y - 40, 50, { up: 110, speed: 80, col: ['#d9433a', '#f2c14e', '#fff', '#f08ca0'], g: 60, life: 2 });
      await wait(1.4);
      if (groom) await say(groom, T('Trăm năm hạnh phúc — a hundred happy years! Take a lantern home, from us.', 'Trăm năm hạnh phúc! Cầm một chiếc đèn lồng về nhà nha, quà của tụi mình.'), { emo: 'happy' });
      for (const a of [...(gathered?.guests || []), groom, bride].filter(Boolean)) a.setAct(null); G.player.setAct(null);
    } finally { G.runtime.inCutscene = false; }
  });
  (G.state.home.owned ||= []).push('song_hy_lantern'); befriend('minh', 3); befriend('linh', 3); addXP(120, 'wedding');
  G.state.stats.weddings = (G.state.stats.weddings || 0) + 1; markDirty(true);
  celebratePhoto(['Minh & Linh\'s wedding', 'Đám cưới Minh & Linh']);
}
export function weddingAction(pl) {
  if (!weddingOn() || !gathered || G.scene !== G.scenes.island || dist(pl.x, pl.y, SPOT.x, SPOT.y + 20) > 70) return null;
  return { label: T('Join the wedding', 'Dự đám cưới'), icon: 'heart', run: attend };
}
// the arch, the lanterns and the banner
export function weddingDrawables(add, P) {
  if (!weddingOn()) return;
  const { x, y } = SPOT;
  add(x, y - 8, y - 9, (c, t) => {
    for (const s of [-1, 1]) { P.box(c, x + s * 30 - 2, y - 52, 4, 46, 1, '#c93c32', P.INK, 0.8); P.circ(c, x + s * 30, y - 54, 3, '#f2c14e', P.INK, 0.6); }
    c.beginPath(); c.moveTo(x - 32, y - 50); c.quadraticCurveTo(x, y - 76, x + 32, y - 50); c.lineWidth = 6; c.strokeStyle = P.INK; c.stroke(); c.lineWidth = 4; c.strokeStyle = '#d9433a'; c.stroke();
    for (let i = 0; i < 7; i++) { const k = i / 6, ax = x - 30 + k * 60, ay = y - 50 - Math.sin(k * Math.PI) * 13; P.circ(c, ax, ay, 2.2, ['#f2c14e', '#fff', '#f08ca0'][i % 3], null); }
    c.save(); c.fillStyle = '#f2c14e'; c.font = '900 13px serif'; c.textAlign = 'center'; c.fillText('囍', x, y - 54); c.restore();
    for (const s of [-1, 1]) { const sw = Math.sin(t * 1.5 + s) * 1; P.line(c, x + s * 30, y - 40, x + s * 30 + sw, y - 34, P.INK, 0.5); P.ell(c, x + s * 30 + sw, y - 29, 4, 5, '#d9433a', P.INK, 0.6); }
  });
}
export function initWedding() {
  bus.on('hour', h => {
    const s = G.state, w = W(); if (!s.story.flags.freeRoam) return;
    // the invitation: good friends with both, Chapter 17 on — the wedding is the next evening
    if (!w.day && (s.story.chapter || 1) >= 17 && friendLevel('minh') >= 3 && friendLevel('linh') >= 3 && RESIDENTS.minh && RESIDENTS.linh) {
      w.day = s.day + 1; markDirty(true);
      bus.emit('toast', { text: T('A wedding invitation!', 'Thiệp mời đám cưới!'), sub: T('Minh & Linh are getting married tomorrow evening (17:00–20:00) on Wind Plaza.', 'Minh & Linh làm đám cưới tối mai (17:00–20:00) ở Quảng trường gió.'), icon: 'heart', cls: 'ach', ms: 6000 });
    }
    if (w.day && !w.done && s.day > w.day) {             // missed it: they married anyway, and send you a lantern
      w.done = true; (s.home.owned ||= []).push('song_hy_lantern'); markDirty(true);
      bus.emit('toast', { text: T('Minh & Linh got married!', 'Minh & Linh đã cưới nhau!'), sub: T('They missed you — a lantern from the wedding is waiting at home.', 'Hai bạn nhớ bạn lắm — chiếc đèn lồng đám cưới đang chờ ở nhà.'), icon: 'heart', ms: 5000 });
    }
    if (weddingOn()) gather(); else if (gathered) disperse();
  });
}
