# Bistro Island

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
    npm run test:quick     # content, save, economy, ui, clock (a few minutes)
    npm run test:story | test:economy | test:quests | test:world | test:stability | test:clock | test:ui | test:render
    node tests/run.mjs story,ui   # any comma list of suites

`tests/run.mjs` starts its own server and plays the game in a headless browser:

| Suite | What it proves |
| --- | --- |
| content | the content validator (`js/dev/validate.js`): ingredients, stations, recipes, menus, margins, story chain, side quests, milestones, icons, furniture drawings, offline cache list |
| save | a damaged save is recovered from a backup and the bad copy kept aside |
| story | a fresh game plays Chapters 1→20 with every transition, card, XP reward and achievement |
| economy | first repair ≈ 231k, margins per tier, property payback, one price per business, a keeper's day of trade and its books |
| ui | Business / Milestones / Staff screens draw; the map's close button has a full touch target |
| quests | every side quest plays start to finish (find, meet, puzzle, deliver, routes) |
| world | TV, radio, piano, lamp, fish, books, fountain, timetable, fishing and the garden all work; on a busy evening nobody shares a standing spot or walks through anyone; the ferry shuttle's boarding rules |
| stability | stuck-screen regressions: stacked rewards/achievements/level-ups queue one at a time; cutscene + chapter card + achievements + quest + milestone rewards together (with rapid tapping); duplicate scene requests; overlapping dialogue; sleep with pending popups; doors after a cutscene; the watchdog recovering a hung scene, leaked pause and leaked lock; real finger taps on "Yay!", reward cards and dialogue, also with the click dropped the way iOS sometimes does — then controls, movement and the action button must work |
| chaos (`npm run test:chaos`, not in `npm test`) | Chapters 1→20 with an impatient player: random taps, mashing the action key, opening/closing the menu around transitions |
| clock | staying up past dawn in a closed stand, the bed and Talk prompts from every side, the clock and position surviving a reload |
| render | every look × pose × direction draws pixels, and every figure keeps its big head |

`tests/cast.html` is a contact sheet of the whole cast for art checks against `docs/reference/`. `tests/backview.html` shows every haircut, hat and accessory from behind, three-quarters behind and the side (`?set=hair|hats|gear&hair=pony`), and `tests/hammock.html` shows lying in each kind of hammock.

## Deploy (Cloudflare Workers static assets)

    npx wrangler login      # once
    npx wrangler deploy     # uploads the repo root; .assetsignore excludes tests/, tools/, supabase/, docs/

The service worker (`sw.js`) is network-first, so updates land immediately. After adding or removing a file, run `npm run sw` to rewrite its offline file list, and bump `CACHE`.

## Store apps (App Store / Google Play)

Capacitor wraps the game (`capacitor.config.json`, app id `com.bistroisland.app`):

    npm run app             # copy the game into www/ and sync ios/ and android/
    npx cap open ios        # Xcode: set your team, then Archive
    npx cap open android    # Android Studio: Build → Generate Signed Bundle

iOS needs CocoaPods (`pod`); the Android build needs Android Studio. Icons and splash come from `resources/` (`npx @capacitor/assets generate --assetPath resources`).

**Ads** (AppLovin MAX, in the apps only): put the SDK key and the rewarded ad unit ids in `ADS.max` in `js/systems/ads.js`. One optional ad a day doubles the day's tips.

## Payments (Stripe)

Live products and Payment Links exist (`STORE.checkout` in `js/systems/store.js`); the sandbox links are used on a local copy (`STORE.test`, card 4242 4242 4242 4242). To take real money:

1. Stripe Dashboard → Developers → Webhooks → add endpoint `https://cgbaigeergwvbmghrakb.supabase.co/functions/v1/jen-island-stripe-webhook`, event `checkout.session.completed`.
2. Copy its signing secret and, in the Supabase SQL editor, run `select vault.create_secret('<whsec_…>', 'jen_island_stripe_webhook_live');`.
3. Set `STORE.payments = true` and deploy.

The store is hidden inside the store apps: Apple and Google require their own in-app purchases for cosmetics.

## Email (Resend)

Supabase → Authentication → Emails → SMTP settings: host `smtp.resend.com`, port `465`, username `resend`, password a Resend API key, sender an address on a domain verified in Resend.

## Launch checklist (dev tools)

