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

## 16. Round 2 (October 13, 2026)
- 🔧 **Prepped ingredients are shared by every shop.**
  - Prep used to belong to the shop where it was made, so sliced mango at the Smoothie Bar couldn't be used anywhere else.
  - There's now one island-wide pool. Every shop reads and writes the same stock, and older saves add up their per-shop prep once on load.
  - The bag lists "Prepped — ready for any shop".
  - Tested: merging, saving, reloading without doubling, and one shop using another's prep.
- 🔧 **Music** (a tester said it was "way too sleepy"):
  - All 12 songs are faster: night 72→98 bpm, home 66→96, Firefly Islet 60→84, title 84→100, the rest +8–10.
  - The night, home, islet and title songs now have a beat and a bass line; morning, beach and harbour gained a backbeat.
- 🔧 **Money: hard to earn, rewarding to spend.**
  - Shopkeepers keep 35% of what they sell. Late game nets about 22M per in-game day, about 50M per real hour.
  - Items that can be bought now total about 3.8B (from about 1B).
  - The luxury curve: rare furniture up to 27M; rare clothes up to tens of millions; pets 3.5–9M; haircuts 300k+; dyes 450k.
  - The bigger house costs 25M / 90M, the upstairs 60M / 150M, the basement 70M / 160M.
  - A home loan now takes a 30% deposit plus 15% interest.
- ✨ **New money sinks:**
  - Cô Ba's ✦ Designer rack: 18 exclusive pieces at 25M–150M, three a day, the same for everyone.
  - 🏗️ Island projects (Island Board), 12M–400M: Market Street lanterns, flower beds up the dock road, beach cabanas, plaza lamps, a Night Market canopy, flower arches, a Golden Mèo Mây statue, and fireworks every night at 21:00.
- ✨ **Saving up:** pin a big purchase (📌) and a bar under your money fills toward it, with a cheer when you can afford it.
- 🔧 **iPad:**
  - The serving and prep screens were 270 px off the left edge (a transform fighting their animation). They're now centred.
  - Rooms were tiny on large screens; they now fill the screen.
- 🔧 **Store screenshots:** the "Make every order by hand" shot showed a closed, empty shop. It now shows a customer ordering. Added iPad 13" sets (2064×2752) in English and Vietnamese.
- 🔧 **Pop-ups:**
  - Pop-ups already showing step aside when a menu opens.
  - The song-name chip no longer appears over menus.
- 🔧 **App Store build:**
  - Added the privacy manifest (`PrivacyInfo.xcprivacy`, no tracking).
  - Declared no non-exempt encryption.
  - Removed the unused ad SDK and its tracking prompt (ads were never switched on).
  - Wrote `tools/ios-release.sh`, which builds and uploads in one go.
- ⏳ **Real Safari:** it still reports Remote Automation off. Run `sudo safaridriver --enable` once.

---

## 17. Round 3: 200 fixes from play-testing (5.20.0, October 14, 2026)

**How it was tested**
- **Grinder bot** (`tools/grind.mjs`): plays like a money grinder (supermarket at 6:00, prep, serve every customer until close, restock on the run) through the real customer, price, tip, wage and bill code, fast-forwarded. Scenarios: early, mid and late game, casual (one hour in three), AFK, staffed island with supply runners, and a 40–60-day soak (memory, actors, save size).
- **Real Safari** (`tools/safari.mjs`, Safari 17.3): 23 screens, 0 errors.
- **Hands-on** in Chrome: a brand-new game from the title screen through the first customers.
- **Seven tester personas** (new player, decorator/collector, explorer, shop manager, restaurant manager, native Vietnamese reader, mid-game player).
- **Audits:** iPhone (EN + VI), short Safari tab, iPad, desktop, iPhone SE/320 px.

**Balance results (after the changes)**

| Who | Per day |
|---|---|
| Early grinder | about 75 customers, +1.3M; reaches chapter 2 on day 4 |
| Early casual | about 42 customers, +0.6M |
| Mid grinder / casual | +1.5–2M / +0.3–1M |
| Late grinder | about +10M |
| Late casual | about +2M |
| Fully staffed island, never served, with runners | about break-even while renting; about +2M/day once the property is owned |

Soak: 54 days without errors; memory steady at 25–29 MB; save 23 KB.

**All 200 fixes**

