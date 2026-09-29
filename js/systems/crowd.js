// Where islanders and visitors stand. Every standing spot on the island is its own
// little patch, at least a body-width from every other, and it belongs to one person at
// a time: you claim a spot before you walk there, nobody else can take it or stand on
// it, and if a place is full you go somewhere else instead of squeezing in.
//
// Besides the old gathering places (beach, benches, market, lookouts, the plaza…) there
// are many more places to stop: rings of spots around the plaza fountain and its edge,
// and "stroll" stops beside every path on the island, so people roam instead of piling
// into the same few places.

import { TAU, dist } from '../core/util.js';
import { PLAZA, QUEUES } from '../world/island.js';

const GAP = 30;                               // no two spots closer than this (a head is about 24 across)
const BODY = 22;                              // nobody else may be standing this close to a free spot
let stands = [];
export const allStands = () => stands;

export function buildStands(island) {
  stands = [];
  const nav = island.nav;
  // places kept clear for lining up: the ferry line down the pier, and every shop's queue
  const lines = Object.values(QUEUES).flat();
  const inLine = (x, y) => (x > 858 && x < 942 && y > 2250 && y < 2615) || lines.some(q => dist(q[0], q[1], x, y) < GAP + 6);
  const add = (x, y, tags, node = null) => {
    if (!island.canStand(x, y, 6) || inLine(x, y)) return null;
    if (stands.some(s => dist(s.x, s.y, x, y) < GAP)) return null;
    const s = { x, y, tags: new Set(tags), node, owner: null }; stands.push(s); return s;
  };
  // the plaza: round the fountain, at the edge of the paving, and just outside it
  for (const [r, n, tag] of [[66, 12, 'plaza'], [92, 16, 'plaza'], [128, 20, 'plaza']]) for (let i = 0; i < n; i++) {
    const a = i / n * TAU + (r === 92 ? 0.1 : 0);
    add(PLAZA.x + Math.cos(a) * r, PLAZA.y + 6 + Math.sin(a) * r * 0.8, [tag]);
  }
  // every tagged activity spot gets a little cluster of places around it
  const CLUSTER = [[0, 0], [26, 0], [-26, 0], [13, 22], [-13, 22], [0, -22]];
  for (const n of nav.nodes) {
    if (!n.tags.has('spot')) continue;
    const tags = [...n.tags].filter(t => t !== 'spot');
    if (n.tags.has('dock')) continue;                           // (the dock has its own places, off to the side of the line)
    const pts = n.tags.has('sit') ? CLUSTER.slice(0, 3) : CLUSTER;
    for (const [dx, dy] of pts) add(n.x + dx, n.y + dy, tags, n);
  }
  // watching the boats: on the far side of the pier end, clear of the line and the gangway
  for (const [x, y] of [[834, 2594], [864, 2600], [838, 2566]]) add(x, y, ['dock']);
  // stroll stops: a step off the side of the paths all over the island
  const paths = nav.nodes.filter(n => n.tags.has('path'));
  paths.forEach((n, i) => {
    if (i % 2) return;
    const nb = [...n.links].map(id => nav.nodes[id])[0]; if (!nb) return;
    const dx = nb.x - n.x, dy = nb.y - n.y, l = Math.hypot(dx, dy) || 1;
    for (const s of [1, -1]) if (add(n.x - dy / l * 24 * s, n.y + dx / l * 24 * s, ['stroll'], n)) break;
  });
  return stands;
}

// A spot counts as taken only while its owner is really on their way there or standing on
// it (someone called away into a story scene, home or onto the ferry frees it again).
const HOLDING = new Set(['walking', 'idle']);
function holds(s) { const o = s.owner; return !!o && o.data?.stand === s && o.visible !== false && HOLDING.has(o.data.state); }
function occupiedNow(island, s, me) {
  return island.actors.some(o => o !== me && o.visible !== false && !o.path && dist(o.x, o.y, s.x, s.y) < BODY);
}
export function releaseStand(a) { const s = a.data?.stand; if (s && s.owner === a) s.owner = null; if (a.data) a.data.stand = null; }
// claim a free spot with this tag (nearest to `near` if given, otherwise any of them)
export function claimStand(island, a, tag, near = null) {
  let list = stands.filter(s => s.tags.has(tag) && (s.owner === a || !holds(s)) && !occupiedNow(island, s, a));
  if (!list.length) return null;
  let s;
  if (near) s = list.reduce((b, x) => dist(x.x, x.y, near.x, near.y) < dist(b.x, b.y, near.x, near.y) ? x : b);
  else s = list[Math.floor(Math.random() * list.length)];
  releaseStand(a);
  s.owner = a; a.data.stand = s;
  return s;
}
// claim one of several places (weighted), trying the others if the first choice is full
export function claimWeighted(island, a, opts) {
  const left = opts.filter(o => o[1] > 0);
  while (left.length) {
    let r = Math.random() * left.reduce((t, o) => t + o[1], 0), k = 0;
    for (; k < left.length - 1; k++) { r -= left[k][1]; if (r <= 0) break; }
    const s = claimStand(island, a, left[k][0]);
    if (s) return s;
    left.splice(k, 1);
  }
  return claimStand(island, a, 'stroll');
}
