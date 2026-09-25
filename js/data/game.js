// Static game data. Money is in thousands of đồng ("k").

// ---------------------------------------------------------------- ingredients
// pack: portions per purchase. prep: raw → prepared form made at the prep table.
export const INGREDIENTS = {
  tea:            { vi: 'Trà',           en: 'Tea leaves',      price: 10, pack: 8 },
  kumquat:        { vi: 'Tắc',           en: 'Kumquats',        price: 12, pack: 6, prep: { to: 'kumquat_cut', method: 'chop', verb: 'Slice' } },
  sugar:          { vi: 'Đường',         en: 'Sugar syrup',     price: 6,  pack: 12 },
  ice:            { vi: 'Đá',            en: 'Ice',             price: 5,  pack: 12 },
  coffee:         { vi: 'Cà phê',        en: 'Phin coffee',     price: 18, pack: 8 },
  condensed_milk: { vi: 'Sữa đặc',       en: 'Condensed milk',  price: 15, pack: 8 },
  milk:           { vi: 'Sữa tươi',      en: 'Fresh milk',      price: 12, pack: 8 },
  peach:          { vi: 'Đào',           en: 'Peaches',         price: 20, pack: 6, prep: { to: 'peach_cut', method: 'chop', verb: 'Slice' } },
  peach_syrup:    { vi: 'Siro đào',      en: 'Peach syrup',     price: 14, pack: 8 },
  avocado:        { vi: 'Bơ',            en: 'Avocados',        price: 24, pack: 4, prep: { to: 'avocado_cut', method: 'scoop', verb: 'Scoop' } },
  tapioca:        { vi: 'Trân châu',     en: 'Tapioca pearls',  price: 12, pack: 8 },
  jelly:          { vi: 'Thạch',         en: 'Grass jelly',     price: 10, pack: 8 },
  cheese_foam:    { vi: 'Kem cheese',    en: 'Cheese foam',     price: 18, pack: 8 },
  bread:          { vi: 'Bánh mì',       en: 'Baguettes',       price: 15, pack: 6, prep: { to: 'bread_split', method: 'split', verb: 'Split' } },
  pate:           { vi: 'Pa tê',         en: 'Pâté',            price: 15, pack: 8 },
  pork:           { vi: 'Thịt heo',      en: 'Pork',            price: 30, pack: 6, prep: { to: 'pork_grilled', method: 'grill', verb: 'Grill' } },
  pickles:        { vi: 'Đồ chua',       en: 'Pickled carrot & daikon', price: 10, pack: 8 },
  cucumber:       { vi: 'Dưa leo',       en: 'Cucumber',        price: 8,  pack: 6, prep: { to: 'cucumber_cut', method: 'chop', verb: 'Slice' } },
  cilantro:       { vi: 'Ngò',           en: 'Cilantro',        price: 6,  pack: 8 },
  egg:            { vi: 'Trứng',         en: 'Eggs',            price: 12, pack: 6, prep: { to: 'egg_fried', method: 'fry', verb: 'Fry' } },
  chili:          { vi: 'Ớt',            en: 'Chili',           price: 5,  pack: 10 },
  rice_paper:     { vi: 'Bánh tráng',    en: 'Rice paper',      price: 10, pack: 10 },
  shrimp:         { vi: 'Tôm',           en: 'Shrimp',          price: 36, pack: 6, prep: { to: 'shrimp_cooked', method: 'boil', verb: 'Boil' } },
  noodles:        { vi: 'Bún / Bánh phở',en: 'Rice noodles',    price: 10, pack: 8 },
  herbs:          { vi: 'Rau thơm',      en: 'Fresh herbs',     price: 8,  pack: 8 },
  batter:         { vi: 'Bột bánh xèo',  en: 'Bánh xèo batter', price: 12, pack: 6 },
  sprouts:        { vi: 'Giá',           en: 'Bean sprouts',    price: 6,  pack: 8 },
  fish_sauce:     { vi: 'Nước mắm',      en: 'Fish sauce',      price: 12, pack: 12 },
  rice:           { vi: 'Cơm tấm',       en: 'Broken rice',     price: 10, pack: 8 },
  broth:          { vi: 'Nước dùng phở', en: 'Phở broth',       price: 30, pack: 8 },
  broth_spicy:    { vi: 'Nước dùng Huế', en: 'Spicy Huế broth', price: 34, pack: 8 },
  beef:           { vi: 'Thịt bò',       en: 'Beef',            price: 45, pack: 6, prep: { to: 'beef_sliced', method: 'chop', verb: 'Slice' } },
  lime:           { vi: 'Chanh',         en: 'Limes',           price: 8,  pack: 8, prep: { to: 'lime_cut', method: 'chop', verb: 'Cut' } },
  scallion:       { vi: 'Hành lá',       en: 'Scallions',       price: 5,  pack: 10, prep: { to: 'scallion_oil', method: 'fry', verb: 'Fry' } },
  beans:          { vi: 'Đậu',           en: 'Sweet beans',     price: 10, pack: 8 },
  coconut_milk:   { vi: 'Nước cốt dừa',  en: 'Coconut cream',   price: 12, pack: 8 },
};
export const PREPPED = {};
const CUT_EN = { kumquat_cut: 'Sliced kumquat', peach_cut: 'Sliced peach', avocado_cut: 'Scooped avocado', bread_split: 'Split baguette', pork_grilled: 'Grilled pork', cucumber_cut: 'Sliced cucumber', egg_fried: 'Fried egg', shrimp_cooked: 'Cooked shrimp', beef_sliced: 'Sliced beef', lime_cut: 'Lime wedges', scallion_oil: 'Scallion oil' };
const CUT_VI = { kumquat_cut: 'Tắc cắt', peach_cut: 'Đào cắt', avocado_cut: 'Bơ nạo', bread_split: 'Bánh mì xẻ', pork_grilled: 'Thịt nướng', cucumber_cut: 'Dưa leo cắt', egg_fried: 'Trứng chiên', shrimp_cooked: 'Tôm luộc', beef_sliced: 'Bò thái', lime_cut: 'Chanh cắt', scallion_oil: 'Mỡ hành' };
for (const [id, g] of Object.entries(INGREDIENTS)) if (g.prep) PREPPED[g.prep.to] = { from: id, vi: CUT_VI[g.prep.to] || g.vi, en: g.en + ' (prepped)', enCut: CUT_EN[g.prep.to] || g.en, method: g.prep.method };
export const PREP_VERB = { chop: ['Slice', 'Cắt'], split: ['Split', 'Xẻ'], scoop: ['Scoop', 'Nạo'], grill: ['Grill', 'Nướng'], fry: ['Fry', 'Chiên'], boil: ['Boil', 'Luộc'] };
export const PREP_BATCH = 4;
import { T } from '../systems/state.js';
export function ingName(id) { const g = INGREDIENTS[id] || PREPPED[id]; if (!g) return id; return PREPPED[id] ? T(g.enCut, g.vi) : T(g.en, g.vi); }
export const matName = id => T(MATERIALS[id].en, MATERIALS[id].vi);
export const recipeName = id => T(RECIPES[id].en, RECIPES[id].vi);
export const bizName = id => T(BUSINESSES[id].en, BUSINESSES[id].name);
export const stationLabel = k => T(STATION[k].en || STATION[k].label, STATION[k].label);
export const furnName = id => T(FURNITURE[id].en, FURNITURE[id].vi);

