// Bistro Island — boot, main loop and the glue between systems.

import { lockInput, releaseInput, inputLocked, lockNames, lockAge } from './core/locks.js';
import { Renderer, cam, fx, lightingFor } from './world/render.js';
import { Island, areaAt, areaIdAt, AREAS, BUILDINGS, TRUCK_SPOTS } from './world/island.js';
import { COUNTS } from './core/counts.js';
import { unlockAchievement, G, T, defaultState, bizOf, markDirty, flag, setFlag, canAfford, addMoney, learnRecipe } from './systems/state.js';
import { buildInteriors } from './world/interiors.js';
import { buildRestaurant, updateRestaurant, initRestaurantRuntime, restRT, guestNeedingOrder, playerTakeOrder, playerServed, playerCookFailed, nextTicketForPlayer, ticketCooked, playerDeliver, collectRegister } from './systems/restaurant.js';
import { Player } from './systems/player.js';
import { Actor } from './world/actor.js';
import { initInput, input, moveVector, releaseJoystick } from './core/input.js';
import { unlockAudio, audioRunning, sfx, musicTick, setAudio, suspendAudio, setMood, setSongChooser, stinger } from './core/audio.js';
import { showReward, isUiOpen, isPresenting, openSheet, h, btn } from './ui/sheets.js';
import { scenes, setScene, enterBuilding, exitBuilding, updateDoors, isTransitioning, fadeOut, fadeIn } from './systems/scenes.js';
import { cs, updateFollow, say, ask, wait, camTo, activity as csActivity } from './systems/cutscene.js';
import { Grid } from './world/scene.js';
import { enterLighthouse } from './ui/lookout.js';
import { updateDialogue, dialogue, closeDialog } from './ui/dialogue.js';
import { initHud, updateHud, showHud, setAction as hudSetAction, setBizButton, triggerAction, toast, updatePointer, showArea, resetArea, renderStars } from './ui/hud.js';
import { openIngredientShop, openMaterialShop, openFurnitureShop, openBag, openBizMenu, openRequirement, openRecipeBook, openJournal } from './ui/shops.js';
import { openService, updateService, isServiceOpen, closeService } from './ui/service.js';
import { openPrep, updatePrep, isPrepOpen } from './ui/prep.js';
import { showSummary } from './ui/summary.js';
import { startDecorate, isDecorating, rebuildHouseFurniture } from './ui/decorate.js';
import { openStaffBoard } from './ui/staff.js';
import { openMenu, guestReminder } from './ui/menu.js';
import { showAuth } from './ui/auth.js';
import { updateBusinesses, openBiz, closeBiz, rt as bizRT } from './systems/business.js';
import { initNPCs, updateNPCs, npcDrawables, drawSkyLife, npcs, feedDucks, nearPond } from './systems/npc.js';
import { updateClock, endDay, specialsInit, DAWN } from './systems/time.js';
import { repairBridge, STEPS, stallHandover, buildSeaBridge, runArrival, runTour, refreshQuest, checkStory, setStep, repairScene, upgradeScene, discoverRecipe, talkToMeo, updateMeo, morningHooks, restoreNightMarket, statueReady, buildStatue, currentStep } from './systems/story.js';
import { talkToResident, talkToMerchant, talkToStaff, talkToVisitor } from './systems/talk.js';
import { questDelivery } from './systems/sidequests.js';
import { loadGame, saveLocal, saveCloudNow, tickSave, initSaveHooks, peekLocalLanguage } from './systems/save.js';
import * as cloud from './systems/cloud.js';
import { BUSINESSES, NIGHT_MARKET_RESTORE, STATUE_COST, RECIPES, bizName, recipeName, HARBOUR_BRIDGE, COVE_BRIDGE, BRIDGE_REPAIR, FESTIVAL_REQ, KEEPER_REQ, FURNITURE } from './data/game.js';
import { applyStaticText, bootText } from './ui/statictext.js';
import { MERCHANTS, RESIDENTS, playerLook } from './data/looks.js';
import { tapAnimals, react as reactAnimal } from './systems/animals.js';
import { nearestSeat, sitDown, standUp, updateSeat, clearSeat, inSeat } from './systems/seats.js';
import { meoAntic } from './systems/fun.js';
import { initLedger } from './systems/ledger.js';
import { initAlbum } from './systems/album.js';
import { nearbyThing, outdoorAction, updateWorldEvents, lookText, realEvent, eventOn } from './systems/interact.js';
import { updateSeasonal } from './systems/growth.js';
import { fishingAction } from './systems/fishing.js';
import { plaqueAction } from './systems/garden.js';
import { GATES, gateText, gatePaid, addXP, seedLevel, tickCelebrations, TRACKS, trackState, claimMilestone } from './systems/progress.js';
import { ensureLatest, watchForUpdates } from './systems/version.js';
import { syncPurchases, purchaseReturn } from './systems/store.js';
import { initIAP } from './systems/iap.js';
import { initDeepLinks } from './systems/deeplink.js';
import { initTelemetry, track, reportError } from './systems/telemetry.js';
import { initBadges, grantServerBadge, FOUNDER_BEFORE } from './systems/badges.js';
import { morningMail } from './systems/daily.js';
import { initSocial } from './systems/social.js';
import { initWeekBoard } from './systems/weekboard.js';
import { setHaptics } from './core/haptics.js';
import { initNotify } from './systems/notify.js';
import { initReview } from './systems/review.js';
import { initBoard, BOARD, boardOpen } from './systems/board.js';
import { initRare, rareAction } from './systems/rare.js';
import { openPhotoMode } from './ui/photo.js';
import { openBoard } from './ui/board.js';
import { CLOTHES } from './data/wardrobe.js';
import { initAds } from './systems/ads.js';
import { showWhatsNew } from './ui/whatsnew.js';
import { openBoutique, openWardrobe, currentLook } from './ui/clothes.js';
import { openSalon } from './ui/salon.js';
import { spawnVendors, updateVendors, buyFromVendor } from './systems/vendors.js';
import { updateKeepers, spawnKeepers, keeperActor } from './systems/economy.js';
import { rebuildPets, updatePets, petMenu, followerUid, setFollower } from './systems/pets.js';
import { openPetShop } from './ui/petshop.js';
import { bus, dist, clamp, sleep, choice, money, rand, clock, devHost, nativeApp } from './core/util.js';
import { LIGHT } from './gfx/props.js';

const $ = id => document.getElementById(id);
const bootBar = $('bootBar'), bootMsg = $('bootMsg');
const progress = (k, m) => { bootBar.style.width = Math.round(k * 100) + '%'; if (m) bootMsg.textContent = m; };

G.runtime = { pause: 0, biz: {}, boatBoost: 0, timeScale: 1 };
// "In a cutscene" is simply "a scene is running" — scripts that still set the old flag by hand
// are only listened to before free roam (the boat ride), so it can never get stuck on.
{ let introHold = false;
  Object.defineProperty(G.runtime, 'inCutscene', { get: () => cs.active || (introHold && !G.state?.story?.flags?.freeRoam), set: v => { introHold = !!v; }, enumerable: true }); }
// pause is a count of open blocking things; it can never go below zero
{ let pause = 0; Object.defineProperty(G.runtime, 'pause', { get: () => pause, set: v => { pause = Math.max(0, v | 0); }, enumerable: true }); }
G.markDirty = markDirty;

