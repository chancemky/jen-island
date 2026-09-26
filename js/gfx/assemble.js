// Progressive dish assembly for the order counter. Every ingredient is drawn
// where it really goes, in the order the player added it: a split baguette
// with fillings stacked between the halves, noodles then broth then beef in a
// bowl, a crêpe that folds over its filling, rice paper that rolls up… so the
// board always shows exactly what was built (including mistakes).
// Units: roughly ±36 wide around the origin; `a` is a 0..1 drop-in animation.

import { TAU } from '../core/util.js';
import { INK, ell, circ, box, shadow, poly } from './draw.js';

const rngOf = s => () => ((s = (s * 16807) % 2147483647) / 2147483647);

// ---------------------------------------------------------------- pieces
function leaves(c, n, x0, y0, w, h, seed, col = '#6fae4f', col2 = '#8fca63') {
  const r = rngOf(seed);
  for (let i = 0; i < n; i++) {
    const x = x0 + (r() - 0.5) * w, y = y0 + (r() - 0.5) * h, an = r() * TAU;
    c.save(); c.translate(x, y); c.rotate(an);
    c.beginPath(); c.moveTo(-2.6, 0); c.quadraticCurveTo(0, -2.4, 2.6, 0); c.quadraticCurveTo(0, 2.4, -2.6, 0);
    c.fillStyle = i % 2 ? col : col2; c.fill(); c.strokeStyle = 'rgba(60,90,40,.6)'; c.lineWidth = 0.5; c.stroke();
    c.restore();
  }
}
function porkSlices(c, x, y, w, n = 3) {
  for (let i = 0; i < n; i++) {
    const px = x + (i - (n - 1) / 2) * (w / n);
    c.save(); c.translate(px, y + (i % 2) * 0.6); c.rotate((i - 1) * 0.12);
    box(c, -w / n / 2 - 0.8, -2, w / n + 1.6, 4, 1.6, '#b8663a', INK, 0.7);
    c.strokeStyle = '#7a3a1e'; c.lineWidth = 0.7; c.beginPath(); c.moveTo(-2, -0.6); c.lineTo(1.6, 0.8); c.stroke();
    c.restore();
  }
}
function eggFried(c, x, y, s = 1) {
  c.save(); c.translate(x, y); c.scale(s, s);
  c.beginPath(); c.moveTo(-8, 0); c.bezierCurveTo(-9, -4, -3, -5, 0, -4); c.bezierCurveTo(5, -5, 9, -3, 8, 0); c.bezierCurveTo(7, 3, -6, 3.6, -8, 0);
  c.fillStyle = '#fffdf2'; c.fill(); c.strokeStyle = INK; c.lineWidth = 0.7; c.stroke();
  circ(c, 0.5, -1, 2.8, '#ffc93a', '#e3a52c', 0.6); circ(c, -0.4, -1.8, 0.8, '#ffe89a', null);
  c.restore();
}
function shreds(c, x, y, w, seed, cols) {
  const r = rngOf(seed);
  for (let i = 0; i < 9; i++) {
    const px = x + (r() - 0.5) * w, py = y + (r() - 0.5) * 2.6;
    c.strokeStyle = cols[i % cols.length]; c.lineWidth = 1.1; c.lineCap = 'round';
    c.beginPath(); c.moveTo(px - 2.2, py); c.lineTo(px + 2.2, py + (r() - 0.5) * 1.6); c.stroke();
  }
}
function cucumber(c, x, y, w, n = 4) {
  for (let i = 0; i < n; i++) { const px = x + (i - (n - 1) / 2) * (w / n); ell(c, px, y, 2.6, 1.8, '#9fd46a', '#4f8f3a', 0.6); ell(c, px, y, 1.4, 0.9, '#e9f7cf', null); }
}
function shrimp(c, x, y, rot = 0, s = 1) {
  c.save(); c.translate(x, y); c.rotate(rot); c.scale(s, s);
  c.beginPath(); c.arc(0, 0, 4, Math.PI * 0.1, Math.PI * 1.25); c.strokeStyle = '#f08a6a'; c.lineWidth = 3; c.stroke();
  c.beginPath(); c.arc(0, 0, 4, Math.PI * 0.1, Math.PI * 1.25); c.strokeStyle = '#ffc3a8'; c.lineWidth = 1; c.stroke();
  for (let k = 0; k < 3; k++) { const an = Math.PI * (0.35 + k * 0.28); c.strokeStyle = '#d96a4a'; c.lineWidth = 0.5; c.beginPath(); c.moveTo(Math.cos(an) * 2.6, Math.sin(an) * 2.6); c.lineTo(Math.cos(an) * 5.4, Math.sin(an) * 5.4); c.stroke(); }
  c.restore();
}
function noodles(c, x, y, w, h, col = '#fbf6e8') {
  const path = (i, dy) => { const yy = y + (i - 3) * h / 7 + dy; c.beginPath(); c.moveTo(x - w / 2, yy); c.bezierCurveTo(x - w / 4, yy - 2.4, x + w / 4, yy + 2.4, x + w / 2, yy); };
  c.save(); c.lineCap = 'round';
  c.fillStyle = '#efe0bc'; c.beginPath(); c.ellipse(x, y, w / 2 + 1, h / 2 + 2, 0, 0, TAU); c.fill(); c.strokeStyle = 'rgba(150,120,80,.5)'; c.lineWidth = 0.7; c.stroke();
  for (let i = 0; i < 7; i++) { path(i, 0.5); c.strokeStyle = '#bfa274'; c.lineWidth = 2; c.stroke(); path(i, 0); c.strokeStyle = col; c.lineWidth = 1.2; c.stroke(); }
  c.restore();
}
function beefSlices(c, x, y, w, n = 4) {
  for (let i = 0; i < n; i++) {
    const px = x + (i - (n - 1) / 2) * (w / n);
    c.save(); c.translate(px, y + (i % 2) * 1.2); c.rotate(-0.3 + i * 0.2);
    c.beginPath(); c.ellipse(0, 0, 3.8, 2.2, 0, 0, TAU); c.fillStyle = '#d98a86'; c.fill(); c.strokeStyle = '#9a4f4a'; c.lineWidth = 0.6; c.stroke();
    c.strokeStyle = 'rgba(255,230,220,.8)'; c.lineWidth = 0.5; c.beginPath(); c.moveTo(-2, -0.4); c.lineTo(2, 0.4); c.stroke();
    c.restore();
  }
}
function lime(c, x, y) { c.save(); c.translate(x, y); c.beginPath(); c.moveTo(-3.6, 0); c.arc(0, 0, 3.6, Math.PI, TAU); c.closePath(); c.fillStyle = '#b9e07a'; c.fill(); c.strokeStyle = '#4f8f3a'; c.lineWidth = 0.8; c.stroke(); for (let k = 1; k < 4; k++) { const an = Math.PI + k * Math.PI / 4; c.strokeStyle = '#e9f7cf'; c.lineWidth = 0.5; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(an) * 3, Math.sin(an) * 3); c.stroke(); } c.restore(); }
function dipBowl(c, x, y, col = '#e9a25a') { ell(c, x, y + 1.5, 5.4, 2.4, 'rgba(0,0,0,.12)', null); ell(c, x, y, 5, 2.4, '#fffdf6'); ell(c, x, y - 0.2, 3.8, 1.5, col, null); circ(c, x - 1, y - 0.4, 0.4, '#e2553f', null); circ(c, x + 1.2, y, 0.4, '#e2553f', null); }
function steam(c, x, y, t, n = 3) {
  c.save(); c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = 1.2; c.lineCap = 'round';
  for (let i = 0; i < n; i++) { const k = (t * 0.6 + i / n) % 1; c.globalAlpha = 0.8 * (1 - k); const px = x + (i - 1) * 6; c.beginPath(); c.moveTo(px, y - k * 14); c.bezierCurveTo(px + 3, y - 4 - k * 14, px - 3, y - 8 - k * 14, px, y - 12 - k * 14); c.stroke(); }
  c.restore();
}
// drop-in: pieces fall onto the dish with a tiny bounce
function drop(c, a, fn) {
  if (a <= 0) return;
  const k = Math.min(1, a), fall = (1 - k) * 16, sq = k > 0.8 ? 1 + Math.sin((k - 0.8) / 0.2 * Math.PI) * 0.08 : 1;
  c.save(); c.globalAlpha *= Math.min(1, k * 2); c.translate(0, -fall); c.scale(1 / sq, sq); fn(); c.restore();
}

