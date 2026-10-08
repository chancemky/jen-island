// Gentle one-time tips, shown the first time they'd actually help (never during a scene,
// never on top of a card). Each tip is remembered in the save and never repeats.
import { G, T, markDirty } from './state.js';
import { bus } from '../core/util.js';
import { homePieces } from '../data/sets.js';

const owned = s => Object.keys(s.biz || {}).filter(id => s.biz[id]?.owned);
const TIPS = [
  { id: 'keeper', when: s => owned(s).length >= 2 && !Object.keys(s.keepers || {}).length && s.story.chapter >= 5,
    text: ['Tip: hire a shopkeeper', 'Mẹo: thuê người trông quán'], sub: ['Menu → Business. They run a shop while you\'re busy elsewhere.', 'Menu → Kinh doanh. Họ trông quán khi bạn bận việc khác.'], icon: 'person' },
  { id: 'runner', when: s => Object.keys(s.keepers || {}).length >= 1 && !Object.keys(s.supply || {}).length && s.day >= 6,
    text: ['Tip: a supply runner restocks shops', 'Mẹo: người giao hàng bổ sung nguyên liệu'], sub: ['Menu → Business. Every morning they top up a shop\'s ingredients (for a fee).', 'Menu → Kinh doanh. Mỗi sáng họ bổ sung nguyên liệu cho quán (có phí).'], icon: 'bag' },
  { id: 'board', when: s => s.story.flags.freeRoam && !(s.stats.boardDone > 0) && s.board?.day === s.day,
    text: ['Tip: the Island Board on Wind Plaza', 'Mẹo: Bảng tin đảo ở Quảng trường gió'], sub: ['Neighbours pin new requests every morning.', 'Hàng xóm ghim lời nhờ mới mỗi sáng.'], icon: 'notebook' },
  { id: 'photo', when: s => s.day >= 3 && !(s.stats.photos > 0),
    text: ['Tip: photo mode', 'Mẹo: chế độ chụp ảnh'], sub: ['Tap 📷 to frame a shot, pick a filter and strike a pose.', 'Bấm 📷 để chọn khung, bộ lọc và tạo dáng.'], icon: 'photo' },
  { id: 'decorate', when: s => (s.home?.owned || []).length >= 1 && homePieces(s.home).length < 2,
    text: ['Tip: decorate your home', 'Mẹo: trang trí nhà'], sub: ['Inside your house, tap Decorate to place what you\'ve bought.', 'Trong nhà, bấm Trang trí để đặt đồ đã mua.'], icon: 'sofa' },
  { id: 'weekly', when: s => s.day >= 2 && G.user && !G.user.local,
    text: ['Tip: the weekly board', 'Mẹo: bảng xếp hạng tuần'], sub: ['Menu → Ranks. The top 10 each week win a trophy.', 'Menu → Xếp hạng. Top 10 mỗi tuần nhận cúp.'], icon: 'trophy' },
];
function check() {
  const s = G.state; if (!s?.story?.flags?.freeRoam || G.runtime.inCutscene || G.runtime.photoMode) return;
  for (const tip of TIPS) {
    const k = 'tip:' + tip.id; if (s.story.flags[k]) continue;
    let ok = false; try { ok = tip.when(s); } catch { ok = false; }
    if (!ok) continue;
    s.story.flags[k] = true; markDirty();
    bus.emit('toast', { text: T(...tip.text), sub: T(...tip.sub), icon: tip.icon, ms: 6500 });
    return;                                                    // one at a time
  }
}
export function initTips() { setInterval(check, 45000); setTimeout(check, 20000); }
