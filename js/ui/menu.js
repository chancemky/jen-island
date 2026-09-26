// Main menu: island map, journal, settings, save status, account.

import { G, T, setLang, markDirty } from '../systems/state.js';
import { openSheet, tabs, h, btn } from './sheets.js';
import { SAND, GRASS, RIVER, POND, PATHS, BUILDINGS, PLAZA, NM_PLAZA, PIER, W, H, LANDS, ISLET_SAND, PADDIES } from '../world/island.js';
import { activeQuests } from '../systems/sidequests.js';
import { saveStatus, saveLocal, saveCloudNow } from '../systems/save.js';
import { setAudio, sfx } from '../core/audio.js';
import { escapeHtml, clock, TAU } from '../core/util.js';
import { openJournal } from './shops.js';
import { currentStep } from '../systems/story.js';
import { CHAPTERS, BUSINESSES } from '../data/game.js';
import { TRACKS, trackState, claimMilestone, xpNeed } from '../systems/progress.js';
import { renderChangelog } from './whatsnew.js';
import { iconURL } from '../gfx/food.js';
import { money } from '../core/util.js';
import * as cloud from '../systems/cloud.js';
import { showReward } from './sheets.js';

function renderMilestones(pane, api) {
  const s = G.state;
  const lv = s.level || 1;
  const head = h('div', 'ms-row', `<img src="${iconURL('trophy', 48)}" alt=""><div class="ms-info"><b>${T(`Level ${lv}`, `Cấp ${lv}`)}</b><small>${T(`${Math.floor(s.xp || 0)} / ${xpNeed(lv)} XP to level ${lv + 1}`, `${Math.floor(s.xp || 0)} / ${xpNeed(lv)} KN để lên cấp ${lv + 1}`)}</small><div class="ms-bar"><i style="width:${Math.min(100, (s.xp || 0) / xpNeed(lv) * 100)}%"></i></div></div>`);
  pane.appendChild(head);
  const list = TRACKS.map(tr => ({ tr, st: trackState(tr) })).sort((a, b) => b.st.ready - a.st.ready);
  for (const { tr, st } of list) {
    const fmt = v => tr.money ? money(v) : v;
    const k = Math.min(1, (st.val - st.prev) / Math.max(1, st.target - st.prev));
    const row = h('div', 'ms-row' + (st.ready ? ' ready' : ''), `<img src="${iconURL(tr.icon, 48)}" alt=""><div class="ms-info"><b>${escapeHtml(T(tr.en, tr.vi))} · ${T('tier', 'bậc')} ${st.claimed + 1}</b><small>${fmt(Math.min(st.val, st.target))} / ${fmt(st.target)}</small><div class="ms-bar"><i style="width:${(Math.max(0, k) * 100).toFixed(1)}%"></i></div></div>`);
    if (st.ready) row.appendChild(btn(T('Claim', 'Nhận'), () => { const r = claimMilestone(tr.id); if (!r) return; sfx('fanfare'); showReward({ icon: tr.icon, title: T('Milestone!', 'Cột mốc!'), text: T(`${tr.en}: ${fmt(st.target)}`, `${tr.vi}: ${fmt(st.target)}`), sub: `+${money(r.money)} · +${r.xp} XP` }).then(() => api.rebuild()); }, 'buy pink'));
    pane.appendChild(row);
  }
}