// ---------------------------------------------------------------- materials
export const MATERIALS = {
  wood:    { vi: 'Gỗ',      en: 'Wood planks',    price: 8 },
  metal:   { vi: 'Tôn',     en: 'Metal sheets',   price: 14 },
  paint:   { vi: 'Sơn',     en: 'Paint',          price: 18 },
  tile:    { vi: 'Ngói',    en: 'Roof tiles',     price: 12, unlock: 4 },
  lantern: { vi: 'Lồng đèn',en: 'Silk lanterns',  price: 16, unlock: 5 },
  cable:   { vi: 'Dây đèn', en: 'Light strings',  price: 40, unlock: 5 },
};

// ---------------------------------------------------------------- recipes
// Each step is a station button id. The player must tap them in order.
// Station buttons map to the stock they consume.
export const STATION = {
  // drinks
  tea:            { label: 'Trà', en: 'Tea',        icon: 'tea',            uses: 'tea',            layer: { color: '#e9a24a', h: 0.66 } },
  coffee:         { label: 'Cà phê', en: 'Coffee',     icon: 'coffee',         uses: 'coffee',         layer: { color: '#5e3a28', h: 0.5 } },
  condensed_milk: { label: 'Sữa đặc', en: 'Cond. milk',    icon: 'condensed_milk', uses: 'condensed_milk', layer: { color: '#f4ead2', h: 0.24 } },
  milk:           { label: 'Sữa', en: 'Milk',        icon: 'milk',           uses: 'milk',           layer: { color: '#f3e7d6', h: 0.3, swirl: true } },
  peach_syrup:    { label: 'Siro đào', en: 'Peach syrup',   icon: 'peach_syrup',    uses: 'peach_syrup',    layer: { color: '#f7a868', h: 0.2 } },
  kumquat_cut:    { label: 'Tắc', en: 'Kumquat',        icon: 'kumquat_cut',    uses: 'kumquat_cut',    bits: 'kumquat' },
  peach_cut:      { label: 'Đào', en: 'Peach',        icon: 'peach_cut',      uses: 'peach_cut',      bits: 'peach' },
  avocado_cut:    { label: 'Bơ', en: 'Avocado',         icon: 'avocado_cut',    uses: 'avocado_cut',    layer: { color: '#c5e08a', h: 0.55 } },
  lime_cut:       { label: 'Chanh', en: 'Lime',      icon: 'lime_cut',       uses: 'lime_cut',       bits: 'lime' },
  blend:          { label: 'Xay', en: 'Blend',        icon: 'blend',          action: true },
  // bánh mì
  bread_split:    { label: 'Bánh mì', en: 'Baguette',    icon: 'bread_split',    uses: 'bread_split' },
  pate:           { label: 'Pa tê', en: 'Pâté',      icon: 'pate',           uses: 'pate' },
  pork_grilled:   { label: 'Thịt nướng', en: 'Grilled pork', icon: 'pork_grilled',   uses: 'pork_grilled' },
  egg_fried:      { label: 'Trứng', en: 'Egg',      icon: 'egg_fried',      uses: 'egg_fried' },
  pickles:        { label: 'Đồ chua', en: 'Pickles',    icon: 'pickles',        uses: 'pickles' },
  cucumber_cut:   { label: 'Dưa leo', en: 'Cucumber',    icon: 'cucumber_cut',   uses: 'cucumber_cut' },
  cilantro:       { label: 'Ngò', en: 'Cilantro',        icon: 'cilantro',       uses: 'cilantro' },
  // truck / restaurant / night
  rice_paper:     { label: 'Bánh tráng', en: 'Rice paper', icon: 'rice_paper',     uses: 'rice_paper' },
  noodles:        { label: 'Bún', en: 'Noodles',        icon: 'noodles',        uses: 'noodles' },
  herbs:          { label: 'Rau', en: 'Herbs',        icon: 'herbs',          uses: 'herbs' },
  shrimp_cooked:  { label: 'Tôm', en: 'Shrimp',        icon: 'shrimp_cooked',  uses: 'shrimp_cooked' },
  roll:           { label: 'Cuốn', en: 'Roll',       icon: 'roll',           action: true },
  batter:         { label: 'Đổ bột', en: 'Batter',     icon: 'batter',         uses: 'batter' },
  sprouts:        { label: 'Giá', en: 'Sprouts',        icon: 'sprouts',        uses: 'sprouts' },
  fold:           { label: 'Gấp', en: 'Fold',        icon: 'fold',           action: true },
  beef_sliced:    { label: 'Bò', en: 'Beef',         icon: 'beef_sliced',    uses: 'beef_sliced' },
  broth:          { label: 'Nước dùng', en: 'Broth',  icon: 'broth',          uses: 'broth' },
  broth_spicy:    { label: 'Nước Huế', en: 'Huế broth',   icon: 'broth_spicy',    uses: 'broth_spicy' },
  lime_wedge:     { label: 'Chanh', en: 'Lime',      icon: 'lime_cut',       uses: 'lime_cut' },
  rice:           { label: 'Cơm', en: 'Rice',        icon: 'rice',           uses: 'rice' },
  fish_sauce:     { label: 'Nước mắm', en: 'Fish sauce',   icon: 'fish_sauce',     uses: 'fish_sauce' },
  beans:          { label: 'Đậu', en: 'Beans',        icon: 'beans',          uses: 'beans' },
  jelly:          { label: 'Thạch', en: 'Jelly',      icon: 'jelly',          uses: 'jelly', bits: 'jelly' },
  coconut_milk:   { label: 'Nước cốt dừa', en: 'Coconut', icon: 'coconut_milk', uses: 'coconut_milk', layer: { color: '#fffaf0', h: 0.2 } },
  scallion_oil:   { label: 'Mỡ hành', en: 'Scallion oil',    icon: 'scallion_oil',   uses: 'scallion_oil' },
  grill:          { label: 'Nướng', en: 'Grill',      icon: 'grill',          action: true },
};
// Order options that live outside the step sequence (tap anytime).
export const OPTIONS = {
  size:    { label: 'Size', en: 'Size', values: ['S', 'M', 'L'], price: { S: 0.85, M: 1, L: 1.25 } },
  sugar:   { label: 'Đường', en: 'Sugar', values: [30, 50, 70, 100], uses: 'sugar' },
  ice:     { label: 'Đá', en: 'Ice', values: ['không đá', 'ít đá', 'đá bình thường'], short: ['none', 'less', 'normal'], uses: 'ice',
             btn: { 'không đá': ['None', 'Không'], 'ít đá': ['Less', 'Ít'], 'đá bình thường': ['Normal', 'Thường'] },
             say: { 'không đá': ['no ice', 'không đá'], 'ít đá': ['less ice', 'ít đá'], 'đá bình thường': ['normal ice', 'đá bình thường'] } },
  topping: { label: 'Topping', en: 'Topping', values: ['none', 'tapioca', 'jelly', 'cheese_foam'], names: { none: 'không topping', tapioca: 'trân châu', jelly: 'thạch', cheese_foam: 'foam cheese' },
             btn: { none: ['None', 'Không'], tapioca: ['Tapioca', 'Trân châu'], jelly: ['Jelly', 'Thạch'], cheese_foam: ['Foam', 'Foam'] },
             say: { none: ['no topping', 'không topping'], tapioca: ['tapioca pearls', 'trân châu'], jelly: ['grass jelly', 'thạch'], cheese_foam: ['cheese foam', 'foam cheese'] } },
  chili:   { label: 'Ớt', en: 'Chili', values: ['không ớt', 'có ớt'], uses: 'chili', btn: { 'không ớt': ['No', 'Không'], 'có ớt': ['Yes', 'Có ớt'] }, say: { 'không ớt': ['no chili', 'không ớt'], 'có ớt': ['with chili', 'có ớt'] } },
};