// ---------------------------------------------------------------- vessels
function baguette(c, open, top) {
  // bottom half (or whole loaf) — golden crust with scoring
  const g = c.createLinearGradient(0, -8, 0, 6); g.addColorStop(0, '#f2c16e'); g.addColorStop(1, '#c98a3a');
  if (!top) {
    c.beginPath(); c.moveTo(-30, 0); c.bezierCurveTo(-31, 6, -22, 7, 0, 7); c.bezierCurveTo(22, 7, 31, 6, 30, 0); c.bezierCurveTo(25, -1.4, -25, -1.4, -30, 0);
    c.fillStyle = g; c.fill(); c.strokeStyle = INK; c.lineWidth = 0.9; c.stroke();
    if (open) { c.beginPath(); c.moveTo(-28, 0); c.bezierCurveTo(-24, -1.4, 24, -1.4, 28, 0); c.bezierCurveTo(24, 1.8, -24, 1.8, -28, 0); c.fillStyle = '#fff1cf'; c.fill(); }
  } else {
    c.beginPath(); c.moveTo(-30, 0); c.bezierCurveTo(-31, -8, -20, -10, 0, -10); c.bezierCurveTo(20, -10, 31, -8, 30, 0); c.bezierCurveTo(24, 1.6, -24, 1.6, -30, 0);
    c.fillStyle = g; c.fill(); c.strokeStyle = INK; c.lineWidth = 0.9; c.stroke();
    c.strokeStyle = 'rgba(255,240,200,.8)'; c.lineWidth = 1.2;
    for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(i * 9 - 3, -7.4); c.quadraticCurveTo(i * 9, -9.4, i * 9 + 3, -7.2); c.stroke(); }
  }
}

