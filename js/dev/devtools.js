// ┌──────────────────────────────────────────────────────────────────────────┐
// │  DEV TOOLS — for testing only. Loaded only while DEV_TOOLS (js/dev/flag.js)│
// │  is true. At launch: set DEV_TOOLS = false (this file can then be deleted).│
// └──────────────────────────────────────────────────────────────────────────┘
// Everything needed to test the whole game without replaying it: jump to any chapter
// (with the world as it would be by then), skip a step, money and stock, levels,
// businesses, staff, property, time of day and clock speed, customers, collections,
// bridges and festivals, side quests, teleporting and walking speed.

import { G, markDirty, addMoney, learnRecipe, unlockAchievement } from '../systems/state.js';
import { STEPS, setStep, checkStory, refreshQuest } from '../systems/story.js';
import { BUSINESSES, RECIPES, MATERIALS, FURNITURE, INGREDIENTS, ACHIEVEMENTS, FESTIVAL_REQ, KEEPER_REQ } from '../data/game.js';
import { CLOTHES } from '../data/wardrobe.js';
import { PETS } from '../systems/pets.js';
import { PLACES } from '../systems/economy.js';
import { endDay } from '../systems/time.js';
import { islandNow, learnServerTime, SEASON_DAYS, jstDow } from '../core/util.js';
import { SIDE_QUESTS } from '../systems/sidequests.js';
import { setScene } from '../systems/scenes.js';
import { saveLocal, saveCloudNow } from '../systems/save.js';
import { h, btn } from '../ui/sheets.js';
import { toast } from '../ui/hud.js';
import { clock } from '../core/util.js';

const s = () => G.state;
const B = id => s().biz[id];
const own = id => { const b = B(id); b.owned = true; b.unlocked = true; b.repair = 1; (s().keys ||= {})[id] = true; };
const K = id => { (s().keepers ||= {})[id] ||= { name: 'Test', seed: 1, trait: 'quick', skill: 3, served: 30 }; };
const reg = n => { for (let k = 0; k < n; k++) (s().regulars ||= {})['dev' + k] ||= { name: 'Regular ' + k, visits: 6 }; };
const staffResto = () => { B('restaurant').employees = ['cook', 'server', 'cleaner', 'cashier'].map((role, i) => ({ id: 'e' + i, role, name: ['Hạnh', 'Phúc', 'Khang', 'Trâm'][i], trait: 'steady', seed: i + 3, stats: { speed: 3, cooking: 3, service: 3, reliability: 3 } })); };
const STALLS = ['night', 'nm1', 'nm2', 'nm3', 'nm5', 'nm6'];

