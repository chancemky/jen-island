// Content-integrity checks. Runs on localhost at boot (issues go to the console)
// and in the automated test suite (tests/run.mjs), so broken data never ships.
// Each check returns human-readable problems; an empty list means all good.

import { INGREDIENTS, PREPPED, PREP_VERB, STATION, RECIPES, BUSINESSES, MATERIALS, OPTIONS, ACHIEVEMENTS, CHAPTERS, FURNITURE, VY_VIEWS, recipeCost } from '../data/game.js';
import { RESIDENTS, MERCHANTS } from '../data/looks.js';
import { hasIcon } from '../gfx/food.js';
import { FURN_DRAW } from '../gfx/furniture.js';
import { STEPS, STEP_TEACHES } from '../systems/story.js';
import { SIDE_QUESTS } from '../systems/sidequests.js';
import { PLACES } from '../systems/economy.js';
import { TRACKS } from '../systems/progress.js';
import { CLOTHES } from '../data/wardrobe.js';
import { HAIRCUTS } from '../data/hair.js';
import { checkSongs } from '../core/music.js';
import { LATER } from '../systems/interact.js';
import { FISH } from '../systems/fishing.js';
import { BUILDINGS } from '../world/island.js';

export function validateContent(scenes = null) {
  const out = [];
  const bad = (area, msg) => out.push(`[${area}] ${msg}`);
  const bizKinds = new Set(Object.values(BUSINESSES).map(b => b.biz || null).filter(Boolean));
  // ---- ingredients & prep
  for (const [id, g] of Object.entries(INGREDIENTS)) {
    if (!(g.price > 0)) bad('ingredient', `${id} has no price`);
    if (!(g.pack > 0)) bad('ingredient', `${id} has no pack size`);
    if (g.prep) {
      if (!PREPPED[g.prep.to]) bad('prep', `${id} prepares into unknown ${g.prep.to}`);
      if (!PREP_VERB[g.prep.method]) bad('prep', `${id} uses unknown prep method ${g.prep.method}`);
    }
    if (!hasIcon(id)) bad('asset', `ingredient ${id} has no icon`);
  }
  for (const [id, p] of Object.entries(PREPPED)) if (!INGREDIENTS[p.from]) bad('prep', `${id} comes from unknown ${p.from}`);
  // ---- stations
  for (const [id, st] of Object.entries(STATION)) {
    if (st.uses && !INGREDIENTS[st.uses] && !PREPPED[st.uses]) bad('station', `${id} uses unknown ingredient ${st.uses}`);
    if (st.icon && !hasIcon(st.icon)) bad('asset', `station ${id} icon ${st.icon} is missing`);
  }
  // ---- recipes
  for (const [id, r] of Object.entries(RECIPES)) {
    if (!r.steps?.length) bad('recipe', `${id} has no steps`);
    for (const s of r.steps || []) if (!STATION[s]) bad('recipe', `${id} uses unknown station ${s}`);
    for (const o of r.options || []) if (!OPTIONS[o]) bad('recipe', `${id} has unknown option ${o}`);
    if (!bizKinds.has(r.biz)) bad('recipe', `${id} belongs to missing business type ${r.biz}`);
    if (!(r.price > 0)) bad('recipe', `${id} has no price`);
    if (r.icon && !hasIcon(r.icon)) bad('asset', `recipe ${id} icon ${r.icon} is missing`);
    if (r.chapter && (r.chapter < 1 || r.chapter > 20)) bad('recipe', `${id} unlocks in impossible chapter ${r.chapter}`);
  }
  // ---- businesses, repairs, upgrades
  for (const [id, b] of Object.entries(BUSINESSES)) {
    for (const k of Object.keys(b.repair || {})) if (!MATERIALS[k]) bad('business', `${id} repair needs unknown material ${k}`);
    (b.upgrades || []).forEach((u, lv) => { if (u) for (const k of Object.keys(u.mats || {})) if (!MATERIALS[k]) bad('business', `${id} upgrade ${lv} needs unknown material ${k}`); });
    if (b.chapter && (b.chapter < 1 || b.chapter > 20)) bad('business', `${id} opens in impossible chapter ${b.chapter}`);
    if (!BUILDINGS.some(x => x.id === id || x.biz === id) && !['nm1', 'nm2', 'nm3', 'nm5', 'nm6', 'night'].includes(id)) bad('business', `${id} has no building on the island`);
  }
  for (const [id, b] of Object.entries(BUSINESSES)) for (const r of b.menu || []) { if (!RECIPES[r]) bad('business', `${id} menu has unknown recipe ${r}`); else if (RECIPES[r].biz !== b.biz) bad('business', `${id} menu recipe ${r} belongs to ${RECIPES[r].biz}`); }
  for (const [id, r] of Object.entries(RECIPES)) if (r.stallOnly && !Object.values(BUSINESSES).some(b => b.menu?.includes(id))) bad('recipe', `${id} is stall-only but no stall sells it`);
  // economy sanity: every dish earns more than its ingredients cost
  for (const [id, r] of Object.entries(RECIPES)) { const c = recipeCost(id); if (c >= r.price * 0.82) bad('economy', `${id} costs ${c.toFixed(1)}k to make but sells for ${r.price}k`); }
  // …and a topping never costs more than the customer pays for it
  for (const [k, sur] of Object.entries(OPTIONS.topping.surcharge)) { const c = INGREDIENTS[k]?.cost || 0; if (sur < c) bad('economy', `${k} topping costs ${c.toFixed(2)}k but only adds ${sur}k to the price`); }
  for (const b of BUILDINGS) if (b.biz && !BUSINESSES[b.biz]) bad('building', `${b.id} points at missing business ${b.biz}`);
  if (scenes) for (const b of BUILDINGS) if (b.interior && !scenes[b.interior]) bad('building', `${b.id} opens into missing interior ${b.interior}`);
  // ---- properties
  for (const id of Object.keys(PLACES)) if (id !== 'house' && !BUSINESSES[id]) bad('property', `rentable place ${id} is not a business`);
  // ---- achievements
  for (const [id, a] of Object.entries(ACHIEVEMENTS)) if (!a.en || !a.vi || !a.desc || !a.descVi) bad('achievement', `${id} is missing text`);
  // ---- story chain
  const chapters = new Set();
  for (const [id, st] of Object.entries(STEPS)) {
    if (st.next && !STEPS[st.next]) bad('story', `${id} leads to missing step ${st.next}`);
    if (!st.ch || st.ch < 1 || st.ch > 20) bad('story', `${id} has impossible chapter ${st.ch}`);
    chapters.add(st.ch);
  }
  for (let c = 1; c <= 20; c++) { if (!chapters.has(c)) bad('story', `no story step belongs to chapter ${c}`); if (!CHAPTERS[c]) bad('story', `chapter ${c} has no title`); }
  // every step is reachable from the first one, and the chain ends in free play
  const seen = new Set(); let cur = 'tour', guard = 0;
  const order = ['tour', 'materials'];
  cur = 'materials';
  while (cur && !seen.has(cur) && guard++ < 200) { seen.add(cur); cur = STEPS[cur]?.next; if (cur) order.push(cur); }
  if (cur && seen.has(cur)) bad('story', `step loop at ${cur}`);
  if (!seen.has('free')) bad('story', 'the chain never reaches free play');
  for (const id of Object.keys(STEPS)) if (!seen.has(id) && !['tour', 'nightIntro', 'restoIntro'].includes(id) && !order.includes(id)) bad('story', `step ${id} can never be reached`);
  for (const [id, rs] of Object.entries(STEP_TEACHES)) { if (!STEPS[id]) bad('story', `STEP_TEACHES names missing step ${id}`); for (const r of rs) if (!RECIPES[r]) bad('story', `step ${id} teaches unknown recipe ${r}`); }
  let lastCh = 0; for (const id of order) { const c = STEPS[id]?.ch || 0; if (c < lastCh) bad('story', `chapter goes backwards at ${id} (${lastCh} → ${c})`); lastCh = Math.max(lastCh, c); }
  // ---- people
  const people = new Set([...Object.keys(RESIDENTS), ...Object.keys(MERCHANTS)]);
  try { checkSongs(); } catch (e) { bad('music', e.message); }
  for (const [id, p] of Object.entries({ ...RESIDENTS, ...MERCHANTS })) if (p.look?.hairStyle && !HAIRCUTS[p.look.hairStyle]) bad('people', `${id} uses unknown haircut ${p.look.hairStyle}`);
  const qids = new Set(SIDE_QUESTS.map(q => q.id));
  if (qids.size !== SIDE_QUESTS.length) bad('sidequest', 'two side quests share an id');
  for (const q of SIDE_QUESTS) {
    if (!people.has(q.giver) && q.giver !== 'meo') bad('sidequest', `${q.id} is given by unknown ${q.giver}`);
    if (q.x != null && scenes?.island && !scenes.island.terrain(q.x, q.y)) bad('sidequest', `${q.id} sits off the island (${q.x}, ${q.y})`);
    if (q.x == null && q.type !== 'deliver') bad('sidequest', `${q.id} has no place in the world`);
    for (const d of q.route || (q.deliver ? [q.deliver] : [])) if (!people.has(d) && d !== 'meo') bad('sidequest', `${q.id} is delivered to unknown ${d}`);
    if (q.after && !qids.has(q.after)) bad('sidequest', `${q.id} comes after missing quest ${q.after}`);
    if (q.type === 'meet' && (!q.time || !q.place)) bad('sidequest', `${q.id} is a meeting with no time or place`);
    if (q.route && (q.legs || []).length !== q.route.length - 1) bad('sidequest', `${q.id} needs a line for each stop on its route`);
    if (q.icon && !hasIcon(q.icon)) bad('asset', `side quest ${q.id} icon ${q.icon} is missing`);
    if (q.reward?.furniture && !FURNITURE[q.reward.furniture]) bad('sidequest', `${q.id} gives unknown furniture`);
    if (q.reward?.recipeLv && !RECIPES[q.reward.recipeLv[0]]) bad('sidequest', `${q.id} upgrades unknown recipe`);
    if (!q.ask || !q.item) bad('sidequest', `${q.id} is missing its text`);
  }
  for (const v of VY_VIEWS) if (scenes?.island && !scenes.island.terrain(v.x, v.y)) bad('story', `Vy's view ${v.id} is off the island`);
  // ---- furniture
  for (const [id, f] of Object.entries(FURNITURE)) if (!(f.price > 0)) bad('furniture', `${id} has no price`);
  for (const id of Object.keys(FURNITURE)) if (!FURN_DRAW[id]) bad('asset', `furniture ${id} has no drawing`);
  // ---- milestones: a finite track may never ask for more than exists
  for (const tr of TRACKS) {
    if (!tr.finite) continue;
    const tiers = tr.tiers(), top = tiers[tiers.length - 1];
    if (top > tr.max()) bad('milestone', `${tr.id} can ask for ${top} but only ${tr.max()} exist`);
    if (tr.tier(tiers.length) !== Infinity) bad('milestone', `${tr.id} keeps going after its last tier`);
    for (let i = 1; i < tiers.length; i++) if (tiers[i] <= tiers[i - 1]) bad('milestone', `${tr.id} tiers are not increasing`);
  }
  for (const tr of TRACKS) for (const g of Object.values(tr.gifts || {})) { if (g.furniture && !FURNITURE[g.furniture]) bad('milestone', `${tr.id} gives unknown furniture ${g.furniture}`); if (g.clothes && !CLOTHES[g.clothes]) bad('milestone', `${tr.id} gives unknown clothes ${g.clothes}`); }
  for (const [id, a] of Object.entries(ACHIEVEMENTS)) if (a.hidden && !a.hint) bad('achievement', `secret ${id} has no hint`);
  // things that change with the story point at real spots
  if (scenes) for (const key of Object.keys(LATER)) { const [sid, tid] = key.split(':'); if (!scenes[sid]?.triggers?.some(t => t.id === tid)) bad('world', `story-changing look ${key} points at nothing`); }
  for (const [id, f] of Object.entries(FISH)) if (f.ing && !INGREDIENTS[f.ing]) bad('fishing', `${id} gives unknown ingredient`);
  return out;
}
