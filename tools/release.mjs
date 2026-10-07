// Bump every version marker at once: node tools/release.mjs 5.5.4 "Title EN" "Title VI" "item en|item vi" ...
// Adds the changelog entry on top, sets APP_VERSION, version.json, package.json and the service worker cache.
import fs from 'node:fs';
const [v, en, vi, ...items] = process.argv.slice(2);
if (!/^\d+\.\d+\.\d+$/.test(v || '') || !en || !vi || !items.length) { console.error('usage: release.mjs <v> <title en> <title vi> "<en>|<vi>" ...'); process.exit(1); }
const q = s => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
let cl = fs.readFileSync('js/data/changelog.js', 'utf8');
const entry = `  {\n    v: '${v}', date: '${new Date().toISOString().replace(/\.\d+Z$/, 'Z')}',\n    title: [${q(en)}, ${q(vi)}],\n    items: [\n${items.map(i => { const [a, b] = i.split('|'); return `      [${q(a)}, ${q(b)}],`; }).join('\n')}\n    ],\n  },\n`;
cl = cl.replace(/APP_VERSION = '[^']+'/, `APP_VERSION = '${v}'`).replace('export const CHANGELOG = [\n', m => m + entry);
fs.writeFileSync('js/data/changelog.js', cl);
fs.writeFileSync('version.json', JSON.stringify({ v }) + '\n');
const p = JSON.parse(fs.readFileSync('package.json', 'utf8')); p.version = v; fs.writeFileSync('package.json', JSON.stringify(p, null, 2) + '\n');
let sw = fs.readFileSync('sw.js', 'utf8'); sw = sw.replace(/jen-island-v(\d+)/, (_, n) => `jen-island-v${+n + 1}`); fs.writeFileSync('sw.js', sw);
console.log('released', v);