// What finishing each story step leaves behind in the world (no cutscenes)
const DONE = {
  materials: () => { for (const [k, n] of Object.entries(BUSINESSES.shed1.repair)) s().materials[k] = Math.max(s().materials[k] || 0, n); },
  repair: () => own('shed1'),
  ingredients: () => { for (const k of ['tea', 'kumquat', 'sugar', 'ice']) s().pantry[k] = Math.max(s().pantry[k] || 0, 40); },
  prep: () => { B('shed1').prepped.kumquat_cut = Math.max(B('shed1').prepped.kumquat_cut || 0, 10); },
  open: () => { s().story.flags.firstServed3 = true; },
  serve: () => { s().stats.served += 3; },
  sleep: () => { s().day = Math.max(s().day, 2); },
  settle: () => { const t = s(); t.stats.served += 40; t.stats.perfect += 12; t.lifetime += 900; t.reputation = Math.max(t.reputation, 15); t.day = Math.max(t.day, 5); },
  regulars: () => { reg(3); for (const r of ['tra_tac', 'tra_dao']) learnRecipe(r); B('shed1').level = Math.max(B('shed1').level, 2); s().stats.served += 45; s().day = Math.max(s().day, 8); },
  grow: () => { const t = s(); t.stats.served += 50; t.reputation = Math.max(t.reputation, 40); if (t.home.furniture.length < 3) t.home.furniture.push({ id: 'plant_big', x: 60, y: 200 }, { id: 'fan', x: 100, y: 200 }, { id: 'radio', x: 140, y: 200 }); },
  key2: () => { s().keys.shed2 = true; B('shed2').owned = true; B('shed2').unlocked = true; },
  repair2: () => own('shed2'), banhmi: () => { B('shed2').stats.served += 15; },
  hireKeeper: () => K('shed1'), keeperRun: () => { K('shed1'); B('shed2').stats.served += 20; },
  supplies: () => { (s().supply ||= {}).shed1 = { on: true }; B('shed2').level = Math.max(B('shed2').level, 2); s().day = Math.max(s().day, 15); },
  truck: () => own('truck'), truckServe: () => { B('truck').stats.served += 25; s().reputation = Math.max(s().reputation, 120); },
  restoreNM: () => { s().keys.night = true; s().nightMarket.restored = true; own('night'); }, nightServe: () => { B('night').stats.served += 20; },
  buyStall: () => own('nm2'), stallServe: () => { B('nm2').stats.served += 15; K('nm2'); },
  buyResto: () => { s().keys.restaurant = true; B('restaurant').owned = true; B('restaurant').unlocked = true; }, repairResto: () => own('restaurant'),
  hire: () => { if (!B('restaurant').employees.length) B('restaurant').employees = [{ id: 'e0', role: 'cook', name: 'Hạnh', trait: 'steady', seed: 3, stats: { speed: 3, cooking: 3, service: 3, reliability: 3 } }]; }, restoServe: () => { B('restaurant').stats.served += 30; },
  team: () => staffResto(),
  destination: () => { s().reputation = Math.max(s().reputation, 400); B('shed1').level = 3; s().statue = true; },
  harbour: () => { s().story.flags.harbourBridge = true; }, adopt: () => { if (!(s().pets || []).length) { s().pets = [{ uid: 'dev1', id: 'shiba', name: 'Mochi', love: 0 }]; s().petFollow = 'dev1'; } },
  cafe: () => own('cafe'), cafeServe: () => { B('cafe').stats.served += 25; },
  rest7: () => { s().level = Math.max(s().level, 16); learnRecipe('ca_phe_trung'); K('cafe'); B('cafe').stats.served += 80; },
  bridge: () => { s().story.flags.bridgeFixed = true; }, islet: () => { s().story.flags.metVy = true; }, vyViews: () => { for (const v of ['lookout', 'firefly', 'lighthouse']) s().story.flags['view:' + v] = true; },
  landlord: () => { s().property = { ...(s().property || {}), house: true, shed1: true, shed2: true }; for (const id of ['shed1', 'shed2', 'truck', 'cafe']) K(id); },
  festival: () => { s().level = Math.max(s().level, FESTIVAL_REQ.level); s().materials.lantern = Math.max(s().materials.lantern || 0, FESTIVAL_REQ.lanterns + 4); s().today.served = Math.max(s().today.served || 0, FESTIVAL_REQ.served); (s().achievements ||= []).includes('lantern_festival') || s().achievements.push('lantern_festival'); },
  cove: () => { s().story.flags.coveBridge = true; }, grill: () => own('grill'), grillServe: () => { B('grill').stats.served += 25; },
  allStalls: () => { for (const id of STALLS) own(id); },
  allStaff: () => { for (const id of Object.keys(s().biz)) { own(id); if (id !== 'restaurant') K(id); } staffResto(); },
  keeper: () => { s().level = Math.max(s().level, KEEPER_REQ.level); reg(KEEPER_REQ.regulars + 1); s().story.flags.keeper = true; },
};
// the story's steps in order
function order() { const out = []; let c = 'materials', g = 0; while (c && g++ < 200) { out.push(c); c = STEPS[c].next; } return out; }
// Jump forward to a step: the world becomes what it would be after every earlier step
function jumpTo(target) {
  const t = s(), steps = order(), i = steps.indexOf(target); if (i < 0) return;
  t.story.flags.freeRoam = true; t.story.flags.tourDone = true;
  for (const st of steps.slice(0, i)) { DONE[st]?.(); t.story.done ||= []; if (!t.story.done.includes(st)) t.story.done.push(st); }
  const ch = STEPS[target].ch;
  for (let n = 1; n < ch; n++) t.story.flags['card:' + n] = true;          // no pile of chapter cards
  for (const [id, R] of Object.entries(RECIPES)) if ((R.chapter || 1) <= ch) learnRecipe(id);
  setStep(target); t.story.chapter = Math.max(t.story.chapter, ch);
  refreshQuest(); markDirty(true); save();
  toast({ text: `Dev: Chapter ${ch} · ${target}`, icon: 'notebook' });
}
function finishStep() { const st = s().story.step; DONE[st]?.(); markDirty(true); checkStory(); toast({ text: `Dev: finished “${st}”`, icon: 'notebook' }); }
function save() { saveLocal(); saveCloudNow().catch(() => {}); }

