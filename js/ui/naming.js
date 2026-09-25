// Text prompts (player / island name) and the little look picker.

import { h } from './sheets.js';
import { sfx } from '../core/audio.js';
import { escapeHtml } from '../core/util.js';
import { PLAYER_OPTIONS, playerLook } from '../data/looks.js';
import { drawHuman } from '../gfx/character.js';
import { G } from '../systems/state.js';

export function askText({ title, sub = '', placeholder = '', max = 16, value = '', ok = 'Xong · Done' }) {
  return new Promise(res => {
    G.runtime.pause++;
    const el = h('div', 'modal');
    el.innerHTML = `<div class="card"><h2>${escapeHtml(title)}</h2>${sub ? `<p>${escapeHtml(sub)}</p>` : ''}<label class="field"><input type="text" maxlength="${max}" autocomplete="off" autocapitalize="words" spellcheck="false" placeholder="${escapeHtml(placeholder)}" value="${escapeHtml(value)}"></label><button class="btn big pink" type="button">${escapeHtml(ok)}</button></div>`;
    document.getElementById('app').appendChild(el);
    const inp = el.querySelector('input'), b = el.querySelector('button');
    setTimeout(() => inp.focus(), 250);
    const done = () => {
      const v = inp.value.replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
      if (!v) { sfx('error'); inp.parentElement.animate([{ transform: 'translateX(-5px)' }, { transform: 'translateX(5px)' }, { transform: 'none' }], { duration: 240 }); inp.focus(); return; }
      sfx('success'); inp.blur(); G.runtime.pause--;
      el.style.transition = 'opacity .2s'; el.style.opacity = 0;
      setTimeout(() => { el.remove(); window.scrollTo(0, 0); res(v); }, 200);
    };
    b.onclick = done;
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); done(); } });
  });
}

export function chooseLook(start = {}) {
  return new Promise(res => {
    G.runtime.pause++;
    const opt = { hairStyle: start.hairStyle || 'bob', hair: start.hair || PLAYER_OPTIONS.hair[0], top: start.top || PLAYER_OPTIONS.top[0], skin: start.skin || PLAYER_OPTIONS.skin[1] };
    const el = h('div', 'modal');
    const HS = { bob: 'Tóc ngắn', short: 'Tóc tém', long: 'Tóc dài', buns: 'Búi đôi', pony: 'Đuôi ngựa', spiky: 'Tóc dựng', twin: 'Hai bím', wavy: 'Tóc xoăn' };
    el.innerHTML = `<div class="card"><h2>Trông bạn thế nào?</h2><p>What do you look like?</p><div class="look-preview"><canvas width="300" height="300"></canvas></div>
      <div class="cycler" data-k="hairStyle"><small>Kiểu tóc</small><button type="button" data-d="-1">‹</button><div class="val"></div><button type="button" data-d="1">›</button></div>
      <div class="cycler" data-k="hair"><small>Màu tóc</small><div class="sw"></div></div>
      <div class="cycler" data-k="top"><small>Áo</small><div class="sw"></div></div>
      <div class="cycler" data-k="skin"><small>Làn da</small><div class="sw"></div></div>
      <button class="btn big pink" type="button" style="margin-top:10px">Xong · Done</button></div>`;
    document.getElementById('app').appendChild(el);
    const cv = el.querySelector('canvas'), c = cv.getContext('2d');
    const refresh = () => {
      el.querySelector('[data-k="hairStyle"] .val').textContent = HS[opt.hairStyle] || opt.hairStyle;
      for (const k of ['hair', 'top', 'skin']) {
        const sw = el.querySelector(`[data-k="${k}"] .sw`);
        sw.innerHTML = PLAYER_OPTIONS[k].map(col => `<i data-c="${col}" class="${opt[k] === col ? 'on' : ''}" style="background:${col}"></i>`).join('');
      }
    };
    el.querySelectorAll('[data-k="hairStyle"] button').forEach(b => b.onclick = () => { const L = PLAYER_OPTIONS.hairStyle, i = (L.indexOf(opt.hairStyle) + (+b.dataset.d) + L.length) % L.length; opt.hairStyle = L[i]; sfx('ui'); refresh(); });
    el.addEventListener('click', e => { const i = e.target.closest('.sw i'); if (!i) return; opt[i.closest('.cycler').dataset.k] = i.dataset.c; sfx('ui'); refresh(); });
    refresh();
    let alive = true, t0 = performance.now();
    const loop = now => {
      if (!alive) return;
      const t = (now - t0) / 1000;
      const a = { look: playerLook(opt), dir: 'down', moving: 0, walkPh: 0, seed: 1, blinkAmt: Math.sin(t * 1.4) > 0.97 ? 1 : 0, emo: 'happy', hop: Math.max(0, Math.sin(t * 3)) * 1.2, act: Math.sin(t * 0.8) > 0.6 ? 'wave' : null, actT: t };
      c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, 300, 300); c.lineJoin = 'round'; c.lineCap = 'round';
      c.translate(150, 300 + 30); c.scale(7, 7); drawHuman(c, a, t);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    el.querySelector('.btn').onclick = () => { alive = false; sfx('success'); G.runtime.pause--; el.style.transition = 'opacity .2s'; el.style.opacity = 0; setTimeout(() => { el.remove(); res(opt); }, 200); };
  });
}
