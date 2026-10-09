// Weather and seasons, shared by every player: the island year is 60 real days, four seasons of
// 15 days (spring, summer, autumn, winter — see yearDay in util.js). Each real day's weather comes
// from the date, so everyone gets the same showers: summer is the rainy season, autumn has heavy
// tropical downpours, winter brings the cool fine drizzle (mưa phùn). Showers happen in the
// afternoon of the in-game day. Rain darkens the sky, sends people under umbrellas, fills cafés
// and empties the beach.
import { G, T } from './state.js';
import { rng, bus, jstDayNum, islandSeason } from '../core/util.js';
import { cam } from '../world/render.js';
import { sfx, setRain } from '../core/audio.js';

export const seasonOf = () => islandSeason();
export const SEASON_NAME = { spring: ['Spring', 'Mùa xuân'], summer: ['Summer', 'Mùa hè'], autumn: ['Autumn', 'Mùa thu'], winter: ['Winter', 'Mùa đông'] };
const RAIN_P = { spring: 0.22, summer: 0.45, autumn: 0.3, winter: 0.2 };
export function weatherOn(dayNum = jstDayNum()) {
  const r = rng(dayNum * 7349 + 11), season = islandSeason(dayNum * 864e5 - 9 * 3600e3 + 43200e3);
  if (r() >= RAIN_P[season]) return { season, rain: false };
  const drizzle = season === 'winter', start = season === 'summer' ? 10 + r() * 6 : 12 + r() * 4, len = 1.5 + r() * (drizzle ? 5 : 3);
  return { season, rain: true, drizzle, start, end: start + len, heavy: !drizzle && r() < (season === 'autumn' ? 0.55 : 0.35) };
}
// how much busier each kind of shop is in the rain
const RAIN_BOOST = { cafe: 1.3, restaurant: 1.25, banhmi: 1.05, drinks: 0.85, truck: 0.8, smoothie: 0.65, grill: 0.85, night: 0.75 };
export const weatherBoost = biz => (G.runtime.rainA || 0) > 0.4 ? (RAIN_BOOST[biz] ?? 1) : 1;
export const raining = () => (G.runtime.rainA || 0) > 0.4;

const UMB = ['#f28f7c', '#6fbfb0', '#f7de8c', '#8fb7e0', '#c9b6e8', '#e8584e', '#3f4a5e'];
let soundT = 0;
export function updateWeather(dt) {
  const s = G.state; if (!s) return;
  G.runtime.season = seasonOf();
  const w = weatherOn(), h = s.time / 60, want = w.rain && h >= w.start && h < w.end && G.scene === G.scenes.island ? (w.heavy ? 1 : w.drizzle ? 0.5 : 0.7) : 0;
  const a = (G.runtime.rainA || 0) + (want - (G.runtime.rainA || 0)) * Math.min(1, dt * 0.6);
  if (want > 0 && !G.runtime.rainA) bus.emit('toast', w.drizzle ? { cat: 'weather', text: T('A fine winter drizzle', 'Mưa phùn mùa đông'), sub: T('Warm drinks weather.', 'Thời tiết hợp đồ uống nóng.'), icon: 'ice', ms: 2600 } : { cat: 'weather', text: T('It\'s starting to rain', 'Trời bắt đầu mưa'), sub: T('Cafés fill up, the beach empties.', 'Quán cà phê đông khách, bãi biển vắng người.'), icon: 'ice', ms: 2600 });
  G.runtime.rainA = a < 0.01 ? 0 : a;
  // umbrellas up (and down again) for everyone walking around outside
  const isl = G.scenes.island, up = a > 0.3;
  if (isl) for (const act of isl.actors) {
    if (act.kind !== 'human' || act.clip || act.lie) continue;
    const atCart = act.data?.cart && !act.data.walking && !act.data.away;          // (a grandma at her cart has the big market umbrella instead)
    if (up && !act.umbrella && !act.data?.keeper && !atCart) act.umbrella = UMB[Math.abs(Math.round((act.seed || act.x) * 7)) % UMB.length];
    else if ((!up || atCart) && act.umbrella) act.umbrella = null;
  }
  if (G.player) G.player.umbrella = up && G.scene === isl && !G.player.act ? '#ff8fb0' : null;
  // the rain's sound follows how hard it rains (and goes quiet indoors, where a = 0); a far-off
  // rumble now and then in a heavy shower
  if ((soundT -= dt) <= 0) { soundT = 0.5; setRain(a); if (a > 0.85 && Math.random() < 0.012) sfx('amb_thunder'); }
}
// streaks of rain and splashes, over the island
export function drawRain(c, t) {
  if (G.scene !== G.scenes.island) return;
  const a = G.runtime.rainA || 0, v = cam.view;
  // the season tints the whole island a little: pink spring, warm summer, amber autumn, cool winter
  c.fillStyle = { spring: 'rgba(255,190,215,.04)', summer: 'rgba(255,210,120,.035)', autumn: 'rgba(255,150,70,.05)', winter: 'rgba(150,180,235,.06)' }[seasonOf()]; c.fillRect(v.x, v.y, v.w, v.h);
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
