// Content-integrity checks. Runs on localhost at boot (issues go to the console)
// and in the automated test suite (tests/run.mjs), so broken data never ships.
// Each check returns human-readable problems; an empty list means all good.

import { INGREDIENTS, PREPPED, PREP_VERB, STATION, RECIPES, BUSINESSES, MATERIALS, OPTIONS, ACHIEVEMENTS, CHAPTERS, FURNITURE, VY_VIEWS } from '../data/game.js';
import { RESIDENTS, MERCHANTS } from '../data/looks.js';
import { hasIcon } from '../gfx/food.js';
import { STEPS } from '../systems/story.js';
import { SIDE_QUESTS } from '../systems/sidequests.js';
import { PLACES } from '../systems/economy.js';
import { TRACKS } from '../systems/progress.js';
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
  let lastCh = 0; for (const id of order) { const c = STEPS[id]?.ch || 0; if (c < lastCh) bad('story', `chapter goes backwards at ${id} (${lastCh} → ${c})`); lastCh = Math.max(lastCh, c); }
  // ---- people
  const people = new Set([...Object.keys(RESIDENTS), ...Object.keys(MERCHANTS)]);
  for (const q of SIDE_QUESTS) {
    if (!people.has(q.giver)) bad('sidequest', `${q.id} is given by unknown ${q.giver}`);
    if (scenes?.island && !scenes.island.terrain(q.x, q.y)) bad('sidequest', `${q.id} item sits off the island (${q.x}, ${q.y})`);
    if (q.deliver && !people.has(q.deliver) && q.deliver !== 'meo') bad('sidequest', `${q.id} is delivered to unknown ${q.deliver}`);
  }
  for (const v of VY_VIEWS) if (scenes?.island && !scenes.island.terrain(v.x, v.y)) bad('story', `Vy's view ${v.id} is off the island`);
  // ---- furniture
  for (const [id, f] of Object.entries(FURNITURE)) if (!(f.price > 0)) bad('furniture', `${id} has no price`);
  // ---- milestones: a finite track may never ask for more than exists
  for (const tr of TRACKS) {
    if (!tr.max) continue;
    const maxNeed = tr.tier(99);
    if (tr.finite && maxNeed !== Infinity && maxNeed > tr.max()) bad('milestone', `${tr.id} can ask for ${maxNeed} but only ${tr.max()} exist`);
  }
  return out;
}
