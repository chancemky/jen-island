// Static game data. Money is in thousands of đồng ("k").

// ---------------------------------------------------------------- ingredients
// pack: portions per purchase. prep: raw → prepared form made at the prep table.
// Supermarket aisles.
export const AISLES = [
  { id: 'all', en: 'All', vi: 'Tất cả', icon: 'bag' },
  { id: 'produce', en: 'Fruit & Veg', vi: 'Rau củ quả', icon: 'kumquat', items: ['kumquat', 'peach', 'avocado', 'lime', 'orange', 'mango', 'dragonfruit', 'passionfruit', 'coconut', 'cane', 'cucumber', 'cilantro', 'herbs', 'sprouts', 'scallion', 'chili'] },
  { id: 'meat', en: 'Meat, Seafood & Eggs', vi: 'Thịt, hải sản & trứng', icon: 'pork', items: ['pork', 'beef', 'shrimp', 'squid', 'scallop', 'snails', 'skewers', 'egg', 'egg_yolk'] },
  { id: 'bakery', en: 'Bakery & Grains', vi: 'Bánh & ngũ cốc', icon: 'bread', items: ['bread', 'rice', 'noodles', 'rice_paper', 'batter'] },
  { id: 'dairy', en: 'Dairy & Drinks', vi: 'Sữa & đồ uống', icon: 'milk', items: ['milk', 'condensed_milk', 'yogurt', 'cream', 'coconut_milk', 'cheese_foam', 'tea', 'coffee', 'peach_syrup'] },
  { id: 'sweets', en: 'Sweets & Toppings', vi: 'Đồ ngọt & topping', icon: 'sugar', items: ['sugar', 'tapioca', 'jelly', 'beans'] },
  { id: 'deli', en: 'Sauces & Deli', vi: 'Nước sốt & đồ nguội', icon: 'fish_sauce', items: ['fish_sauce', 'pickles', 'pate', 'broth', 'broth_spicy', 'peanuts', 'sea_salt'] },
  { id: 'frozen', en: 'Frozen', vi: 'Đồ đông lạnh', icon: 'ice', items: ['ice'] },
];
export const INGREDIENTS = {
  tea:            { vi: 'Trà',           en: 'Tea leaves',      cost: 3, pack: 8 },
  kumquat:        { vi: 'Tắc',           en: 'Kumquats',        cost: 5, pack: 6, prep: { to: 'kumquat_cut', method: 'chop', verb: 'Slice' } },
  sugar:          { vi: 'Đường',         en: 'Sugar syrup',     cost: 0.5,  pack: 12 },
  ice:            { vi: 'Đá',            en: 'Ice',             cost: 0.4,  pack: 12 },
  coffee:         { vi: 'Cà phê',        en: 'Phin coffee',     cost: 7, pack: 8 },
  cream:          { vi: 'Kem tươi',      en: 'Whipping cream',  cost: 6, pack: 8, prep: { to: 'salt_cream', method: 'whip', verb: 'Whip' } },
  sea_salt:       { vi: 'Muối biển',     en: 'Sea salt',        cost: 0.5,  pack: 12 },
  egg_yolk:       { vi: 'Trứng gà ta',   en: 'Free-range eggs', cost: 12, pack: 6, prep: { to: 'egg_cream', method: 'whip', verb: 'Whisk' } },
  orange:         { vi: 'Cam sành',      en: 'Green oranges',   cost: 12, pack: 6, prep: { to: 'orange_cut', method: 'chop', verb: 'Squeeze' } },
  squid:          { vi: 'Mực',           en: 'Squid',           cost: 34, pack: 6, prep: { to: 'squid_cut', method: 'chop', verb: 'Clean' } },
  scallop:        { vi: 'Sò điệp',       en: 'Scallops',        cost: 32, pack: 8 },
  peanuts:        { vi: 'Đậu phộng',     en: 'Crushed peanuts', cost: 1,  pack: 12 },
  condensed_milk: { vi: 'Sữa đặc',       en: 'Condensed milk',  cost: 4.5, pack: 8 },
  milk:           { vi: 'Sữa tươi',      en: 'Fresh milk',      cost: 7, pack: 8 },
  peach:          { vi: 'Đào',           en: 'Peaches',         cost: 7, pack: 6, prep: { to: 'peach_cut', method: 'chop', verb: 'Slice' } },
  peach_syrup:    { vi: 'Siro đào',      en: 'Peach syrup',     cost: 4, pack: 8 },
  avocado:        { vi: 'Bơ',            en: 'Avocados',        cost: 12, pack: 4, prep: { to: 'avocado_cut', method: 'scoop', verb: 'Scoop' } },
  tapioca:        { vi: 'Trân châu',     en: 'Tapioca pearls',  cost: 3.5, pack: 8 },
  jelly:          { vi: 'Thạch',         en: 'Grass jelly',     cost: 3, pack: 8 },
  cheese_foam:    { vi: 'Kem phô mai',   en: 'Cheese foam',     cost: 5, pack: 8 },
  bread:          { vi: 'Bánh mì',       en: 'Baguettes',       cost: 5, pack: 6, prep: { to: 'bread_split', method: 'split', verb: 'Split' } },
  pate:           { vi: 'Pa tê',         en: 'Pâté',            cost: 4, pack: 8 },
  pork:           { vi: 'Thịt heo',      en: 'Pork',            cost: 9, pack: 6, prep: { to: 'pork_grilled', method: 'grill', verb: 'Grill' } },
  pickles:        { vi: 'Đồ chua',       en: 'Pickled carrot & daikon', cost: 1.5, pack: 8 },
  cucumber:       { vi: 'Dưa leo',       en: 'Cucumber',        cost: 1.5,  pack: 6, prep: { to: 'cucumber_cut', method: 'chop', verb: 'Slice' } },
  cilantro:       { vi: 'Ngò',           en: 'Cilantro',        cost: 1,  pack: 8 },
  egg:            { vi: 'Trứng',         en: 'Eggs',            cost: 6, pack: 6, prep: { to: 'egg_fried', method: 'fry', verb: 'Fry' } },
  chili:          { vi: 'Ớt',            en: 'Chili',           cost: 0.5,  pack: 10 },
  rice_paper:     { vi: 'Bánh tráng',    en: 'Rice paper',      cost: 2, pack: 10 },
  shrimp:         { vi: 'Tôm',           en: 'Shrimp',          cost: 11, pack: 6, prep: { to: 'shrimp_cooked', method: 'boil', verb: 'Boil' } },
  noodles:        { vi: 'Bún / Bánh phở',en: 'Rice noodles',    cost: 3, pack: 8 },
  herbs:          { vi: 'Rau thơm',      en: 'Fresh herbs',     cost: 2,  pack: 8 },
  batter:         { vi: 'Bột bánh xèo',  en: 'Bánh xèo batter', cost: 5, pack: 6 },
  sprouts:        { vi: 'Giá',           en: 'Bean sprouts',    cost: 1.5,  pack: 8 },
  fish_sauce:     { vi: 'Nước mắm',      en: 'Fish sauce',      cost: 1.5, pack: 12 },
  rice:           { vi: 'Cơm tấm',       en: 'Broken rice',     cost: 3, pack: 8 },
  broth:          { vi: 'Nước dùng phở', en: 'Phở broth',       cost: 7, pack: 8 },
  broth_spicy:    { vi: 'Nước dùng Huế', en: 'Spicy Huế broth', cost: 9, pack: 8 },
  beef:           { vi: 'Thịt bò',       en: 'Beef',            cost: 16, pack: 6, prep: { to: 'beef_sliced', method: 'chop', verb: 'Slice' } },
  lime:           { vi: 'Chanh',         en: 'Limes',           cost: 1,  pack: 8, prep: { to: 'lime_cut', method: 'chop', verb: 'Cut' } },
  scallion:       { vi: 'Hành lá',       en: 'Scallions',       cost: 3,  pack: 10, prep: { to: 'scallion_oil', method: 'fry', verb: 'Fry' } },
  beans:          { vi: 'Đậu',           en: 'Sweet beans',     cost: 3, pack: 8 },
  coconut_milk:   { vi: 'Nước cốt dừa',  en: 'Coconut cream',   cost: 4, pack: 8 },
  snails:         { vi: 'Ốc',            en: 'Sea snails',      cost: 14, pack: 6, prep: { to: 'snails_cooked', method: 'boil', verb: 'Boil' } },
  cane:           { vi: 'Mía cây',       en: 'Sugarcane',       cost: 4, pack: 8, prep: { to: 'cane_juice', method: 'press', verb: 'Press' } },
  skewers:        { vi: 'Xiên que',      en: 'Meat skewers',    cost: 7, pack: 8 },
  // the Beach Smoothie Bar
  mango:          { vi: 'Xoài cát',      en: 'Mangoes',         cost: 9, pack: 6, prep: { to: 'mango_cut', method: 'chop', verb: 'Cube' } },
  dragonfruit:    { vi: 'Thanh long',    en: 'Dragon fruit',    cost: 10, pack: 5, prep: { to: 'dragonfruit_cut', method: 'scoop', verb: 'Scoop' } },
  passionfruit:   { vi: 'Chanh dây',     en: 'Passion fruit',   cost: 9, pack: 8, prep: { to: 'passion_pulp', method: 'scoop', verb: 'Scoop' } },
  coconut:        { vi: 'Dừa xiêm',      en: 'Young coconuts',  cost: 14, pack: 6, prep: { to: 'coconut_water', method: 'chop', verb: 'Open' } },
  yogurt:         { vi: 'Sữa chua',      en: 'Yogurt',          cost: 5, pack: 8 },
};
// The price on the shelf is per pack: portion cost × portions.
for (const g of Object.values(INGREDIENTS)) g.price = Math.max(1, Math.round(g.cost * g.pack));
export const PREPPED = {};
const CUT_EN = { mango_cut: 'Mango cubes', dragonfruit_cut: 'Dragon fruit', passion_pulp: 'Passion fruit pulp', coconut_water: 'Coconut water', salt_cream: 'Salted cream', egg_cream: 'Egg cream', orange_cut: 'Fresh orange juice', squid_cut: 'Cleaned squid', kumquat_cut: 'Sliced kumquat', peach_cut: 'Sliced peach', avocado_cut: 'Scooped avocado', bread_split: 'Split baguette', pork_grilled: 'Grilled pork', cucumber_cut: 'Sliced cucumber', egg_fried: 'Fried egg', shrimp_cooked: 'Cooked shrimp', beef_sliced: 'Sliced beef', snails_cooked: 'Boiled snails', cane_juice: 'Pressed cane juice', lime_cut: 'Lime wedges', scallion_oil: 'Scallion oil' };
const CUT_VI = { mango_cut: 'Xoài cắt hạt lựu', dragonfruit_cut: 'Thanh long nạo', passion_pulp: 'Ruột chanh dây', coconut_water: 'Nước dừa', salt_cream: 'Kem muối', egg_cream: 'Kem trứng', orange_cut: 'Nước cam vắt', squid_cut: 'Mực làm sạch', kumquat_cut: 'Tắc cắt', peach_cut: 'Đào cắt', avocado_cut: 'Bơ nạo', bread_split: 'Bánh mì xẻ', pork_grilled: 'Thịt nướng', cucumber_cut: 'Dưa leo cắt', egg_fried: 'Trứng chiên', shrimp_cooked: 'Tôm luộc', beef_sliced: 'Bò thái', snails_cooked: 'Ốc luộc', cane_juice: 'Nước mía ép', lime_cut: 'Chanh cắt', scallion_oil: 'Mỡ hành' };
for (const [id, g] of Object.entries(INGREDIENTS)) if (g.prep) PREPPED[g.prep.to] = { from: id, vi: CUT_VI[g.prep.to] || g.vi, en: g.en + ' (prepped)', enCut: CUT_EN[g.prep.to] || g.en, method: g.prep.method };
export const PREP_VERB = { whip: ['Whip', 'Đánh bông'], chop: ['Slice', 'Cắt'], split: ['Split', 'Xẻ'], scoop: ['Scoop', 'Nạo'], grill: ['Grill', 'Nướng'], fry: ['Fry', 'Chiên'], boil: ['Boil', 'Luộc'], press: ['Press', 'Ép'] };
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
  wood:    { vi: 'Gỗ',      en: 'Wood planks',    price: 11 },
  metal:   { vi: 'Tôn',     en: 'Metal sheets',   price: 23 },
  paint:   { vi: 'Sơn',     en: 'Paint',          price: 15 },
  tile:    { vi: 'Ngói',    en: 'Roof tiles',     price: 26, unlock: 7 },
  lantern: { vi: 'Lồng đèn',en: 'Silk lanterns',  price: 30, unlock: 8 },
  cable:   { vi: 'Dây đèn', en: 'Light strings',  price: 55, unlock: 8 },
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
  mango_cut:      { label: 'Xoài', en: 'Mango',       icon: 'mango_cut',      uses: 'mango_cut',      layer: { color: '#ffc23d', h: 0.55 } },
  dragonfruit_cut:{ label: 'Thanh long', en: 'Dragon fruit', icon: 'dragonfruit_cut', uses: 'dragonfruit_cut', layer: { color: '#e8457a', h: 0.55 } },
  passion_pulp:   { label: 'Chanh dây', en: 'Passion fruit', icon: 'passion_pulp', uses: 'passion_pulp',  layer: { color: '#f2b51e', h: 0.45 } },
  coconut_water:  { label: 'Nước dừa', en: 'Coconut water', icon: 'coconut_water', uses: 'coconut_water', layer: { color: '#eef6ea', h: 0.7 } },
  yogurt:         { label: 'Sữa chua', en: 'Yogurt',   icon: 'yogurt',         uses: 'yogurt',         layer: { color: '#fbf6ee', h: 0.3 } },
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
  // harbour café
  salt_cream:     { label: 'Kem muối', en: 'Salt cream',  icon: 'salt_cream',     uses: 'salt_cream',     layer: { color: '#f7efe0', h: 0.22, swirl: true } },
  egg_cream:      { label: 'Kem trứng', en: 'Egg cream',  icon: 'egg_cream',      uses: 'egg_cream',      layer: { color: '#f6d98a', h: 0.3, swirl: true } },
  orange_cut:     { label: 'Cam', en: 'Orange',           icon: 'orange_cut',     uses: 'orange_cut',     layer: { color: '#ffae3a', h: 0.62 } },
  sea_salt:       { label: 'Muối', en: 'Salt',            icon: 'sea_salt',       uses: 'sea_salt' },
  // cove grill
  squid_cut:      { label: 'Mực', en: 'Squid',            icon: 'squid',          uses: 'squid_cut' },
  scallop:        { label: 'Sò điệp', en: 'Scallops',     icon: 'scallop',        uses: 'scallop' },
  peanuts:        { label: 'Đậu phộng', en: 'Peanuts',    icon: 'peanuts',        uses: 'peanuts' },
  // night market specialities
  snails_cooked:  { label: 'Ốc', en: 'Snails',            icon: 'snails_cooked',  uses: 'snails_cooked' },
  cane_juice:     { label: 'Nước mía', en: 'Cane juice',  icon: 'cane_juice',     uses: 'cane_juice',     layer: { color: '#e4ec9a', h: 0.7 } },
  skewers:        { label: 'Xiên', en: 'Skewers',         icon: 'skewers',        uses: 'skewers' },
};
// Order options that live outside the step sequence (tap anytime).
export const OPTIONS = {
  size:    { label: 'Size', en: 'Size', values: ['S', 'M', 'L'], price: { S: 0.9, M: 1, L: 1.12 } },
  sugar:   { label: 'Đường', en: 'Sugar', values: [30, 50, 70, 100], uses: 'sugar' },
  ice:     { label: 'Đá', en: 'Ice', values: ['không đá', 'ít đá', 'đá bình thường'], short: ['none', 'less', 'normal'], uses: 'ice',
             btn: { 'không đá': ['None', 'Không'], 'ít đá': ['Less', 'Ít'], 'đá bình thường': ['Normal', 'Thường'] },
             say: { 'không đá': ['no ice', 'không đá'], 'ít đá': ['less ice', 'ít đá'], 'đá bình thường': ['normal ice', 'đá bình thường'] } },
  topping: { label: 'Topping', en: 'Topping', values: ['none', 'tapioca', 'jelly', 'cheese_foam'], names: { none: 'không topping', tapioca: 'trân châu', jelly: 'thạch', cheese_foam: 'kem phô mai' }, surcharge: { tapioca: 5, jelly: 4, cheese_foam: 7 },   // ≈ ingredient cost × 1.15 (after ECON.ingredients)
             btn: { none: ['None', 'Không'], tapioca: ['Tapioca', 'Trân châu'], jelly: ['Jelly', 'Thạch'], cheese_foam: ['Cheese foam', 'Kem phô mai'] },
             say: { none: ['no topping', 'không topping'], tapioca: ['tapioca pearls', 'trân châu'], jelly: ['grass jelly', 'thạch'], cheese_foam: ['cheese foam', 'kem phô mai'] } },
  chili:   { label: 'Ớt', en: 'Chili', values: ['không ớt', 'có ớt'], uses: 'chili', btn: { 'không ớt': ['No', 'Không'], 'có ớt': ['Yes', 'Có ớt'] }, say: { 'không ớt': ['no chili', 'không ớt'], 'có ớt': ['with chili', 'có ớt'] } },
};

