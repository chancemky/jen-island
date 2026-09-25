// Procedural food art: ingredients, finished dishes, drinks built from layers,
// and small props characters hold. Icons are drawn in a 32×32 box centred on 0,0.

import { TAU, shade } from '../core/util.js';
import { INK, ell, circ, poly, box, line, limb } from './draw.js';

// ---------------------------------------------------------------- held props
export function drawHeld(c, what, x, y, t, view, P) {
  c.save(); c.translate(x, y);
  switch (what) {
    case 'cup': case 'tra_tac': case 'drink': miniCup(c, '#e8a54a', '#ffd76a'); break;
    case 'coffee': miniCup(c, '#6b4431', '#f3e2c4'); break;
    case 'bowl': case 'pho': c.translate(0, 1); ell(c, 0, 0, 5, 2, '#f4efe4'); c.beginPath(); c.moveTo(-5, 0); c.quadraticCurveTo(0, 5.5, 5, 0); c.fillStyle = '#fff'; c.fill(); c.strokeStyle = INK; c.lineWidth = 0.8; c.stroke(); ell(c, 0, 0, 4, 1.3, '#e9b778', null); break;
    case 'banh_mi': c.rotate(-0.4); ell(c, 0, 0, 5.5, 2.2, '#e7b160'); line(c, -3, -0.6, 3, -0.6, '#8fb466', 1); break;
    case 'plate': case 'dish': ell(c, 0, 0, 6, 2.4, '#fffdf5'); ell(c, 0, -0.6, 3.6, 1.4, '#e9a25a', null); break;
    case 'tray': ell(c, 0, 0, 8, 2.6, '#c9975f'); miniCup(c, '#e8a54a', '#ffd76a', -2.5, -3); miniCup(c, '#6b4431', '#f3e2c4', 2.8, -3); break;
    case 'knife': c.rotate(-0.5); box(c, -1, -1, 2.4, 3.6, 0.6, '#8c5e3c', INK, 0.6); poly(c, [-0.8, -1, 1.4, -1, 1.2, -7, -0.2, -6], '#e6ecef', INK, 0.6); break;
    case 'ladle': c.rotate(0.3); line(c, 0, 0, 0, -8, '#b3894f', 1.2); ell(c, 0, 0.8, 2, 1.3, '#cfd6da'); break;
    case 'hammer': c.rotate(-0.25); limb(c, [0, 1, 0, -7], 1.5, '#b27b4c'); box(c, -3.2, -10, 6.4, 3.2, 0.8, '#8f9aa3'); break;
    case 'notebook': box(c, -2.4, -3, 4.8, 5.6, 0.6, '#fffdf2', INK, 0.7); line(c, -1.4, -1.2, 1.4, -1.2, '#b8a88f', 0.5); line(c, -1.4, 0.4, 1.4, 0.4, '#b8a88f', 0.5); break;
    case 'cloth': ell(c, 0, 0, 2.6, 1.6, '#9fd0e8'); break;
    case 'broom': c.rotate(0.5 + (P?.sweep || 0) * 0.25); limb(c, [0, -6, 0, 6], 1.2, '#b88752'); poly(c, [-2.8, 6, 2.8, 6, 3.6, 10.5, -3.6, 10.5], '#e9c46f', INK, 0.7); break;
    case 'phone': box(c, -1.6, -2.6, 3.2, 5, 0.8, '#3e3a48', INK, 0.6); box(c, -1.1, -2.1, 2.2, 3.6, 0.4, '#9ad2f0', null); break;
    case 'camera': box(c, -3.6, -2.2, 7.2, 4.6, 1, '#48465a', INK, 0.7); circ(c, 0, 0.2, 1.6, '#9ad2f0', '#2a2a30', 0.6); break;
    case 'bag': box(c, -3, -2, 6, 5.6, 1.2, '#f2dfb8', INK, 0.8); c.beginPath(); c.arc(0, -2, 2, Math.PI, TAU); c.strokeStyle = INK; c.lineWidth = 0.8; c.stroke(); break;
    case 'wood': c.rotate(-0.2); box(c, -6, -1.6, 12, 3.2, 1, '#c98c55', INK, 0.8); break;
    case 'fish': ell(c, 0, 0, 4.2, 1.8, '#a6c7d8'); poly(c, [3.6, 0, 6, -2, 6, 2], '#a6c7d8', INK, 0.7); break;
    case 'rod': limb(c, [0, 0, 7, -14], 0.9, '#9c6e46', null); break;
    default: if (typeof what === 'string' && ICONS[what]) { c.scale(0.28, 0.28); ICONS[what](c, t); }
  }
  c.restore();
}
function miniCup(c, liquid, top, x = 0, y = 0) {
  c.save(); c.translate(x, y);
  poly(c, [-2.6, -4, 2.6, -4, 2, 2.6, -2, 2.6], 'rgba(255,255,255,.85)', INK, 0.7);
  poly(c, [-2.4, -2, 2.4, -2, 2, 2.4, -2, 2.4], liquid, null);
  line(c, 0.6, -4, 1.6, -7, '#f08ca0', 0.9);
  c.restore();
}

// ---------------------------------------------------------------- ingredient icons
const leafy = (c, x, y, s, col, rot = 0) => { c.save(); c.translate(x, y); c.rotate(rot); c.beginPath(); c.moveTo(0, -s); c.quadraticCurveTo(s * 0.8, -s * 0.2, 0, s); c.quadraticCurveTo(-s * 0.8, -s * 0.2, 0, -s); c.fillStyle = col; c.fill(); c.strokeStyle = INK; c.lineWidth = 0.9; c.stroke(); line(c, 0, -s * 0.8, 0, s * 0.8, shade(col, -40), 0.6); c.restore(); };
const jar = (c, body, lid, label, fill) => { box(c, -9, -8, 18, 19, 4, body); if (fill) { c.save(); c.beginPath(); c.roundRect ? c.roundRect(-8.5, -3, 17, 13.5, 3.5) : c.rect(-8.5, -3, 17, 13.5); c.clip(); c.fillStyle = fill; c.fillRect(-9, -3, 18, 15); c.restore(); } box(c, -10, -12, 20, 5, 2, lid); if (label) box(c, -6, -1, 12, 7, 1.5, label, INK, 0.7); };