function renderLeaderboard(pane) {
  const seg = h('div', 'seg lb-seg');
  const box = h('div', '');
  const sorts = [['level', T('Level', 'Cấp độ')], ['money', T('Money', 'Tiền')], ['served', T('Served', 'Khách')]];
  let cur = 'level';
  const load = async () => {
    [...seg.children].forEach((b, i) => b.classList.toggle('on', sorts[i][0] === cur));
    box.innerHTML = `<div class="empty-note">${T('Loading the island rankings…', 'Đang tải bảng xếp hạng…')}</div>`;
    if (!cloud.hasSession()) { box.innerHTML = `<div class="empty-note">${T('Sign in to see the global leaderboard.', 'Đăng nhập để xem bảng xếp hạng toàn cầu.')}</div>`; return; }
    try {
      await cloud.pushLeaderboard(leaderboardRowNow()).catch(() => {});
      const rows = await cloud.fetchLeaderboard(cur);
      if (!rows?.length) { box.innerHTML = `<div class="empty-note">${T('No one here yet. Be the first!', 'Chưa có ai. Hãy là người đầu tiên!')}</div>`; return; }
      box.innerHTML = rows.map(r => `<div class="lb-row${r.is_me ? ' me' : ''}"><div class="lb-rank g${r.rank}">${r.rank <= 3 ? ['🥇', '🥈', '🥉'][r.rank - 1] : '#' + r.rank}</div><div class="lb-name"><b>${escapeHtml(r.player_name)}${r.is_me ? T(' (you)', ' (bạn)') : ''}</b><small>${escapeHtml(r.island_name || '')} · ${T('Day', 'Ngày')} ${r.day}</small></div><div class="lb-val">${T('Lv', 'Cấp')} ${r.level}<small>${money(r.money)} · ${r.served} ${T('served', 'khách')}</small></div></div>`).join('');
    } catch (e) { box.innerHTML = `<div class="empty-note">${T('Could not reach the leaderboard. Check your connection.', 'Không kết nối được bảng xếp hạng. Kiểm tra mạng nhé.')}</div>`; }
  };
  for (const [k, label] of sorts) { const b = h('button', '', label); b.type = 'button'; b.onclick = () => { sfx('ui'); cur = k; load(); }; seg.appendChild(b); }
  pane.append(seg, box);
  load();
}
import { leaderboardRow } from '../systems/progress.js';
const leaderboardRowNow = () => leaderboardRow(G.state);

export function openMenu({ onLogout } = {}) {
  const s = G.state;
  openSheet({ title: s.island.name || 'JEN Island', sub: T(`Day ${s.day} · ${clock(s.time)} · Chapter ${s.story.chapter}: ${CHAPTERS[s.story.chapter]?.title || ''}`, `Ngày ${s.day} · ${clock(s.time)} · Chương ${s.story.chapter}: ${CHAPTERS[s.story.chapter]?.vi || ''}`), full: true, build: (body, api) => {
    tabs(body, [T('Map', 'Bản đồ'), T('Milestones', 'Cột mốc'), T('Leaderboard', 'Xếp hạng'), T('Settings', 'Cài đặt'), T('Account', 'Tài khoản')], (i, pane) => {
      if (i === 1) return renderMilestones(pane, api);
      if (i === 2) return renderLeaderboard(pane);
      if (i >= 3) i -= 2;
      if (i === 0) {
        pane.style.display = 'flex'; pane.style.flexDirection = 'column';
        const wrap = h('div', 'map-wrap'); const cv = document.createElement('canvas'); wrap.appendChild(cv); pane.appendChild(wrap);
        wrap.style.minHeight = '360px';
        requestAnimationFrame(() => drawMap(cv)); setTimeout(() => cv.isConnected && drawMap(cv), 400);
        const j = btn(T('Island memories', 'Kỷ niệm của đảo'), () => { api.close(true); openJournal(); }, 'btn ghost');
        j.style.marginTop = '10px'; pane.appendChild(j);
      } else if (i === 1) {
        const list = h('div', 'list'); pane.appendChild(list);
        const toggle = (label, key, fn) => {
          const r = h('div', 'row', `<div class="info"><b>${label}</b></div>`);
          const on = () => T('On', 'Bật'), off = () => T('Off', 'Tắt');
          r.appendChild(btn(s.settings[key] ? on() : off(), (b) => { s.settings[key] = !s.settings[key]; b.innerHTML = s.settings[key] ? on() : off(); b.className = s.settings[key] ? 'buy' : 'buy alt'; fn?.(); markDirty(true); sfx('ui'); }, s.settings[key] ? 'buy' : 'buy alt'));
          list.appendChild(r);
        };
        // language: one language at a time, never mixed
        const lr = h('div', 'row', `<div class="info"><b>${T('Language', 'Ngôn ngữ')}</b><small>${T('Changes all text in the game', 'Đổi toàn bộ chữ trong game')}</small></div>`);
        const seg = h('div', 'seg'); seg.style.minWidth = '170px';
        for (const [code, label] of [['en', 'English'], ['vi', 'Tiếng Việt']]) { const b = h('button', G.lang === code ? 'on' : '', label); b.type = 'button'; b.onclick = () => { if (G.lang === code) return; setLang(code); sfx('ui'); api.close(true); openMenu({ onLogout }); }; seg.appendChild(b); }
        lr.appendChild(seg); list.appendChild(lr);
        toggle(T('Music', 'Nhạc nền'), 'music', () => setAudio({ music: s.settings.music }));
        toggle(T('Sound effects', 'Âm thanh'), 'sfx', () => setAudio({ sfx: s.settings.sfx }));
        toggle(T('Quest arrow', 'Mũi tên chỉ đường'), 'arrow');
        pane.appendChild(h('div', 'section-title', T("What's new (last 20 updates)", 'Có gì mới (20 bản cập nhật gần nhất)')));
        renderChangelog(pane);
      } else {
        const list = h('div', 'list'); pane.appendChild(list);
        const ago = t => t ? T(`${Math.max(0, Math.round((Date.now() - t) / 1000))}s ago`, `${Math.max(0, Math.round((Date.now() - t) / 1000))} giây trước`) : '—';
        list.appendChild(h('div', 'row', `<div class="info"><b>${escapeHtml(G.user?.email || T('Local player', 'Người chơi cục bộ'))}</b><small>${G.user?.local ? T('Offline test profile (localhost only)', 'Hồ sơ thử nghiệm ngoại tuyến') : T('Signed in · progress saves to the cloud', 'Đã đăng nhập · tiến trình được lưu lên mây')}</small></div>`));
        list.appendChild(h('div', 'row', `<div class="info"><b>${T('Saves', 'Lưu game')}</b><small>${T('On this device', 'Trên máy này')}: ${ago(saveStatus.localAt)}<br>${T('Cloud', 'Đám mây')}: ${saveStatus.offline ? T('offline — will retry', 'mất kết nối — sẽ thử lại') : ago(saveStatus.cloudAt)}</small></div>`));
        const sv = btn(T('Save now', 'Lưu ngay'), async (b) => { saveLocal(); b.innerHTML = T('Saving…', 'Đang lưu…'); await saveCloudNow(); b.innerHTML = saveStatus.offline ? T('Offline — saved on this device', 'Mất kết nối — đã lưu trên máy') : T('Saved ✓', 'Đã lưu ✓'); sfx('success'); }, 'btn');
        pane.appendChild(sv);
        if (onLogout) { const lo = btn(T('Sign out', 'Đăng xuất'), () => { api.close(true); onLogout(); }, 'btn ghost'); lo.style.marginTop = '10px'; pane.appendChild(lo); }
      }
    }, 0, api);
  } });
}