// ---------------------------------------------------------------- dishes
function drawBread(c, R, asm, t, done) {
  const steps = asm.steps, A = asm.anim;
  const hasBread = steps.includes('bread_split');
  const fill = steps.map((k, i) => ({ k, a: A[i] })).filter(s => s.k !== 'bread_split');
  shadow(c, 0, 9, 32, 5, 0.18);
  // cutting board under everything
  box(c, -36, -4, 72, 16, 4, '#e3c08e', INK, 0.9); c.fillStyle = 'rgba(160,110,60,.25)'; c.fillRect(-32, 6, 64, 1.2);
  const close = done ? Math.min(1, asm.closeK || 0) : 0;
  const bi = steps.indexOf('bread_split');
  c.save();
  if (hasBread) drop(c, A[bi], () => baguette(c, true, false));
  // fillings stack up between the halves, bottom to top in the order added
  let y = -1;
  for (const f of fill) {
    const yy = y;
    drop(c, f.a, () => {
      switch (f.k) {
        case 'pate': c.beginPath(); c.moveTo(-25, yy); c.bezierCurveTo(-20, yy - 2.4, 20, yy - 2.4, 25, yy); c.bezierCurveTo(20, yy + 1, -20, yy + 1, -25, yy); c.fillStyle = '#a8653e'; c.fill(); break;
        case 'pork_grilled': porkSlices(c, 0, yy - 1.6, 44, 4); break;
        case 'egg_fried': eggFried(c, -8, yy - 1.2, 0.9); eggFried(c, 9, yy - 1, 0.8); break;
        case 'pickles': shreds(c, 0, yy - 1, 44, 7, ['#f2a14e', '#fff1dc', '#f7c27a']); break;
        case 'cucumber_cut': cucumber(c, 0, yy - 1, 42, 5); break;
        case 'cilantro': leaves(c, 9, 0, yy - 2, 44, 3, 11); break;
        default: circ(c, 0, yy - 1, 3, '#ddd', INK, 0.5);
      }
    });
    y -= f.k === 'pate' ? 1.2 : 2.4;
  }
  // top half: hinged open while building, closes when the sandwich is complete
  if (hasBread) drop(c, A[bi], () => {
    c.save(); c.translate(-27, y + 0.4);
    c.rotate(-0.62 * (1 - close));
    c.translate(27 + (1 - close) * 1, -0.4 + close * 0.5);
    baguette(c, true, true);
    c.restore();
  });
  c.restore();
}