export const RECIPES = {
  tra_tac:        { vi: 'Trà tắc', en: 'Kumquat Iced Tea', blurbVi: 'Trà tắc chua ngọt mát lạnh. Góc phố nào ở Việt Nam cũng có.', biz: 'drinks', price: 16, vessel: 'cup', steps: ['tea', 'kumquat_cut'], options: ['size', 'sugar', 'ice'], icon: 'drink:tra_tac', chapter: 1,
                    blurb: 'Sweet-tart kumquat tea over ice. Every street corner in Việt Nam has one.' },
  ca_phe_sua_da:  { vi: 'Cà phê sữa đá', en: 'Iced Milk Coffee', blurbVi: 'Sữa đặc trước, rồi cà phê phin nhỏ giọt. Đủ đậm để đánh thức cả hòn đảo buồn ngủ.', biz: 'drinks', price: 22, vessel: 'cup', steps: ['condensed_milk', 'coffee'], options: ['size', 'ice'], icon: 'drink:ca_phe_sua_da', chapter: 3,
                    blurb: 'Condensed milk first, then slow-dripped phin coffee. Strong enough to wake a sleepy island.' },
  tra_dao:        { vi: 'Trà đào', en: 'Peach Tea', blurbVi: 'Trà với siro đào và những miếng đào mềm. Du khách mê lắm.', biz: 'drinks', price: 28, vessel: 'cup', steps: ['tea', 'peach_syrup', 'peach_cut'], options: ['size', 'sugar', 'ice'], icon: 'drink:tra_dao', chapter: 1, needRep: 18,
                    blurb: 'Tea with peach syrup and soft peach slices. Tourists love it.' },
  tra_sua:        { vi: 'Trà sữa', en: 'Milk Tea', blurbVi: 'Trà sữa béo ngậy với topping tùy khách chọn.', biz: 'drinks', price: 24, vessel: 'cup', steps: ['tea', 'milk'], options: ['size', 'sugar', 'ice', 'topping'], icon: 'drink:tra_sua', chapter: 7,
                    blurb: 'Creamy milk tea with a topping of your customer\'s choice.' },
  sinh_to_bo:     { vi: 'Sinh tố bơ', en: 'Avocado Smoothie', blurbVi: 'Bơ xay với sữa đặc và đá. Món tráng miệng giả làm đồ uống.', biz: 'drinks', price: 35, vessel: 'cup', steps: ['avocado_cut', 'condensed_milk', 'blend'], options: ['size', 'ice'], icon: 'drink:sinh_to_bo', chapter: 7, needRep: 70,
                    blurb: 'Avocado blended with condensed milk and ice. Dessert pretending to be a drink.' },
  banh_mi_thit:   { vi: 'Bánh mì thịt', en: 'Grilled Pork Bánh Mì', blurbVi: 'Bánh mì giòn rụm, pa tê, thịt nướng, đồ chua, dưa leo và ngò.', biz: 'banhmi', price: 38, vessel: 'bread', steps: ['bread_split', 'pate', 'pork_grilled', 'pickles', 'cucumber_cut', 'cilantro'], options: ['chili'], icon: 'banh_mi_thit', chapter: 3,
                    blurb: 'Crackly baguette, pâté, grilled pork, pickles, cucumber and cilantro.' },
  banh_mi_trung:  { vi: 'Bánh mì trứng', en: 'Egg Bánh Mì', blurbVi: 'Trứng chiên kẹp trong ổ bánh mì nóng. Bữa sáng của cả đảo.', biz: 'banhmi', price: 26, vessel: 'bread', steps: ['bread_split', 'egg_fried', 'pickles', 'cucumber_cut', 'cilantro'], options: ['chili'], icon: 'banh_mi_trung', chapter: 3, needRep: 40,
                    blurb: 'A fried egg tucked in warm bread. The island breakfast.' },
  goi_cuon:       { vi: 'Gỏi cuốn', en: 'Fresh Spring Rolls', blurbVi: 'Bánh tráng cuốn bún, rau thơm và tôm hồng.', biz: 'truck', price: 36, vessel: 'plate', steps: ['rice_paper', 'noodles', 'herbs', 'shrimp_cooked', 'roll'], options: [], icon: 'goi_cuon', chapter: 7,
                    blurb: 'Rice paper rolled around noodles, herbs and pink shrimp.' },
  banh_xeo:       { vi: 'Bánh xèo', en: 'Sizzling Crêpe', blurbVi: 'Tên món lấy từ tiếng “xèo!” khi bột chạm chảo.', biz: 'truck', price: 40, vessel: 'pan', steps: ['batter', 'shrimp_cooked', 'sprouts', 'fold', 'herbs'], options: [], icon: 'banh_xeo', chapter: 7, needRep: 90,
                    blurb: 'Named for the sizzle ("xèo!") the batter makes when it hits the pan.' },
  banh_trang_nuong:{ vi: 'Bánh tráng nướng', en: 'Grilled Rice Paper', blurbVi: '“Pizza Việt Nam” — bánh tráng nướng than với trứng và mỡ hành.', biz: 'night', price: 22, vessel: 'grill', steps: ['rice_paper', 'egg_fried', 'scallion_oil', 'grill'], options: ['chili'], icon: 'banh_trang_nuong', chapter: 8,
                    blurb: '"Vietnamese pizza" — rice paper grilled over charcoal with egg and scallion oil.' },
  che_ba_mau:     { vi: 'Chè ba màu', en: 'Three-Colour Sweet Soup', blurbVi: 'Từng lớp đậu, thạch và nước cốt dừa trên đá bào.', biz: 'night', price: 20, vessel: 'glass', steps: ['beans', 'jelly', 'coconut_milk'], options: ['ice'], icon: 'che', chapter: 8,
                    blurb: 'Layers of beans, jelly and coconut cream over crushed ice.' },
  pho_bo:         { vi: 'Phở bò', en: 'Beef Phở', blurbVi: 'Bánh phở mềm, thịt bò thái mỏng và nước dùng ninh cả đêm.', biz: 'restaurant', price: 60, vessel: 'bowl', steps: ['noodles', 'beef_sliced', 'broth', 'herbs', 'lime_wedge'], options: [], icon: 'pho_bo', chapter: 10,
                    blurb: 'Silky noodles, thin beef and a broth that simmered all night.' },
  bun_bo_hue:     { vi: 'Bún bò Huế', en: 'Spicy Huế Noodle Soup', blurbVi: 'Sả, ớt và nước dùng đỏ tự hào từ cố đô.', biz: 'restaurant', price: 65, vessel: 'bowl', steps: ['noodles', 'beef_sliced', 'broth_spicy', 'herbs', 'lime_wedge'], options: [], icon: 'bun_bo_hue', chapter: 10, needRep: 200,
                    blurb: 'Lemongrass, chili and a proud red broth from the old capital.' },
  com_tam:        { vi: 'Cơm tấm', en: 'Broken Rice Plate', blurbVi: 'Cơm tấm, sườn nướng, trứng chiên và nước mắm chua ngọt.', biz: 'restaurant', price: 45, vessel: 'plate', steps: ['rice', 'pork_grilled', 'egg_fried', 'pickles', 'fish_sauce'], options: [], icon: 'com_tam', chapter: 10,
                    blurb: 'Broken rice, grilled pork chop, a fried egg and sweet fish sauce.' },
  bun_thit_nuong: { vi: 'Bún thịt nướng', en: 'Grilled Pork Vermicelli', blurbVi: 'Bún mát, thịt nướng thơm và rau, chan nước chấm.', biz: 'restaurant', price: 38, vessel: 'bowl', steps: ['noodles', 'pork_grilled', 'herbs', 'pickles', 'fish_sauce'], options: [], icon: 'bun_thit_nuong', chapter: 10, needRep: 240,
                    blurb: 'Cool noodles, smoky pork and herbs, dressed with sweet dipping sauce.' },
};
// Harbour Café and Coconut Cove Grill (no overlap with the grandmas' carts)
Object.assign(RECIPES, {
  ca_phe_muoi:  { vi: 'Cà phê muối', en: 'Salted Cream Coffee', blurbVi: 'Cà phê đậm, sữa đặc và lớp kem muối mằn mặn. Đặc sản Huế.', blurb: 'Strong coffee, condensed milk and a salty cream cap. A Huế favourite.', biz: 'cafe', price: 42, vessel: 'cup', steps: ['coffee', 'condensed_milk', 'salt_cream'], options: ['size', 'ice'], icon: 'drink:ca_phe_muoi', chapter: 13, starter: true },
  bac_xiu:      { vi: 'Bạc xỉu', en: 'Bạc Xỉu (Milky Coffee)', blurbVi: 'Nhiều sữa, ít cà phê. Cà phê cho người không uống được cà phê.', blurb: 'Lots of milk, a little coffee. Coffee for people who don\'t drink coffee.', biz: 'cafe', price: 40, vessel: 'cup', steps: ['condensed_milk', 'milk', 'coffee'], options: ['size', 'sugar', 'ice'], icon: 'drink:bac_xiu', chapter: 13, starter: true },
  ca_phe_trung: { vi: 'Cà phê trứng', en: 'Egg Coffee', blurbVi: 'Kem trứng đánh bông béo như bánh flan trên cà phê nóng. Hà Nội mang ra đảo.', blurb: 'Whipped egg cream as rich as flan over hot coffee. Hà Nội, now on the island.', biz: 'cafe', price: 44, vessel: 'cup', steps: ['coffee', 'egg_cream'], options: ['size'], icon: 'drink:ca_phe_trung', chapter: 13, needRep: 480 },
  nuoc_cam:     { vi: 'Nước cam vắt', en: 'Fresh Orange Juice', blurbVi: 'Cam sành vắt tươi với chút muối. Ngọt, chua và mát.', blurb: 'Freshly squeezed green oranges with a pinch of salt. Sweet, tangy, cold.', biz: 'cafe', price: 30, vessel: 'cup', steps: ['orange_cut', 'sea_salt'], options: ['size', 'sugar', 'ice'], icon: 'drink:nuoc_cam', chapter: 13, needRep: 800 },
  muc_nuong:    { vi: 'Mực nướng', en: 'Grilled Squid', blurbVi: 'Mực tươi nướng than, chấm muối ớt chanh. Mùi thơm kéo khách cả bãi biển.', blurb: 'Fresh squid over charcoal with chili-lime salt. The smell pulls in the whole beach.', biz: 'grill', price: 78, vessel: 'grill', steps: ['squid_cut', 'grill'], options: ['chili'], icon: 'squid', chapter: 17, starter: true },
  so_diep_nuong:{ vi: 'Sò điệp nướng mỡ hành', en: 'Scallops with Scallion Oil', blurbVi: 'Sò điệp nướng mỡ hành, rắc đậu phộng. Món nhậu của biển.', blurb: 'Scallops grilled with scallion oil and crushed peanuts. The sea\'s favourite snack.', biz: 'grill', price: 82, vessel: 'grill', steps: ['scallop', 'scallion_oil', 'peanuts', 'grill'], options: ['chili'], icon: 'scallop', chapter: 17, starter: true },
});
// The Beach Smoothie Bar on Sunny Beach (chapter 15): blended fruit and fresh coconuts
Object.assign(RECIPES, {
  sinh_to_xoai:  { vi: 'Sinh tố xoài', en: 'Mango Smoothie', blurbVi: 'Xoài cát chín cây xay với sữa đặc và đá. Vàng như nắng.', blurb: 'Tree-ripened mango blended with condensed milk and ice. Yellow as the sun.', biz: 'smoothie', price: 31, vessel: 'cup', steps: ['mango_cut', 'condensed_milk', 'blend'], options: ['size', 'ice'], icon: 'drink:sinh_to_xoai', chapter: 15 },
  nuoc_dua:      { vi: 'Nước dừa tươi', en: 'Fresh Coconut Water', blurbVi: 'Dừa xiêm chặt tại chỗ. Ngọt mát, không cần thêm gì.', blurb: 'A young coconut opened while you wait. Sweet, cool, nothing added.', biz: 'smoothie', price: 26, vessel: 'cup', steps: ['coconut_water'], options: ['size', 'ice'], icon: 'drink:nuoc_dua', chapter: 15 },
  chanh_day:     { vi: 'Nước chanh dây', en: 'Passion Fruit Cooler', blurbVi: 'Chanh dây chua ngọt, hạt giòn tanh tách, thêm chút tắc.', blurb: 'Sweet-tart passion fruit with crunchy seeds and a squeeze of lime.', biz: 'smoothie', price: 26, vessel: 'cup', steps: ['passion_pulp', 'lime_cut'], options: ['size', 'sugar', 'ice'], icon: 'drink:chanh_day', chapter: 15 },
  sinh_to_thanh_long: { vi: 'Sinh tố thanh long', en: 'Dragon Fruit Smoothie', blurbVi: 'Thanh long ruột đỏ xay với sữa chua. Màu hồng ai cũng muốn chụp ảnh.', blurb: 'Red dragon fruit blended with yogurt. A pink everyone wants to photograph.', biz: 'smoothie', price: 35, vessel: 'cup', steps: ['dragonfruit_cut', 'yogurt', 'blend'], options: ['size', 'ice'], icon: 'drink:sinh_to_thanh_long', chapter: 15, needRep: 900 },
  sua_chua_xoai: { vi: 'Sữa chua xoài', en: 'Mango Yogurt Cup', blurbVi: 'Sữa chua mát lạnh, xoài cắt hạt lựu và chút chanh dây trên cùng.', blurb: 'Cold yogurt, mango cubes and a spoon of passion fruit on top.', biz: 'smoothie', price: 46, vessel: 'cup', steps: ['yogurt', 'mango_cut', 'passion_pulp'], options: ['size'], icon: 'drink:sua_chua_xoai', chapter: 15, needRep: 1200 },
  // and for the Harbour Café: coconut coffee, blended like a cloud
  ca_phe_dua:    { vi: 'Cà phê cốt dừa', en: 'Coconut Coffee', blurbVi: 'Cốt dừa xay với đá như mây, rót cà phê đậm lên trên.', blurb: 'Coconut cream blended to a cloud with ice, strong coffee poured over.', biz: 'cafe', price: 37, vessel: 'cup', steps: ['coconut_milk', 'condensed_milk', 'blend', 'coffee'], options: ['size'], icon: 'drink:ca_phe_dua', chapter: 15, needRep: 1000 },
});
// Secret recipes: never taught by anyone — found by experimenting at your own stove (ui/lab.js)
Object.assign(RECIPES, {
  tra_tac_muoi: { vi: 'Trà tắc muối', en: 'Salted Kumquat Tea', blurbVi: 'Trà tắc thêm chút muối biển. Chua, mặn, ngọt — đúng kiểu dân đảo.', blurb: 'Kumquat tea with a pinch of sea salt. Sour, salty, sweet — an islander\'s drink.', biz: 'drinks', price: 22, vessel: 'cup', steps: ['tea', 'kumquat_cut', 'sea_salt'], options: ['size', 'sugar', 'ice'], icon: 'drink:tra_tac_muoi', chapter: 4, secret: true },
  tra_sua_dao:  { vi: 'Trà sữa đào', en: 'Peach Milk Tea', blurbVi: 'Trà sữa béo hòa với siro đào. Ai thử cũng hỏi "sao trước giờ không có?"', blurb: 'Creamy milk tea with peach syrup. Everyone asks why nobody made it before.', biz: 'drinks', price: 30, vessel: 'cup', steps: ['tea', 'milk', 'peach_syrup'], options: ['size', 'sugar', 'ice', 'topping'], icon: 'drink:tra_sua_dao', chapter: 7, secret: true },
  ca_phe_cam:   { vi: 'Cà phê cam', en: 'Orange Coffee', blurbVi: 'Nước cam vắt và một shot cà phê đậm. Lạ mà ghiền.', blurb: 'Fresh orange juice with a shot of strong coffee. Strange, then addictive.', biz: 'cafe', price: 40, vessel: 'cup', steps: ['orange_cut', 'coffee'], options: ['size', 'ice'], icon: 'drink:ca_phe_cam', chapter: 13, secret: true },
});
// The Night Market stalls each have their own speciality (handed over by the owner when you buy the stall)
Object.assign(RECIPES, {
  oc_luoc:    { vi: 'Ốc luộc sả', en: 'Lemongrass Snails', blurbVi: 'Ốc luộc sả, chấm muối tiêu chanh. Ăn chậm, nói chuyện nhiều.', blurb: 'Snails boiled with lemongrass, dipped in salt, pepper and lime. You eat slowly and talk a lot.', biz: 'night', price: 38, vessel: 'plate', steps: ['snails_cooked', 'herbs', 'lime_wedge'], options: ['chili'], icon: 'oc_luoc', chapter: 9, stallOnly: true },
  nuoc_mia:   { vi: 'Nước mía', en: 'Sugarcane Juice', blurbVi: 'Mía ép tươi với chút tắc. Rẻ, nhanh, mát lạnh.', blurb: 'Fresh-pressed sugarcane with a squeeze of lime. Cheap, quick and ice cold.', biz: 'night', price: 12, vessel: 'cup', steps: ['cane_juice', 'lime_wedge'], options: ['size', 'ice'], icon: 'drink:nuoc_mia', chapter: 18, stallOnly: true },
  xien_nuong: { vi: 'Xiên nướng', en: 'Grilled Skewers', blurbVi: 'Xiên que nướng than, quét mỡ hành. Càng khuya càng đông.', blurb: 'Charcoal-grilled skewers brushed with scallion oil. The later it gets, the longer the line.', biz: 'night', price: 22, vessel: 'grill', steps: ['skewers', 'scallion_oil', 'grill'], options: ['chili'], icon: 'xien_nuong', chapter: 18, stallOnly: true },
});
// ---------------------------------------------------------------- pricing philosophy
// Every base price comes from what goes into the dish (cost of goods, from the
// per-portion ingredient costs above, after ECON.ingredients) and a target margin
// that grows with the dish's tier. Margins are deliberately thin:
// early street food (Chapter ≤ 3) keeps 18–35%, mid-game dishes 30–48%, premium
// café drinks and Cove seafood 37–50%. Premium seafood is expensive to buy, so it
// is expensive to eat — but no dish is a money printer. Toppings are charged at
// about their cost + 15%. (tests/run.mjs economy checks these bands.)
// On top of the list price, the game's own bonuses (recipe level, shop level, daily
// special, cash register) stack to at most +28% (BONUS_CAP, systems/business.js) and
// your own price setting runs 70–130% (PRICE_RANGE). Even fully stacked, an early
// drink stays under ~60% margin, and customers notice pricey menus (PRICE_ELASTICITY).
export function recipeCost(id, opts = {}) {
  const R = RECIPES[id]; if (!R) return 0;
  let c = 0;
  for (const st of R.steps) { const u = STATION[st]?.uses; if (!u) continue; const raw = PREPPED[u] ? PREPPED[u].from : u; c += INGREDIENTS[raw]?.cost || 0; }
  if (R.options.includes('sugar') && opts.sugar !== 0) c += INGREDIENTS.sugar.cost;
  if (R.options.includes('ice') && opts.ice !== 'không đá') c += INGREDIENTS.ice.cost;
  if (opts.topping && opts.topping !== 'none') c += INGREDIENTS[opts.topping]?.cost || 0;
  if (opts.chili === 'có ớt') c += INGREDIENTS.chili.cost;
  return c;
}
export const RECIPE_UPGRADES = [
  null,
  { cost: 0 },
  { mul: 30, price: 1.15, patience: 1.1, tip: 1.1, label: 'Better ingredients', labelVi: 'Nguyên liệu tốt hơn' },
  { mul: 90, price: 1.3, patience: 1.2, tip: 1.25, label: 'Signature presentation', labelVi: 'Trình bày đặc sắc' },
];
// a recipe upgrade costs more the more valuable the dish is
export const recipeUpgradeCost = (id, lv) => Math.round(RECIPES[id].price * (RECIPE_UPGRADES[lv]?.mul || 0) / 10) * 10;

