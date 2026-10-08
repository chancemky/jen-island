// what Mèo Mây is wearing (bought at Cô Bông's pet shop: data/meo.js)
import { G } from './state.js';
import { MEO_STYLES } from '../data/meo.js';
export function applyMeoStyle() { if (!G.meo) return; G.meo.look = { cat: true, ...(MEO_STYLES[G.state.meoStyle]?.look || {}) }; }
