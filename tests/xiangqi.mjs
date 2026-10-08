// Every chess-corner puzzle is legal (nobody already in check) and has exactly one mate in one.
import { setup, matesInOne, inCheck } from '../js/core/xiangqi.js';
import fs from 'node:fs';
const src = fs.readFileSync(new URL('../js/ui/chess.js', import.meta.url), 'utf8');
const PUZZLES = JSON.parse(src.match(/export const PUZZLES = (\[[\s\S]*?\n\]);/)[1].replace(/'/g, '"').replace(/,\s*\]/g, ']'));
let bad = 0;
PUZZLES.forEach((p, i) => { const B = setup(p), m = matesInOne(B); if (inCheck(B, false) || inCheck(B, true) || m.length !== 1) { bad++; console.log(`puzzle ${i + 1} broken: ${m.length} solutions`); } });
console.log(bad ? `${bad} puzzle(s) broken` : `all ${PUZZLES.length} cờ tướng puzzles have exactly one checkmate`); process.exit(bad ? 1 : 0);
