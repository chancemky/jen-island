// Generic UI: bottom sheets, reward cards, flying item animations, portraits.

import { G, T } from '../systems/state.js';
import { sfx } from '../core/audio.js';
import { escapeHtml, clock } from '../core/util.js';
import { iconURL } from '../gfx/food.js';
import { drawHuman, EL } from '../gfx/character.js';
import { drawCat } from '../gfx/cat.js';
import { releaseJoystick } from '../core/input.js';

const root = document.getElementById('sheets');
export const ui = { open: 0, stack: [] };
export const isUiOpen = () => ui.open > 0;

export function openSheet({ title, sub = '', who = null, cls = '', full = false, clear = false, onClose = null, pauseTime = true, build }) {
  releaseJoystick();
  const wrap = document.createElement('div');
  wrap.className = 'sheet-wrap' + (clear ? ' clear' : '');
  wrap.innerHTML = `<div class="sheet ${full ? 'full' : ''} ${cls}"><div class="sheet-head">${who ? '<div class="who"><canvas width="120" height="120"></canvas></div>' : ''}<h2>${escapeHtml(title)}${sub ? `<small>${escapeHtml(sub)}</small>` : ''}</h2><button class="x" type="button" aria-label="Close">✕</button></div><div class="sheet-body"></div></div>`;
  root.appendChild(wrap);
  const sheet = wrap.querySelector('.sheet'), body = wrap.querySelector('.sheet-body');
  body.style.display = 'flex'; body.style.flexDirection = 'column'; body.style.minHeight = '0'; body.style.flex = '1';
  if (who) portrait(wrap.querySelector('.who canvas'), who);
  ui.open++; if (pauseTime) G.runtime.pause++;
  document.body.classList.add('sheet-open');
  let closed = false;
  const close = (silent) => {
    if (closed) return; closed = true;
    ui.open--; if (pauseTime) G.runtime.pause--;
    if (!ui.open) document.body.classList.remove('sheet-open');
    if (!silent) sfx('back');
    wrap.classList.add('out');
    setTimeout(() => wrap.remove(), 230);
    onClose?.();
  };
  wrap.querySelector('.x').onclick = () => close();
  wrap.addEventListener('pointerdown', e => { if (e.target === wrap) close(); });
  const api = { wrap, sheet, body, close, rebuild: () => {
    // keep every list where it was scrolled to (buying shouldn't jump to the top)
    const tops = [...body.querySelectorAll('.scroll, .list')].map(e => e.scrollTop);
    body.innerHTML = ''; build?.(body, api);
    [...body.querySelectorAll('.scroll, .list')].forEach((e, i) => { if (tops[i]) e.scrollTop = tops[i]; });
  } };
  build?.(body, api);
  sfx('page');
  return api;
}

export function tabs(body, list, onPick, start = 0, api = null) {
  if (api && api.tab !== undefined) start = api.tab;
  const bar = document.createElement('div'); bar.className = 'tabs';
  const pane = document.createElement('div'); pane.className = 'scroll'; pane.style.flex = '1'; pane.style.minHeight = '0';
  list.forEach((t, i) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = t; b.onclick = () => { sfx('ui'); select(i); }; bar.appendChild(b); });
  body.append(bar, pane);
  const select = i => { if (api) api.tab = i; [...bar.children].forEach((b, k) => b.classList.toggle('on', k === i)); pane.innerHTML = ''; pane.scrollTop = 0; onPick(i, pane); };
  select(start);
  return { select, pane };
}

export function h(tag, cls = '', html = '') { const e = document.createElement(tag); if (cls) e.className = cls; if (html) e.innerHTML = html; return e; }
export function rowEl({ icon, title, sub = '', have = '', right = null, dim = false }) {
  const r = h('div', 'row' + (dim ? ' dim' : ''));
  r.innerHTML = `<div class="ico">${icon ? `<img src="${icon.startsWith('data:') ? icon : iconURL(icon, 44)}" alt="">` : ''}</div><div class="info"><b>${title}</b>${sub ? `<small>${sub}</small>` : ''}${have ? `<span class="have">${have}</span>` : ''}</div>`;
  if (right) r.appendChild(right);
  return r;
}
export function btn(label, onClick, cls = 'buy', disabled = false) {
  const b = h('button', cls); b.type = 'button'; b.innerHTML = label; b.disabled = disabled;
  b.addEventListener('click', e => { e.stopPropagation(); if (!b.disabled) onClick(b, e); });
  return b;
}

