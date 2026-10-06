// Copies the game into www/ for the App Store / Google Play builds (Capacitor's webDir).
// Run through `npm run app` (copy + `npx cap sync`), then open ios/ or android/.
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), OUT = path.join(ROOT, 'www');
const COPY = ['index.html', 'privacy.html', 'terms.html', 'manifest.webmanifest', 'version.json', 'css', 'js', 'assets'];   // (no sw.js: the app carries its files)
fs.rmSync(OUT, { recursive: true, force: true });
for (const f of COPY) fs.cpSync(path.join(ROOT, f), path.join(OUT, f), { recursive: true });
console.log('www/ ready:', COPY.join(', '));
