// Asking for an App Store / Google Play rating, the polite way: only in the app, only right
// after something good (a level-up past 8, a finished chapter, a weekly prize), only once
// you've played five island days, and at most once every 90 days (three times ever).
// The store decides whether the box actually shows (@capawesome/capacitor-app-review).

import { G, markDirty } from './state.js';
import { bus } from '../core/util.js';
import { track } from './telemetry.js';

const plugin = () => window.Capacitor?.isNativePlatform?.() ? window.Capacitor.Plugins?.AppReview : null;
function maybeAsk(why) {
  const s = G.state, r = (s.review ||= { n: 0, at: 0 }), ap = plugin();
  if (!ap || s.day < 5 || r.n >= 3 || Date.now() - r.at < 90 * 864e5 || G.runtime.inCutscene) return;
  r.n++; r.at = Date.now(); markDirty(true);
  track('review_ask', { why });
  setTimeout(() => ap.requestReview?.().catch(() => {}), 1800);      // after the celebration settles
}
export function initReview() {
  bus.on('levelup', lv => { if (lv >= 8) maybeAsk('level'); });
  bus.on('chapterCard', () => maybeAsk('chapter'));
  bus.on('weekAward', () => maybeAsk('award'));
}
