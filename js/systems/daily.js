// Morning mail: the first time you open the game each real-world day, a small gift is
// waiting. Play on consecutive days and the gifts grow through a seven-day week, ending
// in an exclusive hat; miss a day and the week starts again. Gifts never make the game
// harder to skip, they only make coming back feel nice.

import { G, T, addPantry, addMat, addMoney, markDirty } from './state.js';
import { addXP } from './progress.js';
import { touchStreak } from './badges.js';
import { CLOTHES } from '../data/wardrobe.js';
import { FURNITURE } from '../data/game.js';
import { choice } from '../core/util.js';

const CHEAP_FURNITURE = ['rug_round', 'plant_big', 'lamp_floor', 'lantern_red', 'chair_wood', 'fan', 'painting', 'clock', 'cat_bed', 'hanging_plant'];
const lvl = () => G.state.level || 1;
// day 1…7 of the week; `give` returns the line shown on the card
const GIFTS = [
  () => { addPantry('tea', 8); addPantry('kumquat', 8); addPantry('sugar', 8); addPantry('ice', 8); return T('A basket of tea, kumquats, sugar and ice', 'Một giỏ trà, tắc, đường và đá'); },
  () => { addMat('wood', 3); addMat('paint', 2); return T('3 wood planks and 2 tins of paint', '3 tấm gỗ và 2 hộp sơn'); },
  () => { const k = 60 + lvl() * 15; addMoney(k, 'gift'); return T(`An envelope with ${k}k inside`, `Một phong bì có ${k}k`); },
  () => { addXP(60 + lvl() * 10, 'gift'); addPantry('herbs', 6); addPantry('rice_paper', 6); return T('Fresh herbs, rice paper and a little experience', 'Rau thơm, bánh tráng và chút kinh nghiệm'); },
  () => { const f = choice(CHEAP_FURNITURE.filter(id => FURNITURE[id])); (G.state.home.owned ||= []).push(f); return T(`A piece of furniture: ${FURNITURE[f].en}`, `Một món nội thất: ${FURNITURE[f].vi}`); },
  () => { addMat('lantern', 3); addMat('tile', 2); return T('3 silk lanterns and 2 roof tiles', '3 lồng đèn lụa và 2 viên ngói'); },
  () => {
    const k = 150 + lvl() * 25; addMoney(k, 'gift'); addXP(120, 'gift');
    const w = G.state.wardrobe, hat = ['streak_bow', 'streak_beret'].find(id => !w.owned.includes(id));
    if (hat) { w.owned.push(hat); return T(`${k}k, and an exclusive hat: ${CLOTHES[hat].en}!`, `${k}k, và một chiếc mũ độc quyền: ${CLOTHES[hat].vi}!`); }
    return T(`${k}k and a big thank-you`, `${k}k và một lời cảm ơn thật lớn`);
  },
];
// returns { day (1-7), streak, line, next } when today's gift was just given, else null
export function morningMail() {
  const s = G.state; if (!s.story?.flags?.freeRoam) return null;
  const st = touchStreak(), today = st.last;
  if (s.dailyGift === today) return null;
  s.dailyGift = today; markDirty(true);
  const day = (st.cur - 1) % 7 + 1, line = GIFTS[day - 1]();
  return { day, streak: st.cur, line, next: day < 7 ? T(`Come back tomorrow for day ${day + 1}!`, `Mai quay lại nhận quà ngày ${day + 1} nhé!`) : T('A new week of gifts starts tomorrow.', 'Mai bắt đầu một tuần quà mới.') };
}
