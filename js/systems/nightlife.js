// Night Market events (once it's restored):
//  · Saturday karaoke (real Saturdays in Japan, 19:00–22:30 on the island clock): a little stage with a microphone. Sing — a rhythm game:
//    notes slide toward the line, tap as each one crosses it. The better you sing, the bigger
//    the crowd's cheer, and the market's stalls do brisker trade for the rest of the night.
//  · Bà Sáu's lantern class (real Wednesdays, 18:00–21:00): fold a star lantern in your colour;
//    it goes home with you (once a week, 20k for the paper and paint).
import { G, T, addMoney, canAfford, markDirty } from './state.js';
import { bus, dist, jstDow, jstDayNum } from '../core/util.js';
import { present } from '../ui/sheets.js';
import { addXP } from './progress.js';
import { fx } from '../world/render.js';
import { celebratePhoto } from './album.js';

export const STAGE = { x: 430, y: 520 }, CLASS = { x: 300, y: 830 };
const dow = () => jstDow();                                          // the real weekday in Japan (6 = Saturday, 3 = Wednesday)
const h = () => G.state.time / 60;
export const karaokeOn = () => !!G.state.nightMarket?.restored && dow() === 6 && h() >= 19 && h() < 22.5;
export const classOn = () => !!G.state.nightMarket?.restored && dow() === 3 && h() >= 18 && h() < 21;

