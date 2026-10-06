// Main menu: island map, journal, settings, save status, account.

import { G, T, setLang, markDirty } from '../systems/state.js';
import { openSheet, tabs, h, btn, showReward } from './sheets.js';
import { DEV_TOOLS } from '../dev/flag.js';
import { saveStatus, saveLocal, saveCloudNow, resetGame, forgetLocal, adoptLocalSave } from '../systems/save.js';
import { askText } from './naming.js';
import { showAuth } from './auth.js';
import { chooseIsland } from './conflict.js';
import { setAudio, sfx } from '../core/audio.js';
import { escapeHtml, clock, money, moneyPair, moneyShort } from '../core/util.js';
import { openJournal } from './shops.js';
import { CHAPTERS, FURNITURE } from '../data/game.js';
import { TRACKS, trackState, claimMilestone, xpNeed, trackGift, leaderboardRow } from '../systems/progress.js';
import { CLOTHES } from '../data/wardrobe.js';
import { renderChangelog } from './whatsnew.js';
import { iconURL } from '../gfx/food.js';
import { mountMap } from './worldmap.js';
import { renderOffice } from './office.js';
import * as cloud from '../systems/cloud.js';
import { storeVisible } from '../systems/store.js';
import { renderStore } from './store.js';
import { toast } from './hud.js';
import { BADGES, TIER_ORDER } from '../data/badges.js';
import { hasBadge, showcaseBadge, setShowcase } from '../systems/badges.js';
import { weeklyGoals, claimGoal, goalReward } from '../systems/weekly.js';
import { myCode, visitFriend, sendGift, GIFTS } from '../systems/social.js';

