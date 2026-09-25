// Opening cinematic: a side-view ocean crossing. The fast boat skims toward
// the island with bobbing, spray and wake; parallax clouds, gulls and waves;
// the island grows on the horizon until the dock is close, then we cut to
// the top-down world for the docking.

import { TAU, clamp, lerp, ease, rng, invLerp } from '../core/util.js';
import { INK, ell, circ, box, poly, line, limb, text } from '../gfx/draw.js';
import { drawHuman } from '../gfx/character.js';
import { sfx } from '../core/audio.js';
import { G } from './state.js';

export function playCinematic(canvas, { onCaption, skipSignal } = {}) {
  return new Promise(resolve => {
    const c = canvas.getContext('2d', { alpha: false });
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    let W = 0, H = 0;
    const resize = () => { const r = canvas.getBoundingClientRect(); W = r.width; H = r.height; canvas.width = W * dpr; canvas.height = H * dpr; };
    resize();
    const DUR = 13.5;
    let t0 = performance.now(), last = t0, done = false;
    const spray = [];
    const R = rng(11);
    const clouds = Array.from({ length: 7 }, (_, i) => ({ x: R() * 1.4, y: 0.06 + R() * 0.22, s: 0.6 + R() * 0.9, sp: 0.004 + R() * 0.008 }));
    const gulls = Array.from({ length: 4 }, (_, i) => ({ x: R(), y: 0.12 + R() * 0.15, ph: R() * 6, sp: 0.02 + R() * 0.02 }));
    const cap = { look: { skin: '#cf9772', hair: '#2f2a30', hairStyle: 'short', top: '#fff1dc', topStyle: 'shirt', bottom: '#3f4a5e', bottomLen: 5, shoe: '#2f2a30', hat: 'cap', hatColor: '#3f4a5e' }, dir: 'right', moving: 0, seed: 1, emo: 'happy' };
    const me = { look: G.player?.look || G.state.player.look, dir: 'right', moving: 0, seed: 2, emo: 'neutral' };
    let captionStep = -1;
    const captions = [[0.4, 'Ngoài khơi Việt Nam…', 'Somewhere off the coast of Việt Nam…'], [4.6, 'Một hòn đảo nhỏ đang chờ.', 'A quiet little island is waiting.'], [8.8, null]];

    function frame(now) {
      if (done) return;
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      let T = (now - t0) / 1000;
      if (skipSignal?.skip) T = DUR;
      const k = clamp(T / DUR, 0, 1);
      for (let i = captions.length - 1; i >= 0; i--) if (T >= captions[i][0]) { if (captionStep !== i) { captionStep = i; onCaption?.(captions[i][1], captions[i][2]); } break; }

      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      const horizon = H * 0.46;
      // sky: warm morning
      const sky = c.createLinearGradient(0, 0, 0, horizon);
      sky.addColorStop(0, '#8fd3f0'); sky.addColorStop(0.7, '#ccefff'); sky.addColorStop(1, '#fff1d6');
      c.fillStyle = sky; c.fillRect(0, 0, W, horizon + 2);
      // sun
      const sx = W * 0.78, sy = horizon * 0.42;
      const sg = c.createRadialGradient(sx, sy, 0, sx, sy, 120); sg.addColorStop(0, 'rgba(255,245,200,1)'); sg.addColorStop(0.25, 'rgba(255,230,160,.9)'); sg.addColorStop(1, 'rgba(255,230,160,0)');
      c.fillStyle = sg; c.fillRect(sx - 120, sy - 120, 240, 240);
      circ(c, sx, sy, 28, '#fff4c8', null);
      // clouds
      for (const cl of clouds) {
        cl.x -= cl.sp * dt * (1 + k * 2);
        if (cl.x < -0.3) cl.x = 1.3;
        const x = cl.x * W, y = cl.y * H, s = cl.s * 26;
        c.fillStyle = 'rgba(255,255,255,.92)';
        for (const [dx, dy, r] of [[0, 0, 1], [0.9, 0.15, 0.8], [-0.9, 0.2, 0.7], [0.3, -0.45, 0.8]]) { c.beginPath(); c.arc(x + dx * s, y + dy * s, r * s, 0, TAU); c.fill(); }
        c.fillRect(x - s * 1.5, y, s * 3, s * 0.9);
      }
      // island on the horizon: grows as we approach
      const approach = ease.inOutCubic(clamp((T - 1) / (DUR - 2.4), 0, 1));
      const isx = W * lerp(0.62, 0.5, approach), isc = lerp(0.35, 2.6, approach);
      c.save(); c.translate(isx, horizon + 2); c.scale(isc, isc);
      drawFarIsland(c, T);
      c.restore();
      // sea
      const sea = c.createLinearGradient(0, horizon, 0, H);
      sea.addColorStop(0, '#6fcddb'); sea.addColorStop(0.5, '#4fb8ca'); sea.addColorStop(1, '#3aa3bb');
      c.fillStyle = sea; c.fillRect(0, horizon, W, H - horizon);
      // sun glitter path
      for (let i = 0; i < 40; i++) { const yy = horizon + 4 + (i * 13.7) % (H * 0.3), xx = sx + Math.sin(i * 3.1 + T * 2) * (10 + (yy - horizon) * 0.4); c.fillStyle = `rgba(255,250,220,${0.3 + 0.3 * Math.sin(T * 4 + i)})`; c.fillRect(xx - 6, yy, 12, 1.6); }
      // wave rows (parallax: faster when closer)
      for (let row = 0; row < 9; row++) {
        const y = horizon + 8 + Math.pow(row / 8, 1.6) * (H - horizon - 10);
        const sp = 20 + row * 30, amp = 1 + row * 0.8, len = 30 + row * 12;
        c.strokeStyle = `rgba(255,255,255,${0.25 + row * 0.05})`; c.lineWidth = 1 + row * 0.25;
        const off = (T * sp * (1 + approach)) % len;
        c.beginPath();
        for (let x = -len + (-off); x < W + len; x += len) { c.moveTo(x, y); c.quadraticCurveTo(x + len / 4, y - amp * 2, x + len / 2, y); }
        c.stroke();
      }
      // gulls
      for (const gl of gulls) { gl.x -= gl.sp * dt; if (gl.x < -0.1) gl.x = 1.1; const x = gl.x * W, y = gl.y * H + Math.sin(T + gl.ph) * 6, f = Math.sin(T * 8 + gl.ph) * 0.5; c.strokeStyle = INK; c.lineWidth = 1.6; c.beginPath(); c.moveTo(x - 8, y - f * 6); c.quadraticCurveTo(x - 4, y - 5, x, y); c.quadraticCurveTo(x + 4, y - 5, x + 8, y - f * 6); c.stroke(); }

      // boat: enters from the left, holds the frame, bobbing and skipping over waves
      const enter = ease.outCubic(clamp(T / 2.2, 0, 1));
      const bx = lerp(-W * 0.4, W * 0.4, enter) + Math.sin(T * 0.7) * 10;
      const by = H * 0.66 + Math.sin(T * 3.1) * 4 + Math.sin(T * 7.3) * 1.5;
      const tilt = Math.sin(T * 3.1 + 0.8) * 0.045 - 0.03;
      const sc = Math.min(W / 360, 1.35) * 1.15;
      // wake behind the boat
      for (let i = 0; i < 3; i++) if (Math.random() < 0.9) spray.push({ x: bx - 70 * sc + Math.random() * 10, y: by + 16 * sc + Math.random() * 6, vx: -120 - Math.random() * 80, vy: -40 - Math.random() * 70, life: 0, max: 0.6 + Math.random() * 0.5, r: 2 + Math.random() * 3 });
      for (const s of spray) { s.life += dt; s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 220 * dt; }
      for (let i = spray.length - 1; i >= 0; i--) if (spray[i].life > spray[i].max) spray.splice(i, 1);
      // foam trail
      c.fillStyle = 'rgba(255,255,255,.75)';
      c.beginPath(); c.moveTo(bx - 60 * sc, by + 18 * sc); c.quadraticCurveTo(bx - 200 * sc, by + 22 * sc, -40, by + 30 * sc + Math.sin(T * 5) * 3); c.lineTo(-40, by + 14 * sc); c.quadraticCurveTo(bx - 200 * sc, by + 12 * sc, bx - 60 * sc, by + 12 * sc); c.fill();
      c.save(); c.translate(bx, by); c.rotate(tilt); c.scale(sc, sc);
      drawSideBoat(c, T, cap, me);
      c.restore();
      for (const s of spray) { c.globalAlpha = 1 - s.life / s.max; circ(c, s.x, s.y, s.r, '#fff', null); } c.globalAlpha = 1;
      // bow splash
      c.fillStyle = 'rgba(255,255,255,.85)'; for (let i = 0; i < 4; i++) { const a = T * 9 + i; circ(c, bx + 66 * sc + Math.sin(a) * 4, by + 16 * sc - Math.abs(Math.sin(a * 1.3)) * 10, 2.4 + i % 2, '#fff', null); }

      // fade to white at the end
      if (T > DUR - 1.2) { c.fillStyle = `rgba(255,248,234,${clamp((T - (DUR - 1.2)) / 1.1, 0, 1)})`; c.fillRect(0, 0, W, H); }
      if (T >= DUR) { done = true; resolve(); return; }
      if (Math.floor(T * 2) !== Math.floor((T - dt) * 2) && T < DUR - 1.5) sfx('splash');
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    window.addEventListener('resize', resize, { once: true });
  });
}

function drawFarIsland(c, T) {
  // silhouette with palms, the lighthouse and tiny roofs
  c.beginPath(); c.moveTo(-120, 0); c.quadraticCurveTo(-90, -30, -40, -34); c.quadraticCurveTo(0, -52, 40, -38); c.quadraticCurveTo(90, -30, 120, 0); c.closePath();
  c.fillStyle = '#7cc47a'; c.fill(); c.strokeStyle = 'rgba(91,63,54,.5)'; c.lineWidth = 1; c.stroke();
  c.beginPath(); c.moveTo(-120, 0); c.quadraticCurveTo(0, -8, 120, 0); c.fillStyle = '#f5e2b3'; c.fill();
  // lighthouse
  poly(c, [-6, -40, -4, -66, 4, -66, 6, -40], '#fff8ee', 'rgba(91,63,54,.6)', 0.8);
  c.fillStyle = '#e8584e'; c.fillRect(-5, -56, 10, 5); c.fillRect(-4.5, -64, 9, 3);
  if (Math.sin(T * 2) > 0) circ(c, 0, -68, 3, '#fff4c8', null);
  // roofs
  for (const [x, col] of [[-50, '#d9784f'], [-30, '#f28f7c'], [26, '#d9784f'], [52, '#9fb4dc']]) { box(c, x - 6, -30, 12, 8, 1, '#fff1dc', 'rgba(91,63,54,.5)', 0.5); poly(c, [x - 8, -30, x + 8, -30, x, -37], col, 'rgba(91,63,54,.5)', 0.5); }
  // palms
  for (const x of [-86, -70, 70, 92]) { c.strokeStyle = '#a8764a'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(x, -8); c.quadraticCurveTo(x + 3, -18, x + 1, -26); c.stroke(); for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i - 2) * 0.6; c.strokeStyle = '#5eae4e'; c.lineWidth = 2; c.beginPath(); c.moveTo(x + 1, -26); c.quadraticCurveTo(x + 1 + Math.cos(a) * 6, -26 + Math.sin(a) * 6 - 2, x + 1 + Math.cos(a) * 10, -26 + Math.sin(a) * 6 + 3); c.stroke(); } }
  // dock
  box(c, 4, -3, 30, 3, 0.5, '#c9955e', null);
}

