# JEN Island

A cozy Vietnamese island business-life game for portrait mobile Safari. You arrive on a quiet island by boat, meet **Mèo Mây** (the island's cloud cat), repair a broken tea shed, and slowly grow sheds, a food truck, the Night Market and a restaurant with a visible staff — until the island is a destination and there's a statue of you in the plaza.

## Run locally

    python3 -m http.server 8765        # or: npm run dev
    open http://localhost:8765/

ES modules need a server; opening `index.html` from disk won't work.

On `localhost` only:

- `?dev=<name>` skips sign-in with a local-only profile (saves to `localStorage`, never to the cloud). Add `&fresh` to start over.
- `window.__jen` exposes internals for automated tests.
- `tests/gallery.html`, `tests/cup.html`, `tests/icon.html` render the character, drink and icon art in isolation.

`npm run check` syntax-checks every module.

## Deploy (Cloudflare Workers static assets)

    npx wrangler login      # once
    npx wrangler deploy     # uploads the repo root; .assetsignore excludes tests/, supabase/, docs

The service worker (`sw.js`) is network-first, so updates land immediately; bump `CACHE` in `sw.js` when the file list changes.

## Supabase

Uses the shared `jen-simulator` project (`cgbaigeergwvbmghrakb`) but **only** the isolated `jen_island_*` tables from `supabase/migrations/001_initial.sql`:

| Table | Written when |
| --- | --- |
| `jen_island_profiles` | player + island named |
| `jen_island_saves` | full save JSON + day/coins/reputation; upserted every ~8 s when changed, and on hide/pagehide |
| `jen_island_daily_summaries` | each time you sleep |

Row-level security limits every row to its owner. The browser only ships the publishable key. Saves also go to `localStorage` every ~1.5 s; on load, the newer of local and cloud wins.

## Architecture

No build step, no framework. Canvas 2D for the world, DOM for UI.

| Folder / file | Responsibility |
| --- | --- |
| `js/core/` | `util` (math, easing, RNG, bus), `input` (floating joystick + keys, iOS scroll/zoom guards), `audio` (synthesized SFX + generative music, iOS unlock) |
| `js/gfx/character.js` | Procedural chibi rig: front/side/back views, blink, talk, walk bounce, turns, 8 emotions, ~15 actions (carry, cook, hammer, eat…) |
| `js/gfx/cat.js` | Mèo Mây: ears, tail, head tilt, mouth-sync while talking, hops |
| `js/gfx/props.js`, `buildings.js`, `furniture.js`, `food.js` | Scenery, buildings with broken → repaired → upgraded states and animated doors, interior furniture, ingredients/dishes/layered drinks |
| `js/world/` | `actor` (animation state, path following), `scene` (collision, triggers, nav graph + grid A*), `island` (terrain, chunk-cached ground, animated water, layout), `interiors`, `render` (depth sort, lighting, glows, camera, particles) |
| `js/systems/` | `state` (save shape + migration), `save`/`cloud`, `scenes` (door transitions), `cutscene` (scripted camera/walk/say), `story` (7 chapters), `business` (customers, orders, results), `restaurant` (guests + employees), `npc` (residents, ferry tourists, scooters, vendors), `time` (clock, day end), `talk`, `cinematic` (opening), `player` |
| `js/ui/` | `hud`, `dialogue` (typewriter + portraits), `service` (order counter), `prep`, `shops`, `staff`, `decorate`, `summary`, `menu` (map/settings/account), `naming`, `auth` |
| `js/data/` | Ingredients, recipes, stations, businesses, upgrades, chapters, achievements, character looks |

### Design rules

- **Employees exist only in the restaurant.** Sheds, the food truck and the night stall are run in person.
- **Everything is physical.** Customers walk to queues; restaurant staff walk to stoves, tables, the register and the break chair; nothing is a hidden timer.
- **Cutscenes never teleport important moments.** Mèo Mây walks you around, turns toward what it's talking about, and walks away afterwards (it has its own daily routine and home).
- **Time runs at 1 game minute per second** and pauses in menus, dialogue and cutscenes. Shops close at 22:00; the night stall runs 17:00–24:00; sleeping ends the day.
