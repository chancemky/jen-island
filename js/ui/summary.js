// End-of-day summary shown after sleeping: animated counters, per-business
// performance, milestones and achievements, then "Ngày mới" (new day).

import { h, present } from './sheets.js';
import { T, tr } from '../systems/state.js';
import { bizName } from '../data/game.js';
import { sfx } from '../core/audio.js';
import { money, escapeHtml } from '../core/util.js';

// The night's bills, in the order they come out of your wallet: what you had,
// each deduction, what's left — and one warning when the bills were more than you had.
function walletTrail(sum) {
  const lines = [
    [T('Restaurant wages', 'Lương nhân viên nhà hàng'), sum.wages],
    [T('Rent', 'Tiền thuê'), sum.rent],
    [T('Shopkeeper wages', 'Lương người trông quán'), sum.keeperWages],
    [T('Morning deliveries', 'Giao hàng sáng'), sum.deliveries],
  ].filter(([, v]) => v > 0);
  if (!lines.length) return '';
  const w = sum.wallet, row = (label, v, cls = '') => `<li${cls ? ` class="${cls}"` : ''}><span>${escapeHtml(label)}</span><span>${v}</span></li>`;
  return `<div class="sum-card"><div class="section-title" style="color:#fff8ea">${T('Tonight\'s bills', 'Chi phí đêm nay')}</div><ul class="sum-list">${[
    w ? row(T('Wallet tonight', 'Ví tối nay'), money(w.start)) : '',
    ...lines.map(([label, v]) => row(label, '−' + money(v))),
    w ? row(T('Wallet this morning', 'Ví sáng nay'), `<b>${money(w.end)}</b>`) : '',
  ].join('')}</ul>${w && w.bills > w.start ? `<div style="margin-top:6px;font-weight:800;color:#ffb38a">${T(`Tonight's bills (${money(w.bills)}) were more than you had (${money(w.start)}).`, `Chi phí đêm nay (${money(w.bills)}) nhiều hơn số tiền bạn có (${money(w.start)}).`)}</div>` : ''}</div>`;
}
import { BUSINESSES, ACHIEVEMENTS, CHAPTERS, ROLES } from '../data/game.js';
import { catName } from '../systems/ledger.js';

