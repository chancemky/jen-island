// Restaurant staff board: current team (role, stats, trait, wage) and today's
// three applicants. Employees exist only in the restaurant.

import { G, canAfford, bizOf } from '../systems/state.js';
import { ROLES, TRAITS } from '../data/game.js';
import { candidates, hire, fire, setRole, restaurantAutomated, dailyWages, staffByRole } from '../systems/restaurant.js';
import { employeeLook } from '../data/looks.js';
import { openSheet, tabs, h, btn, portrait } from './sheets.js';
import { toast } from './hud.js';
import { sfx } from '../core/audio.js';
import { escapeHtml, money } from '../core/util.js';

const statBar = (label, v) => `<div style="display:flex;align-items:center;gap:6px;font-size:11px;font-weight:900"><span style="width:62px;opacity:.7">${label}</span><span style="display:flex;gap:2px">${[1, 2, 3, 4, 5].map(i => `<i style="width:12px;height:8px;border-radius:3px;background:${i <= v ? '#6fbf73' : '#e9d8bf'};display:block"></i>`).join('')}</span></div>`;
function empCard(e, right) {
  const r = h('div', 'row'); r.style.alignItems = 'flex-start';
  const ico = h('div', 'ico'); const cv = document.createElement('canvas'); cv.width = 96; cv.height = 96; cv.style.width = cv.style.height = '48px'; ico.appendChild(cv);
  portrait(cv, { look: employeeLook(e.seed, e.role || 'server') });
  const tr = TRAITS.find(t => t.id === e.trait);
  const info = h('div', 'info', `<b>${escapeHtml(e.name)} ${e.role ? `<span class="pill lv">${ROLES[e.role].vi}</span>` : ''}</b><small>${escapeHtml(tr.vi)} · ${escapeHtml(tr.fx)}</small>${statBar('Tốc độ', e.stats.speed)}${statBar('Nấu ăn', e.stats.cooking)}${statBar('Phục vụ', e.stats.service)}${statBar('Chăm chỉ', e.stats.reliability)}<small>Lương ${e.wage}k/ngày</small>`);
  r.append(ico, info);
  if (right) r.appendChild(right);
  return r;
}
export function openStaffBoard() {
  openSheet({ title: 'Bảng nhân viên', sub: 'Restaurant staff · only restaurants can hire', full: true, build: (body, api) => {
    const b = bizOf('restaurant');
    const auto = restaurantAutomated();
    const status = h('div', 'row', `<div class="info"><b>${auto ? 'Nhà hàng tự vận hành ✓' : 'Chưa tự vận hành'}</b><small>${auto ? 'Your cook and server keep it running while you are away.' : 'Hire at least a cook and a server so it runs without you.'} Wages: ${money(dailyWages())}/day</small></div>`);
    status.style.background = auto ? '#effae9' : '#fff7e0';
    body.appendChild(status);
    tabs(body, ['Đội ngũ · Team', 'Ứng viên · Applicants', 'Vai trò · Roles'], (i, pane) => {
      const list = h('div', 'list'); pane.appendChild(list);
      if (i === 0) {
        if (!b.employees.length) list.appendChild(h('div', 'empty-note', 'Chưa có nhân viên. Check today\'s applicants!'));
        for (const e of b.employees) {
          const right = h('div'); right.style.display = 'flex'; right.style.flexDirection = 'column'; right.style.gap = '6px';
          const sel = document.createElement('select');
          sel.style.cssText = 'font:inherit;font-weight:900;font-size:13px;padding:8px;border-radius:12px;border:2.5px solid #e1ccad;background:#fff';
          for (const [k, r] of Object.entries(ROLES)) { const o = document.createElement('option'); o.value = k; o.textContent = r.vi; if (k === e.role) o.selected = true; sel.appendChild(o); }
          sel.onchange = () => { setRole(e.id, sel.value); sfx('ui'); api.rebuild(); };
          right.append(sel, btn('Cho nghỉ', () => { fire(e.id); sfx('back'); toast({ text: `${e.name} đã nghỉ việc`, sub: 'Employee let go' }); api.rebuild(); }, 'buy alt'));
          list.appendChild(empCard(e, right));
        }
      } else if (i === 1) {
        const cands = candidates();
        if (!cands.length) list.appendChild(h('div', 'empty-note', 'Hết ứng viên hôm nay. New applicants arrive every morning.'));
        for (const c of cands) {
          const right = h('div'); right.style.display = 'flex'; right.style.flexDirection = 'column'; right.style.gap = '6px'; right.style.alignItems = 'stretch';
          const sel = document.createElement('select');
          sel.style.cssText = 'font:inherit;font-weight:900;font-size:13px;padding:8px;border-radius:12px;border:2.5px solid #e1ccad;background:#fff';
          const best = c.stats.cooking >= c.stats.service ? 'cook' : 'server';
          const missing = ['cook', 'server', 'cleaner', 'cashier', 'prep'].find(r => !staffByRole(r).length);
          for (const [k, r] of Object.entries(ROLES)) { const o = document.createElement('option'); o.value = k; o.textContent = r.vi; if (k === (missing === 'cook' || missing === 'server' ? missing : best)) o.selected = true; sel.appendChild(o); }
          right.append(sel, btn(`Thuê ${c.fee}k`, () => {
            if (!canAfford(c.fee)) { sfx('error'); toast({ text: 'Không đủ tiền', sub: 'Not enough money', bad: true }); return; }
            hire(c, sel.value); sfx('success'); toast({ text: `${c.name} gia nhập đội!`, sub: `Hired as ${ROLES[sel.value].en}`, icon: 'person' }); api.rebuild();
          }, 'buy pink'));
          list.appendChild(empCard(c, right));
        }
      } else {
        for (const [k, r] of Object.entries(ROLES)) list.appendChild(h('div', 'row', `<div class="info"><b>${r.vi} · ${r.en}</b><small>${escapeHtml(r.desc)}</small></div>`));
        list.appendChild(h('div', 'empty-note', 'Without a server you take orders and carry plates yourself. Without a cook you cook at the stove. Without a cashier, collect the register by the door.'));
      }
    }, 0, api);
  } });
}
