# Bistro Island — launch audit (October 9, 2026)

Launch: **October 31, 2026**. Version audited: 5.18.0 → 5.18.1.

**How it was checked:**
- `tools/audit.mjs` plays the game the way a player does, in each mode:
  - the welcome screen, guest start and intro;
  - every island spot at 10:00, 18:40 and 22:00, plus a rainy afternoon;
  - every interior, the house with its upstairs and basement, the decorating editor;
  - every menu tab and every shop or sheet;
  - opening a shop, customers, photo mode, and staying up past 5 am.
- It saves a numbered screenshot of each screen and flags:
  - errors;
  - buttons that are off-screen, cut off, covered or smaller than a finger;
  - text running past the edge, "undefined" or "NaN" in text;
  - English showing in Vietnamese mode;
  - sideways page scrolling.
- I reviewed every screenshot by eye, as contact sheets.

**Modes covered:**
- **Google Play mode:** Chrome engine, Pixel 7, app build.
- **Apple app mode:** iPhone 13 screen and notch, app build.
- **Installed web app:** home-screen mode, full screen with notch and home bar.
- **Safari tab:** iPhone 13 with browser bars.
- **iPad.**

Each mode was run in English and in Vietnamese.

**Test-tool limits:**
- Playwright's own copy of Safari's engine (WebKit) crashes on macOS 14, so the iPhone modes above ran in Chrome's engine with the iPhone screen size, notch and app settings.
- A pass in **real Safari** is still to do (see "Needs you").

Legend: ✅ checked and fine · 🔧 problem found and fixed · ⏳ needs you

---

## 1. Start-up, sign-in, saving
- 🔧 A new player could see **"Oops, the island didn't open"** on top of a working welcome screen.
  - Cause: the map button's picture had an empty source, which counts as a load error before the game starts.
  - Fixed the picture, and the start-up guard now ignores image errors.
- 🔧 On a stalled connection (an iPhone home-screen app waking up, weak signal) a signed-in player's start could **hang forever**.
  - Every cloud request now gives up after 12 s (saves get 30 s), and start-up doesn't wait twice.
  - Tested with Supabase never answering: the game starts in 12 s and plays offline.
- 🔧 iPhones reported "Failed to start the audio device" when returning to the game. That refusal is now handled quietly.
- 🔧 The language now follows the phone (Vietnamese phones start in Vietnamese) until the player picks one. The start-up error card follows it too.
- ✅ Welcome screen, "Play now — free", "I have an account", sign-up, sign-in, forgotten password, privacy and terms links (EN/VI).
- ✅ Guest start → boat intro → naming → first objective. No errors in any mode.
- ✅ Save recovery: a damaged save restores from backup. With two phones on one account, nothing is silently overwritten (test suite).
- ✅ Reload keeps the clock and position. Nothing pauses during sign-in or naming.

## 2. Story, missions, achievements, milestones
- ✅ Chapters 1→20 played start to finish: 45 steps, every title card once, every story achievement, no soft locks.
- ✅ All 50 side quests are playable start to finish, and 35 keepsakes land in the scrapbook.
- ✅ All 30 achievement IDs used in the code exist.
- ✅ Island Board notes (3 a day, paid once), weekly goals, morning mail and badges work.
- 🔧 Many milestones becoming ready at once (after an update, or a long time away) showed a stream of pop-ups. They now combine into one "16 milestones ready!" card.

## 3. Economy
- ✅ First repair 231k and first stock 82k, matching the design.
- ✅ Property pays back in 85–140 days.
- ✅ A staffed late-game island's six daytime shops sold **6,063k in 2.7 in-game hours**, about 35M over a full day, against about 3.5M a day in wages and rent.
- ✅ The books add up: shopkeeper sales and wages are counted correctly in the day summary.
- ✅ Prepped portions count as stock in the supermarket. A shop that can't open says exactly what it's missing.
- ✅ Weekly board prizes by rank. The website shows no ads; the pretend ad only appears on a local test copy.

## 4. Art: characters, clothes, animations
- ✅ 24,196 character drawings (every look × pose × direction) all render, and every figure keeps its big chibi head.
- ✅ The cast sheet covers all 22 named islanders (residents, shopkeepers and the two newcomers), the tourists and the restaurant staff.
- ✅ Every outfit was checked from the front, both sides, three-quarter, back, walking and with another hairstyle (all 107 clothing items).
- ✅ Every hairstyle was checked from five angles. Actions checked: wave, cheer, clap, laugh, bow, dance, stretch, think, drink and work.
- 🔧 **Space buns from the side** looked like an empty ring on the head. The bun now sticks out above the head.
- ✅ The drink sits at the mouth, not through the head. Shopkeepers face the counter while working.