// ---------------------------------------------------------------- boot
async function boot() {
  initTelemetry(); initAds();
  applyStaticText();
  if (await ensureLatest()) return; // an update is live: reload once onto it
  progress(0.1, bootText('fonts'));
  try { await Promise.race([document.fonts.load('900 16px Nunito'), document.fonts.load('800 16px Nunito'), sleep(2500)]); } catch {}
  progress(0.3, bootText('build'));
  const renderer = new Renderer($('game'));
  G.renderer = renderer;
  initInput($('touch'), $('joyBase'), $('joyKnob'));
  input.onAction = () => { if (!dialogue.active) triggerAction(); };
  input.onTap = (cx, cy) => onWorldTap(cx, cy);
  window.addEventListener('resize', () => renderer.resize());
  window.visualViewport?.addEventListener('resize', () => renderer.resize());
  // Sound: try to start right away (allowed when the browser already trusts the site),
  // otherwise on the very first tap/click/key. Phones only count touchend/click as a real
  // gesture (not pointerdown), so listen for all of them and keep listening until the
  // audio is actually running — and again whenever iOS suspends it.
  unlockAudio();
  const unlock = () => { if (!audioRunning()) unlockAudio(); };
  for (const ev of ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown']) window.addEventListener(ev, unlock, { capture: true, passive: true });
  await sleep(10);
  scenes.island = new Island();
  progress(0.55, bootText('decor'));
  Object.assign(scenes, buildInteriors());
  COUNTS.homes = Object.keys(scenes).filter(k => k.startsWith('home_')).length; COUNTS.areas = AREAS.length;
  scenes.restaurant = buildRestaurant();
  G.scenes = scenes;
  progress(0.7, bootText('meo'));
  // pre-warm the ground chunks near the dock
  scenes.island.cache.get(2, 6, Math.min(2, renderer.dpr * cam.baseZoom * 1.15));
  initHud(); initSaveHooks(); initLedger(); initAlbum();
  progress(0.85, bootText('net'));
  let user = null;
  const dev = devHost() && new URLSearchParams(location.search).has('dev');
  if (dev) user = { id: 'dev-' + (new URLSearchParams(location.search).get('dev') || 'local'), email: 'dev@localhost', local: true };
  else {
    const link = await cloud.takeLinkSession();            // (opened from a reset / confirmation email)
    user = await cloud.resume() || cloud.guestUser();       // an account, or a guest coming back
    if (link === 'recovery' && user && !user.guest) { $('boot').classList.add('gone'); window.__guardWait?.(true); user = await showAuth({ start: 'reset' }); window.__guardWait?.(false); }
  }
  progress(1, bootText('ready'));
  $('boot').classList.add('gone');
  if (!user) { window.__guardWait?.(true); user = await showAuth(); window.__guardWait?.(false); }
  G.user = user;
  // The saved language belongs to this island; the device fallback may belong to a different account.
  const savedLang = peekLocalLanguage(user); if (savedLang) G.state.settings.lang = savedLang;
  $('boot').classList.remove('gone'); progress(0.9, bootText('load'));
  G.state = await loadGame(user);
  seedLevel(G.state);
  if (dev && new URLSearchParams(location.search).has('fresh')) G.state = defaultState();
  $('boot').classList.add('gone');
  startGame();
  syncPurchases(); purchaseReturn(); initIAP(); initDeepLinks();
  if (!G.user.local && G.user.createdAt && G.user.createdAt < FOUNDER_BEFORE) grantServerBadge('founder');
  initBadges();
  initSocial();
  initBoard();
  initNotify(); initReview(); initRare();
  setTimeout(initWeekBoard, 4000);          // after the morning mail settles
  showMorningMail();
  festivalGift();
  setTimeout(guestReminder, 20000);
  const s = G.state;
  track('session_start', { account: !G.user.local, guest: !!G.user.guest, chapter: s.story.chapter, step: s.story.step, day: s.day, level: s.level, lang: G.lang, touch: matchMedia('(pointer: coarse)').matches, installed: matchMedia('(display-mode: standalone)').matches });
  bus.on('step', step => track('step', { step, chapter: G.state.story.chapter, day: G.state.day }));
  bus.on('chapterCard', n => track('chapter', { chapter: n, day: G.state.day }));
  bus.on('dayEnd', sum => track('day_end', { day: sum.day, chapter: sum.chapter, served: sum.served, revenue: sum.revenue, net: sum.net, level: G.state.level }));                    // (cosmetic store: whatever the server says this player bought)
}

// A real-world festival is on: everyone gets its hat, once
function festivalGift() {
  const ev = realEvent(), w = G.state.wardrobe;
  if (!ev?.hat || !CLOTHES[ev.hat] || w.owned.includes(ev.hat) || !G.state.story.flags.freeRoam) return;
  w.owned.push(ev.hat); markDirty(true); track('festival_gift', { event: ev.id });
  if (ev.gift && FURNITURE[ev.gift]) (G.state.home.owned ||= []).push(ev.gift);      // (the Grand Opening also leaves balloons for your home)
  showReward({ kicker: T(ev.en, ev.vi), title: T('A festival gift!', 'Quà lễ hội!'), sub: T(CLOTHES[ev.hat].en, CLOTHES[ev.hat].vi), icon: 'shirt', text: T(`${ev.line[0]} Wear it from the wardrobe in your room.`, `${ev.line[1]} Mặc nó từ tủ quần áo trong phòng nhé.`), button: T('Thank you!', 'Cảm ơn!') });
}
// Morning mail: today's gift (and tomorrow's, if you come back)
function showMorningMail() {
  const m = morningMail(); if (!m) return;
  track('daily_gift', { day: m.day, streak: m.streak });
  showReward({ kicker: T('Morning mail', 'Thư buổi sáng'), title: T(`Day ${m.day} of 7`, `Ngày ${m.day} / 7`), sub: '●'.repeat(m.day) + '○'.repeat(7 - m.day), icon: m.day === 7 ? 'heart' : 'letter', text: `${m.line}. ${m.next}`, button: T('Thank you!', 'Cảm ơn!') });
}
// The soundtrack follows the place and the hour (songs: data/songs.js).
const COZY = new Set(['restaurant', 'boutique', 'salon', 'petshop', 'furniture']);
function songNow() {
  const s = G.state, sc = G.scene, h = s.time / 60 % 24, night = h >= 18.5 || h < 5.5;
  if (G.runtime.cinematic || !sc) return 'title';
  if (cs.name === 'festival' || cs.name === 'keeper' || cs.name === 'statue') return 'festival';
  if (sc.id === 'meo') return 'meo';
  const fest = eventOn(); if (sc === scenes.island && fest && ['launch', 'newyear', 'nationalday', 'tet'].includes(fest.id) && G.player && areaIdAt(G.player.x, G.player.y) === 'Wind Plaza') return 'festival';
  if (sc.id === 'house' || sc.id.startsWith('home_')) return 'home';
  if (COZY.has(sc.id)) return 'cafe';
  if (sc.id === 'night') return 'nightmarket';
  const area = sc === scenes.island && G.player ? areaIdAt(G.player.x, G.player.y) : '';
  if (area === 'Firefly Islet') return 'islet';
  if (night) return area === 'Night Market' && s.nightMarket.restored ? 'nightmarket' : 'night';
  if (area === 'Harbour Town') return 'harbour';
  if (area === 'Coconut Cove' || area === 'Sunny Beach' || area === 'Ferry Dock') return 'beach';
  if (area === 'Lighthouse Point') return 'title';
  return h < 10.5 ? 'morning' : 'day';
}
setSongChooser(songNow);
// Islands that fell into debt before the nightly-bill help existed get one fresh start.
const DEBT_HELP_RELEASE = Date.parse('2026-10-07T00:00:00Z');
function debtRelief(s) {
  const f = s.story.flags;
  if (s.money >= 0 || f.debtRelief || (s.createdAt || 0) >= DEBT_HELP_RELEASE) return;
  f.debtRelief = Math.round(-s.money); s.money = 0; markDirty(true);
  setTimeout(() => toast({ text: T('The islanders cleared your debt', 'Bà con trên đảo đã trả hết nợ giúp bạn'), sub: T(`${money(f.debtRelief)} of old bills, forgiven. A fresh start!`, `${money(f.debtRelief)} tiền nợ cũ đã được xóa. Bắt đầu lại nào!`), icon: 'heart', ms: 6000 }), 4000);
}
// If the browser is still holding the sound back (no tap yet), say so — gently, until it plays.
function soundHint(wanted) {
  if (!wanted || audioRunning() || $('soundHint')) return;
  const el = document.createElement('div'); el.id = 'soundHint'; el.textContent = T('🔊 Tap anywhere for sound', '🔊 Chạm để bật âm thanh');
  $('app').appendChild(el);
  const check = setInterval(() => { if (audioRunning()) { clearInterval(check); el.classList.add('out'); setTimeout(() => el.remove(), 400); } }, 250);
}
function startGame() {
  const s = G.state;
  if (G.runtime.paused) { G.runtime.paused = false; document.getElementById('pauseCard')?.remove(); }   // a new start is never paused
  setAudio({ music: s.settings.music, sfx: s.settings.sfx, musicVol: s.settings.musicVol, sfxVol: s.settings.sfxVol });
  setHaptics(s.settings.haptics);
  soundHint(s.settings.music || s.settings.sfx);
  // one piece that fails (an odd save, a missing item) is reported and skipped, never a blank screen
  const safe = (name, fn) => { try { fn(); } catch (e) { console.error('[start]', name, e); reportError(e, { where: 'start:' + name }); } };
  safe('debt', () => debtRelief(s));
  let look; try { look = currentLook(); } catch (e) { reportError(e, { where: 'start:look' }); look = playerLook(s.player.lookOpt || {}); }   // base look + clothes from the wardrobe
  G.player = new Player(look);
  G.player.name = s.player.name;
  G.meo = new Actor({ id: 'meo', kind: 'cat', look: { cat: true }, name: 'Mèo Mây', speed: 66, data: { meo: true } });
  G.meo.talkable = true;
  scenes.island.add(G.meo); G.meo.x = 970; G.meo.y = 1650;
  safe('npcs', () => initNPCs(scenes.island));
  safe('vendors', () => spawnVendors(scenes.island));
  safe('merchants', () => spawnMerchants());
  safe('furniture', () => rebuildHouseFurniture());
  safe('truck', () => { if (G.state.truckSpot && TRUCK_SPOTS[G.state.truckSpot]) { const sp = TRUCK_SPOTS[G.state.truckSpot]; scenes.island.moveBuilding('truck', sp.x, sp.y); } });
  safe('keepers', () => spawnKeepers());
  safe('pets', () => rebuildPets());
  safe('restaurant', () => { scenes.restaurant.applyLevel(); if (bizOf('restaurant').owned) initRestaurantRuntime(); });
  safe('specials', () => specialsInit());
  if (s.today.repStart === null) s.today.repStart = s.reputation;
  safe('stars', () => renderStars());
  requestAnimationFrame(loop);
  watchForUpdates(toast);
  window.done = true; window.__started = true;   // (the boot guard stands down)
  if (s.story.step === 'intro' || !s.player.name) { runArrival(); return; }
  if (s.story.step === 'tour') { setScene('island', 900, 2440, 'up'); showHud(true); runTour(); return; }
  // resume where we left off
  const pos = s.pos && scenes[s.pos.scene] ? s.pos : { scene: 'house', x: 135, y: 170 };
  let { x, y } = pos;
  // a spot you can't stand on (behind a counter, a moved piece of furniture) moves you to the nearest free floor, not across the map
  const sc0 = scenes[pos.scene], near = sc0.nearestStand(x, y, 5);
  if (near) [x, y] = near;
  else { x = sc0.spawn?.x ?? sc0.entry?.x ?? 900; y = sc0.entry?.y - 16 || 1700; }
  try { setScene(pos.scene, x, y, 'down'); }
  catch (e) { reportError(e, { where: 'start:resume', scene: pos.scene }); setScene('house', 135, 170, 'down'); }   // (somewhere safe)
  if (!flag('freeRoam')) setFlag('freeRoam');
  if (s.story.step === 'free' && !flag('keeper')) setStep('rest7'); // new chapters 8–10 for finished saves
  showHud(true);
  refreshQuest();
  resetArea();
  toast({ text: T(`Welcome back, ${s.player.name}!`, `Chào mừng trở lại, ${s.player.name}!`), sub: T(`${s.island.name} · Day ${s.day}`, `${s.island.name} · Ngày ${s.day}`), icon: 'heart' });
  setTimeout(() => showWhatsNew(), 1400);
}

function spawnMerchants() {
  for (const id of ['supermarket', 'materials', 'furniture', 'boutique', 'salon', 'petshop']) {
    const sc = scenes[id], mp = sc.merchantPos;
    const def = MERCHANTS[mp.id];
    const a = new Actor({ kind: 'human', look: def.look, name: def.name, x: mp.x, y: mp.y, data: { mid: mp.id, merchant: true } });
    a.talkable = true;
    sc.add(a);
    sc.merchant = a;
  }
  // a shopper browsing the supermarket
  const shopper = new Actor({ kind: 'human', look: { skin: '#f1c6a4', hair: '#6e4430', hairStyle: 'pony', top: '#c9b6e8', topStyle: 'tee', bottom: '#556b8a', bottomLen: 5, shoe: '#fff', lashes: true }, x: 150, y: 210, speed: 30, data: { shopper: true } });
  scenes.supermarket.add(shopper);
  scenes.supermarket.shopper = shopper;
}
function updateInteriorLife(dt) {
  const sc = G.scene;
  if (sc.merchant) {
    const m = sc.merchant; m.data.t = (m.data.t || 0) - dt;
    if (m.data.t <= 0) { m.data.t = 2 + Math.random() * 4; const d = dist(m.x, m.y, G.player.x, G.player.y); if (d < 90) m.face('down'); else m.face(choice(['down', 'left', 'right'])); if (Math.random() < 0.2) { m.setAct('write'); setTimeout(() => m.setAct(null), 1500); } }
  }
  const sh = sc.shopper;
  if (sh && !sh.path) { sh.data.t = (sh.data.t || 0) - dt; if (sh.data.t <= 0) { sh.data.t = 3 + Math.random() * 4; const spots = [[64, 196], [236, 196], [240, 110], [60, 110], [150, 150]], p = choice(spots);
    // walk around the shelves and the counter (grid A*), and only ever stop on free floor
    const gr = (sc._grid ||= new Grid(sc, 10, 6)), gi = gr.nearestFree(gr.idx(p[0], p[1])), tx = (gi % gr.cols) * gr.cell + gr.cell / 2, ty = Math.floor(gi / gr.cols) * gr.cell + gr.cell / 2;
    sh.walkTo(gr.path(sh.x, sh.y, tx, ty)).then(() => sh.face('up')); } }
}
// exploration & little secrets (milestones and hidden achievements)
function noteArea(id) {
  const s = G.state;
  if (id && !(s.explored ||= {})[id]) { s.explored[id] = true; markDirty(); }
  if (id === 'Lighthouse Point' && s.time >= 5 * 60 && s.time < 7 * 60) unlockAchievement('sunrise');
  const n = (s.home?.furniture || []).length; if (n > (s.stats.furnMax || 0)) s.stats.furnMax = n;
}
bus.on('enter', id => {
  const sc = scenes[id];
  if (id.startsWith('home_')) { const s = G.state; (s.homesVisited ||= {})[id.slice(5)] = true; markDirty(); if (Object.keys(s.homesVisited).length >= COUNTS.homes) unlockAchievement('all_homes'); }
  if (id.startsWith('home_')) { const rid = id.slice(5); const nm = RESIDENTS[rid]?.name || ''; showArea(rid === 'chi_mai' ? T('Doctor An\'s Clinic', 'Phòng khám Bác sĩ An') : T(`${nm}'s Home`, `Nhà ${nm}`), ''); } else showArea(T({ house: 'Your Home', supermarket: 'Binh Minh Supermarket', materials: 'Ben Vung Materials', furniture: 'Anh Khoa\'s Furniture', boutique: 'Cô Ba\'s Boutique', salon: 'Chị Tiên\'s Hair Salon', petshop: 'Cô Bông\'s Pet Shop', meo: 'Mèo Mây\'s Home', shed1: 'Your Drink Stand', shed2: 'Your Bánh Mì Shed', truck: 'Your Food Truck', restaurant: 'Your Restaurant' }[id] || '', { house: 'Nhà của bạn', supermarket: 'Siêu thị Bình Minh', materials: 'VLXD Bền Vững', furniture: 'Nhà đẹp Anh Khoa', boutique: 'Tiệm thời trang cô Ba', salon: 'Salon Tóc Xinh', petshop: 'Tiệm Thú Cưng Bé Bông', meo: 'Nhà Mèo Mây', shed1: 'Quán Nước', shed2: 'Bánh Mì Góc Phố', truck: 'Xe Cuốn', restaurant: 'Nhà hàng' }[id] || ''), '');
  if (sc.merchant) { sc.merchant.face('down'); sc.merchant.setAct('wave'); sc.merchant.showEmote('happy', 1.4); setTimeout(() => sc.merchant.setAct(null), 1300); }
  if (id === 'meo' && !sc.actors.includes(G.meo)) setTimeout(() => toast({ text: T('Mèo Mây is out for a walk', 'Mèo Mây đang đi dạo'), sub: T('It\'s usually home for a nap at noon and at night.', 'Mèo Mây thường về nhà ngủ trưa và ngủ tối.'), icon: 'notebook' }), 400);
});
bus.on('leave', () => resetArea());
bus.on('lang', () => { applyStaticText(); refreshQuest(); resetArea(); });
bus.on('late', () => {
  for (const id of Object.keys(BUSINESSES)) if (bizOf(id).open && !(G.runtime.serviceOpen === id && bizRT(id).queue.length)) closeBiz(id, 'midnight');
  toast({ text: T('It\'s past midnight!', 'Đã quá nửa đêm!'), sub: T('You\'re getting sleepy — sleep in your bed to start a new day.', 'Bạn buồn ngủ rồi — về giường ngủ để bắt đầu ngày mới nhé.'), icon: 'sleep_moon', ms: 5000 });
});
bus.on('regular', c => toast({ text: T(`${c.name} is now a regular!`, `${c.name} đã thành khách quen!`), sub: '♥', icon: 'heart' }));
bus.on('ferry', n => { if (G.scene === scenes.island && flag('freeRoam') && !cs.active && G.state.story.chapter >= 2) toast({ text: T('The ferry has arrived', 'Tàu khách đã cập bến'), sub: T(`It brought ${n} visitor${n > 1 ? 's' : ''}!`, `Tàu chở ${n} du khách tới!`), icon: 'photo', ms: 2200 }); });
bus.on('achievement', () => { if (Math.random() < 0.5) setTimeout(() => toast({ text: 'Mèo Mây: “' + choice(T(['Wow! I\'m telling everyone!', 'My tail is doing the happy thing!', 'Hehe, I knew you could.', 'That deserves a nap. For me. In your honour.'], ['Oa! Mình sẽ kể cho cả đảo!', 'Đuôi mình đang vẫy vui lắm nè!', 'Hì hì, mình biết bạn làm được mà.', 'Chuyện này đáng một giấc ngủ trưa. Của mình. Để mừng bạn.'])) + '”', icon: 'heart', ms: 2400 }), 1400); });
bus.on('biz:open', id => { if (currentStep()) checkStory(); });
bus.on('biz:close', (id, why) => { if (why === 'hours') toast({ text: T(`${bizName(id)} is closed`, `${bizName(id)} đã đóng cửa`), sub: T('Closing time!', 'Hết giờ bán rồi!') }); });

// ---------------------------------------------------------------- safety net
// Defensive recovery only — each rescue logs a warning so the real bug can be found.
//  • a scripted walk that runs past its deadline arrives instantly
//  • a cutscene that shows nothing (no line, card, camera move, caption or walk) for a
//    long while hands control back
//  • a pause count, input lock or black fade with nothing on screen to justify it is cleared
let wdT = 0, wdBusy = 0, pauseIdle = 0, fadeIdle = 0;
const wdPos = new WeakMap();
const fadeEl = () => document.getElementById('fade');
const blockingOpen = () => isUiOpen() || isPresenting() || dialogue.active || isServiceOpen() || isPrepOpen() || isDecorating() || !!document.querySelector('.levelup:not(.out), .reward:not(.out), .modal, .summary, .wn-wrap:not(.out), .fishing, .album-view, .lookout-ui');
function finishAllWalks() { let n = 0; for (const sc of Object.values(scenes)) for (const a of sc?.actors || []) if (a.path) { a.finishWalk?.(); n++; } cam.override = null; return n; }
function watchdog(dt) {
  wdT += dt; if (wdT < 0.5) return;
  const step = wdT; wdT = 0;
  const now = performance.now();
  for (const sc of Object.values(scenes)) for (const a of sc?.actors || []) if (a.path && a._walkDeadline && now > a._walkDeadline) a.finishWalk();
  const blocking = blockingOpen();
  if (blocking || !cs.active) wdBusy = now;
  // a walk that is still getting somewhere is activity, not a stall
  if (cs.active && csActivity.walks > 0) {
    let moving = false;
    for (const sc of Object.values(scenes)) for (const a of sc?.actors || []) if (a.path) { const k = wdPos.get(a); if (!k || Math.hypot(k[0] - a.x, k[1] - a.y) > 2) moving = true; wdPos.set(a, [a.x, a.y]); }
    if (moving) wdBusy = now;
  }
  if (cs.active) {
    const idle = now - Math.max(wdBusy, csActivity.at, csActivity.busyUntil);
    if (idle > 4000 && csActivity.walks > 0) { console.warn(`[watchdog] "${cs.name}" was waiting on a walk; finished it`); finishAllWalks(); csActivity.at = now; }
    else if (idle > 15000) { cs.forceEnd('nothing happened for 15 s'); fadeIn(250); }
  }
  // a pause count with nothing open
  if (G.runtime.pause > 0 && !blocking && !cs.active) { pauseIdle += step; if (pauseIdle > 3) { console.warn(`[watchdog] pause count ${G.runtime.pause} with nothing open; reset`); G.runtime.pause = 0; pauseIdle = 0; } } else pauseIdle = 0;
  // input locks nobody is using any more
  const pl = G.player;
  if (pl && inputLocked() && !cs.active && !blocking && !isTransitioning() && !pl.path) {
    for (const name of lockNames()) {
      const legit = (name === 'seat' && pl.seat) || (name === 'lookout' && G.runtime.lookout) || (name === 'fitting' && isUiOpen());
      if (!legit && lockAge(name) > 8000) { console.warn(`[watchdog] input lock "${name}" held for ${Math.round(lockAge(name) / 1000)} s with nothing going on; released`); releaseInput(name); }
    }
  }
  // a pause with no pause card to resume from, or a pause outside free roam, is released
  if (G.runtime.paused && (!document.getElementById('pauseCard') || !G.state?.story?.flags?.freeRoam || cs.active || G.runtime.cinematic)) { console.warn('[watchdog] the game was paused with no way to resume; resumed'); G.runtime.paused = false; document.getElementById('pauseCard')?.remove(); }
  // a black screen with nothing behind it
  if (fadeEl()?.classList.contains('on') && !cs.active && !isTransitioning() && !G.runtime.sleeping && !G.runtime.cinematic) { fadeIdle += step; if (fadeIdle > 3) { console.warn('[watchdog] the screen stayed faded out; faded back in'); fadeIn(250); fadeIdle = 0; } } else fadeIdle = 0;
}
// ---------------------------------------------------------------- main loop
let last = performance.now(), storyT = 0, areaT = 0;
let lastFrame = 0;
function loop(now) {
  requestAnimationFrame(loop);
  // battery saver: 30 fps (24 when you're standing still), unless Smooth 60 FPS is on
  const idle = G.player && G.player.moving < 0.05 && !cs.active && !G.player.path;
  const minMs = G.state?.settings?.smooth ? 0 : idle ? 1000 / 24 : 1000 / 30;
  if (now - lastFrame < minMs - 1.5) return;
  lastFrame = now;
  let dt = (now - last) / 1000; last = now;
  if (dt > 0.1) dt = 0.1;
  if (document.hidden) return;
  G.t += dt;
  const t = G.t;
  musicTick();
  if (G.player) watchdog(dt);        // (runs even while paused or during the boat ride)
  if (G.runtime.cinematic) return; // the opening cinematic owns the canvas
  if (!G.scene) return;
  if (G.runtime.paused) { // frozen world: just keep drawing it under the pause card
    G.renderer.render(G.scene, t, { player: G.player, light: lightingFor(G.state.time, G.scene.kind !== 'island'), worldExtra: G.scene === scenes.island ? npcDrawables() : null, overlay: (c, tt) => drawSkyLife(c, tt) });
    return;
  }
  const gm = updateClock(dt);
  const pl = G.player, sc = G.scene;
  const busyUi = isUiOpen() || isServiceOpen() || isPrepOpen() || dialogue.active || isDecorating();
  if (!busyUi && !isTransitioning()) pl.drive(dt, sc, sfx); else if (!pl.path) pl.moving = Math.max(0, pl.moving - dt * 6);
  if (!busyUi && !cs.active) updateSeat(moveVector()[2]);
  if (G.state.time >= DAWN && !busyUi && !cs.active && !isTransitioning() && !G.runtime.sleeping) dawnDoze();   // stayed up all night
  updateFollow(dt);
  if (G.runtime.sleepy && !pl.act) { if (pl.emo !== 'sleepy') pl.setEmo('sleepy', 0); G.runtime.yawnT = (G.runtime.yawnT ?? 4) - dt; if (G.runtime.yawnT <= 0) { G.runtime.yawnT = 7 + Math.random() * 5; pl.showEmote('zzz', 2); } }
  else if (!G.runtime.sleepy && pl.emo === 'sleepy' && !G.runtime.sleeping) pl.setEmo('neutral', 0);
  sc.update(dt, t);
  if (sc !== scenes.island) scenes.island.update(dt, t);
  if (sc.kind === 'interior') updateInteriorLife(dt);
  updateNPCs(dt);
  updateWorldEvents(dt);
  updateSeasonal(dt);
  if (G.scene === scenes.island) updateVendors(dt);
  // shops stand still while a menu or the prep table has the clock paused (no new
  // customers, no lost patience), so checking your bag never costs you a sale
  const shopDt = G.runtime.pause > 0 ? 0 : dt;
  updateBusinesses(shopDt, gm);
  updateKeepers(shopDt);
  updatePets(dt);
  updateRestaurant(shopDt, gm);
  updateMeo(dt);
  updateDoors(dt);
  fx.update(dt);
  LIGHT.minutes = G.state.time;
  if (!busyUi && !cs.active && !isTransitioning()) updateInteraction(dt); else clearAction();
  updateBizButton();
  cam.update(dt, sc, G.renderer.w, G.renderer.h);
  const light = lightingFor(G.state.time, sc.kind !== 'island');
  // the shop counter and prep table cover the whole screen: no need to draw the world behind them
  if (!(isServiceOpen() || isPrepOpen())) G.renderer.render(sc, t, {
    player: pl, light,
    worldExtra: sc === scenes.island ? npcDrawables() : null,
    overlay: (c, tt) => { drawSkyLife(c, tt); G.runtime.decoOverlay?.(c, tt); },
  });
  updateHud(dt);
  tickCelebrations(() => !cs.active && !isUiOpen() && !isPresenting() && !isServiceOpen() && !isPrepOpen() && !dialogue.active && !isDecorating() && !G.runtime.paused);
  updateDialogue(dt, t);
  updateService(dt, t);
  updatePrep(dt, t);
  updatePointer(G.renderer);
  // area names on the island
  areaT -= dt;
  if (areaT <= 0 && sc === scenes.island && flag('freeRoam') && !cs.active) { areaT = 0.5; const a = areaAt(pl.x, pl.y); showArea(a.name, a.en); noteArea(areaIdAt(pl.x, pl.y)); }
  storyT -= dt;
  if (storyT <= 0) { storyT = 1; checkStory(); refreshQuest(); }
  tickSave();
}

// ---------------------------------------------------------------- interactions
function bizIdOfScene(sc) { return { shed1: 'shed1', shed2: 'shed2', truck: 'truck', restaurant: 'restaurant' }[sc.id] || null; }
// The action button must hold still under your thumb: a villager strolling past, the edge of
// a trigger or one frame with nothing found used to blink it between Talk / Enter / Leave and
// nothing. So: the trigger or person you're already offered is kept while you stay a little
// past where it started, and "nothing here" only clears the button after a short grace.
const ACT_GRACE = 0.3, HOLD_PAD = 16;
let actGrace = 0, heldTr = null, heldTalk = null, heldScene = null;
function setAction(label, handler, icon) { if (handler) actGrace = ACT_GRACE; hudSetAction(label, handler, icon); }
function noAction(dt) { if ((actGrace -= dt) > 0) return; hudSetAction('', null); }
function clearAction() { actGrace = 0; heldTr = heldTalk = null; hudSetAction('', null); }
const inTrigger = (t, x, y, pad) => x >= t.x - pad && x <= t.x + t.w + pad && y >= t.y - pad && y <= t.y + t.h + pad;
let doorPeek = null;
// Doors: Enter shows from the doorstep (a step below the doorway and a little wider), and walking in only
// takes you through once Enter has been up for a moment, so you never walk in silently on first touch.
const DOORSTEP = 24, DOORSTEP_SIDE = 10, WALK_IN_AFTER = 0.25;
let doorDwell = 0, dwellOn = null;
const doorstepAt = (sc, x, y) => sc === scenes.island ? sc.triggers.find(t => t.kind === 'door' && !t.off && (!t.enabled || t.enabled()) && x >= t.x - DOORSTEP_SIDE && x <= t.x + t.w + DOORSTEP_SIDE && y >= t.y && y <= t.y + t.h + DOORSTEP) || null : null;
// Shop counters: standing at one (a little either side, a step back) offers Shop / Haircut / Pets even with the
// shopkeeper right behind it; they're talked to from beside the counter instead (see nearestTalkable)
const COUNTER_SIDE = 8, COUNTER_BACK = 14;
const counterAt = (sc, x, y) => sc.kind === 'interior' ? sc.triggers.find(t => t.kind === 'act' && /^shop:/.test(t.action || '') && !t.off && (!t.enabled || t.enabled()) && x >= t.x - COUNTER_SIDE && x <= t.x + t.w + COUNTER_SIDE && y >= t.y - 4 && y <= t.y + t.h + COUNTER_BACK) || null : null;
function updateInteraction(dt) {
  const pl = G.player, sc = G.scene;
  if (heldScene !== sc) { heldScene = sc; clearAction(); }
  if (pl.seat) { setAction(T('Stand', 'Đứng dậy'), () => standUp(), 'sofa'); return; }
  if (!pl.control) { clearAction(); return; }
  const [mx, my, mm] = moveVector();
  // standing on the exit mat: Leave, before anyone to talk to or any counter; push Down to walk out
  const exitHere = sc.kind === 'interior' ? sc.triggers.find(t => t.kind === 'exit' && !t.off && inTrigger(t, pl.x, pl.y, 0)) : null;
  if (exitHere) {
    heldTr = exitHere; heldTalk = null;
    if (my > 0.45 && mm > 0.3) { exitBuilding(); return; }
    setAction(T('Leave', 'Ra ngoài'), () => exitBuilding(), 'door'); return;
  }
  // at a shop counter the counter wins, unless you've brought the shopkeeper something they're waiting for
  const counter = counterAt(sc, pl.x, pl.y);
  if (counter && !(sc.merchant?.visible && questDelivery(sc.merchant.data.mid))) { heldTr = counter; heldTalk = null; return actAction(counter); }
  const trHere = sc.triggerAt(pl.x, pl.y, 8) || doorstepAt(sc, pl.x, pl.y);
  if (trHere?.kind === 'door' && trHere === dwellOn) doorDwell += dt; else { dwellOn = trHere?.kind === 'door' ? trHere : null; doorDwell = 0; }
  const keepTr = !trHere && heldTr && sc.triggers.includes(heldTr) && !heldTr.off && (!heldTr.enabled || heldTr.enabled()) && inTrigger(heldTr, pl.x, pl.y, HOLD_PAD);
  const tr = heldTr = trHere || (keepTr ? heldTr : null);
  // doors swing a little as you approach
  if (sc === scenes.island) {
    const near = sc.triggers.find(t => t.kind === 'door' && dist(pl.x, pl.y, t.doorX, t.doorY) < 34);
    if (doorPeek && doorPeek !== near) { const b = sc.buildings[doorPeek.building]; if (b.doorTarget < 0.9) b.doorTarget = 0; }
    if (near && enterable(near.building)) { const b = sc.buildings[near.building]; if (b.doorTarget < 0.9) b.doorTarget = 0.25; }
    doorPeek = near;
  }
  // walking into a doorway enters; walking out the door leaves
  if (trHere?.kind === 'door' && enterable(trHere.building) && my < -0.45 && mm > 0.3 && doorDwell >= WALK_IN_AFTER && inTrigger(trHere, pl.x, pl.y, 8)) { enterBuilding(trHere); return; }
  if (trHere?.kind === 'exit' && my > 0.45 && mm > 0.3) { exitBuilding(); return; }
  // pick the best context action
  // 1) restaurant guest who wants to order
  if (sc.id === 'restaurant') {
    const g = guestNeedingOrder(pl.x, pl.y);
    const hasServer = [...restRT().staff.values()].some(a => a.data.emp.role === 'server');
    if (g && !hasServer) { setAction(T('Take order', 'Nhận order'), () => takeRestaurantOrder(g), RECIPES[g.recipe].icon); return; }
  }
  // 2) nearby talkable actors — over a trigger only when they're genuinely closer
  //    (or standing still by a door); a pet never takes over the bed, a door or a counter
  const talk = nearestTalkable(sc, pl), td = talk ? dist(talk.x, talk.y, pl.x, pl.y) : 1e9;
  const talkWins = talk && (!tr || (talk.kind !== 'pet' && (tr !== trHere || td < 30 || (tr.kind === 'door' && td < 42 && !talk.path))));   // (a trigger you've stepped off only holds against nobody)
  heldTalk = talkWins ? talk : null;
  if (talkWins) {
    const verb = T('Talk', 'Nói chuyện'), label = talk.name ? `${verb} · ${talk.name}` : verb;
    setAction(label, () => talkTo(talk), 'talk'); return;
  }
  if (tr) {
    if (tr.kind === 'door') return doorAction(tr);
    if (tr.kind === 'exit') { setAction(T('Leave', 'Ra ngoài'), () => exitBuilding(), 'door'); return; }
    if (tr.kind === 'front') return frontAction(tr);
    if (tr.kind === 'act') return actAction(tr);
  }
  // things in the room that do something (TV, radio, piano, lamps, fish, books…)
  const thing = nearbyThing(sc, pl);
  if (thing) { setAction(thing.label, thing.run, thing.icon); return; }
  // benches, chairs, stools, sofas, cushions
  const seat = nearestSeat(sc, pl.x, pl.y, 18);
  if (seat) { setAction(seat.lie ? T('Lie down', 'Nằm võng') : T('Sit', 'Ngồi'), () => sitDown(seat), seat.lie ? 'zzz' : 'sofa'); return; }
  // the lotus pond: feed the ducks
  if (sc === scenes.island && nearPond(pl.x, pl.y)) { setAction(T('Feed ducks', 'Cho vịt ăn'), () => feedDucks(), 'bread_split'); return; }
  // the Long Bridge repair spot
  if (sc === scenes.island && G.state.story.step === 'bridge' && dist(pl.x, pl.y, 1690, 1530) < 60) {
    G.runtime.materialNeed = () => ({ label: T('the Long Bridge', 'Cây Cầu Dài'), mats: BRIDGE_REPAIR.mats });
    setAction(T('Repair', 'Sửa cầu'), () => openRequirement({ title: T('Repair the Long Bridge', 'Sửa Cây Cầu Dài'), cost: BRIDGE_REPAIR.cost, mats: BRIDGE_REPAIR.mats, action: () => repairBridge(), actionLabel: T('Fix it!', 'Sửa thôi!'), note: T('Chú Bảy sells wood, metal and paint.', 'Chú Bảy có bán gỗ, tôn và sơn.') }), 'hammer'); return;
  }
  // the Harbour and Cove bridge building spots (east coast)
  for (const [step, x, y, R, which, en, vi] of [['harbour', 1612, 700, HARBOUR_BRIDGE, 'harbour', 'the Harbour Bridge', 'Cầu Bến Cảng'], ['cove', 1630, 2080, COVE_BRIDGE, 'cove', 'the Cove Bridge', 'Cầu Vịnh Dừa']]) {
    if (sc === scenes.island && G.state.story.step === step && dist(pl.x, pl.y, x, y) < 70) {
      G.runtime.materialNeed = () => ({ label: T(en, vi), mats: R.mats });
      setAction(T('Build', 'Xây cầu'), () => openRequirement({ title: T(`Build ${en}`, `Xây ${vi}`), cost: R.cost, mats: R.mats, action: () => buildSeaBridge(which), actionLabel: T('Build it!', 'Xây thôi!'), note: T('Chú Bảy sells wood, metal, paint and roof tiles on Market Street.', 'Chú Bảy bán gỗ, tôn, sơn và ngói ở Phố Chợ.') }), 'hammer');
      return;
    }
  }
  // the Island Board on Wind Plaza: neighbours' daily requests
  if (sc === scenes.island && boardOpen() && Math.abs(pl.x - BOARD.x) < 30 && pl.y > BOARD.y - 4 && pl.y < BOARD.y + 34) { setAction(T('Island Board', 'Bảng tin đảo'), () => openBoard(), 'notebook'); return; }
  // statue pedestal
  if (sc === scenes.island && dist(pl.x, pl.y, 900, 1600) < 50 && G.state.story.step === 'destination') {
    setAction(T('Statue', 'Tượng đài'), () => statueSheet(), 'star'); return;
  }
  // fishing off the end of the pier (once Chú Hải has shown you how)
  const fish = fishingAction(pl); if (fish) { setAction(fish.label, fish.run, fish.icon); return; }
  // a rare visitor (the golden cat)
  const rv = rareAction(pl); if (rv) { setAction(rv.label, rv.run, rv.icon); return; }
  // the fountain, the pier, the shore
  const od = outdoorAction(pl); if (od) { setAction(od.label, od.run, od.icon); return; }
  // lore on restored places
  const pq = plaqueAction(pl); if (pq) { setAction(pq.label, pq.run, pq.icon); return; }
  // just inside a doorway (where you land when you come in): the way out is one tap
  if (sc.kind === 'interior' && sc.door && Math.abs(pl.x - sc.door.x) < 24 && pl.y > sc.h - 40) { setAction(T('Leave', 'Ra ngoài'), () => exitBuilding(), 'door'); return; }
  // the pet walking with you (it isn't talkable): feed it or send it home
  const walker = followingPet(sc, pl); if (walker) { setAction(walker.data.pet.name, () => walkerMenu(walker), 'paw'); return; }
  noAction(dt);
}
function followingPet(sc, pl) {
  const uid = followerUid(); if (!uid) return null;
  const a = sc.actors.find(x => x.data?.pet?.uid === uid);
  return a && !a.data.busy && dist(a.x, a.y, pl.x, pl.y) < 40 ? a : null;
}
async function walkerMenu(a) {
  releaseJoystick();
  const p = a.data.pet, s = G.state, food = s.petFood || 0;
  const opts = [...(food > 0 ? [[T(`Feed (${food} food)`, `Cho ăn (${food} phần)`), 'feed']] : []), [T('Leave at home', 'Để ở nhà'), 'home'], [T('Keep walking', 'Đi tiếp'), 'stay']];
  a.data.busy = true;
  try {
    const pick = opts[await ask(null, T(`${p.name} trots along beside you.`, `${p.name} lon ton đi bên bạn.`), opts.map(o => o[0]))]?.[1];
    if (pick === 'feed') {
      s.petFood--; markDirty();
      a.stop?.(); a.face(G.player.x < a.x ? 'left' : 'right');
      for (let i = 0; i < 4; i++) { sfx('munch'); a.data.happy = 1; await sleep(320); }
      p.love = (p.love || 0) + 2; a.showEmote('heart', 1.4); markDirty();
    } else if (pick === 'home') {
      setFollower(null); sfx('pop');
      toast({ text: T(`${p.name} trotted home`, `${p.name} đã chạy về nhà`), sub: T('Pick them up from home any time.', 'Về nhà dắt bé đi lúc nào cũng được.'), icon: 'paw' });
    }
  } finally { a.data.busy = false; }
}
function nearestTalkable(sc, pl) {
  let best = null, bd = Infinity;
  const [fx0, fy0] = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] }[pl.dir];
  for (const a of sc.actors) {
    if (a === pl || !a.visible || !(a.talkable || a.data?.tourist) || a.data?.state === 'busy' || (a === G.meo && a.data.busy)) continue;
    const dx = a.x - pl.x, dy = a.y - pl.y, d = Math.hypot(dx, dy);
    const facing = (dx * fx0 + dy * fy0) / (d || 1);
    const held = a === heldTalk;                                  // the one you're already offered stays a bit longer
    const reach = a.data?.merchant ? 60 : 46;                    // shopkeepers stand behind a counter: reach them from beside it
    if (d >= (held ? reach + 10 : reach)) continue;
    const score = d - facing * 8 - (held ? 10 : 0);               // facing chooses between people; it never hides the only one nearby
    if (score < bd) { bd = score; best = a; }
  }
  return best;
}
async function talkTo(a) {
  releaseJoystick();
  if (a === G.meo) return talkToMeo();
  if (a.kind === 'pet') return petMenu(a);
  // they stay put for the whole conversation (and a moment after)
  if (a.data) { a.data.inTalk = true; if (a.path && !a.data.cart) a.stop?.(); }
  try { await cs.run('talk', async () => {
    if (a.data?.rid) await talkToResident(a);
    else if (a.data?.mid) await talkToMerchant(a);
    else if (a.data?.emp) await talkToStaff(a);
    else if (a.data?.tourist) await talkToVisitor(a);
    else if (a.data?.cart) await buyFromVendor(a);
    else if (a.data?.onTalk) await a.data.onTalk(a);
    else await say(a, T('Hello!', 'Xin chào!'));
  }, { bars: false, keepHud: true }); }
  finally { if (a.data) { const d = a.data; d.inTalk = false; if (!a.path && ['walking', 'going-home', 'boarding'].includes(d.state)) d.state = 'idle'; if (d.state === 'idle') d.until = Math.max(d.until || 0, G.state.time + 4); } }
}
function enterable(bid) {
  const b = BUILDINGS.find(x => x.id === bid);
  if (!b?.interior) return false;
  if (b.biz) { const z = bizOf(b.biz); return z.owned && z.repair >= 1 || (b.biz === 'truck' && z.owned); }
  return true;
}
function doorAction(tr) {
  const bid = tr.building, b = BUILDINGS.find(x => x.id === bid);
  if (b.biz) {
    const z = bizOf(b.biz), def = BUSINESSES[b.biz];
    if (b.biz === 'truck' && !z.owned) {
      if (G.state.story.chapter < 7) return setAction(T('Look', 'Xem'), () => say(null, T('An old truck with a FOR SALE sign. Maybe later…', 'Một chiếc xe cũ có tấm bảng “BÁN”. Để sau vậy…')), 'talk');
      return setAction(T('Look', 'Xem'), () => say(null, T(`Locked. Mèo Mây has the keys (${gateText('truck')}).`, `Đang khóa. Mèo Mây giữ chìa khóa (${gateText('truck')}).`)), 'key');
    }
    if (b.biz === 'restaurant' && !z.owned) {
      if (G.state.story.chapter < 10) return setAction(T('Look', 'Xem'), () => say(null, T('The old restaurant on the hill. The windows are boarded up and a faded sign says “FOR SALE”.', 'Nhà hàng cũ trên đồi. Cửa sổ bị đóng ván, tấm bảng đã phai màu ghi “BÁN”.')), 'talk');
      return setAction(T('Look', 'Xem'), () => say(null, T(`Boarded up. Mèo Mây has the key (${gateText('restaurant')}).`, `Cửa đóng ván. Mèo Mây giữ chìa khóa (${gateText('restaurant')}).`)), 'key');
    }
    if (z.repair < 1) {
      if (!z.owned || !z.unlocked) return setAction(T('Look', 'Xem'), () => say(null, GATES[b.biz] && G.state.story.flags.ch3intro ? T(`Locked. Mèo Mây has the key (${gateText(b.biz)}).`, `Đang khóa. Mèo Mây giữ chìa khóa (${gateText(b.biz)}).`) : T('An old shed with a leaky roof. Mèo Mây might know who it belongs to.', 'Một căn chòi cũ, mái tôn thủng. Biết đâu Mèo Mây biết nó là của ai.')), 'talk');
      G.runtime.materialNeed = () => ({ label: bizName(b.biz), mats: def.repair });
      return setAction(T('Repair', 'Sửa'), () => openRequirement({ title: T(`Repair ${bizName(b.biz)}`, `Sửa ${bizName(b.biz)}`), mats: def.repair, action: () => repairScene(b.biz), actionLabel: T('Repair it!', 'Sửa ngay!'), note: b.biz === 'shed1' ? T('Wood for the walls, metal for the roof, paint to make it pretty.', 'Gỗ cho tường, tôn cho mái, sơn cho đẹp.') : '' }), 'hammer');
    }
  }
  setAction(T('Enter', 'Vào'), () => enterBuilding(tr), 'door');
}
function frontAction(tr) {
  const bizId = tr.biz, z = bizOf(bizId);
  if (bizId === 'night') {
    if (!G.state.nightMarket.restored) {
      if (G.state.story.step === 'restoreNM' && !gatePaid('night')) return setAction(T('Look', 'Xem'), () => say(null, T(`The market gate is locked. Mèo Mây has the key (${gateText('night')}).`, `Cổng chợ đang khóa. Mèo Mây giữ chìa khóa (${gateText('night')}).`)), 'key');
      if (G.state.story.step !== 'restoreNM') return setAction(T('Look', 'Xem'), () => say(null, T('An abandoned stall with torn lanterns.', 'Quầy hàng bỏ hoang, lồng đèn rách nát.')), 'talk');
      const r = NIGHT_MARKET_RESTORE;
      G.runtime.materialNeed = () => ({ label: T('the Night Market', 'Chợ Đêm'), mats: r.mats });
      return setAction(T('Restore', 'Khôi phục'), () => openRequirement({ title: T('Restore the Night Market', 'Khôi phục Chợ Đêm'), cost: r.cost, mats: r.mats, action: () => restoreNightMarket(), actionLabel: T('Light the lanterns!', 'Thắp đèn thôi!') }), 'lantern');
    }
    return setAction(T('Your stall', 'Sạp đêm'), () => stallSheet('night'), 'banh_trang_nuong');
  }
  if (BUSINESSES[bizId]?.kind === 'stall') return kioskAction(bizId);
  if (z.repair < 1 && bizId !== 'truck') {
    const trig = scenes.island.triggers.find(t => t.kind === 'door' && t.building === tr.building);
    return doorAction(trig);
  }
  if (bizId === 'truck' && !z.owned) return doorAction(scenes.island.triggers.find(t => t.kind === 'door' && t.building === 'truck'));
  if (bizId === 'truck') return setAction(T('Drive to…', 'Lái xe tới…'), () => driveTruck(), 'goi_cuon');
  // the shop's open: its counter, prep table and OPEN are inside, so the window offers the door
  const door = scenes.island.triggers.find(t => t.kind === 'door' && t.building === tr.building);
  if (door && enterable(door.building)) return doorAction(door);
  noAction(0);
}
// the food truck goes where the customers are
async function driveTruck() {
  const s = G.state, cur = s.truckSpot || 'beach';
  const ids = Object.keys(TRUCK_SPOTS).filter(k => !TRUCK_SPOTS[k].need || s.story.flags[TRUCK_SPOTS[k].need]);
  const pick = await ask(null, T('Where to today?', 'Hôm nay đi đâu?'), [...ids.map(k => `${T(TRUCK_SPOTS[k].en, TRUCK_SPOTS[k].vi)}${k === cur ? ' ✓' : ''} — ${T(TRUCK_SPOTS[k].fx, TRUCK_SPOTS[k].fxVi)}`), T('Stay here', 'Ở lại đây')]);
  const to = ids[pick]; if (!to || to === cur) return;
  if (bizOf('truck').open) closeBiz('truck', 'moving');
  await fadeOut(350);
  sfx('beep');
  s.truckSpot = to; markDirty(true);
  const sp = TRUCK_SPOTS[to], old = scenes.island.buildings.truck, ka = keeperActor('truck');
  if (ka) { ka.x += sp.x - old.x; ka.y += sp.y - old.y; }
  scenes.island.moveBuilding('truck', sp.x, sp.y);
  G.player.x = sp.x - 40; G.player.y = sp.y + 26; G.player.face('up'); cam.snap(G.player.x, G.player.y - 18);
  await fadeIn(350);
  toast({ text: T(`The truck is at ${sp.en} now`, `Xe đã tới ${sp.vi}`), sub: T(sp.fx, sp.fxVi), icon: 'goi_cuon' });
}
// Stalls and kiosks are run from the counter outside.
const KIOSK_ICON = { night: 'banh_trang_nuong', cafe: 'coffee', grill: 'squid' };
function stallSheet(id = 'night') {
  const z = bizOf(id), def = BUSINESSES[id];
  const hrs = def.hours ? `${clock(def.hours[0])}–${clock(def.hours[1])}` : '';
  openSheet({ title: bizName(id), sub: T(`Open ${hrs}`, `Mở cửa ${hrs}`), build: (body, api) => {
    const list = h('div', 'list'); body.appendChild(list);
    const row = (label, fn, cls = 'btn big') => { const b = btn(label, () => { api.close(true); fn(); }, cls); list.appendChild(b); };
    row(z.open ? T('Close up', 'Đóng cửa') : T('Open up', 'Mở cửa'), () => toggleBiz(id), 'btn big ' + (z.open ? 'coral' : 'gold'));
    row(T('Serve', 'Bán hàng'), () => openService(id), 'btn big pink');
    row(T('Prep', 'Sơ chế'), () => openPrep(id), 'btn big ghost');
    row(T('Menu', 'Thực đơn'), () => openBizMenu(id), 'btn big ghost');
    row(T('Shopkeepers, supplies & rent', 'Người trông quán, hàng & tiền thuê'), () => openMenu({ tab: 1, onLogout: logout }), 'btn big ghost');
  } });
}
// a kiosk or market stall you don't own yet: look, or buy it once the story allows
function kioskAction(id) {
  const z = bizOf(id), def = BUSINESSES[id];
  if (z.owned) return setAction(T('Your shop', 'Quán của bạn'), () => stallSheet(id), KIOSK_ICON[def.biz] || 'coin');
  if (def.stall && !G.state.nightMarket.restored) return setAction(T('Look', 'Xem'), () => say(null, T('An abandoned stall with torn lanterns.', 'Quầy hàng bỏ hoang, lồng đèn rách nát.')), 'talk');
  if (G.state.story.chapter < def.chapter) return setAction(T('Look', 'Xem'), () => say(null, def.stall ? T(`A family runs this stall. Maybe they'd sell it one day (Chapter ${def.chapter}).`, `Một gia đình đang bán ở sạp này. Biết đâu sau này họ bán lại (Chương ${def.chapter}).`) : T(`A shuttered kiosk with a FOR SALE board. The owner will sell from Chapter ${def.chapter}.`, `Một ki-ốt đóng cửa, treo bảng CẦN BÁN. Chủ sẽ bán từ Chương ${def.chapter}.`)), 'talk');
  return setAction(T(`Buy · ${money(def.buy)}`, `Mua · ${money(def.buy)}`), () => openRequirement({ title: T(`Buy ${bizName(id)}`, `Mua ${bizName(id)}`), cost: def.buy, note: def.stall ? T(`The family is ready to retire and will hand over their stall — and their speciality: ${(def.menu || []).map(r => recipeName(r)).join(', ')}.`, `Gia đình sẵn sàng nghỉ hưu và giao lại sạp — cùng món tủ: ${(def.menu || []).map(r => recipeName(r)).join(', ')}.`) : T('Includes the counter, the grill or coffee machine, and a starter menu.', 'Gồm quầy, bếp nướng hoặc máy pha cà phê, và thực đơn khởi đầu.'), action: () => buyKiosk(id), actionLabel: T('Buy it!', 'Mua luôn!') }), 'coin');
}
async function buyKiosk(id) {
  const def = BUSINESSES[id], z = bizOf(id);
  if (z.owned || !canAfford(def.buy)) { sfx('error'); return; }
  addMoney(-def.buy, 'business'); z.owned = true; z.unlocked = true; z.repair = 1; G.state.keys[id] = true;
  for (const [rid, r] of Object.entries(RECIPES)) if (r.biz === def.biz && r.starter && !G.state.recipes.includes(rid)) learnRecipe(rid);
  for (const rid of def.menu || []) if (!G.state.recipes.includes(rid)) learnRecipe(rid);      // the family's speciality comes with the stall
  markDirty(true); stinger('newshop'); addXP(150, 'buy');
  if (def.stall) await stallHandover(id);                 // the family says goodbye and passes on their speciality
  fx.burst('confetti', G.player.x, G.player.y - 30, 30, { up: 80, speed: 70, col: ['#f08ca0', '#ffd35a', '#9fd8c8', '#fff'], g: 60, life: 1.6 });
  await showReward({ icon: KIOSK_ICON[def.biz] || 'key', kicker: T('New shop!', 'Quán mới!'), title: bizName(id), text: T('Open it from the counter. You can hire a shopkeeper for it in the Business tab.', 'Mở cửa ở quầy. Có thể thuê người trông quán trong mục Kinh doanh.') });
  bus.emit('bought', 'shop', id);
  checkStory();
}
function actAction(tr) {
  const sc = G.scene, bizId = bizIdOfScene(sc);
  const a = tr.action;
  const L = T(tr.en || tr.label || '', tr.label || '');
  const map = {
    sleep: () => sleepFlow(),
    look: () => { const t = lookText(tr); return say(null, T(t[0], t[1])); },
    homeSnack: () => homeSnack(),
    'shop:ingredients': () => openIngredientShop(),
    'shop:materials': () => { const st = G.state.story.step; if (st === 'materials') G.runtime.materialNeed = () => ({ label: bizName('shed1'), mats: BUSINESSES.shed1.repair }); openMaterialShop(); },
    'shop:furniture': () => openFurnitureShop(),
    'shop:boutique': () => openBoutique(),
    'shop:salon': () => openSalon(),
    'shop:pets': () => openPetShop(),
    wardrobe: () => openWardrobe(),
    serve: () => serveAtCounter(bizId),
    prep: () => openPrep(bizId),
    menu: () => openBizMenu(bizId, { onUpgrade: lv => upgradeScene(bizId, lv) }),
    recipeBook: () => openRecipeBook({ onDiscover: id => discoverRecipe(id) }),
    journal: () => openJournal(),
    lighthouse: () => enterLighthouse(),
    collectRegister: () => { const k = collectRegister(); if (k) { toast({ text: T(`Collected ${k}k`, `Thu được ${k}k`), sub: T('The restaurant\'s takings', 'Tiền bán hàng của nhà hàng'), icon: 'coin' }); fx.float(G.player.x, G.player.y - 50, '+' + k + 'k', '#ffe07a'); } },
    staff: () => openStaffBoard(),
    cookTicket: () => cookTicket(),
    deliverDish: () => playerDeliver(),
  };
  if (!map[a]) { setAction('', null); return; }
  setAction(L, map[a], tr.icon);
}
async function serveAtCounter(bizId) {
  const pl = G.player, sc = G.scene;
  lockInput('counter');
  try { await pl.walkTo([[sc.serveSpot.x, sc.serveSpot.y]], { speed: 90 }); } finally { releaseInput('counter'); }
  pl.face('down');
  if (!bizOf(bizId).open && !bizRT(bizId).queue.length) {
    const r = openBiz(bizId);
    if (!r.ok) { toast({ text: r.why.split('\n')[0], sub: r.why.split('\n')[1] || '', bad: true, ms: 3200 }); return; }
  }
  openService(bizId, { tutorial: G.state.story.chapter <= 2 && G.state.stats.served < 3 });
}
function takeRestaurantOrder(g) {
  const res = playerTakeOrder(g);
  if (!res) return;
  const single = cookSingle(g, q => { if (q === 'wrong') playerCookFailed(g); else playerServed(g, q); });
  openService('restaurant', { single });
}
function cookTicket() {
  const tk = nextTicketForPlayer();
  if (!tk) return;
  openService('restaurant', { single: cookSingle(tk.guest, q => ticketCooked(tk, q)) });
}
function cookSingle(g, onResult) {
  const R = RECIPES[g.recipe];
  return {
    id: 'rg', actor: g.actor, name: T('Table ', 'Bàn ') + (g.table.i + 1), key: 'rest', personality: g.personality, state: 'ordering',
    order: { recipe: g.recipe, opts: {}, price: g.price, special: bizOf('restaurant').special === g.recipe },
    get patienceRatio() { return clamp(g.patience / g.patienceMax, 0, 1); },
    gone: () => g.state === 'leaving' || g.state === 'gone',
    onResult,
  };
}
function toggleBiz(bizId) {
  const z = bizOf(bizId);
  if (z.open) { closeBiz(bizId); sfx('back'); toast({ text: T(`${bizName(bizId)} is closed`, `${bizName(bizId)} đã đóng cửa`) }); return; }
  const r = openBiz(bizId);
  if (!r.ok) { toast({ text: r.why.split('\n')[0], sub: r.why.split('\n')[1] || '', bad: true, ms: 3400 }); return; }
  toast({ text: T(`${bizName(bizId)} is open!`, `${bizName(bizId)} mở cửa!`), sub: T('Customers are on the way', 'Khách đang tới'), icon: 'sign_open' });
  fx.burst('spark', G.player.x, G.player.y - 40, 10, { up: 40, col: '#ffd35a' });
}
function updateBizButton() {
  const sc = G.scene;
  if (!sc || cs.active || isUiOpen() || isServiceOpen() || isPrepOpen() || dialogue.active || isDecorating()) { setBizButton(null, null); return; }
  const bizId = bizIdOfScene(sc);
  if (bizId) {
    const z = bizOf(bizId);
    if (z.owned && z.repair >= 1) { setBizButton(z.open ? T('Close', 'Đóng cửa') : T('OPEN', 'MỞ CỬA'), () => toggleBiz(bizId), z.open); return; }
  }
  if (sc.id === 'house' && !G.runtime.visit) { setBizButton(T('Decorate', 'Trang trí'), () => startDecorate()); return; }
  setBizButton(null, null);
}
function statueSheet() {
  const c = STATUE_COST;
  if (!statueReady()) { say('meo', T('Not yet! We need 400 reputation and one shop upgraded to level 3. Then we build the statue!', 'Chưa được đâu! Cần 400 danh tiếng và một quán nâng lên cấp 3. Rồi mình dựng tượng!')); return; }
  openRequirement({ title: T('The Founder Statue', 'Tượng Người Sáng Lập'), cost: c.cost, mats: c.mats, action: () => buildStatue(), actionLabel: T('Unveil it!', 'Khánh thành!'), who: 'meo' });
}
async function homeSnack() {
  const pl = G.player;
  await cs.run('snack', async () => {
    pl.face('up'); pl.setAct('stir'); sfx('pour'); await wait(1.2);
    pl.face('down'); pl.setAct('drink', 'cup'); pl.setEmo('happy', 2); await wait(1.8); pl.setAct(null);
    fx.burst('heart', pl.x, pl.y - 40, 3, { up: 40, col: '#f36d86' });
  }, { bars: false, keepHud: true });
}