function drawBowl(c, R, asm, t, done) {
  const steps = asm.steps, A = asm.anim;
  const bowlBack = () => { ell(c, 0, -4, 24, 7.2, '#fffdf6'); ell(c, 0, -4, 21, 5.6, '#efe7d6', null); };
  shadow(c, 0, 14, 26, 6, 0.2);
  bowlBack();
  // contents clip to the bowl opening
  c.save(); c.beginPath(); c.ellipse(0, -4, 21, 5.6, 0, 0, TAU); c.rect(-19, -30, 38, 26); c.clip();
  const brothI = steps.findIndex(k => k === 'broth' || k === 'broth_spicy');
  const spicy = steps.includes('broth_spicy');
  steps.forEach((k, i) => {
    const a = A[i];
    drop(c, a, () => {
      switch (k) {
        case 'noodles': noodles(c, 0, -5.5, 30, 6, R.id === 'bun_bo_hue' || R.id === 'bun_thit_nuong' ? '#fffaf0' : '#fbf6e8'); break;
        case 'broth': case 'broth_spicy': {
          const lvl = Math.min(1, a * 1.3);
          c.globalAlpha *= 0.72; ell(c, 0, -4 + (1 - lvl) * 3, 21, 5.6 * lvl, spicy ? '#e0673a' : '#e8b86a', null); c.globalAlpha /= 0.72;
          if (spicy) for (let n = 0; n < 7; n++) circ(c, Math.cos(n * 2.1) * 13, -4 + Math.sin(n * 1.7) * 3, 0.9, '#c43d23', null);
          else for (let n = 0; n < 5; n++) circ(c, Math.cos(n * 2.3) * 12, -4 + Math.sin(n * 1.9) * 3, 0.7, 'rgba(255,240,190,.9)', null);
          break;
        }
        case 'beef_sliced': beefSlices(c, 2, -5, 26, 4); break;
        case 'pork_grilled': porkSlices(c, 3, -5, 24, 3); break;
        case 'herbs': leaves(c, 8, -8, -6, 16, 4, 5); break;
        case 'pickles': shreds(c, 9, -3, 12, 3, ['#f2a14e', '#fff1dc']); break;
        default: void 0;
      }
    });
  });
  c.restore();
  // bowl front
  c.beginPath(); c.moveTo(-24, -4); c.quadraticCurveTo(-23, 15, 0, 16); c.quadraticCurveTo(23, 15, 24, -4); c.quadraticCurveTo(0, 5, -24, -4);
  c.fillStyle = '#fffdf6'; c.fill(); c.strokeStyle = INK; c.lineWidth = 1; c.stroke();
  c.strokeStyle = '#6aa5d8'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-19, 4); c.quadraticCurveTo(0, 12, 19, 4); c.stroke();
  c.beginPath(); c.ellipse(0, -4, 24, 7.2, 0, 0, TAU); c.strokeStyle = INK; c.lineWidth = 1; c.stroke();
  // extras beside the bowl
  steps.forEach((k, i) => {
    if (k === 'lime_wedge') drop(c, A[i], () => lime(c, 20, -9));
    if (k === 'fish_sauce') drop(c, A[i], () => dipBowl(c, 28, 10));
  });
  if (brothI >= 0 && A[brothI] >= 1) steam(c, 0, -12, t);
}