// ---------------------------------------------------------------- the tab
const FEATURES = [
  ['First shop: buy, prep, serve, sleep', 'materials'], ['Settling in · regulars', 'settle'], ['Word spreads · drink upgrades', 'grow'],
  ['Bánh mì shed', 'key2'], ['Shopkeepers', 'hireKeeper'], ['Supplies & rent', 'supplies'], ['Food truck', 'truck'], ['Night Market', 'restoreNM'],
  ['More stalls', 'buyStall'], ['Restaurant & staff', 'buyResto'], ['Founder statue', 'destination'], ['Harbour Town · pets', 'harbour'],
  ['Harbour Café', 'cafe'], ['Long Bridge · Firefly Islet', 'bridge'], ['Landlord · property', 'landlord'], ['Lantern Festival', 'festival'],
  ['Coconut Cove · grill', 'cove'], ['Every stall', 'allStalls'], ['The island runs itself', 'allStaff'], ['Keeper of the Island', 'keeper'], ['Free play & postgame', 'free'],
];
const PLACES_TP = [['Dock', 900, 2440], ['Plaza', 900, 1660], ['Home', 1260, 1780], ['Market St', 900, 1210], ['Drink stand', 600, 2240], ['Bánh mì', 560, 1610], ['Truck', 1420, 2200], ['Night Market', 440, 700], ['Restaurant', 1200, 790], ['Lighthouse', 900, 360], ['Harbour', 2400, 680], ['Cove', 2300, 2260], ['Islet', 2300, 1500]];