// ---------------------------------------------------------------- sleeping / new day
async function sleepFlow() {
  const early = G.state.time < 12 * 60;
  const pick = await ask(null, early ? T('It\'s still early… Sleep until tomorrow?', 'Mới sáng mà… Ngủ đến sáng mai?') : T('Sleep until tomorrow?', 'Ngủ đến sáng mai?'), [T('Sleep', 'Ngủ thôi'), T('Not yet', 'Chưa')]);
  closeDialog();
  if (pick !== 0) return;
  await doSleep(false);
}
// Up all night: when the clock reaches 6:00 you nod off for a moment right where you are
// and wake there to a new day (so waiting in a closed shop for opening time works).
async function dawnDoze() {
  if (G.runtime.sleeping || cs.active) return;
  await doSleep(true);
}
async function doSleep(dawn) {
  if (G.runtime.sleeping) return;
  G.runtime.sleeping = true;
  closeService();
  const pl = G.player;
  const here = dawn ? { id: G.scene.id, x: pl.x, y: pl.y, dir: pl.dir } : null;
  try {
    await cs.run('sleep', async () => {
      G.runtime.inCutscene = true;
      if (dawn) {
        pl.setEmo('sleepy', 3); pl.showEmote('zzz', 2); await wait(1.2);
        await fadeOut(1000, true);
        document.getElementById('caption').innerHTML = T('The sky is getting light… you nod off for a moment.', 'Trời hửng sáng… bạn chợp mắt một lát.');
        document.getElementById('caption').classList.add('on');
        await wait(1.8); document.getElementById('caption').classList.remove('on');
      } else {
        const bed = scenes.house.bedPos;
        await pl.walkTo([[70, 130], [bed.x + 30, bed.y + 34]], { speed: 70 });
        pl.x = bed.x; pl.y = bed.y; pl.face('down'); pl.visible = false; G.runtime.sleeper = { look: pl.look, seed: 1 };
        fx.float(bed.x - 10, bed.y - 40, 'z z z', '#7e8fc9', { life: 2.4, size: 8 });
        await camTo(bed.x + 20, bed.y - 10, { zoom: 1.35, rate: 2.2 });
        sfx('page');
        await wait(0.9);
        await fadeOut(1100, true);
      }
      const sum = endDay();
      saveLocal(); saveCloudNow();
      if (cloud.hasSession()) cloud.saveDailySummary(sum.day, sum).catch(() => {});
      setMood('day');
      await showSummary(sum);
      // morning in the bedroom (or wherever you nodded off at dawn)
      pl.setAct(null); pl.setEmo('happy', 2); pl.emote = null; pl.visible = true; G.runtime.sleeper = null;
      const bed = scenes.house.bedPos;
      if (here && scenes[here.id]) setScene(here.id, here.x, here.y, here.dir);
      else setScene('house', bed.x + 34, bed.y + 40, 'down');
      cam.snap(pl.x, pl.y - 18);
      await wait(0.3);
      await fadeIn(900);
      sfx('bell');
      pl.doHop(); pl.setAct('cheer'); stinger('morning'); await wait(0.9); pl.setAct(null);
      toast({ text: T(`Day ${G.state.day} · Good morning!`, `Ngày ${G.state.day} · Chào buổi sáng!`), sub: specialLine(), icon: 'star', ms: 3600 });
    });
  } finally { G.runtime.inCutscene = false; G.runtime.sleeping = false; }
  await checkStory();
  await morningHooks();
  refreshQuest();
}
function specialLine() {
  const parts = [];
  for (const id of Object.keys(BUSINESSES)) { const z = bizOf(id); if (z.owned && z.special && (z.repair >= 1 || !BUSINESSES[id].repair)) parts.push(`${bizName(id)}: ${recipeName(z.special)}`); }
  return parts.length ? T('Today\'s specials — ', 'Món đặc biệt hôm nay — ') + parts.join(' · ') : T('A brand new day on the island.', 'Một ngày mới trên đảo.');
}