## 5. Furniture and decorating
- ✅ Every one of the 96 pieces was checked from the front, both sides and the back.
- 🔧 **Armchair** side and back views were pink while its front is blue. **Radio** side view was red while its front is wooden. Both now match.
- 🔧 **Koi basin** and **ship in a bottle** turned into boxes when rotated. They're round, so they now look the same from every side.
- 🔧 **Shop thumbnails:** wall pieces (dartboard, tool wall, projector screen…) showed as slivers, and some pieces were clipped. Every thumbnail now fits the piece's real drawn size, centred.
- 🔧 **Upgrading the house** put the wardrobe in the middle of the room, because the new stairs took its spot. Pieces that must move now go to the nearest free spot at the same depth, so the wardrobe stays on the back wall.
- 🔧 On the new upstairs and basement, the tray said "Everything you own is in the room" while the room was empty. It now explains that the pieces are placed elsewhere in the home.
- ✅ Grid snapping, drag, tap-to-move, nudge, turn, undo and Done all work. A drag reaches the very bottom row (test updated for tap-to-move).
- ✅ Upstairs and basement build, stairs work both ways, and the decorating editor works on every floor.
- ✅ Wall pieces hang anywhere on the wall without covering windows.

## 6. Interiors and exteriors
- ✅ 22 interiors (shops, all resident homes, the clinic, the restaurant, Mèo Mây's house) are each furnished to suit their owner.
- ✅ The island at 10:00, 18:40 and 22:00: lights, lanterns, fireflies and the lighthouse beam.
- ✅ Rain (the next rainy day on the shared calendar): 25 people under umbrellas, rain sounds, splashes.
- 🔧 **Waking in Mèo Mây's cat bed:** the bed was small, in the bottom-left corner, and hidden behind her talking portrait. It's now a big cat bed on the right, and the player is clearly curled up in it.
- 🔧 The "You fell asleep right there on the ground…" caption was cut off by the day summary. It now fades out first.
- 🔧 The player's Night Market stall sign said **"YOUR STALL"**. It's now **"GRILLED RICE PAPER / BÁNH TRÁNG NƯỚNG"**, like the other stalls. Mèo Mây's line about it was updated to match.
- ✅ Map labels sit on their places.

## 7. Icons, buttons, screens (layout)
- 🔧 The **uniform designer's hat choices** were drawn crossed out (a style meant only for switched-off pop-up types). Fixed.
- 🔧 The **volume and zoom sliders** were 16–28 px tall, too thin for a thumb. They're now a 36 px finger-sized strip.
- 🔧 The text-size buttons ("Lớn") were 26 px wide. They now have a minimum size.
- 🔧 Pop-ups landed on top of open menus' buttons. They now wait while a menu or the place-name banner is showing.
- ✅ No screen in any mode has buttons off-screen, text cut off, "undefined"/"NaN", or sideways scrolling.
- ✅ Horizontal chip rows scroll (supermarket aisles, shop-front pieces).
- ✅ The notch and home bar are respected everywhere. Six rules that read the iPhone safe area directly now use the shared variables, so they behave consistently.

## 8. English and Vietnamese text
- ✅ Every `T(en, vi)` and `[en, vi]` pair in the game was scanned. None are untranslated or identical in both languages, and none have English inside the Vietnamese.
- ✅ Every English word was spell-checked against the system dictionary. The only hits are names, Vietnamese words, British spellings used consistently, and deliberate puns ("A fsh", "Purr-ple").
- ✅ Vietnamese read-through of the menus, shops, staff board, wardrobe, salon, pet shop, museum, lab, island board and What's New: natural, with correct pronouns.
- 🔧 Museum hint "Hãy câu được trước" → "Câu được một con trước đã".
- 🔧 The weekly board said "Resets Monday 00:00 (Japan time)". It now gives the reset in the player's own time ("Resets Sunday 22:00 your time" in Vietnam).
- 🔧 The midnight warning now says that at 6 am you'll doze off wherever you are.

## 9. NPCs, animals, employees
- ✅ On a busy evening nobody stands on anyone, every standing spot belongs to one person, and there were no close brushes in 40 s.
- ✅ Ferry: back 10 s after leaving, everyone in line boards.
- ✅ Mopeds stop for pets and villagers. Customers and residents leave out of sight and fade.
- ✅ Shopkeepers open at opening hours, prep, serve and face the counter. Staff can take today or tomorrow off.
- ✅ Night Market vendors work their stalls and close at 23:00. Diners sit at the tables.

## 10. Weather, seasons, calendar
- ✅ Seasons and rain follow the shared 60-day island year. Real festivals fall on their dates (test suite).
- ✅ Only Vietnamese and international festivals; no Japanese holidays.

## 11. Camera
- ✅ It follows the player, snaps on scene changes and frames celebration photos. Photo mode zoom, filters and frames all work.
- ✅ Wide rooms (the restaurant) pan; no black gaps.

## 12. Website and database security
- 🔧 **Removed a debugging function** someone had added by hand in Supabase. It returned one player's entire save to anyone holding a fixed token, without signing in. Dropped in migration 020.
- ✅ All other server functions check the signed-in player themselves (friends, inbox, visitors, leaderboards, delete account, admin stats with its admin check).
- ✅ Photo backup: a private folder per player, 24 photos max, file names checked. Tested with a test player: other players' folders and bad names are refused.
- ✅ Stripe webhook: signature checked with a constant-time compare, and requests older than 5 minutes are refused (no replays). RevenueCat webhook: secret header checked.
- ✅ Every friend-supplied name or island name is escaped before display. Postcards can't contain free text.
- ✅ Security headers: CSP (scripts only from the site itself), HSTS, X-Frame-Options DENY, nosniff, strict referrer, no camera/mic/location.
- 🔧 Added database indexes for the friend, gift and postcard lookups, so they stay fast as players join (migration 021).
- 🔧 Deleting an account now also deletes the backed-up photos.
- 🔧 The privacy policy (EN + VI) and the Google Play / Apple data-safety notes now cover photo backup, postcards, furniture gifts and helping at a friend's shop.
- ⏳ **Leaked-password protection** is off in Supabase Auth (Supabase's security advisor). Switch it on under Authentication → Policies (one toggle).

## 13. Usability and "addictability"
- ✅ Daily reasons to return: morning mail, 3 Island Board notes, the daily special, the garden harvest, the bakery cart, the chess puzzle (7–11), the weekly board and challenge, festivals on real dates, birthdays, a stamp card each season.
- ✅ Long-term goals: 20 chapters, 50 side quests, the museum (30 exhibits), milestones, badges, the house with upstairs and basement, 96 furniture pieces and sets, outfits, hairstyles and pets.
- ✅ Friends: visits, postcards, gifts, helping at a friend's shop (the host approves), the weekly friend challenge.
- ✅ Comfort: pop-up categories, battery saver, colour-blind palette, left-handed controls, text size, optional day summary.

## 14. Builds
- 🔧 The App Store / Google Play copy of the game (`www/`) was still **5.9.0**. Refreshed; run `npm run app` before each store build.
- ✅ `npm run check:launch`: dev tools are off.

## 15. Hotfixes requested during the audit
- 🔧 **Phone running hot / 60 fps setting ignored.**
  - "Smooth 60 FPS" had no limit at all, so on 120 Hz iPhones it ran at 120 fps at double resolution. It's now capped at 60.
  - Behind full-screen menus and the day summary the island only ticks over at 10 fps.
  - Off-screen animals, butterflies, scooters and quest props were still drawn every frame. They're now skipped (about 30% less drawing on the busy plaza).
  - Trees and plants were repainted 10 times a second for the breeze. They're now drawn once and swayed as they're placed.
  - The objective bar's background blur and the forever-animating glow and button bounce are gone (each forced the phone to repaint the screen at full refresh rate).
- 🔧 **Rainbow removed:** the event, the drawing and its discovery entry.
- 🔧 **Rain sound:** it was a 1.6 s noise burst replayed every 1.3 s (the "splashes"). It's now one continuous, softly filtered rain bed that fades in and out with the rain, at about half the old volume, with an occasional distant rumble in heavy showers. It stops entirely in dry weather.
- 🔧 **Umbrellas:**
  - The pole used to float beside the body and run through the head.
  - Now the right hand holds it up by the shoulder, the pole rises beside or behind the head, and the canopy sits clear above.
  - Checked from all four sides, standing and walking, adults and children.
- 🔧 **Cart grandmas in the rain:**
  - They no longer hold small umbrellas.
  - Each opens a big striped market umbrella on a weighted stand over herself and the cart, and it folds away when the rain stops.
  - The carts' push handle, which crossed the grandmas' faces, moved to the far end of the cart.

---

## Needs you
1. ⏳ **Real Safari pass.** In Safari, open **Settings → Advanced → Show features for web developers**, then the **Develop** menu → **Allow Remote Automation**. I'll then run the same audit in real Safari.
2. ⏳ **Leaked-password protection** in Supabase Auth (see section 12).
3. ⏳ Payment links and store products for the Tết pass / Lantern Lounge (from the 5.17.0 notes) if you want them selling at launch.
4. ⏳ **Deploy:** `npx -y wrangler@4 deploy` (or tell me to).
