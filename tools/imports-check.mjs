// Checks every `import { a, b as c } from './x.js'` in js/ against what ./x.js actually exports,
// so a renamed or removed export can't leave a module that fails to load (ESLint's no-undef
// doesn't see this). Run: node tools/imports-check.mjs (part of npm run lint).
import fs from 'node:fs'; import path from 'node:path';
const ROOT = path.resolve('js'), files = [];
(function walk(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else if (f.endsWith('.js')) files.push(p); } })(ROOT);
const exportsOf = new Map();
function exp(file) {
  if (exportsOf.has(file)) return exportsOf.get(file);
  const src = fs.readFileSync(file, 'utf8'), names = new Set();
  for (const m of src.matchAll(/export\s+(?:async\s+)?(?:function\*?|const|let|var|class)\s+([A-Za-z_$][\w$]*)/g)) names.add(m[1]);
  // export const A = 1, B = [2, 3], C = f(x, y); — every top-level name in the statement
  for (const m of src.matchAll(/export\s+(?:const|let|var)\s+/g)) {
    let i = m.index + m[0].length, depth = 0, start = i;
    for (; i < src.length; i++) {
      const ch = src[i];
      if ('([{'.includes(ch)) depth++; else if (')]}'.includes(ch)) depth--;
      else if (ch === "'" || ch === '"' || ch === '`') { const q = ch; for (i++; i < src.length && src[i] !== q; i++) if (src[i] === '\\') i++; }
      else if (depth === 0 && (ch === ',' || ch === ';' || ch === '\n')) { const n = src.slice(start, i).match(/^\s*([A-Za-z_$][\w$]*)\s*=/); if (n) names.add(n[1]); if (ch !== ',') break; start = i + 1; }
    }
  }
  for (const m of src.matchAll(/export\s*\{([^}]*)\}/g)) for (const part of m[1].split(',')) { const n = part.trim().split(/\s+as\s+/).pop(); if (n) names.add(n); }
  if (/export\s+default/.test(src)) names.add('default');
  exportsOf.set(file, names); return names;
}
let bad = 0;
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  for (const m of src.matchAll(/import\s*\{([^}]*)\}\s*from\s*['"](\.[^'"]+)['"]/g)) {
    const target = path.resolve(path.dirname(f), m[2]); if (!fs.existsSync(target)) { console.log(`${path.relative('.', f)}: missing module ${m[2]}`); bad++; continue; }
    const have = exp(target);
    for (const part of m[1].split(',')) { const n = part.trim().split(/\s+as\s+/)[0]; if (n && !have.has(n)) { console.log(`${path.relative('.', f)}: ${m[2]} has no export "${n}"`); bad++; } }
  }
}
if (bad) { console.log(`${bad} broken import(s)`); process.exit(1); } else console.log(`imports ok (${files.length} files)`);