export const RECIPES = {
  tra_tac:        { vi: 'Trà tắc', en: 'Kumquat Iced Tea', blurbVi: 'Trà tắc chua ngọt mát lạnh. Góc phố nào ở Việt Nam cũng có.', biz: 'drinks', price: 15, vessel: 'cup', steps: ['tea', 'kumquat_cut'], options: ['size', 'sugar', 'ice'], icon: 'drink:tra_tac', chapter: 2,
                    blurb: 'Sweet-tart kumquat tea over ice. Every street corner in Việt Nam has one.' },
  ca_phe_sua_da:  { vi: 'Cà phê sữa đá', en: 'Iced Milk Coffee', blurbVi: 'Sữa đặc trước, rồi cà phê phin nhỏ giọt. Đủ đậm để đánh thức cả hòn đảo buồn ngủ.', biz: 'drinks', price: 20, vessel: 'cup', steps: ['condensed_milk', 'coffee'], options: ['size', 'ice'], icon: 'drink:ca_phe_sua_da', chapter: 3,
                    blurb: 'Condensed milk first, then slow-dripped phin coffee. Strong enough to wake a sleepy island.' },
  tra_dao:        { vi: 'Trà đào', en: 'Peach Tea', blurbVi: 'Trà với siro đào và những miếng đào mềm. Du khách mê lắm.', biz: 'drinks', price: 25, vessel: 'cup', steps: ['tea', 'peach_syrup', 'peach_cut'], options: ['size', 'sugar', 'ice'], icon: 'drink:tra_dao', chapter: 3, needRep: 30,
                    blurb: 'Tea with peach syrup and soft peach slices. Tourists love it.' },
  tra_sua:        { vi: 'Trà sữa', en: 'Milk Tea', blurbVi: 'Trà sữa béo ngậy với topping tùy khách chọn.', biz: 'drinks', price: 28, vessel: 'cup', steps: ['tea', 'milk'], options: ['size', 'sugar', 'ice', 'topping'], icon: 'drink:tra_sua', chapter: 4,
                    blurb: 'Creamy milk tea with a topping of your customer\'s choice.' },
  sinh_to_bo:     { vi: 'Sinh tố bơ', en: 'Avocado Smoothie', blurbVi: 'Bơ xay với sữa đặc và đá. Món tráng miệng giả làm đồ uống.', biz: 'drinks', price: 30, vessel: 'cup', steps: ['avocado_cut', 'condensed_milk', 'blend'], options: ['size', 'ice'], icon: 'drink:sinh_to_bo', chapter: 4, needRep: 70,
                    blurb: 'Avocado blended with condensed milk and ice. Dessert pretending to be a drink.' },
  banh_mi_thit:   { vi: 'Bánh mì thịt', en: 'Grilled Pork Bánh Mì', blurbVi: 'Bánh mì giòn rụm, pa tê, thịt nướng, đồ chua, dưa leo và ngò.', biz: 'banhmi', price: 25, vessel: 'bread', steps: ['bread_split', 'pate', 'pork_grilled', 'pickles', 'cucumber_cut', 'cilantro'], options: ['chili'], icon: 'banh_mi_thit', chapter: 3,
                    blurb: 'Crackly baguette, pâté, grilled pork, pickles, cucumber and cilantro.' },
  banh_mi_trung:  { vi: 'Bánh mì trứng', en: 'Egg Bánh Mì', blurbVi: 'Trứng chiên kẹp trong ổ bánh mì nóng. Bữa sáng của cả đảo.', biz: 'banhmi', price: 20, vessel: 'bread', steps: ['bread_split', 'egg_fried', 'pickles', 'cucumber_cut', 'cilantro'], options: ['chili'], icon: 'banh_mi_trung', chapter: 3, needRep: 40,
                    blurb: 'A fried egg tucked in warm bread. The island breakfast.' },
  goi_cuon:       { vi: 'Gỏi cuốn', en: 'Fresh Spring Rolls', blurbVi: 'Bánh tráng cuốn bún, rau thơm và tôm hồng.', biz: 'truck', price: 30, vessel: 'plate', steps: ['rice_paper', 'noodles', 'herbs', 'shrimp_cooked', 'roll'], options: [], icon: 'goi_cuon', chapter: 4,
                    blurb: 'Rice paper rolled around noodles, herbs and pink shrimp.' },
  banh_xeo:       { vi: 'Bánh xèo', en: 'Sizzling Crêpe', blurbVi: 'Tên món lấy từ tiếng “xèo!” khi bột chạm chảo.', biz: 'truck', price: 35, vessel: 'pan', steps: ['batter', 'shrimp_cooked', 'sprouts', 'fold', 'herbs'], options: [], icon: 'banh_xeo', chapter: 4, needRep: 90,
                    blurb: 'Named for the sizzle ("xèo!") the batter makes when it hits the pan.' },
  banh_trang_nuong:{ vi: 'Bánh tráng nướng', en: 'Grilled Rice Paper', blurbVi: '“Pizza Việt Nam” — bánh tráng nướng than với trứng và mỡ hành.', biz: 'night', price: 25, vessel: 'grill', steps: ['rice_paper', 'egg_fried', 'scallion_oil', 'grill'], options: ['chili'], icon: 'banh_trang_nuong', chapter: 5,
                    blurb: '"Vietnamese pizza" — rice paper grilled over charcoal with egg and scallion oil.' },
  che_ba_mau:     { vi: 'Chè ba màu', en: 'Three-Colour Sweet Soup', blurbVi: 'Từng lớp đậu, thạch và nước cốt dừa trên đá bào.', biz: 'night', price: 20, vessel: 'glass', steps: ['beans', 'jelly', 'coconut_milk'], options: ['ice'], icon: 'che', chapter: 5,
                    blurb: 'Layers of beans, jelly and coconut cream over crushed ice.' },
  pho_bo:         { vi: 'Phở bò', en: 'Beef Phở', blurbVi: 'Bánh phở mềm, thịt bò thái mỏng và nước dùng ninh cả đêm.', biz: 'restaurant', price: 50, vessel: 'bowl', steps: ['noodles', 'beef_sliced', 'broth', 'herbs', 'lime_wedge'], options: [], icon: 'pho_bo', chapter: 6,
                    blurb: 'Silky noodles, thin beef and a broth that simmered all night.' },
  bun_bo_hue:     { vi: 'Bún bò Huế', en: 'Spicy Huế Noodle Soup', blurbVi: 'Sả, ớt và nước dùng đỏ tự hào từ cố đô.', biz: 'restaurant', price: 55, vessel: 'bowl', steps: ['noodles', 'beef_sliced', 'broth_spicy', 'herbs', 'lime_wedge'], options: [], icon: 'bun_bo_hue', chapter: 6, needRep: 200,
                    blurb: 'Lemongrass, chili and a proud red broth from the old capital.' },
  com_tam:        { vi: 'Cơm tấm', en: 'Broken Rice Plate', blurbVi: 'Cơm tấm, sườn nướng, trứng chiên và nước mắm chua ngọt.', biz: 'restaurant', price: 45, vessel: 'plate', steps: ['rice', 'pork_grilled', 'egg_fried', 'pickles', 'fish_sauce'], options: [], icon: 'com_tam', chapter: 6,
                    blurb: 'Broken rice, grilled pork chop, a fried egg and sweet fish sauce.' },
  bun_thit_nuong: { vi: 'Bún thịt nướng', en: 'Grilled Pork Vermicelli', blurbVi: 'Bún mát, thịt nướng thơm và rau, chan nước chấm.', biz: 'restaurant', price: 45, vessel: 'bowl', steps: ['noodles', 'pork_grilled', 'herbs', 'pickles', 'fish_sauce'], options: [], icon: 'bun_thit_nuong', chapter: 6, needRep: 240,
                    blurb: 'Cool noodles, smoky pork and herbs, dressed with sweet dipping sauce.' },
};
export const RECIPE_UPGRADES = [
  null,
  { cost: 0 },
  { cost: 80, price: 1.15, patience: 1.1, tip: 1.1, label: 'Better ingredients', labelVi: 'Nguyên liệu tốt hơn' },
  { cost: 220, price: 1.3, patience: 1.2, tip: 1.25, label: 'Signature presentation', labelVi: 'Trình bày đặc sắc' },
];

