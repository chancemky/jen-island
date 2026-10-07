// Runs test suites side by side, each in its own process (and browser), then prints each
// suite's output in order. node tests/parallel.mjs [quick|all|suite,suite…]
// Exits 1 when any suite reports a problem.
import { spawn } from 'node:child_process';
import os from 'node:os';

const ALL = ['content', 'save', 'economy', 'ui', 'clock', 'features', 'story', 'quests', 'world', 'stability', 'render'];
const QUICK = ['content', 'save', 'economy', 'ui', 'clock', 'features'];
const arg = process.argv[2] || 'quick';
const suites = arg === 'quick' ? QUICK : arg === 'all' ? ALL : arg.split(',');
const width = Math.max(2, Math.min(suites.length, Math.floor(os.cpus().length / 2) || 2));
const t0 = Date.now(), results = new Array(suites.length);
let next = 0;
function runOne(i) {
  return new Promise(res => {
    const p = spawn(process.execPath, ['tests/run.mjs', suites[i]], { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = ''; p.stdout.on('data', d => out += d); p.stderr.on('data', d => out += d);
    p.on('close', code => { results[i] = { out, code }; process.stdout.write(`${code ? '✗' : '✓'} ${suites[i]} (${((Date.now() - t0) / 1000).toFixed(0)}s)\n`); res(); });
  });
}
async function worker() { while (next < suites.length) await runOne(next++); }
await Promise.all(Array.from({ length: width }, worker));
console.log('');
for (const [i, r] of results.entries()) { const lines = r.out.split('\n').filter(l => l.trim() && l.trim() !== 'all good'); console.log(lines.join('\n')); if (r.code && !/✗/.test(r.out)) console.log(`  ✗ ${suites[i]}: exited with code ${r.code}`); }
const bad = results.filter(r => r.code).length;
console.log(`\n${bad ? `${bad} suite(s) failed` : 'all good'} · ${suites.length} suites in ${((Date.now() - t0) / 1000).toFixed(0)}s on ${width} workers`);
process.exit(bad ? 1 : 0);
