// Playing together without ever being online at the same time (no game server):
//  · Lend a hand: while visiting a friend you can help at their counter — a quick rush of
//    orders. What you earn waits for THEM: they see "Mai helped at your shop: 9 served,
//    +135k — Accept?" and nothing touches their island until they say yes.
//  · Their speciality: buy a drink from a friend (your money; they accept the sale later).
//  · Postcards: a design, a sticker and a ready-made message (no free text to moderate).
import { G, T, addMoney, markDirty } from './state.js';
import * as cloud from './cloud.js';
import { bus, choice } from '../core/util.js';
import { present } from '../ui/sheets.js';
import { track } from './telemetry.js';
import { RECIPES } from '../data/game.js';
import { iconURL } from '../gfx/food.js';

export const POST_DESIGNS = { sunset: ['Sunset pier', 'Hoàng hôn bến tàu', ['#ffb36b', '#f36d86']], lanterns: ['Lantern night', 'Đêm lồng đèn', ['#3f3a6e', '#e8584e']], beach: ['Sunny beach', 'Bãi biển nắng', ['#7fd6e8', '#f7de8c']], blossom: ['Blossom', 'Hoa mai', ['#fff3d6', '#ffd35a']] };
export const STICKERS = { heart: '💖', cat: '🐱', boba: '🧋', star: '⭐', wave: '🌊', sun: '☀️', fish: '🐟', lantern: '🏮' };
export const MESSAGES = [
  ['Miss you! Come visit soon.', 'Nhớ bạn! Ghé chơi sớm nha.'], ['Your island is so pretty!', 'Đảo của bạn đẹp quá!'], ['Thanks for the gift!', 'Cảm ơn món quà nha!'],
  ['Good luck this week!', 'Chúc tuần này may mắn!'], ['Happy festival!', 'Lễ hội vui vẻ!'], ['Your drinks are the best.', 'Đồ uống của bạn ngon nhất.'],
  ['Let\'s top the weekly board!', 'Cùng lên top bảng tuần nhé!'], ['Hope your day is cosy.', 'Chúc bạn một ngày ấm áp.'], ['I saw the golden cat!', 'Mình thấy mèo vàng rồi!'],
  ['Happy birthday!', 'Chúc mừng sinh nhật!'], ['See you at the Night Market.', 'Hẹn gặp ở Chợ Đêm.'], ['You inspire me!', 'Bạn truyền cảm hứng cho mình!'],
];
const online = () => cloud.hasSession() && G.user && !G.user.local;