// Friends: your code, add a friend, visit their home, send a daily gift
function renderFriends(pane, api) {
  if (!cloud.hasSession() || G.user?.local) { pane.appendChild(h('div', 'empty-note', T('Make a free account in Menu → Account to add friends, visit their homes and send gifts.', 'Tạo tài khoản miễn phí ở Menu → Tài khoản để kết bạn, thăm nhà nhau và tặng quà.'))); return; }
  const code = myCode();
  const me = h('div', 'row', `<div class="info"><b>${T('Your friend code', 'Mã kết bạn của bạn')}: <span class="friend-code">${escapeHtml(code || '…')}</span></b><small>${T('Share it with a friend so they can add you.', 'Gửi mã cho bạn bè để họ kết bạn với bạn.')}</small></div>`);
  if (code) me.appendChild(btn(T('Copy', 'Sao chép'), b => { navigator.clipboard?.writeText(code).then(() => { b.textContent = T('Copied ✓', 'Đã chép ✓'); }).catch(() => {}); sfx('ui'); }, 'buy alt'));
  pane.appendChild(me);
  const add = h('div', 'row', `<div class="info"><b>${T('Add a friend', 'Thêm bạn')}</b><label class="field" style="margin:6px 0 0"><input class="fcode" maxlength="6" autocapitalize="characters" autocomplete="off" placeholder="${T('Their code', 'Mã của bạn ấy')}"></label></div>`);
  add.appendChild(btn(T('Add', 'Thêm'), async b => {
    const v = add.querySelector('.fcode').value.trim().toUpperCase(); if (v.length !== 6) { sfx('error'); return; }
    b.disabled = true;
    const id = await cloud.addFriend(v).catch(() => null);
    if (id) { sfx('success'); toast({ text: T('Friend added!', 'Đã kết bạn!'), icon: 'heart' }); api.rebuild(); } else { sfx('error'); toast({ text: T('No island with that code', 'Không có đảo nào với mã này'), bad: true }); b.disabled = false; }
  }, 'buy'));
  pane.appendChild(add);
  const list = h('div', 'list'); list.innerHTML = `<div class="empty-note">${T('Loading your friends…', 'Đang tải bạn bè…')}</div>`; pane.appendChild(list);
  Promise.all([cloud.listFriends(), cloud.giftsSentToday()]).then(([friends, sent]) => {
    list.innerHTML = '';
    if (!friends?.length) { list.appendChild(h('div', 'empty-note', T('No friends yet. Share your code!', 'Chưa có bạn bè. Chia sẻ mã của bạn nhé!'))); return; }
    const gave = new Set((sent || []).map(r => r.to_id));
    for (const f of friends) {
      const b = f.badge && BADGES[f.badge];
      const ago = Math.round((Date.now() - Date.parse(f.updated_at)) / 36e5), seen = ago < 1 ? T('online recently', 'vừa chơi gần đây') : ago < 48 ? T(`${ago}h ago`, `${ago} giờ trước`) : T(`${Math.round(ago / 24)} days ago`, `${Math.round(ago / 24)} ngày trước`);
      const r = h('div', 'row', `<div class="info"><b>${b ? `<span class="badge-mini t-${b.tier}">${b.glyph}</span>` : ''}${escapeHtml(f.player_name || '?')}</b><small>${escapeHtml(f.island_name || '')} · ${T('Lv', 'Cấp')} ${f.level} · ${T('Day', 'Ngày')} ${f.day} · ${seen}</small></div>`);
      const col = h('div'); col.style.cssText = 'display:flex;flex-direction:column;gap:6px';
      col.appendChild(btn(T('Visit', 'Thăm'), async () => { api.close(true); if (!(await visitFriend(f.user_id))) toast({ text: T('Could not reach their island', 'Không tới được đảo của bạn ấy'), bad: true }); }, 'buy'));
      col.appendChild(btn(gave.has(f.user_id) ? T('Gift sent ✓', 'Đã tặng ✓') : T('Send gift', 'Tặng quà'), async gb => {
        const kinds = Object.keys(GIFTS), kind = kinds[Math.floor(Math.random() * kinds.length)];
        gb.disabled = true;
        try { await sendGift(f.user_id, kind); sfx('success'); gb.textContent = T('Gift sent ✓', 'Đã tặng ✓'); toast({ text: T(`You sent ${f.player_name} ${GIFTS[kind].en}`, `Bạn đã tặng ${f.player_name} ${GIFTS[kind].vi}`), icon: GIFTS[kind].icon }); }
        catch { sfx('error'); toast({ text: T('One gift per friend each day', 'Mỗi ngày một món quà cho mỗi người bạn'), bad: true }); }
      }, 'buy alt', gave.has(f.user_id)));
      r.appendChild(col); list.appendChild(r);
    }
  }).catch(() => { list.innerHTML = `<div class="empty-note">${T('Could not reach the server. Check your connection.', 'Không kết nối được máy chủ. Kiểm tra mạng nhé.')}</div>`; });
}
// this week's three island goals (systems/weekly.js)
function renderWeekly(pane, api) {
  const goals = weeklyGoals(), r = goalReward();
  pane.appendChild(h('div', 'section-title', T('This week\'s island goals', 'Mục tiêu tuần này')));
  for (const g of goals) {
    const fmt = n => g.money ? money(n) : n, pct = Math.round(g.have / g.target * 100);
    const row = h('div', 'ms-row' + (g.done && !g.claimed ? ' ready' : ''), `<img src="${iconURL(g.icon, 48)}" alt=""><div class="ms-info"><b>${escapeHtml(g.label(fmt(g.target)))}</b><small>${g.claimed ? T('Claimed ✓', 'Đã nhận ✓') : `${fmt(g.have)} / ${fmt(g.target)} · ${T(`reward ${money(r.money)} + ${r.xp} XP`, `thưởng ${money(r.money)} + ${r.xp} KN`)}`}</small><div class="ms-bar"><i style="width:${pct}%"></i></div></div>`);
    if (g.done && !g.claimed) row.appendChild(btn(T('Claim', 'Nhận'), () => {
      const got = claimGoal(g.id); if (!got) return;
      sfx('coin'); toast({ text: T(`+${money(got.money)} · +${got.xp} XP`, `+${money(got.money)} · +${got.xp} KN`), icon: 'coin' });
      if (got.chest) { sfx('fanfare'); toast({ text: got.chest, icon: 'heart', cls: 'ach', ms: 4200 }); }
      api.rebuild();
    }, 'buy'));
    pane.appendChild(row);
  }
  pane.appendChild(h('div', 'empty-note', T('New goals every Monday. Finish all three for a weekly chest.', 'Mục tiêu mới mỗi thứ Hai. Hoàn thành cả ba để nhận rương tuần.')));
}
// badges: earned ones in colour, the rest greyed with what they need; tap one you've
// earned to show it beside your name on the leaderboard
function renderBadges(pane, api) {
  const ids = Object.keys(BADGES).sort((a, b) => TIER_ORDER.indexOf(BADGES[a].tier) - TIER_ORDER.indexOf(BADGES[b].tier));
  const got = ids.filter(hasBadge), shown = showcaseBadge();
  pane.appendChild(h('div', 'section-title', T(`Badges · ${got.length} / ${ids.length}`, `Huy hiệu · ${got.length} / ${ids.length}`)));
  const grid = h('div', 'badge-grid'); pane.appendChild(grid);
  for (const id of ids) {
    const b = BADGES[id], own = hasBadge(id);
    const el = h('button', `badge t-${b.tier}${own ? '' : ' locked'}${id === shown ? ' shown' : ''}`, `<span class="glyph">${own ? b.glyph : '🔒'}</span><b>${escapeHtml(T(b.en, b.vi))}</b><small>${escapeHtml(T(b.need[0], b.need[1]))}</small>`);
    el.type = 'button';
    el.onclick = () => { if (!own) { sfx('error'); return; } setShowcase(id); sfx('success'); toast({ text: T(`${b.en} now shows beside your name`, `${b.vi} giờ hiện cạnh tên bạn`), icon: 'star' }); api.rebuild(); };
    grid.appendChild(el);
  }
  pane.appendChild(h('div', 'empty-note', T('Tap a badge you\'ve earned to show it on the leaderboard.', 'Chạm huy hiệu đã có để hiện trên bảng xếp hạng.')));
}
function renderMilestones(pane, api) {
  const s = G.state;
  const lv = s.level || 1;
  const head = h('div', 'ms-row', `<img src="${iconURL('trophy', 48)}" alt=""><div class="ms-info"><b>${T(`Level ${lv}`, `Cấp ${lv}`)}</b><small>${T(`${Math.floor(s.xp || 0)} / ${xpNeed(lv)} XP to level ${lv + 1}`, `${Math.floor(s.xp || 0)} / ${xpNeed(lv)} KN để lên cấp ${lv + 1}`)}</small><div class="ms-bar"><i style="width:${Math.min(100, (s.xp || 0) / xpNeed(lv) * 100)}%"></i></div></div>`);
  pane.appendChild(head);
  renderWeekly(pane, api);
  renderBadges(pane, api);
  const list = TRACKS.map(tr => ({ tr, st: trackState(tr) })).sort((a, b) => b.st.ready - a.st.ready || a.st.completed - b.st.completed);
  const done = list.filter(x => x.st.completed).length;
  if (done) pane.appendChild(h('div', 'empty-note', T(`${done} milestone${done > 1 ? 's' : ''} completed ✓`, `Đã hoàn thành ${done} cột mốc ✓`)));
  for (const { tr, st } of list) {
    const fmt = v => tr.money ? money(v) : v;
    const gift = st.completed ? null : trackGift(tr, st.claimed);
    const giftName = gift?.furniture ? T(FURNITURE[gift.furniture]?.en, FURNITURE[gift.furniture]?.vi) : gift?.clothes ? T(CLOTHES[gift.clothes]?.en, CLOTHES[gift.clothes]?.vi) : '';
    const earnedNote = tr.id === 'earned' ? `<br>${T('Not cash in hand', 'Không phải tiền trong ví')}` : '';
    if (st.completed) {
      pane.appendChild(h('div', 'ms-row done', `<img src="${iconURL(tr.icon, 48)}" alt=""><div class="ms-info"><b>${escapeHtml(T(tr.en, tr.vi))} <span class="ms-badge">✓ ${T('COMPLETED', 'HOÀN THÀNH')}</span></b><small>${fmt(st.val)} · ${T(`all ${st.total} tiers`, `cả ${st.total} bậc`)}${earnedNote}</small><div class="ms-bar"><i style="width:100%"></i></div></div>`));
      continue;
    }
    const k = Math.min(1, (st.val - st.prev) / Math.max(1, st.target - st.prev));
    const tierTxt = st.total ? T(`tier ${st.claimed + 1} of ${st.total}`, `bậc ${st.claimed + 1}/${st.total}`) : T(`tier ${st.claimed + 1}`, `bậc ${st.claimed + 1}`);
    const progress = tr.money
      ? st.val < st.target ? moneyShort(st.val, st.target, T) : moneyPair(Math.min(st.val, st.target), st.target)
      : `${fmt(Math.min(st.val, st.target))} / ${fmt(st.target)}`;
    const row = h('div', 'ms-row' + (st.ready ? ' ready' : ''), `<img src="${iconURL(tr.icon, 48)}" alt=""><div class="ms-info"><b>${escapeHtml(T(tr.en, tr.vi))}</b><small>${st.ready ? T('Goal reached — claim your reward!', 'Đã đạt mục tiêu — nhận thưởng nào!') : `${T('Next goal', 'Mục tiêu kế tiếp')}: ${progress}`} · ${tierTxt}${giftName ? ` · 🎁 ${escapeHtml(giftName)}` : ''}${earnedNote}</small><div class="ms-bar"><i style="width:${(Math.max(0, k) * 100).toFixed(1)}%"></i></div></div>`);
    if (st.ready) row.appendChild(btn(T('Claim', 'Nhận'), () => {
      const r = claimMilestone(tr.id); if (!r) return; sfx('fanfare');
      const extra = [r.gift ? T(`🎁 ${r.gift}`, `🎁 ${r.gift}`) : '', r.completed ? T('✓ Completed!', '✓ Hoàn thành!') : ''].filter(Boolean).join(' · ');
      showReward({ icon: tr.icon, kicker: meoCheer(r.completed), title: r.completed ? T('Milestone completed!', 'Hoàn thành cột mốc!') : T('Milestone!', 'Cột mốc!'), text: T(`${tr.en}: ${fmt(st.target)}`, `${tr.vi}: ${fmt(st.target)}`) + (extra ? '\n' + extra : ''), sub: `+${money(r.money)} · +${r.xp} XP` }).then(() => api.rebuild());
    }, 'buy pink'));
    pane.appendChild(row);
  }
}
// Mèo Mây has an opinion about every milestone
function meoCheer(completed) {
  const L = completed
    ? [['Mèo Mây: "All of them?! I\'m writing this in my notebook. In gold ink."', 'Mèo Mây: "Hết luôn rồi á?! Mình ghi vào sổ tay. Bằng mực vàng."'], ['Mèo Mây: "Completed! I\'m doing my victory spin. You can\'t see it, but it\'s beautiful."', 'Mèo Mây: "Hoàn thành! Mình đang xoay vòng chiến thắng. Bạn không thấy, nhưng đẹp lắm."']]
    : [['Mèo Mây: "Another one! My tail is doing the happy thing."', 'Mèo Mây: "Thêm một cái nữa! Đuôi mình đang vẫy vui nè."'], ['Mèo Mây: "I knew you could. I said so to a seagull this morning."', 'Mèo Mây: "Mình biết bạn làm được mà. Sáng nay mình còn kể với con hải âu."'], ['Mèo Mây: "Proud of you. Also, is that fish I smell? No? Still proud."', 'Mèo Mây: "Tự hào về bạn. Mà có mùi cá không? Không à? Vẫn tự hào."']];
  const p = L[Math.floor(Math.random() * L.length)];
  return T(p[0], p[1]);
}

