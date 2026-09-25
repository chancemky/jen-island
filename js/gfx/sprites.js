// Hand-drawn cast renderer. The characters from the style reference sheet are
// drawn as images and brought to life procedurally: waddle-walk with stepping
// feet, breathing, blinking, happy ^^ eyes, turn flips, hops, sitting, held
// items and small role actions (camera flash, music notes, sweeping, jogging,
// scooter vibration). Feet sit at (0,0) like the vector rig.

import { TAU } from '../core/util.js';
import { SPRITES } from '../data/sprites.js';
import { APP_VERSION } from '../data/changelog.js';
import { shadow, circ, INK } from './draw.js';
import { drawHeld } from './food.js';

const SPR = {};
const LEG = 0.8;      // fraction of image height where the legs start
const EYE_Y = -24.8;  // where the vector rig's eyes are (portraits align to this)

export function spriteReady(id) { return !!SPR[id]?.ok; }
export function spriteMeta(id) { return SPRITES[id]; }
export function spriteHeight(id) { return SPRITES[id]?.wh || 42; }

// Loads every sprite and precomputes blink / happy-eye overlays. Resolves when
// all are in (or failed, in which case the vector rig is used as a fallback).
export function loadSprites(base = 'assets/chars/') {
  return Promise.all(Object.keys(SPRITES).map(id => new Promise(res => {
    const img = new Image();
    img.onload = () => { try { SPR[id] = prep(id, img); } catch (e) { SPR[id] = { img, ok: true }; } res(); };
    img.onerror = () => res();
    img.src = base + id + '.png?v=' + APP_VERSION;
  })));
}

function prep(id, img) {
  const m = SPRITES[id], w = img.naturalWidth, h = img.naturalHeight;
  const S = { img, ok: true, w, h };
  if (!m.eyes || m.noblink) return S;
  const src = document.createElement('canvas'); src.width = w; src.height = h;
  const sc = src.getContext('2d', { willReadFrequently: true }); sc.drawImage(img, 0, 0);
  const data = sc.getImageData(0, 0, w, h).data;
  const px = (x, y) => { x = Math.max(0, Math.min(w - 1, Math.round(x))); y = Math.max(0, Math.min(h - 1, Math.round(y))); const i = (y * w + x) * 4; return [data[i], data[i + 1], data[i + 2], data[i + 3]]; };
  const erx = Math.max(3.2, (m.er?.[0] || 0.05) * w * 0.62), ery = Math.max(3.6, (m.er?.[1] || 0.035) * h * 0.7);
  const mk = (kind) => {
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const c = cv.getContext('2d');
    for (const [fx, fy] of m.eyes) {
      const x = fx * w, y = fy * h;
      // skin colour: average of a few samples just below the eye
      let r = 0, g = 0, b = 0, n = 0;
      for (const [ox, oy] of [[0, 1.75], [-0.6, 1.6], [0.6, 1.6], [0, 2.1]]) { const p = px(x + ox * erx, y + oy * ery); if (p[3] > 200 && p[0] > 150) { r += p[0]; g += p[1]; b += p[2]; n++; } }
      const skin = n ? `rgb(${r / n | 0},${g / n | 0},${b / n | 0})` : '#f6d7c2';
      c.fillStyle = skin; c.beginPath(); c.ellipse(x, y, erx * 1.28, ery * 1.22, 0, 0, TAU); c.fill();
      c.strokeStyle = '#3b2622'; c.lineWidth = Math.max(1.3, w / 70); c.lineCap = 'round';
      c.beginPath();
      if (kind === 'blink') { c.moveTo(x - erx, y + ery * 0.15); c.quadraticCurveTo(x, y + ery * 0.85, x + erx, y + ery * 0.15); }
      else { c.moveTo(x - erx, y + ery * 0.45); c.quadraticCurveTo(x, y - ery * 0.75, x + erx, y + ery * 0.45); }
      c.stroke();
    }
    return cv;
  };
  S.blink = mk('blink'); S.happy = mk('happy');
  return S;
}