// ---------------------------------------------------------------- HUD buttons
$('bagBtn').addEventListener('click', () => { if (cs.active || isServiceOpen() || isPrepOpen() || isUiOpen() || isPresenting()) return; sfx('ui'); openBag(); });
$('camBtn').addEventListener('click', () => { if (cs.active || isServiceOpen() || isPrepOpen() || isUiOpen() || isPresenting() || G.runtime.inCutscene) return; openPhotoMode(); });
$('mapBtn').addEventListener('click', () => { if (cs.active || isServiceOpen() || isPrepOpen() || isUiOpen() || isPresenting()) return; sfx('ui'); openMenu({ onLogout: logout }); });
$('menuBtn').addEventListener('click', () => { if (cs.active || isServiceOpen() || isPrepOpen() || isUiOpen() || isPresenting()) return; sfx('ui'); openMenu({ onLogout: logout }); });
$('questPill').addEventListener('click', () => { if (cs.active) return; const st = currentStep(); if (st?.text) toast({ text: T('Objective', 'Mục tiêu'), sub: st.text(), icon: 'star', ms: 4000 }); });
$('repChip').addEventListener('click', () => { const s = G.state, need = Math.round(90 * Math.pow(s.level || 1, 1.5)); toast({ text: T(`Level ${s.level || 1} · ${Math.floor(s.xp || 0)}/${need} XP`, `Cấp ${s.level || 1} · ${Math.floor(s.xp || 0)}/${need} KN`), sub: T(`Reputation ${Math.floor(s.reputation)}. Serve customers, repair and upgrade to level up!`, `Danh tiếng ${Math.floor(s.reputation)}. Phục vụ khách, sửa và nâng cấp quán để lên cấp!`), icon: 'trophy' }); });
$('clockChip').addEventListener('click', () => toast({ text: T(`Day ${G.state.day}`, `Ngày ${G.state.day}`), sub: T('Your shops close at 11 pm. Sleep in your bed to start a new day.', 'Các quán của bạn đóng cửa lúc 23 giờ. Ngủ trên giường để sang ngày mới.'), icon: 'sleep_moon' }));

