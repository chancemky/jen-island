// Dialogue box: fast natural typewriter with punctuation pauses, an animated
// talking portrait, blip sounds, tap-to-skip, and choices. Promise-based so
// cutscenes read like a script:  await say('meo', 'Xin chào!');

import { sfx } from '../core/audio.js';
import { G, T } from '../systems/state.js';
import { drawHuman } from '../gfx/character.js';
import { drawCat } from '../gfx/cat.js';
import { escapeHtml } from '../core/util.js';
import { RESIDENTS, MERCHANTS } from '../data/looks.js';
import { releaseJoystick } from '../core/input.js';

const el = id => document.getElementById(id);
const box = el('dialog'), nameEl = el('dlgName'), textEl = el('dlgText'), nextEl = el('dlgNext'), choicesEl = el('dlgChoices');
const pcv = el('portrait'), pc = pcv.getContext('2d');

const D = {
  active: false, full: '', html: '', shown: 0, typing: false, speed: 52, pause: 0,
  resolve: null, choices: null, speaker: null, portrait: null, t: 0, holdT: 0,
};
export const dialogue = D;

function speakerInfo(who) {
  if (!who) return { name: '', portrait: null };
  if (who === 'meo') return { name: 'Mèo Mây', cat: true, actor: G.meo, look: { cat: true }, pitch: 880 };
  if (who === 'player') return { name: G.state.player.name || T('You', 'Bạn'), actor: G.player, look: G.player?.look, pitch: 560 };
  if (typeof who === 'object' && who.look) return { name: who.name || '', actor: who, look: who.look, cat: who.kind === 'cat', pitch: who.pitch || (who.look.scale < 0.9 ? 760 : 600) };
  const def = RESIDENTS[who] || MERCHANTS[who];
  if (def) { const a = G.npcs?.byId?.(who); return { name: def.name, actor: a, look: def.look, pitch: def.look.scale < 0.9 ? 780 : 560 + (who.length * 23) % 140 }; }
  return { name: String(who), look: null, pitch: 600 };
}