// ---------------------------------------------------------------- businesses
export const BUSINESSES = {
  shed1: { kind: 'shed', biz: 'drinks', name: 'Quán Nước', en: 'Drink Stand', interior: 'shed1',
           repair: { wood: 12, metal: 3, paint: 2 }, queueMax: 3,
           upgrades: [null, null, { cost: 180, mats: { wood: 8, paint: 2 }, label: 'Striped awning & lanterns', labelVi: 'Mái hiên sọc & lồng đèn', queue: 4, attract: 1.25 }, { cost: 420, mats: { tile: 10, wood: 6 }, label: 'Tiled roof & string lights', labelVi: 'Mái ngói & dây đèn', queue: 5, attract: 1.5, price: 1.1 }] },
  shed2: { kind: 'shed', biz: 'banhmi', name: 'Bánh Mì Góc Phố', en: 'Bánh Mì Corner', interior: 'shed2', chapter: 4, buy: 900,
           repair: { wood: 16, metal: 4, paint: 3 }, queueMax: 3,
           upgrades: [null, null, { cost: 220, mats: { wood: 8, paint: 2 }, label: 'Striped awning & lanterns', labelVi: 'Mái hiên sọc & lồng đèn', queue: 4, attract: 1.25 }, { cost: 480, mats: { tile: 10, wood: 6 }, label: 'Tiled roof & string lights', labelVi: 'Mái ngói & dây đèn', queue: 5, attract: 1.5, price: 1.1 }] },
  truck: { kind: 'truck', biz: 'truck', name: 'Xe Cuốn', en: 'Roll Truck', interior: 'truck', chapter: 7, buy: 3000, queueMax: 4, tolerance: 1.05,
           upgrades: [null, null, { cost: 350, mats: { paint: 4, metal: 4 }, label: 'Fresh paint & awning', labelVi: 'Sơn mới & mái hiên', queue: 5, attract: 1.3 }, { cost: 700, mats: { cable: 1, metal: 6 }, label: 'Night lights & speakers', labelVi: 'Đèn đêm & loa nhạc', queue: 6, attract: 1.6, price: 1.1 }] },
  night: { kind: 'stall', biz: 'night', name: 'Sạp Đêm', en: 'Night Stall', interior: 'night', chapter: 8, buy: 2000, queueMax: 5, hours: [17 * 60, 23 * 60], menu: ['banh_trang_nuong', 'che_ba_mau'], tolerance: 1.05 },
  // outdoor kiosks: bought (no repair), run from the counter
  cafe: { kind: 'stall', biz: 'cafe', name: 'Cà Phê Bến Cảng', en: 'Harbour Café', chapter: 13, buy: 5000, queueMax: 5, hours: [6 * 60, 22 * 60], tolerance: 1.12 },
  grill: { kind: 'stall', biz: 'grill', name: 'Quán Nướng Vịnh Dừa', en: 'Coconut Cove Grill', chapter: 17, buy: 9000, queueMax: 5, hours: [10 * 60, 23 * 60], tolerance: 1.12 },
  smoothie: { kind: 'stall', biz: 'smoothie', name: 'Sinh Tố Bãi Biển', en: 'Beach Smoothie Bar', chapter: 15, buy: 7000, queueMax: 5, hours: [8 * 60, 21 * 60], tolerance: 1.1, pace: 1.1, menu: ['sinh_to_xoai', 'nuoc_dua', 'chanh_day'] },
  // the other Night Market stalls, bought one by one from their owners
  // Each has its own menu and personality (pace: customers per hour; serve: time per order; tolerance: how
  // much a pricier menu is forgiven). Chè is quick and cheap; sugarcane is quicker and cheaper still; snails are
  // slow but pricey; skewers fill up late in the evening; Bà Sáu's stall is famous for her bánh tráng.
  nm2: { kind: 'stall', biz: 'night', name: 'Sạp Chè', en: 'Sweet Soup Stall', chapter: 9, buy: 2600, queueMax: 4, hours: [17 * 60, 23 * 60], stall: true, menu: ['che_ba_mau'], pace: 1.25, serve: 0.75 },
  nm3: { kind: 'stall', biz: 'night', name: 'Sạp Ốc', en: 'Snail Stall', chapter: 9, buy: 3200, queueMax: 4, hours: [17 * 60, 23 * 60], stall: true, menu: ['oc_luoc'], pace: 0.8, serve: 1.4, tolerance: 1.1 },
  nm5: { kind: 'stall', biz: 'night', name: 'Sạp Nước Mía', en: 'Sugarcane Stall', chapter: 18, buy: 4200, queueMax: 5, hours: [17 * 60, 23 * 60], stall: true, menu: ['nuoc_mia'], pace: 1.6, serve: 0.55 },
  nm6: { kind: 'stall', biz: 'night', name: 'Sạp Xiên Que', en: 'Skewer Stall', chapter: 18, buy: 5200, queueMax: 4, hours: [17 * 60, 23 * 60], stall: true, menu: ['xien_nuong'], serve: 0.9, late: true },
  nm1: { kind: 'stall', biz: 'night', name: 'Sạp Bà Sáu', en: 'Grandma Sáu\'s Stall', chapter: 18, buy: 6500, queueMax: 4, hours: [17 * 60, 23 * 60], stall: true, menu: ['banh_trang_nuong', 'xien_nuong'], pace: 1.15, tolerance: 1.15 },
  restaurant: { kind: 'restaurant', biz: 'restaurant', name: 'Nhà Hàng', en: 'Restaurant', interior: 'restaurant', chapter: 10, buy: 10000,
           repair: { wood: 30, metal: 12, paint: 8, tile: 20 }, tables: 4,
           upgrades: [null, null, { cost: 900, mats: { wood: 12, paint: 4 }, label: 'Balcony flowers & two more tables', labelVi: 'Hoa ban công & thêm hai bàn', tables: 6, attract: 1.3 }, { cost: 1800, mats: { cable: 2, lantern: 6 }, label: 'Lantern terrace & string lights', labelVi: 'Sân lồng đèn & dây đèn', tables: 8, attract: 1.6, price: 1.1 }] },
};
// Shop levels 4–5 (island level 10 / 15) and the night stall's own upgrades.
const HIGH_UPGRADES = {
  shed1: [{ cost: 1400, mats: { tile: 6, paint: 4, lantern: 2 }, label: 'Garden seating & flower boxes', labelVi: 'Chỗ ngồi sân vườn & chậu hoa', queue: 5, attract: 1.8, price: 1.15 },
          { cost: 3600, mats: { wood: 14, cable: 2, lantern: 4 }, label: 'Neon sign & a painted mural', labelVi: 'Biển neon & tranh tường', queue: 5, attract: 2.1, price: 1.22 }],
  shed2: [{ cost: 1600, mats: { tile: 8, paint: 4, lantern: 2 }, label: 'Tiled counter & bread oven', labelVi: 'Quầy lát gạch & lò bánh mì', queue: 5, attract: 1.8, price: 1.15 },
          { cost: 4000, mats: { wood: 14, cable: 2, lantern: 4 }, label: 'Famous-shop banner & awning seats', labelVi: 'Băng rôn quán nổi tiếng & ghế mái hiên', queue: 5, attract: 2.1, price: 1.22 }],
  truck: [{ cost: 2200, mats: { metal: 8, paint: 6, cable: 1 }, label: 'Pop-out counter & beach umbrellas', labelVi: 'Quầy kéo ra & dù bãi biển', queue: 6, attract: 1.9, price: 1.15 },
          { cost: 5200, mats: { metal: 10, cable: 3, lantern: 4 }, label: 'Chrome trim & sound system', labelVi: 'Viền chrome & dàn loa', queue: 6, attract: 2.2, price: 1.22 }],
  restaurant: [{ cost: 4200, mats: { tile: 16, paint: 8, lantern: 4 }, label: 'Garden courtyard & koi bowl', labelVi: 'Sân vườn & chậu cá koi', tables: 8, attract: 1.9, price: 1.15 },
          { cost: 9500, mats: { wood: 20, cable: 4, lantern: 8 }, label: 'Rooftop lanterns & live music corner', labelVi: 'Đèn lồng sân thượng & góc nhạc sống', tables: 8, attract: 2.3, price: 1.25 }],
};
for (const [id, ups] of Object.entries(HIGH_UPGRADES)) BUSINESSES[id].upgrades.push(...ups);
// the harbour café, the cove grill and the smoothie bar: kiosk upgrades (string lights,
// seating, planters, then a famous-spot finish), drawn in gfx/buildings.js drawKiosk
const kioskUps = (base, flavour) => [null, null,
  { cost: base, mats: { cable: 1, wood: 6 }, label: 'String lights & a chalkboard menu', labelVi: 'Dây đèn & bảng menu phấn', queue: 6, attract: 1.3 },
  { cost: base * 2.2, mats: { wood: 10, paint: 4 }, label: 'Extra seating out front', labelVi: 'Thêm chỗ ngồi phía trước', queue: 6, attract: 1.6, price: 1.1 },
  { cost: base * 4.5, mats: { tile: 8, paint: 4, lantern: 3 }, label: flavour[0], labelVi: flavour[1], queue: 7, attract: 1.9, price: 1.15 },
  { cost: base * 9, mats: { cable: 3, lantern: 6, paint: 6 }, label: 'Neon trim & a famous-spot banner', labelVi: 'Viền neon & băng rôn quán nổi tiếng', queue: 7, attract: 2.2, price: 1.22 }];
