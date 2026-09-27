// The lighthouse gallery: climb up and look out over the whole island. Nothing
// to do up here but enjoy the view — clouds drift over, their shadows slide
// across the fields, gulls wheel past the railing, and at night the lamp's beam
// sweeps the sea. One button takes you back down.

import { lockInput, releaseInput } from '../core/locks.js';
import { G, T } from '../systems/state.js';
import { cam } from '../world/render.js';
import { LIGHT } from '../gfx/props.js';
import { fadeOut, fadeIn } from '../systems/scenes.js';
import { input, releaseJoystick } from '../core/input.js';
import { sfx } from '../core/audio.js';
import { TAU } from '../core/util.js';

const DOOR = { x: 900, y: 330 };
let L = null;

export const inLookout = () => !!L;

export async function enterLighthouse() {
  if (L || !G.player) return;
  releaseJoystick(); input.enabled = false;
  sfx('door');
  await fadeOut(450);
  const pl = G.player;
  L = { t: 0, from: { x: pl.x, y: pl.y }, clouds: [], gulls: [] };
  G.runtime.lookout = true;
  pl.visible = false; lockInput('lookout');
  document.body.classList.add('lookout', 'hide-controls');
  // start up close to the lighthouse, then slowly pull back until the whole island is in view
  const full = fullZoom();
  cam.override = { x: 900, y: 520, zoom: full * 2.6, rate: 2 };
  cam.snap(900, 520); cam.zoomMul = full * 2.6;
  for (let i = 0; i < 4; i++) L.clouds.push({ x: Math.random(), y: 0.05 + Math.random() * 0.7, s: 0.6 + Math.random() * 0.8, v: 0.004 + Math.random() * 0.006 });
  for (let i = 0; i < 4; i++) L.gulls.push({ x: Math.random(), y: 0.1 + Math.random() * 0.35, v: 0.02 + Math.random() * 0.03, ph: Math.random() * 6 });
  buildOverlay();
  await fadeIn(700);
  sfx('whoosh');
}
function fullZoom() { const w = G.renderer?.w || 390, h = G.renderer?.h || 700; return Math.min(w / 1650, h / 2500) / cam.baseZoom; }

export async function leaveLighthouse() {
  if (!L || L.leaving) return;
  L.leaving = true; sfx('door');
  await fadeOut(400);
  cancelAnimationFrame(L.raf); L.el.remove();
  const pl = G.player;
  pl.x = DOOR.x; pl.y = DOOR.y; pl.visible = true; releaseInput('lookout'); pl.face('down');
  cam.override = null; cam.follow = pl; cam.zoomMul = 1; cam.snap(pl.x, pl.y - 18);
  document.body.classList.remove('lookout', 'hide-controls');
  G.runtime.lookout = false; input.enabled = true;
  L = null;
  await fadeIn(400);
}