function markup(s) {
  const st = G.state;
  s = s.replaceAll('{player}', st.player.name || T('friend', 'bạn')).replaceAll('{island}', st.island.name || T('the island', 'đảo'));
  return escapeHtml(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>');
}
// Visible characters in html (tags don't count)
function visibleSlice(html, n) {
  let out = '', count = 0, i = 0, open = [];
  while (i < html.length && count < n) {
    if (html[i] === '<') { const j = html.indexOf('>', i); const tag = html.slice(i, j + 1); out += tag; if (tag[1] === '/') open.pop(); else open.push(tag.match(/<(\w+)/)[1]); i = j + 1; continue; }
    if (html[i] === '&') { const j = html.indexOf(';', i); out += html.slice(i, j + 1); i = j + 1; count++; continue; }
    out += html[i++]; count++;
  }
  for (let k = open.length - 1; k >= 0; k--) out += `</${open[k]}>`;
  return out;
}
function plainLen(html) { return html.replace(/<[^>]+>/g, '').replace(/&[^;]+;/g, 'x').length; }
function plainAt(html, n) { return html.replace(/<[^>]+>/g, '').replace(/&[^;]+;/g, 'x')[n] || ''; }

export function say(who, text, opt = {}) {
  return new Promise(resolve => {
    releaseJoystick();
    const info = speakerInfo(who);
    D.active = true; D.resolve = resolve; D.choices = opt.choices || null;
    D.speaker = info; D.html = markup(text); D.len = plainLen(D.html); D.shown = 0; D.typing = true; D.pause = opt.delay || 0.05;
    D.emo = opt.emo || null; D.speed = opt.speed || (info.cat ? 56 : 50);
    if (info.actor) { info.actor.talking = false; if (opt.emo) info.actor.setEmo?.(opt.emo, 0); }
    D.portraitActor = { look: info.look, kind: info.cat ? 'cat' : 'human', dir: 'down', moving: 0, walkPh: 0, seed: 3, blinkAmt: 0, emo: opt.emo || 'neutral', talking: false, headTilt: opt.tilt || 0, act: opt.act || null, actT: 0 };
    box.classList.remove('hidden', 'out');
    box.classList.toggle('no-portrait', !info.look);
    nameEl.textContent = info.name; nameEl.classList.toggle('hidden', !info.name); nameEl.classList.toggle('cat', !!info.cat);
    textEl.innerHTML = ''; choicesEl.innerHTML = ''; nextEl.classList.remove('on');
    document.body.classList.add('in-dialog');
  });
}
export async function ask(who, text, choices, opt = {}) { return say(who, text, { ...opt, choices }); }
export function closeDialog() {
  if (!D.active && box.classList.contains('hidden')) return;
  D.active = false;
  if (D.speaker?.actor) { D.speaker.actor.talking = false; }
  box.classList.add('out');
  setTimeout(() => { if (!D.active) box.classList.add('hidden'); }, 190);
  document.body.classList.remove('in-dialog');
}

function finishTyping() { D.shown = D.len; D.typing = false; textEl.innerHTML = D.html; afterTyped(); }
function afterTyped() {
  if (D.speaker?.actor) D.speaker.actor.talking = false;
  if (D.choices) {
    choicesEl.innerHTML = '';
    D.choices.forEach((ch, i) => {
      const b = document.createElement('button'); b.type = 'button'; b.innerHTML = markup(ch);
      b.onclick = e => { e.stopPropagation(); sfx('ui'); const r = D.resolve; D.resolve = null; D.choices = null; choicesEl.innerHTML = ''; r?.(i); setTimeout(() => { if (!D.resolve) closeDialog(); }, 60); };
      choicesEl.appendChild(b);
    });
  } else nextEl.classList.add('on');
}
function advance() {
  if (!D.active) return;
  if (D.typing) { finishTyping(); return; }
  if (D.choices) return;
  sfx('tap');
  const r = D.resolve; D.resolve = null;
  nextEl.classList.remove('on');
  r?.(0);
  // hide the box unless another line follows right away
  setTimeout(() => { if (!D.resolve) closeDialog(); }, 60);
}
box.addEventListener('pointerdown', e => { e.preventDefault(); advance(); });
window.addEventListener('keydown', e => { if (!D.active) return; if (e.key === ' ' || e.key === 'Enter' || e.key === 'e') { e.preventDefault(); e.stopImmediatePropagation(); advance(); } }, true);
// Tapping anywhere on the game while dialogue is up advances it too.
el('touch').addEventListener('pointerdown', e => { if (D.active) { e.stopImmediatePropagation(); advance(); } }, true);

export function updateDialogue(dt, t) {
  if (!D.active) return;
  D.t += dt;
  if (D.typing) {
    D.pause -= dt;
    while (D.pause <= 0 && D.shown < D.len) {
      const ch = plainAt(D.html, D.shown);
      D.shown++;
      let p = 1 / D.speed;
      if ('.!?…'.includes(ch)) p = 0.2; else if (',;:'.includes(ch)) p = 0.09; else if (ch === '\n') p = 0.15;
      D.pause += p;
      if (ch.trim() && D.shown % 2 === 0) sfx('blip', { pitch: D.speaker?.pitch || 600 });
    }
    textEl.innerHTML = visibleSlice(D.html, D.shown);
    const talking = D.shown < D.len && !'.!?…'.includes(plainAt(D.html, D.shown - 1));
    if (D.speaker?.actor) D.speaker.actor.talking = talking;
    D.portraitActor.talking = talking;
    if (D.shown >= D.len) { D.typing = false; afterTyped(); }
  } else D.portraitActor.talking = false;
  // portrait
  const pa = D.portraitActor;
  if (pa?.look) {
    pa.blinkT = (pa.blinkT ?? 2) - dt;
    if (pa.blinkT < 0) { pa.blinkT = 2 + Math.random() * 3; pa._b = 0.13; }
    pa._b = Math.max(0, (pa._b || 0) - dt); pa.blinkAmt = pa._b > 0 ? 1 : 0;
    pa.actT += dt;
    const w = pcv.width, h = pcv.height;
    pc.setTransform(1, 0, 0, 1, 0, 0); pc.clearRect(0, 0, w, h);
    pc.lineJoin = 'round'; pc.lineCap = 'round';
    pc.save();
    const sc = pa.kind === 'cat' ? 6.4 : 5.8;
    pc.translate(w / 2, h + (pa.kind === 'cat' ? 6 : 18) * sc * 0.55 + 8);
    pc.scale(sc, sc);
    if (pa.kind === 'cat') drawCat(pc, pa, t); else drawHuman(pc, pa, t);
    pc.restore();
  }
}
export function setPortraitEmo(emo) { if (D.portraitActor) D.portraitActor.emo = emo; }