BUSINESSES.cafe.upgrades = kioskUps(1200, ['Flower boxes & a coffee-bean sign', 'Chậu hoa & biển hạt cà phê']);
BUSINESSES.grill.upgrades = kioskUps(1600, ['Tiki torches & a bigger charcoal grill', 'Đuốc tiki & bếp than lớn hơn']);
BUSINESSES.smoothie.upgrades = kioskUps(1400, ['Fruit crates & a surfboard sign', 'Thùng trái cây & biển ván lướt']);
BUSINESSES.night.upgrades = [null, null,
  { cost: 900, mats: { lantern: 4, wood: 6 }, label: 'Red lantern canopy', labelVi: 'Mái lồng đèn đỏ', queue: 5, attract: 1.3 },
  { cost: 2000, mats: { cable: 2, paint: 4 }, label: 'Charcoal grill upgrade', labelVi: 'Nâng cấp bếp than', queue: 5, attract: 1.6, price: 1.1 },
  { cost: 3800, mats: { lantern: 6, tile: 8 }, label: 'Stools & a festival banner', labelVi: 'Ghế đẩu & băng rôn lễ hội', queue: 5, attract: 1.9, price: 1.15 },
  { cost: 7000, mats: { cable: 4, lantern: 8 }, label: 'Famous street-food stall', labelVi: 'Sạp ăn vặt nổi tiếng', queue: 5, attract: 2.2, price: 1.22 }];