function renderLeaderboard(pane) {
  const seg = h('div', 'seg lb-seg');
  const box = h('div', '');
  const sorts = [['level', T('Level', 'Cấp độ')], ['money', T('Money', 'Tiền')], ['served', T('Served', 'Khách')]];
  let cur = 'level';
  const load = async () => {
    [...seg.children].forEach((b, i) => b.classList.toggle('on', sorts[i][0] === cur));
    box.innerHTML = `<div class="empty-note">${T('Loading the island rankings…', 'Đang tải bảng xếp hạng…')}</div>`;
    if (!cloud.hasSession()) { box.innerHTML = `<div class="empty-note">${(G.user?.guest ? T('Create a free account in Menu → Account to join the global leaderboard.', 'Tạo tài khoản miễn phí ở Menu → Tài khoản để lên bảng xếp hạng toàn cầu.') : T('Sign in to see the global leaderboard.', 'Đăng nhập để xem bảng xếp hạng toàn cầu.'))}</div>`; return; }
    try {
      await cloud.pushLeaderboard(leaderboardRowNow()).catch(() => {});
      const rows = await cloud.fetchLeaderboard(cur);
      if (!rows?.length) { box.innerHTML = `<div class="empty-note">${T('No one here yet. Be the first!', 'Chưa có ai. Hãy là người đầu tiên!')}</div>`; return; }
      box.innerHTML = rows.map(r => `<div class="lb-row${r.is_me ? ' me' : ''}"><div class="lb-rank g${r.rank}">${r.rank <= 3 ? ['🥇', '🥈', '🥉'][r.rank - 1] : '#' + r.rank}</div><div class="lb-name"><b>${r.badge && BADGES[r.badge] ? `<span class="badge-mini t-${BADGES[r.badge].tier}" title="${escapeHtml(T(BADGES[r.badge].en, BADGES[r.badge].vi))}">${BADGES[r.badge].glyph}</span>` : ''}${escapeHtml(r.player_name)}${r.is_me ? T(' (you)', ' (bạn)') : ''}</b><small>${escapeHtml(r.island_name || '')} · ${T('Day', 'Ngày')} ${r.day}</small></div><div class="lb-val">${T('Lv', 'Cấp')} ${r.level}<small>${money(r.money)} · ${r.served} ${T('served', 'khách')}</small></div></div>`).join('');
    } catch (e) { box.innerHTML = `<div class="empty-note">${T('Could not reach the leaderboard. Check your connection.', 'Không kết nối được bảng xếp hạng. Kiểm tra mạng nhé.')}</div>`; }
  };
  for (const [k, label] of sorts) { const b = h('button', '', label); b.type = 'button'; b.onclick = () => { sfx('ui'); cur = k; load(); }; seg.appendChild(b); }
  pane.append(seg, box);
  load();
}
const leaderboardRowNow = () => ({ ...leaderboardRow(G.state), badge: showcaseBadge() });

