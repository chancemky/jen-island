// Persistent game state: shape, defaults, migration and small mutators.
// Only durable data lives here; walking NPCs, queues and animations are
// runtime-only and rebuilt on load.

import { bus, clamp } from '../core/util.js';
import { BUSINESSES, RECIPES, ACHIEVEMENTS } from '../data/game.js';

export const SAVE_VERSION = 1;

export function defaultState() {
  const biz = {};
  for (const id of Object.keys(BUSINESSES)) biz[id] = { id, repair: 0, level: 1, owned: id === 'shed1', unlocked: id === 'shed1', open: false, prepped: {}, recipes: [], special: null, stats: { served: 0, revenue: 0 }, employees: [], register: 0, decor: [] };
  return {
    v: SAVE_VERSION,
    savedAt: 0,
    player: { name: '', look: null },
    island: { name: '' },
    day: 1, time: 7 * 60,
    money: 300, reputation: 0, lifetime: 0,
    pantry: {},              // raw ingredients: id → portions
    materials: {},           // id → count
    recipes: [],             // discovered recipe ids
    recipeLevels: {},        // id → 1..3
    biz,
    home: { furniture: [], owned: [] }, // furniture: [{id, x, y}] placed; owned: unplaced ids
    regulars: {},            // customerKey → {name, visits, likes}
    friends: {},             // resident id → friendship points
    achievements: [],
    story: { chapter: 1, step: 'intro', flags: {}, done: [] },
    stats: { served: 0, perfect: 0, tipsTotal: 0, daysPlayed: 0 },
    today: freshDay(),
    history: [],             // last few daily summaries
    nightMarket: { restored: false },
    statue: false,
    settings: { music: true, sfx: true, arrow: true },
    pos: null,               // {scene, x, y} last position for resume
  };
}
export function freshDay() { return { revenue: 0, served: 0, perfect: 0, tips: 0, repStart: null, lost: 0, spent: 0, milestones: [], biz: {} }; }

export function migrate(raw) {
  const d = defaultState();
  if (!raw || typeof raw !== 'object') return d;
  const s = { ...d, ...raw };
  s.player = { ...d.player, ...(raw.player || {}) };
  s.island = { ...d.island, ...(raw.island || {}) };
  s.story = { ...d.story, ...(raw.story || {}), flags: { ...(raw.story?.flags || {}) } };
  s.stats = { ...d.stats, ...(raw.stats || {}) };
  s.today = { ...freshDay(), ...(raw.today || {}) };
  s.settings = { ...d.settings, ...(raw.settings || {}) };
  s.home = { furniture: Array.isArray(raw.home?.furniture) ? raw.home.furniture : [], owned: Array.isArray(raw.home?.owned) ? raw.home.owned : [] };
  s.nightMarket = { ...d.nightMarket, ...(raw.nightMarket || {}) };
  s.biz = { ...d.biz };
  for (const id of Object.keys(d.biz)) s.biz[id] = { ...d.biz[id], ...(raw.biz?.[id] || {}), open: false };
  for (const b of Object.values(s.biz)) { b.prepped ||= {}; b.employees ||= []; b.stats ||= { served: 0, revenue: 0 }; b.decor ||= []; }
  s.recipes = (raw.recipes || []).filter(r => RECIPES[r]);
  s.achievements = (raw.achievements || []).filter(a => ACHIEVEMENTS[a]);
  s.money = Number.isFinite(+raw.money) ? +raw.money : d.money;
  s.reputation = Math.max(0, +raw.reputation || 0);
  s.day = Math.max(1, Math.floor(+raw.day || 1));
  s.time = clamp(+raw.time || 7 * 60, 6 * 60, 26 * 60);
  s.v = SAVE_VERSION;
  return s;
}

// Shared mutable handle. G.state is the save; G.* holds runtime singletons.
export const G = { state: defaultState(), user: null, dirty: false, scene: null, player: null, meo: null, t: 0 };

export function markDirty(important = false) { G.dirty = true; if (important) bus.emit('save:now'); }

export function addMoney(k, reason = '') {
  const s = G.state;
  s.money = Math.round((s.money + k) * 100) / 100;
  if (k > 0) { s.lifetime += k; s.today.revenue += reason === 'sale' || reason === 'tip' ? k : 0; }
  else s.today.spent -= k;
  bus.emit('money', k, reason);
  markDirty();
}
export function canAfford(k) { return G.state.money >= k - 1e-6; }
export function addRep(n) { G.state.reputation = Math.max(0, G.state.reputation + n); bus.emit('rep', n); markDirty(); }
export function repStars(rep = G.state.reputation) { return clamp(1 + Math.log2(1 + rep / 10) * 0.8, 1, 5); }

export function pantry(id) { return G.state.pantry[id] || 0; }
export function addPantry(id, n) { G.state.pantry[id] = Math.max(0, (G.state.pantry[id] || 0) + n); bus.emit('pantry', id); markDirty(); }
export function mats(id) { return G.state.materials[id] || 0; }
export function addMat(id, n) { G.state.materials[id] = Math.max(0, (G.state.materials[id] || 0) + n); bus.emit('materials', id); markDirty(); }
export function hasMats(req) { return Object.entries(req || {}).every(([k, v]) => mats(k) >= v); }
export function spendMats(req) { for (const [k, v] of Object.entries(req || {})) addMat(k, -v); }

export function flag(f) { return !!G.state.story.flags[f]; }
export function setFlag(f, v = true) { G.state.story.flags[f] = v; markDirty(true); bus.emit('flag', f); }

export function learnRecipe(id) {
  const s = G.state;
  if (s.recipes.includes(id)) return false;
  s.recipes.push(id);
  s.recipeLevels[id] ||= 1;
  const biz = Object.values(s.biz).find(b => BUSINESSES[b.id].biz === RECIPES[id].biz);
  markDirty(true);
  bus.emit('recipe', id);
  void biz;
  return true;
}

export function unlockAchievement(id) {
  const s = G.state;
  if (!ACHIEVEMENTS[id] || s.achievements.includes(id)) return;
  s.achievements.push(id);
  s.today.milestones.push(ACHIEVEMENTS[id].en);
  bus.emit('achievement', id);
  markDirty(true);
}

export function bizOf(id) { return G.state.biz[id]; }
export function bizReady(id) { const b = G.state.biz[id]; return b && b.owned && (b.repair >= 1 || !BUSINESSES[id].repair); }
