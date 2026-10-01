// Run before the real launch (npm run check:launch, or npm run deploy:launch which deploys only if it passes).
// Fails while the dev tools are switched on, so a testing build can't go out as the release.
import fs from 'node:fs';
const flag = fs.readFileSync(new URL('../js/dev/flag.js', import.meta.url), 'utf8');
const on = /export const DEV_TOOLS\s*=\s*true/.test(flag);
if (on) { console.error('✗ DEV_TOOLS is still true in js/dev/flag.js — set it to false before launch.'); process.exit(1); }
console.log('✓ dev tools are off: OK to launch.');
