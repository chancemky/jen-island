// Birthday parties: on a neighbour's birthday (island calendar) their friends throw a party
// on Wind Plaza from 17:00 to 20:00 — a table with a cake and balloons, a banner, and up to
// four neighbours gathered round. Walk up and join: everyone cheers, the candles go out,
// the album gets a party photo and the birthday neighbour likes you a lot more.
import { G, T, markDirty } from './state.js';
import { bus, dist } from '../core/util.js';
import { birthdaysToday } from './interact.js';
import { RESIDENTS } from '../data/looks.js';
import { PLAZA } from '../world/island.js';
import { npcs } from './npc.js';
import { befriend } from './friends.js';
import { addXP } from './progress.js';
import { cs, wait, say } from './cutscene.js';
import { fx } from '../world/render.js';
import { celebratePhoto } from './album.js';

const SPOT = { x: PLAZA.x + 70, y: PLAZA.y + 64 };
let party = null;     // { rid, guests: [actor], joined }
export const partyToday = () => party;
function start(rid) {
  const guests = [], host = npcs.residents.find(a => a.data.rid === rid && a.visible);
  const others = npcs.residents.filter(a => a !== host && a.visible && a.data.state !== 'busy' && !a.data.inTalk).slice(0, 3);
  [host, ...others].filter(Boolean).forEach((a, i) => {
    const ang = Math.PI * (0.15 + i * 0.35), x = SPOT.x + Math.cos(ang) * 30, y = SPOT.y + Math.sin(ang) * 18 + 6;
    a.stop?.(); a.data.state = 'busy'; a.data.party = true; a.walkTo?.([[x, y]]).then(() => { a.face?.('up'); a.showEmote?.('note', 2); });
    guests.push(a);
  });
  party = { rid, guests, joined: false, day: G.state.day };
  bus.emit('toast', { text: T(`It's ${RESIDENTS[rid].name}'s birthday!`, `Hôm nay sinh nhật ${RESIDENTS[rid].name}!`), sub: T('Party on Wind Plaza until 20:00 — come join!', 'Tiệc ở Quảng trường gió tới 20 giờ — ghé chơi nha!'), icon: 'heart', ms: 5200 });
}
function end() { for (const a of party?.guests || []) { a.data.party = false; a.data.state = 'idle'; a.data.until = 0; } party = null; }
async function join() {
  const p = party; if (!p || p.joined) return; p.joined = true;
  const s = G.state, name = RESIDENTS[p.rid].name, host = p.guests[0];
  await cs.run('party', async () => {
    G.runtime.inCutscene = true;
    try {
      for (const a of p.guests) a.face?.(G.player);
      if (host) await say(host, T(`You came! Everyone, ${s.player.name} is here!`, `${s.player.name} tới rồi! Mọi người ơi!`), { emo: 'happy' });
      for (const a of p.guests) { a.setAct('cheer'); a.doHop?.(); }
      G.player.setAct('clap'); bus.emit('stinger', 'levelup');
      await wait(1.2);
      fx.burst('confetti', SPOT.x, SPOT.y - 30, 34, { up: 90, speed: 70, col: ['#f08ca0', '#ffd35a', '#9fd8c8', '#fff'], g: 60, life: 1.8 });
      if (host) await say(host, T('Make a wish for me too — the candles are going out!', 'Ước giùm mình một điều nữa nha — thổi nến nè!'), { emo: 'love' });
      for (const a of p.guests) a.setAct(null); G.player.setAct(null);
    } finally { G.runtime.inCutscene = false; }
  });
  befriend(p.rid, 3); for (const a of p.guests.slice(1)) befriend(a.data.rid, 1);
  addXP(60, 'party'); s.stats.parties = (s.stats.parties || 0) + 1; markDirty(true);
  celebratePhoto([`${name}'s birthday party`, `Tiệc sinh nhật ${name}`]);
}
export function partyAction(pl) {
  if (!party || party.joined || G.scene !== G.scenes.island || dist(pl.x, pl.y, SPOT.x, SPOT.y) > 70) return null;
  return { label: T('Join the party', 'Vào tiệc'), icon: 'heart', run: join };
}
// the table, cake and banner
export function partyDrawables(add, P) {
  if (!party) return;
  const x = SPOT.x, y = SPOT.y;
  add(x, y, y, (c, t) => {
    P.box(c, x - 18, y - 12, 36, 12, 2, '#fffaf0', P.INK, 0.9); P.box(c, x - 20, y - 14, 40, 4, 2, '#ff8fb0', P.INK, 0.7);
    P.box(c, x - 8, y - 24, 16, 10, 2, '#fff1d6', P.INK, 0.8); P.box(c, x - 8, y - 20, 16, 2.4, 0.5, '#f36d86', null);
    for (const dx of [-4, 0, 4]) { P.line(c, x + dx, y - 24, x + dx, y - 28, '#8fb7e0', 1); if (!party.joined) { const k = Math.sin(t * 9 + dx) * 0.6; P.circ(c, x + dx + k * 0.3, y - 29.5, 1.1, '#ffd35a', null); } }
    for (const [dx, col] of [[-26, '#f36d86'], [26, '#ffd35a'], [-30, '#6fbfb0']]) { P.line(c, x + dx, y - 2, x + dx + Math.sin(t + dx) * 2, y - 34, 'rgba(91,63,54,.6)', 0.5); P.ell(c, x + dx + Math.sin(t + dx) * 2, y - 38, 5, 6.2, col, P.INK, 0.7); }
  });
  add(x, y - 50, 99990, c => { const txt = T(`HAPPY BIRTHDAY ${RESIDENTS[party.rid].name.toUpperCase()}!`, `MỪNG SINH NHẬT ${RESIDENTS[party.rid].name.toUpperCase()}!`); c.save(); c.font = '900 6.5px Nunito, sans-serif'; const w = c.measureText(txt).width + 14; P.box(c, x - w / 2, y - 64, w, 12, 3, '#fff5df', P.INK, 0.9); c.fillStyle = '#e8584e'; c.textAlign = 'center'; c.fillText(txt, x, y - 55.5); c.restore(); });
}
export function initParties() {
  bus.on('hour', h => {
    const s = G.state; if (!s.story.flags.freeRoam) return;
    if (party && (party.day !== s.day || h >= 20)) end();
    if (!party && h >= 17 && h < 20) { const rid = birthdaysToday()[0]; if (rid && s.story.flags['party:' + rid] !== s.day) { s.story.flags['party:' + rid] = s.day; markDirty(); start(rid); } }
  });
  bus.on('dayEnd', () => end());
}
