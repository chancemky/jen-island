# Codex batch — jen-island

**Status:** ready — paste into Codex  
**Target:** narrow bugs and localized copy/UI fixes  
**Source:** Balance Auditor findings @ `e6aa4b7` / v5.3.0  
**Repo:** `chancemky/jen-island` (prefer `/workspace/jen-island-repo` on `main`)

## How to use
1. Paste this whole file into Codex on jen-island `main`.
2. Fix only the items below; keep diffs tight.
3. When done, set **Status** to `done` (or `stuck: <reason>`).

## Context
Leave economy retunes, pricing philosophy, upgrades, keeper balance, and recipe-book redesign to `claude-batch.md`.

## Tasks (priority order)

### X1. Pre-dawn OPEN copy always says “past 11 pm” [high]
- **File:** `js/systems/business.js` `openBiz` (~line 121).
- **Bug:** When `!isOpenHours`, non-night shops always use *“It's past 11 pm — your shops are closed until 6:00…”* even if `G.state.time` is before 06:00 (e.g. 05:30). Hours gate: `minutes >= 6*60 && minutes < CLOSE_TIME`. Punchlist #91 / #105.
- **Fix:** Branch copy: before 06:00 → “Opens at 6:00” (EN+VI); after close → keep past-11pm copy. Optionally disable OPEN and show next-open time.

### X2. Supply-runner UI says +15% but fee is 35% [high]
- **Files:** `js/systems/economy.js` `SUPPLY.fee: 1.35`; `js/ui/office.js` hire blurb still *“shop price + 15% delivery”* / VI *“+ 15% phí giao”*.
- **Fix:** Update EN/VI to +35%, **or** derive the percent from `SUPPLY.fee` (`Math.round((fee-1)*100)`) so copy cannot drift again.

### X3. Insufficient-funds toast has no shortfall [medium]
- **Files:** `js/ui/shops.js` `noMoney()` → only “Not enough money”; `js/ui/office.js` property/hire/supply same. Punchlist #26 / #106.
- **Fix:** Shared helper toast with need / have / shortfall. Reuse from shops + office.

### X4. “Buy property” looks buyable when unaffordable [medium]
- **File:** `js/ui/office.js` — always renders buy button; affordance only on click. Shed1 property ≈ 5,400k after v5.3.
- **Fix:** Disable/grey when `!canAfford(price)` (same pattern as locked upgrades in `shops.js`); show shortfall on label or subline. Wire to X3 toast if they click somehow.

### X5. Island Level vs shop Level unexplained [medium]
- **Punchlist #104.** HUD island level (`progress.js`) vs Business “Level N” upgrades share vocabulary.
- **Fix:** One short HUD tooltip and/or Business tab note: “Island level unlocks features; each shop has its own upgrade level.” (EN+VI)

### X6. Quest “inside the shed” vs “Drink Stand” [low]
- **File:** story/prep copy vs map biz name. Punchlist #111.
- **Fix:** One player-facing name (“Your Drink Stand” / “quán nước”) in quest, map, and interior title.

### X7. Starter recipes tagged `chapter: 2` but taught in Ch.1 [low]
- **File:** `js/data/game.js` — `RECIPES.tra_tac` / `tra_dao` have `chapter: 2`; story discovers `tra_tac` in Ch.1.
- **Fix:** Set to `chapter: 1` (or `starter: true` and skip chapter gating in the notebook).

### X8. Milestone “tier N of M” beside “current / target” ambiguous [low]
- **File:** `js/ui/menu.js` milestones — `tier ${claimed+1} of ${total}` plus `val / target` on same row. Punchlist #109.
- **Fix:** Relabel e.g. “Next goal: X / Y · Tier i/n” or show only next target until claimed.

### X9. “More places you could run…” non-actionable [low]
- **File:** `js/ui/office.js` `empty-note` lists biz names only. Punchlist #28.
- **Fix:** Each name a button that closes the menu and pans/waypoints to that building (or opens its buy sheet). Keep scope tight — reuse existing map focus helpers if any.

## Notes for Codex
- EN+VI via `T()` everywhere.
- No refactors unless required for the fix.
- When finished: set Status to `done`.
