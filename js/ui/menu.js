// Main menu: island map, journal, settings, save status, account.

import { G, markDirty } from '../systems/state.js';
import { openSheet, tabs, h, btn } from './sheets.js';
import { SAND, GRASS, RIVER, POND, PATHS, BUILDINGS, PLAZA, NM_PLAZA, PIER, W, H } from '../world/island.js';
import { saveStatus, saveLocal, saveCloudNow } from '../systems/save.js';
import { setAudio, sfx } from '../core/audio.js';
import { escapeHtml, clock, TAU } from '../core/util.js';
import { openJournal } from './shops.js';
import { currentStep } from '../systems/story.js';
import { CHAPTERS, BUSINESSES } from '../data/game.js';

export function openMenu({ onLogout } = {}) {
  const s = G.state;
  openSheet({ title: s.island.name || 'JEN Island', sub: `Ngày ${s.day} · ${clock(s.time)} · Chương ${s.story.chapter}: ${CHAPTERS[s.story.chapter]?.vi || ''}`, full: true, build: (body, api) => {
    tabs(body, ['Bản đồ · Map', 'Cài đặt · Settings', 'Tài khoản'], (i, pane) => {
      if (i === 0) {
        pane.style.display = 'flex'; pane.style.flexDirection = 'column';
        const wrap = h('div', 'map-wrap'); const cv = document.createElement('canvas'); wrap.appendChild(cv); pane.appendChild(wrap);
        wrap.style.minHeight = '360px';
        requestAnimationFrame(() => drawMap(cv));
        const j = btn('Kỷ niệm của đảo · Island memories', () => { api.close(true); openJournal(); }, 'btn ghost');
        j.style.marginTop = '10px'; pane.appendChild(j);
      } else if (i === 1) {
        const list = h('div', 'list'); pane.appendChild(list);
        const toggle = (label, key, fn) => {
          const r = h('div', 'row', `<div class="info"><b>${label}</b></div>`);
          r.appendChild(btn(s.settings[key] ? 'Bật · On' : 'Tắt · Off', (b) => { s.settings[key] = !s.settings[key]; b.innerHTML = s.settings[key] ? 'Bật · On' : 'Tắt · Off'; b.className = s.settings[key] ? 'buy' : 'buy alt'; fn?.(); markDirty(true); sfx('ui'); }, s.settings[key] ? 'buy' : 'buy alt'));
          list.appendChild(r);
        };
        toggle('Nhạc nền · Music', 'music', () => setAudio({ music: s.settings.music }));
        toggle('Âm thanh · Sound effects', 'sfx', () => setAudio({ sfx: s.settings.sfx }));
        toggle('Mũi tên chỉ đường · Quest arrow', 'arrow');
      } else {
        const list = h('div', 'list'); pane.appendChild(list);
        const ago = t => t ? Math.max(0, Math.round((Date.now() - t) / 1000)) + 's ago' : '—';
        list.appendChild(h('div', 'row', `<div class="info"><b>${escapeHtml(G.user?.email || 'Local player')}</b><small>${G.user?.local ? 'Offline test profile (localhost only)' : 'Signed in · progress saves to the cloud'}</small></div>`));
        list.appendChild(h('div', 'row', `<div class="info"><b>Lưu game · Saves</b><small>On this device: ${ago(saveStatus.localAt)}<br>Cloud: ${saveStatus.offline ? 'offline — will retry' : ago(saveStatus.cloudAt)}</small></div>`));
        const sv = btn('Lưu ngay · Save now', async (b) => { saveLocal(); b.innerHTML = 'Đang lưu…'; await saveCloudNow(); b.innerHTML = saveStatus.offline ? 'Offline — saved locally' : 'Đã lưu ✓'; sfx('success'); }, 'btn');
        pane.appendChild(sv);
        if (onLogout) { const lo = btn('Đăng xuất · Sign out', () => { api.close(true); onLogout(); }, 'btn ghost'); lo.style.marginTop = '10px'; pane.appendChild(lo); }
      }
    });
  } });
}

