// Side quests: neighbours lose things (a kite, a net, a sandal…). Ask them if
// they need help, find the sparkle on the island, bring it back for a reward.

import { lockInput, releaseInput } from '../core/locks.js';
import { applyPlayerPronouns, profileOf } from './pronouns.js';
import { G, T, tr, markDirty, addMoney, addMat, addPantry } from './state.js';
import { MORE_QUESTS } from '../data/quests.js';
import { RESIDENTS, MERCHANTS } from '../data/looks.js';
import { friendLevel, befriend, FRIEND_LEVELS } from './friends.js';
import { cs, camTo } from './cutscene.js';
import { ask } from '../ui/dialogue.js';
import { say } from '../ui/dialogue.js';
import { showReward } from '../ui/sheets.js';
import { toast, setGuide } from '../ui/hud.js';
import { sfx } from '../core/audio.js';
import { dist, TAU, sleep, clock, bus } from '../core/util.js';
import { fx } from '../world/render.js';
import { ell, circ, box, poly, line } from '../gfx/draw.js';
import { ANIMAL_DRAW } from './animals.js';
import * as P from '../gfx/props.js';
import { ICONS } from '../gfx/food.js';
import { INK } from '../gfx/draw.js';
import {addXP } from './progress.js';
import { COUNTS } from '../core/counts.js';

// rewards grow with the story, so helping a neighbour is still worth it later on
export const questMoney = q => Math.round(q.reward.money * (1 + 0.12 * Math.max(0, (G.state.story.chapter || 1) - 1)) / 5) * 5;
export const SIDE_QUESTS = [
  { id: 'net', giver: 'chu_hai', ch: 1, x: 1330, y: 2330, item: ['fishing net', 'tấm lưới'], ask: ['The tide stole my best net. It\'s somewhere on the east beach. Could you look?', 'Thủy triều cuốn mất tấm lưới tốt nhất của chú. Chắc nó ở bãi biển phía đông. Con tìm giúp chú nha?'], thanks: ['My net! Now the fish have no excuses.', 'Tấm lưới của chú! Giờ thì cá hết đường chối.'], reward: { money: 60, mat: ['wood', 4] } },
  { id: 'sandal', giver: 'ba_tu', ch: 1, x: 610, y: 1790, item: ['sandal', 'chiếc dép'], ask: ['A dog ran off with my good sandal! Somewhere south of West Village…', 'Có con chó tha mất chiếc dép đẹp của bà! Ở đâu đó phía nam Xóm Tây…'], thanks: ['Ah, my sandal! Only a little chewed. Take this, dear.', 'A, chiếc dép của bà! Chỉ bị gặm chút xíu. Cầm lấy nè con.'], reward: { money: 50, ing: ['kumquat', 8] } },
  { id: 'kite', giver: 'be_na', ch: 3, x: 1600, y: 1250, item: ['kite', 'con diều'], ask: ['My kite flew away towards the rice paddies! It\'s the one shaped like a fish.', 'Con diều của em bay về phía ruộng lúa rồi! Con diều hình con cá đó.'], thanks: ['MY KITE! You\'re the best! I\'ll name it after you.', 'CON DIỀU CỦA EM! {You} giỏi nhất! Em sẽ đặt tên nó theo tên {you}.'], reward: { money: 40 } },
  { id: 'lens', giver: 'minh', ch: 3, x: 760, y: 560, item: ['camera lens', 'ống kính'], ask: ['I dropped a lens near the lotus spring while chasing a heron. Help?', 'Mình làm rơi ống kính gần hồ sen lúc đuổi theo con cò. Giúp mình với?'], thanks: ['You found it! This lens has seen things. Mostly herons.', 'Bạn tìm được rồi! Ống kính này từng thấy nhiều thứ lắm. Chủ yếu là cò.'], reward: { money: 90 } },
  { id: 'letter', giver: 'chi_mai', ch: 5, deliver: 'meo', x: 1420, y: 1180, item: ['lost letter', 'lá thư thất lạc'], ask: ['A letter blew out of my bag near the paddies. It\'s addressed to Mèo Mây — very important cat business.', 'Một lá thư bay khỏi túi anh gần ruộng lúa. Gửi cho Mèo Mây — chuyện mèo rất quan trọng.'], thanks: ['A letter for me? …It\'s from the Lâm family — the bánh mì shed! They say thank you for keeping their key. And that they miss the sea.', 'Thư cho mình hả? …Của nhà họ Lâm — quán bánh mì đó! Họ cảm ơn mình đã giữ chìa khóa. Và họ nhớ biển lắm.'], memory: ['A letter for Mèo Mây from the Lâm family, who once ran the bánh mì shed.', 'Lá thư gửi Mèo Mây từ nhà họ Lâm, những người từng bán ở quán bánh mì.'], reward: { money: 70, mat: ['paint', 2] } },
  { id: 'hat', giver: 'co_lan', ch: 3, x: 1020, y: 700, item: ['flower hat', 'nón hoa'], ask: ['The wind took my flower hat up the restaurant hill!', 'Gió thổi bay cái nón hoa của cô lên đồi nhà hàng rồi!'], thanks: ['My hat! The flowers are only a little squished. Here — for you.', 'Nón của cô! Hoa chỉ bẹp chút xíu. Nè — cho con.'], reward: { money: 60, ing: ['herbs', 8] } },
  { id: 'toolbox', giver: 'anh_tuan', ch: 5, x: 1560, y: 1640, item: ['toolbox', 'hộp đồ nghề'], ask: ['I left my scooter toolbox somewhere in East Village. My brain was on lunch.', 'Anh để quên hộp đồ nghề sửa xe đâu đó ở Xóm Đông. Lúc đó đầu óc anh đi ăn trưa rồi.'], thanks: ['There it is! Now I can fix the squeaky brake. Beep beep!', 'Nó đây rồi! Giờ anh sửa được cái thắng kêu kẽo kẹt. Bíp bíp!'], reward: { money: 50, mat: ['metal', 3] } },
  { id: 'notebook', giver: 'linh', ch: 3, x: 300, y: 1880, item: ['study notebook', 'cuốn vở'], ask: ['My exam notes! I studied on the west beach and forgot them. Please!', 'Vở ôn thi của mình! Mình học ở bãi biển phía tây rồi bỏ quên. Làm ơn!'], thanks: ['You saved my grades! And maybe my life.', 'Bạn cứu điểm của mình! Và chắc cứu cả cuộc đời mình.'], reward: { money: 55 } },
  { id: 'shell', giver: 'vy', ch: 14, x: 2420, y: 1800, item: ['pink conch shell', 'vỏ ốc hồng'], ask: ['I need a pink conch to mix a new colour. There\'s one on the islet\'s south beach!', 'Mình cần một vỏ ốc hồng để pha màu mới. Có một cái ở bãi nam của cù lao!'], thanks: ['So pink! I\'ll call the colour “Your Name Pink”.', 'Hồng quá! Mình sẽ đặt tên màu là “Hồng Tên Bạn”.'], reward: { money: 120, mat: ['paint', 4] } },
];
SIDE_QUESTS.push(...MORE_QUESTS);
COUNTS.quests = SIDE_QUESTS.length;
const Q = () => (G.state.sideQuests ||= {}); // id → 'active' | 'found' | 'done'

