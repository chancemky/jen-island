// Character appearances. Named characters are fixed; visitors are generated
// deterministically from a seed so a returning regular always looks the same.

import { rng, pick } from '../core/util.js';
import { HAIRCUTS } from './hair.js';
import { T } from '../systems/state.js';

const EYES = ['#8a5a40', '#4f9f7a', '#5f8fd0', '#c9803a', '#8a6ad0', '#3f6f5a'];
const SKIN = ['#fde5d2', '#f8d6bd', '#f1c6a4', '#e3b08b', '#cf9772', '#b67e5b'];
const HAIR = ['#4a322b', '#2f2a30', '#6e4430', '#9a6443', '#c9895b', '#8f8494', '#e59aac', '#3d3550'];
const TOPS = ['#a9cf9a', '#f4a9b8', '#a9d4f0', '#c9b6e8', '#f7de8c', '#f8c0a0', '#9fd8c8', '#fff1dc', '#f28f7c', '#b9d7a0', '#e8b4d8', '#8fb7e0'];
const BOTTOMS = ['#6d7fa8', '#8b6b5a', '#f4efe6', '#556b8a', '#c98f6b', '#7aa38a', '#3f4a5e', '#d8c3a5'];
const SHOES = ['#f0e6da', '#7a5040', '#e9848f', '#5f6b86', '#f5d06a', '#fff'];
const FEMALE_HAIR = Object.keys(HAIRCUTS).filter(k => HAIRCUTS[k].g === 'f');
const MALE_HAIR = Object.keys(HAIRCUTS).filter(k => HAIRCUTS[k].g === 'm' && k !== 'bald');
const isFemCut = id => HAIRCUTS[id]?.g === 'f';

export const PLAYER_OPTIONS = {
  hairStyle: ['bob', 'long', 'pony', 'lob', 'curtain', 'highpony', 'wavy', 'buns', 'short', 'quiff', 'curtains', 'messy', 'crop', 'spiky'],
  hair: HAIR,
  top: ['#a9cf9a', '#f4a9b8', '#a9d4f0', '#c9b6e8', '#f7de8c', '#f8c0a0', '#9fd8c8', '#f28f7c'],
  skin: SKIN,
  eyeCol: EYES,
};

export function playerLook(opt = {}) {
  return {
    skin: opt.skin || SKIN[1], hair: opt.hair || HAIR[0], hairStyle: opt.hairStyle || 'bob',
    top: opt.top || '#a9cf9a', topStyle: 'hoodie', sleeve: 0.9, bottom: '#6d7fa8', bottomLen: 1.5, shoe: '#f0e6da',
    lashes: opt.gender ? opt.gender === 'f' : isFemCut(opt.hairStyle || 'bob'), accent: '#f28fa3', eyeCol: opt.eyeCol || '#4f9f7a',
  };
}