export function openMenu({ onLogout, tab = 0 } = {}) {
  const s = G.state;
  openSheet({ title: s.island.name || 'Bistro Island', sub: T(`Day ${s.day} · ${clock(s.time)} · Chapter ${s.story.chapter}: ${CHAPTERS[s.story.chapter]?.title || ''}`, `Ngày ${s.day} · ${clock(s.time)} · Chương ${s.story.chapter}: ${CHAPTERS[s.story.chapter]?.vi || ''}`), full: true, build: (body, api) => {
    const shop = storeVisible();
    const ti = (label, icon) => ({ label, icon });
    tabs(body, [ti(T('Map', 'Bản đồ'), 'map'), ti(T('Business', 'Kinh doanh'), 'coin'), ti(T('Goals', 'Mục tiêu'), 'trophy'), ti(T('Ranks', 'Xếp hạng'), 'star'), ti(T('Settings', 'Cài đặt'), 'menu'), ti(T('Account', 'Tài khoản'), 'person'), ti(T('Friends', 'Bạn bè'), 'talk'), ...(shop ? [ti(T('Support', 'Ủng hộ'), 'heart')] : []), ...(DEV_TOOLS ? [ti('Dev', 'hammer')] : [])], (i, pane) => {
      if (i === 6) return renderFriends(pane, api);
      if (shop && i === 7) return renderStore(pane);
      if (DEV_TOOLS && i === (shop ? 8 : 7)) { import('../dev/devtools.js').then(m => m.renderDevPane(pane, api)); return; }   // testing only — see js/dev/flag.js
      if (i === 1) return renderOffice(pane, api);
      if (i === 2) return renderMilestones(pane, api);
      if (i === 3) return renderLeaderboard(pane);
      if (i >= 4) i -= 3;
      if (i === 0) {
        pane.style.display = 'flex'; pane.style.flexDirection = 'column';
        const wrap = h('div', 'map-wrap'); pane.appendChild(wrap);
        wrap.style.minHeight = '420px';
        mountMap(wrap);
        const j = btn(T('📖 Chapters & story', '📖 Các chương & câu chuyện'), () => { api.close(true); openJournal(); }, 'btn ghost');
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
        toggle(T('Share anonymous stats & error reports', 'Gửi thống kê ẩn danh & báo lỗi'), 'stats');
        // start over: a brand-new island, back on the boat (with a confirmation)
        const rs = btn(T('Reset game…', 'Chơi lại từ đầu…'), () => confirmReset(api), 'btn ghost danger'); rs.style.marginTop = '10px'; pane.appendChild(rs);
        pane.appendChild(h('div', 'section-title', T("What's new (last 20 updates)", 'Có gì mới (20 bản cập nhật gần nhất)')));
        renderChangelog(pane);
      } else {
        const list = h('div', 'list'); pane.appendChild(list);
        const ago = t => t ? T(`${Math.max(0, Math.round((Date.now() - t) / 1000))}s ago`, `${Math.max(0, Math.round((Date.now() - t) / 1000))} giây trước`) : '—';
        const guest = !!G.user?.guest;
        list.appendChild(h('div', 'row', `<div class="info"><b>${escapeHtml(guest ? T('Guest island', 'Đảo khách') : G.user?.email || T('Local player', 'Người chơi cục bộ'))}</b><small>${guest ? T('Saved on this device only. Make an account to keep it safe and join the leaderboard.', 'Chỉ lưu trên máy này. Tạo tài khoản để giữ an toàn và lên bảng xếp hạng.') : G.user?.local ? T('Offline test profile (localhost only)', 'Hồ sơ thử nghiệm ngoại tuyến') : T('Signed in · progress saves to the cloud', 'Đã đăng nhập · tiến trình được lưu lên mây')}</small></div>`));
        if (guest) {
          const mk = btn(T('Create account — keep my island', 'Tạo tài khoản — giữ hòn đảo của tôi'), () => linkAccount(api, 'signup'), 'btn big pink'); pane.appendChild(mk);
          const li = btn(T('Log in to an existing account', 'Đăng nhập tài khoản có sẵn'), () => linkAccount(api, 'login'), 'btn ghost'); li.style.marginTop = '8px'; pane.appendChild(li);
        }
        // names (shown on your house, your island and the leaderboard)
        const names = h('div', 'list'); names.style.marginTop = '10px'; pane.appendChild(names);
        for (const [key, label, max] of [['player', T('Your name', 'Tên của bạn'), 14], ['island', T('Island name', 'Tên hòn đảo'), 16]]) {
          const r = h('div', 'row', `<div class="info"><b>${escapeHtml(label)}</b><small>${escapeHtml(G.state[key].name || '—')}</small></div>`);
          r.appendChild(btn(T('Change', 'Đổi'), async () => {
            const v = await askText({ title: label, max, value: G.state[key].name || '' });
            G.state[key].name = v; if (key === 'player' && G.player) G.player.name = v;
            markDirty(true); sfx('success');
            if (cloud.hasSession()) cloud.saveProfile(G.state.player.name, G.state.island.name).catch(() => {});
            api.rebuild();
          }, 'buy alt'));
          names.appendChild(r);
        }
        const saveRow = h('div', 'row');
        const renderSaveRow = () => {
          const cloudState = saveStatus.error ? escapeHtml(saveStatus.error) : saveStatus.offline ? T('offline — will retry', 'mất kết nối — sẽ thử lại') : saveStatus.cloudAt ? ago(saveStatus.cloudAt) : T('not saved to cloud', 'chưa lưu lên mây');
          saveRow.innerHTML = `<div class="info"><b>${T('Saves', 'Lưu game')}</b><small>${T('On this device', 'Trên máy này')}: ${ago(saveStatus.localAt)}<br>${T('Cloud', 'Đám mây')}: ${cloudState}</small></div>`;
        };
        renderSaveRow(); list.appendChild(saveRow);
        const sv = btn(T('Save now', 'Lưu ngay'), async (b) => { saveLocal(); b.innerHTML = T('Saving…', 'Đang lưu…'); const cloudAt = saveStatus.cloudAt; await saveCloudNow(); renderSaveRow(); const saved = saveStatus.cloudAt !== cloudAt; b.textContent = saved ? T('Saved ✓', 'Đã lưu ✓') : T('Not saved to cloud', 'Chưa lưu lên mây'); sfx(saved ? 'success' : 'error'); }, 'btn');
        pane.appendChild(sv);
        if (saveStatus.recovered) pane.appendChild(h('div', 'empty-note', T(`Save recovery: ${saveStatus.recovered}.`, `Khôi phục dữ liệu: ${saveStatus.recovered}.`)));
        if (onLogout) { const lo = btn(T('Sign out', 'Đăng xuất'), () => { api.close(true); onLogout(); }, 'btn ghost'); lo.style.marginTop = '10px'; pane.appendChild(lo); }
        if (G.user && !G.user.local && cloud.hasSession()) { const del = btn(T('Delete account…', 'Xóa tài khoản…'), () => confirmDelete(api), 'btn ghost danger'); del.style.marginTop = '10px'; pane.appendChild(del); }
        const legal = h('div', 'empty-note', `<a href="privacy.html" target="_blank" rel="noopener">${T('Privacy policy', 'Chính sách bảo mật')}</a> · <a href="terms.html" target="_blank" rel="noopener">${T('Terms', 'Điều khoản')}</a>`); legal.style.marginTop = '12px'; pane.appendChild(legal);
      }
    }, tab, api);
  } });
}

