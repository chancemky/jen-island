// Comfort settings (Menu → Settings): text size, high contrast and left-handed controls,
// applied as classes on <body> (styles in css/game.css).
import { G } from '../systems/state.js';
export function applyComfort() {
  const st = G.state?.settings || {}, b = document.body.classList;
  b.toggle('text-l', st.textSize === 'l'); b.toggle('text-xl', st.textSize === 'xl');
  b.toggle('hc', !!st.contrast); b.toggle('lefty', !!st.lefty); b.toggle('cb', !!st.colorblind);
}
// bad / so-so / good, in colours everyone can tell apart (the colour-blind palette swaps red and
// green for vermillion and blue: Okabe–Ito)
export const signal = lv => (G.state?.settings?.colorblind ? ['#d55e00', '#f0e442', '#0072b2'] : ['#ef7a6a', '#f2c14e', '#86cf8a'])[lv];