function drawMap(cv) {
  const r = cv.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
  cv.width = r.width * dpr; cv.height = r.height * dpr;
  const c = cv.getContext('2d');
  const s = Math.min(r.width / (W - 100), r.height / (H - 200)) * dpr;
  c.fillStyle = '#5ec2cf'; c.fillRect(0, 0, cv.width, cv.height);
  c.save();
  c.translate(cv.width / 2 - (W / 2) * s, cv.height / 2 - (H / 2 + 60) * s);
  c.scale(s, s);
  const poly = (p, fill) => { c.beginPath(); c.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) c.lineTo(p[i], p[i + 1]); c.closePath(); c.fillStyle = fill; c.fill(); };
  poly(SAND, '#f5e2b3'); poly(GRASS, '#a3d68a');
  c.lineCap = 'round'; c.lineJoin = 'round';
  for (const p of Object.values(PATHS)) { c.beginPath(); c.moveTo(p[0][0], p[0][1]); for (const q of p.slice(1)) c.lineTo(q[0], q[1]); c.strokeStyle = '#efd8a6'; c.lineWidth = 30; c.stroke(); }
  c.beginPath(); c.moveTo(RIVER[0], RIVER[1]); for (let i = 2; i < RIVER.length; i += 2) c.lineTo(RIVER[i], RIVER[i + 1]); c.strokeStyle = '#6cc3cf'; c.lineWidth = 42; c.stroke();
  c.beginPath(); c.ellipse(POND.x, POND.y, POND.rx, POND.ry, 0, 0, TAU); c.fillStyle = '#6cc3cf'; c.fill();
  c.fillStyle = '#c9955e'; c.fillRect(PIER.x, PIER.y, PIER.w, PIER.h);
  c.beginPath(); c.arc(PLAZA.x, PLAZA.y, PLAZA.r, 0, TAU); c.fillStyle = '#ecdcc0'; c.fill();
  c.fillStyle = '#e3d6bd'; c.fillRect(NM_PLAZA.x, NM_PLAZA.y, NM_PLAZA.w, NM_PLAZA.h);
  const labels = { shed1: 'Quán Nước', shed2: 'Bánh Mì', truck: 'Xe Cuốn', restaurant: 'Nhà Hàng', house: 'Nhà bạn', meo: 'Mèo Mây', supermarket: 'Siêu thị', materials: 'Vật liệu', furniture: 'Nội thất', dinh: 'Đình' };
  for (const b of BUILDINGS) {
    const own = G.state.biz[b.id];
    c.fillStyle = b.home ? '#d9c3a5' : own ? (own.owned && own.repair >= 1 ? '#f08ca0' : '#b3a79a') : b.id === 'house' ? '#f2c14e' : b.id === 'meo' ? '#9fb4dc' : '#fff8ea';
    c.strokeStyle = '#5b3f36'; c.lineWidth = 5;
    c.beginPath(); c.roundRect ? c.roundRect(b.x - b.w / 2, b.y - b.fp - 20, b.w, b.fp + 20, 10) : c.rect(b.x - b.w / 2, b.y - b.fp - 20, b.w, b.fp + 20); c.fill(); c.stroke();
    if (labels[b.id]) { c.font = '900 30px Nunito, sans-serif'; c.textAlign = 'center'; c.lineWidth = 7; c.strokeStyle = '#fff8ea'; c.strokeText(labels[b.id], b.x, b.y - b.fp - 34); c.fillStyle = '#5b3f36'; c.fillText(labels[b.id], b.x, b.y - b.fp - 34); }
  }
  c.font = '900 34px Nunito, sans-serif'; c.textAlign = 'center';
  c.fillStyle = G.state.nightMarket.restored ? '#e8584e' : '#8a7a6e'; c.fillText('Chợ Đêm', NM_PLAZA.x + NM_PLAZA.w / 2, NM_PLAZA.y + NM_PLAZA.h / 2);
  // quest target
  const tg = currentStep()?.target?.();
  if (tg && tg.scene === 'island') { c.beginPath(); c.arc(tg.x, tg.y, 34, 0, TAU); c.strokeStyle = '#f2c14e'; c.lineWidth = 10; c.stroke(); }
  // you + Mèo Mây
  const pl = G.player, inIsland = G.scene?.id === 'island';
  const pos = inIsland ? pl : (() => { const b = BUILDINGS.find(b => b.interior === G.scene?.id); return b ? { x: b.x, y: b.y } : pl; })();
  c.beginPath(); c.arc(pos.x, pos.y, 26, 0, TAU); c.fillStyle = '#f08ca0'; c.fill(); c.lineWidth = 7; c.strokeStyle = '#fff'; c.stroke();
  if (G.meo && G.scenes.island.actors.includes(G.meo)) { c.beginPath(); c.arc(G.meo.x, G.meo.y, 18, 0, TAU); c.fillStyle = '#9fb4dc'; c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 5; c.stroke(); }
  c.restore();
  c.font = `900 ${12 * dpr}px Nunito, sans-serif`; c.fillStyle = '#fff'; c.textAlign = 'left';
  c.fillText('● Bạn  ● Mèo Mây  ○ Mục tiêu', 12 * dpr, cv.height - 12 * dpr);
}
export { BUSINESSES };
