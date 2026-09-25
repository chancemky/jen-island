// End-of-day summary shown after sleeping: animated counters, per-business
// performance, milestones and achievements, then "Ngày mới" (new day).

import { h } from './sheets.js';
import { sfx } from '../core/audio.js';
import { money, escapeHtml } from '../core/util.js';
import { BUSINESSES, ACHIEVEMENTS, CHAPTERS } from '../data/game.js';

export function showSummary(sum) {
  return new Promise(res => {
    const el = h('div', 'summary');
    const biz = Object.entries(sum.biz || {}).filter(([, v]) => v.served);
    el.innerHTML = `<div class="moon"></div><h1>Hết ngày ${sum.day}</h1><div class="sub">${escapeHtml(sum.island)} · Chương ${sum.chapter}: ${escapeHtml(CHAPTERS[sum.chapter]?.vi || '')}</div>
      <div class="sum-card"><div class="sum-grid">
        <div class="sum-stat wide"><small>Doanh thu · Revenue</small><b data-n="${sum.revenue}" data-money="1">0</b></div>
        <div class="sum-stat"><small>Khách · Served</small><b data-n="${sum.served}">0</b></div>
        <div class="sum-stat"><small>Hoàn hảo · Perfect</small><b data-n="${sum.perfect}">0</b></div>
        <div class="sum-stat"><small>Tiền tip · Tips</small><b data-n="${sum.tips}" data-money="1">0</b></div>
        <div class="sum-stat"><small>Danh tiếng · Reputation</small><b data-n="${sum.repDelta}" data-sign="1">0</b></div>
        ${sum.lost ? `<div class="sum-stat wide"><small>Khách bỏ đi · Customers who left</small><b data-n="${sum.lost}">0</b></div>` : ''}
      </div></div>
      ${biz.length ? `<div class="sum-card"><div class="section-title" style="color:#fff8ea">Cửa hàng · Business performance</div><ul class="sum-list">${biz.map(([id, v]) => `<li><span>${escapeHtml(BUSINESSES[id].name)}</span><span>${v.served} khách · ${money(v.revenue)}</span></li>`).join('')}</ul></div>` : ''}
      ${(sum.milestones.length || sum.achievements.length) ? `<div class="sum-card"><div class="section-title" style="color:#fff8ea">Cột mốc · Milestones</div><ul class="sum-list">${sum.milestones.map(m => `<li class="ach"><span>★ ${escapeHtml(m)}</span></li>`).join('')}</ul></div>` : ''}
      <div class="sum-card" style="text-align:center;font-weight:800;opacity:.85">${escapeHtml(sum.meoLine)}</div>
      <button class="btn big pink" type="button" style="max-width:420px">Ngày mới · Next day ☀</button>`;
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
    el.querySelector('button').onclick = () => { sfx('bell'); el.style.transition = 'opacity .5s'; el.style.opacity = 0; setTimeout(() => { el.remove(); res(); }, 450); };
  });
}
export { ACHIEVEMENTS };
