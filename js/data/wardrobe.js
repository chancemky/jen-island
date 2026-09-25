// Clothes from Cô Ba's boutique. Three slots: an outfit (top + bottom),
// a hat and an accessory. Each item is a set of overrides on the player's
// base look (skin, hair and eyes never change). Some need a higher level.

export const SLOTS = [
  { id: 'outfit', en: 'Outfits', vi: 'Trang phục' },
  { id: 'hat', en: 'Hats', vi: 'Mũ nón' },
  { id: 'extra', en: 'Accessories', vi: 'Phụ kiện' },
];

export const CLOTHES = {
  // ---- outfits
  classic:      { slot: 'outfit', price: 0,   en: 'My Own Hoodie', vi: 'Áo hoodie của mình', look: {} }, // the look chosen at the start
  sunny_tee:    { slot: 'outfit', price: 60,  en: 'Sunny Tee', vi: 'Áo thun nắng', look: { top: '#f7de8c', topStyle: 'tee', sleeve: 0.5, bottom: '#556b8a', bottomLen: 2, shoe: '#fff' } },
  peach_tee:    { slot: 'outfit', price: 60,  en: 'Peach Tee & Shorts', vi: 'Áo thun đào & quần short', look: { top: '#f8c0a0', topStyle: 'tee', sleeve: 0.5, bottom: '#f4efe6', bottomLen: 1.5, shoe: '#e9848f' } },
  sailor:       { slot: 'outfit', price: 90,  en: 'Sailor Stripes', vi: 'Áo sọc thủy thủ', look: { top: '#fff', top2: '#6f9fc8', topStyle: 'stripe', sleeve: 0.6, bottom: '#3f4a5e', bottomLen: 3, shoe: '#fff' } },
  floral:       { slot: 'outfit', price: 110, en: 'Island Flower Shirt', vi: 'Áo hoa đi biển', look: { top: '#8fd6c8', top2: '#fff4b8', topStyle: 'floral', sleeve: 0.5, bottom: '#f4efe6', bottomLen: 1.5, shoe: '#f5d06a' } },
  pink_floral:  { slot: 'outfit', price: 110, en: 'Hibiscus Shirt', vi: 'Áo hoa dâm bụt', look: { top: '#f4a9b8', top2: '#fff', topStyle: 'floral', sleeve: 0.5, bottom: '#6d7fa8', bottomLen: 1.5, shoe: '#fff' } },
  school:       { slot: 'outfit', price: 120, en: 'School Uniform', vi: 'Đồng phục học sinh', look: { top: '#fffaf0', topStyle: 'shirt', sleeve: 0.5, bottom: '#3f4a5e', bottomLen: 3, shoe: '#2f2a30', scarf: '#e8584e' } },
  pleated:      { slot: 'outfit', price: 130, en: 'Pleated Skirt Set', vi: 'Bộ chân váy xếp ly', look: { top: '#fffaf0', topStyle: 'shirt', sleeve: 0.5, bottom: '#556b8a', skirt: true, bottomLen: 0, shoe: '#2f2a30', scarf: '#6f9fc8' } },
  lemon_dress:  { slot: 'outfit', price: 150, en: 'Lemon Sundress', vi: 'Váy chanh vàng', look: { top: '#f7de8c', bottom: '#f7de8c', topStyle: 'dress', sleeve: 0, shoe: '#fff' } },
  mint_dress:   { slot: 'outfit', price: 150, en: 'Mint Sundress', vi: 'Váy bạc hà', look: { top: '#9fd8c8', bottom: '#9fd8c8', topStyle: 'dress', sleeve: 0, shoe: '#f0e6da' } },
  lilac_dress:  { slot: 'outfit', price: 160, en: 'Lilac Dress', vi: 'Váy tím oải hương', look: { top: '#c9b6e8', bottom: '#c9b6e8', topStyle: 'dress', sleeve: 0.4, shoe: '#e9848f' } },
  beach_tank:   { slot: 'outfit', price: 80,  en: 'Beach Tank', vi: 'Áo ba lỗ đi biển', look: { top: '#6fbfb0', topStyle: 'tee', sleeve: 0, bottom: '#f7de8c', bottomLen: 1.5, shoe: '#f5d06a' } },
  cafe:         { slot: 'outfit', price: 140, en: 'Café Apron', vi: 'Tạp dề quán cà phê', look: { top: '#fffaf0', topStyle: 'shirt', sleeve: 0.5, bottom: '#3f4a5e', bottomLen: 5, apron: '#8b6b5a', shoe: '#7a5040' } },
  chef:         { slot: 'outfit', price: 180, lv: 4, en: 'Chef Whites', vi: 'Đồ đầu bếp', look: { top: '#fffaf0', topStyle: 'shirt', sleeve: 0.9, bottom: '#2f2a30', bottomLen: 5, apron: '#fff6e6', shoe: '#2f2a30' } },
  fisher:       { slot: 'outfit', price: 120, en: 'Fisher Stripes', vi: 'Áo sọc ngư dân', look: { top: '#8fb7e0', top2: '#fff', topStyle: 'stripe', sleeve: 0.5, bottom: '#8b6b5a', bottomLen: 3, shoe: '#5f6b86' } },
  raincoat:     { slot: 'outfit', price: 160, lv: 5, en: 'Yellow Raincoat', vi: 'Áo mưa vàng', look: { top: '#ffd35a', topStyle: 'hoodie', sleeve: 1, bottom: '#556b8a', bottomLen: 5, shoe: '#e8584e' } },
  night_hoodie: { slot: 'outfit', price: 170, lv: 5, en: 'Night Market Hoodie', vi: 'Hoodie Chợ Đêm', look: { top: '#3d3550', topStyle: 'hoodie', sleeve: 1, bottom: '#2f2a30', bottomLen: 5, shoe: '#f0e6da', scarf: '#e8584e' } },
  pajamas:      { slot: 'outfit', price: 140, lv: 5, en: 'Cloud Pajamas', vi: 'Đồ ngủ đám mây', look: { top: '#dfe8ff', top2: '#fff', topStyle: 'stripe', sleeve: 1, bottom: '#dfe8ff', bottomLen: 5, shoe: '#fff' } },
  aodai_pink:   { slot: 'outfit', price: 260, lv: 6, en: 'Pink Áo Dài', vi: 'Áo dài hồng', look: { top: '#f4a9b8', topStyle: 'aodai', sleeve: 1, bottom: '#fff', bottomLen: 5, shoe: '#f0e6da' } },
  aodai_blue:   { slot: 'outfit', price: 260, lv: 6, en: 'Sky Áo Dài', vi: 'Áo dài xanh trời', look: { top: '#8fb7e0', topStyle: 'aodai', sleeve: 1, bottom: '#fff', bottomLen: 5, shoe: '#f0e6da' } },
  aodai_white:  { slot: 'outfit', price: 280, lv: 8, en: 'Student Áo Dài', vi: 'Áo dài trắng', look: { top: '#fffaf0', topStyle: 'aodai', sleeve: 1, bottom: '#fffaf0', bottomLen: 5, shoe: '#f0e6da' } },
  aodai_red:    { slot: 'outfit', price: 380, lv: 10, en: 'Festival Red Áo Dài', vi: 'Áo dài đỏ lễ hội', look: { top: '#e8584e', topStyle: 'aodai', sleeve: 1, bottom: '#ffd35a', bottomLen: 5, shoe: '#f5d06a' } },
  sporty:       { slot: 'outfit', price: 150, lv: 7, en: 'Morning Jog Set', vi: 'Bộ chạy bộ buổi sáng', look: { top: '#f28f7c', topStyle: 'tee', sleeve: 0, bottom: '#3f4a5e', bottomLen: 2, shoe: '#fff', lanyard: null } },
  farmer:       { slot: 'outfit', price: 130, lv: 7, en: 'Paddy Farmer', vi: 'Đồ nông dân', look: { top: '#b9d7a0', topStyle: 'shirt', sleeve: 0.9, bottom: '#8b6b5a', bottomLen: 3, shoe: '#7a5040' } },
  denim:        { slot: 'outfit', price: 200, lv: 9, en: 'Denim Day', vi: 'Ngày denim', look: { top: '#8fb7e0', topStyle: 'shirt', sleeve: 0.9, bottom: '#556b8a', bottomLen: 5, shoe: '#fff' } },
  gala:         { slot: 'outfit', price: 600, lv: 14, en: 'Gala Night Dress', vi: 'Váy dạ tiệc', look: { top: '#3d3550', bottom: '#3d3550', topStyle: 'dress', sleeve: 0, shoe: '#ffd35a', scarf: '#ffd35a' } },
  captain:      { slot: 'outfit', price: 520, lv: 12, en: 'Ferry Captain', vi: 'Thuyền trưởng', look: { top: '#fffaf0', topStyle: 'shirt', sleeve: 0.9, bottom: '#3f4a5e', bottomLen: 5, shoe: '#2f2a30', scarf: '#6f9fc8' } },
  tycoon:       { slot: 'outfit', price: 1500, lv: 20, en: 'Island Tycoon Suit', vi: 'Vest ông chủ đảo', look: { top: '#2f2a30', topStyle: 'shirt', sleeve: 1, bottom: '#2f2a30', bottomLen: 5, shoe: '#7a5040', scarf: '#e8584e' } },
  // ---- hats
  no_hat:       { slot: 'hat', price: 0, en: 'No hat', vi: 'Không đội mũ', look: { hat: null } },
  nonla:        { slot: 'hat', price: 70,  en: 'Nón Lá', vi: 'Nón lá', look: { hat: 'nonla', hatColor: '#efd69a' } },
  cap_red:      { slot: 'hat', price: 50,  en: 'Red Cap', vi: 'Mũ lưỡi trai đỏ', look: { hat: 'cap', hatColor: '#f28f7c' } },
  cap_blue:     { slot: 'hat', price: 50,  en: 'Blue Cap', vi: 'Mũ lưỡi trai xanh', look: { hat: 'cap', hatColor: '#6f9fc8' } },
  bucket_mint:  { slot: 'hat', price: 60,  en: 'Mint Bucket Hat', vi: 'Mũ tai bèo bạc hà', look: { hat: 'bucket', hatColor: '#9fd8c8' } },
  bucket_sand:  { slot: 'hat', price: 60,  en: 'Sand Bucket Hat', vi: 'Mũ tai bèo màu cát', look: { hat: 'bucket', hatColor: '#f3dcae' } },
  sunhat:       { slot: 'hat', price: 110, en: 'Ribbon Sun Hat', vi: 'Mũ rộng vành nơ', look: { hat: 'sunhat', hatColor: '#f3dcae', hatRibbon: '#f28f7c' } },
  sunhat_blue:  { slot: 'hat', price: 120, lv: 6, en: 'Seaside Sun Hat', vi: 'Mũ rộng vành biển', look: { hat: 'sunhat', hatColor: '#fff1dc', hatRibbon: '#6fbfb0' } },
  bandana:      { slot: 'hat', price: 40,  en: 'Bandana', vi: 'Khăn bandana', look: { hat: 'bandana', hatColor: '#e8584e' } },
  flower_crown: { slot: 'hat', price: 90,  lv: 4, en: 'Flower Hairpin', vi: 'Kẹp tóc hoa', look: { hat: null, flower: '#ff8fb0' } },
  chef_hat:     { slot: 'hat', price: 100, lv: 4, en: 'Chef Hat', vi: 'Mũ đầu bếp', look: { hat: 'chef' } },
  helmet:       { slot: 'hat', price: 140, lv: 8, en: 'Scooter Helmet', vi: 'Mũ bảo hiểm', look: { hat: 'helmet', hatColor: '#f7de8c' } },
  // ---- accessories
  no_extra:     { slot: 'extra', price: 0, en: 'Nothing', vi: 'Không có', look: {} },
  backpack:     { slot: 'extra', price: 90,  en: 'Mint Backpack', vi: 'Ba lô bạc hà', look: { backpack: '#9fd8c8' } },
  backpack_pk:  { slot: 'extra', price: 90,  en: 'Pink Backpack', vi: 'Ba lô hồng', look: { backpack: '#f4a9b8' } },
  tote:         { slot: 'extra', price: 60,  en: 'Canvas Tote', vi: 'Túi vải', look: { tote: '#fff5df' } },
  camera:       { slot: 'extra', price: 220, lv: 5, en: 'Film Camera', vi: 'Máy ảnh phim', look: { camera: true } },
  glasses:      { slot: 'extra', price: 120, en: 'Round Glasses', vi: 'Kính tròn', look: { glasses: '#5b3f36' } },
  scarf:        { slot: 'extra', price: 80,  en: 'Cozy Scarf', vi: 'Khăn quàng', look: { scarf: '#f28f7c' } },
  lanyard:      { slot: 'extra', price: 50,  en: 'Staff Lanyard', vi: 'Dây đeo thẻ', look: { lanyard: '#f28f7c' } },
  guitar:       { slot: 'extra', price: 420, lv: 9, en: 'Little Guitar', vi: 'Đàn ghi-ta nhỏ', look: { guitar: true } },
  surfboard:    { slot: 'extra', price: 480, lv: 11, en: 'Surfboard', vi: 'Ván lướt sóng', look: { surf: '#6fbfb0' } },
};
export const FREE_CLOTHES = ['classic', 'no_hat', 'no_extra'];

// Build the look to draw: base look + the worn outfit, hat and accessory.
export function applyOutfit(base, wardrobe) {
  const w = wardrobe || {};
  const L = { ...base };
  for (const slot of ['outfit', 'hat', 'extra']) {
    const it = CLOTHES[w[slot]]; if (!it) continue;
    Object.assign(L, it.look);
  }
  if (L.topStyle === 'dress') L.bottom = L.top;
  delete L._c;
  return L;
}