// Fixed island residents.
export const RESIDENTS = {
  ba_tu: { name: 'Bà Tư', role: 'Retired fruit seller', look: { skin: '#f1c6a4', eyeCol: '#8a5a40', hair: '#b9b3ba', hairStyle: 'granny', top: '#c9b6e8', topStyle: 'shirt', bottom: '#5f5a78', bottomLen: 5, shoe: '#7a5040', scale: 0.94, glasses: '#8a6a5a' }, personality: 'patient' },
  chu_hai: { name: 'Chú Hải', role: 'Fisherman', look: { skin: '#cf9772', eyeCol: '#3f6f5a', hair: '#2f2a30', hairStyle: 'crew', top: '#8fb7e0', topStyle: 'stripe', top2: '#fff', bottom: '#8b6b5a', bottomLen: 3, shoe: '#5f6b86', hat: 'nonla', hatColor: '#efd69a' }, personality: 'regular' },
  linh: { name: 'Linh', role: 'University student', look: { skin: '#fde5d2', eyeCol: '#5f8fd0', hair: '#3d3550', hairStyle: 'braids', top: '#f4a9b8', topStyle: 'tee', bottom: '#f4efe6', bottomLen: 2, shoe: '#e9848f', lashes: true, backpack: '#9fd8c8' }, personality: 'excited' },
  minh: { name: 'Minh', role: 'Photographer', look: { skin: '#e3b08b', eyeCol: '#8a5a40', hair: '#4a322b', hairStyle: 'messy', top: '#f7de8c', topStyle: 'tee', bottom: '#556b8a', bottomLen: 3, shoe: '#fff', camera: true, hat: 'cap', hatColor: '#f28f7c' }, personality: 'rushed' },
  co_lan: { name: 'Cô Lan', role: 'Florist', look: { skin: '#f8d6bd', eyeCol: '#4f9f7a', hair: '#2f2a30', hairStyle: 'sidepart', top: '#f8c0a0', topStyle: 'aodai', bottom: '#fff', bottomLen: 5, shoe: '#f0e6da', lashes: true, flower: '#ff8fb0' , tote: '#f4a9b8' }, personality: 'picky' },
  be_na: { name: 'Bé Na', role: 'Kid who loves chè', look: { skin: '#fde5d2', eyeCol: '#c9803a', hair: '#6e4430', hairStyle: 'buns', top: '#f7de8c', topStyle: 'dress', bottom: '#f7de8c', shoe: '#e9848f', scale: 0.8, lashes: true }, personality: 'excited' },
  anh_tuan: { name: 'Anh Tuấn', role: 'Scooter taxi driver', look: { skin: '#e3b08b', eyeCol: '#8a6ad0', hair: '#2f2a30', hairStyle: 'crop', top: '#9fd8c8', topStyle: 'shirt', bottom: '#3f4a5e', bottomLen: 5, shoe: '#7a5040', hat: 'bucket', hatColor: '#7aa38a' }, personality: 'regular' },
  chi_mai: { get name() { return T('Doctor An', 'Bác sĩ An'); }, role: 'Island doctor', look: { skin: '#f1c6a4', eyeCol: '#8a5a40', hair: '#2f2a30', hairStyle: 'gentpart', top: '#a9d4f0', topStyle: 'shirt', coat: '#fdfdfb', steth: true, bottom: '#3f4a5e', bottomLen: 5, shoe: '#5f4a40', glasses: '#5b3f36', badge: '#3fae5c' }, personality: 'rushed' },
};
// Harbour Town, Coconut Cove and Firefly Islet folks appear once their bridge is built.
RESIDENTS.ong_loc = { name: 'Ông Lộc', role: 'Net-mender & old harbour master', region: 'harbourBridge', look: { skin: '#c98f6a', eyeCol: '#5a4a3a', hair: '#e6e2dc', hairStyle: 'crew', top: '#6f8fa8', topStyle: 'shirt', bottom: '#5f5a52', bottomLen: 3, shoe: '#6b5040', scale: 0.96, glasses: '#6a5a4a', tote: '#b98a5a' }, personality: 'patient' };
RESIDENTS.chi_ngoc = { name: 'Chị Ngọc', role: 'Runs the harbour guesthouse', region: 'harbourBridge', look: { skin: '#f1c6a4', eyeCol: '#6a4a3a', hair: '#2f2a30', hairStyle: 'messybun', top: '#f7de8c', topStyle: 'shirt', bottom: '#6d7fa8', bottomLen: 4, shoe: '#fff', lashes: true, lanyard: '#e8584e' }, personality: 'excited' };
// newcomers who move in as the island grows (systems/npc.js: arrive)
RESIDENTS.anh_bao = { name: 'Anh Bảo', role: 'Boat builder, back from Sài Gòn', region: 'harbourBridge', arrive: s => (s.story.chapter || 1) >= 13, look: { skin: '#d9a07a', eyeCol: '#3f2f2a', hair: '#2f2a30', hairStyle: 'messy', top: '#6f9fc8', topStyle: 'tee', bottom: '#5f5a50', bottomLen: 4, shoe: '#8a5a3a', apron: '#c9a26a' }, personality: 'regular' };
RESIDENTS.co_thu = { name: 'Cô Thu', role: 'Retired teacher', region: 'harbourBridge', arrive: s => (s.story.chapter || 1) >= 16, look: { skin: '#f1c6a4', eyeCol: '#5a4a40', hair: '#9a9298', hairStyle: 'granny', top: '#e9a0a8', topStyle: 'aodai', bottom: '#fff6ea', bottomLen: 5, shoe: '#c9955e', glasses: '#6b5a50', lashes: true, scale: 0.95 }, personality: 'patient' };
RESIDENTS.co_dua = { name: 'Cô Dừa', role: 'Coconut seller at the cove', region: 'coveBridge', look: { skin: '#d9a07a', eyeCol: '#4f3a2a', hair: '#3a2a26', hairStyle: 'long', top: '#9fd8c8', topStyle: 'floral', top2: '#fff', bottom: '#e9c46f', bottomLen: 4, shoe: '#c9955e', lashes: true, hat: 'nonla', hatColor: '#efd69a', tote: '#c9a26a' }, personality: 'regular' };
RESIDENTS.vy = { name: 'Vy', role: 'Painter', islet: true, region: 'bridgeFixed', look: { skin: '#fde5d2', eyeCol: '#8a5a40', hair: '#4a322b', hairStyle: 'frenchbob', top: '#9fd8c8', topStyle: 'tee', bottom: '#556b8a', bottomLen: 3, shoe: '#fff', lashes: true, hat: 'bucket', hatColor: '#3f4a5e' }, personality: 'excited' };
// Shopkeepers.
export const MERCHANTS = {
  co_hoa: { name: 'Cô Hoa', role: 'Supermarket owner', look: { skin: '#f8d6bd', eyeCol: '#8a5a40', hair: '#4a322b', hairStyle: 'messybun', top: '#f28f7c', topStyle: 'tee', apron: '#6fbf73', badge: '#e8584e', bottom: '#556b8a', bottomLen: 5, shoe: '#f0e6da', lashes: true } },
  chu_bay: { name: 'Chú Bảy', role: 'Material shop', look: { skin: '#cf9772', eyeCol: '#4f9f7a', hair: '#6e4430', hairStyle: 'crew', top: '#f7de8c', topStyle: 'shirt', apron: '#8b6b5a', toolbelt: true, bottom: '#3f4a5e', bottomLen: 5, shoe: '#7a5040', hat: 'helmet', hatColor: '#f5c542' } },
  anh_khoa: { name: 'Anh Khoa', role: 'Furniture maker', look: { skin: '#f1c6a4', eyeCol: '#8a5a40', hair: '#9a6443', hairStyle: 'manbun', top: '#9fd8c8', topStyle: 'tee', apron: '#c98f6b', toolbelt: true, bottom: '#8b6b5a', bottomLen: 5, shoe: '#5f6b86', glasses: '#5b3f36' } },
  ba_sau: { name: 'Bà Sáu', role: 'Night market elder', look: { skin: '#e3b08b', eyeCol: '#5f8fd0', hair: '#c9c2c6', hairStyle: 'granny', top: '#f28f7c', topStyle: 'aodai', bottom: '#2f2a30', bottomLen: 5, shoe: '#7a5040', scale: 0.93 } },
  co_ba: { name: 'Cô Ba', role: 'Tailor & boutique owner', look: { skin: '#f8d6bd', eyeCol: '#8a5a40', hair: '#6e4430', hairStyle: 'curtain', top: '#fff', topStyle: 'dress', bottom: '#fff', bottomLen: 5, shoe: '#f0e6da', lashes: true, tape: true, necklace: '#fff' } },
  chi_tien: { name: 'Chị Tiên', role: 'Hair stylist', look: { skin: '#f8d6bd', eyeCol: '#8a6ad0', hair: '#e59aac', hairStyle: 'shag', top: '#2f2a30', topStyle: 'tee', apron: '#2f2a30', comb: true, bottom: '#3f4a5e', bottomLen: 5, shoe: '#fff', lashes: true, glasses: '#5b3f36' } },
  co_bong: { name: 'Cô Bông', role: 'Pet shop owner', look: { skin: '#f1c6a4', eyeCol: '#4f9f7a', hair: '#9a6443', hairStyle: 'messybun', top: '#f7de8c', topStyle: 'tee', apron: '#f2a14e', badge: '#f08ca0', bottom: '#556b8a', bottomLen: 5, shoe: '#e9848f', lashes: true, glasses: '#8a6a5a' } },
  captain: { name: 'Thuyền trưởng Vũ', role: 'Ferry captain', look: { skin: '#cf9772', eyeCol: '#3f6f5a', hair: '#2f2a30', hairStyle: 'gentpart', top: '#fff1dc', topStyle: 'shirt', bottom: '#3f4a5e', bottomLen: 5, shoe: '#2f2a30', hat: 'cap', hatColor: '#fffdf6', badge: '#f2c14e', top2: '#3f4a5e' } },
};

