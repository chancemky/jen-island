// Haptics: a light tap under your thumb for the game's sounds. In the App Store / Google
// Play app it uses the phone's haptic engine (@capacitor/haptics); in an Android browser
// a tiny vibration; iPhone browsers have no vibration, so nothing there. Settings → Haptics.

const state = { on: true, last: 0 };
export function setHaptics(on) { state.on = !!on; }
const plugin = () => window.Capacitor?.isNativePlatform?.() ? window.Capacitor.Plugins?.Haptics : null;

// which sounds get which feel (anything not listed stays silent to the hand)
const FEEL = {
  ui: 'select', tap: 'select', pop: 'light', back: 'select', buy: 'light', coin: 'light', cash: 'medium',
  chop: 'light', hammer: 'medium', success: 'success', fanfare: 'success', error: 'warn', door: 'light',
};
const PATTERN = { select: 6, light: 10, medium: 18, heavy: 28, success: [10, 50, 16], warn: [24, 40, 24] };
export function haptic(kind = 'light') {
  if (!state.on) return;
  const now = performance.now(); if (now - state.last < 40) return; state.last = now;     // never a buzz storm
  try {
    const h = plugin();
    if (h) {
      if (kind === 'select') return void h.selectionStart?.().then(() => h.selectionChanged?.()).then(() => h.selectionEnd?.()).catch(() => {});
      if (kind === 'success' || kind === 'warn') return void h.notification?.({ type: kind === 'success' ? 'SUCCESS' : 'WARNING' }).catch(() => {});
      return void h.impact?.({ style: kind === 'heavy' ? 'HEAVY' : kind === 'medium' ? 'MEDIUM' : 'LIGHT' }).catch(() => {});
    }
    navigator.vibrate?.(PATTERN[kind] ?? 10);
  } catch { /* no haptics here */ }
}
export function hapticFor(sound) { const k = FEEL[sound]; if (k) haptic(k); }
