// Badges: permanent honours shown in Milestones, and one of them (your pick) next to your
// name on the leaderboard. Tiers: bronze, silver, gold and legend (the very hard ones).
// `got(s)` reads the save; `need` describes it. Supporter and Founder come from the server
// (a real purchase / an account made before launch) and are never set by the game alone.

import { RECIPES, BUSINESSES } from './game.js';
import { CLOTHES, FREE_CLOTHES } from './wardrobe.js';
import { FISH } from '../systems/fishing.js';
import { PLACES } from '../systems/economy.js';

const regulars = s => Object.values(s.regulars || {}).filter(r => r.visits >= 3).length;
const owned = s => Object.keys(BUSINESSES).filter(id => s.biz[id]?.owned).length;
const boutique = () => Object.keys(CLOTHES).filter(id => !FREE_CLOTHES.includes(id) && !CLOTHES[id].store);

export const BADGES = {
  // ---- bronze: the first steps
  first_cup:   { tier: 'bronze', glyph: '🧋', en: 'First Cup', vi: 'Ly đầu tiên', need: ['Serve your first customer', 'Phục vụ vị khách đầu tiên'], got: s => s.stats.served >= 1 },
  regular:     { tier: 'bronze', glyph: '🤝', en: 'Familiar Face', vi: 'Gương mặt quen', need: ['Make 5 regulars', 'Có 5 khách quen'], got: s => regulars(s) >= 5 },
  angler:      { tier: 'bronze', glyph: '🎣', en: 'Angler', vi: 'Cần thủ', need: ['Catch 3 kinds of fish', 'Câu được 3 loại cá'], got: s => Object.keys(s.fishSeen || {}).length >= 3 },
  homebody:    { tier: 'bronze', glyph: '🏡', en: 'Homebody', vi: 'Người yêu nhà', need: ['Place 10 pieces of furniture', 'Đặt 10 món nội thất'], got: s => (s.home?.furniture || []).length >= 10 },
  // ---- silver
  crowd:       { tier: 'silver', glyph: '🎪', en: 'Crowd Pleaser', vi: 'Đắt khách', need: ['Serve 1,000 customers', 'Phục vụ 1.000 khách'], got: s => s.stats.served >= 1000 },
  barista:     { tier: 'silver', glyph: '✨', en: 'Steady Hands', vi: 'Tay nghề vững', need: ['Make 250 perfect orders', 'Làm 250 món hoàn hảo'], got: s => s.stats.perfect >= 250 },
  lanterns:    { tier: 'silver', glyph: '🏮', en: 'Lantern Keeper', vi: 'Người giữ đèn', need: ['Restore the Night Market', 'Khôi phục Chợ Đêm'], got: s => !!s.nightMarket?.restored },
  busy_day:    { tier: 'silver', glyph: '⚡', en: 'Rush Hour', vi: 'Giờ cao điểm', need: ['Serve 60 customers in one day', 'Phục vụ 60 khách trong một ngày'], got: s => (s.stats.bestDay || 0) >= 60 },
  week_streak: { tier: 'silver', glyph: '📅', en: 'Seven Mornings', vi: 'Bảy buổi sáng', need: ['Play 7 days in a row', 'Chơi 7 ngày liên tiếp'], got: s => (s.streak?.best || 0) >= 7 },
  // ---- gold
  keeper:      { tier: 'gold', glyph: '👑', en: 'Keeper of the Island', vi: 'Người Giữ Đảo', need: ['Finish all 20 chapters', 'Hoàn thành cả 20 chương'], got: s => s.story.chapter >= 20 && s.story.step === 'free' },
  landlord:    { tier: 'gold', glyph: '🗝️', en: 'Landlord', vi: 'Chủ đất', need: ['Own every property', 'Sở hữu mọi nơi'], got: s => Object.keys(PLACES).every(id => s.property?.[id]) },
  empire:      { tier: 'gold', glyph: '🏙️', en: 'Island Empire', vi: 'Đế chế trên đảo', need: ['Own every business', 'Sở hữu mọi quán'], got: s => owned(s) >= Object.keys(BUSINESSES).length },
  favourite:   { tier: 'gold', glyph: '💞', en: 'Everyone\'s Favourite', vi: 'Quán ruột của cả đảo', need: ['Make 50 regulars', 'Có 50 khách quen'], got: s => regulars(s) >= 50 },
  fashion:     { tier: 'gold', glyph: '👗', en: 'Fashion Icon', vi: 'Biểu tượng thời trang', need: ['Own every boutique piece', 'Có mọi món ở tiệm thời trang'], got: s => boutique().every(id => s.wardrobe?.owned?.includes(id)) },
  fisher:      { tier: 'gold', glyph: '🐟', en: 'Master Angler', vi: 'Bậc thầy câu cá', need: ['Catch every kind of fish', 'Câu được mọi loại cá'], got: s => Object.keys(FISH).every(id => s.fishSeen?.[id]) },
  month_streak:{ tier: 'gold', glyph: '🌙', en: 'Thirty Mornings', vi: 'Ba mươi buổi sáng', need: ['Play 30 days in a row', 'Chơi 30 ngày liên tiếp'], got: s => (s.streak?.best || 0) >= 30 },
  // ---- legend: the hardest
  perfectionist: { tier: 'legend', glyph: '💎', en: 'Perfectionist', vi: 'Người cầu toàn', need: ['Make 2,500 perfect orders', 'Làm 2.500 món hoàn hảo'], got: s => s.stats.perfect >= 2500 },
  legend_crowd:  { tier: 'legend', glyph: '🌊', en: 'Ten Thousand Smiles', vi: 'Mười nghìn nụ cười', need: ['Serve 10,000 customers', 'Phục vụ 10.000 khách'], got: s => s.stats.served >= 10000 },
  tycoon:        { tier: 'legend', glyph: '💰', en: 'Island Tycoon', vi: 'Đại gia của đảo', need: ['Earn 100M in total', 'Kiếm tổng cộng 100 triệu'], got: s => (s.lifetime || 0) >= 100000 },
  master_chef:   { tier: 'legend', glyph: '🍜', en: 'Master Chef', vi: 'Siêu đầu bếp', need: ['Every recipe at its top level', 'Mọi công thức ở cấp cao nhất'], got: s => Object.keys(RECIPES).every(id => (s.recipeLevels?.[id] || 0) >= 3) },
  year:          { tier: 'legend', glyph: '🎋', en: 'A Year on the Island', vi: 'Một năm trên đảo', need: ['Reach day 365', 'Đến ngày thứ 365'], got: s => s.day >= 365 },
  // ---- from the server
  supporter:   { tier: 'gold', glyph: '💖', en: 'Supporter', vi: 'Người ủng hộ', need: ['Support the game in the store', 'Ủng hộ game ở cửa hàng'], server: true },
  founder:     { tier: 'gold', glyph: '🌅', en: 'Founding Islander', vi: 'Cư dân khai đảo', need: ['Played before the official launch', 'Chơi từ trước ngày ra mắt chính thức'], server: true },
};
export const TIER_ORDER = ['legend', 'gold', 'silver', 'bronze'];