// Branding: your own name for a shop, a colour scheme and a sign style.
export const BRAND_COLOURS = {
  classic: { en: 'Classic', vi: 'Cổ điển', awning: null },
  coral: { en: 'Coral', vi: 'San hô', awning: ['#fff5df', '#f28f7c'], sign: '#e8584e', roof: '#6fbfb0', wall: '#f7e3c0' },
  mint: { en: 'Mint', vi: 'Bạc hà', awning: ['#effaf6', '#6fbfb0'], sign: '#3f9f8a', roof: '#8fb7e0', wall: '#eef8f1' },
  sunny: { en: 'Sunny', vi: 'Nắng vàng', awning: ['#fff8e0', '#f2c14e'], sign: '#d9a032', roof: '#e8584e', wall: '#fff3d6' },
  lilac: { en: 'Lilac', vi: 'Tím hoa cà', awning: ['#f8f2ff', '#b39ddb'], sign: '#8a6fbf', roof: '#f4a9b8', wall: '#f6effa' },
  sky: { en: 'Sky', vi: 'Trời xanh', awning: ['#f0f7ff', '#8fb7e0'], sign: '#5f8fb8', roof: '#f2c14e', wall: '#eef4fb' },
  rose: { en: 'Rose', vi: 'Hồng', awning: ['#fff5f7', '#f28fa3'], sign: '#d9607a', roof: '#9fd8c8', wall: '#fbeaee' },
};
export const SIGN_STYLES = {
  plain: { en: 'Painted board', vi: 'Bảng sơn', cost: 0 },
  outline: { en: 'Hand-lettered', vi: 'Chữ viết tay', cost: 250 },
  lights: { en: 'Marquee lights', vi: 'Bảng đèn', cost: 1500, lv: 12 },
  neon: { en: 'Neon glow', vi: 'Đèn neon', cost: 4000, lv: 20 },
};
export const BRAND_RECOLOUR = 60;   // repainting costs a little paint money
// island level needed for each shop level
export const SHOP_LEVEL_REQ = [0, 0, 1, 3, 10, 15];

