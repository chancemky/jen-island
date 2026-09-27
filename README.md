# JEN Island

A cozy Vietnamese island business-life game for portrait mobile Safari. You arrive on a quiet island by boat, meet **Mèo Mây** (the island's cloud cat), repair a broken tea shed, and over **20 chapters** grow sheds, a food truck, the Night Market, a restaurant with a visible staff, Harbour Town's café, Firefly Islet and Coconut Cove's grill — until the island runs itself and you become its Keeper. Free play continues after the story.

## Run locally

    python3 -m http.server 8765        # or: npm run dev
    open http://localhost:8765/

ES modules need a server; opening `index.html` from disk won't work.

On `localhost` only:

- `?dev=<name>` skips sign-in with a local-only profile (saves to `localStorage`, never to the cloud). Add `&fresh` to start over.
- `window.__jen` exposes internals for automated tests.
- `tests/gallery.html`, `tests/cup.html`, `tests/icon.html` render the character, drink and icon art in isolation.

`npm run check` syntax-checks every module.

## Tests

    npm i            # once (Playwright)
    npm test         # everything
    npm run test:story | test:economy | test:quests | test:world | test:render

`tests/run.mjs` starts its own server and plays the game in a headless browser:

| Suite | What it proves |
| --- | --- |
| content | the content validator (`js/dev/validate.js`): ingredients, stations, recipes, menus, margins, story chain, side quests, milestones, icons, furniture drawings, offline cache list |
| save | a damaged save is recovered from a backup and the bad copy kept aside |
| story | a fresh game plays Chapters 1→20 with every transition, card, XP reward and achievement |
| economy | first repair ≈ 231k, margins per tier, property payback, one price per business, a keeper's day of trade and its books |
| screens | Business / Milestones / Staff screens draw |
| quests | every side quest plays start to finish (find, meet, puzzle, deliver, routes) |
| world | TV, radio, piano, lamp, fish, books, fountain, timetable, fishing and the garden all work |
| render | every look × pose × direction draws pixels |

`tests/cast.html` is a contact sheet of the whole cast for art checks against `docs/reference/`.

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
| `jen_island_save_snapshots` | a copy of the save every night (the last 7 are kept) for recovery |

Row-level security limits every row to its owner. The browser only ships the publishable key. Saves also go to `localStorage` every ~1.5 s, with a small ring of local backups (every night and every 10 minutes). On load the newer of local and cloud wins — unless it is behind in the story without an intentional reset; the other copy is always kept as a backup. Photo-album pictures stay on the device.

## Architecture

No build step, no framework. Canvas 2D for the world, DOM for UI.

| Folder / file | Responsibility |
| --- | --- |
| `js/core/` | `util` (math, easing, RNG, bus), `input` (floating joystick + keys, iOS scroll/zoom guards), `audio` (synthesized SFX + generative music, iOS unlock) |
| `js/gfx/character.js` | Procedural chibi rig: front/side/back views, blink, talk, walk bounce, turns, 8 emotions, ~15 actions (carry, cook, hammer, eat…) |
| `js/gfx/cat.js` | Mèo Mây: ears, tail, head tilt, mouth-sync while talking, hops |
| `js/gfx/props.js`, `buildings.js`, `furniture.js`, `food.js` | Scenery, buildings with broken → repaired → upgraded states and animated doors, interior furniture, ingredients/dishes/layered drinks |
| `js/world/` | `actor` (animation state, path following), `scene` (collision, triggers, nav graph + grid A*), `island` (terrain, chunk-cached ground, animated water, layout), `interiors`, `render` (depth sort, lighting, glows, camera, particles) |
| `js/systems/` | `state` (save shape + migration), `save`/`cloud`, `scenes` (door transitions), `cutscene` (scripted camera/walk/say), `story` (20 chapters + free play; one step table drives objectives, completion checks and scenes), `business` (customers, orders, results), `restaurant` (guests + employees), `npc` (residents, ferry tourists, scooters, vendors), `time` (clock, day end), `talk`, `cinematic` (opening), `player` |
| `js/ui/` | `hud`, `dialogue` (typewriter + portraits), `service` (order counter), `prep`, `shops`, `staff`, `decorate`, `summary`, `menu` (map/settings/account), `naming`, `auth` |
| `js/systems/` (economy) | `economy` (rent/property, shopkeepers, supply runners), `ledger` (the books: categories, per-business P&L, net worth), `progress` (levels, milestones), `friends`, `sidequests` (quest engine), `interact` (things in the world, discoveries, calendar events, birthdays), `fishing`, `garden`, `growth` (the island changing by chapter), `album` |
| `js/data/` | Ingredients (per-portion cost), recipes, stations, businesses, upgrades, chapters, achievements, character looks, `quests` (side-quest chains), `lore` (Mèo Mây's memories) |

### Economy rules

- Prices come from ingredients: every recipe's base price = its cost of goods / a target margin (early 35–45 %, mid 45–55 %, premium café/grill 50–60 %). The validator and the economy test enforce this.
- Game bonuses (recipe level, shop level, special, register) stack to at most +45 %; only the player's own price goes beyond.
- One acquisition price per business (`BUSINESSES[id].buy`); Mèo Mây's keys read it.
- Property pays back in 45–65 days of rent; owning adds +5 % custom and 10 % cheaper upgrades.

### Design rules

- **Two kinds of help.** Small businesses (sheds, the food truck, café, grill, Night Market stalls) can hire a *shopkeeper / stall keeper* who opens, preps and serves (`economy.js`, `state.keepers`). Only the restaurant has *employees* with roles — cook, server, prep, cleaner, cashier, manager (`restaurant.js`, `biz.restaurant.employees`). They are separate systems on purpose.
- **Everything is physical.** Customers walk to queues; restaurant staff walk to stoves, tables, the register and the break chair; nothing is a hidden timer.
- **Cutscenes never teleport important moments.** Mèo Mây walks you around, turns toward what it's talking about, and walks away afterwards (it has its own daily routine and home).
- **Time runs at 1 game minute per second** and pauses in menus, dialogue and cutscenes. Your shops close at 23:00 (customers already in line can still be served if you're at the counter); Night Market stalls open at 17:00; you get sleepy after midnight; sleeping ends the day.
