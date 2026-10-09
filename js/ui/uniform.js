// Staff uniforms: pick the shirt and apron colours and a hat for the people who work at each
// shop (and the restaurant team). Purely for looks — they show on the counter staff straight away.
import { G, T, markDirty } from '../systems/state.js';
import { openSheet, h } from './sheets.js';
import { sfx } from '../core/audio.js';
import { drawHuman } from '../gfx/character.js';
import { visitorLook } from '../data/looks.js';
import { bus } from '../core/util.js';
import { placeName } from '../systems/economy.js';

const SHIRTS = ['#f28f7c', '#6fbfb0', '#8fb7e0', '#f2c14e', '#c9b6e8', '#fff6e6', '#3f4a5e', '#e8584e', '#7fae4d', '#f4a9b8'];
const APRONS = ['#fff6e6', '#f7d6c0', '#3f4a5e', '#e8584e', '#6fbfb0', '#f2c14e', '#8a5a3a', '#c9b6e8'];
const HATS = [[null, 'No hat', 'Không mũ'], ['cap', 'Cap', 'Mũ lưỡi trai'], ['bandana', 'Bandana', 'Khăn trùm'], ['beret', 'Beret', 'Mũ nồi'], ['bucket', 'Bucket hat', 'Mũ tai bèo'], ['chef', 'Chef\'s hat', 'Mũ đầu bếp'], ['nonla', 'Nón lá', 'Nón lá']];
export const uniformOf = id => G.state.uniforms?.[id] || null;
// put a shop's uniform on a look (keeps the face, hair and so on)
export function wearUniform(look, id) {
  const u = uniformOf(id); if (!u) return look;
  if (u.top) { look.top = u.top; look.topStyle = look.topStyle === 'aodai' ? 'tee' : look.topStyle || 'tee'; }
  if (u.apron) look.apron = u.apron;
  if ('hat' in u) { look.hat = u.hat || null; if (u.hatColor) look.hatColor = u.hatColor; }
  return look;
}
export function openUniform(id, name = placeName(id)) {
  const u = ((G.state.uniforms ||= {})[id] ||= {});
  openSheet({ title: T(`Uniform · ${name}`, `Đồng phục · ${name}`), sub: T('What your staff wear at work', 'Nhân viên mặc gì khi làm việc'), pauseTime: false, build: (body, api) => {
    const cv = document.createElement('canvas'); cv.width = 240; cv.height = 240; cv.className = 'uni-preview'; body.appendChild(cv);
    const look = wearUniform({ ...visitorLook(4242, 'regular'), backpack: null, camera: null, tote: null, apron: '#fff6e6' }, id);
    const c = cv.getContext('2d'); c.save(); c.translate(120, 214); c.scale(4, 4); drawHuman(c, { look, dir: 'down', moving: 0, seed: 3, emo: 'happy', blinkAmt: 0 }, 0); c.restore();
    const set = (k, v) => { u[k] = v; markDirty(true); sfx('tap'); bus.emit('uniform', id); api.rebuild(); };
    const swatch = (label, list, key) => {
      body.appendChild(h('div', 'section-title', label));
      const row = h('div', 'swatches');
      for (const col of list) { const b = h('button', 'swatch' + (u[key] === col ? ' on' : '')); b.type = 'button'; b.style.background = col; b.setAttribute('aria-label', col); b.onclick = () => set(key, col); row.appendChild(b); }
      body.appendChild(row);
    };
    swatch(T('Shirt', 'Áo'), SHIRTS, 'top');
    swatch(T('Apron', 'Tạp dề'), APRONS, 'apron');
    body.appendChild(h('div', 'section-title', T('Hat', 'Mũ')));
    const hr = h('div', 'chip-row');
    for (const [k, en, vi] of HATS) { const b = h('button', 'chip' + ((u.hat ?? 'unset') === k ? ' on' : ''), T(en, vi)); b.type = 'button'; b.onclick = () => set('hat', k); hr.appendChild(b); }
    body.appendChild(hr);
    if (u.hat) swatch(T('Hat colour', 'Màu mũ'), SHIRTS, 'hatColor');
  } });
}