// ---------------------------------------------------------------- businesses
export const BUSINESSES = {
  shed1: { kind: 'shed', biz: 'drinks', name: 'Quán Nước', en: 'Drink Stand', interior: 'shed1',
           repair: { wood: 12, metal: 3, paint: 2 }, queueMax: 3,
           upgrades: [null, null, { cost: 180, mats: { wood: 8, paint: 2 }, label: 'Striped awning & lanterns', labelVi: 'Mái hiên sọc & lồng đèn', queue: 4, attract: 1.25 }, { cost: 420, mats: { tile: 10, wood: 6 }, label: 'Tiled roof & string lights', labelVi: 'Mái ngói & dây đèn', queue: 5, attract: 1.5, price: 1.1 }] },
  shed2: { kind: 'shed', biz: 'banhmi', name: 'Bánh Mì Góc Phố', en: 'Bánh Mì Corner', interior: 'shed2', chapter: 3,
           repair: { wood: 16, metal: 4, paint: 3 }, queueMax: 3,
           upgrades: [null, null, { cost: 220, mats: { wood: 8, paint: 2 }, label: 'Striped awning & lanterns', labelVi: 'Mái hiên sọc & lồng đèn', queue: 4, attract: 1.25 }, { cost: 480, mats: { tile: 10, wood: 6 }, label: 'Tiled roof & string lights', labelVi: 'Mái ngói & dây đèn', queue: 5, attract: 1.5, price: 1.1 }] },
  truck: { kind: 'truck', biz: 'truck', name: 'Xe Cuốn', en: 'Roll Truck', interior: 'truck', chapter: 4, buy: 600, queueMax: 4,
           upgrades: [null, null, { cost: 350, mats: { paint: 4, metal: 4 }, label: 'Fresh paint & awning', labelVi: 'Sơn mới & mái hiên', queue: 5, attract: 1.3 }, { cost: 700, mats: { cable: 1, metal: 6 }, label: 'Night lights & speakers', labelVi: 'Đèn đêm & loa nhạc', queue: 6, attract: 1.6, price: 1.1 }] },
  night: { kind: 'stall', biz: 'night', name: 'Sạp Đêm', en: 'Night Stall', interior: 'night', chapter: 5, queueMax: 5, hours: [17 * 60, 24 * 60] },
  restaurant: { kind: 'restaurant', biz: 'restaurant', name: 'Nhà Hàng', en: 'Restaurant', interior: 'restaurant', chapter: 6, buy: 1500,
           repair: { wood: 30, metal: 12, paint: 8, tile: 20 }, tables: 4,
           upgrades: [null, null, { cost: 900, mats: { wood: 12, paint: 4 }, label: 'Balcony flowers & two more tables', labelVi: 'Hoa ban công & thêm hai bàn', tables: 6, attract: 1.3 }, { cost: 1800, mats: { cable: 2, lantern: 6 }, label: 'Lantern terrace & string lights', labelVi: 'Sân lồng đèn & dây đèn', tables: 8, attract: 1.6, price: 1.1 }] },
};
export const NIGHT_MARKET_RESTORE = { mats: { wood: 20, metal: 8, paint: 6, lantern: 12, cable: 2 }, cost: 400 };