// ---------------------------------------------------------------- who has a quest for you
const done = id => Q()[id] === 'done';
const inHours = q => { if (!q.time) return true; const h = G.state.time / 60; return h >= q.time[0] && h < q.time[1]; };
const hours = q => q.time ? `${clock(q.time[0] * 60)}–${clock(Math.min(24 * 60 - 1, q.time[1] * 60))}` : '';
const regionOpen = q => !q.region || (q.region === 'nmRestored' ? G.state.nightMarket?.restored : !!G.state.story.flags[q.region]);
export function eligible(q) {
  const s = G.state;
  return s.story.chapter >= q.ch && regionOpen(q) && (!q.after || done(q.after)) && (!q.friend || friendLevel(q.giver) >= q.friend || q.giver === 'meo')
    && (!q.pet || (s.pets || []).length > 0) && (!q.postgame || s.story.flags.keeper)
    // life after the story unfolds slowly: each Keeper event waits a few days after the last one
    && (!q.gap || s.day >= (s.story.flags.lastPostDay || s.story.flags.keeperDay || 0) + q.gap);
}
// the people a found item goes to, in order (deliver: one person, route: several)
const routeOf = q => q.route || [q.deliver || q.giver];
const leg = q => (G.state.questLeg ||= {})[q.id] || 0;
export const deliverTarget = q => routeOf(q)[Math.min(leg(q), routeOf(q).length - 1)];
// what this person can talk about: a delivery for them first, then their own next quest
export function questFor(rid) {
  const qs = Q();
  return SIDE_QUESTS.find(q => qs[q.id] === 'found' && deliverTarget(q) === rid)
    || SIDE_QUESTS.find(q => q.giver === rid && !qs[q.id] && eligible(q))
    || SIDE_QUESTS.find(q => q.giver === rid && qs[q.id] === 'active');
}
export function activeQuests() { return SIDE_QUESTS.filter(q => Q()[q.id] === 'active' || Q()[q.id] === 'found'); }
const speakerOf = (a, rid) => rid === 'meo' ? 'meo' : a;
const nameOf = rid => rid === 'meo' ? 'Mèo Mây' : (RESIDENTS[rid]?.name || MERCHANTS[rid]?.name || rid);
function acceptToast(q) {
  const type = q.type || 'find';
  if (type === 'deliver') return toast({ text: T(`Side quest: take the ${q.item[0]} to ${nameOf(deliverTarget(q))}`, `Nhiệm vụ phụ: mang ${q.item[1]} cho ${nameOf(deliverTarget(q))}`), sub: q.time ? T(`Between ${hours(q)} — follow the arrow.`, `Trong khoảng ${hours(q)} — đi theo mũi tên.`) : T('Follow the arrow.', 'Đi theo mũi tên.'), icon: 'star' });
  if (type === 'meet') return toast({ text: T(`Side quest: meet at ${q.place[0]}`, `Nhiệm vụ phụ: hẹn ở ${q.place[1]}`), sub: T(`Be there between ${hours(q)} — it's ★ on your map.`, `Có mặt trong khoảng ${hours(q)} — đánh dấu ★ trên bản đồ.`), icon: 'star' });
  if (type === 'puzzle') return toast({ text: T(`Side quest: ${q.item[0]}`, `Nhiệm vụ phụ: ${q.item[1]}`), sub: T(`Watch the stones light up, then step on them in the same order${q.time ? ` (${hours(q)})` : ''}. ★ on your map.`, `Xem các viên đá sáng lên, rồi bước lên đúng thứ tự${q.time ? ` (${hours(q)})` : ''}. ★ trên bản đồ.`), icon: 'star' });
  return toast({ text: T(`Side quest: find the ${q.item[0]}`, `Nhiệm vụ phụ: tìm ${q.item[1]}`), sub: T('Look for the sparkle — it\'s on your map too.', 'Tìm chỗ lấp lánh — có trên bản đồ nữa.'), icon: 'star' });
}

