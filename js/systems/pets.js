// Pets from Cô Bông's pet shop. Pick one to follow you everywhere (island and
// indoors); the others live at home, each with its own bed, where you can pet
// and feed them. Pets that are following you can't be petted (so tapping around
// the island still talks to people, not your dog).

import { G, T, markDirty, addMoney, canAfford } from './state.js';
import { Actor } from '../world/actor.js';
import { ANIMAL_DRAW } from './animals.js';
import { INK, ell, circ, poly, shadow, heart } from '../gfx/draw.js';
import { F } from '../gfx/furniture.js';
import { say, ask } from '../ui/dialogue.js';
import { sfx } from '../core/audio.js';
import { rand, choice, dist, sleep, TAU } from '../core/util.js';
import { fx } from '../world/render.js';
import { addXP } from './progress.js';

export const PETS = {
  shiba:   { kind: 'dog', col: '#e3a86a', price: 900,  en: 'Shiba puppy', vi: 'Chó Shiba con', sfx: 'woof' },
  lab:     { kind: 'dog', col: '#3d3550', price: 900,  en: 'Black lab puppy', vi: 'Chó Lab đen', sfx: 'woof' },
  mutt:    { kind: 'dog', col: '#c9955e', price: 600,  en: 'Island pup', vi: 'Chó ta', sfx: 'woof' },
  ginger:  { kind: 'cat', col: '#f2a14e', price: 700,  en: 'Ginger kitten', vi: 'Mèo vàng con', sfx: 'mew' },
  snow:    { kind: 'cat', col: '#fff4e0', price: 750,  en: 'Snowy kitten', vi: 'Mèo trắng con', sfx: 'mew' },
  tabby:   { kind: 'cat', col: '#9a8a7e', price: 650,  en: 'Tabby kitten', vi: 'Mèo mướp con', sfx: 'mew' },
  bunny:   { kind: 'bunny', col: '#fffaf2', price: 500, en: 'White bunny', vi: 'Thỏ trắng', sfx: 'pop' },
  cocoa:   { kind: 'bunny', col: '#b98a5a', price: 500, en: 'Cocoa bunny', vi: 'Thỏ nâu', sfx: 'pop' },
  duckling:{ kind: 'duck', col: '#ffe27a', price: 350, en: 'Duckling', vi: 'Vịt con', sfx: 'quack' },
};
export const PET_FOOD = { price: 20, n: 5 };
const S = () => { const s = G.state; s.pets ||= []; s.petFood ??= 0; return s; };
export const myPets = () => S().pets;
export const followerUid = () => S().petFollow || null;

// ---------------------------------------------------------------- drawing
function drawBunny(c, t, a) {
  const hopK = a.moving > 0.2 ? Math.abs(Math.sin(a.t * 10)) * 3 : 0;
  shadow(c, 0, 0.5, 7, 2, 0.18);
  c.save(); c.scale(a.face, 1); c.translate(0, -hopK);
  ell(c, -1, -5, 7, 5, a.col, INK, 0.9); circ(c, -7, -5, 2.4, '#fff', INK, 0.6);
  ell(c, 4, -9, 4.4, 4, a.col, INK, 0.9);
  for (const [dx, r] of [[2.4, -0.2], [5, 0.2]]) { c.save(); c.translate(dx, -12); c.rotate(r + Math.sin(a.t * 2) * 0.1); ell(c, 0, -4, 1.6, 4.6, a.col, INK, 0.7); ell(c, 0, -4, 0.7, 3, '#ffc0d0', null); c.restore(); }
  circ(c, 6, -9.6, 0.8, INK, null); circ(c, 8, -8.4, 0.6, '#f07c8c', null);
  c.restore();
}
function drawDuck(c, t, a) {
  const w = a.moving > 0.2 ? Math.sin(a.t * 14) * 0.2 : 0;
  shadow(c, 0, 0.5, 5, 1.6, 0.16);
  c.save(); c.scale(a.face, 1); c.rotate(w * 0.3);
  ell(c, 0, -4, 5, 3.6, a.col, INK, 0.8); circ(c, 3, -8, 2.8, a.col, INK, 0.8);
  poly(c, [5, -8, 8, -7.4, 5, -6.6], '#f2a14e', INK, 0.5); circ(c, 3.8, -8.6, 0.6, INK, null);
  ell(c, -1, -4.6, 2.6, 1.6, '#ffd35a', null);
  c.restore();
}
function drawPet(c, a, t) {
  const def = PETS[a.data.pet.id], st = a.data.st ||= { vx: 0, vy: 0, t: 0, seed: 3, face: 1, state: 'idle', idle: 'sit' };
  const moving = a.moving > 0.2;
  st.t = t; st.col = def.col; st.face = a.dir === 'left' ? -1 : 1; st.vx = moving ? 20 : 0; st.vy = 0;
  st.state = a.data.greet > 0 ? 'greet' : moving ? 'walk' : 'idle'; st.idle = a.data.happy > 0 ? 'wag' : (a.data.sleep ? 'sleep' : 'sit');
  const hop = a.hop || 0;
  c.save(); c.translate(0, -hop);
  if (def.kind === 'dog') ANIMAL_DRAW.dog(c, t, st);
  else if (def.kind === 'cat') ANIMAL_DRAW.cat(c, t, { ...st, id: a.data.happy > 0 ? 'groom' : 'sit' });
  else if (def.kind === 'bunny') drawBunny(c, t, { ...st, moving: a.moving || 0 });
  else drawDuck(c, t, { ...st, moving: a.moving || 0 });
  c.restore();
  // little name tag when close to you
  if (G.player && dist(a.x, a.y, G.player.x, G.player.y) < 40 && !a.data.follow) { c.font = '900 6px Nunito, sans-serif'; c.textAlign = 'center'; c.lineWidth = 2; c.strokeStyle = '#fff8ea'; c.strokeText(a.name, 0, -22); c.fillStyle = '#5b3f36'; c.fillText(a.name, 0, -22); }
}

