// Vietnamese forms of address. Who says "em", "chị", "cô" or "con" depends on
// the speaker's age and gender compared with the listener (you, a young adult).
// Vietnamese lines can use {me}/{Me} (how the speaker calls themself) and
// {you}/{You} (how they call you); English lines never use them.

import { G } from './state.js';
import { HAIRCUTS } from '../data/hair.js';

export function playerGender() {
  const p = G.state?.player || {};
  if (p.gender) return p.gender;
  return HAIRCUTS[p.lookOpt?.hairStyle || p.look?.hairStyle]?.g === 'm' ? 'm' : 'f';
}
const youByAge = () => (playerGender() === 'm' ? 'anh' : 'chị');   // what younger people call you
// named characters: [self, you]
const NAMED = {
  ba_tu: ['bà', 'con'], ba_sau: ['bà', 'con'], ba_nam: ['bà', 'cháu'], ba_hai: ['bà', 'cháu'], ba_ut: ['bà', 'cháu'],
  chu_hai: ['chú', 'con'], chu_bay: ['chú', 'con'], captain: ['chú', 'con'],
  co_lan: ['cô', 'con'], co_hoa: ['cô', 'con'], co_ba: ['cô', 'con'], co_bong: ['cô', 'con'],
  anh_tuan: ['anh', 'em'], anh_khoa: ['anh', 'em'], chi_mai: ['anh', 'em'], chi_tien: ['chị', 'em'],   // chi_mai is Doctor An (a man)
  linh: ['mình', 'bạn'], minh: ['mình', 'bạn'], vy: ['mình', 'bạn'],
  be_na: ['em', null],
  ong_loc: ['ông', 'con'], chi_ngoc: ['chị', 'em'], co_dua: ['cô', 'con'],
};
export function profileOf(id) {
  const p = NAMED[id]; if (!p) return null;
  return { me: p[0], you: p[1] || youByAge() };
}
// Everyone else (customers, visitors, islanders): from their age group and
// gender, compared with you — a 20-year-old.
//   kid / teen → calls themself "em", calls you anh/chị
//   peer (18–24) → mình / bạn
//   adult (25–39) → anh/chị / em
//   middle (40–59) → chú/cô / con
//   elder → ông/bà / con
export function ageProfile(age, fem) {
  switch (age) {
    case 'kid': case 'teen': return { me: 'em', you: youByAge() };
    case 'adult': return { me: fem ? 'chị' : 'anh', you: 'em' };
    case 'middle': return { me: fem ? 'cô' : 'chú', you: 'con' };
    case 'elder': return { me: fem ? 'bà' : 'ông', you: 'con' };
    default: return { me: 'mình', you: 'bạn' };
  }
}
export function customerProfile(cust) {
  const L = cust?.look || cust?.actor?.look || {}, fem = L.lashes !== undefined ? !!L.lashes || HAIRCUTS[L.hairStyle]?.g === 'f' : HAIRCUTS[L.hairStyle]?.g === 'f';
  if (cust?.resident && NAMED[cust.key?.slice(4)]) return profileOf(cust.key.slice(4));
  const age = L.age || ((L.scale || 1) < 0.9 ? 'kid' : 'peer');
  return ageProfile(age, fem);
}
const cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;
export function applyPronouns(text, prof) {
  if (!text || text.indexOf('{') < 0) return text;
  prof ||= { me: 'mình', you: 'bạn' };
  return text.replace(/\{me\}/g, prof.me).replace(/\{Me\}/g, cap(prof.me)).replace(/\{you\}/g, prof.you).replace(/\{You\}/g, cap(prof.you));
}

// What YOU say to someone: {them} = how you address them, {i} = how you call
// yourself to them (the mirror of their profile). e.g. to a grandma: "bà" / "con".
export function applyPlayerPronouns(text, prof) {
  if (!text || text.indexOf('{') < 0) return text;
  prof ||= { me: 'mình', you: 'bạn' };
  const them = prof.me === 'mình' || prof.me === 'tui' ? 'bạn' : prof.me;
  const i = prof.you === 'bạn' ? 'mình' : prof.you;
  return text.replace(/\{them\}/g, them).replace(/\{Them\}/g, cap(them)).replace(/\{i\}/g, i).replace(/\{I\}/g, cap(i));
}