function drawMap(cv) {
  const r = cv.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
  cv.width = r.width * dpr; cv.height = r.height * dpr;
  const c = cv.getContext('2d');
  const bridge = !!G.state.story.flags.bridgeFixed;
  // frame the main island, plus the islet once it's reachable
  const x0 = 60, x1 = bridge ? 2600 : 1760, y0 = 140, y1 = 2480;
  const s = Math.min(cv.width / (x1 - x0), cv.height / (y1 - y0));
  const sea = c.createRadialGradient(cv.width / 2, cv.height / 2, 20, cv.width / 2, cv.height / 2, cv.width);
  sea.addColorStop(0, '#76d0da'); sea.addColorStop(1, '#4fb2c4'); c.fillStyle = sea; c.fillRect(0, 0, cv.width, cv.height);
  c.save();
  c.translate(cv.width / 2 - ((x0 + x1) / 2) * s, cv.height / 2 - ((y0 + y1) / 2) * s);
  c.scale(s, s);
  const poly = (p, fill, stroke) => { c.beginPath(); c.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) c.lineTo(p[i], p[i + 1]); c.closePath(); c.fillStyle = fill; c.fill(); if (stroke) { c.strokeStyle = stroke; c.lineWidth = 8; c.stroke(); } };
  // little wave marks on the sea
  c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 6; c.lineCap = 'round';
  for (let i = 0; i < 60; i++) { const x = (i * 397) % 2600, y = (i * 719) % 2600; c.beginPath(); c.moveTo(x - 18, y); c.quadraticCurveTo(x, y - 10, x + 18, y); c.stroke(); }
  for (const l of LANDS) { if (l.sand === ISLET_SAND && !bridge) { c.globalAlpha = 0.45; } poly(l.sand, '#f5e2b3', '#e8cf95'); poly(l.grass, '#a3d68a'); c.globalAlpha = 1; }
  // paddies, paths, river, pond
  for (const p of PADDIES) { c.fillStyle = p.kind === 'veg' ? '#9a6e45' : '#8fcfc8'; c.fillRect(p.x, p.y, p.w, p.h); }
  c.lineCap = 'round'; c.lineJoin = 'round';
  for (const [k, p] of Object.entries(PATHS)) { if (!bridge && (k.startsWith('islet') || k === 'bridge')) continue; c.beginPath(); c.moveTo(p[0][0], p[0][1]); for (const q of p.slice(1)) c.lineTo(q[0], q[1]); c.strokeStyle = k === 'bridge' ? '#c9955e' : '#efd8a6'; c.lineWidth = k === 'bridge' ? 34 : 28; c.stroke(); }
  if (!bridge) { c.setLineDash([30, 26]); c.beginPath(); c.moveTo(1700, 1519); c.lineTo(1950, 1519); c.strokeStyle = '#c9955e'; c.lineWidth = 18; c.stroke(); c.setLineDash([]); }
  c.beginPath(); c.moveTo(RIVER[0], RIVER[1]); for (let i = 2; i < RIVER.length; i += 2) c.lineTo(RIVER[i], RIVER[i + 1]); c.strokeStyle = '#6cc3cf'; c.lineWidth = 42; c.stroke();
  c.beginPath(); c.ellipse(POND.x, POND.y, POND.rx, POND.ry, 0, 0, TAU); c.fillStyle = '#6cc3cf'; c.fill();
  c.fillStyle = '#c9955e'; c.fillRect(PIER.x, PIER.y, PIER.w, PIER.h);
  c.beginPath(); c.arc(PLAZA.x, PLAZA.y, PLAZA.r, 0, TAU); c.fillStyle = '#ecdcc0'; c.fill();
  c.fillStyle = G.state.nightMarket.restored ? '#f3d9b8' : '#e3d6bd'; c.beginPath(); c.roundRect ? c.roundRect(NM_PLAZA.x, NM_PLAZA.y, NM_PLAZA.w, NM_PLAZA.h, 30) : c.rect(NM_PLAZA.x, NM_PLAZA.y, NM_PLAZA.w, NM_PLAZA.h); c.fill();
  // area names in soft italics
  c.font = 'italic 900 40px Nunito, sans-serif'; c.textAlign = 'center'; c.fillStyle = 'rgba(91,63,54,.35)';
  for (const [x, y, en, vi] of [[520, 1700, 'West Village', 'Xóm Tây'], [1350, 1860, 'East Village', 'Xóm Đông'], [900, 2330, 'Sunny Beach', 'Bãi Biển'], [1520, 980, 'Rice Paddies', 'Ruộng Lúa'], [900, 1060, 'Market Street', 'Phố Chợ'], ...(bridge ? [[2250, 1580, 'Firefly Islet', 'Cù Lao Đom Đóm']] : [])]) c.fillText(T(en, vi), x, y);
  // buildings as little rounded houses with an icon
  const labels = T({ shed1: 'Drinks', shed2: 'Bánh Mì', truck: 'Truck', restaurant: 'Restaurant', house: 'Home', meo: 'Mèo Mây', supermarket: 'Market', materials: 'Materials', furniture: 'Furniture', boutique: 'Boutique', salon: 'Salon', dinh: 'Temple' }, { shed1: 'Quán Nước', shed2: 'Bánh Mì', truck: 'Xe Cuốn', restaurant: 'Nhà Hàng', house: 'Nhà bạn', meo: 'Mèo Mây', supermarket: 'Siêu thị', materials: 'Vật liệu', furniture: 'Nội thất', boutique: 'Tiệm áo', salon: 'Tiệm tóc', dinh: 'Đình' });
  const icons = { shed1: 'tea', shed2: 'banh_mi_thit', truck: 'goi_cuon', restaurant: 'pho_bo', house: 'heart', meo: 'notebook', supermarket: 'bag', materials: 'wood', furniture: 'sofa', boutique: 'shirt', salon: 'scissors', dinh: 'lantern' };
  for (const b of BUILDINGS) {
    if (b.id === 'h_vy' && !bridge) continue;
    const own = G.state.biz[b.id];
    const fill = b.home ? '#e9d6bb' : own ? (own.owned && own.repair >= 1 ? '#f08ca0' : '#c9bdb0') : b.id === 'house' ? '#f2c14e' : b.id === 'meo' ? '#9fb4dc' : '#fff8ea';
    const w = Math.max(90, b.w * 0.9), hh = 70, x = b.x - w / 2, y = b.y - b.fp - 30;
    c.fillStyle = 'rgba(0,0,0,.15)'; c.beginPath(); c.roundRect ? c.roundRect(x + 6, y + 8, w, hh, 16) : c.rect(x + 6, y + 8, w, hh); c.fill();
    c.fillStyle = fill; c.strokeStyle = '#5b3f36'; c.lineWidth = 6; c.beginPath(); c.roundRect ? c.roundRect(x, y, w, hh, 16) : c.rect(x, y, w, hh); c.fill(); c.stroke();
    if (icons[b.id]) { const img = mapIcon(icons[b.id]); if (img.complete) c.drawImage(img, b.x - 28, y + 7, 56, 56); }
    if (labels[b.id]) { c.font = '900 34px Nunito, sans-serif'; c.lineWidth = 9; c.strokeStyle = '#fff8ea'; c.strokeText(labels[b.id], b.x, y - 12); c.fillStyle = '#5b3f36'; c.fillText(labels[b.id], b.x, y - 12); }
  }
  // side quest sparkles
  for (const q of activeQuests()) if (G.state.sideQuests[q.id] === 'active') { c.fillStyle = '#ffd35a'; c.strokeStyle = '#5b3f36'; c.lineWidth = 5; c.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? 14 : 32; c.lineTo(q.x + Math.cos(a) * rr, q.y + Math.sin(a) * rr); } c.closePath(); c.fill(); c.stroke(); }
  // quest target
  const tg = currentStep()?.target?.();
  if (tg && tg.scene === 'island') { c.beginPath(); c.arc(tg.x, tg.y, 40, 0, TAU); c.strokeStyle = '#f2c14e'; c.lineWidth = 12; c.stroke(); c.beginPath(); c.arc(tg.x, tg.y, 60, 0, TAU); c.strokeStyle = 'rgba(242,193,78,.4)'; c.lineWidth = 8; c.stroke(); }
  // you + Mèo Mây
  const pl = G.player, inIsland = G.scene?.id === 'island';
  const pos = inIsland ? pl : (() => { const b = BUILDINGS.find(b => b.interior === G.scene?.id); return b ? { x: b.x, y: b.y } : pl; })();
  if (G.meo && G.scenes.island.actors.includes(G.meo)) { c.beginPath(); c.arc(G.meo.x, G.meo.y, 22, 0, TAU); c.fillStyle = '#9fb4dc'; c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 6; c.stroke(); c.fillStyle = '#5b3f36'; c.font = '900 24px Nunito, sans-serif'; c.fillText('ᵔᴥᵔ', G.meo.x, G.meo.y + 8); }
  c.beginPath(); c.arc(pos.x, pos.y, 44, 0, TAU); c.fillStyle = 'rgba(240,140,160,.3)'; c.fill();
  c.beginPath(); c.arc(pos.x, pos.y, 28, 0, TAU); c.fillStyle = '#f08ca0'; c.fill(); c.lineWidth = 8; c.strokeStyle = '#fff'; c.stroke();
  c.font = '900 36px Nunito, sans-serif'; c.lineWidth = 9; c.strokeStyle = '#fff'; c.strokeText(T('You', 'Bạn'), pos.x, pos.y - 44); c.fillStyle = '#e56b8b'; c.fillText(T('You', 'Bạn'), pos.x, pos.y - 44);
  c.restore();
  c.font = `900 ${12 * dpr}px Nunito, sans-serif`; c.fillStyle = '#fff'; c.textAlign = 'left';
  c.fillText(T('● You  ● Mèo Mây  ○ Goal  ★ Lost item', '● Bạn  ● Mèo Mây  ○ Mục tiêu  ★ Đồ thất lạc'), 12 * dpr, cv.height - 12 * dpr);
}
const MAP_ICONS = {};
function mapIcon(k) { if (!MAP_ICONS[k]) { const img = new Image(); img.src = iconURL(k, 64); MAP_ICONS[k] = img; } return MAP_ICONS[k]; }
export { BUSINESSES };
