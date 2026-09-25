// Restaurant staff board: current team (role, stats, trait, wage) and today's
// three applicants. Employees exist only in the restaurant.

import { G, T, canAfford, bizOf } from '../systems/state.js';
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
  const info = h('div', 'info', `<b>${escapeHtml(e.name)} ${e.role ? `<span class="pill lv">${escapeHtml(T(ROLES[e.role].en, ROLES[e.role].vi))}</span>` : ''}</b><small>${escapeHtml(T(tr.en, tr.vi))} · ${escapeHtml(T(tr.fx, tr.fxVi))}</small>${statBar(T('Speed', 'Tốc độ'), e.stats.speed)}${statBar(T('Cooking', 'Nấu ăn'), e.stats.cooking)}${statBar(T('Service', 'Phục vụ'), e.stats.service)}${statBar(T('Reliable', 'Chăm chỉ'), e.stats.reliability)}<small>${T(`Wage ${e.wage}k/day`, `Lương ${e.wage}k/ngày`)}</small>`);
  r.append(ico, info);
  if (right) r.appendChild(right);
  return r;
}
export function openStaffBoard() {
  openSheet({ title: T('Staff Board', 'Bảng nhân viên'), sub: T('Only restaurants can hire staff', 'Chỉ nhà hàng mới thuê được nhân viên'), full: true, build: (body, api) => {
    const b = bizOf('restaurant');
    const auto = restaurantAutomated();
    const status = h('div', 'row', `<div class="info"><b>${auto ? T('Runs on its own ✓', 'Nhà hàng tự vận hành ✓') : T('Not automated yet', 'Chưa tự vận hành')}</b><small>${auto ? T('Your cook and server keep it running while you are away.', 'Đầu bếp và phục vụ giữ nhà hàng hoạt động khi bạn vắng mặt.') : T('Hire at least a cook and a server so it runs without you.', 'Thuê ít nhất một đầu bếp và một phục vụ để nhà hàng tự chạy.')} ${T('Wages', 'Lương')}: ${money(dailyWages())}/${T('day', 'ngày')}</small></div>`);
    status.style.background = auto ? '#effae9' : '#fff7e0';
    body.appendChild(status);
    tabs(body, [T('Team', 'Đội ngũ'), T('Applicants', 'Ứng viên'), T('Roles', 'Vai trò')], (i, pane) => {
      const list = h('div', 'list'); pane.appendChild(list);
      if (i === 0) {
        if (!b.employees.length) list.appendChild(h('div', 'empty-note', T('No staff yet. Check today\'s applicants!', 'Chưa có nhân viên. Xem ứng viên hôm nay nhé!')));
        for (const e of b.employees) {
          const right = h('div'); right.style.display = 'flex'; right.style.flexDirection = 'column'; right.style.gap = '6px';
          const sel = document.createElement('select');
          sel.style.cssText = 'font:inherit;font-weight:900;font-size:13px;padding:8px;border-radius:12px;border:2.5px solid #e1ccad;background:#fff';
          for (const [k, r] of Object.entries(ROLES)) { const o = document.createElement('option'); o.value = k; o.textContent = T(r.en, r.vi); if (k === e.role) o.selected = true; sel.appendChild(o); }
          sel.onchange = () => { setRole(e.id, sel.value); sfx('ui'); api.rebuild(); };
          right.append(sel, btn(T('Let go', 'Cho nghỉ'), () => { fire(e.id); sfx('back'); toast({ text: T(`${e.name} has left the team`, `${e.name} đã nghỉ việc`) }); api.rebuild(); }, 'buy alt'));
          list.appendChild(empCard(e, right));
        }
      } else if (i === 1) {
        const cands = candidates();
        if (!cands.length) list.appendChild(h('div', 'empty-note', T('No more applicants today. New ones arrive every morning.', 'Hết ứng viên hôm nay. Sáng mai sẽ có người mới.')));
        for (const c of cands) {
          const right = h('div'); right.style.display = 'flex'; right.style.flexDirection = 'column'; right.style.gap = '6px'; right.style.alignItems = 'stretch';
          const sel = document.createElement('select');
          sel.style.cssText = 'font:inherit;font-weight:900;font-size:13px;padding:8px;border-radius:12px;border:2.5px solid #e1ccad;background:#fff';
          const best = c.stats.cooking >= c.stats.service ? 'cook' : 'server';
          const missing = ['cook', 'server', 'cleaner', 'cashier', 'prep'].find(r => !staffByRole(r).length);
          for (const [k, r] of Object.entries(ROLES)) { const o = document.createElement('option'); o.value = k; o.textContent = T(r.en, r.vi); if (k === (missing === 'cook' || missing === 'server' ? missing : best)) o.selected = true; sel.appendChild(o); }
          right.append(sel, btn(T(`Hire ${c.fee}k`, `Thuê ${c.fee}k`), () => {
            if (!canAfford(c.fee)) { sfx('error'); toast({ text: T('Not enough money', 'Không đủ tiền'), bad: true }); return; }
            hire(c, sel.value); sfx('success'); toast({ text: T(`${c.name} joined the team!`, `${c.name} gia nhập đội!`), sub: T(`Hired as ${ROLES[sel.value].en.toLowerCase()}`, `Vị trí: ${ROLES[sel.value].vi.toLowerCase()}`), icon: 'person' }); api.rebuild();
          }, 'buy pink'));
          list.appendChild(empCard(c, right));
        }
      } else {
        for (const [k, r] of Object.entries(ROLES)) list.appendChild(h('div', 'row', `<div class="info"><b>${escapeHtml(T(r.en, r.vi))}</b><small>${escapeHtml(T(r.desc, r.descVi))}</small></div>`));
        list.appendChild(h('div', 'empty-note', T('Without a server you take orders and carry plates yourself. Without a cook you cook at the stove. Without a cashier, collect the register by the door.', 'Không có phục vụ thì bạn tự nhận order và bưng món. Không có đầu bếp thì bạn tự nấu ở bếp. Không có thu ngân thì bạn tự thu tiền ở quầy cạnh cửa.')));
      }
    }, 0, api);
  } });
}
