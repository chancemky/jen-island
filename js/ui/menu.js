// Main menu: island map, journal, settings, save status, account.

import { G, T, setLang, markDirty } from '../systems/state.js';
import { openSheet, tabs, h, btn, showReward, rowEl } from './sheets.js';
import { DEV_TOOLS } from '../dev/flag.js';
import { saveStatus, saveLocal, saveCloudNow, resetGame, forgetLocal, adoptLocalSave } from '../systems/save.js';
import { askText } from './naming.js';
import { showAuth } from './auth.js';
import { chooseIsland } from './conflict.js';
import { setAudio, sfx } from '../core/audio.js';
import { escapeHtml, clock, money, moneyPair, moneyShort, nativeApp } from '../core/util.js';
import { setHaptics } from '../core/haptics.js';
import { applyComfort } from './comfort.js';
import { openJournal, renderAchievements } from './shops.js';
import { CHAPTERS, FURNITURE, BUSINESSES, RECIPES, bizName } from '../data/game.js';
import { TRACKS, trackState, claimMilestone, xpNeed, trackGift, leaderboardRow } from '../systems/progress.js';
import { CLOTHES } from '../data/wardrobe.js';
import { renderChangelog } from './whatsnew.js';
import { iconURL } from '../gfx/food.js';
import { mountMap } from './worldmap.js';
import { renderOffice } from './office.js';
import * as cloud from '../systems/cloud.js';
import { CLOUD } from '../systems/cloud.js';
import { storeVisible, STORE } from '../systems/store.js';
import { renderStore, renderSeason } from './store.js';
import { toast } from './hud.js';
import { BADGES, TIER_ORDER } from '../data/badges.js';
import { hasBadge, showcaseBadge, setShowcase } from '../systems/badges.js';
import { weeklyGoals, claimGoal, goalReward } from '../systems/weekly.js';
import { myCode, visitFriend, sendGift, GIFTS, noteFriendCount } from '../systems/social.js';
import { timeLeftText } from '../systems/weekboard.js';
import { POST_DESIGNS, STICKERS, MESSAGES, postcardHTML } from '../systems/together.js';
import { slimLook } from '../data/looks.js';
import { drawVillagerHead } from '../gfx/villager.js';