// ---------------------------------------------------------------- actors
const actors = new Map();                   // uid → Actor
function actorFor(p) {
  let a = actors.get(p.uid);
  if (!a) {
    a = new Actor({ kind: 'pet', name: p.name, x: 0, y: 0, speed: 80, data: { pet: p } });
    a.petDraw = drawPet; a.talkable = false; a.look = { pet: true, scale: 0.6 };
    actors.set(p.uid, a);
  }
  a.name = p.name; a.data.pet = p;
  return a;
}
const BED_SLOTS = [[36, 262], [72, 272], [206, 272], [240, 258], [36, 214], [240, 212], [110, 276], [168, 278]];
export function rebuildPets() {
  const house = G.scenes?.house; if (!house) return;
  house.props = house.props.filter(p => !p.petBed);
  const follow = followerUid();
  myPets().forEach((p, i) => {
    const [bx, by] = BED_SLOTS[i % BED_SLOTS.length];
    p.bed = { x: bx, y: by };
    const bed = { petBed: true, kind: 'cat_bed', x: bx, y: by, flat: true, col: ['#f4a9b8', '#9fd8c8', '#f7de8c', '#c9b6e8'][i % 4] };
    bed.draw = (c, t) => F.cat_bed(c, t, bed); bed.cull = { x: bx - 30, y: by - 20, w: 60, h: 30 };
    house.prop(bed);
    const a = actorFor(p);
    for (const sc of Object.values(G.scenes)) if (sc?.actors?.includes(a) && (p.uid === follow ? sc !== G.scene : sc !== house)) sc.remove(a);
    if (p.uid === follow) { a.data.follow = true; a.talkable = false; }
    else { a.data.follow = false; a.talkable = true; if (!house.actors.includes(a)) { house.add(a); a.x = bx; a.y = by - 2; } }
  });
}
export function updatePets(dt) {
  const s = S(), pl = G.player; if (!pl || !G.scene) return;
  for (const p of s.pets) {
    const a = actorFor(p);
    a.data.greet = Math.max(0, (a.data.greet || 0) - dt); a.data.happy = Math.max(0, (a.data.happy || 0) - dt);
    if (p.uid === s.petFollow) {
      // follow the player into whatever scene they're in
      if (!G.scene.actors.includes(a)) { for (const sc of Object.values(G.scenes)) if (sc?.actors?.includes(a)) sc.remove(a); G.scene.add(a); a.x = pl.x - 16; a.y = pl.y + 6; a.stop?.(); }
      const d = dist(a.x, a.y, pl.x, pl.y);
      if (d > 120) { a.x = pl.x - 14; a.y = pl.y + 8; a.stop?.(); }
      else if (d > 30 && (!a.path || a.data.re <= 0)) { const behind = pl.dir === 'left' ? 18 : pl.dir === 'right' ? -18 : 0, dy = pl.dir === 'up' ? 16 : pl.dir === 'down' ? -10 : 8; a.walkTo([[pl.x + behind + rand(-4, 4), pl.y + dy]], { speed: Math.max(70, d * 2.2) }); a.data.re = 0.4; }
      a.data.re = (a.data.re ?? 0) - dt;
      if (d < 30 && !a.path && Math.random() < dt * 0.15) { a.face(pl.x < a.x ? 'left' : 'right'); a.data.happy = 0.8; }
    } else if (G.scene === G.scenes.house) {
      // at home: nap on the bed, wander a little, come and say hi
      a.data.wt = (a.data.wt ?? rand(2, 6)) - dt;
      if (a.data.wt <= 0 && !a.path && !a.data.busy) {
        a.data.wt = rand(4, 9);
        const r = Math.random();
        if (r < 0.35 && p.bed) { a.walkTo([[p.bed.x, p.bed.y - 2]], { speed: 40 }); a.data.sleep = true; }
        else if (r < 0.55) { a.walkTo([[pl.x + rand(-20, 20), pl.y + rand(8, 18)]], { speed: 60 }); a.data.sleep = false; a.data.greet = 1.2; }
        else { a.walkTo([[rand(30, 240), rand(150, 270)]], { speed: 40 }); a.data.sleep = false; }
      }
    }
  }
}

