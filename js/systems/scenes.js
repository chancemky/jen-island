// Scene registry and building transitions:
//   approach door → door swings open → step into doorway → fade to black →
//   swap scene → fade in with the player just inside → door closes behind.

import { G } from './state.js';
import { cam, fx } from '../world/render.js';
import { sfx } from '../core/audio.js';
import { sleep, bus } from '../core/util.js';
import { releaseJoystick } from '../core/input.js';

export const scenes = {};
const fadeEl = document.getElementById('fade');
let transitioning = false;
export const isTransitioning = () => transitioning;

export function fadeOut(ms = 350, slow = false) {
  fadeEl.classList.toggle('slow', slow);
  fadeEl.style.transitionDuration = ms + 'ms';
  fadeEl.classList.add('on');
  return sleep(ms + 20);
}
export function fadeIn(ms = 350) {
  fadeEl.style.transitionDuration = ms + 'ms';
  fadeEl.classList.remove('on');
  return sleep(ms);
}

export function setScene(id, x, y, dir = 'down') {
  const sc = scenes[id];
  if (!sc) throw new Error('Unknown scene ' + id);
  const pl = G.player;
  if (G.scene && G.scene !== sc) G.scene.remove(pl);
  G.scene = sc;
  sc.add(pl);
  pl.x = x; pl.y = y; pl.stop(); pl.face(dir); pl.turnT = 0; pl.vx = pl.vy = 0;
  cam.follow = pl; cam.override = null;
  cam.update(0, sc, 390, 700);
  cam.snap(pl.x, pl.y - 18);
  fx.clear();
  G.state.pos = { scene: id, x: Math.round(x), y: Math.round(y) };
  bus.emit('scene', id);
}

// Walk through a door into an interior.
export async function enterBuilding(trigger) {
  if (transitioning) return;
  transitioning = true;
  const pl = G.player, island = scenes.island, bld = island.buildings[trigger.building];
  try {
    pl.control = false; releaseJoystick();
    bld.doorTarget = 1; sfx('door');
    pl.face('up');
    await sleep(140);
    await pl.walkTo([[trigger.doorX, trigger.doorY - 3]], { speed: 70 });
    await fadeOut(300);
    const inner = scenes[trigger.interior];
    setScene(inner.id, inner.entry.x, inner.entry.y + 4, 'up');
    inner.doorOpen = 1;
    bld.doorTarget = 0; bld.doorOpen = 0;
    bus.emit('enter', inner.id);
    await sleep(60);
    const fi = fadeIn(320);
    await pl.walkTo([[inner.entry.x, inner.entry.y - 16]], { speed: 64 });
    await fi;
    inner.doorOpen = 0;
  } finally { pl.control = true; transitioning = false; }
}

export async function exitBuilding() {
  if (transitioning) return;
  transitioning = true;
  const pl = G.player, inner = G.scene, island = scenes.island;
  const bid = inner.building, bld = island.buildings[bid];
  const trig = island.triggers.find(t => t.kind === 'door' && t.building === bid);
  try {
    pl.control = false; releaseJoystick();
    sfx('door'); pl.face('down');
    await pl.walkTo([[inner.door.x, inner.h + 10]], { speed: 70 });
    await fadeOut(300);
    bus.emit('leave', inner.id);
    setScene('island', trig.doorX, trig.doorY - 2, 'down');
    bld.doorOpen = 1; bld.doorTarget = 0;
    await sleep(60);
    const fi = fadeIn(320);
    await pl.walkTo([[trig.doorX, trig.doorY + 16]], { speed: 64 });
    await fi;
  } finally { pl.control = true; transitioning = false; }
}

// Animate door leaves every frame.
export function updateDoors(dt) {
  const island = scenes.island;
  if (!island) return;
  for (const b of Object.values(island.buildings)) {
    if (b.doorOpen === undefined) continue;
    const tgt = b.doorTarget || 0;
    b.doorOpen += (tgt - b.doorOpen) * Math.min(1, dt * 12);
  }
}