1. Night Market stallholders' heads were cut off at the top (hours sign moved to the counter, taller window)
2. Villagers no longer stop in shop doorways (one blocked the first quest's shop door, so the button said Talk instead of letting you in)
3. Reputation grows quickly at first and slows as you get famous (a grinder used to reach the Chapter 11 reputation goal on day 3)
4. Each shop's daily crowd thins once most of the island has eaten there — nonstop grinding still pays, just not without end ("The rush is over" note)
5. Villagers' speech bubbles stay on screen (the fisherman's lines on the dock were cut off at the left edge)
6. The beach song is now "Sun & Sand" — it plays on every beach, and its old name "Coconut Cove" showed up on Sunny Beach
7. Shop sheets no longer shrink and jump after you buy something (the close button moved out from under your finger)
8. The bare sand block below every shop counter is now a little street: grass verge, potted plants and flowers
9. "Prep all" now pulses where it appears, with the tip on the prep table (the unlock note used to cover the new button)
10. Customers waiting at your window now show from inside the shop (the line used to be invisible indoors)
11. The daytime song is now "Busy Day" (it was called "Market Street" wherever it played, even inside the beach stand)
12. Price setting now unlocks at level 5 instead of level 2 (it arrived before your first customer) and its explanation is half as long
13. After the story, the goal bar points at your next dream (your savings goal, or the next island project) instead of a vague "keep growing"
14. Shops, shop upgrades, equipment, recipe upgrades and island building projects cost more (a grinder's first week used to buy every shop the day it unlocked)
15. (testing) The launch audit now really opens the drink stand, lines up customers and opens the counter
16. Vietnamese: the "bigger house" row in the furniture shop no longer squeezes its description into a one-word column
17. Every level-up card now says what the next level unlocks — always a reason to play one more round
18. Any prep table can prep for every shop: this shop's ingredients first, then anything else in your pantry that needs prepping (prep is shared now)
19. "Nothing here needs prepping yet" is now translated into Vietnamese
20. Customers whose walk to the queue got interrupted no longer stay "walking" forever (the shop could never close behind them)
21. Chapter 18 is "Star of the Night Market" (it said "Queen" — players can be a boy or a girl)
22. "Next day" stays in reach at the bottom of the end-of-day summary (it was hidden below a long scroll)
23. The restaurant's daily crowd thins out the same way as the shops' (it had no limit at all)
24. Money reads in M from 1M up (1.5M, 9M) — prices no longer jump from "9,000k" to "16.8M"
25. Collector's corner is now the top shelf (30M–150M): it used to cost less than an ordinary sofa
26. Haircuts (from 800k), hair colour (1.2M), Mèo Mây's outfits (from 1.5M), everyday clothes and shop-front/garden decor cost more — real treats, not pocket change
27. Mèo Mây's current outfit shows "Wearing" instead of an active "Wear" button, and her outfits are booked under pets
28. "Save for it" on something you can already afford just says so (it pinned it and cheered at the same time)
29. A furniture shopping spree gives one "N pieces delivered" note instead of a toast per piece
30. Furniture shop is grouped (floor · walls · lights · collector's corner) and sorted cheapest-first, instead of one long jumble
31. Each furniture piece says which set it belongs to
32. Furniture sets show pieces waiting in storage (a set you'd bought but not placed read 0/4 with no explanation)
33. New furniture never lands on the path to the door when you add it from the tray
34. Decorating on a phone: the tool panel is one slim row instead of three, so it covers far less of the room
35. Salon previews show each haircut from the front and the back (ponytail, long and wavy all looked like the bob)
36. Shoe previews show you from the waist down instead of a confusing crop of blocks
37. Adopting a pet shows your new pet on the welcome card (it was a generic paw print)
38. The island pup is a darker brown so it no longer looks the same as the Shiba
39. Photo mode shows the Polaroid or postcard frame live while you line up the shot
40. Taking a photo says "Saved to your album" right in the photo screen (the note was hidden behind photo mode)
41. The photo note points to where the album really is (Menu → Map → Chapters & story, not "Goals → Album")
42. Walls & floor opens as a short, see-through sheet so you can watch the room change colour as you pick
43. Tap any outfit picture in the boutique for a big try-on mirror (designer details were invisible at thumbnail size)
44. NEW: Anh Khoa's "Today's pick" — one piece of furniture 20% off, a different one every day
45. NEW: completing a furniture set gets a celebration card (it used to complete in silence)
46. Over the serving counter and prep table, toasts are small, one at a time and tap-through (they covered the title and the close button)
47. New players (first 4 days) are told why customers leave when nobody is at the counter, and that they can close up before heading off
48. Party and wedding guests walk along the paths to Wind Plaza instead of straight across the sea
49. The bride and groom are never also birthday-party guests on their wedding day
50. Area names: the Harbour bridge and the guesthouse end of Harbour Town are named correctly (they said Restaurant Hill / Firefly Islet)
51. Serving screen: all four sugar buttons fit (the 100% button ran off the edge and tapping it slid the counter sideways)
52. Closing the counter mid-order puts the ingredients back on the shelf instead of throwing them away
53. Running low (3 left) and out-of-stock notes while you serve, saying where to get more
54. "Stock up" buys a real first day's worth (two packs) before it knows what you sell, and you start with a little more money for it (one pack of kumquats sold out within the hour)
55. The prep table says "All prepped ✓" when you're done, and Prep all greys out with nothing left (it read like an error)
56. Day summary separates what you spent on things you keep (repairs, upgrades, furniture) from what trading made — day 1 no longer just reads as a loss
57. Day summary no longer shows nonsense like "▲169%" when the day before lost money
58. Quest goals show the next two things to do (+N more) instead of five goals filling three lines
59. Chapter 1 is shorter: 30 customers, 10 perfect orders, 700k and day 4 (was 40, 12, 900k, day 5)
60. Mèo Mây's end-of-day line says the real number of perfect orders ("Ten!" sat under a summary saying 12)
61. A recipe that unlocks in the middle of the day (your reputation got there) gets its own "Mèo Mây has a new recipe!" note — Peach Tea used to sit there unnoticed
62. Birthday notes come once per real day, and only for neighbours you've met (it repeated every island morning about strangers)
63. Badge news waits until you leave the counter, instead of doubling up with the achievement toast for the same moment
64. Milestone notes point to the right tab (Menu → 🏆 Goals; they said "Milestones ★", which is the leaderboard)
65. A red dot on the menu button while milestone rewards are waiting to be claimed
66. Closing a shop with customers in line takes a second tap (Close sits right beside the action button)
67. Tapping Done with an empty name says "Type a name first" (it just shook silently)
68. Character creator colour dots are bigger and line up in rows (they were 20px and uneven)
69. New-recipe cards name each ingredient under its icon (you couldn't tell what to buy)
70. At an open shop door the action button says Enter and works when tapped (it was a blank grey button)
71. One name per place: the tour calls the materials shop "Ben Vung Materials" like the quest and the sign, and the first quest says "your Drink Stand" like the repair card and map
72. The opening tour says one line about rent; how to buy your place comes on day 3, when rent actually starts
73. Tapping the goal bar glides the camera to where you need to go ("here!") and back
74. The place name you walk into shows just under the goal bar instead of on top of a long goal
75. Villagers keep off the spots where you do things (the fishing spot, the Island Board), so the button says Fish, not Talk
76. Lighthouse: the Telescope button sits above "Leave the lighthouse" instead of half under it
77. Vietnamese: the telescope is "kính viễn vọng" (it said "ống nhòm", binoculars)
78. Vietnamese: Wind Plaza is "Quảng Trường Gió" everywhere (it was lowercase in some places)
79. Vietnamese: villagers greet you with "{name} ơi!" instead of the rude "Ê {name}!" (even children and the doctor said it)
80. Vietnamese: "Hai người nhớ bạn lắm" in the wedding note (it read "the two of you miss you")
81. Vietnamese: three jokes rewritten so they're funny in Vietnamese (they were word-for-word English puns)
82. Rain notes show a new umbrella icon (they showed an ice cube)
83. Chú Hải's house no longer shows Bà Tư's sandal forever after you've returned it
84. Villagers' requests ask first — "I'll help!" or "Maybe later" — instead of starting the quest the moment they speak
85. The Escape key closes the top menu, sheet, counter, prep table, photo mode or lighthouse view
86. The goal bar is never more than two lines (tap it for the whole goal); three lines covered a sixth of the screen
87. Indoors, the EXIT sign fades while you stand on the mat instead of covering your head
88. Pop-up notes wait until a cutscene ends instead of popping up in the middle of a party or the wedding
89. Map: place names are drawn on top of the shop icons with a pale outline, so Wind Plaza, Market Street and the others can be read
90. Map: Wind Plaza and Market Street always show, and the supermarket is labelled "Supermarket" ("Market" next to "Market Street" read as a duplicate)
91. When a staffed shop runs out of stock, the note says the shopkeeper is still being paid and that a supply runner fixes it for good
92. Museum fish cards give a clue for each fish you haven't caught (time of day, how rare, where) instead of "??? Catch one first"
93. Villagers a scene forgot to let go return to their day (and go home at night) instead of standing out at 1:30 am
94. Birthday parties set up in the plaza's north-east corner — the banner and table no longer cover the Island Board
95. Neighbours are at home in the evening and early morning when you visit (homes were nearly always empty)
96. The map's compass is small and see-through, so it no longer hides Coconut Cove's "Opens in Chapter 17"
97. NEW: the map shows where your neighbours are right now (mint dots, names when zoomed in)
98. NEW: you can climb the Firefly Islet lookout tower — its own view over the whole island, with the telescope
99. NEW: a morning island rumour points you at something you haven't tried yet (a wish at the fountain, skipping stones, the canary…)
100. Garden and shop-front decorating: the area is clearly highlighted, and the path to the door is kept clear
101. Serving screen: ingredient names stay visible when a long (Vietnamese) order takes more room
102. Neighbours' names at the counter follow the language you're playing in (a Vietnamese game said "Doctor An")
103. (testing) The launch audit's beach, cove, lighthouse, islet and bridge shots stand on land (they stood in the sea), and Harbour Town is covered too
104. NEW: two smaller island projects for the middle of the game — benches along Market Street (2.5M) and lamps along the beach path (6M)
105. Lantern strings over the Night Market, Market Street and the plaza hang higher, above people's heads instead of across their faces
106. Saves stay small: daily notes keep one marker instead of adding a new one every day (old saves are cleaned up on load)
107. Neighbour gifts keep one marker per neighbour instead of a new one every day (old ones cleaned up on load)
108. Settings: the pop-up switch "Staff sales" is now "Shop news" (it also covers the rush note), and rumours sit under "Island news"
109. Team orders (a group in line, with a bonus for serving them all) start in chapter 2 instead of 4, for a bit more excitement in the first days
110. "Stock up" shows how many portions you're getting (×12), not how many packs (×2)
111. Tide-pool cards tell you how rare each creature is and where to look (they all said "??? Keep looking")
112. Chú Hải's tackle box shows prices like everywhere else (1.2M, not "1200k")
113. Shopkeeper training and promotion, staff hiring and decorating prizes show prices the same way as everywhere else
114. The "…down · rest later" loan buttons wrap their text inside the button instead of running out of it (house, upstairs, basement)
115. Ông Lộc's chess puzzles say how to move (tap a red piece, then where it goes)
116. Recolouring a piece of furniture changes its colours but keeps the wood (the record player turned lime green, legs and all)
117. The big upstairs and the finished basement have their own character (bunting, a photo wall, a tiled hangout floor) instead of bare copies of the ground floor
118. NEW: the furniture shop shows your collection progress ("23 of 90 pieces")
119. NEW: each boutique aisle shows how much of it you've collected, and mentions the try-on mirror
120. Tapping the Today's-special easel always shows which dish you picked straight away (it could get stuck behind other news)
121. Opening or closing a shop always confirms it straight away (the note could queue behind island news)
122. Small phones in Safari: the serving counter fits the screen, with Serve always visible (on a short screen it was pushed off the bottom)
123. The song name no longer pops up over the serving counter or the prep table
124. Climbing down the Firefly Islet tower leaves you at the tower (it put you at the lighthouse door)
125. After the story, a savings goal you pinned shows in the goal bar with your progress (it was hidden behind a generic upgrade hint)
126. The morning reminder on phones also mentions the day's new designer pieces at Cô Ba's
127. NEW: the end-of-day summary ends with "Tomorrow" — your current goal — so every day points at the next
128. Vietnamese: customers use the right pronouns for who they are — children say "em", grandparents' lines no longer fix "bà"/"ông" regardless of who's speaking, the team and "a friend brought me" lines read naturally
129. Vietnamese: local customers' titles match their age and gender (a little girl was "Chị Ánh"); and no customer shares the name of Cô Ba the boutique owner
130. Vietnamese: Doctor An speaks as "anh" (some lines said "chị"), and Mèo Mây always says "mình" (some lines said "tôi")
131. Vietnamese: five more jokes rewritten so they're funny in Vietnamese (crab, cat colour, ladder café, doctor, furniture puns)
132. Vietnamese: experience shows as "EXP" (it said "KN", which nobody recognises) and recipe levels say "cấp" instead of the English "Lv"
133. Vietnamese: grass jelly is "sương sáo", the raw rice is "gạo tấm" (it said "cơm tấm", the cooked dish), customer types are "Trẻ em" / "Người lớn tuổi", and "Nhận order" is "Nhận món"
134. Vietnamese: friendship news reads naturally ("Bạn và Linh giờ đã: Bạn bè!" — it said "Linh giờ là thân thiện của bạn")
135. Vietnamese: your scrapbook memories always say "mình" (some said "tôi"), and ten stiff or literal quest and story lines were rewritten to sound natural
136. Vy names her pink after you, using your real name (the Vietnamese literally said "Hồng Tên Bạn" — "Your Name Pink")
137. Vietnamese: achievement names sound natural ("Mở hàng" for the first sale, "Thánh xã giao", "1 triệu" instead of "1.000k"), the tide-pool book is "Sinh vật vũng triều", the home loan is "Khoản trả góp", and Halloween/Christmas use the names Vietnamese people actually use
138. Vietnamese: "lồng đèn" everywhere (it switched between "lồng đèn" and "đèn lồng"), and the day summary's spending lines read clearly
139. Staffed island rebalanced: shopkeepers keep 15% of their sales (was 35%) and supply runners add 10% (was 35%). A fully staffed island with runners lost about 3.4M a day; now it about breaks even while renting and makes a steady profit once you own the property
140. The wedding: the plaza lantern string comes down for the ceremony (it ran across the couple's faces), and island dogs and cats keep out of parties and the wedding
141. Restaurant: with no cleaner, server or manager working, you can clear a dirty table yourself (without staff the dining room locked up)
142. Restaurant: a server on their day off no longer stops you taking orders yourself (guests used to wait, then walk out)
143. "Day off today" is only offered before work starts — it could be given after a full shift to skip that day's wage
144. Restaurant: leftover work from yesterday is dropped at night (the cook finished orders for guests who had gone home), and a missing order can no longer remove someone else's
145. Restaurant: a guest who walks out takes their order with them — nobody cooks for an empty seat
146. Staff Board: each worker's wage shows both rates ("515k/day, 155k on a closed day"); applicants show only the wage for the role you pick (two different wages sat side by side)
147. Staff Board subtitle no longer says "only restaurants can hire staff" — it points to shopkeepers in Menu → Business
148. The 8 pm bills warning leaves out shopkeepers who have the day off (it warned about debt that wouldn't happen)
149. Owning the restaurant brings the promised +5% guests (it only worked for the small shops)
150. "Shops running themselves" uses the same rule as the restaurant's "Runs on its own": someone actually working today (a keeper on a day off no longer counts)
151. A new supply runner doesn't buy a dozen of every topping nobody has ordered yet
152. "Your team today" in the end-of-day summary shows what each person was paid (or "day off"), so you can see who earns their keep
153. Restaurant: no more than three guests wait by the door for a table; anyone else sees it's full and leaves (they piled up over the exit and the side buttons)
154. Restaurant: the fourth table no longer overlaps the register counter
155. Money from the end-of-day bonus is booked under Rewards in your accounts (it showed as "Other")
156. The day summary mentions money still sitting in the restaurant register, so the books add up
157. Promoting a shopkeeper is worth it: cheaper (4 days' wages), and a head keeper is 15% faster and makes fewer slips — the button says so (it used to cost more than it ever earned back)
158. Restaurant applicants never share a name with someone already on your team
159. Business tab: each shop's uniform and interior buttons sit behind one quiet "Style…" button, so buying, hiring and deliveries stand out
160. The restaurant can have a supply runner too (it uses the most ingredients of any business, but only the small shops could get deliveries)
161. The restaurant's counter screen has a dining-room backdrop (it showed the street stall's sky and striped awning)
162. Milestones: a "Claim all" button when several rewards are waiting, with one combined card
163. Shop-front and garden decoration prices read like everywhere else (1.1M, not "1100k")
164. Restaurant takings, deposits and staff pay rises show money the same way as everywhere else ("Collected 1.25M", not "1250k")
165. The first shop's sign says DRINK STAND / QUÁN NƯỚC, matching its name everywhere else (it said TEA & COFFEE)
166. Anh Bảo's house in Harbour Town has his name on it (the sign said HARBOUR, which read like a place name)
167. The Night Market stays lively: a stall you own but leave shut (with nobody hired) is kept going for the evening by its old family, so the market isn't dark
168. Menu tabs show their name when you hover them on a computer or iPad with a mouse (they're icons only)
169. The first couple of times you open the menu, every tab shows its name for a few seconds, so the icons are easy to learn
170. Counter hints ("Pick a cup size first!", "Choose the ice first", perfect streaks) always show — they were treated as background news and dropped if repeated within a minute
171. Replies to things you do (a second coin in the fountain, another skipped stone) always show; only island news is limited to once a minute (and the ferry note can be switched off under Island news)
172. Early shops are a goal, not a wall: the bánh mì corner 1.8M, the food truck 6M and the Night Market stall 4M (a casual player needed 10+ days for the truck)
173. Furniture added from the tray spreads out into open floor instead of piling up in the middle, and the whole walk to the door stays clear
174. Tapping the goal bar shows every goal with ✓ or • (the bar shows two, and "+1 more" used to hide the rest)
175. Chapter 6 says why you're waiting: "the truck's owner is back on day 15" (it just said "day 11/15"), and Mèo Mây's hint mentions it too
176. The restaurant's key needs level 15 instead of 18 (the climb from 12 to 18 was a long stretch with nothing on the way), and a goal that's short of a level says how to earn XP
177. Level-up cards only promise a key from Mèo Mây when the story is there (level 8 promised the truck key days before it could be bought)
178. Before you buy a key, Mèo Mây warns you if it would leave too little for the repairs and tonight's bills (the restaurant key took 15M of 16M, then the materials cost 1.25M more)
179. During the shopkeeper chapter, Menu → Business opens with a "Hire a shopkeeper" card at the top (the button was far down the page)
180. Mid-game goals show their prices: the Night Market's cash part is labelled, the second stall lists both stall prices, and the statue goal shows its cost and materials
181. Mèo Mây's statue hint says "upgrade one shop to level 3" (it said "fully upgrade", which isn't what the goal asks)
182. Ben Vung Materials always offers the "Everything for…" bundle for your current goal (bánh mì shed, Night Market, restaurant, statue) — it only appeared if you'd visited the repair site first
183. Staff Board and Business tab show the restaurant's full daily wages, with the closed-day amount in brackets (before opening they showed only the 30% retainer, unlabelled)
184. A villager standing by the statue pedestal can't take over its button any more (it turned into "Talk" and started their side quest)
185. Mèo Mây no longer says "Beep beep!" twice in a row when you get the truck
186. Mèo Mây's notebook groups recipes by shop and shows where each sells and for how much (fourteen identical rows told you nothing)
187. Upgrade cards say when a material isn't sold yet (roof tiles "from Ch. 7") instead of leaving you hunting for it
188. The top bar (day, money, level, pause, menu) fits narrow phones like the iPhone SE — the menu button ran off the right edge
189. The food truck's Wind Plaza spot no longer has the ice-cream cart parked in its queue or a lamp post in front of it
190. The goal bar updates the moment you buy what it asks for (it could lag behind while a shop was open)
191. The Night Market goal tells you to buy rice paper, eggs and scallions first (it only came up when the stall refused to open)
192. Going to bed when you can't cover tonight's rent and wages says so first (an early night skipped the 8 pm warning and woke you up in debt)
193. Someone you let go from the restaurant doesn't reappear in that day's applicants
194. The furniture shop's daily pick can be any piece from 200k up, so early players get deals too (it only picked pieces over 1M)
195. Settings that are switched off show a calm neutral button ("Off" was bright warning-yellow)
196. Close buttons on the prep table and every sheet are labelled for VoiceOver, in Vietnamese too (one had no label, the rest only in English)
197. Hiring no longer charges twice: the hiring fee (two days' pay) now really covers the first two nights instead of being charged on top
198. Vietnamese chapter titles use Vietnamese sentence case ("Tiếng lành đồn xa"), keeping capitals only for place names — they were in English-style Title Case
199. Hiring a shopkeeper says what the fee bought ("covers today and tomorrow") — it was taken with no word on what it was for
200. NEW: big furniture pieces (20M and up, like the golden Mèo Mây statue) can be pinned with "Save for it", just like houses, designer outfits and island projects

## Needs you
1. ⏳ **Real Safari pass.** In Safari, open **Settings → Advanced → Show features for web developers**, then the **Develop** menu → **Allow Remote Automation**. I'll then run the same audit in real Safari.
2. ⏳ **Leaked-password protection** in Supabase Auth (see section 12).
3. ⏳ Payment links and store products for the Tết pass / Lantern Lounge (from the 5.17.0 notes) if you want them selling at launch.
4. ⏳ **Deploy:** `npx -y wrangler@4 deploy` (or tell me to).