export function showSummary(sum) { return present(() => summaryCard(sum)); }
function summaryCard(sum) {
  return new Promise(res => {
    const el = h('div', 'summary');
    const biz = Object.entries(sum.biz || {}).filter(([, v]) => v.served);
    const pl = sum.books?.biz || {};
    const vs = (a, b) => b != null && b !== 0 ? ` <span style="opacity:.7;font-size:.85em">${a >= b ? '▲' : '▼'}${Math.abs(Math.round((a - b) / Math.abs(b) * 100))}%</span>` : '';
    const DID = { served: ['served', 'bưng'], orders: ['orders', 'order'], cooked: ['cooked', 'nấu'], cleaned: ['tables cleaned', 'bàn dọn'], prepped: ['preps', 'mẻ sơ chế'], deposits: ['deposits', 'lần nộp'], helped: ['helped', 'giúp'] };
    const staffLine = st => st.biz ? T(`${st.name} served ${st.served} guests at ${bizName(st.biz)}`, `${st.name} bán cho ${st.served} khách ở ${bizName(st.biz)}`)
      : `${st.name} (${T(ROLES[st.role]?.en || '', ROLES[st.role]?.vi || '')}): ${Object.entries(st.did).filter(([, n]) => n).map(([k, n]) => `${n} ${T(...DID[k])}`).join(', ') || T('a quiet day', 'một ngày yên ả')}`;
    const spend = Object.entries(sum.books?.spending || {});
    el.innerHTML = `<div class="moon"></div><h1>${T(`End of Day ${sum.day}`, `Hết ngày ${sum.day}`)}</h1><div class="sub">${escapeHtml(sum.island)} · ${escapeHtml(T(`Chapter ${sum.chapter}: ${CHAPTERS[sum.chapter]?.title || ''}`, `Chương ${sum.chapter}: ${CHAPTERS[sum.chapter]?.vi || ''}`))}</div>
      <div class="sum-card"><div class="sum-grid">
        <div class="sum-stat wide"><small>${T('Revenue (sales + tips)', 'Doanh thu (bán + boa)')}${vs(sum.revenue, sum.prev?.revenue)}</small><b data-n="${sum.revenue}" data-money="1">0</b></div>
        <div class="sum-stat"><small>${T('Served', 'Khách')}</small><b data-n="${sum.served}">0</b></div>
        <div class="sum-stat"><small>${T('Perfect', 'Hoàn hảo')}</small><b data-n="${sum.perfect}">0</b></div>
        <div class="sum-stat"><small>${T('Sales', 'Bán hàng')}</small><b data-n="${sum.sales ?? sum.revenue - sum.tips}" data-money="1">0</b></div>
        <div class="sum-stat"><small>${T('Tips', 'Tiền boa')}</small><b data-n="${sum.tips}" data-money="1">0</b></div>
        <div class="sum-stat wide"><small>${T('Net today (all money in − all money out)', 'Lãi hôm nay (tiền vào − tiền ra)')}${vs(sum.net ?? 0, sum.prev?.net)}</small><b data-n="${sum.net ?? 0}" data-money="1" data-sign="1">0</b></div>
        <div class="sum-stat"><small>${T('Reputation', 'Danh tiếng')}</small><b data-n="${sum.repDelta}" data-sign="1">0</b></div>
        ${sum.lost ? `<div class="sum-stat wide"><small>${T('Customers who left', 'Khách bỏ đi')}</small><b data-n="${sum.lost}">0</b></div>` : ''}
      </div></div>
      ${biz.length ? `<div class="sum-card"><div class="section-title" style="color:#fff8ea">${T('Your shops', 'Cửa hàng')}</div><ul class="sum-list">${biz.map(([id, v]) => `<li><span>${escapeHtml(bizName(id))}</span><span>${T(`${v.served} served`, `${v.served} khách`)} · ${money(v.revenue)}${pl[id] ? ` · ${T('net', 'lãi')} <b>${money(pl[id].net)}</b>` : ''}</span></li>`).join('')}</ul></div>` : ''}
      ${spend.length ? `<div class="sum-card"><div class="section-title" style="color:#fff8ea">${T('Where the money went', 'Tiền đã chi vào')}</div><ul class="sum-list">${spend.map(([c, v]) => `<li><span>${escapeHtml(catName(c))}</span><span>${money(v)}</span></li>`).join('')}</ul></div>` : ''}
      ${sum.staff?.length ? `<div class="sum-card"><div class="section-title" style="color:#fff8ea">${T('Your team today', 'Đội của bạn hôm nay')}</div><ul class="sum-list">${sum.staff.map(st => `<li><span>${escapeHtml(staffLine(st))}</span></li>`).join('')}</ul></div>` : ''}
      ${sum.gift ? `<div class="sum-card" style="text-align:center;font-weight:800">${escapeHtml(sum.gift)}</div>` : ''}
      ${(sum.milestones.length || sum.achievements.length) ? `<div class="sum-card"><div class="section-title" style="color:#fff8ea">${T('Milestones', 'Cột mốc')}</div><ul class="sum-list">${sum.milestones.map(m => `<li class="ach"><span>★ ${escapeHtml(tr(m))}</span></li>`).join('')}</ul></div>` : ''}
      <div class="sum-card" style="text-align:center;font-weight:800;opacity:.85">${escapeHtml(sum.meoLine)}</div>
      ${walletTrail(sum)}
      <button class="btn big pink" type="button" style="max-width:420px">${T('Next day ☀', 'Ngày mới ☀')}</button>`;
    document.getElementById('app').appendChild(el);
    const stats = [...el.querySelectorAll('.sum-stat')];
    stats.forEach((s, i) => setTimeout(() => {
      s.classList.add('on'); sfx('pop');
      const b = s.querySelector('b'), n = +b.dataset.n, isMoney = b.dataset.money, sign = b.dataset.sign;
      const t0 = performance.now(), dur = 700;
      const step = now => {
        const k = Math.min(1, (now - t0) / dur), v = Math.round(n * (1 - Math.pow(1 - k, 3)));
        b.textContent = isMoney ? money(v) : sign ? (v > 0 ? '+' : '') + v : v;
        if (k < 1) requestAnimationFrame(step); else if (n > 0 && i < 2) sfx('coin');
      };
      requestAnimationFrame(step);
    }, 350 + i * 220));
    let done = false;
    el.querySelector('button').onclick = () => { if (done) return; done = true; el.style.pointerEvents = 'none'; sfx('bell'); el.style.transition = 'opacity .5s'; el.style.opacity = 0; setTimeout(() => { el.remove(); res(); }, 450); };
  });
}
export { ACHIEVEMENTS };