// Called from the chat menus (residents, Bà Sáu, Mèo Mây). Returns true if the quest took the turn.
export async function questTalk(a, rid) {
  const q = questFor(rid); if (!q) return false;
  const st = Q()[q.id], who = speakerOf(a, rid);
  if (st === 'found' && deliverTarget(q) === rid) {
    if (q.time && q.type === 'deliver' && !inHours(q)) { await say(who, tr(q.late || [`Come back between ${hours(q)}.`, `Quay lại trong khoảng ${hours(q)} nha.`]), { emo: 'think' }); return true; }
    const r = routeOf(q);
    if (leg(q) < r.length - 1) {                    // a stop along the way: they pass something on
      await say(who, tr(q.legs?.[leg(q)] || ['Thank you! Now take this on to the next person.', 'Cảm ơn nha! Giờ mang cái này cho người tiếp theo.']), { emo: 'happy' });
      G.state.questLeg[q.id] = leg(q) + 1; markDirty(true); refreshGuide();
      toast({ text: T(`Next: ${nameOf(deliverTarget(q))}`, `Tiếp theo: ${nameOf(deliverTarget(q))}`), sub: T('Follow the arrow.', 'Đi theo mũi tên.'), icon: 'star' });
      return true;
    }
    await finishQuest(q, a, rid);
    return true;
  }
  if (!st) {
    await say(who, tr(q.ask), { emo: q.type === 'meet' || q.type === 'puzzle' ? 'happy' : 'sad' });
    Q()[q.id] = q.type === 'deliver' ? 'found' : 'active'; markDirty(true);
    if (q.type === 'deliver') { G.player.setAct?.('hold', q.icon || 'star'); setTimeout(() => G.player.act === 'hold' && G.player.setAct(null), 1200); }
    acceptToast(q); refreshGuide();
    return true;
  }
  if (st === 'active') {
    const line = q.type === 'meet' ? T(`See you at ${q.place[0]}, ${hours(q)}!`, `Hẹn gặp ở ${q.place[1]}, ${hours(q)} nha!`) : q.type === 'puzzle' ? T('The stones are waiting! Watch the order, then step.', 'Mấy viên đá đang chờ đó! Xem thứ tự rồi bước nha.') : T(`Any luck with my ${q.item[0]}?`, `{You} có thấy ${q.item[1]} của {me} chưa?`);
    await say(who, line, { emo: 'think' }); return true;
  }
  return false;
}
// the thank-you, an optional choice, rewards, keepsake, and the island changing a little
async function finishQuest(q, a, rid) {
  const who = speakerOf(a, rid);
  if (q.choice) {
    const pick = await ask(who, T('…', '…'), q.choice.opts.map(o => tr(o)), { emo: 'happy' });
    await say(who, tr(q.choice.replies[pick] || q.choice.replies[0]), { emo: 'happy' });
  }
  if (q.thanks) await say(who, tr(q.thanks), { emo: 'happy' });
  Q()[q.id] = 'done'; refreshGuide();
  const r = q.reward || {}, cash = questMoney(q), s = G.state;
  addMoney(cash, 'quest'); addXP(60 + q.ch * 5, 'quest');
  if (r.mat) addMat(r.mat[0], r.mat[1]); if (r.ing) addPantry(r.ing[0], r.ing[1]);
  if (r.furniture) (s.home.owned ||= []).push(r.furniture);
  if (r.recipeLv && s.recipes.includes(r.recipeLv[0])) s.recipeLevels[r.recipeLv[0]] = Math.max(s.recipeLevels[r.recipeLv[0]] || 1, r.recipeLv[1]);
  if (r.keepsake) (s.keepsakes ||= {})[q.id] = { day: s.day };
  if (q.world) s.story.flags[q.world] = true;
  if (q.postgame) s.story.flags.lastPostDay = s.day;
  const lv = rid !== 'meo' ? befriend(q.giver, 3) : 0; if (rid !== q.giver && rid !== 'meo') befriend(rid, 2);
  markDirty(true); sfx('fanfare');
  const extra = [r.keepsake ? T(`Keepsake: ${r.keepsake[0]}`, `Kỷ vật: ${r.keepsake[1]}`) : '', r.furniture ? T('A gift for your home', 'Quà cho ngôi nhà') : '', lv ? T(`${nameOf(q.giver)} is now your ${FRIEND_LEVELS[lv].en.toLowerCase()}!`, `${nameOf(q.giver)} giờ là ${FRIEND_LEVELS[lv].vi.toLowerCase()} của bạn!`) : ''].filter(Boolean).join(' · ');
  await showReward({ icon: q.icon || r.mat?.[0] || r.ing?.[0] || 'coin', kicker: T('Side quest complete!', 'Hoàn thành nhiệm vụ phụ!'), title: `+${cash}k · +${60 + q.ch * 5} XP`, text: (extra ? extra + ' · ' : '') + T('Written in your scrapbook.', 'Đã ghi vào sổ kỷ niệm.') });
  bus.emit('quest:done', q.id, q.reward?.keepsake || q.item);
}
export const questOption = rid => {
  const q = questFor(rid); if (!q) return null;
  const st = Q()[q.id], P = x => rid === 'meo' ? x.replace(/\{[^}]+\}/g, 'bạn') : applyPlayerPronouns(x, profileOf(rid));
  if (st === 'found' && deliverTarget(q) === rid) return q.giver === rid ? T(`Here's your ${q.item[0]}!`, P(`${q.item[1][0].toUpperCase() + q.item[1].slice(1)} của {them} nè!`)) : T(`I have something for you (${q.item[0]})`, P(`{I} có cái này cho {them} (${q.item[1]})`));
  if (st === 'active' || st === 'found') return null;
  return T('Need any help?', rid === 'meo' ? 'Bạn cần mình giúp gì không?' : P('{Them} có cần {i} giúp gì không?'));
};