function buildOverlay() {
  const el = document.createElement('div'); el.className = 'lookout-ui';
  el.innerHTML = `<canvas></canvas><div class="lk-title"><b>${T('The Old Lighthouse', 'Ngọn Hải Đăng Cũ')}</b><small>${T(`${G.state.island.name || 'The island'}, seen from the gallery`, `${G.state.island.name || 'Hòn đảo'} nhìn từ ban công hải đăng`)}</small></div><button type="button" class="btn big ghost lk-scope">🔭 ${T('Telescope', 'Ống nhòm')}</button><button type="button" class="btn big pink lk-leave">${T('Leave the lighthouse', 'Rời hải đăng')}</button>`;
  document.getElementById('app').appendChild(el);
  el.querySelector('.lk-leave').onclick = () => leaveLighthouse();
  // the telescope: zoom in and drag to look around the island
  el.querySelector('.lk-scope').onclick = e => {
    e.stopPropagation();
    L.scope = !L.scope; sfx(L.scope ? 'click' : 'back');
    el.classList.toggle('scoping', L.scope);
    if (L.scope) { L.sx = cam.override?.x ?? 900; L.sy = cam.override?.y ?? 1300; import('../systems/interact.js').then(m => m.discover('telescope')); }
  };
  let drag = null;
  el.addEventListener('pointerdown', e => { if (!L?.scope || e.target.closest('button')) return; drag = { x: e.clientX, y: e.clientY, sx: L.sx, sy: L.sy }; });
  el.addEventListener('pointermove', e => { if (!drag || !L) return; const k = 1 / (cam.zoom || 1); L.sx = Math.max(100, Math.min(3100, drag.sx - (e.clientX - drag.x) * k)); L.sy = Math.max(200, Math.min(2700, drag.sy - (e.clientY - drag.y) * k)); });
  el.addEventListener('pointerup', () => { drag = null; });
  // up here at dawn?
  if (G.state.time >= 5 * 60 && G.state.time < 7 * 60) import('../systems/state.js').then(m => m.unlockAchievement('sunrise'));
  L.el = el; L.cv = el.querySelector('canvas'); L.c = L.cv.getContext('2d');
  let last = performance.now();
  const frame = now => {
    if (!L) return;
    const dt = Math.min(0.1, (now - last) / 1000); last = now; L.t += dt;
    step(dt); draw();
    L.raf = requestAnimationFrame(frame);
  };
  L.raf = requestAnimationFrame(frame);
}

// the slow reveal, then a gentle drift over the island
function step(dt) {
  const t = L.t, full = fullZoom();
  if (L.scope) { cam.override = { x: L.sx, y: L.sy, zoom: full * 3.2, rate: 6 }; return; }
  if (t < 1.2) return;
  const k = Math.min(1, (t - 1.2) / 7), e = k * k * (3 - 2 * k);
  cam.override = { x: 900 + Math.sin(t * 0.05) * 50 * e, y: 520 + (1330 - 520) * e + Math.cos(t * 0.04) * 60 * e, zoom: full * (2.6 - 1.6 * e) * (1 + Math.sin(t * 0.07) * 0.04 * e), rate: 1.2 };
  for (const cl of L.clouds) { cl.x += cl.v * dt; if (cl.x > 1.3) { cl.x = -0.3; cl.y = 0.05 + Math.random() * 0.7; } }
  for (const g of L.gulls) { g.x += g.v * dt; g.ph += dt * 5; if (g.x > 1.15) { g.x = -0.15; g.y = 0.08 + Math.random() * 0.35; } }
}