function drawSideBoat(c, T, cap, me) {
  // hull
  c.beginPath();
  c.moveTo(-72, -6); c.lineTo(70, -8); c.quadraticCurveTo(80, -8, 76, 0); c.quadraticCurveTo(60, 20, 20, 22); c.lineTo(-64, 20); c.quadraticCurveTo(-74, 12, -72, -6); c.closePath();
  c.fillStyle = '#fffaf0'; c.fill(); c.strokeStyle = INK; c.lineWidth = 2; c.stroke();
  c.fillStyle = '#f08ca0'; c.beginPath(); c.moveTo(-70, 4); c.lineTo(74, 2); c.quadraticCurveTo(70, 8, 64, 9); c.lineTo(-68, 11); c.closePath(); c.fill();
  c.fillStyle = '#6fbfb0'; c.fillRect(-66, 13, 80, 3);
  // windows on hull
  for (let i = 0; i < 4; i++) circ(c, -46 + i * 20, -1, 2.6, '#a9dcee', INK, 1);
  // cabin
  c.beginPath(); c.moveTo(-34, -6); c.lineTo(-30, -30); c.lineTo(18, -30); c.quadraticCurveTo(36, -30, 42, -8); c.closePath();
  c.fillStyle = '#fff5df'; c.fill(); c.strokeStyle = INK; c.lineWidth = 1.8; c.stroke();
  c.beginPath(); c.moveTo(20, -27); c.quadraticCurveTo(33, -27, 38, -10); c.lineTo(20, -10); c.closePath(); c.fillStyle = '#a9dcee'; c.fill(); c.stroke();
  box(c, -34, -36, 56, 7, 3, '#f08ca0', INK, 1.6);
  // passengers peeking out, looking ahead
  c.save(); c.translate(-6, -8); c.scale(0.9, 0.9); c.beginPath(); c.rect(-20, -60, 40, 44); c.clip(); drawHuman(c, { ...me, t: T, blinkAmt: Math.sin(T * 1.7) > 0.97 ? 1 : 0, emo: T > 6 ? 'happy' : 'neutral' }, T); c.restore();
  c.save(); c.translate(-26, -8); c.scale(0.9, 0.9); c.beginPath(); c.rect(-20, -60, 40, 44); c.clip(); drawHuman(c, { ...cap, t: T, blinkAmt: 0 }, T); c.restore();
  // flag
  limb(c, [-58, -6, -58, -40], 1.4, '#8a5f3e');
  const f = Math.sin(T * 10) * 3;
  c.beginPath(); c.moveTo(-58, -40); c.quadraticCurveTo(-70, -38 + f, -80, -36 - f * 0.5); c.lineTo(-80, -28 - f * 0.5); c.quadraticCurveTo(-70, -30 + f, -58, -32); c.closePath(); c.fillStyle = '#e8584e'; c.fill(); c.strokeStyle = INK; c.lineWidth = 1; c.stroke();
  // little yellow star on the flag
  c.fillStyle = '#ffd35a'; c.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 1.2 : 2.8; c.lineTo(-69 + Math.cos(a) * r, -34 + Math.sin(a) * r); } c.closePath(); c.fill();
}

