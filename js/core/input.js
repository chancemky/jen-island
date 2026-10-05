// Input: a floating virtual joystick for touch (appears under the thumb
// anywhere in the play area), plus keyboard for desktop testing.
// Pointer Events work on iOS Safari 13+; we also block the page from
// scrolling/zooming so the game feels native.

import { clamp } from './util.js';

export const input = {
  x: 0, y: 0, mag: 0,          // joystick vector (-1..1)
  enabled: true,
  keys: new Set(),
  actionPressed: false,         // consumed by the game loop
  onAction: null,
  lastTouch: 0,
};

let base, knob, zone, active = null, ox = 0, oy = 0;
let downX = 0, downY = 0, downT = 0, dragMax = 0; // a quick touch without dragging is a tap
let tapOverride = null;             // a HUD control can yield a drag to the stick, but keep an unmoved tap
const R = 46;

export function initInput(zoneEl, baseEl, knobEl) {
  zone = zoneEl; base = baseEl; knob = knobEl;
  zone.addEventListener('pointerdown', onDown, { passive: false });
  window.addEventListener('pointermove', onMove, { passive: false });
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);
  window.addEventListener('blur', () => { onUp({ pointerId: active }); input.keys.clear(); });
  window.addEventListener('keydown', e => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    input.keys.add(e.key.toLowerCase());
    if (e.key === ' ' || e.key === 'e' || e.key === 'Enter') { input.actionPressed = true; input.onAction?.(); e.preventDefault(); }
  });
  window.addEventListener('keyup', e => input.keys.delete(e.key.toLowerCase()));
  // iOS: stop rubber-band scrolling, double-tap zoom and pinch zoom.
  // Block page scroll/rubber-banding except inside scrollable UI strips.
  const SCROLLERS = '.scroll, .tabs, .aisles, .row-scroll, .prep-raw, .prep-bowls, .svc-grid, .summary';
  document.addEventListener('touchmove', e => { if (!e.target.closest || !e.target.closest(SCROLLERS)) e.preventDefault(); }, { passive: false });
  // Pinch-zoom (iOS ignores user-scalable=no). Double-tap zoom is disabled via touch-action in CSS,
  // so taps on buttons are never swallowed.
  document.addEventListener('gesturestart', e => e.preventDefault());
  // Tap rescue: a finger that goes down and comes up on the same button is a press, even
  // when the phone never delivers the click (iOS drops it now and then — a tiny slide, a
  // card still animating in). Then we click it ourselves; buttons ignore a second press.
  // (Buttons that act on pointerdown and cancel it — the action button, prep and service
  // taps — have already done their job, so they're left alone.)
  let tapBtn = null, tapDown = null;
  const BTN = 'button, [role="button"]';
  document.addEventListener('pointerdown', e => { tapBtn = e.pointerType === 'mouse' ? null : e.target.closest?.(BTN) || null; tapDown = e; }, true);
  document.addEventListener('pointerup', e => {
    const b = tapBtn; tapBtn = null;
    if (!b || !tapDown || e.pointerId !== tapDown.pointerId || tapDown.defaultPrevented) return;
    const under = document.elementFromPoint(e.clientX, e.clientY);
    if (!under || !b.contains(under)) return;
    let clicked = false;
    const mark = ev => { if (b.contains(ev.target)) clicked = true; };
    document.addEventListener('click', mark, true);
    setTimeout(() => { document.removeEventListener('click', mark, true); if (!clicked && b.isConnected && !b.disabled) { console.warn('[input] tap rescue:', b.textContent.trim().slice(0, 30)); b.click(); } }, 350);
  }, true);
  document.addEventListener('pointercancel', () => { tapBtn = null; }, true);
  resetKnob();
}

export function startJoystick(e, onTap = null) {
  if (!input.enabled || active !== null) return false;
  e.preventDefault();
  active = e.pointerId;
  tapOverride = onTap;
  if (document.body.classList.contains('show-joy-hint')) setTimeout(() => document.body.classList.remove('show-joy-hint'), 1500);
  input.lastTouch = performance.now();
  const r = zone.getBoundingClientRect();
  ox = e.clientX; oy = e.clientY;
  downX = ox; downY = oy; downT = performance.now(); dragMax = 0;
  base.style.left = (ox - r.left) + 'px'; base.style.top = (oy - r.top) + 'px';
  base.classList.add('on');
  knob.style.transform = 'translate(-50%,-50%)';
  return true;
}
function onDown(e) { startJoystick(e); }
function onMove(e) {
  if (e.pointerId !== active) return;
  e.preventDefault();
  let dx = e.clientX - ox, dy = e.clientY - oy;
  const d = Math.hypot(dx, dy);
  dragMax = Math.max(dragMax, Math.hypot(e.clientX - downX, e.clientY - downY));
  // drag the base along when the thumb goes far, so direction changes stay easy
  if (d > R * 1.6) {
    const k = (d - R * 1.6) / d; ox += dx * k; oy += dy * k;
    const r = zone.getBoundingClientRect();
    base.style.left = (ox - r.left) + 'px'; base.style.top = (oy - r.top) + 'px';
    dx = e.clientX - ox; dy = e.clientY - oy;
  }
  const dd = Math.hypot(dx, dy), m = Math.min(1, dd / R);
  const nx = dd ? dx / dd : 0, ny = dd ? dy / dd : 0;
  const dead = 0.14;
  const mm = m < dead ? 0 : (m - dead) / (1 - dead);
  input.x = nx * mm; input.y = ny * mm; input.mag = mm;
  knob.style.transform = `translate(calc(-50% + ${nx * Math.min(dd, R)}px), calc(-50% + ${ny * Math.min(dd, R)}px))`;
}
function onUp(e) {
  if (e.pointerId !== active) return;
  const tapped = dragMax < 12 && e.clientX !== undefined;
  const override = tapOverride;
  active = null;
  tapOverride = null;
  input.x = input.y = input.mag = 0;
  resetKnob();
  // HUD buttons accept a deliberate hold as a tap; world taps stay quick so a held thumb never walks somewhere.
  if (tapped && override) override();
  else if (tapped && performance.now() - downT < 350) input.onTap?.(downX, downY);
}
function resetKnob() {
  if (!base) return;
  base.classList.remove('on');
  knob.style.transform = 'translate(-50%,-50%)';
}
export function releaseJoystick() { if (active !== null) onUp({ pointerId: active }); }

// Combined movement vector (joystick or keys).
export function moveVector() {
  if (!input.enabled) return [0, 0, 0];
  let x = input.x, y = input.y;
  const k = input.keys;
  const kx = (k.has('arrowright') || k.has('d') ? 1 : 0) - (k.has('arrowleft') || k.has('a') ? 1 : 0);
  const ky = (k.has('arrowdown') || k.has('s') ? 1 : 0) - (k.has('arrowup') || k.has('w') ? 1 : 0);
  if (kx || ky) { const l = Math.hypot(kx, ky); x = kx / l; y = ky / l; document.body.classList.remove('show-joy-hint'); }
  const m = clamp(Math.hypot(x, y), 0, 1);
  return [x, y, m];
}
