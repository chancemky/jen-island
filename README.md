# JEN Island

A vertical Safari-first cozy Vietnamese island business game.

## Current playable slice

- Account screen (Supabase-ready; local preview fallback until environment variables are connected)
- Boat arrival cutscene
- Cat guide with typewriter dialogue and talking animation
- Player + island naming
- Guided walk to first shed and player house
- Touch joystick island movement
- Enter/exit transitions for shops and buildings
- Supermarket, material shop, furniture shop
- First shed repair flow
- Vietnamese drink stand prep + service gameplay
- Customer personalities and regular-customer tracking
- Daily special, recipe unlock/upgrade hooks, achievements
- Sleep / next-day summary
- Restaurant employee-management placeholder (employees restricted to restaurants)
- Pre-decorated Vietnamese island and endgame statue location

## Run locally

Open `index.html` directly or serve the folder with any static server.

## Supabase

Apply `supabase/migrations/001_initial.sql`, then configure the Worker bindings:

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`

The browser receives only the publishable key. Row-level security protects player data.

## Cloudflare

`cloudflare/worker.js` serves the game as a vertical web app and injects Supabase public configuration.
