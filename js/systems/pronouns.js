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
  anh_tuan: ['anh', 'em'], anh_khoa: ['anh', 'em'], chi_mai: ['chị', 'em'], chi_tien: ['chị', 'em'],
  linh: ['mình', 'bạn'], minh: ['mình', 'bạn'], vy: ['mình', 'bạn'],
  be_na: ['em', null],
};
export function profileOf(id) {
  const p = NAMED[id]; if (!p) return null;
  return { me: p[0], you: p[1] || youByAge() };
}
// customers: from how they look (a child, a fellow young person, or someone a bit older)
export function customerProfile(cust) {
  const L = cust?.look || cust?.actor?.look || {}, fem = HAIRCUTS[L.hairStyle]?.g === 'f' || !!L.lashes;
  if (cust?.resident && NAMED[cust.key?.slice(4)]) return profileOf(cust.key.slice(4));
  if ((L.scale || 1) < 0.9) return { me: 'em', you: youByAge() };
  if (cust?.personality === 'tourist') return { me: 'mình', you: 'bạn' };
  if (cust?.personality === 'picky' || cust?.personality === 'patient') return { me: fem ? 'chị' : 'anh', you: 'em' };
  return { me: 'em', you: youByAge() };                               // younger regulars, rushed and excited folks
}
const cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;
export function applyPronouns(text, prof) {
  if (!text || text.indexOf('{') < 0) return text;
  prof ||= { me: 'mình', you: 'bạn' };
  return text.replace(/\{me\}/g, prof.me).replace(/\{Me\}/g, cap(prof.me)).replace(/\{you\}/g, prof.you).replace(/\{You\}/g, cap(prof.you));
}