export const ICONS = {
  tea: c => { jar(c, '#e3f1d9', '#6fa56d', '#fff8e8', '#b9d98f'); leafy(c, 0, 2.5, 3.2, '#79b35f', 0.4); },
  kumquat: c => { for (const [x, y] of [[-5, 3], [5, 3], [0, -3]]) { circ(c, x, y, 6.2, '#ffa53a'); circ(c, x - 2, y - 2, 1.6, 'rgba(255,255,255,.6)', null); } leafy(c, 3, -9, 3.6, '#6db35a', 0.8); },
  kumquat_cut: c => { for (const [x, y] of [[-5.5, 2], [5.5, 2], [0, -4]]) { circ(c, x, y, 5.8, '#ffc15c'); circ(c, x, y, 4.2, '#ffe07a', '#f0a53a', 0.6); for (let i = 0; i < 6; i++) { const an = i / 6 * TAU; line(c, x, y, x + Math.cos(an) * 3.4, y + Math.sin(an) * 3.4, '#f7c04a', 0.5); } } },
  sugar: c => { jar(c, '#fbf6ef', '#f3a7b5', '#fff', '#fff'); for (let i = 0; i < 8; i++) circ(c, -5 + (i % 4) * 3.4, 3 + Math.floor(i / 4) * 3, 0.9, '#e6dccb', null); },
  ice: c => { for (const [x, y, r] of [[-5, 3, 0.2], [5, 2, -0.2], [0, -5, 0.1]]) { c.save(); c.translate(x, y); c.rotate(r); box(c, -5.5, -5.5, 11, 11, 3, '#dff4ff'); box(c, -3.8, -3.8, 4, 3, 1, '#fff', null); c.restore(); } },
  coffee: c => { box(c, -9, -10, 18, 21, 3, '#9a6a47'); box(c, -6, -4, 12, 8, 2, '#f6e6c7', INK, 0.7); for (const [x, y] of [[-2.6, 0], [2.6, 0]]) { ell(c, x, y, 2, 2.8, '#5a3524', INK, 0.5, 0.4); } },
  milk: c => { box(c, -8, -9, 16, 20, 2, '#fdf7ec'); box(c, -8, -9, 16, 5, 2, '#e5eef5'); box(c, -5, -1, 10, 7, 1.5, '#8fc8e8', INK, 0.7); ell(c, 0, 2.5, 3, 2, '#fff', null); },
  condensed_milk: c => { box(c, -9, -8, 18, 17, 3, '#e8f0f6'); ell(c, 0, -8, 9, 2.6, '#cfdbe4'); box(c, -9, -3, 18, 7, 0, '#6aa5d8', null); ell(c, 0, 0.5, 4, 2.4, '#fff', null); c.strokeStyle = INK; c.lineWidth = 1; c.beginPath(); c.roundRect ? c.roundRect(-9, -8, 18, 17, 3) : c.rect(-9, -8, 18, 17); c.stroke(); },
  bread: c => { c.save(); c.rotate(-0.35); ell(c, 0, 0, 14, 6.4, '#e6a95a'); for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(i * 4.6 - 2, -2); c.quadraticCurveTo(i * 4.6, -4.4, i * 4.6 + 2, -1.4); c.strokeStyle = '#c47f36'; c.lineWidth = 1; c.stroke(); } ell(c, -3, -2.6, 6, 1.4, 'rgba(255,240,200,.55)', null); c.restore(); },
  bread_split: c => { c.save(); c.rotate(-0.35); ell(c, 0, 1, 14, 6, '#e6a95a'); ell(c, 0, -0.2, 12, 3, '#fff3d6', INK, 0.7); c.restore(); },
  pork: c => { for (const [x, y, r] of [[-4, 3, -0.3], [4, -2, 0.2]]) { c.save(); c.translate(x, y); c.rotate(r); box(c, -8, -4, 16, 8, 3.5, '#d77c55'); for (let i = -1; i <= 1; i++) line(c, i * 4 - 1, -3, i * 4 + 1, 3, '#8f4a2e', 1.1); c.restore(); } },
  pork_grilled: c => { ICONS.pork(c); for (let i = 0; i < 3; i++) circ(c, -6 + i * 6, -7, 1, 'rgba(255,255,255,.7)', null); },
  cucumber: c => { c.save(); c.rotate(-0.6); box(c, -14, -4.5, 28, 9, 4.5, '#79b85c'); line(c, -10, -1, 10, -1, '#a6d98a', 1); c.restore(); },
  cucumber_cut: c => { for (const [x, y] of [[-6, 2], [0, -3], [6, 2]]) { circ(c, x, y, 5.6, '#7cbd5f'); circ(c, x, y, 4.2, '#d7f2b8', null); for (let i = 0; i < 5; i++) { const an = i / 5 * TAU; circ(c, x + Math.cos(an) * 2, y + Math.sin(an) * 2, 0.5, '#9bc47a', null); } } },
  pickles: c => { jar(c, '#fff9ef', '#e58f5f', null, 'rgba(255,238,210,.9)'); for (let i = 0; i < 6; i++) { box(c, -6 + (i % 3) * 4.2, -1 + Math.floor(i / 3) * 5, 3.2, 4.2, 0.8, i % 2 ? '#f39a48' : '#fff9ef', INK, 0.5); } },
  cilantro: c => { for (let i = 0; i < 5; i++) { const an = -Math.PI / 2 + (i - 2) * 0.4; line(c, 0, 10, Math.cos(an) * 8, -2 + Math.sin(an) * 4, '#5f9f45', 1); leafy(c, Math.cos(an) * 8, -3 + Math.sin(an) * 4 - 2, 3.8, '#76c05a', an + Math.PI / 2); } },
  herbs: c => { for (let i = 0; i < 6; i++) { const an = i / 6 * TAU; leafy(c, Math.cos(an) * 5, Math.sin(an) * 4, 4.8, i % 2 ? '#6db55a' : '#8fd070', an + Math.PI / 2); } },
  herbs_cut: c => { for (let i = 0; i < 9; i++) { const x = ((i * 37) % 17) - 8, y = ((i * 53) % 13) - 6; leafy(c, x, y, 2.6, i % 2 ? '#6db55a' : '#8fd070', i); } },
  rice_paper: c => { ell(c, 0, 0, 13, 12, 'rgba(255,250,236,.95)'); c.strokeStyle = 'rgba(200,180,150,.5)'; c.lineWidth = 0.6; for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(-11, i * 4); c.lineTo(11, i * 4 + 1); c.stroke(); } },
  shrimp: c => { c.save(); c.rotate(0.2); c.beginPath(); c.arc(0, 0, 8, -0.4, Math.PI * 1.25); c.strokeStyle = INK; c.lineWidth = 7.4; c.lineCap = 'round'; c.stroke(); c.strokeStyle = '#ff9a7a'; c.lineWidth = 5.6; c.stroke(); for (let i = 0; i < 4; i++) { const an = -0.2 + i * 0.8; line(c, Math.cos(an) * 6, Math.sin(an) * 6, Math.cos(an) * 10, Math.sin(an) * 10, '#f06f55', 0.8); } poly(c, [-6, -6, -11, -9, -9, -3], '#ff9a7a', INK, 0.8); c.restore(); },
  shrimp_cooked: c => ICONS.shrimp(c),
  noodles: c => { ell(c, 0, 3, 12, 7, '#fbf3df'); c.strokeStyle = '#e6d6b2'; c.lineWidth = 0.9; for (let i = 0; i < 7; i++) { c.beginPath(); c.moveTo(-10, -1 + i * 1.6); c.bezierCurveTo(-4, -5 + i * 1.6, 4, 4 + i * 1.6, 10, -1 + i * 1.6); c.stroke(); } },
  fish_sauce: c => { box(c, -5, -4, 10, 16, 3, '#c7792b'); box(c, -2.5, -12, 5, 8, 1.2, '#e8d7b4'); box(c, -3, -13, 6, 3, 1, '#d24c4c'); box(c, -4, 1, 8, 6, 1.2, '#fff4d8', INK, 0.6); },
  rice: c => { box(c, -10, -9, 20, 20, 5, '#efe2c3'); c.beginPath(); c.moveTo(-7, -9); c.quadraticCurveTo(0, -14, 7, -9); c.strokeStyle = INK; c.lineWidth = 1; c.stroke(); for (let i = 0; i < 9; i++) ell(c, -5 + (i % 3) * 5, -2 + Math.floor(i / 3) * 4, 1.4, 0.8, '#fff', null, 0, 0.5 + i); },
  egg: c => { ell(c, -4, 2, 6.2, 7.6, '#fffaf0', INK, 1, -0.2); ell(c, 5, 3, 5.6, 7, '#f5e2c6', INK, 1, 0.2); },
  egg_fried: c => { c.beginPath(); for (let i = 0; i <= 12; i++) { const an = i / 12 * TAU, r = 11 + Math.sin(i * 2.7) * 1.8; c.lineTo(Math.cos(an) * r, Math.sin(an) * r * 0.8); } c.fillStyle = '#fffdf6'; c.fill(); c.strokeStyle = INK; c.lineWidth = 1; c.stroke(); circ(c, 1, -1, 5, '#ffc93e'); circ(c, -0.5, -2.5, 1.4, 'rgba(255,255,255,.7)', null); },
  batter: c => { c.beginPath(); c.moveTo(-12, -3); c.quadraticCurveTo(0, 16, 12, -3); c.closePath(); c.fillStyle = '#f2f5f8'; c.fill(); c.strokeStyle = INK; c.lineWidth = 1; c.stroke(); ell(c, 0, -3, 12, 3.4, '#ffe08a'); line(c, 5, -12, 1, -3, '#b88752', 1.5); },
  sprouts: c => { for (let i = 0; i < 7; i++) { const x = -8 + i * 2.7; c.beginPath(); c.moveTo(x, 9); c.quadraticCurveTo(x + 3, 0, x - 1, -7); c.strokeStyle = INK; c.lineWidth = 2.6; c.stroke(); c.strokeStyle = '#fbf6e2'; c.lineWidth = 1.6; c.stroke(); ell(c, x - 1, -7.5, 1.6, 1.1, '#e5e07a', INK, 0.6); } },
  broth: c => { box(c, -12, -5, 24, 15, 4, '#b7bec6'); ell(c, 0, -5, 12, 3.5, '#d9a15e'); line(c, -12, -2, -15, -3, INK, 2); line(c, 12, -2, 15, -3, INK, 2); for (let i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(i * 4, -9); c.quadraticCurveTo(i * 4 + 2, -12, i * 4, -15); c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 1; c.stroke(); } },
  broth_spicy: c => { ICONS.broth(c); ell(c, 0, -5, 11, 3, '#e0703e', null); circ(c, -3, -5, 1, '#c33', null); circ(c, 3, -4.5, 1, '#c33', null); },
  beef: c => { for (const [x, y, r] of [[-3, 3, -0.2], [3, -2, 0.3]]) { c.save(); c.translate(x, y); c.rotate(r); ell(c, 0, 0, 10, 6, '#ea8a8a'); c.strokeStyle = '#fff'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(-6, -1); c.quadraticCurveTo(0, 3, 6, -2); c.stroke(); c.restore(); } },
  beef_sliced: c => { for (let i = 0; i < 4; i++) { c.save(); c.translate(-6 + i * 4, (i % 2) * 3 - 1); c.rotate(0.4); ell(c, 0, 0, 3.4, 6.8, '#e17d7d'); c.restore(); } },
  lime: c => { circ(c, -3, 2, 8, '#9fd35a'); c.beginPath(); c.arc(5, 0, 7, -Math.PI / 2, Math.PI / 2); c.closePath(); c.fillStyle = '#d7f09a'; c.fill(); c.strokeStyle = INK; c.lineWidth = 1; c.stroke(); for (let i = 0; i < 3; i++) line(c, 5, 0, 5 + Math.cos(-1 + i) * 5.5, Math.sin(-1 + i) * 5.5, '#9fc85a', 0.6); },
  lime_cut: c => { for (const x of [-5, 5]) { c.beginPath(); c.arc(x, 2, 6.5, Math.PI, TAU); c.closePath(); c.fillStyle = '#d7f09a'; c.fill(); c.strokeStyle = INK; c.lineWidth = 1; c.stroke(); } },
  peach: c => { circ(c, 0, 2, 10, '#ffb38a'); c.beginPath(); c.moveTo(0, -7); c.quadraticCurveTo(-3, 2, 0, 11); c.strokeStyle = '#f08a6a'; c.lineWidth = 1; c.stroke(); circ(c, -4, -2, 3, 'rgba(255,230,210,.7)', null); leafy(c, 4, -9, 3.6, '#6db35a', 0.9); },
  peach_cut: c => { for (let i = 0; i < 3; i++) { c.save(); c.translate(-6 + i * 6, (i % 2) * 3); c.rotate(-0.3 + i * 0.3); c.beginPath(); c.arc(0, 0, 7, 0.2, Math.PI - 0.2); c.closePath(); c.fillStyle = '#ffd08a'; c.fill(); c.strokeStyle = INK; c.lineWidth = 1; c.stroke(); line(c, -5.5, 1.5, 5.5, 1.5, '#ff9a6a', 1.2); c.restore(); } },
  peach_syrup: c => { box(c, -6, -6, 12, 18, 4, '#ffb38a'); box(c, -3, -12, 6, 6, 1.4, '#fff3e2'); box(c, -4, 0, 8, 6, 1.4, '#fff', INK, 0.6); circ(c, 0, 3, 1.6, '#ff9a6a', null); },
  avocado: c => { ell(c, 0, 0, 9, 12, '#4f8a3a'); ell(c, 0, 1, 7, 10, '#cde88a', null); circ(c, 0, 3, 4, '#9a5c34'); },
  avocado_cut: c => { ell(c, 0, 2, 12, 8, '#dff0a0'); ell(c, 0, 2, 12, 8, null, '#7fae4d', 1.2); for (let i = 0; i < 3; i++) line(c, -6 + i * 6, -3, -4 + i * 6, 7, '#c3da86', 1); },
  tapioca: c => { ell(c, 0, 4, 12, 6, '#f3efe8'); for (let i = 0; i < 9; i++) circ(c, -7 + (i % 3) * 7, -2 + Math.floor(i / 3) * 3.2, 2.6, '#3b2a28', INK, 0.4); circ(c, -7, -3, 0.7, '#fff', null); },
  jelly: c => { for (let i = 0; i < 4; i++) { c.save(); c.translate(-5 + (i % 2) * 10, -4 + Math.floor(i / 2) * 9); c.rotate(0.3 * i); box(c, -4.5, -4.5, 9, 9, 2, i % 2 ? '#a7e1b1' : '#b9e7ef'); c.restore(); } },
  cheese_foam: c => { c.beginPath(); c.moveTo(-11, 6); for (let i = 0; i <= 6; i++) c.quadraticCurveTo(-11 + i * 3.7 - 1.8, -6 - (i % 2) * 3, -11 + i * 3.7, 2); c.lineTo(11, 6); c.closePath(); c.fillStyle = '#fff4d0'; c.fill(); c.strokeStyle = INK; c.lineWidth = 1; c.stroke(); },
  beans: c => { ell(c, 0, 3, 12, 7, '#f4eadc'); for (let i = 0; i < 10; i++) ell(c, -7 + (i % 5) * 3.6, 0 + Math.floor(i / 5) * 4, 1.6, 1.2, i % 2 ? '#a8423a' : '#7fae4d', INK, 0.4); },
  coconut_milk: c => { circ(c, 0, 2, 11, '#8a5a3a'); ell(c, 0, -2, 9, 5, '#fffdf6', INK, 0.9); circ(c, -3, 4, 1.2, '#5a3a24', null); circ(c, 3, 4, 1.2, '#5a3a24', null); },
  scallion: c => { for (let i = 0; i < 4; i++) { c.save(); c.translate(-6 + i * 4, 0); c.rotate(0.2 * (i - 1.5)); box(c, -1.4, -11, 2.8, 18, 1.4, '#7cc55e'); box(c, -1.4, 5, 2.8, 5, 1.4, '#f4f9e8'); c.restore(); } },
  scallion_oil: c => { ell(c, 0, 3, 12, 6, '#f7f0dc'); for (let i = 0; i < 12; i++) circ(c, -8 + (i * 7) % 16, (i * 5) % 6, 1.1, '#6fbf4a', null); },
  chili: c => { c.save(); c.rotate(0.6); c.beginPath(); c.moveTo(0, -11); c.quadraticCurveTo(7, 0, 0, 11); c.quadraticCurveTo(-4, 0, 0, -11); c.fillStyle = '#e8453c'; c.fill(); c.strokeStyle = INK; c.lineWidth = 1; c.stroke(); box(c, -2, -14, 4, 4, 1, '#5fa045'); c.restore(); },
  pate: c => { box(c, -10, -5, 20, 12, 4, '#dcd5ca'); ell(c, 0, -5, 10, 3, '#b57a57'); },
  // UI glyph icons
  coin: c => { circ(c, 0, 0, 12, '#ffd35a'); circ(c, 0, 0, 8, null, '#e3a52c', 1.6); c.font = '900 11px Nunito, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#b8801c'; c.fillText('đ', 0, 0.5); },
  bag: c => { box(c, -11, -6, 22, 18, 5, '#e9b36a'); c.beginPath(); c.arc(0, -6, 6, Math.PI, 0); c.strokeStyle = INK; c.lineWidth = 2; c.stroke(); box(c, -8, 0, 16, 3, 1, '#c98f45', null); },
  heart: c => { c.beginPath(); c.moveTo(0, 9); c.bezierCurveTo(-16, -2, -8, -14, 0, -5); c.bezierCurveTo(8, -14, 16, -2, 0, 9); c.fillStyle = '#f36d86'; c.fill(); c.strokeStyle = INK; c.lineWidth = 1; c.stroke(); },
  notebook: c => { box(c, -10, -12, 20, 24, 3, '#9fb4dc'); box(c, -6, -8, 12, 7, 1.5, '#fff8ea', INK, 0.8); for (let i = 0; i < 4; i++) circ(c, -10, -8 + i * 5.5, 1.3, '#fff', INK, 0.6); c.beginPath(); c.moveTo(3, 4); c.lineTo(3, 10); c.lineTo(5, 8); c.lineTo(7, 10); c.lineTo(7, 4); c.fillStyle = '#f36d86'; c.fill(); },
  zzz: c => { c.font = '900 16px Nunito, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#7e8fc9'; c.strokeStyle = INK; c.lineWidth = 2.5; for (const [x, y, s] of [[-5, 5, 16], [4, -3, 12], [10, -10, 9]]) { c.font = `900 ${s}px Nunito, sans-serif`; c.strokeText('z', x, y); c.fillText('z', x, y); } },
  photo: c => { box(c, -12, -9, 24, 18, 2, '#fff'); box(c, -9, -6, 18, 11, 1, '#aee4ed', null); poly(c, [-9, 5, -3, -1, 2, 3, 5, 0, 9, 5], '#6fbf73', null); circ(c, 5, -3, 2, '#ffd35a', null); },
  menu: c => { box(c, -10, -13, 20, 26, 3, '#3d4a44'); for (let i = 0; i < 4; i++) line(c, -6, -7 + i * 5, 6 - (i % 2) * 5, -7 + i * 5, '#fff', 1.4); },
  knife: c => { c.save(); c.rotate(-0.6); box(c, -2.4, 2, 4.8, 10, 1.5, '#8c5e3c'); poly(c, [-2.4, 2, 2.4, 2, 2.4, -14, -2.4, -10], '#e6ecef', INK, 1); c.restore(); },
  sofa: c => { box(c, -12, -8, 24, 10, 4, '#c9a26a'); box(c, -12, 0, 24, 8, 3, '#d9b27a'); box(c, -14, -4, 5, 12, 2, '#b9905a'); box(c, 9, -4, 5, 12, 2, '#b9905a'); },
  blend: c => { poly(c, [-8, -12, 8, -12, 6, 6, -6, 6], 'rgba(220,245,255,.9)', INK, 1.2); box(c, -9, 6, 18, 7, 2, '#8f9aa3'); ell(c, 0, -3, 5, 6, '#c5e08a', null); circ(c, 0, 9.5, 1.6, '#e8584e', null); },
  roll: c => { box(c, -12, -5, 24, 10, 5, 'rgba(255,250,238,.95)'); ell(c, -4, 0, 3, 2, '#ff9a7a', null); ell(c, 4, 0, 3, 2, '#86c86a', null); c.beginPath(); c.arc(12, 0, 6, -1.2, 1.2); c.strokeStyle = INK; c.lineWidth = 1.2; c.stroke(); poly(c, [15, 5, 16, 1, 12, 3], INK, null); },
  fold: c => { c.beginPath(); c.arc(0, 2, 11, Math.PI, 0); c.closePath(); c.fillStyle = '#f5c23a'; c.fill(); c.strokeStyle = INK; c.lineWidth = 1; c.stroke(); c.beginPath(); c.arc(0, -4, 7, Math.PI * 1.1, Math.PI * 1.9); c.strokeStyle = INK; c.lineWidth = 1.4; c.stroke(); poly(c, [6, -8, 8, -4, 3, -5], INK, null); },
  grill: c => { box(c, -12, -2, 24, 10, 2, '#5b5660'); for (let x = -9; x <= 9; x += 4.5) line(c, x, -2, x, 8, '#8f9aa3', 1.2); for (let i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(i * 6, -5); c.quadraticCurveTo(i * 6 + 3, -9, i * 6, -13); c.strokeStyle = '#ff9a4a'; c.lineWidth = 2; c.stroke(); } },
  hammer: c => { c.save(); c.rotate(-0.5); box(c, -1.8, -4, 3.6, 16, 1.4, '#b27b4c'); box(c, -8, -10, 16, 7, 2, '#8f9aa3'); c.restore(); },
  door: c => { box(c, -9, -12, 18, 24, 3, '#b77a4f'); box(c, -6, -9, 12, 8, 1.5, '#c98f5a', INK, 0.7); circ(c, 5, 2, 1.4, '#f2c14e', INK, 0.5); },
  talk: c => { c.beginPath(); c.ellipse(0, -2, 12, 9, 0, 0, TAU); c.fillStyle = '#fff'; c.fill(); c.strokeStyle = INK; c.lineWidth = 1.3; c.stroke(); poly(c, [-4, 6, -7, 12, 1, 7], '#fff', INK, 1.1); for (let i = -1; i <= 1; i++) circ(c, i * 4.5, -2, 1.5, INK, null); },
  star: c => { c.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 5 : 12; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.closePath(); c.fillStyle = '#ffd35a'; c.fill(); c.strokeStyle = INK; c.lineWidth = 1.2; c.stroke(); },
  sign_open: c => { box(c, -12, -7, 24, 14, 3, '#6fbf73'); line(c, -6, -7, 0, -13, INK, 1); line(c, 6, -7, 0, -13, INK, 1); c.strokeStyle = '#fff'; c.lineWidth = 2.4; c.beginPath(); c.moveTo(-5, 0); c.lineTo(-1, 4); c.lineTo(6, -3); c.stroke(); },
  broom: c => { c.save(); c.rotate(0.5); line(c, 0, -13, 0, 4, '#b88752', 2.4); poly(c, [-5, 4, 5, 4, 7, 13, -7, 13], '#e9c46f', INK, 1); c.restore(); },
  plate: c => { ell(c, 0, 2, 13, 8, '#fffdf5'); ell(c, 0, 1, 8, 5, '#e9a25a', null); },
  person: c => { circ(c, 0, -5, 7, '#f8d6bd'); c.beginPath(); c.arc(0, -7, 7.4, Math.PI, 0); c.fillStyle = '#4a322b'; c.fill(); box(c, -8, 3, 16, 10, 5, '#9fd8c8'); },
  map: c => { poly(c, [-12, -9, -4, -12, 4, -9, 12, -12, 12, 9, 4, 12, -4, 9, -12, 12], '#f5e2b3', INK, 1.2); line(c, -4, -12, -4, 9, INK, 0.8); line(c, 4, -9, 4, 12, INK, 0.8); ell(c, 0, 0, 5, 4, '#a3d68a', null); circ(c, 7, -3, 1.6, '#e8584e', null); },
  sleep_moon: c => { c.beginPath(); c.arc(0, 0, 11, 0.6, Math.PI * 2 - 0.6); c.quadraticCurveTo(-2, 0, Math.cos(0.6) * 11, Math.sin(0.6) * 11); c.fillStyle = '#fff4c8'; c.fill(); c.strokeStyle = INK; c.lineWidth = 1.2; c.stroke(); },
  // pantry goods
  wood: c => { for (let i = 0; i < 3; i++) { c.save(); c.translate(0, -6 + i * 6); box(c, -12, -2.8, 24, 5.6, 1.6, i % 2 ? '#c88a52' : '#d9a064'); circ(c, -12 + 2.6, 0, 1.6, '#b0753f', INK, 0.5); c.restore(); } },
  metal: c => { box(c, -11, -3, 22, 8, 1.2, '#b9c3cb'); box(c, -8, -9, 16, 7, 1.2, '#d3dbe1'); for (let i = 0; i < 3; i++) circ(c, -6 + i * 6, 1, 1, '#8a96a0', null); },
  paint: c => { box(c, -9, -6, 18, 16, 3, '#f7f4ef'); ell(c, 0, -6, 9, 2.8, '#6fbfb0'); c.beginPath(); c.moveTo(-9, -3); c.quadraticCurveTo(-6, 5, -3, -2); c.quadraticCurveTo(0, 7, 3, -2); c.lineTo(9, -3); c.strokeStyle = '#6fbfb0'; c.lineWidth = 2; c.stroke(); c.beginPath(); c.arc(0, -8, 8, Math.PI, TAU); c.strokeStyle = INK; c.lineWidth = 1; c.stroke(); },
  tile: c => { for (let i = 0; i < 3; i++) { c.save(); c.translate(-5 + i * 5, -2 + i * 2); c.beginPath(); c.moveTo(-6, 4); c.quadraticCurveTo(0, -5, 6, 4); c.lineTo(5, 6); c.quadraticCurveTo(0, -2, -5, 6); c.closePath(); c.fillStyle = '#d9784f'; c.fill(); c.strokeStyle = INK; c.lineWidth = 0.9; c.stroke(); c.restore(); } },
  lantern: c => { line(c, 0, -13, 0, -9, INK, 1); ell(c, 0, 0, 8, 9, '#ea5a4f'); for (const x of [-4, 0, 4]) { c.beginPath(); c.ellipse(0, 0, Math.abs(x) + 0.4, 9, 0, 0, TAU); c.strokeStyle = '#b8403a'; c.lineWidth = 0.6; c.stroke(); } box(c, -4, -10, 8, 2.5, 1, '#f2c14e'); box(c, -4, 8, 8, 2.5, 1, '#f2c14e'); line(c, 0, 10.5, 0, 14, '#f2c14e', 1.4); },
  cable: c => { c.beginPath(); c.ellipse(0, 0, 11, 7, 0, 0, TAU); c.strokeStyle = INK; c.lineWidth = 3.6; c.stroke(); c.strokeStyle = '#4e9b6c'; c.lineWidth = 2.2; c.stroke(); for (let i = 0; i < 5; i++) circ(c, Math.cos(i * 1.3) * 11, Math.sin(i * 1.3) * 7, 1.6, ['#ffd35a', '#ff8a8a', '#8ad0ff', '#b9f08a', '#ffb3e0'][i]); },
};