function drawPlate(c, R, asm, t, done) {
  const steps = asm.steps, A = asm.anim;
  shadow(c, 0, 10, 30, 6, 0.18);
  ell(c, 0, 3, 30, 12, '#fffdf5'); ell(c, 0, 2.4, 24, 9, null, 'rgba(91,63,54,.2)', 1);
  c.beginPath(); c.ellipse(0, 3, 30, 12, 0, 0, TAU); c.strokeStyle = INK; c.lineWidth = 1; c.stroke();
  if (R.id === 'goi_cuon') {
    const rolled = steps.includes('roll');
    const ri = steps.indexOf('roll'), rk = rolled ? Math.min(1, A[ri]) : 0;
    const paperI = steps.indexOf('rice_paper');
    if (!rolled || rk < 1) {
      c.save(); c.globalAlpha = 1 - rk;
      if (paperI >= 0) drop(c, A[paperI], () => { ell(c, 0, 1, 22, 8.5, 'rgba(250,245,235,.85)', 'rgba(150,130,110,.6)', 0.8); c.strokeStyle = 'rgba(200,190,170,.5)'; c.lineWidth = 0.4; for (let i = -3; i <= 3; i++) { c.beginPath(); c.moveTo(i * 6 - 3, -4); c.lineTo(i * 6 + 3, 6); c.stroke(); } });
      steps.forEach((k, i) => drop(c, A[i], () => {
        if (k === 'noodles') noodles(c, 0, 1, 26, 3.4);
        if (k === 'herbs') leaves(c, 7, 0, -1, 26, 3, 9);
        if (k === 'shrimp_cooked') { shrimp(c, -9, 0, 0.3, 0.8); shrimp(c, 0, -0.5, 0.2, 0.8); shrimp(c, 9, 0, 0.4, 0.8); }
      }));
      c.restore();
    }
    if (rolled) {
      c.save(); c.globalAlpha = rk;
      for (const [x, y] of [[-10, 0], [2, 3], [13, -1]]) {
        c.save(); c.translate(x, y); c.rotate(-0.25);
        box(c, -5.5, -4, 11, 8, 3.6, 'rgba(252,248,238,.95)', INK, 0.8);
        c.fillStyle = 'rgba(240,140,110,.55)'; c.beginPath(); c.ellipse(0, -1, 3, 1.8, 0, 0, TAU); c.fill();
        c.fillStyle = 'rgba(120,180,90,.5)'; c.fillRect(-4, 1, 8, 1.4);
        c.restore();
      }
      c.restore();
    }
    return;
  }
  // cơm tấm and friends: rice mound, then toppings arranged around it
  steps.forEach((k, i) => drop(c, A[i], () => {
    switch (k) {
      case 'rice': { const r = rngOf(3); c.beginPath(); c.ellipse(-8, 0, 13, 7, 0, Math.PI, TAU); c.quadraticCurveTo(5, 5, -8, 5); c.quadraticCurveTo(-21, 5, -21, 0); c.fillStyle = '#fffdf6'; c.fill(); c.strokeStyle = 'rgba(91,63,54,.45)'; c.lineWidth = 0.7; c.stroke(); for (let n = 0; n < 16; n++) ell(c, -8 + (r() - 0.5) * 20, -1 + (r() - 0.5) * 8, 0.9, 0.5, '#f1ebdc', null); break; }
      case 'pork_grilled': c.save(); c.translate(10, 2); c.rotate(-0.2); box(c, -8, -4, 16, 8, 3.5, '#b8663a', INK, 0.8); c.strokeStyle = '#6e3418'; c.lineWidth = 1; for (let x = -5; x <= 5; x += 3.4) { c.beginPath(); c.moveTo(x - 1.5, -3); c.lineTo(x + 1.5, 3); c.stroke(); } c.restore(); break;
      case 'egg_fried': eggFried(c, -4, -5, 0.85); break;
      case 'pickles': shreds(c, 12, -5, 10, 5, ['#f2a14e', '#fff1dc', '#f7c27a']); break;
      case 'fish_sauce': dipBowl(c, 24, 10); break;
      case 'herbs': leaves(c, 5, 16, -6, 8, 3, 2); break;
      default: void 0;
    }
  }));
}

