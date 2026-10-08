// The Support tab: the supporter pack and the season pass (systems/store.js).
// Every reward is shown on you, so people know exactly what they get.

import { T } from '../systems/state.js';
import { h, btn } from './sheets.js';
import { sfx } from '../core/audio.js';
import { escapeHtml } from '../core/util.js';
import { toast } from './hud.js';
import { itemRow } from './clothes.js';
import { FURNITURE } from '../data/game.js';
import { STORE, PRODUCTS, SEASON, buy, ownsProduct, seasonState, storeVisible } from '../systems/store.js';
import { iapPrice, iapRestore } from '../systems/iap.js';
import { syncPurchases } from '../systems/store.js';
import { nativeApp } from '../core/util.js';

const note = (en, vi) => h('div', 'empty-note', T(en, vi));
function buyButton(id) {
  if (ownsProduct(id)) { const b = h('div', 'pill', T('Owned ✓', 'Đã có ✓')); return b; }
  return btn(iapPrice(id) || PRODUCTS[id].price, () => {
    const r = buy(id);
    if (r === 'off') { sfx('ui'); toast({ text: T('Coming soon', 'Sắp ra mắt'), sub: T('The supporter store isn\'t open yet.', 'Cửa hàng ủng hộ chưa mở.'), icon: 'shirt' }); }
    if (r === 'account') { sfx('ui'); toast({ text: T('Make a free account first', 'Hãy tạo tài khoản miễn phí trước'), sub: T('Menu → Account. Purchases belong to your account, so they\'re never lost.', 'Menu → Tài khoản. Món đã mua gắn với tài khoản nên không bao giờ mất.'), icon: 'heart' }); }
  }, 'btn gold');
}
export function renderStore(pane) {
  if (!STORE.payments && !nativeApp()) pane.appendChild(note('Test mode (Stripe sandbox): pay with card 4242 4242 4242 4242, any future date and any CVC. No real money moves.', 'Chế độ thử (Stripe sandbox): thanh toán bằng thẻ 4242 4242 4242 4242, ngày bất kỳ trong tương lai và CVC bất kỳ. Không trừ tiền thật.'));
  if (nativeApp()) pane.appendChild(btn(T('Restore purchases', 'Khôi phục giao dịch'), async () => { sfx('ui'); await iapRestore(); const got = await syncPurchases(); toast({ text: got.length ? T('Purchases restored', 'Đã khôi phục giao dịch') : T('Everything is already up to date', 'Mọi thứ đã được cập nhật'), icon: 'heart' }); }, 'btn ghost small'));
  pane.appendChild(note('Everything here is cosmetic. It never makes you richer, faster or stronger, and everything else in the game stays free.', 'Mọi thứ ở đây chỉ để trang trí. Không giúp bạn giàu hơn, nhanh hơn hay mạnh hơn, và mọi thứ khác trong game vẫn miễn phí.'));

  // the supporter pack
  const P = PRODUCTS.supporter;
  pane.appendChild(h('div', 'section-title', escapeHtml(T(P.en, P.vi))));
  pane.appendChild(note(...P.blurb));
  const list = h('div', 'list'); pane.appendChild(list);
  for (const id of P.clothes) list.appendChild(itemRow(id, null));
  const b = buyButton('supporter'); b.style.marginTop = '8px'; pane.appendChild(b);
  // the Lantern Lounge: furniture and a robe, looks only
  const L = PRODUCTS.lounge;
  pane.appendChild(h('div', 'section-title', escapeHtml(T(L.en, L.vi))));
  pane.appendChild(note(...L.blurb));
  const ll = h('div', 'list'); pane.appendChild(ll);
  for (const id of L.clothes) ll.appendChild(itemRow(id, null));
  for (const id of L.furniture) { const f = FURNITURE[id]; if (f) ll.appendChild(h('div', 'pill', '🛋️ ' + escapeHtml(T(f.en, f.vi)))); }
  const lb = buyButton('lounge'); lb.style.marginTop = '8px'; pane.appendChild(lb);
  renderSeason(pane);
}

// the season pass: free rewards for everyone, a supporter track for those who buy it
export function renderSeason(pane) {
  const st = seasonState(), Q = PRODUCTS[SEASON.product];
  pane.appendChild(h('div', 'section-title', escapeHtml(T(`${SEASON.en} · ${st.pts} points`, `${SEASON.vi} · ${st.pts} điểm`))));
  pane.appendChild(note(st.on ? 'Every customer you serve this season is a point. Free rewards are for everyone.' : `The season runs ${SEASON.start} → ${SEASON.end}. Every customer you serve then is a point.`,
    st.on ? 'Mỗi khách bạn phục vụ trong mùa này là một điểm. Phần thưởng miễn phí dành cho mọi người.' : `Mùa diễn ra ${SEASON.start} → ${SEASON.end}. Mỗi khách bạn phục vụ khi đó là một điểm.`));
  const tiers = h('div', 'list'); pane.appendChild(tiers);
  for (const t of SEASON.tiers) for (const [id, paid] of [[t.free, false], [t.paid, true]]) {
    if (!id) continue;
    const got = st.got.includes(id), tag = paid ? T('Supporter track', 'Nhánh ủng hộ') : T('Free', 'Miễn phí');
    tiers.appendChild(itemRow(id, h('div', 'pill', got ? '✓' : `${t.at}`), { dim: !got, note: `${tag} · ${T(`at ${t.at} points`, `ở ${t.at} điểm`)}` }));
  }
  // the supporter track can be bought only while the store is open (never inside the store apps)
  if (storeVisible()) { pane.appendChild(note(...Q.blurb)); const pb = buyButton(SEASON.product); pb.style.marginTop = '8px'; pane.appendChild(pb); }
}