// ---------------------------------------------------------------- employees (restaurants only)
export const ROLES = {
  cook:    { vi: 'Đầu bếp', en: 'Cook',    desc: 'Cooks tickets at the stove.', descVi: 'Nấu món ở bếp.' },
  server:  { vi: 'Phục vụ', en: 'Server',  desc: 'Takes orders and carries dishes.', descVi: 'Nhận order và bưng món.' },
  prep:    { vi: 'Sơ chế',  en: 'Prep',    desc: 'Keeps prepared ingredients stocked.', descVi: 'Luôn chuẩn bị sẵn nguyên liệu.' },
  cleaner: { vi: 'Dọn dẹp', en: 'Cleaner', desc: 'Clears and wipes tables.', descVi: 'Dọn và lau bàn.' },
  cashier: { vi: 'Thu ngân',en: 'Cashier', desc: 'Takes payments and deposits earnings to you.', descVi: 'Thu tiền và nộp lại cho bạn.' },
};
export const TRAITS = [
  { id: 'cheerful', vi: 'Vui vẻ', en: 'Cheerful', fx: 'Guests tip a little more.', fxVi: 'Khách boa nhiều hơn một chút.' },
  { id: 'careful', vi: 'Cẩn thận', en: 'Careful', fx: 'Rarely makes mistakes.', fxVi: 'Hiếm khi làm sai.' },
  { id: 'speedy', vi: 'Nhanh nhẹn', en: 'Speedy', fx: 'Walks faster.', fxVi: 'Đi nhanh hơn.' },
  { id: 'dreamy', vi: 'Mơ mộng', en: 'Dreamy', fx: 'Takes more breaks, but guests adore them.', fxVi: 'Hay nghỉ giải lao, nhưng khách rất quý.' },
  { id: 'steady', vi: 'Chăm chỉ', en: 'Hard-working', fx: 'Almost never takes breaks.', fxVi: 'Gần như không nghỉ.' },
];
export const EMPLOYEE_NAMES = ['Hạnh', 'Phúc', 'Vy', 'Khang', 'Trâm', 'Bảo', 'Ngọc', 'Tài', 'Thảo', 'Quân', 'Yến', 'Duy', 'My', 'Sơn', 'Hương', 'Long', 'Nhi', 'Đạt', 'Lan Anh', 'Hiếu'];