// ---------------------------------------------------------------- meet-ups and the stepping-stone game
const STONES = [[-26, 6], [0, -10], [26, 6]];
function updateSpecial(q, dt) {
  const pl = G.player, r = rtq(q), d = dist(pl.x, pl.y, q.x, q.y);
  if (q.type === 'meet') { if (d < 46 && inHours(q) && !cs.active) meetScene(q); return; }
  // puzzle: the order shows while you're near; then step on the stones
  if (!inHours(q)) return;
  r.order ||= [0, 1, 2].sort(() => Math.random() - 0.5);
  r.show = (r.show || 0) + dt;
  r.step ||= 0;
  if (d > 120) { r.step = 0; return; }
  for (let i = 0; i < 3; i++) {
    const [ox, oy] = STONES[i];
    if (dist(pl.x, pl.y, q.x + ox, q.y + oy) < 11) {
      if (r.on === i) return; r.on = i;
      if (r.order[r.step] === i) { r.step++; sfx('pop'); pl.doHop(60); fx.burst('spark', q.x + ox, q.y + oy - 4, 6, { up: 20, col: '#ffd35a' }); if (r.step >= 3) solvePuzzle(q); }
      else if (r.step > 0 || r.order[0] !== i) { r.step = 0; r.show = 0; sfx('error'); pl.showEmote('sweat', 1); }
      return;
    }
  }
  r.on = -1;
}
function solvePuzzle(q) {
  Q()[q.id] = 'found'; markDirty(true); sfx('success');
  fx.burst('confetti', q.x, q.y - 20, 22, { up: 60, col: ['#ffd35a', '#f08ca0', '#9fd8c8'] });
  toast({ text: T('You did it!', 'Làm được rồi!'), sub: T(`Go tell ${nameOf(q.giver)}.`, `Đi kể cho ${nameOf(q.giver)} nghe nào.`), icon: 'star' });
  refreshGuide();
}
async function meetScene(q) {
  const pl = G.player, rid = q.giver;
  const giver = rid === 'meo' ? G.meo : residentOf(q);
  busy = true;
  try {
    await cs.run('meet:' + q.id, async () => {
      G.runtime.inCutscene = true;
      pl.stop?.();
      if (giver && G.scenes.island.actors.includes(giver)) { giver.stop?.(); giver.sit = false; if (giver.data) giver.data.state = 'busy'; giver.visible = true; giver.x = q.x + 34; giver.y = q.y + 6; giver.face(pl); pl.face(giver); }
      await camTo(q.x + 16, q.y - 20, { zoom: 1.3, rate: 2 });
      let visitors = [];
      for (const [who, en, vi] of q.scene || []) {
        if (who === 'fx') { visitors = await sceneFx(q, en, giver) || visitors; continue; }
        const sp = who === 'meo' ? 'meo' : who === 'visitor' ? (visitors[0] || null) : who === 'player' ? pl : (rid === 'meo' ? 'meo' : giver);
        await say(sp, T(en, vi), { emo: 'happy' });
      }
      for (const v of visitors) { v.fadeOut = true; }
      if (giver?.data && rid !== 'meo') G.npcs?.returnResident?.(giver);
      Q()[q.id] = 'found';
      await finishQuest({ ...q, thanks: q.after_thanks || null }, giver, rid);
    });
  } finally { G.runtime.inCutscene = false; busy = false; }
}
async function sceneFx(q, kind, giver) {
  if (kind === 'photo') { giver?.setAct?.('photo'); await sleep(700); sfx('click'); flash(); await sleep(500); giver?.setAct?.(null); return; }
  if (kind === 'paint') { giver?.setAct?.('work'); for (let i = 0; i < 4; i++) { sfx('pop'); fx.burst('spark', (giver?.x || q.x) + 10, (giver?.y || q.y) - 30, 4, { up: 10, col: ['#f08ca0', '#9fd8c8', '#ffd35a'] }); await sleep(350); } giver?.setAct?.(null); return; }
  if (kind === 'lanterns') { for (let i = 0; i < 6; i++) { fx.burst('spark', q.x + (Math.random() - 0.5) * 160, q.y - 40 - Math.random() * 40, 14, { up: 30, speed: 90, col: ['#ffd35a', '#f08ca0', '#ff9a4a'], life: 1.4 }); sfx('pop'); await sleep(260); } return; }
  if (kind === 'gather') {
    // the neighbours come and stand around you
    const rs = (G.npcs?.residents || []).filter(a => G.scenes.island.actors.includes(a)).slice(0, 8);
    rs.forEach((a, i) => { a.stop?.(); a.sit = false; a.data.state = 'busy'; a.visible = true; const an = Math.PI * (0.15 + 0.7 * i / Math.max(1, rs.length - 1)); a.x = q.x + Math.cos(an) * 70; a.y = q.y + 30 - Math.sin(an) * 34; a.face(G.player); });
    await sleep(500); for (const a of rs) a.setAct('cheer'); sfx('fanfare'); await sleep(1400); for (const a of rs) a.setAct(null);
    setTimeout(() => { for (const a of rs) G.npcs?.returnResident?.(a); }, 6000);
    return;
  }
  if (kind === 'visitor1') {
    const v = G.npcs?.spawnVisitorAt?.(q.x + 40, q.y + 40, 'market');
    if (v) { v.data = { ...(v.data || {}), busy: true }; v.stop?.(); v.x = q.x + 32; v.y = q.y + 8; v.alpha = 1; v.fadeIn = false; v.face(G.player); }
    await sleep(400);
    return v ? [v] : [];
  }
  if (kind === 'visitors') {
    // a family steps off the ferry
    const out = [];
    for (let i = 0; i < 3; i++) {
      const v = G.npcs?.spawnVisitorAt?.(q.x - 10 + i * 16, q.y + 60, 'lam');
      if (v) { v.data = { ...(v.data || {}), busy: true }; v.walkTo?.([[q.x - 20 + i * 18, q.y + 18]]); out.push(v); }
    }
    await sleep(1400); for (const v of out) v.face?.(G.player);
    return out;
  }
}
function flash() { const el = document.createElement('div'); el.style.cssText = 'position:fixed;inset:0;background:#fff;opacity:.9;z-index:60;pointer-events:none;transition:opacity .6s'; document.body.appendChild(el); requestAnimationFrame(() => { el.style.opacity = 0; }); setTimeout(() => el.remove(), 700); }