function drawPan(c, R, asm, t, done) {
  const steps = asm.steps, A = asm.anim;
  shadow(c, 0, 10, 28, 6, 0.2);
  c.strokeStyle = INK; c.lineWidth = 3.4; c.beginPath(); c.moveTo(22, 2); c.lineTo(38, 9); c.stroke();
  c.strokeStyle = '#8a5a3a'; c.lineWidth = 2.2; c.beginPath(); c.moveTo(26, 4); c.lineTo(38, 9); c.stroke();
  ell(c, 0, 0, 26, 11, '#4a4550'); ell(c, 0, -1, 22, 9, '#6b6572', null);
  const fi = steps.indexOf('fold'), fk = fi >= 0 ? Math.min(1, A[fi]) : 0;
  const bi = steps.indexOf('batter');
  // batter spreads, then the right half folds over the filling
  if (bi >= 0) drop(c, A[bi], () => {
    const g = c.createRadialGradient(0, -1, 2, 0, -1, 20); g.addColorStop(0, '#ffd45a'); g.addColorStop(1, '#e8a53a');
    c.beginPath(); c.ellipse(0, -1, 19, 8, 0, fk > 0 ? Math.PI * 0.5 : 0, fk > 0 ? Math.PI * 1.5 : TAU); c.fillStyle = g; c.fill();
    c.strokeStyle = 'rgba(160,90,30,.5)'; c.lineWidth = 0.7; c.stroke();
    for (let n = 0; n < 8; n++) circ(c, -12 + n * 3.2, -1 + Math.sin(n * 2) * 4, 0.5, 'rgba(170,100,30,.5)', null);
  });
  steps.forEach((k, i) => drop(c, A[i], () => {
    if (k === 'shrimp_cooked') { shrimp(c, -8, -2, 0.1, 0.8); shrimp(c, -2, 1, 0.5, 0.8); if (!fk) shrimp(c, 6, -2, 0.2, 0.8); }
    if (k === 'sprouts') { c.strokeStyle = '#f7f3e0'; c.lineWidth = 1.2; for (let n = 0; n < 8; n++) { c.beginPath(); const x = -12 + n * (fk ? 1.6 : 3.2); c.moveTo(x, -4); c.quadraticCurveTo(x + 2, 0, x + 1, 3); c.stroke(); circ(c, x, -4, 0.8, '#e9f2b0', null); } }
  }));
  if (fk > 0) {
    // folded half: a half-moon swinging over from the right
    c.save(); c.scale(Math.cos((1 - fk) * Math.PI) * -1 || 0.001, 1);
    const g = c.createRadialGradient(0, -1, 2, 0, -1, 20); g.addColorStop(0, '#ffcf4f'); g.addColorStop(1, '#d9902f');
    c.beginPath(); c.ellipse(0, -1, 19, 8, 0, -Math.PI * 0.5, Math.PI * 0.5); c.closePath(); c.fillStyle = g; c.fill();
    c.strokeStyle = 'rgba(140,80,30,.7)'; c.lineWidth = 0.8; c.stroke();
    c.restore();
  }
  steps.forEach((k, i) => { if (k === 'herbs') drop(c, A[i], () => leaves(c, 7, -6, -6, 18, 3, 14)); });
  if (bi >= 0) steam(c, 0, -8, t, 2);
}

