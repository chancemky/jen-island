// Character appearances. Named characters are fixed; visitors are generated
// deterministically from a seed so a returning regular always looks the same.

import { rng, pick } from '../core/util.js';

export const EYES = ['#8a5a40', '#4f9f7a', '#5f8fd0', '#c9803a', '#8a6ad0', '#3f6f5a'];
export const SKIN = ['#fde5d2', '#f8d6bd', '#f1c6a4', '#e3b08b', '#cf9772', '#b67e5b'];
export const HAIR = ['#4a322b', '#2f2a30', '#6e4430', '#9a6443', '#c9895b', '#8f8494', '#e59aac', '#3d3550'];
export const TOPS = ['#a9cf9a', '#f4a9b8', '#a9d4f0', '#c9b6e8', '#f7de8c', '#f8c0a0', '#9fd8c8', '#fff1dc', '#f28f7c', '#b9d7a0', '#e8b4d8', '#8fb7e0'];
export const BOTTOMS = ['#6d7fa8', '#8b6b5a', '#f4efe6', '#556b8a', '#c98f6b', '#7aa38a', '#3f4a5e', '#d8c3a5'];
export const SHOES = ['#f0e6da', '#7a5040', '#e9848f', '#5f6b86', '#f5d06a', '#fff'];
const FEMALE_HAIR = ['bob', 'long', 'twin', 'buns', 'pony', 'wavy'];
const MALE_HAIR = ['short', 'spiky', 'short'];

export const PLAYER_OPTIONS = {
  hairStyle: ['bob', 'short', 'long', 'buns', 'pony', 'spiky', 'twin', 'wavy'],
  hair: HAIR,
  top: ['#a9cf9a', '#f4a9b8', '#a9d4f0', '#c9b6e8', '#f7de8c', '#f8c0a0', '#9fd8c8', '#f28f7c'],
  skin: SKIN,
  eyeCol: EYES,
};

export function playerLook(opt = {}) {
  return {
    skin: opt.skin || SKIN[1], hair: opt.hair || HAIR[0], hairStyle: opt.hairStyle || 'bob',
    top: opt.top || '#a9cf9a', topStyle: 'hoodie', sleeve: 0.9, bottom: '#6d7fa8', bottomLen: 1.5, shoe: '#f0e6da',
    lashes: ['bob', 'long', 'buns', 'pony', 'twin', 'wavy'].includes(opt.hairStyle || 'bob'), accent: '#f28fa3', eyeCol: opt.eyeCol || '#4f9f7a',
  };
}

