// Rewrites the offline file list (SHELL) in sw.js from what is on disk:
// the page, styles, icons and every game module (dev tools stay out, except the flag
// the menu reads). Run after adding or removing a file: npm run sw
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const STATIC = ['./', './index.html', './css/game.css', './manifest.webmanifest', './assets/icon-180.png', './assets/icon-192.png', './assets/icon-512.png', './assets/fonts/nunito-latin.woff2', './assets/fonts/nunito-latin-ext.woff2', './assets/fonts/nunito-vietnamese.woff2'];
const mods = [];
const walk = d => { for (const f of fs.readdirSync(d).sort()) { const fp = path.join(d, f); if (fs.statSync(fp).isDirectory()) walk(fp); else if (f.endsWith('.js')) mods.push('./' + path.relative(ROOT, fp).split(path.sep).join('/')); } };
walk(path.join(ROOT, 'js'));
const shell = [...STATIC, ...mods.filter(m => !m.startsWith('./js/dev/') || m === './js/dev/flag.js')];
const file = path.join(ROOT, 'sw.js'), src = fs.readFileSync(file, 'utf8');
const out = src.replace(/const SHELL = \[[^\]]*\];/, `const SHELL = ${JSON.stringify(shell).replace(/","/g, '", "')};`);
if (out !== src) { fs.writeFileSync(file, out); console.log(`sw.js: ${shell.length} files cached for offline play`); }
else console.log(`sw.js already lists all ${shell.length} files`);