function draw() {
  const cv = L.cv, dpr = Math.min(2, devicePixelRatio || 1), W = innerWidth, H = innerHeight;
  if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
  const c = L.c, t = L.t, night = LIGHT.night || 0;
  c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, H);
  // high up: a soft haze near the top of the view, like distance
  const hz = c.createLinearGradient(0, 0, 0, H * 0.35);
  hz.addColorStop(0, night > 0.3 ? 'rgba(30,40,80,.45)' : 'rgba(210,235,250,.55)'); hz.addColorStop(1, 'rgba(210,235,250,0)');
  c.fillStyle = hz; c.fillRect(0, 0, W, H * 0.35);
  // cloud shadows sliding over the island, and the clouds themselves
  for (const cl of L.clouds) {
    const x = cl.x * W, y = cl.y * H, s = cl.s * Math.min(W, 420) * 0.15;
    c.fillStyle = 'rgba(40,60,80,.10)'; blob(c, x + s * 0.5, y + s * 0.9, s);
    c.fillStyle = night > 0.3 ? 'rgba(200,210,235,.35)' : 'rgba(255,255,255,.5)'; blob(c, x, y, s);
  }
  // gulls
  c.strokeStyle = night > 0.3 ? 'rgba(230,235,255,.7)' : '#fff'; c.lineWidth = 2; c.lineCap = 'round';
  for (const g of L.gulls) { const x = g.x * W, y = g.y * H + Math.sin(g.ph * 0.3) * 6, f = Math.sin(g.ph) * 4; c.beginPath(); c.moveTo(x - 8, y + f * 0.4); c.quadraticCurveTo(x - 4, y - 3 - f, x, y); c.quadraticCurveTo(x + 4, y - 3 - f, x + 8, y + f * 0.4); c.stroke(); }
  // at night the lamp above you sweeps its beam across the sea
  if (night > 0.05) {
    const a = t * 0.6, cx = W / 2, cy = H + 40, len = Math.max(W, H) * 1.4;
    const g = c.createRadialGradient(cx, cy, 20, cx, cy, len); g.addColorStop(0, `rgba(255,240,180,${0.35 * night})`); g.addColorStop(1, 'rgba(255,240,180,0)');
    c.fillStyle = g; c.beginPath(); c.moveTo(cx, cy); c.arc(cx, cy, len, -Math.PI / 2 + Math.sin(a) * 1.1 - 0.12, -Math.PI / 2 + Math.sin(a) * 1.1 + 0.12); c.closePath(); c.fill();
  }
  // the gallery railing in the foreground
  const ry = H - 96, post = '#3d3a42', rail = '#5a5660';
  c.fillStyle = 'rgba(0,0,0,.12)'; c.fillRect(0, ry + 34, W, 70);
  c.fillStyle = '#e9e2d4'; c.fillRect(0, ry + 44, W, 60);                  // the stone floor of the gallery
  c.fillStyle = '#d3c9b6'; for (let x = -20 + ((t * 0) % 40); x < W + 40; x += 40) c.fillRect(x, ry + 44, 2, 60);
  c.fillStyle = post; for (let x = 12; x < W; x += 30) c.fillRect(x, ry + 4, 4, 42);
  c.fillStyle = rail; c.fillRect(0, ry, W, 7); c.fillRect(0, ry + 26, W, 3);
  c.fillStyle = 'rgba(255,255,255,.25)'; c.fillRect(0, ry + 1, W, 2);
  // a little telescope on the rail
  c.save(); c.translate(W - 60, ry - 2); c.rotate(-0.35); c.fillStyle = '#b9905a'; c.fillRect(-4, -26, 8, 26); c.fillStyle = '#8a5f3e'; c.fillRect(-5, -30, 10, 6); c.restore();
  c.fillStyle = post; c.fillRect(W - 64, ry - 4, 8, 10);
  // through the telescope: a round view
  if (L.scope) {
    c.save(); c.fillStyle = 'rgba(20,24,30,.92)'; c.beginPath(); c.rect(0, 0, W, H); c.arc(W / 2, H / 2 - 30, Math.min(W, H) * 0.42, 0, TAU, true); c.fill('evenodd');
    c.strokeStyle = '#8a5f3e'; c.lineWidth = 8; c.beginPath(); c.arc(W / 2, H / 2 - 30, Math.min(W, H) * 0.42, 0, TAU); c.stroke(); c.restore();
    c.fillStyle = 'rgba(255,248,234,.85)'; c.font = '800 13px Nunito, sans-serif'; c.textAlign = 'center'; c.fillText(T('Drag to look around', 'Kéo để nhìn xung quanh'), W / 2, H / 2 + Math.min(W, H) * 0.42 - 6);
    return;
  }
  // soft vignette
  const vg = c.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(20,30,40,.28)'); c.fillStyle = vg; c.fillRect(0, 0, W, H);
}
function blob(c, x, y, s) { c.beginPath(); for (const [dx, dy, r] of [[0, 0, 0.5], [0.45, 0.1, 0.4], [-0.45, 0.12, 0.38], [0.15, -0.2, 0.42], [-0.2, -0.15, 0.35]]) { c.moveTo(x + dx * s + r * s, y + dy * s); c.arc(x + dx * s, y + dy * s, r * s, 0, TAU); } c.fill(); }