// Role idle actions play when the character is standing still for a while.
function roleFx(c, a, m, t, H, S) {
  const role = m.role, ph = (t + (a.seed || 0)) % 7;
  if (role === 'photo' && ph < 0.18) { // flash
    c.save(); c.globalAlpha = 1 - ph / 0.18; c.fillStyle = '#fffbe0';
    c.beginPath(); c.arc(-S.w * 0.08, -H * 0.55, 6 + ph * 40, 0, TAU); c.fill(); c.restore();
  }
  if (role === 'music') {
    for (let i = 0; i < 2; i++) {
      const k = ((t * 0.5 + i * 0.5 + (a.seed || 0)) % 1);
      c.save(); c.globalAlpha = 1 - k; c.translate(10 + k * 8 + i * 4, -H * 0.55 - k * 16); c.fillStyle = i ? '#7a5cc8' : '#e56b8b';
      c.beginPath(); c.ellipse(0, 0, 2.2, 1.7, -0.3, 0, TAU); c.fill(); c.fillRect(1.4, -7, 1, 7); c.restore();
    }
  }
  if (role === 'paint' && ph < 3) {
    const k = ph / 3;
    c.save(); c.globalAlpha = 0.9 * (1 - k); c.fillStyle = ['#f28f7c', '#6fbfb0', '#f7de8c'][Math.floor(t) % 3];
    circ(c, 12 + Math.sin(k * 9) * 3, -H * 0.4 - k * 10, 1.3, c.fillStyle, null); c.restore();
  }
}