// Equipment: small buys per shop (island level gated).
export const EQUIPMENT = [
  { id: 'tipjar', icon: 'coin', lv: 6, cost: 270, en: 'Tip jar', vi: 'Hũ tiền boa', fx: '+15% tips', fxVi: '+15% tiền boa', tip: 1.15 },
  { id: 'fan', icon: 'star', lv: 6, cost: 360, en: 'Standing fan', vi: 'Quạt đứng', fx: 'Customers wait 15% longer', fxVi: 'Khách chờ lâu hơn 15%', patience: 1.15 },
  { id: 'chalkboard', icon: 'menu', lv: 7, cost: 480, en: 'Chalk menu board', vi: 'Bảng phấn thực đơn', fx: '+10% customers', fxVi: '+10% khách', attract: 1.1 },
  { id: 'radio', icon: 'talk', lv: 9, cost: 680, en: 'Little radio', vi: 'Radio nhỏ', fx: 'Wait 10% longer · tips +5%', fxVi: 'Chờ lâu hơn 10% · boa +5%', patience: 1.1, tip: 1.05 },
  { id: 'stampcard', icon: 'heart', lv: 11, cost: 980, en: 'Loyalty stamp cards', vi: 'Thẻ tích điểm', fx: 'Regulars tip +15%', fxVi: 'Khách quen boa +15%', regTip: 1.15 },
  { id: 'lightbox', icon: 'lantern', lv: 13, cost: 1350, en: 'Lit roadside sign', vi: 'Biển đèn ven đường', fx: '+20% customers after 6pm', fxVi: '+20% khách sau 18:00', night: 1.2 },
  { id: 'register', icon: 'coin', lv: 16, cost: 2100, en: 'Shiny cash register', vi: 'Máy tính tiền mới', fx: 'Prices +5% without scaring anyone', fxVi: 'Giá +5% mà khách không phàn nàn', price: 1.05 },
];
// price the player sets for a recipe: multiplier of the base price
export const PRICE_RANGE = [0.7, 1.3];

export const NIGHT_MARKET_RESTORE = { mats: { wood: 20, metal: 8, paint: 6, lantern: 12, cable: 2 }, cost: 400 };