// Friends: your code, add a friend, visit their home, send a daily gift
function renderFriends(pane, api) {
  if (!cloud.hasSession() || G.user?.local) { pane.appendChild(h('div', 'empty-note', T('Make a free account in Menu → Account to add friends, visit their homes and send gifts.', 'Tạo tài khoản miễn phí ở Menu → Tài khoản để kết bạn, thăm nhà nhau và tặng quà.'))); return; }
  const code = myCode();
  const me = h('div', 'row', `<div class="info"><b>${T('Your friend code', 'Mã kết bạn của bạn')}: <span class="friend-code">${escapeHtml(code || '…')}</span></b><small>${T('Share it with a friend so they can add you.', 'Gửi mã cho bạn bè để họ kết bạn với bạn.')}</small></div>`);
  if (code) me.appendChild(btn(T('Invite', 'Mời'), async b => {
    sfx('ui');
    const link = `${CLOUD.site}?friend=${code}`, text = T(`Come visit my island in Bistro Island! My friend code: ${code}`, `Ghé đảo của mình trong Bistro Island nhé! Mã kết bạn: ${code}`);
    try { if (navigator.share) await navigator.share({ title: 'Bistro Island', text, url: link }); else { await navigator.clipboard.writeText(`${text} ${link}`); b.textContent = T('Link copied ✓', 'Đã chép link ✓'); } } catch {}
  }, 'buy alt'));
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
    noteFriendCount(friends?.length || 0);
    list.innerHTML = '';
    if (!friends?.length) { list.appendChild(h('div', 'empty-note', T('No friends yet. Share your code!', 'Chưa có bạn bè. Chia sẻ mã của bạn nhé!'))); return; }
    const gave = new Set((sent || []).map(r => r.to_id));
    for (const f of friends) {
      const b = f.badge && BADGES[f.badge];
      const ago = Math.round((Date.now() - Date.parse(f.updated_at)) / 36e5), seen = ago < 1 ? T('online recently', 'vừa chơi gần đây') : ago < 48 ? T(`${ago}h ago`, `${ago} giờ trước`) : T(`${Math.round(ago / 24)} days ago`, `${Math.round(ago / 24)} ngày trước`);
      const r = h('div', 'row', `<div class="info"><b>${b ? `<span class="badge-mini t-${b.tier}">${b.glyph}</span>` : ''}${escapeHtml(f.player_name || '?')}</b><small>${escapeHtml(f.island_name || '')} · ${T('Lv', 'Cấp')} ${f.level} · ${T('Day', 'Ngày')} ${f.day} · ${seen}</small></div>`);
      const col = h('div'); col.style.cssText = 'display:flex;flex-direction:column;gap:6px';
      col.appendChild(btn(T('Visit home', 'Thăm nhà'), async () => { api.close(true); if (!(await visitFriend(f.user_id))) toast({ text: T('Could not reach their island', 'Không tới được đảo của bạn ấy'), bad: true }); }, 'buy'));
      col.appendChild(btn(T('Island', 'Hòn đảo'), () => islandPostcard(f), 'buy alt'));
      col.appendChild(btn(T('Postcard', 'Bưu thiếp'), () => composePostcard(f), 'buy alt'));
      r.appendChild(col); list.appendChild(r);
      // today's gift: pick one of three (one per friend per day)
      const gifts = h('div', 'gift-row');
      if (gave.has(f.user_id)) gifts.appendChild(h('small', '', T('Gift sent today ✓', 'Đã tặng quà hôm nay ✓')));
      else for (const [kind, G2] of Object.entries(GIFTS)) {
        const gb = h('button', 'gift-pick', `<img src="${iconURL(G2.icon, 32)}" alt=""><span>${escapeHtml(T(G2.label[0], G2.label[1]))}</span>`); gb.type = 'button';
        gb.onclick = async () => {
          gifts.querySelectorAll('button').forEach(x => { x.disabled = true; });
          try { await sendGift(f.user_id, kind); sfx('success'); gifts.innerHTML = `<small>${T('Gift sent today ✓', 'Đã tặng quà hôm nay ✓')}</small>`; toast({ text: T(`You sent ${f.player_name} ${G2.en}`, `Bạn đã tặng ${f.player_name} ${G2.vi}`), icon: G2.icon }); }
          catch { sfx('error'); toast({ text: T('One gift per friend each day', 'Mỗi ngày một món quà cho mỗi người bạn'), bad: true }); }
        };
        gifts.appendChild(gb);
      }
      const rm = h('button', 'link-btn', T('Remove friend', 'Xóa bạn')); rm.type = 'button';
      rm.onclick = async () => { if (rm.dataset.sure) { await cloud.removeFriend(f.user_id).catch(() => {}); sfx('back'); api.rebuild(); } else { rm.dataset.sure = 1; rm.textContent = T('Tap again to remove', 'Chạm lần nữa để xóa'); } };
      gifts.appendChild(rm);
      list.appendChild(gifts);
    }
  }).catch(() => { list.innerHTML = `<div class="empty-note">${T('Could not reach the server. Check your connection.', 'Không kết nối được máy chủ. Kiểm tra mạng nhé.')}</div>`; });
}
// a friend's island at a glance: their shops, badges and numbers
async function islandPostcard(f) {
  const home = await cloud.friendHome(f.user_id).catch(() => null), I = home?.home?.island || {};
  openSheet({ title: f.island_name || 'Bistro Island', sub: T(`${f.player_name}'s island · Lv ${f.level} · Day ${f.day}`, `Đảo của ${f.player_name} · Cấp ${f.level} · Ngày ${f.day}`), build: body => {
    body.appendChild(h('div', 'office-head', [[T('Customers served', 'Khách đã phục vụ'), I.served ?? '—'], [T('Regulars', 'Khách quen'), I.regulars ?? '—'], [T('Best streak', 'Chuỗi ngày dài nhất'), I.streak ?? '—']].map(([label, v]) => `<div><small>${escapeHtml(label)}</small><b>${escapeHtml(String(v))}</b></div>`).join('')));
    body.appendChild(h('div', 'section-title', T('Their shops', 'Các quán')));
    const shops = h('div', 'list'); body.appendChild(shops);
    for (const [id, lv] of I.shops || []) if (BUSINESSES[id]) shops.appendChild(rowEl({ icon: RECIPES[(BUSINESSES[id].menu || [])[0]]?.icon || 'coin', title: escapeHtml(bizName(id)), sub: T(`Level ${lv}`, `Cấp ${lv}`) }));
    if (!(I.shops || []).length) shops.appendChild(h('div', 'empty-note', T('Their island is just getting started.', 'Hòn đảo của bạn ấy mới bắt đầu.')));
    body.appendChild(h('div', 'section-title', T('Badges', 'Huy hiệu')));
    const grid = h('div', 'badge-grid'); body.appendChild(grid);
    for (const id of I.badges || []) { const b = BADGES[id]; if (b) grid.appendChild(h('div', `badge t-${b.tier}`, `<span class="glyph">${b.glyph}</span><b>${escapeHtml(T(b.en, b.vi))}</b>`)); }
    if (!(I.badges || []).length) grid.appendChild(h('div', 'empty-note', T('No badges yet.', 'Chưa có huy hiệu.')));
  } });
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
  const ids = Object.keys(BADGES).filter(id => id !== 'supporter' || STORE.payments || hasBadge(id)).sort((a, b) => TIER_ORDER.indexOf(BADGES[a].tier) - TIER_ORDER.indexOf(BADGES[b].tier));
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
// Goals: milestones, this week's goals, badges, achievements and the season, one at a time
function renderMilestones(pane, api) {
  const ti = (label, icon) => ({ label, icon });
  const box = h('div', ''); box.style.cssText = 'display:flex;flex-direction:column;min-height:100%'; pane.appendChild(box);
  tabs(box, [ti(T('Milestones', 'Cột mốc'), 'trophy'), ti(T('This week', 'Tuần này'), 'coin'), ti(T('Badges', 'Huy hiệu'), 'star'), ti(T('Achievements', 'Thành tựu'), 'lantern'), ti(T('Season', 'Mùa'), 'heart')], (i, sub) => {
    G.runtime.goalsTab = i;
    if (i === 0) renderMilestoneList(sub, api);
    if (i === 1) renderWeekly(sub, api);
    if (i === 2) renderBadges(sub, api);
    if (i === 3) { const list = h('div', 'list'); sub.appendChild(list); renderAchievements(list); }
    if (i === 4) renderSeason(sub);
  }, G.runtime.goalsTab || 0);
}
function renderMilestoneList(pane, api) {
  const s = G.state;
  const lv = s.level || 1;
  const head = h('div', 'ms-row', `<img src="${iconURL('trophy', 48)}" alt=""><div class="ms-info"><b>${T(`Level ${lv}`, `Cấp ${lv}`)}</b><small>${T(`${Math.floor(s.xp || 0)} / ${xpNeed(lv)} XP to level ${lv + 1}`, `${Math.floor(s.xp || 0)} / ${xpNeed(lv)} KN để lên cấp ${lv + 1}`)}</small><div class="ms-bar"><i style="width:${Math.min(100, (s.xp || 0) / xpNeed(lv) * 100)}%"></i></div></div>`);
  pane.appendChild(head);
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

// write a postcard: a design, a sticker and one of the ready-made messages
function composePostcard(f) {
  const pick = { design: 'sunset', sticker: 'heart', message: 0 };
  openSheet({ title: T(`A postcard for ${f.player_name}`, `Bưu thiếp gửi ${f.player_name}`), sub: T('Pick a picture, a sticker and a message', 'Chọn hình, nhãn dán và lời nhắn'), build: (body, api) => {
    const prev = h('div', ''); body.appendChild(prev);
    const draw = () => { prev.innerHTML = postcardHTML({ ...pick, name: G.state.player.name }); };
    const row = (label, entries, key) => { body.appendChild(h('div', 'section-title', label)); const r = h('div', 'pc-pick'); for (const [k, lab] of entries) { const b = h('button', pick[key] === k ? 'on' : '', lab); b.type = 'button'; b.onclick = () => { pick[key] = k; sfx('ui'); [...r.children].forEach(x => x.classList.toggle('on', x === b)); draw(); }; r.appendChild(b); } body.appendChild(r); };
    row(T('Picture', 'Hình'), Object.entries(POST_DESIGNS).map(([k, d]) => [k, T(d[0], d[1])]), 'design');
    row(T('Sticker', 'Nhãn dán'), Object.entries(STICKERS), 'sticker');
    row(T('Message', 'Lời nhắn'), MESSAGES.map((m, i) => [i, T(m[0], m[1])]), 'message');
    body.appendChild(btn(T('Send postcard', 'Gửi bưu thiếp'), async () => { try { await cloud.sendMail(f.user_id, pick.design, pick.sticker, pick.message); sfx('success'); toast({ text: T('Postcard sent!', 'Đã gửi bưu thiếp!'), icon: 'letter' }); api.close(); } catch { sfx('error'); toast({ text: T('Couldn\'t send it (10 a day at most)', 'Không gửi được (tối đa 10 tấm mỗi ngày)'), bad: true }); } }, 'btn big pink'));
    draw();
  } });
}
// Ranks: this week's boards (reset every Monday, top 10 win prizes) and the all-time board
function renderLeaderboard(pane) {
  const mode = h('div', 'seg lb-mode'), seg = h('div', 'seg lb-seg'), head = h('div', 'lb-head'), box = h('div', '');
  const MODES = [['week', T('This week', 'Tuần này')], ['friends', T('Friends', 'Bạn bè')], ['all', T('All time', 'Mọi thời')]];
  const SORTS = {
    week: [['served', T('Served', 'Khách')], ['earned', T('Earned', 'Kiếm')], ['xp', 'XP']],
    friends: [['served', T('Served', 'Khách')], ['earned', T('Earned', 'Kiếm')], ['xp', 'XP']],
    all: [['level', T('Level', 'Cấp độ')], ['money', T('Money', 'Tiền')], ['served', T('Served', 'Khách')]],
  };
  let m = 'week', cur = 'served', token = 0;
  const badgeHTML = r => r.badge && BADGES[r.badge] ? `<span class="badge-mini t-${BADGES[r.badge].tier}" title="${escapeHtml(T(BADGES[r.badge].en, BADGES[r.badge].vi))}">${BADGES[r.badge].glyph}</span>` : '';
  const rankHTML = r => `<div class="lb-rank g${r.rank}">${r.rank <= 3 ? ['🥇', '🥈', '🥉'][r.rank - 1] : '#' + r.rank}</div>`;
  const isWeek = () => m !== 'all';
  const weekVal = r => cur === 'earned' ? money(r.score) : cur === 'xp' ? `${r.score.toLocaleString()} XP` : `${r.score.toLocaleString()} ${T('served', 'khách')}`;
  const drawSegs = () => {
    mode.replaceChildren(...MODES.map(([k, label]) => { const b = h('button', k === m ? 'on' : '', label); b.type = 'button'; b.onclick = () => { if (m === k) return; sfx('ui'); m = k; cur = SORTS[k][0][0]; drawSegs(); load(); }; return b; }));
    seg.replaceChildren(...SORTS[m].map(([k, label]) => { const b = h('button', k === cur ? 'on' : '', label); b.type = 'button'; b.onclick = () => { if (cur === k) return; sfx('ui'); cur = k; drawSegs(); load(); }; return b; }));
    head.innerHTML = m === 'week'
      ? `<b>🏆 ${T('Weekly board', 'Bảng tuần')}</b> <span class="pill">${timeLeftText()}</span><small>${T('Top 10 on each board win a trophy for their home, coins and a badge. Resets Monday 00:00 (Vietnam time).', 'Top 10 mỗi bảng nhận cúp trang trí, tiền và huy hiệu. Làm mới lúc 00:00 thứ Hai (giờ Việt Nam).')}</small>`
      : m === 'friends' ? `<b>🫶 ${T('You and your friends, this week', 'Bạn và bạn bè, tuần này')}</b> <span class="pill">${timeLeftText()}</span>`
      : `<b>⭐ ${T('All-time board', 'Bảng mọi thời')}</b><small>${T('Never resets.', 'Không bao giờ làm mới.')}</small>`;
  };
  const load = async () => {
    const my = ++token;
    box.innerHTML = `<div class="empty-note">${T('Loading the island rankings…', 'Đang tải bảng xếp hạng…')}</div>`;
    if (!cloud.hasSession()) { box.innerHTML = `<div class="empty-note">${(G.user?.guest ? T('Create a free account in Menu → Account to join the global leaderboard.', 'Tạo tài khoản miễn phí ở Menu → Tài khoản để lên bảng xếp hạng toàn cầu.') : T('Sign in to see the global leaderboard.', 'Đăng nhập để xem bảng xếp hạng toàn cầu.'))}</div>`; return; }
    try {
      await cloud.pushLeaderboard(leaderboardRowNow()).catch(() => {});
      const rows = m === 'week' ? await cloud.fetchWeekly(cur) : m === 'friends' ? await cloud.fetchFriendsWeek(cur) : await cloud.fetchLeaderboard(cur);
      if (my !== token) return;
      if (!rows?.length) { box.innerHTML = `<div class="empty-note">${m === 'week' ? T('A fresh week! Serve a few customers to get on the board.', 'Tuần mới! Phục vụ vài vị khách để lên bảng nhé.') : T('No one here yet. Be the first!', 'Chưa có ai. Hãy là người đầu tiên!')}</div>`; return; }
      box.replaceChildren(...rows.map(r => {
        const row = h('div', 'lb-row' + (r.is_me ? ' me' : '') + (m === 'week' && r.rank <= 10 ? ' prize' : ''));
        const wk = isWeek();
        const face = document.createElement('canvas'); face.width = face.height = 72; face.className = 'lb-face';
        const sub = wk ? `${escapeHtml(r.island_name || '')} · ${T('Lv', 'Cấp')} ${r.level}` : `${escapeHtml(r.island_name || '')} · ${T('Day', 'Ngày')} ${r.day}`;
        const val = wk ? `<div class="lb-val">${weekVal(r)}${m === 'week' && r.rank <= 10 ? `<small>${r.rank === 1 ? T('Gold cup', 'Cúp vàng') : r.rank <= 3 ? T('Silver cup', 'Cúp bạc') : T('Bronze cup', 'Cúp đồng')}</small>` : ''}</div>`
          : `<div class="lb-val">${T('Lv', 'Cấp')} ${r.level}<small>${money(r.money)} · ${r.served} ${T('served', 'khách')}</small></div>`;
        row.innerHTML = rankHTML(r) + `<div class="lb-name"><b>${badgeHTML(r)}${escapeHtml(r.player_name)}${r.is_me ? T(' (you)', ' (bạn)') : ''}</b><small>${sub}</small></div>` + val;
        row.insertBefore(face, row.children[1]);
        drawFace(face, r.look);
        return row;
      }));
    } catch (e) { console.warn('ranks', e); if (my === token) box.innerHTML = `<div class="empty-note">${T('Could not reach the leaderboard. Check your connection.', 'Không kết nối được bảng xếp hạng. Kiểm tra mạng nhé.')}</div>`; }
  };
  pane.append(mode, head, seg, box);
  drawSegs(); load();
}
// a little portrait of a player's character (a soft circle when they haven't shared one)
function drawFace(cv, look) {
  const c = cv.getContext('2d'); c.lineJoin = 'round'; c.lineCap = 'round';
  c.fillStyle = '#fdeed7'; c.beginPath(); c.arc(36, 36, 35, 0, Math.PI * 2); c.fill();
  if (!look) { c.fillStyle = '#e9d0ae'; c.beginPath(); c.arc(36, 30, 13, 0, Math.PI * 2); c.fill(); c.beginPath(); c.ellipse(36, 66, 22, 18, 0, 0, Math.PI * 2); c.fill(); return; }
  c.save(); c.beginPath(); c.arc(36, 36, 35, 0, Math.PI * 2); c.clip();
  try { drawVillagerHead(c, 36, 41, 46, { look: { ...look, scale: 1 }, dir: 'down' }, 1); } catch { /* an odd look from an old build */ }
  c.restore();
}
const leaderboardRowNow = () => ({ ...leaderboardRow(G.state), badge: showcaseBadge(), look: slimLook(G.player?.look) });

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
        // sound: on/off plus a volume slider for each
        const slider = (label, key, volKey) => {
          const r = h('div', 'row vol-row', `<div class="info"><b>${label}</b><input type="range" min="0" max="100" step="5" value="${Math.round((s.settings[volKey] ?? 0.8) * 100)}" aria-label="${label}"></div>`);
          const inp = r.querySelector('input'), on = () => T('On', 'Bật'), off = () => T('Off', 'Tắt');
          const apply = () => setAudio({ [key]: s.settings[key], [volKey]: s.settings[volKey] });
          inp.oninput = () => { s.settings[volKey] = +inp.value / 100; if (!s.settings[key] && +inp.value > 0) { s.settings[key] = true; b.innerHTML = on(); b.className = 'buy'; } apply(); };
          inp.onchange = () => { markDirty(true); if (key === 'sfx') sfx('coin'); };
          const b = btn(s.settings[key] ? on() : off(), (el) => { s.settings[key] = !s.settings[key]; el.innerHTML = s.settings[key] ? on() : off(); el.className = s.settings[key] ? 'buy' : 'buy alt'; apply(); markDirty(true); sfx('ui'); }, s.settings[key] ? 'buy' : 'buy alt');
          r.appendChild(b); list.appendChild(r);
        };
        slider(T('Music', 'Nhạc nền'), 'music', 'musicVol');
        slider(T('Sound effects', 'Âm thanh'), 'sfx', 'sfxVol');
        toggle(T('Haptics (vibration)', 'Rung phản hồi'), 'haptics', () => setHaptics(s.settings.haptics));
        // comfort: bigger text, high contrast, the buttons on the left
        { const r = h('div', 'row', `<div class="info"><b>${T('Text size', 'Cỡ chữ')}</b></div>`), seg = h('div', 'seg');
          for (const [k, en, vi] of [['normal', 'Normal', 'Thường'], ['l', 'Large', 'Lớn'], ['xl', 'Extra', 'Rất lớn']]) { const b = h('button', s.settings.textSize === k ? 'on' : '', T(en, vi)); b.type = 'button'; b.onclick = () => { s.settings.textSize = k; applyComfort(); markDirty(true); sfx('ui'); [...seg.children].forEach(x => x.classList.toggle('on', x === b)); }; seg.appendChild(b); }
          r.appendChild(seg); list.appendChild(r); }
        toggle(T('High contrast', 'Tương phản cao'), 'contrast', applyComfort);
        toggle(T('Left-handed controls', 'Nút bấm bên trái'), 'lefty', applyComfort);
        toggle(T('Colour-blind friendly colours', 'Màu dễ phân biệt (mù màu)'), 'colorblind', applyComfort);
        toggle(T('End-of-day summary card', 'Bảng tổng kết cuối ngày'), 'summary');
        // which kinds of little pop-up news you want (important ones always show)
        { const r = h('div', 'row alert-row', `<div class="info"><b>${T('Pop-up news', 'Thông báo nhỏ')}</b><small>${T('Tap to switch a kind off. Warnings and rewards always show.', 'Chạm để tắt từng loại. Cảnh báo và phần thưởng luôn hiện.')}</small></div>`), chips = h('div', 'chip-row');
          const al = (s.settings.alerts ||= {});
          for (const [k, en, vi] of [['sales', 'Staff sales', 'Nhân viên bán'], ['weather', 'Weather', 'Thời tiết'], ['discover', 'Discoveries', 'Khám phá'], ['friends', 'Friends', 'Bạn bè'], ['island', 'Island news', 'Tin trên đảo'], ['tips', 'Tips', 'Mẹo']]) {
            const b = h('button', 'chip' + (al[k] === false ? '' : ' on'), T(en, vi)); b.type = 'button'; b.setAttribute('aria-pressed', al[k] !== false);
            b.onclick = () => { al[k] = al[k] === false; b.classList.toggle('on', al[k] !== false); b.setAttribute('aria-pressed', al[k] !== false); markDirty(true); sfx('ui'); };
            chips.appendChild(b);
          }
          r.appendChild(chips); list.appendChild(r); }
        if (nativeApp()) toggle(T('Reminders (morning mail, weekly board)', 'Nhắc nhở (thư buổi sáng, bảng tuần)'), 'notify', () => import('../systems/notify.js').then(m => m.notifySettingChanged()));
        toggle(T('Quest arrow', 'Mũi tên chỉ đường'), 'arrow');
        toggle(T('Smooth 60 FPS (uses more battery)', 'Mượt 60 FPS (tốn pin hơn)'), 'smooth', () => { if (s.settings.smooth && s.settings.lowPower) { s.settings.lowPower = false; api.rebuild?.(); } G.renderer?.resize(); });
        toggle(T('Battery saver (older phones)', 'Tiết kiệm pin (máy cũ)'), 'lowPower', () => { if (s.settings.lowPower && s.settings.smooth) { s.settings.smooth = false; api.rebuild?.(); } G.renderer?.resize(); });
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

// Guests are reminded now and then that their island lives only on this device
// (Safari can clear a website's storage after a week away unless it's on the Home Screen).
export function guestReminder() {
  const s = G.state, f = s.story.flags;
  if (!G.user?.guest || !f.freeRoam || s.day < 3 || Date.now() - (f.guestNudge || 0) < 2 * 864e5) return;
  f.guestNudge = Date.now(); markDirty();
  const el = h('div', 'modal');
  el.innerHTML = `<div class="card"><h2>${T('Keep your island safe', 'Giữ hòn đảo an toàn')}</h2>
    <p style="font-weight:800;line-height:1.4">${T('Your island is saved only on this device. A free account keeps it safe in the cloud, lets you play on other devices and join the leaderboard.', 'Hòn đảo của bạn chỉ được lưu trên máy này. Tài khoản miễn phí giúp lưu an toàn trên mây, chơi trên thiết bị khác và lên bảng xếp hạng.')}</p>
    <div style="display:flex;gap:8px;margin-top:12px"><button type="button" class="btn ghost" data-a="no" style="flex:1">${T('Later', 'Để sau')}</button><button type="button" class="btn pink" data-a="yes" style="flex:1">${T('Make an account', 'Tạo tài khoản')}</button></div></div>`;
  document.getElementById('app').appendChild(el);
  el.querySelector('[data-a="no"]').onclick = () => { sfx('back'); el.remove(); };
  el.querySelector('[data-a="yes"]').onclick = () => { el.remove(); linkAccount(null, 'signup'); };
}
// A guest makes (or logs in to) an account. A new account takes this island along; an
// existing account that already has an island asks which one to keep.
export async function linkAccount(api, start) {
  const guestId = G.user.id;
  api?.close(true);
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

