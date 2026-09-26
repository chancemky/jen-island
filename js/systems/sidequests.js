// Side quests: neighbours lose things (a kite, a net, a sandal…). Ask them if
// they need help, find the sparkle on the island, bring it back for a reward.

import { G, T, tr, markDirty, addMoney, addMat, addPantry } from './state.js';
import { say } from '../ui/dialogue.js';
import { showReward } from '../ui/sheets.js';
import { toast, setGuide } from '../ui/hud.js';
import { sfx } from '../core/audio.js';
import { dist, TAU, sleep } from '../core/util.js';
import { fx } from '../world/render.js';
import { ell, circ, box, poly, line } from '../gfx/draw.js';
import { ANIMAL_DRAW } from './animals.js';
import * as P from '../gfx/props.js';
import { ICONS } from '../gfx/food.js';
import { INK } from '../gfx/draw.js';
import { addXP } from './progress.js';

export const SIDE_QUESTS = [
  { id: 'net', giver: 'chu_hai', ch: 1, x: 1330, y: 2330, item: ['fishing net', 'tấm lưới'], ask: ['The tide stole my best net. It\'s somewhere on the east beach. Could you look?', 'Thủy triều cuốn mất tấm lưới tốt nhất của chú. Chắc nó ở bãi biển phía đông. Con tìm giúp chú nha?'], thanks: ['My net! Now the fish have no excuses.', 'Tấm lưới của chú! Giờ thì cá hết đường chối.'], reward: { money: 60, mat: ['wood', 4] } },
  { id: 'sandal', giver: 'ba_tu', ch: 1, x: 610, y: 1790, item: ['sandal', 'chiếc dép'], ask: ['A dog ran off with my good sandal! Somewhere south of West Village…', 'Có con chó tha mất chiếc dép đẹp của bà! Ở đâu đó phía nam Xóm Tây…'], thanks: ['Ah, my sandal! Only a little chewed. Take this, dear.', 'A, chiếc dép của bà! Chỉ bị gặm chút xíu. Cầm lấy nè con.'], reward: { money: 50, ing: ['kumquat', 8] } },
  { id: 'kite', giver: 'be_na', ch: 3, x: 1600, y: 1250, item: ['kite', 'con diều'], ask: ['My kite flew away towards the rice paddies! It\'s the one shaped like a fish.', 'Con diều của em bay về phía ruộng lúa rồi! Con diều hình con cá đó.'], thanks: ['MY KITE! You\'re the best! I\'ll name it after you.', 'CON DIỀU CỦA EM! {You} giỏi nhất! Em sẽ đặt tên nó theo tên {you}.'], reward: { money: 40 } },
  { id: 'lens', giver: 'minh', ch: 3, x: 760, y: 560, item: ['camera lens', 'ống kính'], ask: ['I dropped a lens near the lotus spring while chasing a heron. Help?', 'Mình làm rơi ống kính gần hồ sen lúc đuổi theo con cò. Giúp mình với?'], thanks: ['You found it! This lens has seen things. Mostly herons.', 'Bạn tìm được rồi! Ống kính này từng thấy nhiều thứ lắm. Chủ yếu là cò.'], reward: { money: 90 } },
  { id: 'letter', giver: 'chi_mai', ch: 5, x: 1420, y: 1180, item: ['lost letter', 'lá thư thất lạc'], ask: ['A letter blew out of my bag near the paddies. It\'s addressed to Mèo Mây — very important cat business.', 'Một lá thư bay khỏi túi chị gần ruộng lúa. Gửi cho Mèo Mây — chuyện mèo rất quan trọng.'], thanks: ['Thank you! It\'s from a fish seller. Mèo Mây has been waiting.', 'Cảm ơn em! Thư của cô bán cá. Mèo Mây chờ mãi.'], reward: { money: 70, mat: ['paint', 2] } },
  { id: 'hat', giver: 'co_lan', ch: 3, x: 1020, y: 700, item: ['flower hat', 'nón hoa'], ask: ['The wind took my flower hat up the restaurant hill!', 'Gió thổi bay cái nón hoa của cô lên đồi nhà hàng rồi!'], thanks: ['My hat! The flowers are only a little squished. Here — for you.', 'Nón của cô! Hoa chỉ bẹp chút xíu. Nè — cho con.'], reward: { money: 60, ing: ['herbs', 8] } },
  { id: 'toolbox', giver: 'anh_tuan', ch: 5, x: 1560, y: 1640, item: ['toolbox', 'hộp đồ nghề'], ask: ['I left my scooter toolbox somewhere in East Village. My brain was on lunch.', 'Anh để quên hộp đồ nghề sửa xe đâu đó ở Xóm Đông. Lúc đó đầu óc anh đi ăn trưa rồi.'], thanks: ['There it is! Now I can fix the squeaky brake. Beep beep!', 'Nó đây rồi! Giờ anh sửa được cái thắng kêu kẽo kẹt. Bíp bíp!'], reward: { money: 50, mat: ['metal', 3] } },
  { id: 'notebook', giver: 'linh', ch: 3, x: 300, y: 1880, item: ['study notebook', 'cuốn vở'], ask: ['My exam notes! I studied on the west beach and forgot them. Please!', 'Vở ôn thi của mình! Mình học ở bãi biển phía tây rồi bỏ quên. Làm ơn!'], thanks: ['You saved my grades! And maybe my life.', 'Bạn cứu điểm của mình! Và chắc cứu cả cuộc đời mình.'], reward: { money: 55 } },
  { id: 'shell', giver: 'vy', ch: 14, x: 2420, y: 1800, item: ['pink conch shell', 'vỏ ốc hồng'], ask: ['I need a pink conch to mix a new colour. There\'s one on the islet\'s south beach!', 'Mình cần một vỏ ốc hồng để pha màu mới. Có một cái ở bãi nam của cù lao!'], thanks: ['So pink! I\'ll call the colour “Your Name Pink”.', 'Hồng quá! Mình sẽ đặt tên màu là “Hồng Tên Bạn”.'], reward: { money: 120, mat: ['paint', 4] } },
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
    Q()[q.id] = 'done'; refreshGuide();
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

// ---------------------------------------------------------------- finding things
// Every lost item sits in a little scene: a dog chewing the sandal, a crab
// guarding the net, a kite stuck in a tree, a letter tumbling in the wind…
// Walking up plays a short animation of you getting it back.
const SCENE = { sandal: 'dog', net: 'crab', kite: 'tree', lens: 'frog', letter: 'wind', hat: 'bird', toolbox: 'heavy', notebook: 'pages', shell: 'shell' };
const RT = {};                               // per-quest runtime: animation state
const rtq = q => (RT[q.id] ||= { t: 0, busy: false, dx: 0, dy: 0, hop: 0, pages: [false, false, false], flee: 0, gone: 0, tug: 0 });
const PAGES = [[-22, 6], [18, -8], [4, 22]];
let busy = false;

export function updateSideQuests(dt = 0.016) {
  const pl = G.player; if (!pl) return;
  guideTick(dt);
  if (G.scene !== G.scenes?.island || busy) return;
  for (const q of SIDE_QUESTS) {
    if (Q()[q.id] !== 'active') continue;
    const r = rtq(q); r.t += dt;
    const ix = q.x + r.dx, iy = q.y + r.dy, d = dist(pl.x, pl.y, ix, iy);
    const kind = SCENE[q.id];
    if (kind === 'wind') {                    // the letter keeps blowing away until the third try
      r.dx += Math.sin(r.t * 0.9) * 4 * dt; r.dy += Math.cos(r.t * 0.7) * 3 * dt;
      if (d < 34 && r.flee < 2) { r.flee++; const an = Math.atan2(iy - pl.y, ix - pl.x); r.goal = [r.dx + Math.cos(an) * 60, r.dy + Math.sin(an) * 34]; sfx('whoosh'); toast({ text: T('Whoosh! The wind grabbed it again…', 'Vù! Gió lại cuốn nó đi…'), icon: 'star', ms: 1400 }); }
      if (r.goal) { r.dx += (r.goal[0] - r.dx) * Math.min(1, dt * 3); r.dy += (r.goal[1] - r.dy) * Math.min(1, dt * 3); if (Math.hypot(r.goal[0] - r.dx, r.goal[1] - r.dy) < 2) r.goal = null; }
      if (d < 24 && r.flee >= 2 && !r.goal) play(q);
      continue;
    }
    if (kind === 'pages') {
      PAGES.forEach(([ox, oy], i) => { if (!r.pages[i] && dist(pl.x, pl.y, q.x + ox, q.y + oy) < 18) { r.pages[i] = true; sfx('pop'); pl.doHop(60); fx.burst('spark', q.x + ox, q.y + oy - 6, 5, { up: 20, col: '#fff6b0' }); } });
      if (r.pages.every(Boolean)) play(q);
      continue;
    }
    if (d < 30) play(q);
  }
}

async function play(q) {
  const pl = G.player, r = rtq(q), kind = SCENE[q.id];
  busy = true; pl.control = false; pl.stop?.();
  const faceIt = () => pl.face(Math.abs(q.x - pl.x) > Math.abs(q.y - pl.y) ? (q.x > pl.x ? 'right' : 'left') : (q.y > pl.y ? 'down' : 'up'));
  try {
    faceIt();
    if (kind === 'dog') {
      sfx('woof'); r.state = 'tug';
      pl.setAct('carry', 'sandal');
      for (let i = 0; i < 8; i++) { r.tug = i % 2 ? 3 : -3; pl.x += i % 2 ? 1.5 : -1.5; if (i % 3 === 0) sfx('woof'); await sleep(170); }
      r.tug = 0; r.state = 'happy'; pl.setAct(null); sfx('pop'); pl.doHop(80);
      toast({ text: T('Good dog! It let go of the sandal.', 'Chó ngoan! Nó chịu nhả chiếc dép rồi.'), icon: 'heart', ms: 1800 });
    } else if (kind === 'crab') {
      sfx('click'); r.state = 'flee';
      for (let i = 0; i < 20; i++) { r.crabX = (r.crabX || 0) + 3; await sleep(30); }
      pl.setAct('work'); await sleep(700); pl.setAct(null);
    } else if (kind === 'tree') {
      r.state = 'shake'; pl.setAct('hammer');
      for (let i = 0; i < 6; i++) { r.shake = (i % 2 ? 1 : -1) * 0.06; sfx('whoosh'); await sleep(140); }
      r.shake = 0; pl.setAct(null); r.state = 'fall';
      for (let i = 0; i <= 20; i++) { r.fall = i / 20; await sleep(35); }
      pl.setAct('cheer'); sfx('pop'); await sleep(600); pl.setAct(null);
    } else if (kind === 'frog') {
      r.state = 'hop'; sfx('hop');
      for (let i = 0; i <= 16; i++) { r.frog = i / 16; await sleep(30); }
      fx.burst('splash', q.x + 30, q.y - 6, 8, { up: 40, col: '#dff6ff' }); sfx('splash');
      pl.setAct('work'); await sleep(600); pl.setAct(null);
    } else if (kind === 'wind') {
      pl.doHop(110); sfx('hop'); await sleep(300); pl.setAct('cheer'); await sleep(500); pl.setAct(null);
    } else if (kind === 'bird') {
      r.state = 'fly'; sfx('coo');
      for (let i = 0; i <= 24; i++) { r.fly = i / 24; await sleep(30); }
      pl.setAct('work'); await sleep(500); pl.setAct(null);
    } else if (kind === 'heavy') {
      pl.setAct('carry', 'toolbox'); pl.showEmote('sweat', 1.2); pl.squash = 0.8; sfx('hammer'); await sleep(900); pl.setAct(null);
    } else if (kind === 'shell') {
      pl.setAct('work'); fx.burst('splash', q.x, q.y - 4, 10, { up: 50, col: '#dff6ff' }); sfx('splash'); await sleep(800); pl.setAct(null);
    } else { pl.setAct('work'); await sleep(600); pl.setAct(null); }
    // got it
    Q()[q.id] = 'found'; markDirty(true); sfx('success');
    pl.setAct('hold', ITEM_ICON[q.id]); fx.burst('spark', pl.x, pl.y - 40, 12, { up: 40, col: '#ffd35a' });
    await sleep(900); pl.setAct(null);
    const who = ownerName(q);
    toast({ text: T(`Found the ${q.item[0]}!`, `Tìm thấy ${q.item[1]}!`), sub: T(`Bring it back to ${who} — follow the arrow (look for the ❗ over their head).`, `Mang trả cho ${who} — đi theo mũi tên (tìm dấu ❗ trên đầu).`), icon: 'star', ms: 4200 });
    refreshGuide();
  } finally { pl.control = true; busy = false; }
}

// ---------------------------------------------------------------- returning it: an arrow to the owner
const ITEM_ICON = { sandal: 'sandal', net: 'net', kite: 'kite', lens: 'lens', letter: 'letter', hat: 'flowerhat', toolbox: 'toolbox', notebook: 'notebook', shell: 'conch' };
const residentOf = q => (G.npcs?.residents || []).find(a => a.data?.rid === q.giver);
const ownerName = q => residentOf(q)?.name || q.giver;
export function ownerTarget(q) {
  const a = residentOf(q); if (!a) return null;
  const isl = G.scenes?.island;
  if (isl?.actors.includes(a) && a.visible !== false) return { scene: 'island', x: a.x, y: a.y, lift: 60 };
  // inside a house (or asleep): point at their front door, or at them if you're in there too
  const homeId = 'home_' + q.giver, hs = G.scenes?.[homeId];
  if (G.scene === hs && hs.actors.includes(a)) return { scene: homeId, x: a.x, y: a.y, lift: 60 };
  const b = isl && Object.values(isl.buildings).find(b => b.home === q.giver || (q.giver === 'be_na' && b.home === 'ba_tu') || (q.giver === 'minh' && b.home === 'anh_tuan'));
  return b ? { scene: 'island', x: b.x, y: b.y } : null;
}
let guideT = 0;
function guideTick(dt) { guideT -= dt; if (guideT <= 0) { guideT = 1; refreshGuide(); } }
export function refreshGuide() {
  const q = SIDE_QUESTS.find(q => Q()[q.id] === 'found');
  if (!q) { setGuide(null); return; }
  const a = residentOf(q), asleep = a?.data?.state === 'home';
  setGuide({ text: asleep ? T(`Return the ${q.item[0]} to ${ownerName(q)} (asleep now — they're up in the morning)`, `Trả ${q.item[1]} cho ${ownerName(q)} (đang ngủ — sáng mai dậy)`) : T(`Return the ${q.item[0]} to ${ownerName(q)}`, `Trả ${q.item[1]} cho ${ownerName(q)}`), target: () => ownerTarget(q) });
}
export const foundQuestFor = rid => SIDE_QUESTS.find(q => q.giver === rid && Q()[q.id] === 'found');

// ---------------------------------------------------------------- drawing
export function drawSideQuests(c, t) {
  if (G.scene !== G.scenes?.island) return;
  for (const q of SIDE_QUESTS) {
    const st = Q()[q.id];
    if (st === 'found') { drawOwnerMark(c, t, q); continue; }
    if (st !== 'active') continue;
    const r = rtq(q), kind = SCENE[q.id], x = q.x + r.dx, y = q.y + r.dy;
    // a soft glow so it's findable from a distance
    const k = (Math.sin(t * 4) + 1) / 2;
    c.save(); c.fillStyle = `rgba(255,230,120,${0.18 + k * 0.18})`; c.beginPath(); c.ellipse(x, y, 20, 7, 0, 0, TAU); c.fill(); c.restore();
    c.save(); c.translate(x, y);
    if (kind === 'dog') {
      const dogA = { vx: 0, vy: 0, state: r.state === 'tug' ? 'greet' : 'idle', idle: r.state === 'happy' ? 'wag' : 'chew', t, col: '#c9955e', face: -1 };
      c.save(); c.translate(14 + (r.tug || 0), 0); ANIMAL_DRAW.dog(c, t, dogA); c.restore();
      if (r.state !== 'happy') { c.save(); c.translate(1 + (r.tug || 0), -10 + Math.sin(t * 9) * 0.6); c.rotate(-0.3 + Math.sin(t * 7) * 0.12); drawItem(c, 'sandal'); c.restore(); }
    } else if (kind === 'crab') {
      drawItem(c, 'net');
      const cx = (r.crabX || 0), crab = { vx: r.state === 'flee' ? 10 : 0, vy: 0, state: r.state === 'flee' ? 'walk' : 'idle', t, col: '#f08a6a', face: 1 };
      c.save(); c.translate(cx, -6); ANIMAL_DRAW.crab(c, t, crab); c.restore();
    } else if (kind === 'tree') {
      c.save(); c.rotate(r.shake || 0); P.tree(c, t, { x, y, s: 0.9, trunk: 7 }); c.restore();
      const f = r.fall || 0; c.save(); c.translate(-6 + f * 18, -86 + f * 76 + Math.sin(f * Math.PI) * -10); c.rotate(0.4 + f * 2 + Math.sin(t * 3) * 0.1); drawItem(c, 'kite'); c.restore();
    } else if (kind === 'frog') {
      drawItem(c, 'lens');
      const f = r.frog || 0; c.save(); c.translate(f * 30, -6 - Math.sin(f * Math.PI) * 16); if (f < 1) frog(c, t); c.restore();
    } else if (kind === 'wind') {
      c.save(); c.translate(0, -8 - Math.abs(Math.sin(t * 2.2)) * 6); c.rotate(Math.sin(t * 3) * 0.4); drawItem(c, 'letter'); c.restore();
      c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 1; for (let i = 0; i < 3; i++) { const k2 = (t * 0.8 + i / 3) % 1; c.beginPath(); c.moveTo(-26 + k2 * 40, -14 + i * 6); c.quadraticCurveTo(-18 + k2 * 40, -18 + i * 6, -10 + k2 * 40, -14 + i * 6); c.stroke(); }
    } else if (kind === 'bird') {
      drawItem(c, 'flowerhat');
      const f = r.fly || 0; if (f < 1) { c.save(); c.translate(f * 40, -8 - f * 70); ANIMAL_DRAW.pigeon(c, t, { vx: f ? 10 : 0, vy: 0, state: f ? 'fly' : 'idle', t, col: '#b9c3cb', face: 1 }); c.restore(); }
    } else if (kind === 'pages') {
      PAGES.forEach(([ox, oy], i) => { if (r.pages[i]) return; c.save(); c.translate(ox, oy - 3 - Math.abs(Math.sin(t * 3 + i)) * 3); c.rotate(Math.sin(t * 2 + i) * 0.5); drawItem(c, 'page'); c.restore(); });
    } else if (kind === 'shell') {
      c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 1; c.beginPath(); c.ellipse(0, 0, 12 + Math.sin(t * 2) * 2, 4, 0, 0, TAU); c.stroke();
      drawItem(c, 'conch');
    } else drawItem(c, ITEM_ICON[q.id]);
    // little sparkle stars
    for (let i = 0; i < 3; i++) { const a = t * 2 + i * TAU / 3, rr = 12 + k * 3; c.fillStyle = '#fff6b0'; c.beginPath(); c.arc(Math.cos(a) * rr, -12 + Math.sin(a) * rr * 0.5, 1.4, 0, TAU); c.fill(); }
    c.restore();
  }
}
// the owner gets a bobbing "!" bubble showing what you're bringing back
function drawOwnerMark(c, t, q) {
  const a = residentOf(q); if (!a || !G.scenes.island.actors.includes(a) || a.visible === false) return;
  const y = a.y - 62 - Math.abs(Math.sin(t * 3)) * 4;
  c.save(); c.translate(a.x, y);
  c.fillStyle = '#fff8ea'; c.strokeStyle = INK; c.lineWidth = 1.2; c.beginPath(); c.ellipse(0, 0, 13, 11, 0, 0, TAU); c.fill(); c.stroke();
  c.beginPath(); c.moveTo(-3, 9); c.lineTo(0, 15); c.lineTo(3, 9); c.fill(); c.stroke();
  c.save(); c.scale(0.7, 0.7); drawItem(c, ITEM_ICON[q.id]); c.restore();
  c.fillStyle = '#e8584e'; c.font = '900 12px Nunito, sans-serif'; c.textAlign = 'center'; c.fillText('!', 12, -8);
  c.restore();
}
function frog(c, t) {
  const b = Math.sin(t * 4) * 0.6;
  ell(c, 0, -3 - b, 6, 4.4, '#7fc062', INK, 0.8); ell(c, -3, -7 - b, 2, 2, '#7fc062', INK, 0.7); ell(c, 3, -7 - b, 2, 2, '#7fc062', INK, 0.7);
  circ(c, -3, -7.4 - b, 0.9, INK, null); circ(c, 3, -7.4 - b, 0.9, INK, null); ell(c, 0, -2 - b, 2.6, 0.9 + Math.abs(Math.sin(t * 6)) * 0.8, '#f4f0b0', null);
}
// small world-size drawings of each lost thing (about 14px across)
export function drawItem(c, k) {
  switch (k) {
    case 'sandal': ell(c, 0, 0, 7, 3, '#f28f7c', INK, 0.8); c.strokeStyle = '#fff5df'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-1, -2.4); c.lineTo(2, 0.4); c.lineTo(-1, 2.4); c.stroke(); break;
    case 'net': for (let i = -3; i <= 3; i++) { line(c, i * 3, -6, i * 3 + 2, 4, '#8a6a4a', 0.8); line(c, -10, -4 + (i + 3) * 1.5, 10, -3 + (i + 3) * 1.5, '#8a6a4a', 0.6); } circ(c, -9, -5, 1.6, '#f2c14e', INK, 0.5); circ(c, 9, 3, 1.6, '#f2c14e', INK, 0.5); break;
    case 'kite': poly(c, [0, -9, 6, 0, 0, 7, -6, 0], '#6fbfb0', INK, 0.8); line(c, 0, -9, 0, 7, INK, 0.5); line(c, -6, 0, 6, 0, INK, 0.5); circ(c, 2.4, -2, 0.8, INK, null); c.strokeStyle = '#f28f7c'; c.lineWidth = 1; c.beginPath(); c.moveTo(0, 7); c.quadraticCurveTo(4, 11, 0, 15); c.stroke(); break;
    case 'lens': circ(c, 0, -2, 5, '#3d3d44', INK, 0.8); circ(c, 0, -2, 3.4, '#9fc9e6', null); circ(c, -1.2, -3.2, 1, 'rgba(255,255,255,.8)', null); break;
    case 'letter': box(c, -6, -4, 12, 8, 1, '#fffaf0', INK, 0.8); line(c, -6, -4, 0, 0.5, INK, 0.6); line(c, 6, -4, 0, 0.5, INK, 0.6); circ(c, 3.4, 2, 1.3, '#e8584e', null); break;
    case 'flowerhat': ell(c, 0, 0, 9, 3.2, '#f3dcae', INK, 0.8); ell(c, 0, -2, 5, 3.6, '#f3dcae', INK, 0.8); for (const [x, col] of [[-3, '#ff8fb0'], [0, '#fff'], [3, '#ffd35a']]) circ(c, x, -3, 1.4, col, INK, 0.4); break;
    case 'toolbox': box(c, -8, -6, 16, 9, 2, '#e8584e', INK, 0.9); box(c, -3, -9, 6, 3, 1, null, INK, 0.9); line(c, -8, -2.5, 8, -2.5, '#b84a40', 0.8); break;
    case 'notebook': box(c, -6, -7, 12, 10, 1, '#8fb7e0', INK, 0.8); box(c, -4, -5, 8, 3, 0.5, '#fffaf0', null); break;
    case 'page': box(c, -4, -5, 8, 9, 0.6, '#fffaf0', INK, 0.6); for (let i = 0; i < 3; i++) line(c, -2.6, -2.6 + i * 2.2, 2.6, -2.6 + i * 2.2, '#9fb4dc', 0.5); break;
    case 'conch': c.beginPath(); c.moveTo(-6, 2); c.quadraticCurveTo(-4, -8, 4, -6); c.quadraticCurveTo(8, -2, 6, 2); c.closePath(); c.fillStyle = '#f8b4c4'; c.fill(); c.strokeStyle = INK; c.lineWidth = 0.8; c.stroke(); for (let i = 0; i < 3; i++) line(c, -3 + i * 3, -4, -2 + i * 3, 1, '#e88aa0', 0.6); break;
    default: circ(c, 0, -2, 3.4, '#ffd35a', INK, 0.8);
  }
}

// the lost items also work as icons (held in the hand, on toasts, in bubbles)
for (const k of ['sandal', 'net', 'kite', 'lens', 'letter', 'flowerhat', 'toolbox', 'notebook', 'conch']) ICONS[k] ||= c => { c.save(); c.scale(2, 2); drawItem(c, k); c.restore(); };