// ---------------------------------------------------------------- employees (restaurants only)
export const ROLES = {
  cook:    { vi: 'Đầu bếp', en: 'Cook',    desc: 'Cooks tickets at the stove.', descVi: 'Nấu món ở bếp.' },
  server:  { vi: 'Phục vụ', en: 'Server',  desc: 'Takes orders and carries dishes.', descVi: 'Nhận order và bưng món.' },
  prep:    { vi: 'Sơ chế',  en: 'Prep',    desc: 'Keeps prepared ingredients stocked.', descVi: 'Luôn chuẩn bị sẵn nguyên liệu.' },
  cleaner: { vi: 'Dọn dẹp', en: 'Cleaner', desc: 'Clears and wipes tables.', descVi: 'Dọn và lau bàn.' },
  keeper:  { vi: 'Người trông quán', en: 'Shopkeeper', desc: 'Runs a small shop for you.', descVi: 'Trông quán nhỏ giúp bạn.' },
  cashier: { vi: 'Thu ngân',en: 'Cashier', desc: 'Takes payments, deposits earnings to you, and guests tip a little more at a tidy counter.', descVi: 'Thu tiền, nộp lại cho bạn, và khách boa nhiều hơn chút ở quầy gọn gàng.' },
  manager: { vi: 'Quản lý', en: 'Manager', desc: 'From Chapter 19: keeps the whole team quicker and steadier, and covers whatever job is missing.', descVi: 'Từ Chương 19: giúp cả đội nhanh và đều tay hơn, và làm thay việc còn thiếu người.' },
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
  piano:       { vi: 'Đàn piano',      en: 'Little piano',    price: 380, w: 46, h: 18, unlock: 8 },
  aquarium_big:{ vi: 'Hồ cá koi',      en: 'Koi basin',       price: 450, w: 46, h: 26, unlock: 10 },
  armchair:    { vi: 'Ghế bành',       en: 'Comfy armchair',  price: 130, w: 30, h: 14 },
  bean_bag:    { vi: 'Ghế lười',       en: 'Bean bag',        price: 70,  w: 30, h: 14 },
  rocking_chair:{ vi: 'Ghế bập bênh',  en: 'Rocking chair',   price: 115, w: 26, h: 12 },
  dresser:     { vi: 'Tủ ngăn kéo',    en: 'Dresser',         price: 140, w: 38, h: 14, wallish: true },
  record_player:{ vi: 'Máy hát đĩa',   en: 'Record player',   price: 160, w: 24, h: 12 },
  vase_ceramic:{ vi: 'Bình gốm Bát Tràng', en: 'Blue ceramic vase', price: 85, w: 16, h: 10 },
  hanging_plant:{ vi: 'Chậu cây treo', en: 'Hanging plant',   price: 45,  w: 14, h: 8, wall: true },
  wall_mirror: { vi: 'Gương mặt trời', en: 'Sunburst mirror', price: 80,  w: 24, h: 8, wall: true },
  lamp_table:  { vi: 'Bàn đèn ngủ',    en: 'Bedside lamp table', price: 75, w: 20, h: 12, light: true },
  bamboo_screen:{ vi: 'Bình phong tre', en: 'Bamboo screen',  price: 120, w: 48, h: 10 },
  // the cosy collection (5.12)
  neon_sign:   { vi: 'Biển neon "Bistro"', en: '"Bistro" neon sign', price: 190, w: 48, h: 8, wall: true, light: true },
  moon_lamp:   { vi: 'Đèn mặt trăng',  en: 'Moon lamp',       price: 135, w: 22, h: 10, light: true },
  mai_tree:    { vi: 'Cây mai ngày Tết', en: 'Tết apricot blossom tree', price: 240, w: 30, h: 14 },
  arcade_cabinet:{ vi: 'Máy chơi game thùng', en: 'Island arcade cabinet', price: 320, w: 26, h: 14 },
  tea_set:     { vi: 'Bộ ấm chén trà', en: 'Bát Tràng tea set', price: 105, w: 36, h: 14 },
  bird_cage:   { vi: 'Lồng chim hoàng yến', en: 'Canary in a bamboo cage', price: 155, w: 22, h: 10 },
  telescope:   { vi: 'Kính thiên văn', en: 'Brass telescope', price: 180, w: 24, h: 12 },
  cat_tower:   { vi: 'Nhà cây cho mèo', en: 'Cat tower',       price: 130, w: 32, h: 14 },
  fairy_lights:{ vi: 'Dây đèn lấp lánh', en: 'Fairy lights',   price: 60,  w: 52, h: 8, wall: true, light: true },
  surfboard_rack:{ vi: 'Giá ván lướt sóng', en: 'Surfboard rack', price: 90, w: 32, h: 10 },
  // the upstairs & basement collection (5.18): bedrooms, a study, a games room, a workshop, traditional pieces
  bed_double:  { vi: 'Giường đôi', en: 'Double bed', price: 420, w: 64, h: 40 },
  bunk_bed:    { vi: 'Giường tầng', en: 'Bunk bed', price: 300, w: 40, h: 28 },
  nightstand:  { vi: 'Tủ đầu giường', en: 'Nightstand', price: 90, w: 18, h: 12, light: true },
  vanity:      { vi: 'Bàn trang điểm', en: 'Vanity table', price: 220, w: 36, h: 14 },
  study_desk:  { vi: 'Bàn học', en: 'Study desk', price: 200, w: 44, h: 18 },
  desk_chair:  { vi: 'Ghế xoay', en: 'Swivel chair', price: 80, w: 16, h: 14 },
  floor_cushions:{ vi: 'Gối ngồi bệt', en: 'Floor cushions', price: 60, w: 34, h: 18 },
  clothes_rack:{ vi: 'Giá treo quần áo', en: 'Clothes rail', price: 110, w: 40, h: 10 },
  sewing_table:{ vi: 'Bàn máy may', en: 'Sewing machine table', price: 260, w: 34, h: 14 },
  floor_mirror:{ vi: 'Gương đứng', en: 'Standing mirror', price: 120, w: 16, h: 8 },
  pool_table:  { vi: 'Bàn bi-a', en: 'Pool table', price: 900, w: 60, h: 34, unlock: 8 },
  foosball:    { vi: 'Bàn bi lắc', en: 'Foosball table', price: 380, w: 40, h: 20 },
  ping_pong:   { vi: 'Bàn bóng bàn', en: 'Ping-pong table', price: 520, w: 56, h: 30, unlock: 6 },
  jukebox:     { vi: 'Máy hát tự động', en: 'Jukebox', price: 650, w: 24, h: 14, light: true, unlock: 8 },
  karaoke_set: { vi: 'Dàn karaoke', en: 'Karaoke set', price: 700, w: 40, h: 14, light: true, unlock: 8 },
  workbench:   { vi: 'Bàn thợ mộc', en: 'Workbench', price: 240, w: 50, h: 18 },
  washing_machine:{ vi: 'Máy giặt', en: 'Washing machine', price: 300, w: 22, h: 18 },
  pantry_shelf:{ vi: 'Kệ hũ đồ khô', en: 'Pantry shelf', price: 180, w: 38, h: 14, wallish: true },
  fish_sauce_barrels:{ vi: 'Thùng nước mắm', en: 'Fish sauce barrels', price: 150, w: 36, h: 18 },
  weights_rack:{ vi: 'Giá tạ', en: 'Weights rack', price: 260, w: 36, h: 10 },
  treadmill:   { vi: 'Máy chạy bộ', en: 'Treadmill', price: 480, w: 22, h: 40 },
  co_tuong_table:{ vi: 'Bàn cờ tướng', en: 'Cờ tướng table (Chinese chess)', price: 210, w: 48, h: 16 },
  sap_go:      { vi: 'Sập gụ', en: 'Carved daybed (sập gụ)', price: 850, w: 56, h: 30, unlock: 10 },
  altar_cabinet:{ vi: 'Tủ thờ gia tiên', en: 'Family altar cabinet', price: 600, w: 44, h: 16, light: true, wallish: true },
  bonsai_rock: { vi: 'Hòn non bộ', en: 'Rock garden fountain', price: 750, w: 40, h: 24, unlock: 10 },
  spinning_lantern:{ vi: 'Đèn kéo quân', en: 'Spinning lantern', price: 140, w: 16, h: 12, light: true },
  egg_chair:   { vi: 'Ghế mây treo', en: 'Hanging rattan chair', price: 340, w: 28, h: 22 },
  bamboo_bench:{ vi: 'Ghế tre dài', en: 'Bamboo bench', price: 130, w: 46, h: 14 },
  dartboard:   { vi: 'Bảng phi tiêu', en: 'Dartboard', price: 70, w: 24, h: 8, wall: true },
  tool_wall:   { vi: 'Bảng treo dụng cụ', en: 'Tool wall', price: 120, w: 44, h: 8, wall: true },
  projector_screen:{ vi: 'Màn chiếu phim', en: 'Projector screen', price: 560, w: 64, h: 8, wall: true, light: true, unlock: 8 },
  // collector's corner: expensive treats to save up for (prices here are final)
  meo_plush:   { vi: 'Thú bông Mèo Mây', en: 'Mèo Mây plush',  price: 900,  w: 18, h: 12, collector: true, unlock: 4, fixed: true },
  lantern_wall:{ vi: 'Bộ sưu tập lồng đèn', en: 'Night Market lantern collection', price: 1800, w: 50, h: 8, wall: true, collector: true, unlock: 9, fixed: true },
  ship_model:  { vi: 'Mô hình thuyền', en: 'Model ferry',        price: 2500, w: 36, h: 12, collector: true, unlock: 12, fixed: true },
  art_commission:{ vi: 'Tranh đặt vẽ của Vy', en: 'A painting commissioned from Vy', price: 3500, w: 50, h: 8, wall: true, collector: true, unlock: 14, need: 'vy_brushes', fixed: true },
  // prizes for the weekly board's top 10 (systems/weekboard.js); never sold
  // the Lantern Lounge bundle (store.js) — looks only, no bonuses
  lounge_sofa:  { vi: 'Sofa nhung lồng đèn', en: 'Lantern lounge sofa', price: 0, w: 46, h: 14, reward: true, fixed: true },
  lantern_tree: { vi: 'Cây lồng đèn', en: 'Lantern tree', price: 0, w: 20, h: 12, reward: true, fixed: true, light: true },
  koi_lamp:     { vi: 'Đèn cá koi', en: 'Koi lamp', price: 0, w: 14, h: 10, reward: true, fixed: true, light: true },
  giant_shell:  { vi: 'Vỏ ốc khổng lồ', en: 'Giant conch shell', price: 0, w: 22, h: 12, reward: true, fixed: true },
  bottle_ship:  { vi: 'Thuyền trong chai', en: 'Ship in a bottle', price: 0, w: 22, h: 10, reward: true, fixed: true },
  lantern_hand_pink: { vi: 'Lồng đèn tự làm (hồng)', en: 'Handmade lantern (pink)', price: 0, w: 12, h: 10, light: true, wall: true, reward: true, fixed: true },
  lantern_hand_teal: { vi: 'Lồng đèn tự làm (xanh)', en: 'Handmade lantern (teal)', price: 0, w: 12, h: 10, light: true, wall: true, reward: true, fixed: true },
  lantern_hand_gold: { vi: 'Lồng đèn tự làm (vàng)', en: 'Handmade lantern (gold)', price: 0, w: 12, h: 10, light: true, wall: true, reward: true, fixed: true },
  opening_balloons: { vi: 'Bóng bay khai trương', en: 'Grand Opening balloons', price: 0, w: 16, h: 10, reward: true, fixed: true },
  trophy_gold:   { vi: 'Cúp vàng của tuần', en: 'Weekly gold cup', price: 0, w: 18, h: 12, reward: true, fixed: true, light: true },
  trophy_silver: { vi: 'Cúp bạc của tuần', en: 'Weekly silver cup', price: 0, w: 18, h: 12, reward: true, fixed: true },
  trophy_bronze: { vi: 'Cúp đồng của tuần', en: 'Weekly bronze cup', price: 0, w: 18, h: 12, reward: true, fixed: true },
  meo_statue:  { vi: 'Tượng Mèo Mây mạ vàng', en: 'Golden Mèo Mây statue', price: 6000, w: 34, h: 16, collector: true, unlock: 16, fixed: true },
};

// ---------------------------------------------------------------- customers
export const PERSONALITIES = {
  patient:  { vi: 'Kiên nhẫn', en: 'Patient', patience: 1.4,  tip: 1.0, weight: 3 },
  rushed:   { vi: 'Vội vàng', en: 'In a hurry',  patience: 0.62, tip: 1.25, weight: 2 },
  regular:  { vi: 'Khách quen', en: 'Regular', patience: 1.15, tip: 1.1, weight: 2 },
  excited:  { vi: 'Hào hứng', en: 'Excited',  patience: 1.0,  tip: 1.2, weight: 2 },
  picky:    { vi: 'Khó tính', en: 'Picky',  patience: 0.9,  tip: 1.45, weight: 1 },
  tourist:  { vi: 'Du khách', en: 'Tourist',  patience: 1.1,  tip: 1.3, weight: 3 },
  // by look, not drawn at random: little ones and grandparents
  kid:      { vi: 'Em bé', en: 'Kid',  patience: 0.85, tip: 0.6, weight: 0 },
  elder:    { vi: 'Ông bà', en: 'Grandparent',  patience: 1.7, tip: 1.2, weight: 0 },
};