// ---------------------------------------------------------------- furniture (home + restaurant decor)
export const FURNITURE = {
  rug_round:   { vi: 'Thảm tròn',      en: 'Round rug',       price: 40,  w: 44, h: 26, floor: true, col: '#f4a9b8' },
  rug_long:    { vi: 'Thảm cói',       en: 'Sedge mat',       price: 55,  w: 60, h: 30, floor: true, col: '#e9c46f' },
  plant_big:   { vi: 'Cây kiểng',      en: 'Potted palm',     price: 35,  w: 16, h: 12 },
  plant_bonsai:{ vi: 'Bonsai',         en: 'Bonsai',          price: 90,  w: 16, h: 10 },
  lamp_floor:  { vi: 'Đèn đứng',       en: 'Floor lamp',      price: 45,  w: 12, h: 10, light: true },
  lantern_red: { vi: 'Lồng đèn đỏ',    en: 'Red lantern',     price: 30,  w: 12, h: 10, light: true, wall: true },
  table_low:   { vi: 'Bàn trà',        en: 'Tea table',       price: 70,  w: 34, h: 20 },
  chair_wood:  { vi: 'Ghế gỗ',         en: 'Wooden chair',    price: 40,  w: 14, h: 12 },
  sofa:        { vi: 'Sofa mây',       en: 'Rattan sofa',     price: 160, w: 54, h: 22 },
  bookshelf:   { vi: 'Kệ sách',        en: 'Bookshelf',       price: 120, w: 36, h: 14, wallish: true },
  fan:         { vi: 'Quạt máy',       en: 'Electric fan',    price: 50,  w: 14, h: 12 },
  fishtank:    { vi: 'Bể cá',          en: 'Fish tank',       price: 140, w: 34, h: 16 },
  tv:          { vi: 'Tivi cũ',        en: 'Retro TV',        price: 150, w: 30, h: 16 },
  hammock:     { vi: 'Võng',           en: 'Hammock',         price: 110, w: 60, h: 20 },
  painting:    { vi: 'Tranh Đông Hồ',  en: 'Folk painting',   price: 75,  w: 26, h: 8, wall: true },
  clock:       { vi: 'Đồng hồ',        en: 'Wall clock',      price: 60,  w: 14, h: 8, wall: true },
  radio:       { vi: 'Radio',          en: 'Radio',           price: 65,  w: 18, h: 12 },
  cat_bed:     { vi: 'Nệm mèo',        en: 'Cat bed',         price: 50,  w: 24, h: 16 },
  piano:       { vi: 'Đàn piano',      en: 'Little piano',    price: 380, w: 46, h: 18, unlock: 5 },
  aquarium_big:{ vi: 'Hồ cá koi',      en: 'Koi basin',       price: 450, w: 46, h: 26, unlock: 6 },
};

