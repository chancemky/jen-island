// Comfort settings (Menu → Settings): text size, high contrast and left-handed controls,
// applied as classes on <body> (styles in css/game.css).
import { G } from '../systems/state.js';
export function applyComfort() {
  const st = G.state?.settings || {}, b = document.body.classList;
  b.toggle('text-l', st.textSize === 'l'); b.toggle('text-xl', st.textSize === 'xl');
  b.toggle('hc', !!st.contrast); b.toggle('lefty', !!st.lefty);
}