function drawGrill(c, R, asm, t, done) {
  const steps = asm.steps, A = asm.anim;
  shadow(c, 0, 12, 28, 6, 0.2);
  box(c, -26, -6, 52, 18, 3, '#4a4550', INK, 1);
  // glowing charcoal peeking through the grate
  for (let n = 0; n < 7; n++) circ(c, -20 + n * 6.6, 6, 2.2, n % 2 ? '#ff8a3a' : '#e25a2a', null);
  c.strokeStyle = '#8f9aa3'; c.lineWidth = 1; for (let x = -22; x <= 22; x += 5) { c.beginPath(); c.moveTo(x, -6); c.lineTo(x, 10); c.stroke(); }
  const gi = steps.indexOf('grill'), gk = gi >= 0 ? Math.min(1, A[gi]) : 0;
  steps.forEach((k, i) => drop(c, A[i], () => {
    if (k === 'rice_paper') { ell(c, 0, 0, 18, 7.5, gk ? '#f0d9a8' : 'rgba(250,245,235,.92)', 'rgba(140,110,80,.7)', 0.8); if (gk) { c.strokeStyle = 'rgba(120,70,30,.45)'; c.lineWidth = 1; for (let x = -12; x <= 12; x += 5) { c.beginPath(); c.moveTo(x, -5); c.lineTo(x + 2, 5); c.stroke(); } } }
    if (k === 'egg_fried') { c.save(); c.globalAlpha *= 0.95; ell(c, 0, 0, 14, 5.6, gk ? '#f3b53a' : '#ffd24f', null); circ(c, -4, -1, 1.3, '#fff3c8', null); c.restore(); }
    if (k === 'scallion_oil') for (let n = 0; n < 12; n++) circ(c, Math.cos(n * 1.9) * 11, Math.sin(n * 2.7) * 4, 0.9, '#5fae3f', null);
    if (k === 'squid_cut') { for (const dx of [-9, 9]) { c.save(); c.translate(dx, 0); ell(c, 0, -1, 8, 3.6, gk ? '#f0b48a' : '#fbe6dc', INK, 0.8); for (let q = -2; q <= 2; q++) { c.strokeStyle = gk ? '#e08a5a' : '#f6c8b8'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(7, q); c.quadraticCurveTo(11, q * 1.5, 13, q * 2); c.stroke(); } if (gk) for (let q = -1; q <= 1; q++) line(c, -5 + q * 3, -3, -3 + q * 3, 1, '#a0522d', 0.8); c.restore(); } }
    if (k === 'scallop') for (let n = 0; n < 4; n++) { const x = -15 + n * 10; c.beginPath(); c.moveTo(x, 4); c.lineTo(x - 5, -1); c.quadraticCurveTo(x, -7, x + 5, -1); c.closePath(); c.fillStyle = '#f8c49a'; c.fill(); c.strokeStyle = INK; c.lineWidth = 0.7; c.stroke(); ell(c, x, -1, 2, 1.4, gk ? '#f0c070' : '#fff3dc', null); }
    if (k === 'peanuts') for (let n = 0; n < 14; n++) ell(c, Math.cos(n * 2.3) * 13, Math.sin(n * 1.7) * 4 - 1, 1, 0.7, '#d9a86e', null);
  }));
  if (gk) { steam(c, 0, -6, t, 3); for (let n = 0; n < 4; n++) { const k2 = (t * 1.5 + n / 4) % 1; circ(c, -12 + n * 8, 4 - k2 * 10, 0.7, `rgba(255,170,80,${1 - k2})`, null); } }
}

export function drawAssembly(c, R, asm, t, done, id) {
  R = { ...R, id };
  c.save();
  switch (R.vessel) {
    case 'bread': drawBread(c, R, asm, t, done); break;
    case 'bowl': drawBowl(c, R, asm, t, done); break;
    case 'plate': drawPlate(c, R, asm, t, done); break;
    case 'pan': drawPan(c, R, asm, t, done); break;
    case 'grill': drawGrill(c, R, asm, t, done); break;
  }
  c.restore();
}
export { poly };