// ---------------------------------------------------------------- dishes
export const DISHES = {
  banh_mi_thit: c => { c.save(); c.rotate(-0.25); ell(c, 0, 1.6, 15, 6.4, '#e0a052'); ell(c, 0, -1.4, 13.5, 3, '#fff1d0', INK, 0.7); for (let i = -3; i <= 3; i++) { circ(c, i * 3.6, -2.8, 1.6, i % 2 ? '#d7784f' : '#f39a48', INK, 0.4); } for (let i = -2; i <= 2; i++) leafy(c, i * 5 + 1, -4.4, 2, '#6fbf4a', 0.5 + i); ell(c, 0, 4.6, 12, 1.4, 'rgba(0,0,0,.08)', null); c.restore(); },
  banh_mi_trung: c => { c.save(); c.rotate(-0.25); ell(c, 0, 1.6, 15, 6.4, '#e0a052'); ell(c, 0, -1.4, 13.5, 3, '#fff1d0', INK, 0.7); ell(c, -2, -3, 6, 2.6, '#fffdf6', INK, 0.5); circ(c, -2, -3.2, 1.8, '#ffc93e', null); for (let i = 0; i <= 2; i++) leafy(c, 3 + i * 3.5, -4, 2, '#6fbf4a', i); c.restore(); },
  goi_cuon: c => { for (const [x, y, r] of [[-6, 3, -0.3], [6, 0, 0.35]]) { c.save(); c.translate(x, y); c.rotate(r); box(c, -5, -11, 10, 22, 5, 'rgba(255,250,238,.92)'); ell(c, 0, -2, 3.6, 2, '#ff9a7a', null); ell(c, 0, 4, 3.2, 3, '#86c86a', null); box(c, -5, -11, 10, 22, 5, null, INK, 1); c.restore(); } },
  banh_xeo: c => { c.beginPath(); c.arc(0, 2, 13, Math.PI, TAU); c.closePath(); c.fillStyle = '#f5c23a'; c.fill(); c.strokeStyle = INK; c.lineWidth = 1; c.stroke(); for (let i = 0; i < 6; i++) circ(c, -9 + i * 3.6, -3 + (i % 2) * 2, 1.3, '#e3902a', null); ell(c, 5, -1, 3, 1.6, '#ff9a7a', INK, 0.5); },
  bun_thit_nuong: c => { bowl(c, '#fbf3df'); for (let i = 0; i < 3; i++) box(c, -7 + i * 5, -6, 4.5, 3, 1, '#c96b45', INK, 0.5); leafy(c, 6, -4, 2.6, '#6fbf4a', 0.5); box(c, -8, -3, 3, 2, 0.5, '#f39a48', INK, 0.4); },
  com_tam: c => { ell(c, 0, 2, 15, 7.4, '#fffdf5'); ell(c, -4, 0, 7, 4.4, '#fffaf0', INK, 0.6); c.save(); c.translate(6, 0); c.rotate(0.3); box(c, -4, -3, 8, 6, 2, '#c96b45', INK, 0.6); c.restore(); ell(c, -2, -4, 3.6, 2.2, '#fffdf6', INK, 0.4); circ(c, -2, -4.2, 1.2, '#ffc93e', null); leafy(c, 9, 3, 2, '#6fbf4a', 1); },
  pho_bo: c => { bowl(c, '#e2b270'); for (let i = 0; i < 3; i++) ell(c, -6 + i * 5, -4, 3, 1.7, '#d9938a', INK, 0.4); leafy(c, 6, -5, 2.6, '#6fbf4a', 0.5); leafy(c, -8, -5, 2.2, '#6fbf4a', -0.4); steam(c); },
  bun_bo_hue: c => { bowl(c, '#e7784a'); for (let i = 0; i < 3; i++) ell(c, -6 + i * 5, -4, 3, 1.7, '#b85b4b', INK, 0.4); leafy(c, 6, -5, 2.6, '#6fbf4a', 0.5); circ(c, -1, -6, 1, '#c33', null); steam(c); },
  che: c => { poly(c, [-8, -12, 8, -12, 6, 11, -6, 11], 'rgba(255,255,255,.75)', INK, 1); c.save(); c.beginPath(); c.moveTo(-7.8, -9); c.lineTo(7.8, -9); c.lineTo(6, 11); c.lineTo(-6, 11); c.clip(); c.fillStyle = '#a8423a'; c.fillRect(-9, 5, 18, 7); c.fillStyle = '#f5d566'; c.fillRect(-9, -1, 18, 6); c.fillStyle = '#9fd67a'; c.fillRect(-9, -6, 18, 5); c.fillStyle = '#fffaf0'; c.fillRect(-9, -9, 18, 3); c.restore(); line(c, 3, -12, 5, -16, '#f08ca0', 1.2); },
  banh_trang_nuong: c => { c.save(); c.rotate(-0.2); c.beginPath(); c.arc(0, 0, 13, 0, Math.PI); c.lineTo(-13, 0); c.closePath(); c.fillStyle = '#f2c46b'; c.fill(); c.strokeStyle = INK; c.lineWidth = 1; c.stroke(); for (let i = 0; i < 6; i++) circ(c, -9 + i * 3.6, 3 + (i % 2) * 2, 1.2, i % 2 ? '#6fbf4a' : '#e3703a', null); c.restore(); },
};
function bowl(c, soup) {
  ell(c, 0, -3, 14, 5, '#fffdf6');
  ell(c, 0, -3, 12, 3.8, soup, null);
  c.beginPath(); c.moveTo(-14, -3); c.quadraticCurveTo(0, 16, 14, -3); c.fillStyle = '#fffdf6'; c.fill(); c.strokeStyle = INK; c.lineWidth = 1; c.stroke();
  c.strokeStyle = '#6aa5d8'; c.lineWidth = 1; c.beginPath(); c.moveTo(-11, 2); c.quadraticCurveTo(0, 9, 11, 2); c.stroke();
  c.strokeStyle = '#efe3c7'; c.lineWidth = 0.7; for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(-8 + i, -3 + i * 0.6); c.quadraticCurveTo(0, -1 + i * 0.4, 8 - i, -3 + i * 0.6); c.stroke(); }
}
function steam(c) { const t = performance.now() / 1000; c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = 1.2; for (let i = -1; i <= 1; i++) { const k = (t * 0.8 + i * 0.3) % 1; c.globalAlpha = 1 - k; c.beginPath(); c.moveTo(i * 5, -9 - k * 6); c.quadraticCurveTo(i * 5 + 2, -12 - k * 6, i * 5, -15 - k * 6); c.stroke(); } c.globalAlpha = 1; }

