// A tiny cờ tướng (xiangqi) rules engine — enough to check moves and spot checkmate for the
// chess corner's puzzles. Board: 9 files (x 0–8) × 10 ranks (y 0–9); black starts at the top
// (y 0–4), red at the bottom (y 5–9). Pieces: { t: 'G'|'A'|'E'|'H'|'R'|'C'|'S', red: bool }.
// General (tướng) and advisors (sĩ) stay in their palace, elephants (tượng) don't cross the
// river and can be blocked at the eye, horses (mã) can be hobbled, cannons (pháo) capture over
// exactly one screen, soldiers (tốt) go sideways once over the river; the two generals may never
// face each other on an open file.
const inPalace = (x, y, red) => x >= 3 && x <= 5 && (red ? y >= 7 && y <= 9 : y >= 0 && y <= 2);
const onBoard = (x, y) => x >= 0 && x < 9 && y >= 0 && y < 10;
export const key = (x, y) => x + ',' + y;
export function pseudo(B, x, y) {
  const p = B[key(x, y)]; if (!p) return [];
  const out = [], own = (a, b) => B[key(a, b)]?.red === p.red, add = (a, b) => { if (onBoard(a, b) && !own(a, b)) out.push([a, b]); };
  if (p.t === 'G') for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { if (inPalace(x + dx, y + dy, p.red)) add(x + dx, y + dy); }
  if (p.t === 'A') for (const [dx, dy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) { if (inPalace(x + dx, y + dy, p.red)) add(x + dx, y + dy); }
  if (p.t === 'E') for (const [dx, dy] of [[2, 2], [2, -2], [-2, 2], [-2, -2]]) { const nx = x + dx, ny = y + dy; if (!onBoard(nx, ny) || B[key(x + dx / 2, y + dy / 2)] || (p.red ? ny < 5 : ny > 4)) continue; add(nx, ny); }
  if (p.t === 'H') for (const [dx, dy, lx, ly] of [[1, 2, 0, 1], [-1, 2, 0, 1], [1, -2, 0, -1], [-1, -2, 0, -1], [2, 1, 1, 0], [2, -1, 1, 0], [-2, 1, -1, 0], [-2, -1, -1, 0]]) { if (!B[key(x + lx, y + ly)]) add(x + dx, y + dy); }
  if (p.t === 'R' || p.t === 'C') for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    let nx = x + dx, ny = y + dy, jumped = false;
    while (onBoard(nx, ny)) {
      const q = B[key(nx, ny)];
      if (p.t === 'R') { if (q) { if (q.red !== p.red) out.push([nx, ny]); break; } out.push([nx, ny]); }
      else if (!jumped) { if (q) jumped = true; else out.push([nx, ny]); }
      else if (q) { if (q.red !== p.red) out.push([nx, ny]); break; }
      nx += dx; ny += dy;
    }
  }
  if (p.t === 'S') { const fwd = p.red ? -1 : 1, crossed = p.red ? y <= 4 : y >= 5; add(x, y + fwd); if (crossed) { add(x + 1, y); add(x - 1, y); } }
  return out;
}
const general = (B, red) => { for (const [k, p] of Object.entries(B)) if (p.t === 'G' && p.red === red) return k.split(',').map(Number); return null; };
function facing(B) {
  const r = general(B, true), b = general(B, false); if (!r || !b || r[0] !== b[0]) return false;
  for (let y = Math.min(r[1], b[1]) + 1; y < Math.max(r[1], b[1]); y++) if (B[key(r[0], y)]) return false;
  return true;
}
export function inCheck(B, red) {
  const g = general(B, red); if (!g) return true;
  for (const [k, p] of Object.entries(B)) { if (p.red === red) continue; const [x, y] = k.split(',').map(Number); if (pseudo(B, x, y).some(([a, b]) => a === g[0] && b === g[1])) return true; }
  return facing(B);
}
export function move(B, from, to) { const N = { ...B }; N[key(...to)] = N[key(...from)]; delete N[key(...from)]; return N; }
export function legal(B, x, y) { const p = B[key(x, y)]; if (!p) return []; return pseudo(B, x, y).filter(t => { const N = move(B, [x, y], t); return !inCheck(N, p.red) && !facing(N); }); }
export function mated(B, red) {
  if (!inCheck(B, red)) return false;
  for (const [k, p] of Object.entries(B)) { if (p.red !== red) continue; const [x, y] = k.split(',').map(Number); if (legal(B, x, y).length) return false; }
  return true;
}
// every red move that mates black at once
export function matesInOne(B) {
  const out = [];
  for (const [k, p] of Object.entries(B)) { if (!p.red) continue; const [x, y] = k.split(',').map(Number); for (const t of legal(B, x, y)) if (mated(move(B, [x, y], t), false)) out.push([[x, y], t]); }
  return out;
}
// "G4,0 r" style setup → board ('r' red / 'b' black)
export function setup(list) { const B = {}; for (const s of list) { const m = s.match(/^([GAEHRCS])(\d),(\d) ([rb])$/); B[key(+m[2], +m[3])] = { t: m[1], red: m[4] === 'r' }; } return B; }