export function nightlifeAction(pl) {
  if (G.scene !== G.scenes.island) return null;
  if (karaokeOn() && dist(pl.x, pl.y, STAGE.x, STAGE.y + 20) < 40) {
    if (G.state.story.flags.karaokeDay === jstDayNum()) return { label: T('Encore? (next Saturday)', 'Hát lại? (thứ Bảy sau)'), icon: 'note', run: () => bus.emit('toast', { text: T('Your voice needs a rest — next Saturday!', 'Giọng cần nghỉ — thứ Bảy tuần sau nhé!'), icon: 'note' }) };
    return { label: T('Sing karaoke!', 'Hát karaoke!'), icon: 'note', run: sing };
  }
  if (classOn() && dist(pl.x, pl.y, CLASS.x, CLASS.y) < 40) return { label: T('Lantern class · 20k', 'Lớp làm lồng đèn · 20k'), icon: 'lantern', run: lanternClass };
  return null;
}
// ---------------------------------------------------------------- karaoke (rhythm)
const SONGS = [['Moonlight over the harbour', 'Trăng sáng bến cảng'], ['Kumquat love song', 'Tình ca trái tắc'], ['The ferry won\'t wait', 'Chuyến phà không chờ']];
function sing() {
  G.state.story.flags.karaokeDay = jstDayNum(); markDirty();
  const song = SONGS[G.state.day % SONGS.length];
  return present(() => new Promise(done => {
    const N = 16, beat = 0.62, notes = Array.from({ length: N }, (_, i) => ({ at: 1.6 + i * beat + (i % 4 === 3 ? beat * 0.5 : 0), lane: [0, 1, 2, 1, 0, 2, 1, 0, 2, 1, 0, 1, 2, 0, 1, 2][i], hit: null }));
    const el = document.createElement('div'); el.className = 'modal karaoke';
    el.innerHTML = `<div class="card"><div class="kicker">🎤 ${T('Karaoke night', 'Đêm karaoke')}</div><h2>${T(song[0], song[1])}</h2><div class="kk-track"><div class="kk-line"></div></div><div class="kk-pads">${[0, 1, 2].map(i => `<button type="button" data-l="${i}">${['♪', '♫', '♬'][i]}</button>`).join('')}</div><div class="kk-score"></div></div>`;
    (document.getElementById('app') || document.body).appendChild(el);
    const track = el.querySelector('.kk-track'), score = el.querySelector('.kk-score');
    const dots = notes.map(n => { const d = document.createElement('i'); d.className = 'kk-note l' + n.lane; track.appendChild(d); return d; });
    const t0 = performance.now(); let raf = 0, good = 0, great = 0;
    const tone = (lane, ok) => bus.emit('sfx', ok ? ['ui', 'tap', 'pop'][lane] : 'error');
    const frame = () => {
      const t = (performance.now() - t0) / 1000;
      notes.forEach((n, i) => { const x = 50 + (n.at - t) * 120; dots[i].style.left = x + '%'; dots[i].style.opacity = n.hit ? 0 : 1; if (!n.hit && t - n.at > 0.25) { n.hit = 'miss'; } });
      score.textContent = T(`Great ${great} · Good ${good}`, `Tuyệt ${great} · Tốt ${good}`);
      if (t > notes[N - 1].at + 1) return finish(); raf = requestAnimationFrame(frame);
    };
    el.querySelector('.kk-pads').onclick = e => {
      const lane = +e.target.closest('button')?.dataset.l; if (Number.isNaN(lane)) return;
      const t = (performance.now() - t0) / 1000, n = notes.filter(x => !x.hit && x.lane === lane).sort((a, b) => Math.abs(a.at - t) - Math.abs(b.at - t))[0];
      const d = n ? Math.abs(n.at - t) : 9; if (d < 0.11) { n.hit = 'great'; great++; tone(lane, true); } else if (d < 0.22) { n.hit = 'good'; good++; tone(lane, true); } else tone(lane, false);
    };
    const finish = () => {
      cancelAnimationFrame(raf);
      const pts = great * 2 + good, stars = pts >= 28 ? 3 : pts >= 18 ? 2 : pts >= 8 ? 1 : 0;
      G.runtime.nightBuzz = { day: G.state.day, mul: 1 + stars * 0.06 };
      addXP(20 + stars * 20, 'karaoke'); G.state.stats.karaoke = Math.max(G.state.stats.karaoke || 0, stars); markDirty(true);
      el.querySelector('.card').innerHTML = `<div class="kicker">🎤 ${T('Karaoke night', 'Đêm karaoke')}</div><div class="stars-big">${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</div><p style="font-weight:800">${[T('Brave! The crowd claps politely.', 'Can đảm lắm! Khán giả vỗ tay lịch sự.'), T('Not bad! A few people sing along.', 'Không tệ! Vài người hát theo.'), T('The whole market sings the chorus!', 'Cả chợ hát theo điệp khúc!'), T('A standing ovation! Bà Sáu is crying.', 'Khán giả đứng dậy vỗ tay! Bà Sáu khóc luôn.')][stars]}</p><p class="muted" style="font-size:12px">${stars ? T(`Night Market stalls: +${stars * 6}% customers tonight`, `Sạp Chợ Đêm: thêm ${stars * 6}% khách tối nay`) : ''}</p><button class="btn primary" type="button">${T('Bow', 'Cúi chào')}</button>`;
      bus.emit('stinger', stars >= 2 ? 'award' : 'friend');
      el.querySelector('button').onclick = () => { el.remove(); G.player?.setAct('bow'); setTimeout(() => G.player?.setAct(null), 1200); if (stars >= 2) { fx.burst('confetti', STAGE.x, STAGE.y - 20, 24, { up: 80, col: ['#ffd35a', '#f36d86', '#6fbfb0'] }); celebratePhoto(['Karaoke star', 'Ngôi sao karaoke']); } done(); };
    };
    G.player?.setAct('cheer'); raf = requestAnimationFrame(frame);
  }));
}
export const nightBuzz = () => { const b = G.runtime.nightBuzz; return b && b.day === G.state.day ? b.mul : 1; };
// ---------------------------------------------------------------- the lantern class
function lanternClass() {
  const s = G.state, wk = Math.floor((jstDayNum() + 3) / 7);
  if (s.story.flags.lanternClass === wk) return bus.emit('toast', { text: T('You\'ve made this week\'s lantern — next Wednesday!', 'Tuần này bạn làm rồi — thứ Tư tuần sau nhé!'), icon: 'lantern' });
  if (!canAfford(20)) return bus.emit('toast', { text: T('The class costs 20k', 'Lớp học giá 20k'), icon: 'lantern', bad: true });
  return present(() => new Promise(done => {
    const el = document.createElement('div'); el.className = 'modal';
    el.innerHTML = `<div class="card" style="text-align:center"><div class="kicker">🏮 ${T('Bà Sáu\'s lantern class', 'Lớp làm lồng đèn của Bà Sáu')}</div><p style="font-weight:800">${T('"Fold the frame, glue the paper, and pick a colour that makes you happy."', '"Gấp khung, dán giấy, và chọn màu làm con vui."')}</p><div class="pc-pick" style="justify-content:center">${[['pink', '#f36d86', T('Pink', 'Hồng')], ['teal', '#2f9e8f', T('Teal', 'Xanh')], ['gold', '#f2c14e', T('Gold', 'Vàng')]].map(([k, c, n]) => `<button type="button" data-k="${k}" style="border-color:${c}">⭐ ${n}</button>`).join('')}</div></div>`;
    (document.getElementById('app') || document.body).appendChild(el);
    el.onclick = e => { const k = e.target.closest('[data-k]')?.dataset.k; if (!k) return; el.remove();
      addMoney(-20, 'materials'); s.story.flags.lanternClass = wk; (s.home.owned ||= []).push('lantern_hand_' + k); addXP(40, 'class'); markDirty(true);
      bus.emit('sfx', 'success'); bus.emit('toast', { text: T('Your star lantern is finished!', 'Lồng đèn ông sao của bạn đã xong!'), sub: T('It\'s waiting at home — hang it up!', 'Đang chờ ở nhà — treo lên nhé!'), icon: 'lantern', ms: 3600 }); done(); };
  }));
}
// the stage and the class table, drawn on market nights
export function nightlifeDrawables(add, P) {
  if (karaokeOn()) add(STAGE.x, STAGE.y, STAGE.y, (c, t) => {
    const x = STAGE.x, y = STAGE.y;
    P.box(c, x - 34, y - 8, 68, 10, 2, '#8a5a3a', P.INK, 1); P.box(c, x - 34, y - 10, 68, 3, 1, '#f2c14e', null);
    P.line(c, x, y - 10, x, y - 34, '#3a3a3a', 1.2); P.circ(c, x, y - 36, 2.4, '#5b6f7a', P.INK, 0.6);
    for (const s of [-1, 1]) { P.box(c, x + s * 30 - 5, y - 24, 10, 14, 2, '#3a3a3a', P.INK, 0.8); P.circ(c, x + s * 30, y - 17, 3, '#6b6b6b', null); }
    for (let i = 0; i < 3; i++) { const k = ((t * 0.7 + i / 3) % 1); c.globalAlpha = 1 - k; c.fillStyle = '#ffd35a'; c.font = '900 8px Nunito'; c.fillText('♪', x - 20 + i * 18, y - 40 - k * 20); c.globalAlpha = 1; }
    P.glows.push([x, y - 20, 50, 'rgba(255,140,200,.45)']);
  });
  if (classOn()) add(CLASS.x, CLASS.y, CLASS.y, c => {
    const x = CLASS.x, y = CLASS.y;
    P.box(c, x - 22, y - 12, 44, 12, 2, '#c9955e', P.INK, 0.9);
    for (const [dx, col] of [[-12, '#f36d86'], [0, '#2f9e8f'], [12, '#f2c14e']]) { const pts = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 2 : 4.5; pts.push(x + dx + Math.cos(a) * r, y - 18 + Math.sin(a) * r); } P.poly(c, pts, col, P.INK, 0.5); }
    c.save(); c.fillStyle = '#fffaf0'; c.font = '900 5px Nunito'; c.textAlign = 'center'; c.fillText(T('LANTERN CLASS', 'LỚP LỒNG ĐÈN'), x, y - 4); c.restore();
  });
}