// A guest makes (or logs in to) an account. A new account takes this island along; an
// existing account that already has an island asks which one to keep.
async function linkAccount(api, start) {
  const guestId = G.user.id;
  api.close(true);
  const user = await showAuth({ start, cancellable: true });
  if (!user) return;
  let keepThis = true;
  const remote = await cloud.loadCloud().catch(() => null);
  if (remote) keepThis = await chooseIsland(G.state, remote, { why: T('This account already has an island. The one you don\'t pick will be replaced.', 'Tài khoản này đã có một hòn đảo. Hòn đảo bạn không chọn sẽ bị thay thế.'), cloudLabel: T('The account\'s island', 'Đảo trong tài khoản') }) === 'here';
  if (keepThis) adoptLocalSave(guestId, user.id);
  cloud.forgetGuest();
  location.reload();
}
// Delete account: erases the island from the cloud and this device, then signs out.
function confirmDelete(api) {
  sfx('ui');
  const el = h('div', 'modal');
  el.innerHTML = `<div class="card"><h2>${T('Delete your account?', 'Xóa tài khoản?')}</h2>
    <p style="font-weight:800;line-height:1.4">${T('Your island, your saves, your daily history and your leaderboard place will be permanently erased from our servers and this device. This cannot be undone.', 'Hòn đảo, dữ liệu lưu, lịch sử từng ngày và thứ hạng của bạn sẽ bị xóa vĩnh viễn khỏi máy chủ và thiết bị này. Không thể hoàn tác.')}</p>
    <p class="del-err" style="display:none;color:#e0605a;font-weight:800"></p>
    <div style="display:flex;gap:8px;margin-top:12px"><button type="button" class="btn ghost" data-a="no" style="flex:1">${T('Keep my account', 'Giữ tài khoản')}</button><button type="button" class="btn pink" data-a="yes" style="flex:1">${T('Delete forever', 'Xóa vĩnh viễn')}</button></div></div>`;
  document.getElementById('app').appendChild(el);
  el.querySelector('[data-a="no"]').onclick = () => { sfx('back'); el.remove(); };
  el.querySelector('[data-a="yes"]').onclick = async (e) => {
    const b = e.target; b.disabled = true; b.textContent = T('Deleting…', 'Đang xóa…');
    const uid = G.user.id;
    try { await cloud.deleteAccount(); }
    catch { b.disabled = false; b.textContent = T('Delete forever', 'Xóa vĩnh viễn'); const err = el.querySelector('.del-err'); err.textContent = T('Could not reach the server. Check your connection and try again.', 'Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.'); err.style.display = ''; return; }
    G.user = null;                                    // (stops every save from here on)
    forgetLocal(uid);
    await cloud.signOut();
    api.close(true);
    location.reload();
  };
}

