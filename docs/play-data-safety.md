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

Not collected: location, contacts, photos/files (photo mode saves on the device only), messages, health, calendar, audio.

**Apple privacy "nutrition" labels**: Data Linked to You — Contact Info (email), Identifiers (user id), Purchases, User Content (names). Data Not Linked — Usage Data, Diagnostics. Tracking: only if ads are enabled (AppLovin → "Identifiers: Device ID, used for Third-Party Advertising"); otherwise "Data Not Used to Track You".
