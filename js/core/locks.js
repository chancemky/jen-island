// Who is holding the player still? Every system that takes control away does it
// under its own name (cutscene, door, seat, pet, fishing…) and gives it back under
// the same name. The player can move only when nobody holds a lock, so one system
// finishing can never hand control back while another still needs it — and one
// that forgets can be found by name (see lockNames() and the watchdog in main.js).

const since = new Map();                 // lock name → time it was first taken
export function lockInput(name) { if (!since.has(name)) since.set(name, performance.now()); }
export function releaseInput(name) { since.delete(name); }
export const inputLocked = () => since.size > 0;
export const lockNames = () => [...since.keys()];
export const lockAge = name => since.has(name) ? performance.now() - since.get(name) : 0;