// Main entry: draws the sprite actor with feet at the origin.
export function drawSprite(c, a, t) {
  const L = a.look, id = L.sprite, m = SPRITES[id], S = SPR[id];
  const H = (m.wh || 42) * (L.spriteScale || 1), k = H / S.h, W = S.w * k;
  const mov = a.moving || 0, ph = a.walkPh || 0, seed = a.seed || 0;
  const type = m.type || 'walker';
  const vehicle = type === 'vehicle';
  // facing: sprites are drawn facing front (or left for the scooter)
  let flip = 1;
  if (vehicle) flip = a.dir === 'right' ? -1 : a.dir === 'left' ? 1 : (a._lastFlip || 1);
  else flip = a.dir === 'left' ? -1 : a.dir === 'right' ? 1 : (a._lastFlip || 1);
  if (a.dir === 'left' || a.dir === 'right') a._lastFlip = flip;
  const turn = a.turnT > 0 ? a.turnT / 0.14 : 0;

  // body motion
  const speedK = type === 'elder' ? 0.6 : type === 'kid' ? 1.35 : 1;
  const breathe = Math.sin(t * 2.3 + seed) * (1 - mov);
  let bob = vehicle ? Math.sin(t * 30) * 0.35 * mov : Math.abs(Math.sin(ph)) * (type === 'kid' ? 2.2 : 1.6) * mov;
  let tilt = vehicle ? 0 : Math.sin(ph) * 0.075 * mov * speedK;
  let sx = 1, sy = 1 + breathe * 0.014;
  if (type === 'dress' || type === 'elder') tilt += Math.sin(t * 1.3 + seed) * 0.012 * (1 - mov);
  // actions
  const act = a.act, at = a.actT || 0;
  let held = null, hx = W * 0.18, hy = -H * 0.34;
  switch (act) {
    case 'wave': tilt += Math.sin(t * 9) * 0.07; break;
    case 'cheer': bob += Math.abs(Math.sin(t * 9)) * 3; break;
    case 'think': tilt += 0.06; break;
    case 'carry': held = a.held; hx = 0; hy = -H * 0.3; break;
    case 'drink': case 'eat': { const up = (Math.sin(at * 2.2) + 1) / 2 > 0.72; held = a.held || (act === 'drink' ? 'cup' : 'bowl'); hx = W * 0.1; hy = up ? -H * 0.55 : -H * 0.34; if (up) sy *= 0.985; break; }
    case 'hold': held = a.held; break;
    case 'chop': case 'work': case 'hammer': bob += Math.abs(Math.sin(at * 12)) * 0.8; tilt += Math.sin(at * 12) * 0.02; held = act === 'chop' ? 'knife' : act === 'hammer' ? 'hammer' : a.held; hy -= Math.abs(Math.sin(at * 12)) * 3; break;
    case 'stir': tilt += Math.sin(at * 8) * 0.03; held = 'ladle'; hx += Math.cos(at * 8) * 2; break;
    case 'write': held = 'notebook'; tilt += Math.sin(at * 5) * 0.015; break;
    case 'clean': case 'sweep': tilt += Math.sin(at * 6) * 0.05; held = act === 'clean' ? 'cloth' : null; break;
    case 'phone': held = 'phone'; hy = -H * 0.45; break;
    case 'photo': held = 'camera'; hy = -H * 0.6; hx = 0; break;
    case 'wait': tilt += Math.sin(t * 2.4 + seed) * 0.025; break;
    case 'dance': tilt += Math.sin(at * 7) * 0.12; bob += Math.abs(Math.sin(at * 7)) * 2.4; sx *= 1 + Math.sin(at * 14) * 0.03; break;
    case 'stretch': { const k = Math.sin(Math.min(1, at / 1.6) * Math.PI); sy *= 1 + k * 0.07; sx *= 1 - k * 0.04; break; }
    case 'sleep': sy *= 0.99; break;
  }
  if (turn) sx *= 1 - 0.85 * turn;
  if (a.squash) { sy *= 1 - a.squash * 0.16; sx *= 1 + a.squash * 0.12; }
  if (a.emo === 'sad') sy *= 0.975;

  c.save();
  shadow(c, 0, 0.4, Math.min(W * 0.36, vehicle ? 16 : 10), 3.2, a.sit ? 0.12 : 0.2);
  if (a.portrait) { const ef = m.eyes ? (m.eyes[0][1] + m.eyes[1][1]) / 2 : 0.26; c.translate(0, EYE_Y); c.scale(1.22, 1.22); c.translate(0, (1 - ef) * H); }
  const hop = a.hop || 0;
  c.translate(0, -bob - hop + breathe * 0.2);
  c.rotate(tilt);
  c.scale(sx * flip, sy);
  c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';

  const legTop = LEG * S.h, legH = S.h - legTop;
  const x0 = -W / 2;
  if (a.sit) {
    // seated: upper body lowered onto the seat, legs folded short
    const fold = 0.42;
    c.drawImage(S.img, 0, legTop, S.w, legH, x0, -legH * k * fold, W, legH * k * fold);
    c.drawImage(S.img, 0, 0, S.w, legTop, x0, -H + legH * k * (1 - fold), W, legTop * k);
    overlays(c, a, S, m, x0, -H + legH * k * (1 - fold), k, t);
  } else if (!vehicle && mov > 0.05 && type !== 'dress') {
    // stepping: the lower body is split at the feet centre and each half is
    // squashed upward in turn so a foot lifts off the ground
    const fc = (m.fc || 0.5) * S.w;
    const liftL = Math.max(0, Math.sin(ph)) * mov * 0.22, liftR = Math.max(0, -Math.sin(ph)) * mov * 0.22;
    c.drawImage(S.img, 0, 0, S.w, legTop, x0, -H, W, legTop * k);
    c.drawImage(S.img, 0, legTop, fc, legH, x0, -legH * k, fc * k, legH * k * (1 - liftL));
    c.drawImage(S.img, fc, legTop, S.w - fc, legH, x0 + fc * k, -legH * k, (S.w - fc) * k, legH * k * (1 - liftR));
    overlays(c, a, S, m, x0, -H, k, t);
  } else if (type === 'dress' && mov > 0.05) {
    // skirt sway: lower body skews with the step
    c.drawImage(S.img, 0, 0, S.w, legTop, x0, -H, W, legTop * k);
    c.save(); c.translate(0, -legH * k); c.transform(1, 0, Math.sin(ph) * 0.12 * mov, 1, 0, 0);
    c.drawImage(S.img, 0, legTop, S.w, legH, x0, 0, W, legH * k * (1 - Math.abs(Math.sin(ph)) * 0.05 * mov));
    c.restore();
    overlays(c, a, S, m, x0, -H, k, t);
  } else {
    c.drawImage(S.img, x0, -H, W, H);
    overlays(c, a, S, m, x0, -H, k, t);
  }
  if (vehicle && mov > 0.2) { // exhaust puffs behind the scooter
    for (let i = 0; i < 3; i++) { const q = (t * 2 + i / 3) % 1; c.globalAlpha = 0.35 * (1 - q); circ(c, W * 0.5 + q * 10, -4 - q * 4, 1.5 + q * 3, '#e9e4dc', null); }
    c.globalAlpha = 1;
  }
  c.restore();
  // things drawn unflipped and unrotated
  if (held) { c.save(); c.translate(0, -bob - hop); drawHeld(c, held, hx * flip, hy, t, 'front', {}); c.restore(); }
  if (!mov && !a.act && m.role) { c.save(); c.translate(0, -hop); roleFx(c, a, m, t, H, S); c.restore(); }
  if (vehicle) void INK;
}

function overlays(c, a, S, m, x0, y0, k, t) {
  if (!S.blink) return;
  const closed = a.act === 'sleep' || (a.blinkAmt || 0) > 0.45;
  if (closed) c.drawImage(S.blink, x0, y0, S.w * k, S.h * k);
  else if (a.emo === 'happy' && Math.sin(t * 0.9 + (a.seed || 0)) > 0.2) c.drawImage(S.happy, x0, y0, S.w * k, S.h * k);
}

// Height above the feet where emotes should float.
export function spriteTop(L) { return (SPRITES[L.sprite]?.wh || 42) * (L.spriteScale || 1) + 4; }
