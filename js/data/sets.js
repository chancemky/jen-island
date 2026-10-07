// Furniture sets: place every piece of a set in your home and it's complete — a badge-like
// ribbon in the furniture shop and the "home comfort" bonus: you start each day rested,
// +2% tips for each complete set (up to +8%). Placed pieces only (stored ones don't count).
export const SETS = {
  seaside:  { en: 'Seaside Cabin', vi: 'Nhà Biển', pieces: ['surfboard_rack', 'hammock', 'fishtank', 'ship_model'] },
  tet:      { en: 'Tết at Home', vi: 'Tết Sum Vầy', pieces: ['mai_tree', 'lantern_red', 'tea_set', 'painting'] },
  cafe:     { en: 'Late-Night Café', vi: 'Cà Phê Đêm', pieces: ['neon_sign', 'fairy_lights', 'record_player', 'armchair', 'moon_lamp'] },
  cats:     { en: 'Cat Palace', vi: 'Lâu Đài Mèo', pieces: ['cat_tower', 'cat_bed', 'meo_plush'] },
  study:    { en: 'Quiet Study', vi: 'Góc Học Tập', pieces: ['bookshelf', 'lamp_table', 'telescope', 'clock'] },
  game:     { en: 'Game Room', vi: 'Phòng Giải Trí', pieces: ['arcade_cabinet', 'bean_bag', 'tv', 'radio'] },
};
export function setProgress(home) {
  const placed = new Set((home?.furniture || []).map(f => f.id));
  return Object.entries(SETS).map(([id, s]) => ({ id, ...s, have: s.pieces.filter(p => placed.has(p)).length, done: s.pieces.every(p => placed.has(p)) }));
}
export const comfortBonus = home => Math.min(0.08, setProgress(home).filter(s => s.done).length * 0.02);