// "Are you sure?" before wiping everything
function confirmReset(api) {
  sfx('ui');
  const el = h('div', 'modal');
  el.innerHTML = `<div class="card"><h2>${T('Start over?', 'Chơi lại từ đầu?')}</h2>
    <p style="font-weight:800;line-height:1.4">${T('Your island, money, shops, furniture, pets and every chapter will be erased. You will be back on the boat heading to the island with nothing. This cannot be undone.', 'Hòn đảo, tiền, các quán, nội thất, thú cưng và mọi chương sẽ bị xóa hết. Bạn sẽ quay lại trên chiếc thuyền đang tới đảo với hai bàn tay trắng. Không thể hoàn tác.')}</p>
    <div style="display:flex;gap:8px;margin-top:12px"><button type="button" class="btn ghost" data-a="no" style="flex:1">${T('Keep playing', 'Chơi tiếp')}</button><button type="button" class="btn pink" data-a="yes" style="flex:1">${T('Yes, reset', 'Đồng ý, chơi lại')}</button></div></div>`;
  document.getElementById('app').appendChild(el);
  el.querySelector('[data-a="no"]').onclick = () => { sfx('back'); el.remove(); };
  el.querySelector('[data-a="yes"]').onclick = async (e) => {
    e.target.disabled = true; e.target.textContent = T('Resetting…', 'Đang xóa…');
    await resetGame();
    api.close(true);
    location.reload();
  };
}

