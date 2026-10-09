# Google Play — Data safety form (and Apple privacy labels)

Based on what the game actually sends (see `js/systems/cloud.js`, `telemetry.js`, `social.js`, `ads.js`, `iap.js`).

**Does the app collect or share user data?** Yes, collect. Not sold.
**Encrypted in transit?** Yes (HTTPS only). **Can users request deletion?** Yes — Menu → Account → Delete account (erases every row and the login).

| Data type (Play category) | Collected | Shared | Optional | Purpose | Notes |
| --- | --- | --- | --- | --- | --- |
| Email address (Personal info) | Yes | No | Yes (guest play needs none) | Account management | Supabase auth login |
| User IDs (Personal info) | Yes | No | No | App functionality, account management | random account id; friend code |
| Name (Personal info → other) | Yes | No | No | App functionality | player & island name (shown on leaderboard/friends) |
| Purchase history (Financial info) | Yes | No | Yes | App functionality | product id only; payment handled by Apple/Google/Stripe |
| App interactions (App activity) | Yes | No | Yes (Settings → share stats off) | Analytics | anonymous device id, event names |
| Crash logs / diagnostics (App info and performance) | Yes | No | Yes (same switch) | Analytics | error message + stack |
| Device or other IDs | Yes | Yes (ads, app only) | Yes (ads are opt-in per view) | Advertising | AppLovin MAX advertising id — only once ads are switched on |
| Game progress (App activity → other) | Yes | No | No | App functionality | cloud save |
| Photos (Photos and videos) | Yes | No | Yes (accounts only) | App functionality | in-game album pictures of the player's own island, 24 newest, private storage folder; deleted with the account |
| In-app messages (Messages → other) | Yes | No | Yes | App functionality | postcards to friends: design, sticker and a message picked from a fixed list (no free text) |

Not collected: location, contacts, files, free-text messages, health, calendar, audio. (Photos only as the optional album backup above.)

**Apple privacy "nutrition" labels**: Data Linked to You — Contact Info (email), Identifiers (user id), Purchases, User Content (names, album photos, postcards). Data Not Linked — Usage Data, Diagnostics. Tracking: only if ads are enabled (AppLovin → "Identifiers: Device ID, used for Third-Party Advertising"); otherwise "Data Not Used to Track You".