// ---------------------------------------------------------------- customers
export const PERSONALITIES = {
  patient:  { vi: 'Kiên nhẫn', en: 'Patient', patience: 1.4,  tip: 1.0, weight: 3 },
  rushed:   { vi: 'Vội vàng', en: 'In a hurry',  patience: 0.62, tip: 1.25, weight: 2 },
  regular:  { vi: 'Khách quen', en: 'Regular', patience: 1.15, tip: 1.1, weight: 2 },
  excited:  { vi: 'Hào hứng', en: 'Excited',  patience: 1.0,  tip: 1.2, weight: 2 },
  picky:    { vi: 'Khó tính', en: 'Picky',  patience: 0.9,  tip: 1.45, weight: 1 },
  tourist:  { vi: 'Du khách', en: 'Tourist',  patience: 1.1,  tip: 1.3, weight: 3 },
};

// ---------------------------------------------------------------- chapters
export const CHAPTERS = [
  null,
  { n: 1, title: 'A New Arrival', vi: 'Người Mới Đến' },
  { n: 2, title: 'First Customer', vi: 'Vị Khách Đầu Tiên' },
  { n: 3, title: 'Word Is Spreading', vi: 'Tiếng Lành Đồn Xa' },
  { n: 4, title: 'Growing Pains', vi: 'Lớn Lên Thật Khó' },
  { n: 5, title: 'The Night Market', vi: 'Chợ Đêm' },
  { n: 6, title: 'The Restaurant', vi: 'Nhà Hàng' },
  { n: 7, title: 'A Destination', vi: 'Điểm Đến Của Mọi Người' },
];