// ---------------------------------------------------------------- buying & caring
export async function buyPet(id, name) {
  const def = PETS[id], s = S();
  if (!canAfford(def.price)) return false;
  addMoney(-def.price, 'pet');
  const p = { uid: 'p' + Date.now().toString(36), id, name: (name || T(def.en, def.vi)).slice(0, 14), love: 0, adopted: s.day };
  s.pets.push(p);
  if (!s.petFollow) s.petFollow = p.uid;
  markDirty(true); addXP(60, 'pet');
  rebuildPets();
  return p;
}
export function setFollower(uid) { S().petFollow = uid; markDirty(true); rebuildPets(); }
export function buyFood(n = 1) { const cost = PET_FOOD.price * n; if (!canAfford(cost)) return false; addMoney(-cost, 'petfood'); S().petFood += PET_FOOD.n * n; markDirty(true); return true; }

// tapping a pet at home
export async function petMenu(a) {
  const p = a.data.pet, def = PETS[p.id], s = S(), pl = G.player;
  a.data.busy = true; a.stop?.();
  try {
    a.face(pl.x < a.x ? 'left' : 'right'); a.data.greet = 1; sfx(def.sfx);
    const opts = [T('Pet ❤', 'Vuốt ve ❤'), T(`Feed (${s.petFood} food)`, `Cho ăn (${s.petFood} phần)`), T('Take on walks', 'Dắt đi dạo'), T('Bye!', 'Tạm biệt!')];
    const pick = await ask(null, T(`${p.name} looks up at you.`, `${p.name} ngước nhìn bạn.`), opts);
    if (pick === 0) {
      pl.control = false; pl.face(a.x < pl.x ? 'left' : 'right');
      if (dist(pl.x, pl.y, a.x, a.y) > 22) await pl.walkTo([[a.x + (a.x < pl.x ? 16 : -16), a.y + 2]], { speed: 60 });
      pl.setAct('work');
      for (let i = 0; i < 4; i++) { a.data.happy = 1.5; a.doHop?.(40); fx.burst('heart', a.x, a.y - 16, 2, { up: 30, col: '#f28fa3', size: 3 }); sfx(i % 2 ? def.sfx : 'pop'); await sleep(420); }
      pl.setAct(null); pl.control = true;
      p.love = (p.love || 0) + 1; markDirty(); a.showEmote('heart', 1.6);
      if (p.love === 10) { addXP(50, 'pet'); await say(null, T(`${p.name} adores you now! 💕`, `${p.name} quý bạn lắm rồi! 💕`)); }
    } else if (pick === 1) {
      if (s.petFood <= 0) { sfx('error'); await say(null, T('You\'re out of pet food. Cô Bông sells it at the pet shop in Harbour Town.', 'Hết thức ăn rồi. Cô Bông bán ở tiệm thú cưng Phố Cảng.')); return; }
      s.petFood--; markDirty();
      const bowl = { x: a.x + 10, y: a.y + 2, flat: true, t0: performance.now() };
      bowl.draw = c => { ell(c, 0, 0, 6, 2.6, '#e8584e', INK, 0.8); ell(c, 0, -0.6, 4.6, 1.6, '#c98f5a', null); };
      G.scenes.house.prop(bowl);
      a.walkTo([[bowl.x - 8, bowl.y]], { speed: 50 }); await sleep(500); a.face('right');
      for (let i = 0; i < 5; i++) { sfx('munch'); a.data.happy = 1; await sleep(380); }
      G.scenes.house.props = G.scenes.house.props.filter(q => q !== bowl);
      p.love = (p.love || 0) + 2; a.showEmote('heart', 1.4); markDirty();
    } else if (pick === 2) {
      setFollower(p.uid); sfx('success');
      await say(null, T(`${p.name} will follow you everywhere now!`, `Giờ ${p.name} sẽ theo bạn khắp nơi!`));
    }
  } finally { a.data.busy = false; pl.control = true; }
}
export { drawPet as drawPetPreview };
