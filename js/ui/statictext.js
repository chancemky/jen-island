// Static page text (sign-in screen, rotate notice, hints) in the chosen language.
import { G, T } from '../systems/state.js';
const TEXT = {
  tagline: ['A cozy Vietnamese island life', 'Một hòn đảo nhỏ, một cuộc sống êm đềm'],
  login: ['Log in', 'Đăng nhập'], signup: ['New account', 'Tạo tài khoản'],
  email: ['Email', 'Email'], password: ['Password', 'Mật khẩu'], play: ['Play', 'Lên đảo'],
  joyhint: ['Touch & drag anywhere to walk', 'Chạm và kéo để đi'],
  skip: ['Skip ›', 'Bỏ qua ›'],
  rotate: ['Please turn your phone upright', 'Xoay dọc điện thoại nhé!'], rotate2: ['JEN Island is played in portrait.', 'JEN Island được chơi theo chiều dọc.'],
};
export function applyStaticText() {
  document.documentElement.lang = G.lang;
  for (const el of document.querySelectorAll('[data-t]')) { const v = TEXT[el.dataset.t]; if (v) el.textContent = T(v[0], v[1]); }
  for (const b of document.querySelectorAll('#langPick button')) b.classList.toggle('on', b.dataset.lang === G.lang);
}
export const bootText = k => ({ fonts: T('Loading…', 'Đang tải…'), build: T('Building the island…', 'Đang dựng đảo…'), decor: T('Decorating…', 'Đang trang trí…'), meo: T('Looking for Mèo Mây…', 'Đang tìm Mèo Mây…'), net: T('Connecting…', 'Đang kết nối…'), ready: T('Ready!', 'Sẵn sàng!'), load: T('Loading your journey…', 'Đang tải hành trình của bạn…'), err: T('Something went wrong. Please reload.', 'Lỗi khởi động. Vui lòng tải lại.') })[k];