// ---------------------------------------------------------------- lend a hand (a mini game)
// Orders pop up: tap the matching drink among four before the customer loses patience.
// 40 seconds; each correct order earns the friend 15k (capped by the server at 600k).
export function lendAHand(friendId, friendName, menu) {
  return present(() => new Promise(done => {
    const pool = (menu?.length ? menu : Object.keys(RECIPES).filter(id => RECIPES[id].icon?.startsWith('drink:'))).filter(id => RECIPES[id]).slice(0, 8);
    let served = 0, missed = 0, left = 40, cur = null, timer = null, tick = null, over = false;
    const el = document.createElement('div'); el.className = 'modal help-game';
    el.innerHTML = `<div class="card"><div class="hg-top"><b>${T(`Helping at ${friendName}'s`, `Phụ quán ${friendName}`)}</b><span class="hg-time">40</span></div><div class="hg-order"></div><div class="hg-pick"></div><div class="hg-score"></div></div>`;
    (document.getElementById('app') || document.body).appendChild(el);
    const order = el.querySelector('.hg-order'), pick = el.querySelector('.hg-pick'), score = el.querySelector('.hg-score');
    const next = () => {
      cur = choice(pool); const opts = new Set([cur]); while (opts.size < Math.min(4, pool.length)) opts.add(choice(pool));
      order.innerHTML = `<img src="${iconURL(RECIPES[cur].icon, 64)}" alt=""><small>${T(RECIPES[cur].en, RECIPES[cur].vi)}</small><i class="hg-pat"></i>`;
      pick.innerHTML = [...opts].sort(() => Math.random() - 0.5).map(id => `<button type="button" data-id="${id}"><img src="${iconURL(RECIPES[id].icon, 48)}" alt=""></button>`).join('');
      clearTimeout(timer); timer = setTimeout(() => { missed++; bus.emit('sfx', 'sad'); next(); }, Math.max(2200, 4200 - served * 120));
      score.textContent = T(`${served} served · ${missed} missed`, `${served} khách · lỡ ${missed}`);
    };
    pick.onclick = e => { const id = e.target.closest('button')?.dataset.id; if (!id || over) return; if (id === cur) { served++; bus.emit('sfx', 'coin'); } else { missed++; bus.emit('sfx', 'error'); } next(); };
    const finish = async () => {
      over = true; clearTimeout(timer); clearInterval(tick);
      const amount = Math.min(600, served * 15);
      el.querySelector('.card').innerHTML = `<h2>${T('Shift done!', 'Hết ca!')}</h2><p style="font-weight:800">${T(`${served} customers served at ${friendName}'s. ${amount}k waits for them to accept.`, `Đã phục vụ ${served} khách ở quán ${friendName}. ${amount}k đang chờ bạn ấy nhận.`)}</p><button class="btn primary" type="button">${T('Nice!', 'Tuyệt!')}</button>`;
      el.querySelector('button').onclick = () => { el.remove(); done(); };
      if (served && online()) { try { await cloud.sendHelp(friendId, 'help', Math.min(30, served), amount); } catch { /* once a day per friend */ } }
      const s = G.state; s.social ||= {}; s.social.helped = (s.social.helped || 0) + 1; addMoney(Math.round(served * 3), 'tip'); markDirty(true); track('help', { served });
    };
    tick = setInterval(() => { left--; el.querySelector('.hg-time') && (el.querySelector('.hg-time').textContent = left); if (left <= 0) finish(); }, 1000);
    next();
  }));
}
export async function buySpeciality(friendId, friendName, recipe) {
  const price = Math.round((RECIPES[recipe]?.price || 25) * 1.5);
  if (G.state.money < price) return false;
  addMoney(-price, 'gift');
  try { await cloud.sendHelp(friendId, 'buy', 1, price); } catch { addMoney(price, 'gift'); return false; }
  G.player?.setAct('drink', 'cup'); setTimeout(() => G.player?.setAct(null), 2200); bus.emit('sfx', 'slurp');
  bus.emit('toast', { text: T(`You bought ${friendName}'s ${RECIPES[recipe]?.en || 'speciality'}`, `Bạn đã mua món ${RECIPES[recipe]?.vi || 'đặc sản'} của ${friendName}`), sub: T('They\'ll get the sale when they accept it.', 'Bạn ấy sẽ nhận tiền khi đồng ý.'), icon: RECIPES[recipe]?.icon, ms: 3200 });
  return true;
}
// ---------------------------------------------------------------- the inbox (on start)
export async function checkInbox() {
  if (!online()) return;
  let box; try { box = await cloud.myInbox(); } catch { return; }
  for (const h of box?.help || []) present(() => new Promise(done => {
    const el = document.createElement('div'); el.className = 'modal';
    const what = h.kind === 'buy' ? T(`${h.name} bought your speciality for ${h.amount}k.`, `${h.name} đã mua món đặc sản của bạn với giá ${h.amount}k.`) : T(`${h.name} helped at your counter while visiting: ${h.served} served, ${h.amount}k in sales.`, `${h.name} đã phụ quán khi ghé thăm: ${h.served} khách, ${h.amount}k tiền bán.`);
    el.innerHTML = `<div class="card" style="text-align:center"><div style="font-size:44px">${h.kind === 'buy' ? '🧋' : '🤝'}</div><h2>${T('A friend stopped by', 'Có bạn ghé quán')}</h2><p style="font-weight:800">${what}</p><button class="btn primary" data-a="y" type="button">${T(`Accept +${h.amount}k`, `Nhận +${h.amount}k`)}</button><button class="btn ghost" data-a="n" type="button" style="margin-top:8px">${T('No thanks', 'Thôi, cảm ơn')}</button></div>`;
    (document.getElementById('app') || document.body).appendChild(el);
    el.onclick = async e => { const a = e.target.closest('button')?.dataset.a; if (!a) return; el.remove();
      try { await cloud.answerHelp(h.id, a === 'y' ? 'accepted' : 'declined'); if (a === 'y') { addMoney(Math.min(600, h.amount), 'gift'); bus.emit('sfx', 'cash'); markDirty(true); } } catch { /* try again next time */ }
      done(); };
  }));
  const mail = box?.mail || [];
  if (mail.length) present(() => new Promise(done => {
    const el = document.createElement('div'); el.className = 'modal';
    el.innerHTML = `<div class="card postcards"><h2>${T(mail.length > 1 ? `${mail.length} postcards!` : 'A postcard!', mail.length > 1 ? `${mail.length} bưu thiếp!` : 'Một bưu thiếp!')}</h2>${mail.slice(0, 5).map(m => postcardHTML(m)).join('')}<button class="btn primary" type="button">${T('Lovely', 'Dễ thương quá')}</button></div>`;
    (document.getElementById('app') || document.body).appendChild(el); bus.emit('sfx', 'page');
    el.querySelector('button').onclick = () => { el.remove(); cloud.mailSeen(mail.map(m => m.id)).catch(() => {}); G.state.social ||= {}; G.state.social.postcards = (G.state.social.postcards || 0) + mail.length; markDirty(); done(); };
  }));
}
export function postcardHTML(m) {
  const d = POST_DESIGNS[m.design] || POST_DESIGNS.sunset, msg = MESSAGES[m.message] || MESSAGES[0];
  return `<div class="postcard" style="--a:${d[2][0]};--b:${d[2][1]}"><span class="pc-stamp">${STICKERS[m.sticker] || '💖'}</span><b>${T(msg[0], msg[1])}</b><small>— ${(m.name || '').replace(/[<>&]/g, '')}</small></div>`;
}