// Fixed island residents.
export const RESIDENTS = {
  ba_tu: { name: 'Bà Tư', role: 'Retired fruit seller', look: { skin: '#f1c6a4', eyeCol: '#8a5a40', hair: '#b9b3ba', hairStyle: 'granny', top: '#c9b6e8', topStyle: 'shirt', bottom: '#5f5a78', bottomLen: 5, shoe: '#7a5040', scale: 0.94, glasses: '#8a6a5a' }, personality: 'patient' },
  chu_hai: { name: 'Chú Hải', role: 'Fisherman', look: { skin: '#cf9772', eyeCol: '#3f6f5a', hair: '#2f2a30', hairStyle: 'short', top: '#8fb7e0', topStyle: 'stripe', top2: '#fff', bottom: '#8b6b5a', bottomLen: 3, shoe: '#5f6b86', hat: 'nonla', hatColor: '#efd69a' }, personality: 'regular' },
  linh: { name: 'Linh', role: 'University student', look: { skin: '#fde5d2', eyeCol: '#5f8fd0', hair: '#3d3550', hairStyle: 'twin', top: '#f4a9b8', topStyle: 'tee', bottom: '#f4efe6', bottomLen: 2, shoe: '#e9848f', lashes: true, backpack: '#9fd8c8' }, personality: 'excited' },
  minh: { name: 'Minh', role: 'Photographer', look: { skin: '#e3b08b', eyeCol: '#8a5a40', hair: '#4a322b', hairStyle: 'spiky', top: '#f7de8c', topStyle: 'tee', bottom: '#556b8a', bottomLen: 3, shoe: '#fff', camera: true, hat: 'cap', hatColor: '#f28f7c' }, personality: 'rushed' },
  co_lan: { name: 'Cô Lan', role: 'Florist', look: { skin: '#f8d6bd', eyeCol: '#4f9f7a', hair: '#2f2a30', hairStyle: 'long', top: '#f8c0a0', topStyle: 'aodai', bottom: '#fff', bottomLen: 5, shoe: '#f0e6da', lashes: true, flower: '#ff8fb0' }, personality: 'picky' },
  be_na: { name: 'Bé Na', role: 'Kid who loves chè', look: { skin: '#fde5d2', eyeCol: '#c9803a', hair: '#6e4430', hairStyle: 'buns', top: '#f7de8c', topStyle: 'dress', bottom: '#f7de8c', shoe: '#e9848f', scale: 0.8, lashes: true }, personality: 'excited' },
  anh_tuan: { name: 'Anh Tuấn', role: 'Scooter taxi driver', look: { skin: '#e3b08b', eyeCol: '#8a6ad0', hair: '#2f2a30', hairStyle: 'short', top: '#9fd8c8', topStyle: 'shirt', bottom: '#3f4a5e', bottomLen: 5, shoe: '#7a5040', hat: 'bucket', hatColor: '#7aa38a' }, personality: 'regular' },
  chi_mai: { name: 'Chị Mai', role: 'Island postwoman', look: { skin: '#f1c6a4', eyeCol: '#8a5a40', hair: '#4a322b', hairStyle: 'pony', top: '#a9cf9a', topStyle: 'shirt', bottom: '#6d7fa8', bottomLen: 5, shoe: '#f0e6da', lashes: true, lanyard: '#f28f7c', accent: '#f7de8c' }, personality: 'rushed' },
};
// Shopkeepers.
export const MERCHANTS = {
  co_hoa: { name: 'Cô Hoa', role: 'Supermarket owner', look: { skin: '#f8d6bd', eyeCol: '#8a5a40', hair: '#4a322b', hairStyle: 'buns', top: '#f28f7c', topStyle: 'tee', apron: '#fff1dc', bottom: '#556b8a', bottomLen: 5, shoe: '#f0e6da', lashes: true } },
  chu_bay: { name: 'Chú Bảy', role: 'Material shop', look: { skin: '#cf9772', eyeCol: '#4f9f7a', hair: '#6e4430', hairStyle: 'short', top: '#f7de8c', topStyle: 'shirt', apron: '#8b6b5a', bottom: '#3f4a5e', bottomLen: 5, shoe: '#7a5040', hat: 'cap', hatColor: '#e9848f' } },
  anh_khoa: { name: 'Anh Khoa', role: 'Furniture maker', look: { skin: '#f1c6a4', eyeCol: '#8a5a40', hair: '#9a6443', hairStyle: 'spiky', top: '#9fd8c8', topStyle: 'tee', apron: '#c98f6b', bottom: '#8b6b5a', bottomLen: 5, shoe: '#5f6b86', glasses: '#5b3f36' } },
  ba_sau: { name: 'Bà Sáu', role: 'Night market elder', look: { skin: '#e3b08b', eyeCol: '#5f8fd0', hair: '#c9c2c6', hairStyle: 'granny', top: '#f28f7c', topStyle: 'aodai', bottom: '#2f2a30', bottomLen: 5, shoe: '#7a5040', scale: 0.93 } },
  captain: { name: 'Thuyền trưởng Vũ', role: 'Ferry captain', look: { skin: '#cf9772', eyeCol: '#3f6f5a', hair: '#2f2a30', hairStyle: 'short', top: '#fff1dc', topStyle: 'shirt', bottom: '#3f4a5e', bottomLen: 5, shoe: '#2f2a30', hat: 'cap', hatColor: '#3f4a5e' } },
};

export const MEO_LOOK = { cat: true, scale: 1 };

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
  return L;
}

export const STAFF_OUTFIT = { apron: '#fff6e6', top: '#f28f7c', topStyle: 'tee' };
export function employeeLook(seed, role) {
  const L = visitorLook(seed, 'regular');
  delete L.backpack; delete L.camera; delete L.lanyard; delete L.flower; delete L.tote; delete L.surf; delete L.guitar; delete L.suitcase; L.scale = 1;
  L.top = role === 'cook' ? '#fff6e6' : '#f28f7c'; L.topStyle = 'tee'; L.apron = role === 'cook' ? '#f7d6c0' : '#fff6e6';
  if (role === 'cook') { L.hat = 'chef'; } else if (role === 'cleaner') { L.hat = 'bandana'; L.hatColor = '#8fb7e0'; } else { L.hat = null; }
  return L;
}
