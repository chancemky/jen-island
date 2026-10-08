// Reminders, in the App Store / Google Play app only (@capacitor/local-notifications; the
// website has none). Nothing is sent from a server: when you leave the app, a few gentle
// reminders are set on the phone, and they're all cleared again when you come back.
//   · tomorrow 8:00 — morning mail and new Island Board notes
//   · Sunday 19:00 Japan time — the weekly board closes at midnight
//   · after 3 quiet days — Mèo Mây misses you
// We ask for permission once, after your second island day, with our own card first.

import { G, T, markDirty } from './state.js';
import { bus, islandNow } from '../core/util.js';
import { weekEndsAt } from './weekboard.js';
import { present } from '../ui/sheets.js';

const LN = () => window.Capacitor?.isNativePlatform?.() ? window.Capacitor.Plugins?.LocalNotifications : null;
const IDS = [101, 102, 103];
const on = () => !!G.state?.settings?.notify && G.state.story?.flags?.notifyOk;

async function clear() { const ln = LN(); if (!ln) return; try { await ln.cancel({ notifications: IDS.map(id => ({ id })) }); } catch { /* none pending */ } }
async function schedule() {
  const ln = LN(); if (!ln || !on()) return;
  await clear();
  const s = G.state, isle = s.island.name || 'Bistro Island', now = Date.now(), list = [];
  const morning = new Date(); morning.setDate(morning.getDate() + 1); morning.setHours(8, 0, 0, 0);
  list.push({ id: 101, title: T('☀️ Morning mail', '☀️ Thư buổi sáng'), body: T(`A gift and new neighbour requests are waiting on ${isle}.`, `Một món quà và lời nhờ mới của hàng xóm đang chờ ở ${isle}.`), schedule: { at: morning } });
  const close = weekEndsAt(islandNow()) - 5 * 3600e3;              // 19:00 Japan time on Sunday
  if (close > now + 3600e3) list.push({ id: 102, title: T('🏆 Weekly board closes tonight', '🏆 Bảng tuần đóng tối nay'), body: T('A few more customers could win you a trophy.', 'Phục vụ thêm vài khách là có thể giành cúp đó.'), schedule: { at: new Date(close) } });
  list.push({ id: 103, title: T('🐱 Mèo Mây misses you', '🐱 Mèo Mây nhớ bạn'), body: T('The tea stand is quiet without you. Come say hi?', 'Quán trà vắng bạn buồn lắm. Ghé chào một tiếng nha?'), schedule: { at: new Date(now + 3 * 864e5) } });
  try { await ln.schedule({ notifications: list.map(n => ({ ...n, sound: null })) }); } catch (e) { console.warn('notify', e.message); }
}
// the friendly card, then the phone's own question
async function askOnce() {
  const ln = LN(), s = G.state; if (!ln || s.story.flags.notifyAsked || s.day < 2) return;
  s.story.flags.notifyAsked = true; markDirty(true);
  const yes = await present(() => new Promise(res => {
    const el = document.createElement('div'); el.className = 'modal';
    el.innerHTML = `<div class="card" style="text-align:center"><div style="font-size:48px">🔔</div><h2>${T('A little reminder?', 'Nhắc nhẹ một chút nhé?')}</h2><p style="font-weight:800;line-height:1.4">${T('We can tell you when your morning mail arrives and when the weekly board is about to close. Never more than once a day.', 'Chúng mình có thể báo khi thư buổi sáng tới và khi bảng tuần sắp đóng. Không quá một lần mỗi ngày.')}</p><button class="btn primary" data-a="y" type="button">${T('Yes, please', 'Có, nhắc mình nhé')}</button><button class="btn ghost" data-a="n" type="button" style="margin-top:8px">${T('Not now', 'Để sau')}</button></div>`;
    (document.getElementById('app') || document.body).appendChild(el);
    el.onclick = e => { const a = e.target.closest('button')?.dataset.a; if (!a) return; el.remove(); res(a === 'y'); };
  }));
  if (!yes) { s.settings.notify = false; markDirty(true); return; }
  try { const r = await ln.requestPermissions(); s.story.flags.notifyOk = r?.display === 'granted'; } catch { s.story.flags.notifyOk = false; }
  if (!s.story.flags.notifyOk) s.settings.notify = false;
  markDirty(true);
}
export async function notifySettingChanged() {
  const s = G.state;
  if (s.settings.notify && !s.story.flags.notifyOk) { s.story.flags.notifyAsked = false; await askOnce(); }
  if (!s.settings.notify) clear();
}
export function initNotify() {
  if (!LN()) return;
  clear();                                        // you're here: nothing to remind you of
  document.addEventListener('visibilitychange', () => { if (document.hidden) schedule(); else clear(); });
  bus.on('dayEnd', () => setTimeout(askOnce, 2500));
}
