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
  tapOverrideAt: null,          // HUD controls can claim a tap even when the touch layer won hit-testing
  lastTouch: 0,
};

let base, knob, zone, active = null, captureOwner = null, ox = 0, oy = 0;
let downX = 0, downY = 0, downT = 0, dragMax = 0; // a quick touch without dragging is a tap
let tapOverride = null;             // a HUD control can yield a drag to the stick, but keep an unmoved tap
let lastMoveRead = performance.now();
const R = 46;
const STALE_MS = 250;
const stale = e => { const age = performance.now() - e.timeStamp; return age > STALE_MS && age < 60000; };

export function initInput(zoneEl, baseEl, knobEl) {
  zone = zoneEl; base = baseEl; knob = knobEl;
  zone.addEventListener('pointerdown', onDown, { passive: false });
  window.addEventListener('pointermove', onMove, { passive: false, capture: true });
  window.addEventListener('pointerup', onUp, true);
  window.addEventListener('pointercancel', onUp, true);
  window.addEventListener('lostpointercapture', onUp, true);
  const resetInput = () => { releaseJoystick(); input.keys.clear(); input.actionPressed = false; };
  window.addEventListener('blur', resetInput);
  window.addEventListener('pagehide', resetInput);
  document.addEventListener('visibilitychange', () => { if (document.hidden) resetInput(); });
  // Canvas taps can leave browser focus in a dead target (notably after closing the map).
  // Keep keyboard events rooted in the play surface and discard any key/pointer state lost during the focus change.
  zone.tabIndex = -1;
  const reclaimsFocus = e => e.target === zone || !!e.target.closest?.('.map-wrap');
  const focusPlaySurface = () => { try { zone.focus({ preventScroll: true }); } catch { zone.focus(); } };
  document.addEventListener('pointerdown', e => {
    if (!reclaimsFocus(e)) return;
    resetInput();
  }, true);
  document.addEventListener('pointerup', e => { if (reclaimsFocus(e)) focusPlaySurface(); }, true);
  window.addEventListener('keydown', e => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    const key = e.key.toLowerCase();
    if (stale(e)) { input.keys.delete(key); return; }
    input.keys.add(key);
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
  if (!input.enabled || stale(e)) return false;
  // A fresh down with the same pointer id means its previous release was lost.
  // Re-anchor it here; a second finger must never steal the gesture in progress.
  if (active !== null) {
    if (e.pointerId !== active) return false;
    releaseJoystick();
  }
  e.preventDefault();
  active = e.pointerId;
  tapOverride = onTap;
  input.x = input.y = input.mag = 0;
  if (document.body.classList.contains('show-joy-hint')) setTimeout(() => document.body.classList.remove('show-joy-hint'), 1500);
  input.lastTouch = performance.now();
  const r = zone.getBoundingClientRect();
  ox = e.clientX; oy = e.clientY;
  downX = ox; downY = oy; downT = performance.now(); dragMax = 0;
  base.style.left = (ox - r.left) + 'px'; base.style.top = (oy - r.top) + 'px';
  base.classList.add('on');
  knob.style.transform = 'translate(-50%,-50%)';
  captureOwner = e.currentTarget?.setPointerCapture ? e.currentTarget : e.target?.setPointerCapture ? e.target : null;
  try { captureOwner?.setPointerCapture(e.pointerId); } catch { captureOwner = null; }
  return true;
}
function onDown(e) { startJoystick(e, input.tapOverrideAt?.(e.clientX, e.clientY) || null); }
function onMove(e) {
  if (e.pointerId !== active) return;
  if (stale(e)) { onUp({ pointerId: e.pointerId, type: 'pointercancel' }); return; }
  // Browsers occasionally lose pointerup when focus or pointer capture changes. A mouse/pen
  // move with no button held is an implicit release, never a continuing joystick drag.
  if ((e.pointerType === 'mouse' || e.pointerType === 'pen') && e.buttons === 0) { onUp({ pointerId: e.pointerId, type: 'pointercancel' }); return; }
  e.preventDefault();
  const dx = e.clientX - ox, dy = e.clientY - oy;
  const d = Math.hypot(dx, dy);
  dragMax = Math.max(dragMax, Math.hypot(e.clientX - downX, e.clientY - downY));
  // The origin belongs to this gesture. Moving the base after a long outdoor swipe
  // made a small correction point the opposite way from the original drag.
  const m = Math.min(1, d / R);
  const nx = d ? dx / d : 0, ny = d ? dy / d : 0;
  const dead = 0.14;
  const mm = m < dead ? 0 : (m - dead) / (1 - dead);
  input.x = nx * mm; input.y = ny * mm; input.mag = mm;
  knob.style.transform = `translate(calc(-50% + ${nx * Math.min(d, R)}px), calc(-50% + ${ny * Math.min(d, R)}px))`;
}
function onUp(e) {
  if (e.pointerId !== active) return;
  const tapped = e.type !== 'pointercancel' && e.type !== 'lostpointercapture' && !stale(e) && dragMax < 12 && e.clientX !== undefined;
  let override = tapOverride;
  // If the action appeared after pointerdown (or the browser cached the old hit target),
  // a release over its now-visible hit box still belongs to the button.
  if (tapped && !override) override = input.tapOverrideAt?.(e.clientX, e.clientY) || null;
  const owner = captureOwner;
  active = null;
  captureOwner = null;
  tapOverride = null;
  input.x = input.y = input.mag = 0;
  resetKnob();
  try { if (owner?.hasPointerCapture?.(e.pointerId)) owner.releasePointerCapture(e.pointerId); } catch {}
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
export const joystickActive = () => active !== null;

// Combined movement vector (joystick or keys).
export function moveVector() {
  if (!input.enabled) return [0, 0, 0];
  const now = performance.now(), gap = now - lastMoveRead; lastMoveRead = now;
  // Never replay held input after the main thread was blocked: the next fresh key/pointer event resumes it.
  if (gap > STALE_MS) { releaseJoystick(); input.keys.clear(); input.x = input.y = input.mag = 0; return [0, 0, 0]; }
  let x = input.x, y = input.y;
  const k = input.keys;
  const kx = (k.has('arrowright') || k.has('d') ? 1 : 0) - (k.has('arrowleft') || k.has('a') ? 1 : 0);
  const ky = (k.has('arrowdown') || k.has('s') ? 1 : 0) - (k.has('arrowup') || k.has('w') ? 1 : 0);
  if (kx || ky) { const l = Math.hypot(kx, ky); x = kx / l; y = ky / l; document.body.classList.remove('show-joy-hint'); }
  const m = clamp(Math.hypot(x, y), 0, 1);
  return [x, y, m];
}
