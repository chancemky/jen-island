# Claude Code batch — jen-island

**Status:** running — Claude Watcher launched Claude Code on Vestas-MacBook-Pro  
**Target:** systems & gameplay / economy balance  
**Source:** Balance Auditor findings @ `e6aa4b7` / v5.3.0  
**Repo:** `chancemky/jen-island` (prefer `/workspace/jen-island-repo` on `main`)

## How to use
1. Paste this whole file into Claude Code on jen-island `main`.
2. Implement the tasks below; keep changes focused and shippable.
3. When done, set **Status** to `done` (or `stuck: <reason>`).

## Context
Balance Auditor audited code + punchlist (no live play). Prefer fixing **data / copy / tests** over inventing new systems. Do **not** do the narrow UI/copy bugs listed in `codex-batch.md` (those go to Codex).

## Tasks (priority order)

### C1. Milk-tea topping surcharges lose money after `ECON.ingredients` [high]
- **Where:** `js/data/game.js` — `OPTIONS.topping.surcharge` is tapioca **4** / jelly **3** / cheese_foam **6**. After `ECON.ingredients = 1.25`, ingredient costs become **~4.38 / 3.75 / 6.25**, so every topping is a net loss (`recipePrice` adds surcharge; COGS charges full cost).
- **Do:** Raise each surcharge to at least `ceil(post-hike cost)` (or ~`round(cost * 1.15)`). Add a validator or `tests/run.mjs` check that every topping surcharge ≥ its ingredient cost after the ECON multiply.
- **Don’t:** Change base dish prices here unless required for tests.

### C2. Day-1 cash leaves ~17k after repair + first stock [high]
- **Where:** `js/systems/state.js` start `money: 330`; shed1 repair mats ≈ **231k**; one pack each tea/kumquat/sugar/ice ≈ **82k** → leftover ≈ **17k**. Punchlist #50 compounds this.
- **Do:** Bump start money and/or trim first repair/stock so leftover ≥ one buffer pack (~40–80k). Update any economy test that asserts the start/repair/stock relationship (`tests/run.mjs`). Optionally surface “you can afford repair + first ingredients” in the materials quest UI if cheap.
- **Don’t:** Remove Bà Tư starter help; keep the grind intentional, just not one-mistake soft-broke.

### C3. Pricing philosophy comment vs real margins / tests [medium]
- **Where:** `js/data/game.js` comment still promises early **35–45%**, mid **45–55%**, premium **50–60%**. Post-hike examples: `banh_mi_thit` ~27.6%, `tra_tac` ~30.4%, `pho_bo` ~39.6%, `ca_phe_trung` ~46%. `tests/run.mjs` already expects thinner bands (early **18–35%**, mid **30–48%**, cafe/grill **37–50%**).
- **Do (preferred):** Rewrite the philosophy comment (+ any changelog / “fair economy” blurb) to match the v5.3 test bands so designers don’t chase the wrong target. **Alternative** only if Chance prefers: retune `RECIPES[*].price` upward to restore the old philosophy and update tests accordingly.
- **Don’t:** Leave comment and tests disagreeing.

### C4. Cafe / grill / NM stalls — no upgrade track [medium]
- **Where:** `BUSINESSES.cafe` / `grill` / `nm1`–`nm6` (except `night`) have no `upgrades`; UI shows “No upgrades here yet.” Late buys are expensive with no growth path.
- **Do (prefer minimal invention):** Either (A) hide/relabel the Upgrades tab for kiosks as intentional N/A, **or** (B) add 2–3 simple attract/price upgrade tiers mirroring shed/truck patterns (costs × `ECON.upgrades`). Prefer (A) unless (B) is a small data-only add.
- **Don’t:** Build a whole new progression system.

### C5. Keeper wages vs thin early margins [medium]
- **Where:** `KEEPER_WAGE` shed **100** / stall **110** / truck **135** per day (`economy.js`). Early `tra_tac` margin ≈ **4.9k**/sale → many serves/day just to cover wage; spawn is slower in v5.3. Hire unlocks Ch.5.
- **Do:** Soften early wages **or** add Hire UX: tip when shop net is thin, and/or show projected wage vs recent daily net on the Hire button. Keep automation as a late-game convenience, not an instant loss trap.
- **Don’t:** Remove keepers or change unlock chapter unless necessary.

### C6. Recipe book “???” wall [low/medium UX]
- **Where:** `js/ui/shops.js` locked rows titled `'???'` with weak chapter/rep hints (punchlist #39, #107).
- **Do:** Collapse locked recipes behind a summary like “N recipes still secret — follow the story / earn reputation”, and when an active story step teaches a recipe, surface that link.
- **Don’t:** Spoil recipe names early.

## Notes for Claude
- Match existing patterns in `js/`, EN+VI via `T()`.
- Run relevant tests (`tests/run.mjs` economy section / `validate.js`) after changes.
- When finished: set Status to `done` and briefly list what changed.
