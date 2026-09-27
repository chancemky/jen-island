// Who is holding the player still? Every system that takes control away does it
// under its own name (cutscene, door, seat, pet, fishing…) and gives it back under
// the same name. The player can move only when nobody holds a lock, so one system
// finishing can never hand control back while another still needs it — and one
// that forgets can be found by name (see lockNames() and the watchdog in main.js).

const locks = new Map();                 // name → count
const since = new Map();                 // name → time the lock was first taken
export function lockInput(name) {
  locks.set(name, (locks.get(name) || 0) + 1);
  if (!since.has(name)) since.set(name, performance.now());
}
export function unlockInput(name) {
  const n = locks.get(name) || 0;
  if (n <= 1) { locks.delete(name); since.delete(name); } else locks.set(name, n - 1);
}
// drop a lock completely, whatever its count (used by cleanup paths)
export function releaseInput(name) { locks.delete(name); since.delete(name); }
export const inputLocked = () => locks.size > 0;
export const isLocked = name => locks.has(name);
export const lockNames = () => [...locks.keys()];
export const lockAge = name => since.has(name) ? performance.now() - since.get(name) : 0;
export function clearAllLocks(reason) {
  if (locks.size) console.warn('[input] clearing stuck locks:', lockNames().join(', '), reason ? `(${reason})` : '');
  locks.clear(); since.clear();
}
