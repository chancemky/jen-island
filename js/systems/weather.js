// Weather and seasons. The island year (60 days) has a dry season (days 1–30) and a rainy
// season (31–60). Each day's weather is decided from the day number, so it's the same for
// everyone who reaches that day: in the rainy season about two days in five have a shower
// (usually in the afternoon), in the dry season hardly any. Rain darkens the sky, sends
// people under umbrellas, fills cafés and empties the beach.
import { G, T } from './state.js';
import { rng, bus } from '../core/util.js';
import { cam } from '../world/render.js';
import { sfx } from '../core/audio.js';

const YEAR = 60;
export const seasonOf = (day = G.state.day) => (((day - 1) % YEAR) + 1) <= 30 ? 'dry' : 'rainy';
export const SEASON_NAME = { dry: ['Dry season', 'Mùa khô'], rainy: ['Rainy season', 'Mùa mưa'] };
export function weatherOn(day = G.state.day) {
  const r = rng(day * 7349 + 11), season = seasonOf(day), p = season === 'rainy' ? 0.42 : 0.08;
  if (r() >= p) return { season, rain: false };
  const start = season === 'rainy' ? 12 + r() * 4 : 14 + r() * 3, len = 1.5 + r() * 3;
  return { season, rain: true, start, end: start + len, heavy: r() < 0.35 };
}
// how much busier each kind of shop is in the rain
const RAIN_BOOST = { cafe: 1.3, restaurant: 1.25, banhmi: 1.05, drinks: 0.85, truck: 0.8, smoothie: 0.65, grill: 0.85, night: 0.75 };
export const weatherBoost = biz => (G.runtime.rainA || 0) > 0.4 ? (RAIN_BOOST[biz] ?? 1) : 1;
export const raining = () => (G.runtime.rainA || 0) > 0.4;

const UMB = ['#f28f7c', '#6fbfb0', '#f7de8c', '#8fb7e0', '#c9b6e8', '#e8584e', '#3f4a5e'];
let soundT = 0;
export function updateWeather(dt) {
  const s = G.state; if (!s) return;
  const w = weatherOn(), h = s.time / 60, want = w.rain && h >= w.start && h < w.end && G.scene === G.scenes.island ? (w.heavy ? 1 : 0.7) : 0;
  const a = (G.runtime.rainA || 0) + (want - (G.runtime.rainA || 0)) * Math.min(1, dt * 0.6);
  if (want > 0 && !G.runtime.rainA) bus.emit('toast', { cat: 'weather', text: T('It\'s starting to rain', 'Trời bắt đầu mưa'), sub: T('Cafés fill up, the beach empties.', 'Quán cà phê đông khách, bãi biển vắng người.'), icon: 'ice', ms: 2600 });
  G.runtime.rainA = a < 0.01 ? 0 : a;
  // umbrellas up (and down again) for everyone walking around outside
  const isl = G.scenes.island, up = a > 0.3;
  if (isl) for (const act of isl.actors) { if (act.kind !== 'human' || act.clip || act.lie) continue; if (up && !act.umbrella && !act.data?.keeper) act.umbrella = UMB[Math.abs(Math.round((act.seed || act.x) * 7)) % UMB.length]; else if (!up && act.umbrella) act.umbrella = null; }
  if (G.player) G.player.umbrella = up && G.scene === isl && !G.player.act ? '#ff8fb0' : null;
  if (a > 0.2 && (soundT -= dt) <= 0) { soundT = 1.3; sfx(a > 0.8 ? 'amb_rain_heavy' : 'amb_rain'); }
}
// streaks of rain and splashes, over the island
export function drawRain(c, t) {
  if (G.scene !== G.scenes.island) return;
  const a = G.runtime.rainA || 0, v = cam.view;
  // the season colours the whole island a little: warm gold in the dry months, cool and lush in the rains
  c.fillStyle = seasonOf() === 'rainy' ? 'rgba(60,140,130,.05)' : 'rgba(255,200,110,.04)'; c.fillRect(v.x, v.y, v.w, v.h);
  if (a < 0.02) return;
  c.save(); c.fillStyle = `rgba(70,90,120,${0.2 * a})`; c.fillRect(v.x, v.y, v.w, v.h);
  c.strokeStyle = `rgba(230,240,255,${0.45 * a})`; c.lineWidth = 0.8; c.beginPath();
  const n = Math.round((G.state.settings.lowPower ? 60 : 160) * a);
  for (let i = 0; i < n; i++) {
    const sx = (i * 97.13) % 1, sy = (i * 57.31) % 1, sp = 0.7 + ((i * 13) % 7) / 10;
    const x = v.x + ((sx * v.w + t * 60 * sp) % v.w), y = v.y + ((sy * v.h + t * 520 * sp) % v.h);
    c.moveTo(x, y); c.lineTo(x - 3, y + 11);
  }
  c.stroke();
  c.fillStyle = `rgba(230,240,255,${0.5 * a})`;
  for (let i = 0; i < Math.round(40 * a); i++) { const k = (t * 2.3 + i * 0.37) % 1, x = v.x + ((i * 131.7) % v.w), y = v.y + ((i * 77.3 + Math.floor(t * 2.3 + i * 0.37) * 53) % v.h); c.globalAlpha = (1 - k) * a; c.beginPath(); c.ellipse(x, y, 2 + k * 4, (2 + k * 4) * 0.4, 0, 0, Math.PI * 2); c.fill(); }
  c.restore();
}