// Top-down fast boat used for the docking and later ferries.
export function drawBoatTop(c, t, p) {
  const bob = Math.sin(t * 2.2) * 1.2, roll = Math.sin(t * 1.7) * 0.02;
  const moving = p.speed || 0;
  c.save();
  c.translate(0, bob);
  // wake
  if (moving > 5) {
    const k = Math.min(1, moving / 60);
    c.fillStyle = `rgba(255,255,255,${0.55 * k})`;
    c.beginPath(); c.moveTo(-12, 40); c.quadraticCurveTo(-34, 90, -50, 150); c.lineTo(-30, 150); c.quadraticCurveTo(-18, 90, 0, 44); c.quadraticCurveTo(18, 90, 30, 150); c.lineTo(50, 150); c.quadraticCurveTo(34, 90, 12, 40); c.closePath(); c.fill();
    for (let i = 0; i < 6; i++) { const kk = (t * 1.5 + i / 6) % 1; c.globalAlpha = (1 - kk) * k; ell(c, (i % 2 ? -1 : 1) * (14 + kk * 30), 44 + kk * 100, 4 + kk * 6, 2 + kk * 2, '#fff', null); } c.globalAlpha = 1;
  } else {
    for (let i = 0; i < 2; i++) { const kk = (t * 0.5 + i / 2) % 1; c.globalAlpha = 0.5 * (1 - kk); ell(c, 0, 0, 30 + kk * 18, 50 + kk * 16, null, '#fff', 1.4); } c.globalAlpha = 1;
  }
  c.rotate(roll);
  const s = p.scale || 1; c.scale(s, s);
  // hull (pointing north)
  ell(c, 3, 6, 25, 46, 'rgba(30,60,70,.22)', null);
  c.beginPath(); c.moveTo(0, -50); c.quadraticCurveTo(26, -24, 24, 18); c.quadraticCurveTo(22, 40, 0, 42); c.quadraticCurveTo(-22, 40, -24, 18); c.quadraticCurveTo(-26, -24, 0, -50); c.closePath();
  c.fillStyle = '#fffaf0'; c.fill(); c.strokeStyle = INK; c.lineWidth = 1.6; c.stroke();
  c.save(); c.clip(); c.fillStyle = p.stripe || '#f08ca0'; c.fillRect(-30, 30, 60, 5); c.fillRect(-30, -40, 60, 3); c.restore();
  // deck + cabin
  c.beginPath(); c.moveTo(0, -38); c.quadraticCurveTo(18, -18, 17, 16); c.lineTo(-17, 16); c.quadraticCurveTo(-18, -18, 0, -38); c.closePath(); c.fillStyle = '#e9d0a8'; c.fill(); c.strokeStyle = INK; c.lineWidth = 1; c.stroke();
  box(c, -13, -16, 26, 22, 5, p.cabin || '#fff5df', INK, 1.3);
  box(c, -11, -18, 22, 7, 3, '#a9dcee', INK, 1);
  for (let i = 0; i < 2; i++) box(c, -12 + i * 14, 20, 10, 12, 3, '#6fbfb0', INK, 0.9);
  c.restore();
}