export const ACHIEVEMENTS = {
  first_repair:   { en: 'Handy Newcomer', desc: 'Repair your first shed.', vi: 'Tay nghề người mới', descVi: 'Sửa căn chòi đầu tiên.' },
  first_sale:     { en: 'First Sale', desc: 'Serve your very first customer.', vi: 'Món hàng đầu tiên', descVi: 'Phục vụ vị khách đầu tiên.' },
  perfect_10:     { en: 'Steady Hands', desc: 'Make 10 perfect orders.', vi: 'Đôi tay vững vàng', descVi: 'Làm 10 món hoàn hảo.' },
  perfect_50:     { en: 'Island Barista', desc: 'Make 50 perfect orders.', vi: 'Barista của đảo', descVi: 'Làm 50 món hoàn hảo.' },
  served_100:     { en: 'Crowd Pleaser', desc: 'Serve 100 customers.', vi: 'Được lòng mọi người', descVi: 'Phục vụ 100 khách.' },
  first_regular:  { en: 'A Familiar Face', desc: 'Earn your first regular customer.', vi: 'Gương mặt thân quen', descVi: 'Có vị khách quen đầu tiên.' },
  regulars_5:     { en: 'Neighbourhood Favourite', desc: 'Have 5 regular customers.', vi: 'Quán ruột của xóm', descVi: 'Có 5 khách quen.' },
  recipes_5:      { en: 'Recipe Collector', desc: 'Discover 5 recipes.', vi: 'Nhà sưu tầm công thức', descVi: 'Khám phá 5 công thức.' },
  recipes_all:    { en: 'Island Cookbook', desc: 'Discover every recipe.', vi: 'Sổ tay của đảo', descVi: 'Khám phá mọi công thức.' },
  money_1000:     { en: 'Pocket Full of Đồng', desc: 'Earn 1,000k in total.', vi: 'Túi đầy tiền', descVi: 'Kiếm tổng cộng 1.000k.' },
  money_10000:    { en: 'Island Tycoon', desc: 'Earn 10M₫ in total.', vi: 'Đại gia của đảo', descVi: 'Kiếm tổng cộng 10 triệu.' },
  two_biz:        { en: 'Second Shop', desc: 'Own two working businesses.', vi: 'Quán thứ hai', descVi: 'Có hai cửa hàng hoạt động.' },
  truck:          { en: 'On Wheels', desc: 'Buy the food truck.', vi: 'Lăn bánh', descVi: 'Mua xe bán đồ ăn.' },
  night_market:   { en: 'Lanterns Lit', desc: 'Restore the Night Market.', vi: 'Lồng đèn sáng rực', descVi: 'Khôi phục Chợ Đêm.' },
  restaurant:     { en: 'Grand Opening', desc: 'Open your restaurant.', vi: 'Khai trương hoành tráng', descVi: 'Mở nhà hàng.' },
  first_hire:     { en: 'Team Player', desc: 'Hire your first employee.', vi: 'Tinh thần đồng đội', descVi: 'Thuê nhân viên đầu tiên.' },
  full_team:      { en: 'Well-Oiled Kitchen', desc: 'Staff every restaurant role.', vi: 'Bếp vận hành trơn tru', descVi: 'Có đủ mọi vị trí trong nhà hàng.' },
  cozy_home:      { en: 'Home Sweet Home', desc: 'Place 5 pieces of furniture.', vi: 'Tổ ấm', descVi: 'Đặt 5 món nội thất.' },
  day_7:          { en: 'One Week In', desc: 'Reach day 7.', vi: 'Một tuần trên đảo', descVi: 'Đến ngày thứ 7.' },
  statue:         { en: 'Founder', desc: 'Unveil the founder statue.', vi: 'Người sáng lập', descVi: 'Khánh thành tượng người sáng lập.' },
  max_level:      { en: 'Master Builder', desc: 'Upgrade a business to level 3.', vi: 'Bậc thầy xây dựng', descVi: 'Nâng cấp một quán lên cấp 3.' },
  tip_big:        { en: 'Big Tipper', desc: 'Receive a tip of 20k or more.', vi: 'Khách sộp', descVi: 'Nhận tiền boa từ 20k trở lên.' },
};
export const STATUE_COST = { cost: 3000, mats: { paint: 10, tile: 10 } };