The game ships with a **Dev** tab in the menu while it's being tested (jump to any chapter with
the world set up for it, money, stock, levels, businesses, staff, time and clock speed, customers,
collections, bridges and festivals, side quests, teleporting, walking speed). Before launch:

1. In `js/dev/flag.js` set `DEV_TOOLS = false` — the Dev tab and the red "DEV BUILD" ribbon disappear
   and `js/dev/devtools.js` is never loaded (it can also be deleted).
2. Deploy with `npm run deploy:launch` — it refuses to deploy while `DEV_TOOLS` is still `true`
   (`npm run check:launch` runs just the check).

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

- **v5.3: a real grind.** The balance knobs live in one block (`ECON` at the end of `js/data/game.js`), with the rest named there: customer flow, shopkeeper wages and supply runners, rent and property, clothes, pets, level and milestone rewards. Owning everything takes many weeks of island days.
- Margins are thin: early recipes 18–35 %, mid 30–48 %, premium café/grill 37–50 % (ingredients cost 1.25× their list price). The economy test enforces the bands.
- Rewards are small: level-ups and milestone tiers pay a modest, slowly growing sum (milestones used to grow ×1.6 per tier). Money comes from running shops.
- Game bonuses (recipe level, shop level, special, register) stack to at most +28 % (`BONUS_CAP`); only the player's own price goes beyond.
- One acquisition price per business (`BUSINESSES[id].buy`); Mèo Mây's keys read it.
- Property pays back in 90–130 days of rent; owning adds +5 % custom and 10 % cheaper upgrades. Shopkeepers cost 100–135k a day and still pay for themselves several times over.

### Reliability rules (never get stuck)

- **Input locks are named** (`js/core/locks.js`): each system takes and releases control under its own name (`cutscene`, `door`, `seat`, `pet`, `quest`…); the player moves only when no lock is held, so one system finishing can't free the player while another still needs control. `player.control` is read-only in practice.
- **One scene at a time**: `cs.run` queues scenes and ignores a request for a scene already running or waiting. `G.runtime.inCutscene` is derived from it (never set by hand).
- **One blocking card at a time**: rewards, level-ups, the day summary and "what's new" go through `present()` (`ui/sheets.js`); a card never opens under the black fade.
- **Dialogue lines queue** instead of replacing each other, and closing the dialogue always resolves whoever was waiting.
- **Story checks wait** while a menu, card, dialogue, door transition, sleep or the lighthouse is open.
- **Taps always land** (`core/input.js`): a finger that goes down and up on a button presses it, even if the phone drops the click (logged as `[input] tap rescue`) — so card buttons must ignore a second press. Never `preventDefault` a `pointerdown` over a button that works by `click` (on iOS that cancels the click).
- **Watchdog** (`main.js`, defensive only, every rescue logged with `[watchdog]`): scripted walks that overrun arrive, a scene with no activity for 15 s hands control back, and a pause count, input lock or black fade with nothing on screen is cleared.

### Design rules

- **Two kinds of help.** Small businesses (sheds, the food truck, café, grill, Night Market stalls) can hire a *shopkeeper / stall keeper* who opens, preps and serves (`economy.js`, `state.keepers`). Only the restaurant has *employees* with roles — cook, server, prep, cleaner, cashier, manager (`restaurant.js`, `biz.restaurant.employees`). They are separate systems on purpose.
- **Everything is physical.** Customers walk to queues; restaurant staff walk to stoves, tables, the register and the break chair; nothing is a hidden timer.
- **One person per spot.** Islanders and visitors claim a standing spot before walking to it (`systems/crowd.js`: plaza rings, clusters round every activity spot, stroll stops beside every path); spots are at least 30 px apart and never shared. Walkers steer round anyone in their way (`steerAround` in `world/actor.js`) and keep right when meeting head on.
- **The ferry is a shuttle.** The next boat ties up 10 s after the last leaves; everyone in line boards; with five or more aboard it waits 3 s and goes; with nobody to take it leaves. The timetable's visitor boats only decide how many visitors ride in.
- **Cutscenes never teleport important moments.** Mèo Mây walks you around, turns toward what she's talking about, and walks away afterwards (she has her own daily routine and home).
- **A day (6:00 → 24:00) lasts 20 real minutes** (`TIME_SCALE` = 0.9 game minutes per second) and the clock pauses in menus, dialogue and cutscenes. Your shops close at 23:00 (customers already in line can still be served if you're at the counter); Night Market stalls open at 17:00; you get sleepy after midnight; sleeping ends the day.