// tapping animals on the island makes them squeak, hop and show hearts
function onWorldTap(cx, cy) {
  if (G.scene !== scenes.island || cs.active || isUiOpen() || dialogue.active) return;
  const r = $('game').getBoundingClientRect();
  const [wx, wy] = G.renderer.toWorld(cx - r.left, cy - r.top);
  if (tapAnimals(wx, wy)) return;
  for (const d of npcs.ducks || []) if (dist(d.x, d.y - 6, wx, wy) < 18) { reactAnimal(d, 'duck'); return; }
  const m = G.meo;
  if (m && scenes.island.actors.includes(m) && !m.data.busy && dist(m.x, m.y - 16, wx, wy) < 22) { if (m.act === 'sleep') { m.setAct(null); m.data.napping = false; } sfx('meow'); m.doHop(90); m.showEmote('heart', 1.4); if (!m.act) meoAntic(m); }
}
bus.on('xp:add', n => addXP(n));
// grab a shopping basket when you walk into the supermarket; it fills as you buy
bus.on('enter', id => { if (id === 'supermarket' && G.player) { G.player.basket = true; G.player.basketItems = 0; } });
bus.on('leave', id => { if (id === 'supermarket' && G.player) { G.player.basket = false; } });
bus.on('scene', id => { if (id !== 'supermarket' && G.player) G.player.basket = false; });
bus.on('bought', kind => { if (kind === 'ingredients' && G.player?.basket) G.player.basketItems = (G.player.basketItems || 0) + 1; });
bus.on('scene', () => { if (inSeat()) clearSeat(); });

