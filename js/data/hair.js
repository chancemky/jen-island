// Haircuts. Each style describes how hair sits on the round head:
//   f / s / b   hairline height at the front, sides and back (radians of latitude)
//   vol         size of the hair shell around the head
//   curtain     length of hair hanging below the head; jaw: bob that frames the jaw
//   sweep       side-swept fringe (+/- for direction); cpart: centre-parted curtain bangs
//   blunt       straight-cut fringe; tipsAmp: how pointy the fringe tips are
//   quiff / puff / curls / messy / slick / fade / mohawk / buzz: extra shapes
//   tails / pony / buns / topBun: attachments (braid, high/low/side, length)
// `g` is who the salon lists it under; anyone can wear anything.

export const HAIRCUTS = {
  // ---------------- women
  bob:        { g: 'f', price: 0,   en: 'Classic Bob', vi: 'Tóc bob cổ điển', H: { f: 0.3, s: -0.6, b: -0.95, vol: 1.12, jaw: true, crown: 0.1, side: 0.12, tex: 0.01 } },
  long:       { g: 'f', price: 0,   en: 'Long & Straight', vi: 'Tóc dài thẳng', H: { f: 0.3, s: -0.5, b: -1.2, vol: 1.1, curtain: 13, crown: 0.1, side: 0.06 } },
  wavy:       { g: 'f', price: 80,  en: 'Beach Waves', vi: 'Tóc xoăn sóng', H: { f: 0.28, s: -0.5, b: -1.2, vol: 1.13, curtain: 14, wavy: true, crown: 0.1, side: 0.1, tex: 0.03 } },
  twin:       { g: 'f', price: 80,  en: 'Twin Tails', vi: 'Tóc buộc hai bên', H: { f: 0.3, s: -0.25, b: -0.7, vol: 1.05, tails: { len: 11 } } },
  pony:       { g: 'f', price: 0,   en: 'Ponytail', vi: 'Tóc đuôi ngựa', H: { f: 0.33, s: -0.1, b: -0.55, vol: 1.04, pony: { len: 11 } } },
  buns:       { g: 'f', price: 90,  en: 'Space Buns', vi: 'Tóc búi hai bên', H: { f: 0.35, s: -0.1, b: -0.5, vol: 1.04, buns: true } },
  lob:        { g: 'f', price: 120, en: 'Swept Lob', vi: 'Tóc lob rẽ ngôi', H: { f: 0.26, s: -0.58, b: -1.0, vol: 1.12, jaw: true, curtain: 5, sweep: 1, crown: 0.11, side: 0.1 } },
  pixie:      { g: 'f', price: 110, en: 'Pixie Cut', vi: 'Tóc tém pixie', H: { f: 0.34, s: 0.0, b: -0.5, vol: 1.07, sweep: 1.4, tipsAmp: 0.13, crown: 0.12, tex: 0.04 } },
  curtain:    { g: 'f', price: 140, en: 'Curtain Bangs', vi: 'Mái bay dài', H: { f: 0.2, s: -0.5, b: -1.2, vol: 1.1, curtain: 13, cpart: 0.38, blunt: true, crown: 0.1, side: 0.08 } },
  hime:       { g: 'f', price: 150, en: 'Hime Cut', vi: 'Tóc công chúa', H: { f: 0.2, s: -0.72, b: -1.2, vol: 1.06, curtain: 14, blunt: true, jaw: true } },
  highpony:   { g: 'f', price: 100, en: 'High Ponytail', vi: 'Đuôi ngựa cột cao', H: { f: 0.3, s: -0.05, b: -0.45, vol: 1.04, pony: { high: true, len: 13 } } },
  sidebraid:  { g: 'f', price: 160, en: 'Side Braid', vi: 'Tóc tết lệch', H: { f: 0.3, s: -0.1, b: -0.55, vol: 1.05, sweep: -1, pony: { side: 1, braid: true, len: 14 } } },
  braids:     { g: 'f', price: 160, en: 'Double Braids', vi: 'Hai bím tết', H: { f: 0.3, s: -0.2, b: -0.6, vol: 1.04, tails: { braid: true, len: 15 } } },
  curly:      { g: 'f', price: 170, en: 'Long Curls', vi: 'Tóc xoăn dài', H: { f: 0.25, s: -0.5, b: -1.1, vol: 1.2, curtain: 12, curls: true, crown: 0.12, side: 0.12 } },
  messybun:   { g: 'f', price: 120, en: 'Messy Bun', vi: 'Búi rối', H: { f: 0.32, s: -0.05, b: -0.45, vol: 1.04, topBun: { messy: true }, messy: true } },
  halfup:     { g: 'f', price: 150, en: 'Half-Up', vi: 'Tóc búi nửa đầu', H: { f: 0.3, s: -0.45, b: -1.1, vol: 1.07, curtain: 12, topBun: { small: true, back: true } } },
  frenchbob:  { g: 'f', price: 130, en: 'French Bob', vi: 'Tóc bob Pháp', H: { f: 0.16, s: -0.45, b: -0.8, vol: 1.12, jaw: true, blunt: true, crown: 0.08, side: 0.14 } },
  shag:       { g: 'f', price: 140, en: 'Shag', vi: 'Tóc tỉa tầng', H: { f: 0.28, s: -0.5, b: -1.0, vol: 1.14, curtain: 9, messy: true, wavy: true, cpart: 0.2, crown: 0.13, side: 0.1, tex: 0.05 } },
  lowpony:    { g: 'f', price: 110, en: 'Low Ponytail', vi: 'Đuôi ngựa thấp', H: { f: 0.28, s: -0.2, b: -0.6, vol: 1.04, cpart: 0.25, pony: { low: true, len: 11 } } },
  afropuff:   { g: 'f', price: 150, en: 'Afro Puff', vi: 'Búi xù', H: { f: 0.45, s: 0.05, b: -0.4, vol: 1.06, puff: 6.6 } },
  wolf:       { g: 'f', price: 150, en: 'Wolf Cut', vi: 'Tóc wolf cut', H: { f: 0.26, s: -0.45, b: -1.0, vol: 1.15, curtain: 10, messy: true, tipsAmp: 0.15, crown: 0.14, side: 0.12, tex: 0.06 } },
  sidepart:   { g: 'f', price: 140, en: 'Deep Side Part', vi: 'Rẽ ngôi lệch sâu', H: { f: 0.3, s: -0.5, b: -1.2, vol: 1.08, curtain: 14, sweep: 1.7, wavy: true } },
  // ---------------- men
  short:      { g: 'm', price: 0,   en: 'Short & Neat', vi: 'Tóc ngắn gọn', H: { f: 0.42, s: 0.05, b: -0.55, vol: 1.06, crown: 0.14, side: 0.0, tex: 0.035, sweep: 0.6 } },
  spiky:      { g: 'm', price: 0,   en: 'Spiky', vi: 'Tóc dựng', H: { f: 0.44, s: 0.1, b: -0.5, vol: 1.05, spikes: true } },
  crew:       { g: 'm', price: 70,  en: 'Crew Cut', vi: 'Tóc húi cua', H: { f: 0.5, s: 0.2, b: -0.45, vol: 1.03, tipsAmp: 0.04, crown: 0.08, tex: 0.02 } },
  undercut:   { g: 'm', price: 140, en: 'Undercut', vi: 'Tóc undercut', H: { f: 0.4, s: 0.35, b: -0.3, vol: 1.03, sweep: 1.2, fade: true, quiff: 3.4 } },
  quiff:      { g: 'm', price: 130, en: 'Quiff', vi: 'Tóc quiff', H: { f: 0.46, s: 0.2, b: -0.45, vol: 1.04, quiff: 5 } },
  pompadour:  { g: 'm', price: 170, en: 'Pompadour', vi: 'Tóc pompadour', H: { f: 0.55, s: 0.25, b: -0.4, vol: 1.03, quiff: 6.8, slick: true, fade: true } },
  gentpart:   { g: 'm', price: 120, en: 'Gentleman\'s Part', vi: 'Rẽ ngôi lịch lãm', H: { f: 0.42, s: 0.1, b: -0.5, vol: 1.04, sweep: 1.8, blunt: true, slick: true } },
  curtains:   { g: 'm', price: 130, en: 'Middle Part', vi: 'Rẽ ngôi giữa', H: { f: 0.22, s: -0.1, b: -0.6, vol: 1.08, cpart: 0.42, blunt: true, crown: 0.12, side: 0.04 } },
  buzz:       { g: 'm', price: 60,  en: 'Buzz Cut', vi: 'Tóc cạo sát', H: { f: 0.62, s: 0.25, b: -0.2, vol: 1.0, blunt: true, buzz: true } },
  messy:      { g: 'm', price: 110, en: 'Messy Textured', vi: 'Tóc rối tự nhiên', H: { f: 0.36, s: 0.05, b: -0.55, vol: 1.08, messy: true, tipsAmp: 0.14, crown: 0.16, tex: 0.07 } },
  mohawk:     { g: 'm', price: 180, en: 'Mohawk', vi: 'Tóc mohican', H: { f: 1.0, s: 1.0, b: 1.0, vol: 1.0, mohawk: true, fade: true } },
  manbun:     { g: 'm', price: 150, en: 'Man Bun', vi: 'Tóc búi nam', H: { f: 0.4, s: 0.05, b: -0.5, vol: 1.04, sweep: 1, topBun: { small: true, back: true } } },
  longm:      { g: 'm', price: 140, en: 'Shoulder Length', vi: 'Tóc dài ngang vai', H: { f: 0.3, s: -0.4, b: -0.9, vol: 1.1, curtain: 7, cpart: 0.25, crown: 0.1, side: 0.07 } },
  curlytop:   { g: 'm', price: 150, en: 'Curly Top', vi: 'Tóc xoăn đỉnh', H: { f: 0.35, s: 0.25, b: -0.4, vol: 1.1, curls: true, fade: true, crown: 0.16 } },
  afro:       { g: 'm', price: 160, en: 'Afro', vi: 'Tóc afro', H: { f: 0.4, s: -0.1, b: -0.6, vol: 1.3, curls: true, crown: 0.18, side: 0.06 } },
  crop:       { g: 'm', price: 120, en: 'Textured Crop', vi: 'Tóc crop', H: { f: 0.3, s: 0.15, b: -0.45, vol: 1.05, blunt: true, fade: true, messy: true } },
  bowl:       { g: 'm', price: 90,  en: 'Bowl Cut', vi: 'Tóc úp tô', H: { f: 0.12, s: -0.1, b: -0.35, vol: 1.1, blunt: true, crown: 0.06, side: 0.1 } },
  slick:      { g: 'm', price: 140, en: 'Slicked Back', vi: 'Tóc vuốt ngược', H: { f: 0.75, s: 0.15, b: -0.5, vol: 1.03, slick: true } },
  wavym:      { g: 'm', price: 130, en: 'Wavy Flow', vi: 'Tóc gợn sóng', H: { f: 0.33, s: -0.2, b: -0.7, vol: 1.1, wavy: true, sweep: 0.8, crown: 0.13, tex: 0.04 } },
  mullet:     { g: 'm', price: 150, en: 'Mullet', vi: 'Tóc mullet', H: { f: 0.4, s: 0.05, b: -0.5, vol: 1.07, curtain: 7, narrow: true, crown: 0.13, tex: 0.03 } },
  bald:       { g: 'm', price: 50,  en: 'Clean Shave', vi: 'Cạo trọc', H: { f: 1.3, s: 1.3, b: 1.3, vol: 1, bald: true } },
  // ---------------- older names kept for residents and saves
  granny:     { g: 'x', price: 0, en: 'Grandma Bun', vi: 'Búi bà', H: { f: 0.5, s: 0.1, b: -0.4, vol: 1.05, topBun: {} } },
};
export const HAIR_COLORS = ['#4a322b', '#2f2a30', '#6e4430', '#9a6443', '#c9895b', '#e0b872', '#8f8494', '#e59aac', '#6f9fc8', '#8fcf9a', '#3d3550', '#b9b3ba'];
export const hairName = id => HAIRCUTS[id] || HAIRCUTS.bob;