// ---------------------------------------------------------------- drinks
// A cup rendered from a composition so the player sees the drink being built.
// comp: { size:'S'|'M'|'L', layers:[{color, h}], ice:0..2, bits:[{kind}], foam, straw, lid }
export function drawCup(c, comp, t = 0, w = 60, h = 84) {
  const sz = comp.size === 'L' ? 1.1 : comp.size === 'S' ? 0.88 : 1;
  w *= sz; h *= sz;
  const top = -h / 2, bot = h / 2, tw = w / 2, bw = w * 0.36;
  const cup = () => { c.beginPath(); c.moveTo(-tw, top); c.lineTo(tw, top); c.lineTo(bw, bot); c.quadraticCurveTo(0, bot + 3, -bw, bot); c.closePath(); };
  // back of cup
  cup(); c.fillStyle = 'rgba(255,255,255,.55)'; c.fill();
  c.save(); cup(); c.clip();
  let y = bot + 2;
  const total = comp.layers.reduce((s, l) => s + l.h, 0);
  // ice displaces liquid, so a drink with ice sits higher in the cup
  const lift = total > 0 ? 1 + (comp.ice === 2 ? 0.28 : comp.ice === 1 ? 0.14 : 0) : 1;
  const scaleH = Math.min(lift, 1 / Math.max(total, 0.01));
  for (const L of comp.layers) {
    const hh = L.h * scaleH * (h - 8) / Math.max(1, total * scaleH);
    const shown = hh * (L.anim ?? 1);
    const g = c.createLinearGradient(0, y - shown, 0, y);
    g.addColorStop(0, shade(L.color, 18)); g.addColorStop(1, L.color);
    c.fillStyle = g; c.fillRect(-tw - 2, y - shown, w + 4, shown + 1);
    if (L.swirl) { c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 2; c.beginPath(); c.moveTo(-tw, y - shown / 2); c.bezierCurveTo(-tw / 3, y - shown, tw / 3, y, tw, y - shown / 2); c.stroke(); }
    y -= shown;
  }
  const liquidTop = y;
  // ice cubes bob at the surface
  const cubes = comp.ice === 2 ? 6 : comp.ice === 1 ? 3 : 0;
  for (let i = 0; i < cubes; i++) {
    const cx = -tw * 0.55 + (i % 3) * tw * 0.55 + Math.sin(t * 1.5 + i) * 1.2;
    const cy = Math.max(liquidTop + 7, top + 10) + Math.floor(i / 3) * 12 + Math.sin(t * 2 + i * 2) * 1.2;
    c.save(); c.translate(cx, cy); c.rotate(0.3 * Math.sin(i * 7));
    box(c, -6, -6, 12, 12, 3, 'rgba(235,250,255,.72)', 'rgba(120,170,200,.8)', 1);
    box(c, -3.8, -3.8, 4, 3, 1, 'rgba(255,255,255,.9)', null);
    c.restore();
  }
  for (const [i, b] of (comp.bits || []).entries()) {
    const bx = -tw * 0.5 + ((i * 29) % 100) / 100 * tw, by = bot - 8 - ((i * 17) % 30) * (b.float ? 0 : 0.5) - (b.float ? (bot - liquidTop) - 6 : 0) + Math.sin(t * 2 + i) * 0.8;
    c.save(); c.translate(bx, b.float ? Math.max(liquidTop + 5, by) : by);
    if (b.kind === 'tapioca') circ(c, 0, 0, 3.6, '#3b2a28', 'rgba(0,0,0,.4)', 0.6);
    else if (b.kind === 'kumquat') { circ(c, 0, 0, 5, '#ffcf5c', '#e89a2a', 0.8); circ(c, 0, 0, 3.2, '#ffe68a', null); }
    else if (b.kind === 'peach') { c.rotate(i); c.beginPath(); c.arc(0, 0, 5, 0, Math.PI); c.closePath(); c.fillStyle = '#ffc07a'; c.fill(); c.strokeStyle = '#e8904a'; c.lineWidth = 0.8; c.stroke(); }
    else if (b.kind === 'jelly') box(c, -3.4, -3.4, 6.8, 6.8, 1.6, 'rgba(160,220,170,.9)', 'rgba(90,150,110,.6)', 0.7);
    else if (b.kind === 'lime') { c.beginPath(); c.arc(0, 0, 4.6, Math.PI, 0); c.closePath(); c.fillStyle = '#d7f09a'; c.fill(); c.strokeStyle = '#7fae4d'; c.lineWidth = 0.8; c.stroke(); }
    c.restore();
  }
  if (comp.foam) { const fh = 10 * (comp.foamAnim ?? 1); c.fillStyle = comp.foamColor || '#fff4d6'; c.beginPath(); c.moveTo(-tw - 2, top + fh + 2); for (let i = 0; i <= 6; i++) c.quadraticCurveTo(-tw + i * w / 6 - w / 12, top + 2 - (i % 2) * 2, -tw + i * w / 6, top + fh * 0.6 + 2); c.lineTo(tw + 2, top - 2); c.lineTo(-tw - 2, top - 2); c.fill(); }
  // sugar sparkles
  if (comp.sugar) for (let i = 0; i < Math.round(comp.sugar / 20); i++) { const k = (t * 0.4 + i * 0.21) % 1; circ(c, -tw * 0.6 + ((i * 41) % 100) / 100 * tw * 1.2, bot - 6 - k * (bot - liquidTop - 8), 0.9, 'rgba(255,255,255,.9)', null); }
  c.restore();
  // glass front: outline, highlight
  cup(); c.strokeStyle = INK; c.lineWidth = 2; c.stroke();
  c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = 3; c.beginPath(); c.moveTo(-tw + 7, top + 8); c.lineTo(-bw + 5, bot - 8); c.stroke();
  ell(c, 0, top, tw, 4, 'rgba(255,255,255,.35)', INK, 2);
  if (comp.lid) { ell(c, 0, top - 1, tw + 2, 5.6, 'rgba(255,255,255,.6)', INK, 1.6); }
  if (comp.straw) { box(c, 6, top - 26, 6, 44, 3, comp.strawColor || '#f08ca0', INK, 1.4); }
  // size badge
  if (comp.size) { circ(c, tw * 0.52, bot - 12, 7, '#fff', INK, 1.2); c.font = '900 9px Nunito, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = INK; c.fillText(comp.size, tw * 0.52, bot - 11.6); }
}

// ---------------------------------------------------------------- icon images for DOM UI
const iconCache = new Map();
export function iconURL(id, px = 64) {
  const key = id + '@' + px;
  if (iconCache.has(key)) return iconCache.get(key);
  const cv = document.createElement('canvas');
  cv.width = cv.height = px * 2;
  const c = cv.getContext('2d');
  c.scale(px * 2 / 32, px * 2 / 32); c.translate(16, 16);
  c.lineJoin = 'round'; c.lineCap = 'round';
  const fn = ICONS[id] || DISHES[id];
  if (fn) { c.scale(0.95, 0.95); fn(c, 0); }
  else if (id.startsWith('drink:')) { c.scale(0.3, 0.3); drawCup(c, DRINK_PREVIEW[id.slice(6)] || DRINK_PREVIEW.tra_tac); }
  else { circ(c, 0, 0, 10, '#eee'); }
  const url = cv.toDataURL();
  iconCache.set(key, url);
  return url;
}
export const DRINK_PREVIEW = {
  tra_tac: { size: 'M', layers: [{ color: '#f0b04a', h: 1 }], ice: 1, bits: [{ kind: 'kumquat', float: 1 }, { kind: 'kumquat', float: 1 }], straw: true },
  ca_phe_sua_da: { size: 'M', layers: [{ color: '#f2e6cc', h: 0.3 }, { color: '#6b4431', h: 0.7 }], ice: 2, straw: true, strawColor: '#8ad0e8' },
  tra_dao: { size: 'M', layers: [{ color: '#f7a868', h: 1 }], ice: 1, bits: [{ kind: 'peach' }, { kind: 'peach' }], straw: true },
  sinh_to_bo: { size: 'M', layers: [{ color: '#c5e08a', h: 1 }], straw: true, strawColor: '#8fd070' },
  tra_sua: { size: 'M', layers: [{ color: '#d9b28a', h: 1 }], ice: 1, bits: [{ kind: 'tapioca' }, { kind: 'tapioca' }, { kind: 'tapioca' }], straw: true },
  nuoc_chanh: { size: 'M', layers: [{ color: '#e8f5a8', h: 1 }], ice: 2, bits: [{ kind: 'lime', float: 1 }], straw: true },
};
export function drawIcon(c, id, t = 0) {
  const fn = ICONS[id] || DISHES[id];
  if (fn) fn(c, t);
  else if (id.startsWith('drink:')) { c.save(); c.scale(0.3, 0.3); drawCup(c, DRINK_PREVIEW[id.slice(6)] || DRINK_PREVIEW.tra_tac, t); c.restore(); }
}