// ---------------------------------------------------------------- visiting neighbours
// The owner is sometimes home to greet you; at night they're asleep in bed.
const HOST_HI = [['Oh! Come in, come in! Mind the shoes.', 'Ơ! Vào đi, vào đi! Coi chừng mấy đôi dép.'], ['A visitor! Let me hide the mess… too late.', 'Có khách! Để {me} dọn… trễ rồi.'], ['Welcome! Sit anywhere. Except on the cat. There is no cat. Sit anywhere.', 'Chào mừng! Ngồi đâu cũng được. Trừ chỗ con mèo. Không có mèo. Ngồi đâu cũng được.'], ['You came to visit me? That makes my day!', '{You} tới thăm {me} hả? Vui quá trời!']];
bus.on('enter', id => {
  if (!id.startsWith('home_')) return;
  const sc = scenes[id], rid = sc.owner, a = npcs.residents.find(r => r.data.rid === rid);
  sc.bedSleeper = null;
  if (!a) return;
  const name = a.name, b = scenes.island.buildings[sc.building];
  const greet = () => setTimeout(() => { if (G.scene === sc && !cs.active) { a.face('down'); a.setAct('wave'); a.showEmote('happy', 1.4); say(a, T(...choice(HOST_HI))).then(() => a.setAct(null)); } }, 650);
  if (a.data.state === 'home') { sc.bedSleeper = { look: a.look, seed: 1 }; setTimeout(() => toast({ text: T(`Shh… ${name} is asleep.`, `Suỵt… ${name} đang ngủ.`), sub: T('Tiptoe!', 'Đi nhẹ thôi!'), icon: 'zzz' }), 500); return; }
  // already inside from earlier: they're still here
  if (a.data.state === 'indoors' && sc.actors.includes(a)) { a.data.state = 'busy'; a.data.hosting = id; greet(); return; }
  // only home if they were actually close to their house (no teleporting in from across the island)
  const nearHome = a.visible !== false && dist(a.x, a.y, b.x, b.y) < 170 && a.data.state !== 'busy' && a.data.state !== 'going-home';
  if (nearHome && Math.random() < 0.8) {
    scenes.island.remove(a); sc.add(a); a.stop(); a.sit = false; a.seatH = undefined; a.setAct(null);
    a.x = sc.host.x; a.y = sc.host.y; a.visible = true; delete a.alpha; a.fadeIn = false;
    a.data.state = 'busy'; a.data.hosting = id; a.face('down');
    greet();
  } else setTimeout(() => toast({ text: T(`${name} is out right now.`, `${name} đang đi vắng.`), sub: T('Doors are always open on this island.', 'Trên đảo này cửa lúc nào cũng mở.'), icon: 'door' }), 500);
});
bus.on('leave', id => {
  if (!id.startsWith('home_')) return;
  const sc = scenes[id];
  // the host stays home for a while after you go; they'll head out later, not right behind you
  for (const a of [...sc.actors]) if (a.data?.hosting === id) { a.data.state = 'indoors'; a.data.until = G.state.time + rand(45, 120); a.data.hosting = null; a.setAct(null); }
});

