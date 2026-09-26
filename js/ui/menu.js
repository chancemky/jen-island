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
import { mountMap } from './worldmap.js';
import { renderOffice } from './office.js';
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

export function openMenu({ onLogout, tab = 0 } = {}) {
  const s = G.state;
  openSheet({ title: s.island.name || 'JEN Island', sub: T(`Day ${s.day} · ${clock(s.time)} · Chapter ${s.story.chapter}: ${CHAPTERS[s.story.chapter]?.title || ''}`, `Ngày ${s.day} · ${clock(s.time)} · Chương ${s.story.chapter}: ${CHAPTERS[s.story.chapter]?.vi || ''}`), full: true, build: (body, api) => {
    tabs(body, [T('Map', 'Bản đồ'), T('Business', 'Kinh doanh'), T('Milestones', 'Cột mốc'), T('Leaderboard', 'Xếp hạng'), T('Settings', 'Cài đặt'), T('Account', 'Tài khoản')], (i, pane) => {
      if (i === 1) return renderOffice(pane, api);
      if (i === 2) return renderMilestones(pane, api);
      if (i === 3) return renderLeaderboard(pane);
      if (i >= 4) i -= 3;
      if (i === 0) {
        pane.style.display = 'flex'; pane.style.flexDirection = 'column';
        const wrap = h('div', 'map-wrap'); pane.appendChild(wrap);
        wrap.style.minHeight = '420px';
        mountMap(wrap);
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
        toggle(T('Smooth 60 FPS (uses more battery)', 'Mượt 60 FPS (tốn pin hơn)'), 'smooth', () => G.renderer?.resize());
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
    }, tab, api);
  } });
}

export { BUSINESSES };