// ---------------------------------------------------------------- chapters
export const CHAPTERS = [
  null,
  { n: 1, title: 'A New Arrival', vi: 'Người Mới Đến' },
  { n: 2, title: 'First Regulars', vi: 'Những Khách Quen Đầu Tiên' },
  { n: 3, title: 'Word Is Spreading', vi: 'Tiếng Lành Đồn Xa' },
  { n: 4, title: 'A Second Shop', vi: 'Quán Thứ Hai' },
  { n: 5, title: 'A Helping Hand', vi: 'Có Người Phụ Giúp' },
  { n: 6, title: 'Supplies & Rent', vi: 'Hàng Hóa & Tiền Thuê' },
  { n: 7, title: 'On Wheels', vi: 'Lăn Bánh' },
  { n: 8, title: 'The Night Market', vi: 'Chợ Đêm' },
  { n: 9, title: 'More Stalls', vi: 'Thêm Sạp Mới' },
  { n: 10, title: 'The Restaurant', vi: 'Nhà Hàng' },
  { n: 11, title: 'A Destination', vi: 'Điểm Đến Của Mọi Người' },
  { n: 12, title: 'Harbour Town', vi: 'Phố Cảng' },
  { n: 13, title: 'The Harbour Café', vi: 'Quán Cà Phê Bến Cảng' },
  { n: 14, title: 'The Long Bridge', vi: 'Cây Cầu Dài' },
  { n: 15, title: 'Landlord', vi: 'Chủ Đất' },
  { n: 16, title: 'The Lantern Festival', vi: 'Lễ Hội Đèn Lồng' },
  { n: 17, title: 'Coconut Cove', vi: 'Vịnh Dừa' },
  { n: 18, title: 'Queen of the Night Market', vi: 'Nữ Hoàng Chợ Đêm' },
  { n: 19, title: 'The Island Runs Itself', vi: 'Hòn Đảo Tự Vận Hành' },
  { n: 20, title: 'Keeper of the Island', vi: 'Người Giữ Đảo' },
];
export const HARBOUR_BRIDGE = { cost: 4000, mats: { wood: 40, metal: 16, paint: 8 } };
export const COVE_BRIDGE = { cost: 6000, mats: { wood: 50, metal: 20, paint: 10, tile: 10 } };
export const BRIDGE_REPAIR = { cost: 1500, mats: { wood: 40, metal: 12, paint: 6 } };
export const VY_VIEWS = [
  { id: 'lookout', x: 2470, y: 1440, en: 'the lookout tower', vi: 'tháp canh' },
  { id: 'firefly', x: 2250, y: 1360, en: 'the firefly banyan', vi: 'cây đa đom đóm' },
  { id: 'lighthouse', x: 900, y: 360, en: 'the lighthouse', vi: 'ngọn hải đăng' },
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
  money_10000:    { en: 'Island Tycoon', desc: 'Earn 10M in total.', vi: 'Đại gia của đảo', descVi: 'Kiếm tổng cộng 10 triệu.' },
  two_biz:        { en: 'Second Shop', desc: 'Own two working businesses.', vi: 'Quán thứ hai', descVi: 'Có hai cửa hàng hoạt động.' },
  truck:          { en: 'On Wheels', desc: 'Buy the food truck.', vi: 'Lăn bánh', descVi: 'Mua xe bán đồ ăn.' },
  night_market:   { en: 'Lanterns Lit', desc: 'Restore the Night Market.', vi: 'Lồng đèn sáng rực', descVi: 'Khôi phục Chợ Đêm.' },
  restaurant:     { en: 'Grand Opening', desc: 'Open your restaurant.', vi: 'Khai trương hoành tráng', descVi: 'Mở nhà hàng.' },
  first_hire:     { en: 'Team Player', desc: 'Hire your first restaurant employee.', vi: 'Tinh thần đồng đội', descVi: 'Thuê nhân viên nhà hàng đầu tiên.' },
  full_team:      { en: 'Well-Oiled Kitchen', desc: 'Staff every restaurant role.', vi: 'Bếp vận hành trơn tru', descVi: 'Có đủ mọi vị trí trong nhà hàng.' },
  cozy_home:      { en: 'Home Sweet Home', desc: 'Place 5 pieces of furniture.', vi: 'Tổ ấm', descVi: 'Đặt 5 món nội thất.' },
  day_7:          { en: 'One Week In', desc: 'Reach day 7.', vi: 'Một tuần trên đảo', descVi: 'Đến ngày thứ 7.' },
  statue:         { en: 'Founder', desc: 'Unveil the founder statue.', vi: 'Người sáng lập', descVi: 'Khánh thành tượng người sáng lập.' },
  max_level:      { en: 'Master Builder', desc: 'Upgrade a business to level 3.', vi: 'Bậc thầy xây dựng', descVi: 'Nâng cấp một quán lên cấp 3.' },
  tip_big:        { en: 'Big Tipper', desc: 'Receive a tip of 20k or more.', vi: 'Khách sộp', descVi: 'Nhận tiền boa từ 20k trở lên.' },
  first_keeper:   { en: 'A Helping Hand', desc: 'Hire your first shopkeeper.', vi: 'Có người phụ giúp', descVi: 'Thuê người trông quán đầu tiên.' },
  lantern_festival: { en: 'Festival of Lights', desc: 'Light up the Lantern Festival.', vi: 'Đêm hội đèn lồng', descVi: 'Thắp sáng Lễ Hội Đèn Lồng.' },
  // hidden: shown as ??? until you stumble on them
  sunrise:        { hidden: true, en: 'First Light', desc: 'Watch the sunrise from Lighthouse Point.', vi: 'Tia nắng đầu tiên', descVi: 'Ngắm bình minh ở Ngọn Hải Đăng.', hint: ['Early birds see the lighthouse at its best.', 'Người dậy sớm mới thấy hải đăng đẹp nhất.'] },
  social_day:     { hidden: true, en: 'Social Butterfly', desc: 'Talk to every resident in a single day.', vi: 'Con bướm xã giao', descVi: 'Trò chuyện với mọi cư dân trong một ngày.', hint: ['Some days, say hello to everyone.', 'Có hôm, hãy chào hỏi tất cả mọi người.'] },
  all_homes:      { hidden: true, en: 'Welcome Everywhere', desc: 'Visit every resident\'s home.', vi: 'Ở đâu cũng được đón', descVi: 'Ghé thăm nhà của mọi cư dân.', hint: ['Every door on the island has a story.', 'Cánh cửa nào trên đảo cũng có một câu chuyện.'] },
  meo_naps:       { hidden: true, en: 'Nap Spotter', desc: 'Find Mèo Mây napping in four different places.', vi: 'Thợ săn giấc ngủ', descVi: 'Bắt gặp Mèo Mây ngủ trưa ở bốn nơi khác nhau.', hint: ['Afternoons are sleepy for some of us.', 'Buổi chiều, có ai đó hay buồn ngủ lắm.'] },
  duck_friend:    { hidden: true, en: 'Friend of Ducks', desc: 'Feed the lotus-pond ducks on five different days.', vi: 'Bạn của lũ vịt', descVi: 'Cho vịt ở hồ sen ăn vào năm ngày khác nhau.', hint: ['The pond has regulars too.', 'Hồ sen cũng có khách quen.'] },
  keeper_island:  { en: 'Keeper of the Island', desc: 'Complete all 20 chapters of the story.', vi: 'Người Giữ Đảo', descVi: 'Hoàn thành cả 20 chương của câu chuyện.' },
};
// ---------------------------------------------------------------- story requirements (one source of truth)
// Dialogue, objective text, completion checks and what the event consumes all read these.
export const FESTIVAL_REQ = { level: 20, lanterns: 16, served: 40 };     // Chapter 16: the Lantern Festival
export const KEEPER_REQ = { level: 30, regulars: 15 };                     // Chapter 20: Keeper of the Island (and every business owned)
export const STATUE_COST = { cost: 3500, mats: { paint: 10, tile: 10 } };

// ---------------------------------------------------------------- economy tuning (a real grind)
// The money balance in one place. Prices written above are list prices; these multipliers
// make the game's economy. Owning everything (every business, upgrade, property, recipe
// level, outfit, piece of furniture and pet) is meant to take many weeks of island days,
// not a few. Other knobs: customer flow (business.js nextSpawnDelay), shopkeeper wages and
// supply runners (economy.js), rent & property (economy.js PLACES), clothes (wardrobe.js),
// pets (pets.js), level and milestone rewards (progress.js).
export const ECON = {
  furniture: 5,          // furniture × list price
  upgrades: 3.5,         // shop upgrades × list price
  businesses: 1.5,       // buying a business (and its key from Mèo Mây) ×
  build: 1.75,           // the bridges, the statue and the Night Market restoration ×
  ingredients: 1.25,     // what ingredients cost × — thinner margins on every sale
};
for (const v of Object.values(FURNITURE)) if (!v.fixed) v.price = Math.round(v.price * ECON.furniture / 5) * 5;
for (const b of Object.values(BUSINESSES)) for (const u of b.upgrades || []) if (u?.cost) u.cost = Math.round(u.cost * ECON.upgrades / 10) * 10;
for (const b of Object.values(BUSINESSES)) if (b.buy) b.buy = Math.round(b.buy * ECON.businesses / 50) * 50;
for (const r of [BRIDGE_REPAIR, HARBOUR_BRIDGE, COVE_BRIDGE, STATUE_COST, NIGHT_MARKET_RESTORE]) r.cost = Math.round(r.cost * ECON.build / 50) * 50;
for (const g of Object.values(INGREDIENTS)) { g.cost = Math.round(g.cost * ECON.ingredients * 100) / 100; g.price = Math.max(1, Math.round(g.cost * g.pack)); }