// progression hooks
bus.on('sfx', k => sfx(k));
// little musical moments for the big ones (core/music.js)
bus.on('stinger', id => stinger(id));
bus.on('recipe', () => addXP(30, 'recipe'));
bus.on('achievement', () => addXP(40, 'achievement'));
let msSeen = 0;
// tell the player the moment a milestone is ready, and which one
const msAnnounced = {};
function checkMilestonesReady() {
  if (!G.state?.player?.name || !G.state.story.flags.freeRoam || G.runtime.inCutscene || cs.active) return;
  const ready = TRACKS.filter(t => trackState(t).ready);
  for (const t of ready) {
    const key = t.id + ':' + (G.state.milestones?.[t.id] || 0);
    if (msAnnounced[key]) continue; msAnnounced[key] = true;
    if (msSeen++ > 40) continue;
    toast({ text: T(`Milestone ready: ${t.en}!`, `Cột mốc sẵn sàng: ${t.vi}!`), sub: T('Claim it in Menu → Milestones ★', 'Nhận thưởng ở Menu → Cột mốc ★'), icon: t.icon || 'trophy', ms: 3400 });
    break;                                   // one at a time; the rest follow on the next check
  }
}
setInterval(checkMilestonesReady, 4000);
setInterval(() => G.renderer?.sweepSprites?.(), 2000);

