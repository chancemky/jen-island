// The admin dashboard (admin.html): signs in with a game account listed in
// jen_island_admins and shows jen_island_admin_stats() — players per day, sign-ups,
// versions, events, errors, chapters and retention. Nothing here ships inside the game.
import { CLOUD } from './systems/cloud.js';

const $ = id => document.getElementById(id), KEY = 'jenisland.admin';
let session = null; try { session = JSON.parse(sessionStorage.getItem(KEY) || 'null'); } catch { /* none */ }
async function req(path, body, token) {
  const r = await fetch(CLOUD.url + path, { method: 'POST', headers: { apikey: CLOUD.key, 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: JSON.stringify(body) });
  const d = await r.json().catch(() => null); if (!r.ok) throw new Error(d?.message || d?.msg || d?.error_description || 'Request failed (' + r.status + ')'); return d;
}
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function bars(rows, key, label, col) {
  if (!rows.length) return '<p class="muted">No data yet.</p>';
  const max = Math.max(1, ...rows.map(r => r[key])), w = 100 / rows.length;
  return `<div class="axis"><span>max ${max}</span></div><svg viewBox="0 0 100 52" preserveAspectRatio="none">${rows.map((r, i) => { const h = r[key] / max * 50; return `<rect x="${i * w + w * 0.15}" y="${52 - h}" width="${w * 0.7}" height="${h}" rx="0.8" fill="${col}"><title>${esc(r.day)}: ${r[key]} ${label}</title></rect>`; }).join('')}</svg><div class="axis"><span>${esc(rows[0].day)}</span><span>${esc(rows[rows.length - 1].day)}</span></div>`;
}
function table(rows, cols) { return rows.length ? `<table>${rows.map(r => `<tr>${cols.map(([k, n]) => `<td class="${n ? 'n' : ''}">${esc(typeof k === 'function' ? k(r) : r[k])}</td>`).join('')}</tr>`).join('')}</table>` : '<p class="muted">Nothing here.</p>'; }
async function load() {
  $('login').hidden = true; $('out').hidden = false; $('dash').hidden = false; $('dash').innerHTML = '<p class="muted">Loading…</p>';
  let s;
  try { s = await req('/rest/v1/rpc/jen_island_admin_stats', { days: +$('days').value }, session.access_token); }
  catch (e) { if (/JWT|expired|admin/i.test(e.message)) { sessionStorage.removeItem(KEY); session = null; return showLogin(e.message); } $('dash').innerHTML = `<p>${esc(e.message)}</p>`; return; }
  const t = s.totals, ret = s.retention, pct = (a, b) => b ? Math.round(a / b * 100) + '%' : '—';
  $('dash').innerHTML = `
    <section class="kpis">${[['Players today', t.players1], ['Players 7 days', t.players7], ['Accounts', t.accounts], ['Cloud saves', t.saves], ['On the leaderboard', t.leaderboard], ['Purchases', t.purchases], ['Friendships', t.friends], ['D1 / D7 return', `${pct(ret.d1, ret.cohort)} / ${pct(ret.d7, ret.cohort)}`]].map(([l, v]) => `<div class="kpi"><b>${esc(v)}</b><span>${l}</span></div>`).join('')}</section>
    <div class="card wide"><h2>Players per day (devices)</h2>${bars(s.daily, 'players', 'players', '#e56b8b')}</div>
    <div class="card"><h2>Sessions per day</h2>${bars(s.daily, 'sessions', 'sessions', '#2f9e8f')}</div>
    <div class="card"><h2>New accounts per day</h2>${bars(s.signups, 'accounts', 'accounts', '#f2c14e')}</div>
    <div class="card"><h2>Versions (last 3 days)</h2>${table(s.versions, [['version'], ['players', 1]])}</div>
    <div class="card"><h2>Where players are (chapter)</h2>${table(s.chapters, [[r => 'Chapter ' + (r.chapter ?? '?')], ['n', 1]])}</div>
    <div class="card"><h2>Events</h2>${table(s.events, [['name'], ['n', 1]])}</div>
    <div class="card wide"><h2>Errors</h2>${table(s.errors, [['message'], ['version'], [r => r.n + '× · ' + r.devices + ' dev', 1], [r => new Date(r.last).toLocaleString(), 1]])}</div>
    <p class="muted wide">Updated ${new Date(s.generated).toLocaleString()} · retention cohort: ${ret.cohort} devices first seen 8–30 days ago</p>`;
}
function showLogin(msg = '') { $('login').hidden = false; $('dash').hidden = true; $('out').hidden = true; $('msg').textContent = msg; }
$('login').onsubmit = async e => {
  e.preventDefault(); $('msg').textContent = '';
  try { session = await req('/auth/v1/token?grant_type=password', { email: $('email').value, password: $('pw').value }); sessionStorage.setItem(KEY, JSON.stringify(session)); load(); }
  catch (err) { $('msg').textContent = err.message; }
};
$('out').onclick = () => { sessionStorage.removeItem(KEY); session = null; showLogin(); };
$('days').onchange = () => session && load();
session ? load() : showLogin();