const TOURIST_EXTRAS = ['backpack', 'camera', 'hat'];
export function visitorLook(seed, personality = 'patient') {
  const r = rng(seed * 7919 + 13);
  const fem = r() < 0.55;
  const L = {
    skin: pick(r, SKIN), hair: pick(r, HAIR.slice(0, 6)), hairStyle: fem ? pick(r, FEMALE_HAIR) : pick(r, MALE_HAIR),
    top: pick(r, TOPS), topStyle: pick(r, ['tee', 'tee', 'hoodie', 'shirt', 'stripe', 'floral', fem ? 'dress' : 'tee']),
    bottom: pick(r, BOTTOMS), bottomLen: pick(r, [1.5, 2, 3, 5]), shoe: pick(r, SHOES), lashes: fem && r() < 0.8,
    top2: pick(r, ['#fff', '#fff4b8', '#ffd6e0']), accent: pick(r, ['#f28fa3', '#f7de8c', '#9fd8c8']), eyeCol: pick(r, EYES),
  };
  if (L.topStyle === 'dress') L.bottom = L.top;
  if (fem && L.topStyle !== 'dress' && r() < 0.35) { L.skirt = true; L.bottomLen = 0; }
  if (r() < 0.18 && L.topStyle === 'tee') { L.topStyle = 'tank'; L.sleeve = 0; }
  if (r() < 0.22) L.tote = pick(r, ['#fff5df', '#f7de8c', '#9fd8c8', '#f4a9b8', '#c9b6e8']);
  if (r() < 0.12) L.glasses = '#5b3f36';
  if (personality === 'tourist') {
    const ex = pick(r, TOURIST_EXTRAS);
    if (ex === 'backpack') L.backpack = pick(r, ['#9fd8c8', '#f4a9b8', '#f7de8c', '#8fb7e0']);
    if (ex === 'camera') L.camera = true;
    if (ex === 'hat' || r() < 0.3) { L.hat = pick(r, ['bucket', 'cap', 'nonla', 'sunhat', 'sunhat']); L.hatColor = pick(r, ['#f7de8c', '#fff1dc', '#f28f7c', '#9fd8c8', '#efd69a', '#f3dcae']); L.hatRibbon = pick(r, ['#f28f7c', '#6fbfb0', '#f4a9b8']); }
    if (L.topStyle === 'tee' && r() < 0.5) L.topStyle = 'floral';
    const gear = r();
    if (gear < 0.12) L.surf = pick(r, ['#6fbfb0', '#f28f7c', '#f7de8c', '#8fb7e0']);
    else if (gear < 0.2) L.guitar = true;
    else if (gear < 0.38) L.suitcase = pick(r, ['#f28f7c', '#8fb7e0', '#f7de8c', '#c9b6e8']);
  } else if (r() < 0.12) { L.hat = 'nonla'; L.hatColor = '#efd69a'; }
  if (personality === 'rushed' && r() < 0.5) L.lanyard = '#6d7fa8';
  if (r() < 0.12 && fem && !L.hat) L.flower = pick(r, ['#ff8fb0', '#fff', '#ffd35a']);
  if (r() < 0.15) L.scale = 0.82; // a kid
  // age group (you are 20): decides how they address you in Vietnamese
  const ag = r();
  L.age = L.scale < 0.9 ? 'kid' : ag < 0.12 ? 'teen' : ag < 0.5 ? 'peer' : ag < 0.8 ? 'adult' : ag < 0.95 ? 'middle' : 'elder';
  if (L.age === 'middle' && r() < 0.35) L.hair = '#8f8494';                    // a little grey
  if (L.age === 'elder') { L.hair = pick(r, ['#c9c2c6', '#b9b3ba', '#dcd6da']); if (fem && r() < 0.6) L.hairStyle = 'granny'; }
  return L;
}