// ---------------------------------------------------------------- pause
// Pausing is only for free roam: never before the story has handed you the island
// (sign-in, naming, the boat), never during a scene, and never from keys typed into a field.
const canPause = () => !!G.state?.story?.flags?.freeRoam && !!G.player && !cs.active && !G.runtime.cinematic && !G.runtime.introBoat && !isUiOpen() && !isPresenting() && !isServiceOpen() && !isPrepOpen() && !dialogue.active && !document.querySelector('.modal, #auth:not(.hidden), .summary, .reward, .levelup');
const typing = e => { const t = e.target; return !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable); };
function setPaused(on) {
  if (on && !canPause()) return;
  if (!!G.runtime.paused === on) return;
  G.runtime.paused = on;
  document.getElementById('pauseCard')?.remove();
  if (!on) { sfx('ui'); return; }
  releaseJoystick();
  sfx('page');
  const el = document.createElement('div'); el.id = 'pauseCard'; el.className = 'pause-card';
  el.innerHTML = `<div class="pc-in"><div class="pc-cat"></div><h2>${T('Paused', 'Tạm dừng')}</h2><p>${T('Mèo Mây is taking a little nap too.', 'Mèo Mây cũng đang chợp mắt.')}</p><button class="btn big pink" type="button" data-a="go">${T('Resume', 'Tiếp tục')}</button><button class="btn ghost" type="button" data-a="menu">${T('Settings', 'Cài đặt')}</button></div>`;
  el.addEventListener('click', e => {
    const a = e.target.closest('button')?.dataset.a;
    if (a === 'go' || e.target === el) setPaused(false);             // Resume, or a tap outside the card
    else if (a === 'menu') { setPaused(false); openMenu({ onLogout: logout }); }
  });
  document.getElementById('app').appendChild(el);
}
$('pauseBtn').addEventListener('click', () => setPaused(true));
window.addEventListener('keydown', e => {
  if (typing(e)) return;                                            // letters typed into a name or password are just letters
  if ((e.key === 'p' || e.key === 'Escape') && G.runtime.paused) setPaused(false);
  else if (e.key === 'p') setPaused(true);
});
// a scene that starts (or the boat ride) always takes over from the pause card
bus.on('cutscene', on => { if (on) setPaused(false); });

async function logout() {
  saveLocal(); await saveCloudNow();
  await cloud.signOut();
  location.reload();
}

// pause audio when hidden (and time stops by itself)
document.addEventListener('visibilitychange', () => suspendAudio(document.hidden));

// Test hooks on a developer's local copy only.
if (devHost()) window.__jen = { G, scenes, cam, cs, setStep, checkStory, openBiz, bizRT, npcs, restRT, sleepFlow, doSleep, toggleBiz, discoverRecipe, triggerAction, setScene, STEPS, FESTIVAL_REQ, KEEPER_REQ, restoreNightMarket, buildStatue, NIGHT_MARKET_RESTORE, STATUE_COST };
if (window.__jen) {
  window.__jen.endDay = endDay;
  // stability tests: everything that can hold the screen or the player
  Object.assign(window.__jen, { say, ask, addXP, showReward, triggerAction, dialogue, isUiOpen, isPresenting, inputLocked, lockNames, lockInput, unlockAchievement, claimMilestone, isTransitioning,
    health: () => ({ cs: cs.active, csName: cs.name, queued: cs.queued, inCutscene: G.runtime.inCutscene, pause: G.runtime.pause, locks: lockNames(), dialog: dialogue.active, ui: isUiOpen(), presenting: isPresenting(),
      dlgState: { typing: dialogue.typing, choices: !!dialogue.choices, resolve: !!dialogue.resolve, shown: dialogue.shown, len: dialogue.len, sinceShown: Math.round(performance.now() - (dialogue.shownAt || 0)) },
      overlays: [...document.querySelectorAll('.reward, .levelup, .summary, .modal, .sheet-wrap, .wn-wrap, .fishing, .album-view, .cs-continue')].map(e => e.className),
      fade: document.getElementById('fade').classList.contains('on'), transitioning: isTransitioning(),
      topAtCentre: (() => { const e = document.elementFromPoint(innerWidth / 2, innerHeight / 2); return e ? (e.id || e.className || e.tagName) : ''; })() }) }); window.__jen.openMenu = openMenu; window.__jen.openJournal = openJournal; window.__jen.openStaffBoard = openStaffBoard;
  import('./systems/sidequests.js').then(m => { window.__jen.sq = m; }); import('./systems/story.js').then(m => { window.__jen.story = m; }); import('./systems/interact.js').then(m => { window.__jen.ix = m; }); import('./systems/garden.js').then(m => { window.__jen.garden = m; }); import('./systems/fishing.js').then(m => { window.__jen.fishing = m; }); import('./ui/decorate.js').then(m => { window.__jen.decorate = m; });
  Promise.all([import('./data/game.js'), import('./systems/economy.js'), import('./systems/business.js'), import('./systems/ledger.js'), import('./systems/progress.js')])
    .then(([g, e, b, l, pr]) => { Object.assign(window.__jen, { spawnCustomer: b.spawnCustomer, bizRecipes: b.bizRecipes }); window.__jen.econ = { ...g, ...e, ...b, ...l, GATES: pr.GATES, levelReward: pr.levelReward, milestoneReward: pr.milestoneReward }; });
}
// a local copy only: check the game's content for broken references at boot
if (devHost()) import('./dev/validate.js').then(async m => { while (!scenes.island || !scenes.shed1) await new Promise(r => setTimeout(r, 250)); const issues = m.validateContent(scenes); window.__jen.validate = () => m.validateContent(scenes); if (issues.length) console.warn(`[validate] ${issues.length} content issue(s):\n` + issues.join('\n')); else console.info('[validate] content OK'); });

// testing builds wear a ribbon, so a dev build can never be mistaken for the real thing (js/dev/flag.js)
import('./dev/flag.js').then(m => { if (m.DEV_TOOLS) { const r = document.createElement('div'); r.id = 'devRibbon'; r.textContent = 'DEV BUILD'; document.body.appendChild(r); } }).catch(() => {});
boot().catch(e => { console.error(e); $('bootMsg').textContent = bootText('err'); reportError(e, { where: 'boot' }); window.__guardFail?.(e); });

// Offline support + "Add to Home Screen" on the website (not on a local copy, so tests always
// get fresh files, and not in the store app, which carries its files inside)
if ('serviceWorker' in navigator && !devHost() && !nativeApp()) navigator.serviceWorker.register('./sw.js').catch(() => {});
