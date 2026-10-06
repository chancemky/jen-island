// Static page text (sign-in screen, rotate notice, hints) in the chosen language.
import { G, T } from '../systems/state.js';
const TEXT = {
  tagline: ['A cozy Vietnamese island life', 'Một hòn đảo nhỏ, một cuộc sống êm đềm'],
  login: ['Log in', 'Đăng nhập'], signup: ['New account', 'Tạo tài khoản'], privacy: ['Privacy', 'Bảo mật'], terms: ['Terms', 'Điều khoản'],
  email: ['Email', 'Email'], password: ['Password', 'Mật khẩu'], play: ['Play', 'Lên đảo'],
  feat1: ['Run little drink stands, food carts and a restaurant', 'Mở quán nước, xe đồ ăn và cả nhà hàng'],
  feat2: ['Decorate your home and dress up your way', 'Trang trí nhà và ăn mặc theo ý bạn'],
  feat3: ['Restore the Night Market and light the Lantern Festival', 'Hồi sinh Chợ Đêm và thắp sáng Lễ Hội Đèn Lồng'],
  feat4: ['Make friends with Mèo Mây and the whole island', 'Làm bạn với Mèo Mây và cả hòn đảo'],
  playfree: ['Play now — free', 'Chơi ngay — miễn phí'], haveaccount: ['I have an account', 'Tôi đã có tài khoản'],
  guestnote: ['No account needed. Your island saves on this device; create an account any time to keep it safe in the cloud.', 'Không cần tài khoản. Hòn đảo được lưu trên máy này; tạo tài khoản bất cứ lúc nào để lưu an toàn lên mây.'],
  forgot: ['Forgot your password?', 'Quên mật khẩu?'], back: ['‹ Back', '‹ Quay lại'], showpw: ['Show password', 'Hiện mật khẩu'],
  newpwnote: ['Choose a new password for your account.', 'Chọn mật khẩu mới cho tài khoản của bạn.'], newpw: ['New password', 'Mật khẩu mới'], savepw: ['Save password', 'Lưu mật khẩu'],
  joyhint: ['Touch & drag anywhere to walk', 'Chạm và kéo để đi'],
  keyhint: ['Arrow keys or WASD to walk · E or Space to act', 'Phím mũi tên hoặc WASD để đi · E hoặc Space để tương tác'],
  skip: ['Skip ›', 'Bỏ qua ›'],
  rotate: ['Please turn your phone upright', 'Xoay dọc điện thoại nhé!'], rotate2: ['Bistro Island is played in portrait.', 'Bistro Island được chơi theo chiều dọc.'],
};
export function applyStaticText() {
  document.documentElement.lang = G.lang;
  const keys = matchMedia('(hover: hover) and (pointer: fine)').matches;   // a mouse and keyboard: show the keys, not the touch hint
  for (const el of document.querySelectorAll('[data-t]')) { const v = TEXT[el.dataset.t === 'joyhint' && keys ? 'keyhint' : el.dataset.t]; if (v) el.textContent = T(v[0], v[1]); }
  for (const el of document.querySelectorAll('[data-t-aria]')) { const v = TEXT[el.dataset.tAria]; if (v) el.setAttribute('aria-label', T(v[0], v[1])); }
  for (const [id, en, vi] of [['pauseBtn', 'Pause', 'Tạm dừng'], ['bagBtn', 'Bag', 'Túi đồ'], ['mapBtn', 'Map', 'Bản đồ'], ['menuBtn', 'Menu', 'Thực đơn']]) document.getElementById(id)?.setAttribute('aria-label', T(en, vi));
  for (const b of document.querySelectorAll('#langPick button')) b.classList.toggle('on', b.dataset.lang === G.lang);
}
export const bootText = k => ({ fonts: T('Loading…', 'Đang tải…'), build: T('Building the island…', 'Đang dựng đảo…'), decor: T('Decorating…', 'Đang trang trí…'), meo: T('Looking for Mèo Mây…', 'Đang tìm Mèo Mây…'), net: T('Connecting…', 'Đang kết nối…'), ready: T('Ready!', 'Sẵn sàng!'), load: T('Loading your journey…', 'Đang tải hành trình của bạn…'), err: T('Something went wrong. Please reload.', 'Lỗi khởi động. Vui lòng tải lại.') })[k];
