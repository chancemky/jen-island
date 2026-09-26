// Network-first service worker: fresh files when online (updates land right
// away), cached shell when offline. Supabase API calls are never cached.
const CACHE = 'jen-island-v4';
const SHELL = ["./", "./index.html", "./css/game.css", "./manifest.webmanifest", "./assets/icon-180.png", "./assets/icon-192.png", "./assets/icon-512.png", "./js/core/audio.js", "./js/core/input.js", "./js/core/util.js", "./js/data/changelog.js", "./js/data/game.js", "./js/data/looks.js", "./js/data/sprites.js", "./js/data/wardrobe.js", "./js/gfx/assemble.js", "./js/gfx/buildings.js", "./js/gfx/cat.js", "./js/gfx/character.js", "./js/gfx/draw.js", "./js/gfx/food.js", "./js/gfx/furniture.js", "./js/gfx/props.js", "./js/gfx/sprites.js", "./js/main.js", "./js/systems/animals.js", "./js/systems/business.js", "./js/systems/cinematic.js", "./js/systems/cloud.js", "./js/systems/cutscene.js", "./js/systems/fun.js", "./js/systems/npc.js", "./js/systems/player.js", "./js/systems/progress.js", "./js/systems/restaurant.js", "./js/systems/save.js", "./js/systems/scenes.js", "./js/systems/sidequests.js", "./js/systems/state.js", "./js/systems/story.js", "./js/systems/talk.js", "./js/systems/time.js", "./js/systems/version.js", "./js/ui/auth.js", "./js/ui/clothes.js", "./js/ui/decorate.js", "./js/ui/dialogue.js", "./js/ui/hud.js", "./js/ui/menu.js", "./js/ui/naming.js", "./js/ui/prep.js", "./js/ui/service.js", "./js/ui/sheets.js", "./js/ui/shops.js", "./js/ui/staff.js", "./js/ui/statictext.js", "./js/ui/summary.js", "./js/ui/whatsnew.js", "./js/world/actor.js", "./js/world/interiors.js", "./js/world/island.js", "./js/world/render.js", "./js/world/scene.js"];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => e.waitUntil(Promise.all([self.clients.claim(), caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))])));
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin && !url.hostname.endsWith('gstatic.com') && !url.hostname.endsWith('googleapis.com')) return;
  e.respondWith(fetch(req).then(res => {
    if (res.ok && (url.origin === location.origin || res.type === 'cors')) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return res;
  }).catch(() => caches.match(req).then(r => r || (req.mode === 'navigate' ? caches.match('./index.html') : Response.error()))));
});