// ---------------------------------------------------------------- finding things
// Every lost item sits in a little scene: a dog chewing the sandal, a crab
// guarding the net, a kite stuck in a tree, a letter tumbling in the wind…
// Walking up plays a short animation of you getting it back.
const SCENE = { sandal: 'dog', net: 'crab', kite: 'tree', lens: 'frog', letter: 'wind', hat: 'bird', toolbox: 'heavy', notebook: 'pages', shell: 'shell' };
const kindOf = q => q.kind || SCENE[q.id];
const RT = {};                               // per-quest runtime: animation state
export const __rt = q => rtq(q);             // (for the automated tests)
const rtq = q => (RT[q.id] ||= { t: 0, busy: false, dx: 0, dy: 0, hop: 0, pages: [false, false, false], flee: 0, gone: 0, tug: 0 });
const PAGES = [[-22, 6], [18, -8], [4, 22]];
let busy = false;

export function updateSideQuests(dt = 0.016) {
  const pl = G.player; if (!pl) return;
  guideTick(dt);
  if (G.scene !== G.scenes?.island || busy) return;
  for (const q of SIDE_QUESTS) {
    if (Q()[q.id] !== 'active') continue;
    if (q.type === 'meet' || q.type === 'puzzle') { updateSpecial(q, dt); continue; }
    const r = rtq(q); r.t += dt;
    const ix = q.x + r.dx, iy = q.y + r.dy, d = dist(pl.x, pl.y, ix, iy);
    const kind = kindOf(q);
    if (kind === 'wind') {                    // the letter keeps blowing away until the third try
      r.dx += Math.sin(r.t * 0.9) * 4 * dt; r.dy += Math.cos(r.t * 0.7) * 3 * dt; r.dx = Math.max(-90, Math.min(90, r.dx)); r.dy = Math.max(-60, Math.min(60, r.dy));
      if (d < 34 && r.flee < 2) { r.flee++; const an = Math.atan2(iy - pl.y, ix - pl.x); let gx = r.dx + Math.cos(an) * 60, gy = r.dy + Math.sin(an) * 34; const gl = Math.hypot(gx, gy); if (gl > 80) { gx = gx / gl * 80; gy = gy / gl * 80; } if (!G.scenes.island.terrain(q.x + gx, q.y + gy)) { gx = -gx * 0.5; gy = -gy * 0.5; } r.goal = [gx, gy]; sfx('whoosh'); toast({ text: T('Whoosh! The wind grabbed it again…', 'Vù! Gió lại cuốn nó đi…'), icon: 'star', ms: 1400 }); }
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
  const pl = G.player, r = rtq(q), kind = kindOf(q);
  busy = true; lockInput('quest'); pl.stop?.();
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
    pl.setAct('hold', iconOf(q)); fx.burst('spark', pl.x, pl.y - 40, 12, { up: 40, col: '#ffd35a' });
    await sleep(900); pl.setAct(null);
    const who = ownerName(q);
    toast({ text: T(`Found the ${q.item[0]}!`, `Tìm thấy ${q.item[1]}!`), sub: T(`Bring it back to ${who} — follow the arrow (look for the ❗ over their head).`, `Mang trả cho ${who} — đi theo mũi tên (tìm dấu ❗ trên đầu).`), icon: 'star', ms: 4200 });
    refreshGuide();
  } finally { releaseInput('quest'); busy = false; }
}

// ---------------------------------------------------------------- returning it: an arrow to the owner
const ITEM_ICON = { sandal: 'sandal', net: 'net', kite: 'kite', lens: 'lens', letter: 'letter', hat: 'flowerhat', toolbox: 'toolbox', notebook: 'notebook', shell: 'conch' };
const iconOf = q => q.icon || ITEM_ICON[q.id] || 'star';
// the person to walk to: whoever the item goes to next (Mèo Mây and Bà Sáu included)
const actorOf = rid => rid === 'meo' ? G.meo : (G.npcs?.residents || []).find(a => a.data?.rid === rid) || (rid === 'ba_sau' ? (G.npcs?.vendors || []).find(v => v.data?.mid === 'ba_sau' || v.name === 'Bà Sáu') : null);
const residentOf = q => actorOf(Q()[q.id] === 'found' ? deliverTarget(q) : q.giver);
const ownerName = q => nameOf(Q()[q.id] === 'found' ? deliverTarget(q) : q.giver);
export function ownerTarget(q) {
  const rid = Q()[q.id] === 'found' ? deliverTarget(q) : q.giver;
  const a = actorOf(rid); if (!a) return null;
  const isl = G.scenes?.island;
  if (isl?.actors.includes(a) && a.visible !== false) return { scene: 'island', x: a.x, y: a.y, lift: 60 };
  if (rid === 'meo') { const hs = G.scenes?.meo; if (G.scene === hs && hs.actors.includes(a)) return { scene: 'meo', x: a.x, y: a.y, lift: 50 }; const b = isl && isl.buildings.meo; return b ? { scene: 'island', x: b.x, y: b.y } : null; }
  // inside a house (or asleep): point at their front door, or at them if you're in there too
  const homeId = 'home_' + rid, hs = G.scenes?.[homeId];
  if (G.scene === hs && hs.actors.includes(a)) return { scene: homeId, x: a.x, y: a.y, lift: 60 };
  const b = isl && Object.values(isl.buildings).find(b => b.home === rid || (rid === 'be_na' && b.home === 'ba_tu') || (rid === 'minh' && b.home === 'anh_tuan'));
  return b ? { scene: 'island', x: b.x, y: b.y } : null;
}
let guideT = 0;
function guideTick(dt) { guideT -= dt; if (guideT <= 0) { guideT = 1; refreshGuide(); } }
export function refreshGuide() {
  const q = SIDE_QUESTS.find(q => Q()[q.id] === 'found');
  if (!q) { setGuide(null); return; }
  const a = residentOf(q), asleep = a?.data?.state === 'home', who = ownerName(q);
  const give = q.type === 'deliver' || q.giver !== deliverTarget(q);
  const what = give ? T(`Take the ${q.item[0]} to ${who}`, `Mang ${q.item[1]} cho ${who}`) : q.type === 'puzzle' || q.type === 'meet' ? T(`Tell ${who} how it went`, `Kể cho ${who} nghe`) : T(`Return the ${q.item[0]} to ${who}`, `Trả ${q.item[1]} cho ${who}`);
  const when = q.type === 'deliver' && q.time ? ` (${hours(q)})` : '';
  setGuide({ text: what + when + (asleep ? T(' — asleep now, up in the morning', ' — đang ngủ, sáng mai dậy') : ''), target: () => ownerTarget(q) });
}
// where a lost item (or meeting place) is right now (the letter blows around)
export function questSpot(q) { const r = RT[q.id]; return { x: q.x + (r?.dx || 0), y: q.y + (r?.dy || 0) }; }
export const foundQuestFor = rid => SIDE_QUESTS.find(q => deliverTarget(q) === rid && Q()[q.id] === 'found');

// ---------------------------------------------------------------- drawing
export function drawSideQuests(c, t) {
  if (G.scene !== G.scenes?.island) return;
  for (const q of SIDE_QUESTS) {
    const st = Q()[q.id];
    if (st === 'found') { drawOwnerMark(c, t, q); continue; }
  }
}
// the lost-item scenes are part of the world (sorted with trees and people)
export function sideQuestDrawables() {
  if (G.scene !== G.scenes?.island) return [];
  const out = [];
  for (const q of SIDE_QUESTS) {
    if (Q()[q.id] !== 'active') continue;
    const r = rtq(q);
    out.push({ x: q.x + r.dx, y: q.y + r.dy, sortY: q.y + r.dy + 1, draw: (c, t) => { c.save(); c.translate(-(q.x + r.dx), -(q.y + r.dy)); drawScene(c, t, q); c.restore(); } });
  }
  return out;
}
function drawScene(c, t, q) {
  {
    const r = rtq(q), kind = kindOf(q), x = q.x + r.dx, y = q.y + r.dy, icon = iconOf(q);
    if (q.type === 'meet' || q.type === 'puzzle') { drawSpecial(c, t, q); return; }
    // a soft glow so it's findable from a distance
    const k = (Math.sin(t * 4) + 1) / 2;
    c.save(); c.fillStyle = `rgba(255,230,120,${0.18 + k * 0.18})`; c.beginPath(); c.ellipse(x, y, 20, 7, 0, 0, TAU); c.fill(); c.restore();
    c.save(); c.translate(x, y);
    if (kind === 'dog') {
      const dogA = { vx: 0, vy: 0, state: r.state === 'tug' ? 'greet' : 'idle', idle: r.state === 'happy' ? 'wag' : 'chew', t, col: '#c9955e', face: -1 };
      c.save(); c.translate(14 + (r.tug || 0), 0); ANIMAL_DRAW.dog(c, t, dogA); c.restore();
      if (r.state !== 'happy') { c.save(); c.translate(1 + (r.tug || 0), -10 + Math.sin(t * 9) * 0.6); c.rotate(-0.3 + Math.sin(t * 7) * 0.12); drawItem(c, icon); c.restore(); }
    } else if (kind === 'crab') {
      drawItem(c, icon);
      const cx = (r.crabX || 0), crab = { vx: r.state === 'flee' ? 10 : 0, vy: 0, state: r.state === 'flee' ? 'walk' : 'idle', t, col: '#f08a6a', face: 1 };
      c.save(); c.translate(cx, -6); ANIMAL_DRAW.crab(c, t, crab); c.restore();
    } else if (kind === 'tree') {
      c.save(); c.rotate(r.shake || 0); P.tree(c, t, { x, y, s: 0.9, trunk: 7 }); c.restore();
      const f = r.fall || 0; c.save(); c.translate(-6 + f * 18, -86 + f * 76 + Math.sin(f * Math.PI) * -10); c.rotate(0.4 + f * 2 + Math.sin(t * 3) * 0.1); drawItem(c, icon); c.restore();
    } else if (kind === 'frog') {
      drawItem(c, icon);
      const f = r.frog || 0; c.save(); c.translate(f * 30, -6 - Math.sin(f * Math.PI) * 16); if (f < 1) frog(c, t); c.restore();
    } else if (kind === 'wind') {
      c.save(); c.translate(0, -8 - Math.abs(Math.sin(t * 2.2)) * 6); c.rotate(Math.sin(t * 3) * 0.4); drawItem(c, icon); c.restore();
      c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 1; for (let i = 0; i < 3; i++) { const k2 = (t * 0.8 + i / 3) % 1; c.beginPath(); c.moveTo(-26 + k2 * 40, -14 + i * 6); c.quadraticCurveTo(-18 + k2 * 40, -18 + i * 6, -10 + k2 * 40, -14 + i * 6); c.stroke(); }
    } else if (kind === 'bird') {
      drawItem(c, icon);
      const f = r.fly || 0; if (f < 1) { c.save(); c.translate(f * 40, -8 - f * 70); ANIMAL_DRAW.pigeon(c, t, { vx: f ? 10 : 0, vy: 0, state: f ? 'fly' : 'idle', t, col: '#b9c3cb', face: 1 }); c.restore(); }
    } else if (kind === 'pages') {
      PAGES.forEach(([ox, oy], i) => { if (r.pages[i]) return; c.save(); c.translate(ox, oy - 3 - Math.abs(Math.sin(t * 3 + i)) * 3); c.rotate(Math.sin(t * 2 + i) * 0.5); drawItem(c, q.icon || 'page'); c.restore(); });
    } else if (kind === 'shell') {
      c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 1; c.beginPath(); c.ellipse(0, 0, 12 + Math.sin(t * 2) * 2, 4, 0, 0, TAU); c.stroke();
      drawItem(c, 'conch');
    } else drawItem(c, icon);
    // little sparkle stars
    for (let i = 0; i < 3; i++) { const a = t * 2 + i * TAU / 3, rr = 12 + k * 3; c.fillStyle = '#fff6b0'; c.beginPath(); c.arc(Math.cos(a) * rr, -12 + Math.sin(a) * rr * 0.5, 1.4, 0, TAU); c.fill(); }
    c.restore();
  }
}
// a meeting place: a soft ring and a little clock; the stepping stones glow in order
function drawSpecial(c, t, q) {
  const r = rtq(q), x = q.x, y = q.y, open = inHours(q);
  c.save(); c.translate(x, y);
  if (q.type === 'meet') {
    const k = (Math.sin(t * 3) + 1) / 2;
    c.strokeStyle = open ? `rgba(255,214,90,${0.5 + k * 0.4})` : 'rgba(255,255,255,.35)'; c.lineWidth = 2; c.setLineDash([5, 4]);
    c.beginPath(); c.ellipse(0, 0, 26, 10, 0, 0, TAU); c.stroke(); c.setLineDash([]);
    if (!open) { c.fillStyle = 'rgba(255,248,234,.9)'; c.beginPath(); c.arc(0, -26, 8, 0, TAU); c.fill(); c.strokeStyle = INK; c.lineWidth = 1; c.stroke(); line(c, 0, -26, 0, -31, INK, 1.2); line(c, 0, -26, 3.5, -24, INK, 1.2); }
  } else {
    const order = r.order || [0, 1, 2], cycle = (r.show || 0) % 4.2, lit = cycle < 3 ? order[Math.floor(cycle)] : -1;
    STONES.forEach(([ox, oy], i) => {
      const done = r.step && order.slice(0, r.step).includes(i), glow = open && (i === lit || done);
      ell(c, ox, oy, 10, 5, glow ? '#ffe89a' : '#c9c2b6', INK, 0.9);
      if (glow) { c.fillStyle = 'rgba(255,230,120,.35)'; c.beginPath(); c.ellipse(ox, oy - 1, 14, 7, 0, 0, TAU); c.fill(); }
      if (q.id === 'nm_lanterns') { line(c, ox, oy - 6, ox, oy - 18, '#8a5f3e', 1); ell(c, ox, oy - 22, 4, 5, glow ? '#ff7a5a' : '#a8423a', INK, 0.7); }
    });
  }
  c.restore();
}
// the owner gets a bobbing "!" bubble showing what you're bringing back
function drawOwnerMark(c, t, q) {
  const a = residentOf(q); if (!a || !G.scenes.island.actors.includes(a) || a.visible === false) return;
  const y = a.y - 62 - Math.abs(Math.sin(t * 3)) * 4;
  c.save(); c.translate(a.x, y);
  c.fillStyle = '#fff8ea'; c.strokeStyle = INK; c.lineWidth = 1.2; c.beginPath(); c.ellipse(0, 0, 13, 11, 0, 0, TAU); c.fill(); c.stroke();
  c.beginPath(); c.moveTo(-3, 9); c.lineTo(0, 15); c.lineTo(3, 9); c.fill(); c.stroke();
  c.save(); c.scale(0.7, 0.7); drawItem(c, iconOf(q)); c.restore();
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
    case 'teatin': box(c, -6, -9, 12, 13, 2, '#c9674a', INK, 0.8); box(c, -7, -11, 14, 3, 1, '#8a5f3e', INK, 0.7); circ(c, 0, -3, 2.4, '#ffd35a', null); break;
    case 'recipecard': c.save(); c.rotate(-0.15); box(c, -7, -5, 14, 10, 1, '#fff6e0', INK, 0.8); for (let i = 0; i < 3; i++) line(c, -5, -2.4 + i * 2.4, 4, -2.4 + i * 2.4, '#b87a5a', 0.5); c.restore(); break;
    case 'teacup': ell(c, 0, 1, 6, 2.4, '#fffaf0', INK, 0.8); c.beginPath(); c.moveTo(-5, 0); c.quadraticCurveTo(0, 8, 5, 0); c.closePath(); c.fillStyle = '#fffaf0'; c.fill(); c.strokeStyle = INK; c.lineWidth = 0.8; c.stroke(); ell(c, 0, 0.4, 4.2, 1.4, '#e9a24a', null); break;
    case 'float': circ(c, 0, -3, 6, 'rgba(120,200,160,.85)', INK, 0.8); for (let i = -1; i <= 1; i++) line(c, -5, -3 + i * 3, 5, -3 + i * 3, '#8a6a4a', 0.5); circ(c, -2, -5, 1.4, 'rgba(255,255,255,.8)', null); break;
    case 'pen': c.save(); c.rotate(0.6); box(c, -1.4, -8, 2.8, 14, 1, '#e8584e', INK, 0.7); poly(c, [-1.4, 6, 1.4, 6, 0, 9], '#3d3d44', null); circ(c, 0, -6, 1, '#ffd35a', null); c.restore(); break;
    case 'photo': c.save(); c.rotate(-0.1); box(c, -7, -7, 14, 12, 1, '#fffaf0', INK, 0.8); box(c, -5.5, -5.5, 11, 8, 0.5, '#8fb7e0', null); circ(c, 2, -3, 1.6, '#ffd35a', null); poly(c, [-5.5, 2.5, -1, -2, 3, 2.5], '#6fbf4a', null); c.restore(); break;
    case 'brush': for (const [dx, col] of [[-3, '#f08ca0'], [0, '#9fd8c8'], [3, '#ffd35a']]) { line(c, dx, 6, dx, -4, '#b87a4a', 1.3); poly(c, [dx - 1.4, -4, dx + 1.4, -4, dx, -9], col, INK, 0.5); } break;
    case 'bell': c.beginPath(); c.moveTo(-5, 2); c.quadraticCurveTo(-5, -7, 0, -7); c.quadraticCurveTo(5, -7, 5, 2); c.closePath(); c.fillStyle = '#ffd35a'; c.fill(); c.strokeStyle = INK; c.lineWidth = 0.8; c.stroke(); circ(c, 0, 3, 1.6, '#c99a2a', INK, 0.5); line(c, -3, -8, 3, -8, '#e8584e', 1.4); break;
    case 'ladle': c.save(); c.rotate(-0.5); line(c, 0, -10, 0, 3, '#c99a4a', 1.6); ell(c, 0, 5, 4.4, 3, '#d9a94a', INK, 0.8); c.restore(); break;
    case 'compass': circ(c, 0, -2, 6, '#d9a94a', INK, 0.9); circ(c, 0, -2, 4.4, '#fffaf0', null); poly(c, [0, -6, 1.4, -2, 0, 2, -1.4, -2], '#e8584e', null); break;
    case 'lunchbox': box(c, -7, -6, 14, 9, 2, '#9fd8c8', INK, 0.8); line(c, -7, -3, 7, -3, '#5f9f8a', 0.8); box(c, -2, -9, 4, 3, 1, null, INK, 0.7); break;
    case 'coconut': circ(c, 0, -3, 6, '#e9b949', INK, 0.9); circ(c, -2, -5, 0.9, '#8a5f3e', null); circ(c, 1, -6, 0.9, '#8a5f3e', null); circ(c, 0, -3.6, 0.9, '#8a5f3e', null); break;
    case 'shell_small': c.beginPath(); c.ellipse(0, -1, 4.4, 3.2, 0, 0, TAU); c.fillStyle = '#fff1e0'; c.fill(); c.strokeStyle = INK; c.lineWidth = 0.7; c.stroke(); line(c, 0, -3.6, 0, 1.6, '#b98a6a', 0.7); break;
    case 'flowers': for (const [x, y, col] of [[-3, -6, '#ff8fb0'], [2, -7, '#ffd35a'], [0, -3, '#fff']]) circ(c, x, y, 2.4, col, INK, 0.5); line(c, 0, -2, -2, 7, '#6fbf4a', 1); line(c, 0, -2, 2, 7, '#6fbf4a', 1); break;
    case 'ribbon': poly(c, [0, -2, -7, -6, -6, 2], '#f08ca0', INK, 0.7); poly(c, [0, -2, 7, -6, 6, 2], '#f08ca0', INK, 0.7); circ(c, 0, -2, 1.8, '#e8584e', INK, 0.6); break;
    default: circ(c, 0, -2, 3.4, '#ffd35a', INK, 0.8);
  }
}

// the lost items also work as icons (held in the hand, on toasts, in bubbles)
for (const k of ['sandal', 'net', 'kite', 'lens', 'letter', 'flowerhat', 'toolbox', 'notebook', 'conch', 'teatin', 'recipecard', 'teacup', 'float', 'pen', 'photo', 'brush', 'bell', 'ladle', 'compass', 'lunchbox', 'coconut', 'shell_small', 'flowers', 'ribbon']) ICONS[k] ||= c => { c.save(); c.scale(2, 2); drawItem(c, k); c.restore(); };
