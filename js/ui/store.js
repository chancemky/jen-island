// The Support tab: the supporter pack and the season pass (systems/store.js).
// Every reward is shown on you, so people know exactly what they get.

import { T } from '../systems/state.js';
import { h, btn } from './sheets.js';
import { sfx } from '../core/audio.js';
import { escapeHtml } from '../core/util.js';
import { toast } from './hud.js';
import { itemRow } from './clothes.js';
import { STORE, PRODUCTS, SEASON, buy, ownsProduct, seasonState } from '../systems/store.js';

const note = (en, vi) => h('div', 'empty-note', T(en, vi));
function buyButton(id) {
  if (ownsProduct(id)) { const b = h('div', 'pill', T('Owned ✓', 'Đã có ✓')); return b; }
  return btn(PRODUCTS[id].price, () => {
    if (buy(id) === 'off') { sfx('ui'); toast({ text: T('Coming soon', 'Sắp ra mắt'), sub: T('The supporter store isn\'t open yet.', 'Cửa hàng ủng hộ chưa mở.'), icon: 'shirt' }); }
  }, 'btn gold');
}
export function renderStore(pane) {
  if (!STORE.payments) pane.appendChild(note('Preview: payments are switched off, so nothing can be bought yet.', 'Xem trước: chưa bật thanh toán nên chưa mua được gì.'));
  pane.appendChild(note('Everything here is cosmetic. It never makes you richer, faster or stronger, and everything else in the game stays free.', 'Mọi thứ ở đây chỉ để trang trí. Không giúp bạn giàu hơn, nhanh hơn hay mạnh hơn, và mọi thứ khác trong game vẫn miễn phí.'));

  // the supporter pack
  const P = PRODUCTS.supporter;
  pane.appendChild(h('div', 'section-title', escapeHtml(T(P.en, P.vi))));
  pane.appendChild(note(...P.blurb));
  const list = h('div', 'list'); pane.appendChild(list);
  for (const id of P.clothes) list.appendChild(itemRow(id, null));
  const b = buyButton('supporter'); b.style.marginTop = '8px'; pane.appendChild(b);

  // the season pass
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
  pane.appendChild(note(...Q.blurb));
  const pb = buyButton(SEASON.product); pb.style.marginTop = '8px'; pane.appendChild(pb);
}