export function employeeLook(seed, role) {
  const L = visitorLook(seed, 'regular');
  delete L.backpack; delete L.camera; delete L.lanyard; delete L.flower; delete L.tote; delete L.surf; delete L.guitar; delete L.suitcase; L.scale = 1;
  if (L.age === 'kid' || L.age === 'teen') L.age = 'peer'; else if (L.age === 'elder') L.age = 'middle';   // staff are grown-ups of working age
  L.top = role === 'cook' ? '#fff6e6' : '#f28f7c'; L.topStyle = 'tee'; L.apron = role === 'cook' ? '#f7d6c0' : '#fff6e6';
  if (role === 'cook') { L.hat = 'chef'; } else if (role === 'cleaner') { L.hat = 'bandana'; L.hatColor = '#8fb7e0'; } else { L.hat = null; }
  if (role === 'manager') { L.top = '#3f6f8f'; L.topStyle = 'shirt'; L.apron = null; }
  // every job reads at a glance: the cashier's name badge, the prep cook's bandana
  if (role === 'cashier') { L.top = '#8fcfc0'; L.lanyard = '#f2c14e'; L.apron = null; }
  if (role === 'prep') { L.top = '#f7de8c'; L.hat = 'bandana'; L.hatColor = '#e8584e'; }
  return L;
}

// a look small enough to share (leaderboard rows): no cached drawings, at most ~1.8 KB
export function slimLook(look) {
  if (!look) return null;
  const out = {};
  for (const [k, v] of Object.entries(look)) if (k[0] !== '_' && v != null && typeof v !== 'function' && typeof v !== 'object') out[k] = v;
  for (const [k, v] of Object.entries(look)) if (k[0] !== '_' && v && typeof v === 'object' && !(v instanceof HTMLElement) && JSON.stringify(v).length < 300) out[k] = v;
  return JSON.stringify(out).length <= 1800 ? out : null;
}