// Portrait canvas using the real character rig.
export function portrait(cv, who, emo = 'happy') {
  const c = cv.getContext('2d');
  const look = who === 'meo' ? { cat: true } : who.look || who;
  const cat = who === 'meo' || look.cat;
  const a = { look, kind: cat ? 'cat' : 'human', dir: 'down', moving: 0, walkPh: 0, seed: 1, blinkAmt: 0, emo, talking: false, portrait: true };
  c.clearRect(0, 0, cv.width, cv.height);
  c.save(); c.lineJoin = 'round'; c.lineCap = 'round';
  const s = cv.width / (cat ? 30 : 30);
  c.translate(cv.width / 2, cv.height + (cat ? 2 : 7) * s * 0.9 + (cat ? 0 : EL * s)); c.scale(s, s);
  (cat ? drawCat : drawHuman)(c, a, 1);
  c.restore();
  return a;
}

// Fly an icon image from one element (or point) to another.
export function flyIcon(icon, from, to, { size = 40, dur = 520 } = {}) {
  const [fx, fy] = pointOf(from), [tx, ty] = pointOf(to);
  const el = h('div', 'flyer'); el.innerHTML = `<img src="${iconURL(icon, 48)}" alt="">`;
  el.style.width = el.style.height = size + 'px';
  el.style.left = (fx - size / 2) + 'px'; el.style.top = (fy - size / 2) + 'px';
  el.style.transition = `transform ${dur}ms cubic-bezier(.35,-0.25,.55,1), opacity ${dur}ms`;
  document.getElementById('app').appendChild(el);
  const app = document.getElementById('app').getBoundingClientRect();
  el.style.left = (fx - app.left - size / 2) + 'px'; el.style.top = (fy - app.top - size / 2) + 'px';
  requestAnimationFrame(() => requestAnimationFrame(() => { el.style.transform = `translate(${tx - fx}px, ${ty - fy}px) scale(.55)`; el.style.opacity = '0.85'; }));
  return new Promise(r => setTimeout(() => { el.remove(); r(); }, dur));
}
export function flyCoins(from, to, n = 6) {
  const app = document.getElementById('app'), ar = app.getBoundingClientRect();
  const [fx, fy] = pointOf(from), [tx, ty] = pointOf(to);
  for (let i = 0; i < n; i++) {
    const el = h('div', 'coinfly');
    el.style.left = (fx - ar.left - 11 + (Math.random() - 0.5) * 30) + 'px'; el.style.top = (fy - ar.top - 11 + (Math.random() - 0.5) * 20) + 'px';
    app.appendChild(el);
    const dx = tx - fx, dy = ty - fy, d = 480 + i * 60;
    el.animate([{ transform: 'translate(0,0) scale(.6)', opacity: 0 }, { transform: `translate(${(Math.random() - 0.5) * 60}px, ${-30 - Math.random() * 30}px) scale(1.1)`, opacity: 1, offset: 0.3 }, { transform: `translate(${dx}px, ${dy}px) scale(.7)`, opacity: 1 }], { duration: d, easing: 'cubic-bezier(.4,0,.6,1)', delay: i * 45, fill: 'forwards' });
    setTimeout(() => el.remove(), d + i * 45 + 30);
  }
  setTimeout(() => sfx('coin'), 420);
}
function pointOf(p) { if (Array.isArray(p)) return p; const r = p.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }

// Big celebratory card (recipe discovered, business opened…)
export function showReward({ kicker = '', title, sub = '', icon = null, text = '', steps = null, button = null }) {
  button ||= T('Wonderful!', 'Tuyệt vời!');
  return new Promise(res => {
    releaseJoystick();
    G.runtime.pause++; ui.open++;
    const el = h('div', 'reward');
    el.innerHTML = `<div class="reward-card"><div class="reward-inner"><div class="rays"></div><div class="kicker">${escapeHtml(kicker)}</div><h2>${escapeHtml(title)}</h2>${sub ? `<h3>${escapeHtml(sub)}</h3>` : ''}${icon ? `<div class="art"><img src="${iconURL(icon, 110)}" alt=""></div>` : ''}${steps ? `<div class="steps-mini">${steps.map(s => `<img src="${iconURL(s, 30)}" alt="">`).join('<span style="align-self:center;font-weight:900;opacity:.4">›</span>')}</div>` : ''}${text ? `<p>${escapeHtml(text)}</p>` : ''}<button class="btn big pink" type="button">${escapeHtml(button)}</button></div></div>`;
    document.getElementById('app').appendChild(el);
    sfx('sparkle'); setTimeout(() => sfx('success'), 250);
    el.querySelector('button').onclick = () => { sfx('ui'); el.classList.add('out'); G.runtime.pause--; ui.open--; setTimeout(() => { el.remove(); res(); }, 250); };
  });
}