export function renderDevPane(pane, api) {
  const t = s(), sec = title => { pane.appendChild(h('div', 'section-title', title)); const g = h('div', 'dev-grid'); pane.appendChild(g); return g; };
  const b = (g, label, fn, cls = 'ghost') => { const e = btn(label, () => { fn(); markDirty(true); api?.rebuild?.(); }, 'btn small ' + cls); g.appendChild(e); return e; };
  pane.appendChild(h('div', 'dev-banner', '🛠 DEV BUILD — testing tools. Set DEV_TOOLS = false in js/dev/flag.js before launch.'));
  pane.appendChild(h('div', 'empty-note', `Day ${t.day} · ${clock(t.time)} · Chapter ${t.story.chapter} · step “${t.story.step}” · level ${t.level} · ${Math.floor(t.money)}k · rep ${Math.floor(t.reputation)}`));

  // story
  let g = sec('Story — jump to what you want to test');
  for (const [label, step] of FEATURES) b(g, `Ch ${STEPS[step].ch}: ${label}`, () => jumpTo(step));
  g = sec('Story — this step');
  b(g, 'Finish this step', finishStep, 'gold');
  b(g, 'Finish this chapter', () => { const ch = t.story.chapter; let n = 0; while (s().story.chapter === ch && n++ < 12 && s().story.step !== 'free') { const st = s().story.step; DONE[st]?.(); const next = STEPS[st]?.next; if (!next) break; setStep(next); } refreshQuest(); save(); });
  const sel = h('select', 'dev-select'); for (const st of order()) { const o = document.createElement('option'); o.value = st; o.textContent = `Ch ${STEPS[st].ch} · ${st}`; if (st === t.story.step) o.selected = true; sel.appendChild(o); }
  g.appendChild(sel); b(g, 'Jump to the chosen step', () => jumpTo(sel.value));

  // money & stock
  g = sec('Money & stock');
  for (const n of [100, 1000, 10000]) b(g, `+${n.toLocaleString('en')}k`, () => addMoney(n, 'dev'));
  b(g, 'Money to 0', () => { t.money = 0; });
  b(g, '+30 of every material', () => { for (const k of Object.keys(MATERIALS)) t.materials[k] = (t.materials[k] || 0) + 30; });
  b(g, '+50 of every ingredient', () => { for (const k of Object.keys(INGREDIENTS)) t.pantry[k] = (t.pantry[k] || 0) + 50; });
  b(g, 'Empty the pantry', () => { t.pantry = {}; for (const id of Object.keys(t.biz)) t.biz[id].prepped = {}; });
  b(g, 'Supply runners everywhere', () => { for (const id of Object.keys(t.biz)) if (t.biz[id].owned) (t.supply ||= {})[id] = { on: true }; });

  // progress
  g = sec('Progress');
  b(g, 'Level +1', () => { t.level = (t.level || 1) + 1; }); b(g, 'Level +5', () => { t.level = (t.level || 1) + 5; });
  b(g, 'Reputation +100', () => { t.reputation += 100; }); b(g, 'Reputation 1000', () => { t.reputation = 1000; });
  b(g, 'Learn every recipe', () => { for (const id of Object.keys(RECIPES)) learnRecipe(id); });
  b(g, 'Every recipe to level 3', () => { for (const id of t.recipes) t.recipeLevels[id] = 3; });
  b(g, 'Own & repair every business', () => { for (const id of Object.keys(t.biz)) own(id); });
  b(g, 'Max every upgrade', () => { for (const [id, d] of Object.entries(BUSINESSES)) if (t.biz[id].owned) t.biz[id].level = 1 + (d.upgrades?.length || 2); });
  b(g, 'Shopkeepers everywhere + restaurant team', () => { for (const id of Object.keys(t.biz)) if (t.biz[id].owned && id !== 'restaurant') K(id); if (t.biz.restaurant.owned) staffResto(); });
  b(g, 'Buy every property', () => { for (const id of Object.keys(PLACES)) (t.property ||= {})[id] = true; });
  b(g, '+5 regulars', () => reg(Object.keys(t.regulars || {}).length + 5));

  // time
  g = sec('Time');
  for (const hh of [6, 9, 12, 17, 20, 23.8]) b(g, clock(hh * 60), () => { t.time = Math.round(hh * 60); });
  b(g, 'End the day now', () => { endDay(); toast({ text: `Dev: it's day ${s().day}`, icon: 'sleep_moon' }); });
  b(g, 'Day +7', () => { t.day += 7; });
  for (const m of [1, 3, 10]) b(g, `Clock ×${m}`, () => { G.runtime.devClock = m; }, (G.runtime.devClock || 1) === m ? 'gold' : 'ghost');
  // the shared island calendar runs on real time: move the clock forward to test seasons and festivals
  b(g, 'Clock +1 real day', () => learnServerTime(new Date(islandNow() + 864e5).toUTCString()));
  b(g, 'Clock +1 season', () => learnServerTime(new Date(islandNow() + SEASON_DAYS * 864e5).toUTCString()));
  b(g, 'Clock to Saturday', () => { let n = islandNow(); while (jstDow(n) !== 6) n += 864e5; learnServerTime(new Date(n).toUTCString()); });

  // customers & visitors
  g = sec('Customers & visitors');
  for (const m of [1, 3, 10]) b(g, `Customers ×${m}`, () => { G.runtime.devCustomers = m; }, (G.runtime.devCustomers || 1) === m ? 'gold' : 'ghost');
  b(g, '8 visitors on the next boat', () => { if (G.npcs?.ferry) G.npcs.ferry.pax = (G.npcs.ferry.pax || 0) + 8; });

  // collections
  g = sec('Collections');
  b(g, 'Every outfit, hat & extra', () => { for (const id of Object.keys(CLOTHES)) if (!t.wardrobe.owned.includes(id)) t.wardrobe.owned.push(id); });
  b(g, 'One of every furniture', () => { for (const id of Object.keys(FURNITURE)) t.home.owned.push(id); });
  b(g, 'Adopt every pet', () => { t.pets ||= []; for (const [id, P] of Object.entries(PETS)) if (!t.pets.some(p => p.id === id)) t.pets.push({ uid: 'dev' + id, id, name: P.en.split(' ')[0], love: 0 }); });
  b(g, 'Unlock every achievement', () => { for (const id of Object.keys(ACHIEVEMENTS)) unlockAchievement(id); });

  // world
  g = sec('World');
  b(g, 'Fix the Long Bridge', () => { t.story.flags.bridgeFixed = true; });
  b(g, 'Build the Harbour Bridge', () => { t.story.flags.harbourBridge = true; });
  b(g, 'Build the Cove Bridge', () => { t.story.flags.coveBridge = true; });
  b(g, 'Restore the Night Market', () => DONE.restoreNM());
  b(g, 'Unveil the statue', () => { t.statue = true; });

  // side quests
  g = sec('Side quests');
  b(g, 'Complete every side quest', () => { t.sideQuests ||= {}; for (const q of SIDE_QUESTS) t.sideQuests[q.id] = 'done'; });
  b(g, 'Reset side quests', () => { t.sideQuests = {}; });
  const open = SIDE_QUESTS.filter(q => ['active', 'found'].includes(t.sideQuests?.[q.id]));
  for (const q of open) b(g, `Finish: ${q.id}`, () => { t.sideQuests[q.id] = 'done'; });

  // player
  g = sec('Player');
  for (const m of [1, 2, 3]) b(g, `Walk ×${m}`, () => { G.runtime.devWalk = m; }, (G.runtime.devWalk || 1) === m ? 'gold' : 'ghost');
  g = sec('Teleport');
  for (const [label, x, y] of PLACES_TP) b(g, label, () => { api?.close?.(true); setScene('island', x, y, 'down'); });

  pane.appendChild(btn('Save now', () => { save(); toast({ text: 'Dev: saved', icon: 'notebook' }); }, 'btn gold'));
}
export { jumpTo, DONE };   // (tests)
