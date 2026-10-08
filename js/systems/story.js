// Story: twenty chapters (then free play) with Mèo Mây at the heart of every one.
// Each chapter is a list of steps; every step has an objective line for the
// quest pill, a pointer target, a completion test, and optionally a cutscene
// that plays when it completes. Progress is saved after every step, and every
// cutscene can be safely re-entered after a reload.

import { G, T, flag, setFlag, hasMats, spendMats, addMoney, canAfford, learnRecipe, unlockAchievement, markDirty, bizOf, pantry, mats } from './state.js';
import { ingName, bizName, recipeName, BUSINESSES, RECIPES, CHAPTERS, NIGHT_MARKET_RESTORE, STATUE_COST, STATION, BRIDGE_REPAIR, VY_VIEWS, HARBOUR_BRIDGE, COVE_BRIDGE, FESTIVAL_REQ, KEEPER_REQ } from '../data/game.js';
import { MEO_MEMORIES } from '../data/lore.js';
import { keeperOf, keeperActor, staffedCount, PLACES, propertyPrice, upgradeCost } from './economy.js';
import { cs, wait, say, ask, camTo, camFollow, walk, face, emote, hop, startFollow, stopFollow, caption } from './cutscene.js';
import { scenes, setScene, fadeOut, fadeIn, isTransitioning } from './scenes.js';
import { cam, fx } from '../world/render.js';
import { QUEUES, TRUCK_SPOTS } from '../world/island.js';
import { setQuest, toast, showHud } from '../ui/hud.js';
import { showReward, isUiOpen, isPresenting } from '../ui/sheets.js';
import { dialogue } from '../ui/dialogue.js';
import { askText, chooseLook } from '../ui/naming.js';
import { playerLook, RESIDENTS, MERCHANTS } from '../data/looks.js';
import { addXP, GATES, gateText, gatePaid, payGate, level } from './progress.js';
import { meoJoke, randomJoke, meoAntic, playRPS } from './fun.js';
import { Actor } from '../world/actor.js';
import { sfx, setMood } from '../core/audio.js';
import { bus, rand, choice, dist, sleep, money, moneyShort } from '../core/util.js';
import { rt as bizRT, openBiz as openShop } from './business.js';
import { availableRecipes } from '../ui/shops.js';
import { questOption, questTalk } from './sidequests.js';
import { morningEvent, birthdaysToday, BIRTHDAYS } from './interact.js';
import { npcs } from './npc.js';
import { playCinematic } from './cinematic.js';
import * as cloud from './cloud.js';
import { homePieces } from '../data/sets.js';

const S = () => G.state.story;
const island = () => scenes.island;
const B = id => island().buildings[id];
const doorOf = id => { const b = B(id); return { scene: 'island', x: b.x + (b.door?.[0] || 0), y: b.y }; };
// just in front of your bed, wherever you've moved it (decorate.js keeps it in home.builtins)
const bedSpot = () => { const b = G.state.home?.builtins?.bed; return b ? { scene: 'house', x: b.x, y: b.y + 10 } : { scene: 'house', x: 48, y: 124 }; };
const frontOf = id => { const b = B(id); return { scene: 'island', x: b.x - 14, y: b.y + 26 }; };

// ---------------------------------------------------------------- helpers for the longer story
const regularsCount = () => Object.values(G.state.regulars).filter(r => r.visits >= 3).length;
const STALL_IDS = ['night', 'nm1', 'nm2', 'nm3', 'nm5', 'nm6'];
const boughtStalls = () => STALL_IDS.filter(id => id !== 'night');
const stallsServed = () => boughtStalls().reduce((a, id) => a + bizOf(id).stats.served, 0) - (S().flags['stalls@stallServe'] ?? 0);
// multi-part chapter goals: [label, current, target]
const moneyGoal = (have, need) => have >= need ? '✓' : moneyShort(have, need, T);
const goals = (title, list) => title + ': ' + list.map(([l, c, t, m]) => c >= t ? `${l} ✓` : m ? `${l} ${moneyGoal(c, t)}` : `${l} ${Math.floor(c)}/${t}`).join(' · ');
const allDone = list => list.every(([, c, t]) => c >= t);
const perfSince = key => G.state.stats.perfect - (S().flags['perf@' + key] ?? G.state.stats.perfect);
const earnedSince = key => (G.state.lifetime || 0) - (S().flags['life@' + key] ?? (G.state.lifetime || 0));
const settleGoals = () => [
  [T('serve customers', 'phục vụ khách'), since('settle'), 40],
  [T('perfect orders', 'món hoàn hảo'), perfSince('settle'), 12],
  [T('money earned', 'tiền kiếm được'), earnedSince('settle'), 900, 1],
  [T('reputation', 'danh tiếng'), G.state.reputation, 15],
  [T('day', 'ngày'), G.state.day, 5],
];
const regularGoals = () => [
  [T('regular customers', 'khách quen'), regularsCount(), 3],
  [T('learn a recipe at Mèo Mây\'s house', 'học công thức ở nhà Mèo Mây'), Math.max(0, G.state.recipes.length - 1), 1],
  [T('upgrade the drink stand (level)', 'nâng cấp quán nước (cấp)'), bizOf('shed1').level, 2],
  [T('serve customers', 'phục vụ khách'), since('regulars'), 45],
  [T('day', 'ngày'), G.state.day, 8],
];
const growGoals = () => [
  [T('serve customers', 'phục vụ khách'), since('grow'), 50],
  [T('reputation', 'danh tiếng'), G.state.reputation, 40],
  [T('furniture at home', 'nội thất ở nhà'), homePieces(G.state.home).length, 3],
  [T('cash on hand', 'tiền mặt đang có'), G.state.money, 1000, 1],
];
const keeperGoals = () => [
  [T('your shopkeeper serves', 'người trông quán bán'), keeperOf('shed1')?.served || 0, 20],
  [T('you sell bánh mì', 'bạn bán bánh mì'), bizServedSince('shed2', 'keeperRun'), 20],
];
const stallGoals = () => [
  [T('dishes at the new stall', 'món ở sạp mới'), stallsServed(), 15],
  [T('hire a stall keeper for a night stall', 'thuê người trông sạp đêm'), STALL_IDS.filter(id => keeperOf(id)).length, 1],
];
const cafeGoals = () => [
  [T('learn egg coffee at Mèo Mây\'s house', 'học cà phê trứng ở nhà Mèo Mây'), G.state.recipes.includes('ca_phe_trung') ? 1 : 0, 1],
  [T('hire a shopkeeper for the café', 'thuê người trông quán cà phê'), keeperOf('cafe') ? 1 : 0, 1],
  [T('café sales', 'ly bán ở quán cà phê'), bizOf('cafe').stats.served, 80],
  [T('island level', 'cấp độ đảo'), level(), 16],
];
const landGoals = () => [
  [T('properties bought', 'nơi đã mua đứt'), Object.keys(G.state.property || {}).length, 3],
  [T('shops with a shopkeeper', 'quán có người trông'), Object.keys(G.state.keepers || {}).length, 4],
  [T('cash on hand', 'tiền mặt đang có'), G.state.money, 15000, 1],
];
const supplyGoals = () => [
  [T('supply runners', 'người giao hàng'), Object.keys(G.state.supply || {}).length, 1],
  [T('upgrade the bánh mì shed (level)', 'nâng cấp quán bánh mì (cấp)'), bizOf('shed2').level, 2],
  [T('cash on hand', 'tiền mặt đang có'), G.state.money, 1800, 1],
  [T('day', 'ngày'), G.state.day, 15],
];
const festivalGoals = () => [
  [T('island level', 'cấp độ đảo'), level(), FESTIVAL_REQ.level],
  [T('silk lanterns', 'lồng đèn lụa'), mats('lantern'), FESTIVAL_REQ.lanterns],
  [T('customers served today', 'khách phục vụ hôm nay'), G.state.today.served, FESTIVAL_REQ.served],
];
const keeperFinalGoals = () => [
  [T('island level', 'cấp độ đảo'), level(), KEEPER_REQ.level],
  [T('businesses owned', 'quán sở hữu'), Object.keys(BUSINESSES).filter(id => bizOf(id).owned).length, Object.keys(BUSINESSES).length],
  [T('regular customers', 'khách quen'), regularsCount(), KEEPER_REQ.regulars],
];
// ---------------------------------------------------------------- steps
// count(n): how many customers served since this step began
const since = key => G.state.stats.served - (S().flags['served@' + key] ?? G.state.stats.served);
const bizServedSince = (biz, key) => (bizOf(biz).stats.served) - (S().flags['bs@' + key] ?? bizOf(biz).stats.served);

// Recipes a step's closing scene teaches (so the recipe book can point at the story goal
// without naming the dish). Keep in sync with the discoverRecipe() calls in those scenes.
export const STEP_TEACHES = {
  repair: ['tra_tac'], repair2: ['banh_mi_thit'], truck: ['goi_cuon'],
  restoreNM: ['banh_trang_nuong', 'che_ba_mau'], repairResto: ['pho_bo', 'com_tam'],
};

export const STEPS = {
  // ---- Chapter 1
  tour: { ch: 1, next: 'materials' },                 // (the tour cutscene moves on by itself)
  // ---- Chapter 1 (grind): settle in before the story moves on (around day 5)
  settle: { ch: 1, text: () => goals(T('Settle in', 'Làm quen với đảo'), settleGoals()), target: () => null, done: () => allDone(settleGoals()), next: 'regulars', scene: () => newChapter(2) },
  // ---- Chapter 2: first regulars
  regulars: { ch: 2, text: () => goals(T('First regulars', 'Khách quen đầu tiên'), regularGoals()), target: () => null, done: () => allDone(regularGoals()), next: 'grow' },
  // ---- Chapter 5: a helping hand
  hireKeeper: { ch: 5, text: () => T('Hire a shopkeeper for the drink stand (Menu → Business)', 'Thuê người trông quán nước (Menu → Kinh doanh)'), target: () => null, done: () => !!keeperOf('shed1'), next: 'keeperRun', scene: () => firstHelper() },
  keeperRun: { ch: 5, text: () => goals(T('Two shops at once', 'Hai quán cùng lúc'), keeperGoals()), target: () => null, done: () => allDone(keeperGoals()), next: 'supplies', scene: () => newChapter(6).then(() => landlordIntro()) },
  // ---- Chapter 6: supplies & rent
  supplies: { ch: 6, text: () => goals(T('Supplies & rent', 'Hàng hóa & tiền thuê'), supplyGoals()), target: () => null, done: () => allDone(supplyGoals()), next: 'truck', scene: () => truckIntro() },
  // ---- Chapter 9: more stalls
  buyStall: { ch: 9, text: () => T('Buy a second Night Market stall — the sweet soup or the snail stall', 'Mua thêm một sạp Chợ Đêm — sạp chè hoặc sạp ốc'), target: () => ({ scene: 'island', x: 530, y: 606 }), done: () => bizOf('nm2').owned || bizOf('nm3').owned, next: 'stallServe' },
  stallServe: { ch: 9, text: () => goals(T('Your new stall', 'Sạp mới của bạn'), stallGoals()), target: () => null, done: () => allDone(stallGoals()), next: 'restoIntro', scene: () => restaurantIntro() },
  // ---- Chapter 12: Harbour Town
  harbour: { ch: 12, text: () => { const r = HARBOUR_BRIDGE; return T(`Build the Harbour Bridge on the east coast: ${moneyGoal(G.state.money, r.cost)}, wood ${mats('wood')}/${r.mats.wood}, metal ${mats('metal')}/${r.mats.metal}, paint ${mats('paint')}/${r.mats.paint}`, `Xây Cầu Bến Cảng ở bờ đông: ${moneyGoal(G.state.money, r.cost)}, gỗ ${mats('wood')}/${r.mats.wood}, tôn ${mats('metal')}/${r.mats.metal}, sơn ${mats('paint')}/${r.mats.paint}`); }, target: () => ({ scene: 'island', x: 1600, y: 700 }), done: () => flag('harbourBridge'), next: 'adopt', scene: () => harbourOpened() },
  adopt: { ch: 12, text: () => T('Visit Cô Bông\'s pet shop in Harbour Town and adopt a pet', 'Ghé tiệm thú cưng của Cô Bông ở Phố Cảng và nhận nuôi một bé'), target: () => G.scene?.id === 'petshop' ? { scene: 'petshop', x: 145, y: 124 } : doorOf('petshop'), done: () => (G.state.pets || []).length >= 1, next: 'cafe', scene: () => newChapter(13) },
  // ---- Chapter 13: the Harbour Café
  cafe: { ch: 13, text: () => T(`Buy the Harbour Café kiosk (${moneyGoal(G.state.money, BUSINESSES.cafe.buy)})`, `Mua ki-ốt Cà Phê Bến Cảng (${moneyGoal(G.state.money, BUSINESSES.cafe.buy)})`) + (canAfford(BUSINESSES.cafe.buy) ? '' : ' ' + T('Keep selling at your other shops. This price does not change.', 'Hãy bán tiếp ở các quán khác. Giá này không đổi.')), target: () => frontOf('cafe'), done: () => bizOf('cafe').owned, next: 'cafeServe' },
  cafeServe: { ch: 13, text: () => T(`Sell ${Math.min(25, bizServedSince('cafe', 'cafeServe'))}/25 coffees at the Harbour Café`, `Bán ${Math.min(25, bizServedSince('cafe', 'cafeServe'))}/25 ly cà phê ở Cà Phê Bến Cảng`), target: () => null, done: () => bizServedSince('cafe', 'cafeServe') >= 25, next: 'rest7' },
  // ---- Chapter 15: landlord
  landlord: { ch: 15, text: () => goals(T('Become a landlord (Menu → Business)', 'Làm chủ đất (Menu → Kinh doanh)'), landGoals()), target: () => null, done: () => allDone(landGoals()), next: 'festival', scene: () => festivalIntro() },
  // ---- Chapter 17: Coconut Cove
  cove: { ch: 17, text: () => { const r = COVE_BRIDGE; return T(`Build the Cove Bridge past the east beach: ${moneyGoal(G.state.money, r.cost)}, wood ${mats('wood')}/${r.mats.wood}, metal ${mats('metal')}/${r.mats.metal}, paint ${mats('paint')}/${r.mats.paint}, tiles ${mats('tile')}/${r.mats.tile}`, `Xây Cầu Vịnh Dừa sau bãi đông: ${moneyGoal(G.state.money, r.cost)}, gỗ ${mats('wood')}/${r.mats.wood}, tôn ${mats('metal')}/${r.mats.metal}, sơn ${mats('paint')}/${r.mats.paint}, ngói ${mats('tile')}/${r.mats.tile}`); }, target: () => ({ scene: 'island', x: 1610, y: 2080 }), done: () => flag('coveBridge'), next: 'grill', scene: () => coveOpened() },
  grill: { ch: 17, text: () => T(`Buy the Coconut Cove Grill (${moneyGoal(G.state.money, BUSINESSES.grill.buy)})`, `Mua Quán Nướng Vịnh Dừa (${moneyGoal(G.state.money, BUSINESSES.grill.buy)})`), target: () => frontOf('grill'), done: () => bizOf('grill').owned, next: 'grillServe' },
  grillServe: { ch: 17, text: () => T(`Grill ${Math.min(25, bizServedSince('grill', 'grillServe'))}/25 seafood plates at the cove`, `Nướng ${Math.min(25, bizServedSince('grill', 'grillServe'))}/25 phần hải sản ở vịnh`), target: () => null, done: () => bizServedSince('grill', 'grillServe') >= 25, next: 'allStalls', scene: () => newChapter(18) },
  // ---- Chapter 18: the whole Night Market
  allStalls: { ch: 18, text: () => { const n = STALL_IDS.filter(id => bizOf(id).owned).length; return T(`Own every Night Market stall (${n}/${STALL_IDS.length})`, `Sở hữu mọi sạp Chợ Đêm (${n}/${STALL_IDS.length})`); }, target: () => null, done: () => STALL_IDS.every(id => bizOf(id).owned), next: 'allStaff', scene: () => nightQueen().then(() => newChapter(19)) },
  // ---- Chapter 19: the island runs itself
  allStaff: { ch: 19, text: () => { const c = staffedCount(); return T(`The island runs itself: every business staffed — shopkeepers, stall keepers and a restaurant team (${c.staffed}/${c.total}) — Menu → Business`, `Hòn đảo tự vận hành: quán nào cũng có người trông, nhà hàng có đội nhân viên (${c.staffed}/${c.total}) — Menu → Kinh doanh`); }, target: () => null, done: () => { const c = staffedCount(); return c.total >= Object.keys(BUSINESSES).length && c.staffed >= c.total; }, next: 'keeper', scene: () => automationMontage().then(() => newChapter(20)) },
  materials: { ch: 1, text: () => { const r = BUSINESSES.shed1.repair; return T(`Buy ${r.wood} wood, ${r.metal} metal and ${r.paint} paint at Ben Vung Materials (${mats('wood')}/${r.wood} · ${mats('metal')}/${r.metal} · ${mats('paint')}/${r.paint})`, `Mua ${r.wood} gỗ, ${r.metal} tôn, ${r.paint} sơn ở VLXD Bền Vững (${mats('wood')}/${r.wood} · ${mats('metal')}/${r.metal} · ${mats('paint')}/${r.paint})`); }, target: () => G.scene?.id === 'materials' ? { scene: 'materials', x: 140, y: 124 } : doorOf('materials'), done: () => hasMats(BUSINESSES.shed1.repair) || bizOf('shed1').repair >= 1, next: 'repair' },
  repair: { ch: 1, text: () => T('Repair the little shed on the beach', 'Sửa căn chòi nhỏ ở bãi biển'), target: () => frontOf('shed1'), done: () => bizOf('shed1').repair >= 1, next: 'ingredients', scene: () => afterFirstRepair() },
  // ---- Chapter 1 (continued): first ingredients, prep, opening day
  ingredients: { ch: 1, text: () => { const need = ['tea', 'kumquat', 'sugar', 'ice'].filter(k => !hasStockFor(k)); return need.length ? T(`Buy kumquat tea ingredients at Binh Minh Supermarket (still need: ${need.map(k => ingName(k).toLowerCase()).join(', ')})`, `Mua nguyên liệu trà tắc ở Siêu thị Bình Minh (còn thiếu: ${need.map(k => ingName(k).toLowerCase()).join(', ')})`) : T('You have everything!', 'Đủ nguyên liệu rồi!'); }, target: () => G.scene?.id === 'supermarket' ? { scene: 'supermarket', x: 150, y: 132 } : doorOf('supermarket'), done: () => ['tea', 'kumquat', 'sugar', 'ice'].every(hasStockFor), next: 'prep' },
  prep: { ch: 1, text: () => T('Slice kumquats at the prep table in Your Drink Stand', 'Cắt tắc ở bàn sơ chế trong quán nước của bạn'), target: () => G.scene?.id === 'shed1' ? { scene: 'shed1', x: 194, y: 108 } : doorOf('shed1'), done: () => (bizOf('shed1').prepped.kumquat_cut || 0) > 0 || flag('firstServed3'), next: 'open' },
  open: { ch: 1, text: () => T('Open the shop! Press OPEN inside', 'Mở cửa quán! Bấm MỞ CỬA bên trong'), target: () => G.scene?.id === 'shed1' ? { scene: 'shed1', x: 80, y: 128 } : doorOf('shed1'), done: () => bizOf('shed1').open || flag('firstServed3'), next: 'serve' },
  serve: { ch: 1, text: () => T(`Serve your first customers at the counter (${Math.min(3, since('serve'))}/3)`, `Phục vụ những vị khách đầu tiên ở quầy (${Math.min(3, since('serve'))}/3)`), target: () => G.scene?.id === 'shed1' ? { scene: 'shed1', x: 80, y: 128 } : doorOf('shed1'), done: () => since('serve') >= 3, next: 'sleep', scene: () => afterFirstCustomers() },
  sleep: { ch: 1, text: () => G.state.time < 17 * 60 ? T('Keep selling, then go home and sleep', 'Bán thêm, rồi về nhà ngủ') : T('Go home and sleep in your bed', 'Về nhà và đi ngủ'), target: () => G.scene?.id === 'house' ? bedSpot() : doorOf('house'), done: () => G.state.day >= 2, next: 'settle' },
  // ---- Chapter 3: word is spreading → Chapter 4: the bánh mì shed
  grow: { ch: 3, text: () => goals(T('Word is spreading', 'Tiếng lành đồn xa'), growGoals()), target: () => null, done: () => allDone(growGoals()), next: 'key2', scene: () => introShed2() },
  key2: { ch: 4, text: () => T(`Buy the bánh mì shed's key from Mèo Mây (${gateText('shed2')})`, `Mua chìa khóa quán bánh mì từ Mèo Mây (${gateText('shed2')})`), target: () => meoTarget(), done: () => gatePaid('shed2'), next: 'repair2' },
  repair2: { ch: 4, text: () => { const r = BUSINESSES.shed2.repair; return T(`Repair the bánh mì shed in West Village (wood ${mats('wood')}/${r.wood} · metal ${mats('metal')}/${r.metal} · paint ${mats('paint')}/${r.paint})`, `Sửa quán Bánh Mì ở Xóm Tây (gỗ ${mats('wood')}/${r.wood} · tôn ${mats('metal')}/${r.metal} · sơn ${mats('paint')}/${r.paint})`); }, target: () => frontOf('shed2'), done: () => bizOf('shed2').repair >= 1, next: 'banhmi', scene: () => afterShed2() },
  banhmi: { ch: 4, text: () => T(`Sell bánh mì (${Math.min(15, bizServedSince('shed2', 'banhmi'))}/15)`, `Bán ${Math.min(15, bizServedSince('shed2', 'banhmi'))}/15 ổ bánh mì`), target: () => G.scene?.id === 'shed2' ? null : doorOf('shed2'), done: () => bizServedSince('shed2', 'banhmi') >= 15, next: 'hireKeeper', scene: () => newChapter(5) },
  // ---- Chapter 7: on wheels (the food truck)
  truck: { ch: 7, text: () => T(`Buy the food truck's keys from Mèo Mây (${gateText('truck')})`, `Mua chìa khóa xe cuốn từ Mèo Mây (${gateText('truck')})`), target: () => meoTarget(), done: () => bizOf('truck').owned, next: 'truckServe', scene: () => afterTruck() },
  truckServe: { ch: 7, text: () => T(`Sell ${Math.min(25, bizServedSince('truck', 'truckServe'))}/25 orders at the truck · reputation ${Math.floor(G.state.reputation)}/120`, `Bán ${Math.min(25, bizServedSince('truck', 'truckServe'))}/25 phần ở xe cuốn · danh tiếng ${Math.floor(G.state.reputation)}/120`), target: () => G.scene?.id === 'truck' ? null : doorOf('truck'), done: () => bizServedSince('truck', 'truckServe') >= 25 && G.state.reputation >= 120, next: 'nightIntro', scene: () => nightMarketIntro() },
  // ---- Chapter 8: the Night Market
  nightIntro: { ch: 8, next: 'restoreNM' },          // (nightMarketIntro moves on by itself)
  restoreNM: { ch: 8, text: () => { const r = NIGHT_MARKET_RESTORE; if (!gatePaid('night')) return T(`Get the Night Market key from Mèo Mây (${gateText('night')})`, `Lấy chìa khóa Chợ Đêm từ Mèo Mây (${gateText('night')})`); return T(`Restore the Night Market: ${moneyGoal(G.state.money, r.cost)}, wood ${mats('wood')}/${r.mats.wood}, metal ${mats('metal')}/${r.mats.metal}, paint ${mats('paint')}/${r.mats.paint}, lanterns ${mats('lantern')}/${r.mats.lantern}, light strings ${mats('cable')}/${r.mats.cable}`, `Khôi phục Chợ Đêm: ${moneyGoal(G.state.money, r.cost)}, gỗ ${mats('wood')}/${r.mats.wood}, tôn ${mats('metal')}/${r.mats.metal}, sơn ${mats('paint')}/${r.mats.paint}, lồng đèn ${mats('lantern')}/${r.mats.lantern}, dây đèn ${mats('cable')}/${r.mats.cable}`); }, target: () => !gatePaid('night') ? meoTarget() : ({ scene: 'island', x: 520, y: 700 }), _t0: () => ({ scene: 'island', x: 430, y: 780 }), done: () => G.state.nightMarket.restored, next: 'nightServe' },
  nightServe: { ch: 8, text: () => T(`Sell ${Math.min(20, bizServedSince('night', 'nightServe'))}/20 dishes at your night stall (open 17:00–23:00)`, `Bán ${Math.min(20, bizServedSince('night', 'nightServe'))}/20 món ở Sạp Đêm (mở 17:00–23:00)`), target: () => ({ scene: 'island', x: 520, y: 700 }), done: () => bizServedSince('night', 'nightServe') >= 20, next: 'buyStall', scene: () => newChapter(9) },
  // ---- Chapter 10: the restaurant
  restoIntro: { ch: 10, next: 'buyResto' },          // (restaurantIntro moves on by itself)
  buyResto: { ch: 10, text: () => T(`Buy the restaurant's key from Mèo Mây (${gateText('restaurant')})`, `Mua chìa khóa nhà hàng từ Mèo Mây (${gateText('restaurant')})`), target: () => meoTarget(), done: () => bizOf('restaurant').owned, next: 'repairResto' },
  repairResto: { ch: 10, text: () => { const r = BUSINESSES.restaurant.repair; return T(`Repair the restaurant: wood ${mats('wood')}/${r.wood}, metal ${mats('metal')}/${r.metal}, paint ${mats('paint')}/${r.paint}, roof tiles ${mats('tile')}/${r.tile}`, `Sửa nhà hàng: gỗ ${mats('wood')}/${r.wood}, tôn ${mats('metal')}/${r.metal}, sơn ${mats('paint')}/${r.paint}, ngói ${mats('tile')}/${r.tile}`); }, target: () => frontOf('restaurant'), done: () => bizOf('restaurant').repair >= 1, next: 'hire', scene: () => grandOpening() },
  hire: { ch: 10, text: () => T('Hire your first employee at the Staff board inside the restaurant', 'Thuê nhân viên đầu tiên ở bảng Nhân viên trong nhà hàng'), target: () => G.scene?.id === 'restaurant' ? { scene: 'restaurant', x: 356, y: 330 } : doorOf('restaurant'), done: () => bizOf('restaurant').employees.length > 0, next: 'restoServe' },
  restoServe: { ch: 10, text: () => T(`Serve ${Math.min(30, bizServedSince('restaurant', 'restoServe'))}/30 guests at the restaurant`, `Phục vụ ${Math.min(30, bizServedSince('restaurant', 'restoServe'))}/30 khách ở nhà hàng`), target: () => G.scene?.id === 'restaurant' ? null : doorOf('restaurant'), done: () => bizServedSince('restaurant', 'restoServe') >= 30, next: 'team' },
  team: { ch: 10, text: () => T('Hire a cook and a server so the restaurant runs itself', 'Thuê đầu bếp và phục vụ để nhà hàng tự vận hành'), target: () => G.scene?.id === 'restaurant' ? { scene: 'restaurant', x: 356, y: 330 } : doorOf('restaurant'), done: () => { const roles = new Set(bizOf('restaurant').employees.map(e => e.role)); return roles.has('cook') && roles.has('server'); }, next: 'destination', scene: () => destinationIntro() },
  // ---- Chapter 11: a destination (founder statue) · Chapter 13: the café's second part
  destination: { ch: 11, text: () => { const lv3 = Object.values(G.state.biz).some(b => b.level >= 3); return T(`A destination: reputation ${Math.floor(G.state.reputation)}/400 · one shop at level 3 ${lv3 ? '✓' : '✗'} · then build the statue in the plaza`, `Điểm đến: danh tiếng ${Math.floor(G.state.reputation)}/400 · 1 quán cấp 3 ${lv3 ? '✓' : '✗'} · rồi dựng tượng ở Quảng Trường`); }, target: () => ({ scene: 'island', x: 900, y: 1600 }), done: () => G.state.statue, next: 'harbour', scene: () => finale() },
  rest7: { ch: 13, text: () => goals(T('A café worth crossing the sea for', 'Quán cà phê đáng để vượt biển'), cafeGoals()), target: () => null, done: () => allDone(cafeGoals()), next: 'bridge', scene: () => longBridgeIntro() },
  // ---- Chapter 14: the Long Bridge and Firefly Islet
  bridge: { ch: 14, text: () => { const r = BRIDGE_REPAIR; return T(`Repair the Long Bridge: ${moneyGoal(G.state.money, r.cost)}, wood ${mats('wood')}/${r.mats.wood}, metal ${mats('metal')}/${r.mats.metal}, paint ${mats('paint')}/${r.mats.paint}`, `Sửa Cây Cầu Dài: ${moneyGoal(G.state.money, r.cost)}, gỗ ${mats('wood')}/${r.mats.wood}, tôn ${mats('metal')}/${r.mats.metal}, sơn ${mats('paint')}/${r.mats.paint}`); }, target: () => ({ scene: 'island', x: 1700, y: 1540 }), done: () => flag('bridgeFixed'), next: 'islet', scene: () => bridgeOpened() },
  islet: { ch: 14, text: () => T('Cross the bridge and find the painter on Firefly Islet', 'Qua cầu và tìm cô họa sĩ trên Cù Lao Đom Đóm'), target: () => ({ scene: 'island', x: 2350, y: 1700 }), done: () => flag('metVy') || (G.scene?.id === 'island' && dist(G.player.x, G.player.y, 2350, 1700) < 90), next: 'vyViews', scene: () => meetVy() },
  vyViews: { ch: 14, text: () => { const n = VY_VIEWS.filter(v => flag('view:' + v.id)).length; const next = VY_VIEWS.find(v => !flag('view:' + v.id)); return T(`Show Vy the island's best views (${n}/3)${next ? ' — next: ' + next.en : ''}`, `Chỉ cho Vy những cảnh đẹp nhất đảo (${n}/3)${next ? ' — tiếp: ' + next.vi : ''}`); }, target: () => { const v = VY_VIEWS.find(v => !flag('view:' + v.id)); return v ? { scene: 'island', x: v.x, y: v.y } : null; }, done: () => { for (const v of VY_VIEWS) if (!flag('view:' + v.id) && G.scene?.id === 'island' && dist(G.player.x, G.player.y, v.x, v.y) < 60) { setFlag('view:' + v.id); toast({ text: T(`What a view: ${v.en}!`, `Cảnh đẹp quá: ${v.vi}!`), sub: T('Vy will love this.', 'Vy sẽ mê lắm.'), icon: 'photo' }); sfx('success'); } return VY_VIEWS.every(v => flag('view:' + v.id)); }, next: 'landlord', scene: () => newChapter(15) },
  // ---- Chapter 16: the Lantern Festival
  festival: { ch: 16, text: () => goals(T('Lantern Festival', 'Lễ hội đèn lồng'), festivalGoals()), target: () => null, done: () => allDone(festivalGoals()), next: 'cove', scene: () => festivalNight() },
  // ---- Chapter 20: Keeper of the Island
  keeper: { ch: 20, text: () => goals(T('Keeper of the Island', 'Người giữ đảo'), keeperFinalGoals()), target: () => null, done: () => allDone(keeperFinalGoals()), next: 'free', scene: () => keeperCeremony() },
  free: { ch: 20, text: () => freeText(), target: () => null, done: () => false },
};
function freeText() {
  const av = availableRecipes();
  if (av.length) return T('Mèo Mây has a new recipe for you — visit her house!', 'Mèo Mây có công thức mới! Ghé nhà Mèo Mây nhé');
  const up = Object.entries(G.state.biz).find(([id, b]) => b.owned && b.level < 3 && BUSINESSES[id].upgrades);
  if (up) return T(`Upgrade ${bizName(up[0])} and keep growing your island`, `Nâng cấp ${bizName(up[0])} và tiếp tục phát triển đảo`);
  // after the story: the families who left, the neighbours' own stories, the island's secrets
  if (flag('keeper')) {
    if (!(G.state.sideQuests?.post_lam === 'done')) return T('Mèo Mây has news from the mainland — go and see it', 'Mèo Mây có tin từ đất liền — ghé gặp nhé');
    const open = Object.keys(G.state.sideQuests || {}).filter(k => ['active', 'found'].includes(G.state.sideQuests[k])).length;
    if (open) return T(`${open} neighbour${open > 1 ? 's are' : ' is'} waiting on you (★ on the map)`, `${open} người hàng xóm đang chờ bạn (★ trên bản đồ)`);
  }
  return T(`Day ${G.state.day}: ${G.state.island.name} is buzzing!`, `Ngày ${G.state.day}: đảo ${G.state.island.name} đang rộn ràng!`);
}
function hasStockFor(k) {
  if (pantry(k) > 0) return true;
  if (k === 'kumquat') return (bizOf('shed1').prepped.kumquat_cut || 0) > 0;
  return false;
}

// ---------------------------------------------------------------- engine
let checking = false;
export function currentStep() { return STEPS[S().step]; }
function meoTarget() { const m = G.meo; return m && m.scene === 'island' ? { scene: 'island', x: m.x, y: m.y } : doorOf('meo'); }
// which shop key Mèo Mây is waiting to sell right now
const GATE_STEP = { key2: 'shed2', truck: 'truck', restoreNM: 'night', buyResto: 'restaurant' };
export function pendingGate() { const id = GATE_STEP[S().step]; return id && !gatePaid(id) ? id : null; }
export function setStep(id) {
  const st = S();
  st.step = id;
  bus.emit('step', id);
  st.flags['served@' + id] = G.state.stats.served;
  st.flags['perf@' + id] = G.state.stats.perfect; st.flags['life@' + id] = G.state.lifetime || 0;
  const bizFor = { keeperRun: 'shed2', banhmi: 'shed2', truckServe: 'truck', nightServe: 'night', restoServe: 'restaurant', cafeServe: 'cafe', grillServe: 'grill' }[id];
  if (bizFor) st.flags['bs@' + id] = bizOf(bizFor).stats.served;
  if (id === 'stallServe') st.flags['stalls@stallServe'] = boughtStalls().reduce((a, k) => a + bizOf(k).stats.served, 0);
  const ch = STEPS[id]?.ch;
  if (ch && ch > st.chapter) { if (st.chapter >= 1) addXP(120 * (ch - st.chapter), 'chapter'); st.chapter = ch; if (!st.flags['card:' + ch] && ch > 1) G.runtime.cardQueue = ch; }
  markDirty(true);
  refreshQuest();
}
export function refreshQuest() {
  const st = currentStep();
  if (!st || !st.text || !flag('freeRoam')) { setQuest(null); return; }
  setQuest(st.text(), () => st.target?.());
}
export async function checkStory() {
  if (checking || cs.active || !flag('freeRoam')) return;
  // never start a story moment on top of something else: a menu, a reward card, a line of
  // dialogue, a door, sleeping or the lighthouse. The story check runs every second, so it
  // simply happens a moment later.
  if (isUiOpen() || isPresenting() || dialogue.active || G.runtime.sleeping || isTransitioning() || G.runtime.lookout) return;
  if (G.runtime.cardQueue && !flag('card:' + G.runtime.cardQueue)) { const n = G.runtime.cardQueue; G.runtime.cardQueue = 0; checking = true; try { await newChapter(n); } finally { checking = false; } return; }
  const st = currentStep();
  if (!st?.done) return;
  if (!st.done()) { refreshQuest(); return; }
  checking = true;
  try {
    const next = st.next;
    if (st.scene) { await st.scene(); }
    if (next && S().step !== next && STEPS[S().step] === st) setStep(next);
  } finally { checking = false; }
}

// ---------------------------------------------------------------- Mèo Mây helpers
function placeMeo(sceneId, x, y) {
  const m = G.meo;
  const cur = Object.values(scenes).find(sc => sc.actors.includes(m));
  if (cur && cur.id !== sceneId) cur.remove(m);
  scenes[sceneId].add(m);
  m.x = x; m.y = y; m.visible = true; m.stop(); m.sit = false; m.setAct(null); m.data.home = false;
}
// Bring Mèo Mây to the player: it comes running from off-screen.
async function summonMeo(offset = 34) {
  const m = G.meo, pl = G.player, sc = G.scene;
  m.data.busy = true;
  if (!sc.actors.includes(m) || dist(m.x, m.y, pl.x, pl.y) > 360) {
    if (sc.kind === 'island') {
      const nodes = sc.nav.nodes.filter(n => { const d = dist(n.x, n.y, pl.x, pl.y); return d > 200 && d < 300; });
      const n = nodes.length ? choice(nodes) : sc.nav.nearest(pl.x + 200, pl.y);
      placeMeo(sc.id, n.x, n.y);
    } else placeMeo(sc.id, sc.door.x, sc.h + 8);
  }
  emote(m, '!');
  const tx = pl.x + (pl.x > (sc.w / 2) ? -offset : offset), ty = pl.y + 6;
  if (sc.kind === 'island') await walk(m, tx, ty, { speed: 105 }); else await m.walkTo(sc.grid ? sc.grid.path(m.x, m.y, tx, ty) : [[sc.door.x, sc.h - 20], [tx, ty]], { speed: 90 });
  face(m, pl); face(pl, m);
}
function releaseMeo(to = 'plaza') {
  const m = G.meo;
  m.data.busy = false; m.data.until = 0; m.data.goal = to;
}
function titleCard(n) {
  bus.emit('chapterCard', n, [`Chapter ${n}: ${CHAPTERS[n]?.title || ''}`, `Chương ${n}: ${CHAPTERS[n]?.vi || ''}`]);
  const ch = CHAPTERS[n];
  setFlag('card:' + n);
  caption(T(`Chapter ${n}: ${ch.title}`, `Chương ${n}: ${ch.vi}`));
  bus.emit('stinger', 'chapter');
  return wait(2.4).then(() => caption(null));
}

// ---------------------------------------------------------------- new chapters: a title card and a word from Mèo Mây
const CH_LINES = {
  2: [['You\'ve made it through your first days! Now let\'s turn customers into *regulars* — people who come back again and again.', 'Bạn đã qua được mấy ngày đầu rồi! Giờ biến khách thành *khách quen* nha — những người quay lại hoài.'], ['My notebook at home has a new recipe waiting once your reputation reaches 18. Come by!', 'Sổ tay ở nhà mình có công thức mới chờ bạn khi danh tiếng đạt 18. Ghé chơi nha!'], ['Save up and give the drink stand its first upgrade. Stripes make everything taste better. Science.', 'Để dành tiền nâng cấp quán nước lần đầu. Có sọc là cái gì cũng ngon hơn. Khoa học đó.']],
  4: [['Two shops! The bánh mì shed is waiting in West Village. Mèo Mây approves.', 'Hai quán! Quán bánh mì đang chờ ở Xóm Tây. Mèo Mây duyệt.']],
  5: [['You can\'t be in two places at once. Believe me, I\'ve tried — I just end up napping in both.', 'Bạn đâu thể ở hai nơi cùng lúc. Tin mình đi, mình thử rồi — cuối cùng ngủ ở cả hai chỗ.'], ['Hire a *shopkeeper* for the drink stand. Open the Menu → Business. They open, prep and serve while you work the bánh mì shed.', 'Thuê một *người trông quán* cho quán nước nha. Mở Menu → Kinh doanh. Họ sẽ mở cửa, sơ chế và bán trong lúc bạn lo quán bánh mì.']],
  6: [['Running two shops means running out of kumquats twice as fast. There\'s a *supply runner* who delivers every morning — for a fee.', 'Hai quán là hết tắc nhanh gấp đôi. Có *người giao hàng* mang tới mỗi sáng — có tính phí.'], ['And the landlords have started collecting *rent*. One day you could buy the places outright. One day.', 'Và chủ nhà bắt đầu thu *tiền thuê* rồi. Một ngày nào đó bạn có thể mua đứt luôn. Một ngày nào đó.']],
  9: [['The other stall families are getting older. Bà Chín from the sweet soup stall says she\'d sell to someone she trusts…', 'Mấy gia đình bán sạp cũng lớn tuổi rồi. Bà Chín sạp chè nói sẽ bán lại cho người bà tin…'], ['Buy a second stall. More stalls, more lanterns, more happy people.', 'Mua thêm một sạp nha. Thêm sạp, thêm đèn, thêm người vui.']],
  12: [['See that island across the water to the north-east? *Harbour Town*. Fishermen, a café and — the best part — a PET SHOP.', 'Thấy hòn đảo bên kia phía đông bắc không? *Phố Cảng* đó. Có ngư dân, có quán cà phê và — hay nhất — một TIỆM THÚ CƯNG.'], ['There\'s no bridge yet. Let\'s build one! Bring lots of wood, metal and paint to the east coast.', 'Chưa có cầu. Mình xây một cây nha! Mang thật nhiều gỗ, tôn và sơn tới bờ đông.']],
  13: [['The old harbour café is for sale. Salted coffee, egg coffee… my whiskers are curling just thinking about it.', 'Quán cà phê bến cảng cũ đang bán. Cà phê muối, cà phê trứng… nghĩ thôi mà râu mình đã xoăn lên.']],
  15: [['You pay a lot of rent, you know. Every coin that goes to a landlord is a coin that doesn\'t go to fish. For me.', 'Bạn trả tiền thuê nhiều ghê đó. Đồng nào đưa cho chủ nhà là đồng không mua được cá. Cho mình.'], ['Buy three of your places outright. Menu → Business.', 'Mua đứt ba nơi bạn đang thuê nha. Menu → Kinh doanh.']],
  17: [['Past the east beach there\'s a little island shaped like a coconut. *Coconut Cove*. Grilled squid at sunset… if only there were a bridge.', 'Qua khỏi bãi đông có một hòn đảo nhỏ hình trái dừa. *Vịnh Dừa*. Mực nướng lúc hoàng hôn… giá mà có cây cầu.']],
  18: [['Every stall in the Night Market could shine with your lanterns. The last families are ready to hand theirs over.', 'Sạp nào ở Chợ Đêm cũng có thể sáng đèn của bạn. Mấy gia đình cuối cùng sẵn sàng giao lại rồi.']],
  19: [['One last dream: an island that runs itself. Every shop with someone caring for it, so you can finally take a nap. With me.', 'Giấc mơ cuối: một hòn đảo tự vận hành. Quán nào cũng có người chăm, để bạn cuối cùng cũng được ngủ trưa. Với mình.']],
  20: [['Look at everything you built. It\'s time for the island to choose its Keeper.', 'Nhìn những gì bạn đã xây nè. Tới lúc hòn đảo chọn Người Giữ Đảo rồi.']],
};
async function newChapter(n) {
  if (flag('card:' + n)) return;
  await cs.run('card' + n, async () => {
    G.runtime.inCutscene = true;
    if (G.scene.kind === 'island') await summonMeo();
    const pl = G.player; pl.setAct('cheer'); sfx('fanfare'); fx.burst('confetti', pl.x, pl.y - 30, 40, { up: 100, speed: 80, col: ['#f08ca0', '#ffd35a', '#9fd8c8', '#fff'], g: 60, life: 1.8 });
    await titleCard(n);
    pl.setAct(null);
    for (const line of CH_LINES[n] || []) await say('meo', T(line[0], line[1]), { emo: 'happy' });
    if (G.scene.kind === 'island') releaseMeo('plaza');
  });
  G.runtime.inCutscene = false;
}
async function harbourOpened() {
  npcs.spawnIsletResidents?.();                  // Ông Lộc and Chị Ngọc come out to see who built the bridge
  toast({ text: T('The Harbour Bridge is open!', 'Cầu Bến Cảng đã thông!'), sub: T('Harbour Town and Cô Bông\'s pet shop await.', 'Phố Cảng và tiệm thú cưng của Cô Bông đang chờ.'), icon: 'paw', ms: 3800 });
}
async function coveOpened() {
  npcs.spawnIsletResidents?.();                  // and Cô Dừa at the cove
  toast({ text: T('The Cove Bridge is open!', 'Cầu Vịnh Dừa đã thông!'), sub: T('Coconut Cove\'s grill kiosk is for sale.', 'Ki-ốt quán nướng ở Vịnh Dừa đang cần bán.'), icon: 'squid', ms: 3800 });
}
// build the Harbour or Cove bridge (a hammering montage like the Long Bridge)
export async function buildSeaBridge(which) {
  const R = which === 'harbour' ? HARBOUR_BRIDGE : COVE_BRIDGE;
  const box = which === 'harbour' ? { x: 1612, y: 681, w: 400 } : { x: 1626, y: 2061, w: 320 };
  await cs.run('build-' + which, async () => {
    G.runtime.inCutscene = true;
    addMoney(-R.cost, 'build'); spendMats(R.mats);
    const pl = G.player;
    await camTo(box.x + box.w / 2, box.y + 20, { zoom: 0.95, rate: 2 });
    pl.setAct('hammer');
    for (let i = 0; i < 18; i++) { sfx('hammer'); cam.shake = 0.2; const x = box.x + 60 + i * (box.w - 120) / 18; fx.burst('dust', x, box.y + rand(0, 36), 4, { up: 20, speed: 40 }); fx.burst('chip', x, box.y + 18, 2, { up: 60, speed: 50, col: ['#c88a52', '#e9c46f'] }); await wait(0.16); }
    pl.setAct(null);
    setFlag(which === 'harbour' ? 'harbourBridge' : 'coveBridge'); addXP(260, 'bridge');
    island().cache.map.clear();
    fx.burst('confetti', box.x + box.w / 2, box.y, 50, { up: 110, speed: 100, col: ['#f08ca0', '#ffd35a', '#9fd8c8', '#fff'], g: 70, life: 1.8 });
    sfx('fanfare'); pl.doHop(); pl.setEmo('happy', 2);
    await wait(1.2);
  });
  G.runtime.inCutscene = false;
  checkStory();
}
// ---------------------------------------------------------------- Chapter 1: arrival
export async function runArrival() {
  const pl = G.player, sc = island();
  if (G.runtime.paused) { G.runtime.paused = false; document.getElementById('pauseCard')?.remove(); }
  G.runtime.introBoat = true;
  G.runtime.inCutscene = true;
  showHud(false);
  document.body.classList.add('hide-controls', 'cutscene');
  // 1) the crossing
  const skip = { skip: false };
  const skipBtn = document.getElementById('skipBtn'), cinema = document.getElementById('cinema');
  cinema.classList.remove('hidden'); requestAnimationFrame(() => cinema.classList.add('on'));
  skipBtn.classList.remove('hidden');
  skipBtn.onclick = () => { skip.skip = true; sfx('ui'); };
  G.runtime.cinematic = true;
  await playCinematic(document.getElementById('game'), { onCaption: (a, b) => caption(a, b), skipSignal: skip });
  caption(null);
  skipBtn.classList.add('hidden');
  G.runtime.cinematic = false;
  G.renderer?.resize();                                 // the cinematic sized the canvas for itself: give it back to the world renderer
  // 2) docking, top-down
  setScene('island', 1004, 2584, 'up');
  pl.visible = false;
  const f = npcs.ferry;
  f.state = 'arriving'; f.x = 1004; f.y = 2860; f.speed = 80;
  cam.override = { x: 960, y: 2700, zoom: 1.05, rate: 2 };
  document.getElementById('fade').classList.remove('on');
  const m = G.meo;
  placeMeo('island', 900, 2372); m.face('down');
  await cs.run('arrival', async () => {
    G.runtime.inCutscene = true;
    cam.override = { x: 970, y: 2700, zoom: 1.05, rate: 1.4 };
    while (f.state !== 'docked') { cam.override.y = Math.max(2560, f.y - 40); await sleep(30); }
    sfx('horn');
    await wait(0.5);
    // hop off the boat onto the pier
    pl.x = 990; pl.y = 2582; pl.visible = true; pl.face('left');
    pl.doHop(120); await wait(0.1);
    await pl.walkTo([[958, 2583]], { speed: 90 });
    fx.burst('dust', pl.x, pl.y, 6, { up: 20, speed: 30 });
    await wait(0.3);
    pl.face('up');
    await camTo(930, 2530, { zoom: 1.1, rate: 2.2 });
    // Mèo Mây spots the newcomer and comes trotting down the pier
    emote(m, '!'); m.doHop(); sfx('meow');
    await wait(0.6);
    await m.walkTo([[900, 2450], [900, 2560], [930, 2580]], { speed: 78 });
    face(m, pl); face(pl, m); pl.setEmo('surprised', 1.4); emote(pl, '?');
    await camTo((m.x + pl.x) / 2, pl.y - 20, { zoom: 1.35, rate: 2.5 });
    m.tiltTarget = 0.18;
    await say('meo', T('Oh! A new face on the island!', 'Ơ! Một người mới đến đảo kìa!'), { emo: 'surprised' });
    m.tiltTarget = 0; await hop(m, 2);
    await say('meo', T('Hello, hello! Welcome! I\'m *Mèo Mây* — the island\'s official greeter, lantern-counter and nap expert.', 'Chào bạn, chào bạn! Mình là *Mèo Mây* — người chào đón, đếm lồng đèn và chuyên gia ngủ trưa của đảo.'), { emo: 'happy' });
    await say('meo', T('Hmm… you don\'t look like a fisherman. And you\'re definitely not a tourist — you packed way too much.', 'Hừm… trông bạn không giống ngư dân. Mà cũng chẳng phải khách du lịch — bạn mang nhiều đồ quá trời.'), { tilt: 0.15 });
    m.tiltTarget = 0.2;
    await say('meo', T('What should I call you?', 'Mình nên gọi bạn là gì nhỉ?'));
    m.tiltTarget = 0;
    const name = await askText({ title: T('What\'s your name?', 'Bạn tên gì?'), placeholder: T('Your name', 'Tên của bạn'), max: 14 });
    G.state.player.name = name;
    pl.name = name;
    await say('meo', T(`*${name}*! What a lovely name. Let me get a good look at you…`, `*${name}*! Tên dễ thương ghê. Để mình ngắm bạn kỹ một chút…`), { emo: 'happy' });
    const look = await chooseLook(G.state.player.lookOpt || {});
    G.state.player.lookOpt = look; G.state.player.gender = look.gender; G.state.player.look = playerLook(look); pl.look = G.state.player.look;
    G.state.wardrobe = { owned: ['classic', 'no_hat', 'no_extra'], outfit: 'classic' };
    pl.doHop(); fx.burst('spark', pl.x, pl.y - 30, 8, { up: 40, col: '#ffd35a' }); sfx('sparkle');
    await say('meo', T('Perfect. Very island-chic.', 'Hoàn hảo. Rất ra dáng dân đảo.'), { emo: 'happy' });
    await say('meo', T('Now… this island has had a lot of names. The old folks just call it “the island”. That\'s a little sad, isn\'t it?', 'Mà này… hòn đảo này từng có nhiều tên lắm. Mấy ông bà chỉ gọi là “cái đảo”. Nghe hơi buồn nhỉ?'), { emo: 'sad' });
    m.tiltTarget = 0.2;
    await say('meo', T('Since you\'re staying, would you give it a name?', 'Bạn ở lại đây rồi, đặt cho đảo một cái tên nhé?'));
    m.tiltTarget = 0;
    const isl = await askText({ title: T('Name your island', 'Đặt tên cho hòn đảo'), placeholder: T('Island name', 'Tên hòn đảo'), max: 16, value: T('Bistro Island', 'Đảo Bistro') });
    G.state.island.name = isl;
    markDirty(true);
    cloud.hasSession() && cloud.saveProfile(name, isl).catch(() => {});
    await camTo(900, 2370, { zoom: 1.1, rate: 2, hold: 0.5 });
    sfx('sparkle'); fx.burst('confetti', 900, 2330, 24, { up: 90, speed: 70, col: ['#f08ca0', '#ffd35a', '#9fd8c8', '#fff'], g: 60, life: 1.6 });
    await say('meo', T(`*${isl}*… Hehe. The welcome gate already likes it.`, `*${isl}*… Hì hì. Cổng chào thích cái tên này lắm đó.`), { emo: 'happy' });
    await camTo((m.x + pl.x) / 2, pl.y - 20, { zoom: 1.25 });
    const tour = await ask('meo', T('Want me to show you around? It takes a few minutes.', 'Muốn mình dẫn đi một vòng không? Mất vài phút thôi.'), [T('Show me around!', 'Dẫn mình đi nào!'), T('I\'ll explore on my own', 'Mình tự khám phá')], { emo: 'happy' });
    if (tour === 1) { S().flags.quickStart = true; markDirty(true); return; }
    await say('meo', T('Okay! Follow me — I\'ll show you around. Stay close, the gulls here steal hats.', 'Được rồi! Đi theo mình nào — mình dẫn bạn đi một vòng. Đi sát nha, hải âu ở đây hay giật nón lắm.'), { emo: 'happy', act: 'point' });
    S().step = 'tour'; markDirty(true);
  });
  G.runtime.introBoat = false;
  f.state = 'docked'; f.t = 0; f.boarded = 0; f.sinceBoard = 0; f.unloadFor = 0;
  if (S().flags.quickStart) await quickStart(); else await runTour();
}
// The short way in: the three things you need to know, then the island is yours (the
// quest arrow shows the way to everything the tour would have).
async function quickStart() {
  const m = G.meo;
  await cs.run('quickstart', async () => {
    G.runtime.inCutscene = true;
    await say('meo', T('Then just three things! Your first business is the *broken shed on the beach* — fix it with wood, metal and paint from *Ben Vung Materials*.', 'Vậy chỉ ba điều thôi! Quán đầu tiên của bạn là *căn chòi hỏng trên bãi biển* — sửa nó bằng gỗ, tôn và sơn ở *VLXD Bền Vững*.'), { emo: 'happy' });
    await say('meo', T(`Your house is rented: ${money(PLACES.house.rent)} a day from *day 3*, paid when you sleep. *Sleep in your bed* to end each day.`, `Nhà của bạn là nhà thuê: ${money(PLACES.house.rent)} mỗi ngày từ *ngày 3*, trả khi bạn đi ngủ. *Ngủ trên giường* để kết thúc mỗi ngày.`));
    await say('meo', T('Follow the gold arrow, and come find me at the plaza if you get lost. Good luck!', 'Cứ đi theo mũi tên vàng, lạc thì ra quảng trường tìm mình nha. Chúc may mắn!'), { emo: 'happy' });
    m.setAct('wave'); await hop(m, 1); m.setAct(null);
    walk(m, 970, 1650, { speed: 70 }).then(() => { m.sit = true; releaseMeo('plaza'); });
  });
  G.runtime.inCutscene = false;
  setFlag('freeRoam');
  setStep('materials');
  toast({ text: T('Chapter 1: A New Arrival', 'Chương 1: Người Mới Đến'), sub: T('Explore the island freely!', 'Tự do khám phá hòn đảo!'), icon: 'lantern' });
  document.body.classList.add('show-joy-hint');
  showHud(true);
}

export async function runTour() {
  const pl = G.player, m = G.meo, sc = island();
  if (G.scene !== sc) setScene('island', 900, 2420, 'up');
  if (!sc.actors.includes(m) || dist(m.x, m.y, pl.x, pl.y) > 80) placeMeo('island', pl.x + 26, pl.y - 6);
  S().step = 'tour';
  G.runtime.inCutscene = true;
  await cs.run('tour', async () => {
    showHud(true);
    document.body.classList.add('hide-controls');
    camFollow(pl, 1.1);
    startFollow(m, 30);
    m.data.busy = true;
    // down the pier, under the gate, west along the beach to the shed
    await walk(m, 900, 2330, { speed: 72 });
    await walk(m, 640, 2242, { speed: 72 });
    await walk(m, 604, 2240, { speed: 60 });
    stopFollow();
    await pl.walkTo([[574, 2250]], { speed: 60 });
    face(m, { x: 600, y: 2150 }); face(pl, { x: 600, y: 2150 });
    await camTo(600, 2160, { zoom: 1.28, rate: 2.4 });
    await say('meo', T('This little shed doesn\'t look like much right now…', 'Căn chòi nhỏ này giờ trông chẳng ra sao…'), { emo: 'sad' });
    // Mèo Mây looks up at the broken roof
    m.lookY = -1; m.tiltTarget = -0.22;
    await camTo(600, 2120, { zoom: 1.34, rate: 2 });
    await wait(0.6);
    await say('meo', T('But sometimes all a place needs is someone willing to believe in it.', 'Nhưng đôi khi, một nơi chỉ cần một người chịu tin vào nó.'));
    await wait(0.8);
    m.tiltTarget = 0.2; m.lookY = 0; face(m, pl);
    await say('meo', T('And, uh… about *12 pieces of wood*.', 'Và, ờm… khoảng *12 tấm gỗ*.'), { tilt: 0.2 });
    m.tiltTarget = 0;
    await say('meo', T('It was Bà Tư\'s tea stand once. If you fix it up, it can be your very first business. Ben Vung Materials on Market Street sells wood, metal and paint.', 'Ngày xưa đây là quán trà của Bà Tư. Sửa lại là thành cửa hàng đầu tiên của bạn đó. Tiệm VLXD Bền Vững ở Phố Chợ có bán gỗ, tôn và sơn.'), { emo: 'happy' });
    await say('meo', T('But first — your house! This way!', 'Nhưng trước hết — nhà của bạn! Lối này!'), { emo: 'happy' });
    camFollow(pl, 1.05);
    startFollow(m, 30);
    await walk(m, 900, 2240, { speed: 76 });
    await walk(m, 904, 1690, { speed: 80 });
    // a quick stop at the plaza
    stopFollow();
    await pl.walkTo([[880, 1705]], { speed: 70 });
    face(m, { x: 900, y: 1540 }); face(pl, { x: 900, y: 1540 });
    await camTo(900, 1560, { zoom: 1.0, rate: 2 });
    await say('meo', T('Wind Plaza. Everyone meets here — for gossip, for chess, for pretending not to gossip.', 'Quảng trường gió. Ai cũng tụ tập ở đây — để buôn chuyện, đánh cờ, và giả vờ không buôn chuyện.'), { emo: 'happy' });
    await say('meo', T('Market Street is just north of here: *Binh Minh Supermarket* for ingredients, *Chú Bảy* for materials, *Anh Khoa* for furniture.', 'Phố Chợ ở ngay phía bắc: *Siêu thị Bình Minh* bán nguyên liệu, *Chú Bảy* bán vật liệu, *Anh Khoa* bán nội thất.'), { act: 'point' });
    camFollow(pl, 1.05);
    startFollow(m, 30);
    await walk(m, 1000, 1590, { speed: 80 });
    await walk(m, 1262, 1772, { speed: 80 });
    stopFollow();
    await pl.walkTo([[1236, 1780]], { speed: 60 });
    face(m, { x: 1260, y: 1700 }); face(pl, { x: 1260, y: 1700 });
    B('house').doorTarget = 0.4;
    await camTo(1262, 1700, { zoom: 1.25, rate: 2.2 });
    await say('meo', T('And this… is *your home*! Yellow walls, green shutters, a roof that only leaks when it rains.', 'Còn đây… là *nhà của bạn*! Tường vàng, cửa sổ xanh, mái chỉ dột khi trời mưa thôi.'), { emo: 'happy' });
    face(m, pl);
    // it's rented — and it doesn't have to stay that way
    await say('meo', T(`One thing: this house is *rented*, like every shop you'll run. The rent is ${money(PLACES.house.rent)} a day, and it starts on *day 3* — I talked the landlord into a little welcome discount.`, `Có điều này: căn nhà này là nhà *thuê*, giống mọi quán bạn sẽ mở. Tiền thuê là ${money(PLACES.house.rent)} mỗi ngày, bắt đầu từ *ngày 3* — mình đã xin chủ nhà giảm giá chào mừng rồi.`));
    await say('meo', T(`Rent comes out of your money automatically every night when you sleep. But you can also *buy the property outright* for ${money(propertyPrice('house'))} — then it's yours forever and the rent stops.`, `Tiền thuê tự trừ vào tiền của bạn mỗi tối khi đi ngủ. Nhưng bạn cũng có thể *mua đứt* với giá ${money(propertyPrice('house'))} — khi đó nhà là của bạn mãi mãi và không phải trả thuê nữa.`));
    await say('meo', T('To buy, open the *Menu → Business* tab and tap *Buy property*. Every shop you rent works the same way. Save up — owning beats renting!', 'Muốn mua thì mở *Menu → Kinh doanh* rồi bấm *Mua đứt*. Quán nào bạn thuê cũng vậy. Ráng dành dụm nha — có nhà riêng vẫn hơn đi thuê!'), { emo: 'happy' });
    await say('meo', T('It\'s a bit empty inside. Anh Khoa sells furniture — you can arrange it however you like.', 'Bên trong hơi trống. Anh Khoa có bán đồ nội thất — bạn muốn bày sao cũng được.'));
    await say('meo', T('When you\'re tired, *sleep in your bed*. That ends the day, and I\'ll tell you how it went. I\'m very good at counting coins.', 'Khi mệt thì *đi ngủ trên giường* nhé. Vậy là hết một ngày, và mình sẽ kể bạn nghe ngày hôm đó thế nào. Mình đếm tiền giỏi lắm.'), { emo: 'happy' });
    B('house').doorTarget = 0;
    face(m, { x: 1480, y: 1700 }); m.setAct('point');
    await camTo(1370, 1700, { zoom: 1.1 });
    await say('meo', T('Oh — and my house is right next door. The one with the ears. Come visit anytime!', 'À — nhà mình ở ngay bên cạnh. Cái nhà có tai mèo đó. Ghé chơi bất cứ lúc nào nha!'), { act: 'point' });
    m.setAct(null); face(m, pl);
    await camTo((m.x + pl.x) / 2, pl.y - 20, { zoom: 1.3 });
    await say('meo', T(`Good luck, ${G.state.player.name}. I believe in you — and in that shed.`, `Chúc may mắn, ${G.state.player.name}. Mình tin bạn — và tin cả căn chòi đó nữa.`), { emo: 'happy' });
    m.setAct('wave'); await hop(m, 1); await wait(0.5); m.setAct(null);
    // Mèo Mây trots off toward the plaza, not vanishing
    camFollow(pl, 1);
    walk(m, 970, 1650, { speed: 70 }).then(() => { m.sit = true; releaseMeo('plaza'); });
    await wait(1.2);
  });
  G.runtime.inCutscene = false;
  setFlag('freeRoam');
  setStep('materials');
  toast({ text: T('Chapter 1: A New Arrival', 'Chương 1: Người Mới Đến'), sub: T('Explore the island freely!', 'Tự do khám phá hòn đảo!'), icon: 'lantern' });
  document.body.classList.add('show-joy-hint');
  showHud(true);
}

// ---------------------------------------------------------------- repairs / building
export async function repairScene(bizId) {
  const def = BUSINESSES[bizId], b = bizOf(bizId), bld = B(bizId);
  const r = bizRT(bizId);
  addXP(60, 'repair');
  await cs.run('repair:' + bizId, async () => {
    G.runtime.inCutscene = true;
    spendMats(def.repair);
    const pl = G.player;
    // hammer from each side of the building in profile, so the swing (and where it lands) is readable
    const spots = [[bld.x - bld.w / 2 - 14, bld.y + 6, 1], [bld.x + bld.w / 2 + 14, bld.y + 6, -1]];
    await walk(pl, spots[0][0], spots[0][1] + 24, { speed: 90 });
    await camTo(bld.x, bld.y - 40, { zoom: 1.3, rate: 2.4 });
    r.repairAnim = 0;
    const dur = 4.4;
    for (let si = 0; si < spots.length; si++) {
      const [sx, sy, f] = spots[si];
      pl.setAct(null); delete pl.yawOverride;
      await walk(pl, sx, sy, { direct: true, speed: 90 });
      pl.face(f > 0 ? 'right' : 'left');
      // from the right side a 3/4 turn keeps the hammer hand (right) toward the wall and in view
      pl.yawOverride = f > 0 ? Math.PI / 2 : -Math.PI * 0.3;
      pl.setAct('hammer');
      const tA = performance.now(); let lastHit = -1;
      while (true) {
        const e = (performance.now() - tA) / 1000, k = (si + Math.min(1, e / (dur / 2))) / spots.length;
        r.repairAnim = Math.min(0.999, k);
        if (e >= dur / 2) break;
        // the hammer lands once per swing (the pose cycles 3.4×/s, striking at 70% of the cycle)
        const hit = Math.floor(e * 3.4 + 0.3);
        if (hit !== lastHit) {
          lastHit = hit; sfx('hammer'); cam.shake = 0.15;
          const x = pl.x + f * 16, y = pl.y - 10;
          fx.burst('dust', x, y, 4, { up: 25, speed: 35, life: 0.6 });
          fx.burst('chip', x, y, 3, { up: 70, speed: 50, col: ['#c88a52', '#d9a064', '#b9c3cb'], size: 2.5 });
        }
        await sleep(30);
      }
    }
    pl.setAct(null); delete pl.yawOverride;
    r.repairAnim = null;
    b.repair = 1; b.unlocked = true;
    markDirty(true);
    fx.burst('spark', bld.x, bld.y - 50, 18, { up: 60, speed: 80, col: '#ffd35a', life: 1.2 });
    fx.burst('confetti', bld.x, bld.y - 60, 26, { up: 110, speed: 90, col: ['#f08ca0', '#ffd35a', '#9fd8c8', '#fff'], g: 70, life: 1.6 });
    sfx('fanfare');
    await camTo(bld.x, bld.y - 50, { zoom: 1.45, rate: 3 });
    pl.setEmo('happy', 2); pl.doHop(); pl.setAct('cheer');
    await wait(1.4); pl.setAct(null);
    unlockAchievement('first_repair');
    if (Object.values(G.state.biz).filter(x => x.owned && x.repair >= 1).length >= 2) unlockAchievement('two_biz');
  });
  G.runtime.inCutscene = false;
  checkStory();
}
export async function upgradeScene(bizId, lv) {
  const def = BUSINESSES[bizId], b = bizOf(bizId), u = def.upgrades[lv];
  const isResto = bizId === 'restaurant';
  const inside = G.scene.id !== 'island';
  await cs.run('upgrade', async () => {
    G.runtime.inCutscene = true;
    addMoney(-upgradeCost(bizId, lv), 'upgrade'); spendMats(u.mats);
    if (inside) { await fadeOut(300); }
    const bld = B(bizId), pl = G.player;
    const back = inside ? { id: G.scene.id, x: pl.x, y: pl.y } : null;
    if (inside) { setScene('island', bld.x - 30, bld.y + 34, 'up'); await fadeIn(300); }
    face(pl, { x: bld.x, y: bld.y - 30 });
    await camTo(bld.x, bld.y - 50, { zoom: isResto ? 1 : 1.3, rate: 2.5 });
    pl.setAct('hammer');
    for (let i = 0; i < 8; i++) { sfx('hammer'); fx.burst('dust', bld.x + rand(-bld.w / 2, bld.w / 2), bld.y - rand(10, 70), 4, { up: 30, speed: 40 }); await wait(0.28); }
    pl.setAct(null);
    b.level = lv; addXP(50 + lv * 20, 'upgrade');
    if (isResto) scenes.restaurant.applyLevel();
    fx.burst('confetti', bld.x, bld.y - 60, 30, { up: 110, speed: 90, col: ['#f08ca0', '#ffd35a', '#9fd8c8', '#fff'], g: 70, life: 1.6 });
    sfx('fanfare'); pl.setEmo('happy', 2); pl.doHop();
    await wait(1.4);
    if (lv >= 3) unlockAchievement('max_level');
    markDirty(true);
    if (back) { await fadeOut(300); setScene(back.id, back.x, back.y, 'down'); await fadeIn(300); }
  });
  G.runtime.inCutscene = false;
  toast({ text: T(`${bizName(bizId)} reached level ${lv}!`, `${bizName(bizId)} lên cấp ${lv}!`), sub: T(u.label, u.labelVi || u.label), icon: 'lantern' });
  checkStory();
}
export async function discoverRecipe(id, { from = 'meo' } = {}) {
  if (!learnRecipe(id)) return;
  const R = RECIPES[id];
  await showReward({ kicker: T('New recipe', 'Công thức mới'), title: recipeName(id), sub: '', icon: R.icon, steps: R.steps.map(s => STATION[s].icon), text: T(R.blurb, R.blurbVi || R.blurb), button: T('Got it!', 'Học xong!') });
  if (G.state.recipes.length >= 5) unlockAchievement('recipes_5');
  if (G.state.recipes.length >= Object.keys(RECIPES).length) unlockAchievement('recipes_all');
  // give this business a daily special if it has none yet
  const bizId = Object.keys(BUSINESSES).find(b => BUSINESSES[b].biz === R.biz);
  if (bizId && !bizOf(bizId).special) bizOf(bizId).special = id;
}

// ---------------------------------------------------------------- Chapter 1: first repair and first customers
async function afterFirstRepair() {
  const m = G.meo;
  await cs.run('afterRepair', async () => {
    G.runtime.inCutscene = true;
    await summonMeo(34);
    await camTo((m.x + G.player.x) / 2, G.player.y - 30, { zoom: 1.3 });
    m.setEmo('surprised', 1.2);
    await say('meo', T('Waaa! Look at it! Is that the same shed? It looks so proud now!', 'Oaaa! Nhìn kìa! Có phải căn chòi hồi nãy không vậy? Trông nó tự hào ghê!'), { emo: 'surprised' });
    await hop(m, 2);
    await say('meo', T('A shop needs a menu, though. Here — this is the very first recipe Bà Tư ever taught me.', 'Mà quán thì phải có thực đơn chứ. Đây — công thức đầu tiên Bà Tư dạy mình.'), { emo: 'happy' });
    await discoverRecipe('tra_tac');
    await say('meo', T('Kumquat tea: *tea*, then *kumquat*. The customer tells you the size, sugar and ice.', 'Trà tắc: *trà* trước, rồi *tắc*. Khách sẽ nói size, đường và đá.'));
    await say('meo', T('Buy *tea, kumquats, sugar and ice* at Binh Minh Supermarket. Slice the kumquats at the prep table in Your Drink Stand. Then — open up!', 'Mua *trà, tắc, đường và đá* ở Siêu thị Bình Minh. Cắt tắc ở bàn sơ chế trong quán nước của bạn. Rồi — mở cửa thôi!'), { emo: 'happy' });
    await say('meo', T('I\'ll be nearby. I have very important napping to do.', 'Mình ở gần đây thôi. Mình có một giấc ngủ trưa cực kỳ quan trọng.'), { tilt: 0.15 });
    walk(m, 700, 2296, { speed: 70 }).then(() => { m.sit = true; releaseMeo('beach'); });
    await wait(0.8);
  });
  G.runtime.inCutscene = false;
  bizOf('shed1').special = 'tra_tac';
}
async function afterFirstCustomers() {
  setFlag('firstServed3');
  const m = G.meo;
  await cs.run('first3', async () => {
    G.runtime.inCutscene = true;
    await summonMeo(30);
    await say('meo', T('Your first customers! Did you see their faces? That\'s the face of someone who just had a *really* good kumquat tea.', 'Những vị khách đầu tiên! Bạn thấy mặt họ không? Đó là gương mặt của người vừa uống ly trà tắc *cực* ngon.'), { emo: 'happy' });
    await say('meo', T('Keep going as long as you like. Your shops close at 11 pm.', 'Cứ bán tiếp bao lâu tùy thích. Quán của bạn đóng cửa lúc 23 giờ.'));
    await say('meo', T('When you\'re tired, go home and sleep in your bed. Tomorrow the ferry brings new visitors — word travels fast here.', 'Khi mệt thì về nhà ngủ nhé. Mai tàu sẽ đưa khách mới tới — tin đồn ở đây lan nhanh lắm.'), { emo: 'happy' });
    m.setAct('wave'); await wait(0.6); m.setAct(null);
    if (G.scene.kind === 'island') walk(m, 700, 2296, { speed: 70 }).then(() => releaseMeo('beach'));
    else m.walkTo([[G.scene.door.x, G.scene.h + 14]], { speed: 70 }).then(() => { placeMeo('island', 700, 2296); releaseMeo('beach'); });
    await wait(0.6);
  });
  G.runtime.inCutscene = false;
}

// ---------------------------------------------------------------- mornings: Chapter 3 begins (word is spreading)
export async function morningHooks() {
  const s = G.state;
  morningEvent();
  import('./seasonal.js').then(m => m.seasonalCheck());
  for (const rid of birthdaysToday()) toast({ text: T(`It's ${RESIDENTS[rid]?.name}'s birthday!`, `Hôm nay là sinh nhật ${RESIDENTS[rid]?.name}!`), sub: T(`They love ${(BIRTHDAYS[rid]?.likes || []).map(k => ingName(k)).join(' and ')} — chat → Give a gift.`, `Họ thích ${(BIRTHDAYS[rid]?.likes || []).map(k => ingName(k)).join(' và ')} — trò chuyện → Tặng quà.`), icon: 'heart', ms: 5200 });
  if (S().step === 'grow' && !flag('ch3intro')) await wordSpreadingIntro();
  else if (availableRecipes().length && !flag('recipeNote' + s.day)) { setFlag('recipeNote' + s.day); toast({ text: T('Mèo Mây has a new recipe!', 'Mèo Mây có công thức mới!'), sub: T('Visit Mèo Mây\'s house to learn it.', 'Ghé nhà Mèo Mây để học nhé.'), icon: 'notebook' }); }
}
async function wordSpreadingIntro() {
  setFlag('ch3intro');
  const m = G.meo, pl = G.player;
  // Mèo Mây is waiting outside the front door
  await cs.run('ch3', async () => {
    G.runtime.inCutscene = true;
    await wait(0.4);
    if (G.scene.id === 'house') {
      await say('meo', T(`(Knock knock!) ${s().player.name}! Are you up? Come outside!`, `(Cốc cốc!) ${s().player.name} ơi! Dậy chưa? Ra đây nè!`), {});
      await pl.walkTo([[135, 220]], { speed: 80 });
      await fadeOut(250);
      setScene('island', 1260, 1760, 'down');
      placeMeo('island', 1290, 1784); face(m, pl);
      await fadeIn(300);
    } else await summonMeo();
    face(pl, m);
    await camTo((m.x + pl.x) / 2, pl.y - 20, { zoom: 1.3 });
    await say('meo', T('Good morning! Guess what — people on the mainland are talking about a tiny tea stand with *very* good kumquat tea.', 'Chào buổi sáng! Đoán xem — người trong đất liền đang bàn tán về một quán nhỏ bán trà tắc *cực* ngon đó.'), { emo: 'happy' });
    await titleCard(3);
    await busyFerry();
    await camTo((m.x + pl.x) / 2, pl.y - 20, { zoom: 1.3 });
    await say('meo', T('More visitors are coming by ferry now. And they\'ll want something to wake them up…', 'Giờ khách đi tàu tới đông hơn rồi. Và họ sẽ muốn thứ gì đó cho tỉnh ngủ…'));
    await discoverRecipe('ca_phe_sua_da');
    await say('meo', T('Iced milk coffee! Condensed milk first, *then* coffee. Never the other way. That\'s the law.', 'Cà phê sữa đá! Sữa đặc trước, *rồi mới* tới cà phê. Không bao giờ ngược lại. Luật đó.'), { emo: 'happy', tilt: 0.15 });
    await say('meo', T('Serve lots of customers and grow your reputation. If the island starts believing in you, I have… another shed in mind.', 'Phục vụ thật nhiều khách để tăng danh tiếng nhé. Nếu cả đảo bắt đầu tin bạn, mình có… một căn chòi khác trong đầu.'));
    releaseMeo('plaza'); walk(m, 970, 1650, { speed: 70 });
    await wait(0.6);
  });
  G.runtime.inCutscene = false;
  setStep('grow');
}
const s = () => G.state;
async function introShed2() {
  const m = G.meo, pl = G.player;
  await cs.run('shed2', async () => {
    G.runtime.inCutscene = true;
    if (G.scene.id !== 'island') {
      await say('meo', T('(Mèo Mây\'s voice outside) Pssst! Come out here, I want to show you something!', '(Tiếng Mèo Mây bên ngoài) Suỵt! Ra đây, mình muốn cho bạn xem cái này!'), {});
      await fadeOut(250); const t = island().triggers.find(t => t.kind === 'door' && t.building === G.scene.building); setScene('island', t.doorX, t.doorY + 16, 'down'); await fadeIn(300);
    }
    await summonMeo();
    await say('meo', T('The whole island is talking about you! Bà Tư even put on her good shoes to visit your stand.', 'Cả đảo đang nói về bạn đó! Bà Tư còn mang đôi dép đẹp nhất để tới quán bạn.'), { emo: 'happy' });
    await say('meo', T('Follow me — there\'s another shed in West Village. It used to sell the best bánh mì on the island.', 'Theo mình — có một căn chòi khác ở Xóm Tây. Ngày xưa nó bán bánh mì ngon nhất đảo.'));
    startFollow(m, 30); camFollow(pl, 1.05);
    await walk(m, 540, 1612, { speed: 82 });
    stopFollow(); await pl.walkTo([[512, 1618]], { speed: 60 });
    face(m, { x: 560, y: 1520 }); face(pl, { x: 560, y: 1520 });
    await camTo(560, 1530, { zoom: 1.3 });
    await say('meo', T('This was the Lâm family\'s shed. Mr Lâm baked the bread at four every morning; you could smell it from the ferry.', 'Đây là quán của nhà họ Lâm. Chú Lâm nướng bánh lúc bốn giờ sáng mỗi ngày; đứng trên tàu cũng ngửi thấy.'), { tilt: 0.1 });
    await say('meo', T('When the ferry cut its route, their kids went to work on the mainland, and the Lâms followed. Mrs Lâm gave me the key and said “someone has to stay”.', 'Khi hãng tàu cắt tuyến, con cái họ ra đất liền làm việc, rồi hai vợ chồng cũng đi theo. Cô Lâm đưa mình chìa khóa và nói “phải có ai đó ở lại”.'));
    await say('meo', T('Ta-da. It\'s even more broken than the first one! Isn\'t that exciting?', 'Tèn ten. Nó còn hư hơn căn đầu tiên! Hào hứng ghê chưa?'), { emo: 'happy', tilt: 0.2 });
    await say('meo', T('Repair it and I\'ll teach you bánh mì. Two shops means twice the running around — but I think you can handle it.', 'Sửa nó đi rồi mình dạy bạn làm bánh mì. Hai quán là chạy gấp đôi — nhưng mình nghĩ bạn làm được.'));
    await say('meo', T(`Oh, one tiny thing. The owner left the key with me. It costs ${GATES.shed2.cost}k. A cat has expenses. Fish is expensive. And you need to be level ${GATES.shed2.level} first — I only sell keys to serious shopkeepers.`, `À, một chuyện nhỏ xíu. Chủ quán gửi chìa khóa cho mình. Giá ${GATES.shed2.cost}k. Mèo cũng phải chi tiêu chứ. Cá đắt lắm. Và bạn phải đạt cấp ${GATES.shed2.level} trước — mình chỉ bán chìa cho chủ quán nghiêm túc thôi.`), { emo: 'happy', tilt: 0.2 });
    releaseMeo('plaza');
  });
  G.runtime.inCutscene = false;
}
async function afterShed2() {
  await cs.run('shed2done', async () => {
    G.runtime.inCutscene = true;
    await summonMeo();
    await say('meo', T('Crackly bread, a little pâté, grilled pork, pickles, cucumber, cilantro. Say it with me!', 'Bánh giòn, chút pa tê, thịt nướng, đồ chua, dưa leo, ngò. Đọc theo mình nào!'), { emo: 'happy' });
    await discoverRecipe('banh_mi_thit');
    await say('meo', T('The grill is inside. Prep the bread and pork before you open.', 'Bếp nướng ở bên trong. Nhớ sơ chế bánh và thịt trước khi mở cửa.'));
    releaseMeo('plaza');
  });
  G.runtime.inCutscene = false;
  bizOf('shed2').special = 'banh_mi_thit';
}

// ---------------------------------------------------------------- Chapter 5: your first helper
async function firstHelper() {
  const k = keeperOf('shed1'); if (!k) return;
  await cs.run('firstHelper', async () => {
    G.runtime.inCutscene = true;
    const bld = B('shed1'), pl = G.player;
    if (G.scene.id !== 'island') { await fadeOut(300); setScene('island', bld.x - 40, bld.y + 40, 'up'); await fadeIn(300); }
    else if (dist(pl.x, pl.y, bld.x, bld.y) > 260) { await fadeOut(300); pl.x = bld.x - 40; pl.y = bld.y + 40; pl.face('up'); await fadeIn(300); }
    await summonMeo();
    const a = keeperActor('shed1'), m = G.meo;
    await camTo(bld.x + 20, bld.y - 10, { zoom: 1.3, rate: 2.2 });
    if (a) { a.visible = true; a.face('down'); a.setAct('wave'); a.showEmote('happy', 1.6); a.doHop(70); }
    sfx('success');
    await say(a || null, T(`Hello! I'm ${k.name}. I'll open the drink stand, slice the kumquats and serve whoever comes by — you go look after the bánh mì!`, `Chào {you}! {Me} là ${k.name}. {Me} sẽ mở quán nước, cắt tắc và bán cho khách — {you} cứ lo quán bánh mì nha!`), { emo: 'happy' });
    if (a) a.setAct(null);
    face(m, pl); face(pl, m);
    await camTo((m.x + pl.x) / 2, pl.y - 20, { zoom: 1.3 });
    await say('meo', T('Your first helper! A shop that opens even when you\'re somewhere else… that\'s how an island starts to breathe again.', 'Người phụ giúp đầu tiên của bạn! Một quán tự mở cửa khi bạn ở chỗ khác… đó là lúc hòn đảo bắt đầu thở lại.'), { emo: 'happy' });
    await say('meo', T('Keep the pantry stocked and they\'ll do the rest. Shopkeepers are paid a wage every day — check it in Menu → Business.', 'Giữ kho đủ hàng là họ lo phần còn lại. Người trông quán được trả lương mỗi ngày — xem ở Menu → Kinh doanh.'));
    unlockAchievement('first_keeper'); addXP(80, 'helper');
    await showReward({ icon: 'person', kicker: T('Chapter 5 milestone', 'Cột mốc Chương 5'), title: T('A Helping Hand', 'Có người phụ giúp'), text: T(`${k.name} now runs the drink stand during opening hours. +80 XP`, `${k.name} giờ trông quán nước trong giờ mở cửa. +80 KN`) });
    releaseMeo('plaza');
  });
  G.runtime.inCutscene = false;
}

// ---------------------------------------------------------------- Chapter 7: the food truck
async function truckIntro() {
  await cs.run('ch4', async () => {
    G.runtime.inCutscene = true;
    await summonMeo();
    const m = G.meo;
    await say('meo', T('You\'ve been running back and forth all day! Your legs must be tired. Mine are, and I just watched.', 'Bạn chạy tới chạy lui cả ngày! Chân chắc mỏi lắm. Chân mình cũng mỏi, mà mình chỉ ngồi xem thôi.'), { emo: 'sad', tilt: 0.15 });
    await titleCard(7);
    await say('meo', T('Your shopkeeper is doing great, and the deliveries arrive every morning. You\'re a real business now!', 'Người trông quán làm tốt lắm, hàng thì sáng nào cũng tới. Giờ bạn là chủ doanh nghiệp thật sự rồi!'), {});
    await say('meo', T('Every little shop can have a shopkeeper — and one day, a whole restaurant with a team of employees. But first…', 'Quán nhỏ nào cũng có thể có người trông — và một ngày, cả một nhà hàng với đội nhân viên. Nhưng trước tiên…'), {});
    await say('meo', T('For now — there\'s an old food truck on the east beach. Chú Hải wants to sell it. Rolls on wheels! Think of the possibilities!', 'Còn bây giờ — có một chiếc xe bán đồ ăn cũ ở bãi biển phía đông. Chú Hải muốn bán. Gỏi cuốn trên bánh xe! Nghĩ mà xem!'), { emo: 'happy' });
    releaseMeo('beach');
  });
  G.runtime.inCutscene = false;
}
async function afterTruck() {
  await cs.run('truckdone', async () => {
    G.runtime.inCutscene = true;
    await summonMeo();
    await say('meo', T('Beep beep! It\'s yours! Chú Hải cried a little. Happy tears. Mostly.', 'Bíp bíp! Của bạn rồi! Chú Hải khóc một chút. Nước mắt hạnh phúc. Chắc vậy.'), { emo: 'happy' });
    await discoverRecipe('goi_cuon');
    await say('meo', T('Spring rolls: rice paper, noodles, herbs, shrimp — then roll it up nice and snug, like a cat in a blanket.', 'Gỏi cuốn: bánh tráng, bún, rau thơm, tôm — rồi cuốn thật chặt, như mèo cuộn trong chăn.'), { tilt: 0.15 });
    releaseMeo('beach');
  });
  G.runtime.inCutscene = false;
  bizOf('truck').special = 'goi_cuon';
}

// ---------------------------------------------------------------- Chapter 8: the Night Market
async function nightMarketIntro() {
  const m = G.meo, pl = G.player;
  await cs.run('ch5', async () => {
    G.runtime.inCutscene = true;
    if (G.scene.id !== 'island') { await fadeOut(250); const t = island().triggers.find(t => t.kind === 'door' && t.building === G.scene.building); setScene('island', t.doorX, t.doorY + 16, 'down'); await fadeIn(300); }
    await summonMeo();
    await say('meo', T(`${G.state.player.name}… can I show you a place that's very important to me?`, `${G.state.player.name}… mình dẫn bạn tới một nơi rất quan trọng với mình được không?`), {});
    await titleCard(8);
    startFollow(m, 30); camFollow(pl, 1);
    await walk(m, 452, 900, { speed: 86 });
    await walk(m, 440, 790, { speed: 70 });
    stopFollow(); await pl.walkTo([[416, 800]], { speed: 60 });
    face(m, { x: 430, y: 600 }); face(pl, { x: 430, y: 600 });
    setMood('night');
    await camTo(430, 660, { zoom: 0.95, rate: 1.6, hold: 0.6 });
    await say('meo', T('This was the Night Market. Every evening, the whole island came here. Lanterns everywhere. Music. Grilled rice paper…', 'Đây từng là Chợ Đêm. Tối nào cả đảo cũng tới đây. Lồng đèn khắp nơi. Tiếng nhạc. Bánh tráng nướng…'), { emo: 'sad' });
    // Bà Sáu shuffles in
    const ba = new Actor({ kind: 'human', look: MERCHANTS.ba_sau.look, name: 'Bà Sáu', x: 300, y: 700, speed: 38 });
    island().add(ba); G.runtime.baSau = ba;
    await ba.walkTo([[360, 760], [392, 790]]);
    face(ba, pl); face(pl, ba); face(m, ba);
    await say(ba, T('Mèo Mây? Is this the young one everyone talks about? The one with the tea?', 'Mèo Mây đó hả? Đây là đứa nhỏ mà ai cũng nhắc tới? Đứa bán trà đó?'), {});
    await say(ba, T('My mother made these lanterns. When the visitors stopped coming, we stopped lighting them. It felt silly to light lanterns for nobody.', 'Mẹ bà làm những chiếc lồng đèn này. Khi khách không tới nữa, tụi bà cũng thôi thắp. Thắp đèn cho chẳng ai xem thì buồn lắm.'), { emo: 'sad' });
    face(m, pl);
    await say('meo', T('But people *are* coming back now. Because of you!', 'Nhưng giờ mọi người *đang* quay lại rồi. Nhờ bạn đó!'), { emo: 'happy' });
    await say(ba, T('Then let\'s light them again. Bring wood, metal, paint, new silk lanterns and light strings — Chú Bảy has them now. And a little money for the vendors.', 'Vậy thì mình thắp lại thôi. Mang gỗ, tôn, sơn, lồng đèn lụa mới và dây đèn — Chú Bảy giờ có bán. Thêm chút tiền cho các sạp nữa.'), {});
    await say('meo', T('I\'ll help! I\'m excellent at holding one end of things.', 'Mình phụ! Mình giỏi nhất khoản giữ một đầu đồ đạc.'), { emo: 'happy', tilt: 0.2 });
    releaseMeo('nightmarket');
    ba.walkTo([[340, 620]]).then(() => ba.face('down'));
  });
  G.runtime.inCutscene = false;
  setMood(G.state.time >= 18.5 * 60 ? 'night' : 'day');
  setStep('restoreNM');
}
export async function restoreNightMarket() {
  const r = NIGHT_MARKET_RESTORE, m = G.meo, pl = G.player;
  await cs.run('nm', async () => {
    G.runtime.inCutscene = true;
    addMoney(-r.cost, 'restore'); spendMats(r.mats);
    if (G.state.time < 19 * 60 + 30) {
      await fadeOut(900, true);
      caption(T('That evening…', 'Tối hôm đó…'));
      G.state.time = 19 * 60 + 40;
      pl.x = 430; pl.y = 800; pl.face('up');
      await wait(1.8); caption(null);
      await fadeIn(900);
    }
    setMood('night');
    const rtm = (G.runtime.nm = { restoreAnim: 0 });
    placeMeo('island', 456, 806); face(m, { x: 430, y: 600 });
    const ba = G.runtime.baSau || new Actor({ kind: 'human', look: MERCHANTS.ba_sau.look, name: 'Bà Sáu', x: 404, y: 812 });
    if (!island().actors.includes(ba)) island().add(ba);
    ba.x = 404; ba.y = 814; face(ba, { x: 430, y: 600 });
    await camTo(430, 700, { zoom: 0.9, rate: 1.4, hold: 0.4 });
    await say(ba, T('Ready? On three. One… two… three!', 'Sẵn sàng chưa? Đếm nhé. Một… hai… ba!'), {});
    sfx('bell');
    // lanterns and stalls come alive one after another
    const t0 = performance.now();
    while (true) {
      const k = (performance.now() - t0) / 5200;
      if (k >= 1) break;
      rtm.restoreAnim = k;
      if (Math.random() < 0.18) { const st = choice(['nm1', 'nm2', 'nm3', 'night', 'nm5', 'nm6']); const b = B(st); fx.burst('spark', b.x + rand(-30, 30), b.y - rand(40, 70), 3, { up: 30, col: '#ffd35a' }); sfx('sparkle'); }
      cam.override.y = 700 - Math.sin(k * Math.PI) * 60;
      await sleep(30);
    }
    rtm.restoreAnim = 1;
    G.state.nightMarket.restored = true; bizOf('night').owned = true; bizOf('night').unlocked = true; bizOf('night').repair = 1;
    markDirty(true);
    fx.burst('confetti', 430, 640, 50, { up: 140, speed: 110, col: ['#f08ca0', '#ffd35a', '#e8584e', '#fff'], g: 60, life: 2 });
    sfx('fanfare');
    // a crowd drifts in across the bridge
    for (let i = 0; i < 10; i++) setTimeout(() => npcs.spawnVisitorAt?.(454, 960, 'nightmarket'), i * 350);
    await wait(1.6);
    m.setEmo('happy', 3); await hop(m, 2);
    await camTo(430, 760, { zoom: 1.2, rate: 2 });
    await say(ba, T('Look at that… It\'s just like when I was a girl.', 'Nhìn kìa… Y như hồi bà còn con gái.'), { emo: 'happy' });
    await say('meo', T('The Night Market is open! And one of these stalls is *yours*, partner.', 'Chợ Đêm mở cửa rồi! Và một trong những sạp này là *của bạn* đó, cộng sự.'), { emo: 'happy' });
    await discoverRecipe('banh_trang_nuong');
    await discoverRecipe('che_ba_mau');
    await say('meo', T('Your stall opens from 17:00 to 23:00. Grilled rice paper and sweet chè — the two best smells in Việt Nam.', 'Sạp của bạn mở từ 17:00 tới 23:00. Bánh tráng nướng và chè — hai mùi thơm nhất Việt Nam.'));
    unlockAchievement('night_market');
    releaseMeo('nightmarket');
    ba.walkTo([[340, 610]]).then(() => ba.face('down'));
  });
  G.runtime.inCutscene = false;
  bizOf('night').special = 'banh_trang_nuong';
  G.runtime.nm = null;
  checkStory();
}

// ---------------------------------------------------------------- Chapter 10: the restaurant
async function restaurantIntro() {
  const m = G.meo, pl = G.player;
  await cs.run('ch6', async () => {
    G.runtime.inCutscene = true;
    if (G.scene.id !== 'island') { await fadeOut(250); setScene('island', 520, 760, 'down'); await fadeIn(300); }
    await summonMeo();
    await say('meo', T('Remember what I said about restaurants? Come with me, up the hill.', 'Nhớ mình nói gì về nhà hàng không? Đi với mình lên đồi nào.'), {});
    await titleCard(10);
    startFollow(m, 30); camFollow(pl, 1);
    await walk(m, 1180, 790, { speed: 90 });
    stopFollow(); await pl.walkTo([[1150, 800]], { speed: 60 });
    face(m, { x: 1200, y: 680 }); face(pl, { x: 1200, y: 680 });
    await camTo(1200, 680, { zoom: 0.95, rate: 1.8, hold: 0.4 });
    await say('meo', T('The old restaurant. It cooked for every wedding on the island. The kitchen still smells a little of star anise.', 'Nhà hàng cũ. Đám cưới nào trên đảo cũng đặt ở đây. Nhà bếp vẫn còn thoang thoảng mùi hoa hồi.'), {});
    m.tiltTarget = 0.2;
    await say('meo', T('It\'s for sale. And it\'s big enough for a *team*. You could hire cooks and servers, and it would keep running even while you\'re at your other shops!', 'Nó đang được rao bán. Và đủ rộng cho cả một *đội*. Bạn có thể thuê đầu bếp, phục vụ, và nó vẫn chạy ngay cả khi bạn ở quán khác!'), { emo: 'happy' });
    m.tiltTarget = 0;
    await say('meo', T('It\'ll cost a lot. And it needs a *lot* of fixing. But… I have a feeling.', 'Sẽ tốn nhiều tiền lắm. Và cần sửa *rất* nhiều. Nhưng… mình có linh cảm.'), { tilt: 0.15 });
    releaseMeo('plaza');
  });
  G.runtime.inCutscene = false;
  setStep('buyResto');
}
async function grandOpening() {
  const m = G.meo, pl = G.player, bld = B('restaurant');
  await cs.run('grand', async () => {
    G.runtime.inCutscene = true;
    placeMeo('island', bld.x + 30, bld.y + 34);
    for (const [rid, dx] of [['ba_tu', -60], ['linh', -30], ['chu_hai', 60], ['be_na', 90]]) { const a = npcs.byId(rid); if (a) { a.data.state = 'busy'; a.stop(); a.visible = true; a.x = bld.x + dx; a.y = bld.y + 56; a.face('up'); } }
    pl.x = bld.x; pl.y = bld.y + 34; pl.face('up');
    await camTo(bld.x, bld.y - 30, { zoom: 0.95, rate: 2 });
    caption(T('Grand opening!', 'Khai trương!'));
    sfx('fanfare');
    fx.burst('confetti', bld.x, bld.y - 80, 60, { up: 150, speed: 120, col: ['#f08ca0', '#ffd35a', '#e8584e', '#9fd8c8', '#fff'], g: 60, life: 2.2 });
    for (const a of npcs.residents) if (a.data.state === 'busy') { a.setAct('cheer'); a.setEmo('happy', 3); }
    await wait(2.2); caption(null);
    for (const a of npcs.residents) if (a.data.state === 'busy') { a.setAct(null); npcs.returnResident(a); }
    face(m, pl); face(pl, m);
    await say('meo', T(`${G.state.island.name} Restaurant! Say it slowly. Doesn't it sound delicious?`, `Nhà Hàng ${G.state.island.name}! Đọc chậm thôi. Nghe ngon không?`), { emo: 'happy' });
    await discoverRecipe('pho_bo');
    await discoverRecipe('com_tam');
    await say('meo', T('Inside there\'s a *Staff* board by the break corner. Hire people, give them roles, and watch them work. They each have their own quirks!', 'Bên trong có bảng *Nhân viên* ở góc nghỉ. Thuê người, giao việc, rồi xem họ làm. Mỗi người một tính!'));
    await say('meo', T('A cook and a server is the start of a real team. Then it can run while you\'re away.', 'Một đầu bếp và một phục vụ là khởi đầu của một đội thật sự. Rồi nhà hàng sẽ tự chạy khi bạn vắng mặt.'), { emo: 'happy' });
    unlockAchievement('restaurant');
    releaseMeo('plaza');
  });
  G.runtime.inCutscene = false;
  bizOf('restaurant').special = 'pho_bo';
}

// ---------------------------------------------------------------- Chapter 11: a destination (the founder statue)
async function destinationIntro() {
  await cs.run('ch7', async () => {
    G.runtime.inCutscene = true;
    await summonMeo();
    await say('meo', T('Do you hear that? That\'s the sound of a ferry that\'s *full*. People come from the mainland just for your island now.', 'Nghe không? Đó là tiếng một chuyến tàu *chật kín*. Giờ người ta từ đất liền tới chỉ để thăm đảo của bạn.'), { emo: 'happy' });
    await titleCard(11);
    await say('meo', T('I\'ve been thinking. The fountain in the plaza has an empty pedestal. Every island needs a founder… and ours washed up with too much luggage.', 'Mình nghĩ nè. Đài phun nước ở quảng trường có một cái bệ trống. Đảo nào cũng cần người sáng lập… và người của đảo mình thì tới với quá trời hành lý.'), { tilt: 0.2 });
    await say('meo', T('Make the island a real destination — lots of reputation, one shop fully upgraded — and let\'s put *you* up there.', 'Biến đảo thành điểm đến thật sự — thật nhiều danh tiếng, một quán nâng cấp tối đa — rồi mình đặt *bạn* lên đó.'), { emo: 'happy' });
    releaseMeo('plaza');
  });
  G.runtime.inCutscene = false;
}
export function statueReady() { return G.state.reputation >= 400 && Object.values(G.state.biz).some(b => b.level >= 3); }
export async function buildStatue() {
  const c = STATUE_COST;
  await cs.run('statue', async () => {
    G.runtime.inCutscene = true;
    addMoney(-c.cost, 'statue'); spendMats(c.mats);
    await fadeOut(900, true);
    caption(T('That night, the whole island gathered…', 'Đêm hôm ấy, cả đảo tụ họp…'));
    G.state.time = Math.max(G.state.time, 20 * 60);
    setMood('night');
    const pl = G.player, m = G.meo;
    pl.x = 900; pl.y = 1660; pl.face('up');
    placeMeo('island', 930, 1664);
    for (const [i, a] of npcs.residents.entries()) { a.data.state = 'busy'; a.stop(); a.visible = true; a.sit = false; a.x = 820 + (i % 4) * 50; a.y = 1680 + Math.floor(i / 4) * 24; a.face('up'); }
    await wait(1.8); caption(null);
    await fadeIn(900);
    await camTo(900, 1500, { zoom: 1, rate: 1.5, hold: 0.4 });
    G.state.statue = true; markDirty(true);
    sfx('fanfare');
    for (let i = 0; i < 10; i++) { setTimeout(() => { const x = 900 + rand(-140, 140), y = 1560 + rand(-30, 30); fx.burst('spark', x, y, 28, { up: 30, g: 18, speed: 150, col: choice(['#ffd35a', '#f08ca0', '#9fd8c8', '#fff', '#ff9a4a']), life: 1.5, z: 170 + rand(0, 60), jitter: 4 }); sfx('pop'); }, i * 380); }
    for (const a of npcs.residents) { a.setAct('cheer'); a.setEmo('happy', 5); }
    await wait(3.5);
    for (const a of npcs.residents) { a.setAct(null); npcs.returnResident(a); }
    face(m, pl); face(pl, m);
    await camTo((m.x + pl.x) / 2, pl.y - 20, { zoom: 1.3 });
    await say('meo', T(`You know… I've been waiting a long time for someone who would stay.`, `Bạn biết không… mình đã đợi rất lâu một người chịu ở lại.`), { tilt: 0.12 });
    await say('meo', T('Someone who\'d see a broken shed and think “hmm, 12 pieces of wood”.', 'Một người nhìn căn chòi hư mà nghĩ “hừm, 12 tấm gỗ”.'), { emo: 'happy', tilt: 0.2 });
    await say('meo', T(`Thank you, ${G.state.player.name}. ${G.state.island.name} is home again.`, `Cảm ơn bạn, ${G.state.player.name}. ${G.state.island.name} lại là nhà rồi.`), { emo: 'love' });
    await hop(m, 3);
    unlockAchievement('statue');
    await say('meo', T('Now! Tomorrow is a new day, and there are still recipes in my notebook. Shall we keep going?', 'Giờ thì! Mai là ngày mới, và sổ tay của mình vẫn còn công thức. Mình tiếp tục nhé?'), { emo: 'happy' });
    releaseMeo('plaza');
  });
  G.runtime.inCutscene = false;
  checkStory();
}
async function finale() { /* the statue scene itself is the finale */ }

// ---------------------------------------------------------------- Chapter 14: the Long Bridge
async function longBridgeIntro() {
  await cs.run('ch8', async () => {
    G.runtime.inCutscene = true;
    if (G.scene.id !== 'island') { await fadeOut(250); const t = island().triggers.find(t => t.kind === 'door' && t.building === G.scene.building); setScene('island', t ? t.doorX : 900, t ? t.doorY + 16 : 1700, 'down'); await fadeIn(300); }
    await summonMeo();
    const m = G.meo, pl = G.player;
    await say('meo', T('Look at you — a true island business owner. I have a secret to show you. A BIG one. Bigger than my appetite.', 'Nhìn bạn kìa — chủ quán thứ thiệt rồi. Mình có một bí mật muốn cho bạn xem. Bí mật LỚN. Còn lớn hơn cái bụng mình.'), { emo: 'happy' });
    await titleCard(14);
    startFollow(m, 30); camFollow(pl, 1);
    await walk(m, 1680, 1545, { speed: 90 });
    stopFollow(); await pl.walkTo([[1650, 1552]], { speed: 60 });
    face(m, { x: 2200, y: 1500 }); face(pl, { x: 2200, y: 1500 });
    await camTo(1860, 1500, { zoom: 0.9, rate: 1.6, hold: 0.6 });
    await say('meo', T('Out there is Firefly Islet. When I was a kitten, the whole island walked across this bridge to watch the fireflies.', 'Ngoài kia là Cù Lao Đom Đóm. Hồi mình còn là mèo con, cả đảo đi qua cây cầu này để ngắm đom đóm.'), { tilt: 0.15 });
    await say('meo', T('Then a storm took the middle of the bridge. Now it\'s just me, looking. And sometimes a very confused seagull.', 'Rồi một cơn bão cuốn mất khúc giữa cây cầu. Giờ chỉ còn mình ngồi nhìn. Và thỉnh thoảng một con hải âu rất bối rối.'), { emo: 'sad' });
    await say('meo', T(`Chú Bảy says it needs ${BRIDGE_REPAIR.mats.wood} wood, ${BRIDGE_REPAIR.mats.metal} metal, ${BRIDGE_REPAIR.mats.paint} paint and ${money(BRIDGE_REPAIR.cost)} for the builders. Think we can?`, `Chú Bảy nói cần ${BRIDGE_REPAIR.mats.wood} gỗ, ${BRIDGE_REPAIR.mats.metal} tôn, ${BRIDGE_REPAIR.mats.paint} sơn và ${money(BRIDGE_REPAIR.cost)} tiền công thợ. Mình làm được không?`), { emo: 'happy' });
    releaseMeo('plaza');
  });
  G.runtime.inCutscene = false;
}
export async function repairBridge() {
  await cs.run('bridge', async () => {
    G.runtime.inCutscene = true;
    addMoney(-BRIDGE_REPAIR.cost, 'repair'); spendMats(BRIDGE_REPAIR.mats);
    const pl = G.player;
    await camTo(1820, 1510, { zoom: 1, rate: 2 });
    pl.setAct('hammer');
    for (let i = 0; i < 14; i++) { sfx('hammer'); cam.shake = 0.2; fx.burst('dust', 1760 + i * 9, 1500 + rand(0, 36), 4, { up: 20, speed: 40 }); fx.burst('chip', 1760 + i * 9, 1510, 2, { up: 60, speed: 50, col: ['#c88a52', '#d9a064'], size: 3 }); await wait(0.22); }
    pl.setAct(null);
    setFlag('bridgeFixed'); addXP(200, 'bridge');
    island().cache.map.clear();
    fx.burst('confetti', 1820, 1500, 40, { up: 110, speed: 100, col: ['#f08ca0', '#ffd35a', '#9fd8c8', '#fff'], g: 70, life: 1.8 });
    sfx('fanfare'); pl.doHop(); pl.setEmo('happy', 2);
    await wait(1.4);
    npcs.spawnIsletResidents?.();
  });
  G.runtime.inCutscene = false;
  checkStory();
}
async function bridgeOpened() {
  toast({ text: T('The Long Bridge is open!', 'Cây Cầu Dài đã thông!'), sub: T('Firefly Islet awaits.', 'Cù Lao Đom Đóm đang chờ bạn.'), icon: 'star', ms: 3600 });
}
async function meetVy() {
  const vy = npcs.residents.find(a => a.data.rid === 'vy');
  await cs.run('vy', async () => {
    G.runtime.inCutscene = true;
    const pl = G.player;
    if (vy) { vy.stop(); vy.x = 2380; vy.y = 1700; vy.visible = true; face(vy, pl); face(pl, vy); }
    await camTo(2360, 1680, { zoom: 1.3 });
    await say(vy || null, T('Oh! A visitor! Nobody has crossed that bridge in years. Hi — I\'m Vy. I paint.', 'Ơ! Có khách! Mấy năm rồi chẳng ai qua được cây cầu đó. Chào bạn — mình là Vy. Mình vẽ tranh.'), { emo: 'happy' });
    await say(vy || null, T('I came here for the fireflies and stayed for the quiet. But I want to paint the whole island before the festival. Will you show me its best views?', 'Mình tới đây vì đom đóm rồi ở lại vì sự yên tĩnh. Nhưng mình muốn vẽ cả hòn đảo trước lễ hội. Bạn chỉ mình những cảnh đẹp nhất nha?'));
    await say(vy || null, T('The lookout tower, the firefly banyan… and the old lighthouse up north. Go stand at each one for me!', 'Tháp canh, cây đa đom đóm… và ngọn hải đăng cũ ở phía bắc. Bạn tới đứng ở từng chỗ giúp mình nhé!'), { emo: 'happy' });
    setFlag('metVy');
    if (vy) npcs.returnResident(vy);
  });
  G.runtime.inCutscene = false;
}

// ---------------------------------------------------------------- Chapter 16: the Lantern Festival
async function festivalIntro() {
  await cs.run('ch9', async () => {
    G.runtime.inCutscene = true;
    await summonMeo();
    await say('meo', T('Vy finished her painting! She hung it in the plaza and now EVERYONE wants a festival. A real Lantern Festival, like the old days.', 'Vy vẽ xong tranh rồi! Cô ấy treo ở quảng trường và giờ AI CŨNG muốn có lễ hội. Một Lễ Hội Đèn Lồng thật sự, như ngày xưa.'), { emo: 'happy' });
    await titleCard(16);
    const F = FESTIVAL_REQ;
    await say('meo', T(`We need ${F.lanterns} silk lanterns, a famous shop owner — island level ${F.level} at least — and one really busy day: ${F.served} happy customers. Then, fireworks!`, `Mình cần ${F.lanterns} chiếc lồng đèn lụa, một chủ quán nổi tiếng — đảo ít nhất cấp ${F.level} — và một ngày thật đông: ${F.served} vị khách vui vẻ. Rồi thì, pháo hoa!`), { tilt: 0.15 });
    releaseMeo('plaza');
  });
  G.runtime.inCutscene = false;
}
async function festivalNight() {
  await cs.run('festival', async () => {
    G.runtime.inCutscene = true;
    await fadeOut(900, true);
    caption(T('On the night of the full moon…', 'Vào đêm trăng rằm…'));
    G.state.time = Math.max(G.state.time, 20 * 60); setMood('night');
    spendMats({ lantern: FESTIVAL_REQ.lanterns });
    const pl = G.player, m = G.meo;
    setScene('island', 900, 1660, 'up'); pl.face('up');
    placeMeo('island', 930, 1664);
    for (const [i, a] of npcs.residents.entries()) { a.data.state = 'busy'; a.stop(); a.visible = true; a.x = 800 + (i % 5) * 50; a.y = 1470 + Math.floor(i / 5) * 190; a.face(i < 5 ? 'down' : 'up'); }
    await wait(1.6); caption(null);
    await fadeIn(900);
    await camTo(900, 1540, { zoom: 0.95, rate: 1.4, hold: 0.3 });
    setFlag('festival'); G.state.story.flags.lanterns = true;
    for (let i = 0; i < 16; i++) setTimeout(() => { const x = 900 + rand(-220, 220), y = 1480 + rand(-60, 40); fx.burst('spark', x, y, 34, { up: 30, g: 18, speed: 170, col: choice(['#ffd35a', '#f08ca0', '#9fd8c8', '#fff', '#ff9a4a', '#c9b6e8']), life: 1.6, z: 190 + rand(0, 80), jitter: 4 }); sfx('pop'); }, i * 320);
    for (const a of npcs.residents) { a.setAct('cheer'); a.setEmo('happy', 6); }
    await wait(4.2);
    for (const a of npcs.residents) { a.setAct(null); }
    face(m, pl); face(pl, m);
    await say('meo', T('Look at all the lanterns… it\'s just like I remember. No — it\'s better. Because you\'re here.', 'Nhìn những chiếc lồng đèn kìa… y như mình còn nhớ. Không — còn đẹp hơn. Vì có bạn ở đây.'), { emo: 'love', tilt: 0.15 });
    addMoney(500, 'festival'); addXP(300, 'festival');
    unlockAchievement('lantern_festival');
    await showReward({ icon: 'lantern', kicker: T('Festival gift', 'Quà lễ hội'), title: '+500k · +300 XP', text: T('The island chipped in to thank you.', 'Cả đảo góp quà cảm ơn bạn.') });
    for (const a of npcs.residents) npcs.returnResident(a);
    releaseMeo('plaza');
  });
  G.runtime.inCutscene = false;
  checkStory();
}

// ---------------------------------------------------------------- Chapter 20: Keeper of the Island
async function keeperCeremony() {
  await cs.run('keeper', async () => {
    G.runtime.inCutscene = true;
    // (the Chapter 20 title card already played when the chapter began)
    await summonMeo();
    const m = G.meo, pl = G.player, nReg = regularsCount();
    await say('meo', T(`${G.state.player.name}. Every shop is open. ${nReg} regulars know your name. The bridges are fixed and the lanterns are lit.`, `${G.state.player.name}. Mọi quán đều mở cửa. ${nReg} khách quen biết tên bạn. Những cây cầu đã sửa và lồng đèn đã sáng.`), { tilt: 0.12 });
    await say('meo', T('By the ancient law of cats — which I just made up — I name you Keeper of the Island!', 'Theo luật cổ của loài mèo — mà mình vừa mới nghĩ ra — mình phong bạn là Người Giữ Đảo!'), { emo: 'happy' });
    setFlag('keeper'); S().flags.keeperDay = G.state.day; sfx('fanfare'); addXP(500, 'keeper'); addMoney(2000, 'keeper'); unlockAchievement('keeper_island');
    fx.burst('confetti', pl.x, pl.y - 40, 50, { up: 120, speed: 110, col: ['#f08ca0', '#ffd35a', '#9fd8c8', '#fff'], g: 70, life: 2 });
    await hop(m, 3);
    await showReward({ icon: 'trophy', kicker: T('The end… of the beginning', 'Kết thúc… của sự khởi đầu'), title: T('Keeper of the Island', 'Người Giữ Đảo'), text: T('+2,000k · +500 XP. The island will keep growing with you — levels have no cap!', '+2.000k · +500 KN. Hòn đảo sẽ tiếp tục lớn lên cùng bạn — cấp độ không giới hạn!') });
    await epilogue();
    face(m, pl); face(pl, m); await camTo((m.x + pl.x) / 2, pl.y - 20, { zoom: 1.3 });
    await say('meo', T('Now… about my salary as Chief Cat Officer. Let\'s say… one fish a day?', 'Giờ thì… về lương của mình, Giám Đốc Mèo. Mỗi ngày một con cá nhé?'), { emo: 'happy', tilt: 0.2 });
    await say('meo', T('Oh — and Doctor An says there\'s a lot of mail for me lately. Letters from the mainland. Come and find me when you have a moment.', 'À — Bác sĩ An nói dạo này có nhiều thư cho mình lắm. Thư từ đất liền. Rảnh thì ghé tìm mình nha.'), { tilt: 0.12 });
    releaseMeo('plaza');
  });
  G.runtime.inCutscene = false;
}

// ---------------------------------------------------------------- Chapter 3: the ferry is full again
async function busyFerry() {
  const isl = island();
  G.runtime.boatBoost = 120;
  await camTo(900, 2470, { zoom: 1.1, rate: 2 });
  caption(T('The morning ferry — fuller than it has been in years…', 'Chuyến tàu sáng — đông khách nhất trong nhiều năm…'));
  sfx('bell');
  const vs = [];
  for (let i = 0; i < 7; i++) { const v = npcs.spawnVisitorAt?.(880 + (i % 3) * 18, 2560 - Math.floor(i / 3) * 10, 'beach'); if (v) vs.push(v); await wait(0.22); }
  await wait(1.2); caption(null);
  // a visitor asks a neighbour the way
  const bt = npcs.byId('ba_tu'), v0 = vs[0];
  if (bt && v0) {
    bt.stop?.(); bt.sit = false; bt.data.state = 'busy'; bt.visible = true; bt.x = 930; bt.y = 2380;
    v0.stop?.(); v0.x = 962; v0.y = 2384; face(v0, bt); face(bt, v0);
    await camTo(946, 2360, { zoom: 1.4, rate: 2 });
    await say(v0, T('Excuse me — where\'s the kumquat tea everyone keeps talking about?', 'Cho hỏi — quán trà tắc mà ai cũng nhắc ở đâu vậy ạ?'));
    bt.setAct('wave'); await say(bt, T('Along the beach, dear. Just follow the line!', 'Dọc bãi biển đó con. Cứ theo hàng người mà đi!'), { emo: 'happy' }); bt.setAct(null);
    npcs.returnResident(bt);
  }
  // …and a line forms at your stand
  const b = B('shed1'), spots = [...QUEUES.shed1, [452, 2210], [428, 2196]];
  await fadeOut(300);
  vs.forEach((v, i) => { const [x, y] = spots[Math.min(i, spots.length - 1)]; v.stop?.(); v.alpha = 1; v.fadeIn = false; v.x = x; v.y = y + 4; v.face?.(i ? 'right' : 'up'); v.data.state = 'idle'; v.data.leaveAt = G.state.time + 40; });
  await camTo(b.x - 40, b.y + 20, { zoom: 1.15, rate: 9 });
  await fadeIn(300);
  caption(T('A line. At your stand.', 'Xếp hàng. Trước quán của bạn.'));
  await wait(2.4); caption(null);
}

// ---------------------------------------------------------------- Chapter 6: who you pay rent to
async function landlordIntro() {
  if (flag('landlordIntro')) return;
  setFlag('landlordIntro');
  await cs.run('landlord', async () => {
    G.runtime.inCutscene = true;
    const pl = G.player;
    if (G.scene.id !== 'island') { await fadeOut(250); const t = island().triggers.find(t => t.kind === 'door' && t.building === G.scene.building); setScene('island', t ? t.doorX : 900, t ? t.doorY + 16 : 1650, 'down'); await fadeIn(300); }
    const at = npcs.byId('anh_tuan'), bt = npcs.byId('ba_tu');
    const place = (a, dx) => { if (!a) return; a.stop?.(); a.sit = false; a.data.state = 'busy'; a.visible = true; a.x = pl.x + dx; a.y = pl.y + 4; face(a, pl); };
    place(at, 40); place(bt, -40);
    await camTo(pl.x, pl.y - 20, { zoom: 1.35 });
    if (at) await say(at, T('Rent day again! Did anyone ever tell you who the landlord actually is?', 'Lại tới ngày đóng tiền nhà! Có ai kể em nghe chủ nhà thật ra là ai chưa?'), { emo: 'happy' });
    if (bt) await say(bt, T('There isn\'t one, really. When the families moved to the mainland, they asked Cô Hoa at the supermarket to look after their places. The rent goes back to them.', 'Thật ra không có ai hết. Khi các gia đình ra đất liền, họ nhờ Cô Hoa ở siêu thị trông nhà giùm. Tiền thuê gửi lại cho họ.'));
    if (at) await say(at, T('So when you buy a place outright, you buy it from the family who left. They\'re glad. It means somebody stays.', 'Nên khi em mua đứt chỗ nào, là mua lại từ gia đình đã đi. Họ mừng lắm. Vậy nghĩa là có người ở lại.'));
    if (bt) await say(bt, T('And the supplies — no need to carry every bag yourself any more. Ask about a supply runner in the Business tab.', 'Còn hàng hóa — khỏi phải tự xách từng túi nữa. Hỏi người giao hàng trong mục Kinh doanh nha con.'), { emo: 'happy' });
    for (const a of [at, bt]) if (a) npcs.returnResident(a);
  });
  G.runtime.inCutscene = false;
}

// ---------------------------------------------------------------- a Night Market family hands over its stall
const HANDOVER = {
  nm1: [['This was my mother\'s stall. I blew out the last lantern here myself, the night the market closed.', 'Đây là sạp của mẹ bà. Chính bà thổi tắt chiếc lồng đèn cuối cùng ở đây, cái đêm chợ đóng cửa.'], ['Light it every evening for me. And don\'t burn the bánh tráng — the edges should crackle, not smoke.', 'Thắp đèn mỗi tối giùm bà nha. Và đừng để cháy bánh tráng — mép phải giòn rụm, không được khói.']],
  nm2: [['Three generations of chè at this stall. My grandchildren want to be engineers. Good for them!', 'Ba đời bán chè ở sạp này. Cháu bà muốn làm kỹ sư. Tốt cho tụi nó!'], ['Beans soft, jelly cold, coconut last. Quick hands, small prices — that\'s chè.', 'Đậu mềm, thạch lạnh, nước cốt dừa sau cùng. Tay nhanh, giá nhỏ — chè là vậy.']],
  nm3: [['Lemongrass first, then the snails. And never rush a snail — they\'ve had a long life already.', 'Sả trước, rồi mới tới ốc. Và đừng bao giờ hối con ốc — nó sống cả đời chậm rãi rồi.'], ['People who order snails stay and talk. Charge them properly for the company.', 'Người gọi ốc thì ngồi lâu, nói nhiều. Tính tiền cho xứng với bầu bạn nha.']],
  nm5: [['Press it twice. The second press is sweeter — like most second chances.', 'Ép hai lần. Lần ép thứ hai ngọt hơn — như hầu hết những cơ hội thứ hai.'], ['A cup of cane juice is cheap, so sell a lot of them. Fast hands!', 'Ly nước mía rẻ, nên phải bán thật nhiều. Tay nhanh lên!']],
  nm6: [['Charcoal, never gas. After nine o\'clock people can taste the difference.', 'Than, không dùng ga. Sau chín giờ tối là khách phân biệt được liền.'], ['The later it gets, the longer the line. Don\'t go to bed early.', 'Càng khuya càng đông. Đừng đi ngủ sớm nha.']],
};
export async function stallHandover(id) {
  const lines = HANDOVER[id]; if (!lines) return;
  await cs.run('handover:' + id, async () => {
    G.runtime.inCutscene = true;
    const b = B(id) || island().buildings[id], pl = G.player;
    const v = (npcs.vendors || []).find(a => a.data.vendor === id);
    const who = v || new Actor({ kind: 'human', look: id === 'nm1' ? MERCHANTS.ba_sau.look : undefined, name: id === 'nm1' ? 'Bà Sáu' : T('Stall owner', 'Chủ sạp'), x: b.x + 30, y: b.y + 20 });
    if (!v) island().add(who);
    who.visible = true; who.alpha = 1; who.clip = null; who.sortY = undefined; who.x = b.x + 30; who.y = b.y + 22; face(who, pl); face(pl, who);
    await camTo((who.x + pl.x) / 2, pl.y - 24, { zoom: 1.4, rate: 2 });
    for (const [en, vi] of lines) await say(who, T(en, vi), { emo: 'happy' });
    who.setAct('wave'); sfx('success'); await wait(0.8); who.setAct(null);
    if (!v) { who.fadeOut = true; }
  });
  G.runtime.inCutscene = false;
}

// ---------------------------------------------------------------- Chapter 18: the whole Night Market is yours
async function nightQueen() {
  await cs.run('nightQueen', async () => {
    G.runtime.inCutscene = true;
    await fadeOut(600, true);
    caption(T('That evening, at the Night Market…', 'Tối hôm đó, ở Chợ Đêm…'));
    G.state.time = Math.max(G.state.time, 19 * 60); setMood('night');
    if (G.scene.id !== 'island') setScene('island', 430, 720, 'up');
    const pl = G.player; pl.x = 430; pl.y = 720; pl.face('up');
    placeMeo('island', 460, 726);
    const ba = new Actor({ kind: 'human', look: MERCHANTS.ba_sau.look, name: 'Bà Sáu', x: 430, y: 670 }); island().add(ba); ba.face('down');
    for (const [i, a] of npcs.residents.entries()) { a.data.state = 'busy'; a.stop(); a.visible = true; a.sit = false; a.x = 330 + (i % 6) * 40; a.y = 770 + Math.floor(i / 6) * 22; a.face('up'); }
    await wait(1.4); caption(null); await fadeIn(700);
    await camTo(430, 690, { zoom: 1.25, rate: 1.6 });
    await say(ba, T('Every stall, every lantern. My mother would have liked you.', 'Mọi sạp, mọi lồng đèn. Mẹ bà hẳn sẽ quý con lắm.'), { emo: 'happy' });
    await say(ba, T('Queen, king — the title doesn\'t matter. The market is yours now. Keep it bright.', 'Nữ hoàng hay vua — danh xưng không quan trọng. Chợ giờ là của con. Giữ cho nó sáng nhé.'));
    sfx('fanfare');
    for (let i = 0; i < 8; i++) setTimeout(() => fx.burst('spark', 330 + rand(0, 200), 640 + rand(-20, 30), 18, { up: 40, g: 20, speed: 120, col: choice(['#ffd35a', '#f08ca0', '#ff9a4a', '#fff']), life: 1.4 }), i * 260);
    for (const a of npcs.residents) { a.setAct('cheer'); a.setEmo('happy', 4); }
    pl.setAct('cheer'); await wait(2.6); pl.setAct(null);
    for (const a of npcs.residents) { a.setAct(null); npcs.returnResident(a); }
    await say('meo', T('The Night Market was the last place to go dark. It\'s the first one fully lit again. That\'s poetry. I\'m a poet now.', 'Chợ Đêm là nơi cuối cùng tắt đèn. Giờ là nơi đầu tiên sáng trọn vẹn trở lại. Thơ ghê. Giờ mình là nhà thơ.'), { emo: 'happy', tilt: 0.15 });
    addXP(250, 'market'); ba.fadeOut = true;
    releaseMeo('nightmarket');
  });
  G.runtime.inCutscene = false;
}

// ---------------------------------------------------------------- Chapter 19 → 20: the island runs itself
// One day, told in grouped shots: the sheds open in the morning, the truck at its pitch,
// the Harbour Café's first coffees, the grill at sunset, the Night Market families, the
// restaurant team — then the camera pulls back over an island that works without you.
async function automationMontage() {
  const s = G.state, owned = id => s.biz[id]?.owned, keeperName = id => keeperOf(id)?.name;
  const time0 = s.time;
  const shots = [];
  const shed = ['shed1', 'shed2'].filter(owned);
  if (shed.length) shots.push({ h: 7.5, ids: shed, en: `Morning. ${shed.map(keeperName).filter(Boolean).join(' and ') || 'Your shopkeepers'} unlock the sheds.`, vi: `Buổi sáng. ${shed.map(keeperName).filter(Boolean).join(' và ') || 'Người trông quán'} mở cửa các quán.` });
  if (owned('truck')) { const sp = TRUCK_SPOTS[s.truckSpot || 'beach']; shots.push({ h: 11, ids: ['truck'], en: `The truck opens at ${sp.en}${keeperName('truck') ? ` — ${keeperName('truck')} at the window` : ''}.`, vi: `Xe mở bán ở ${sp.vi}${keeperName('truck') ? ` — ${keeperName('truck')} đứng quầy` : ''}.` }); }
  if (owned('cafe')) shots.push({ h: 9, ids: ['cafe'], en: 'Harbour Town. The first coffees of the day, served without you.', vi: 'Phố Cảng. Những ly cà phê đầu ngày, không cần bạn pha.' });
  if (owned('grill')) shots.push({ h: 17.5, ids: ['grill'], en: 'Coconut Cove. The grill fires up for the sunset crowd.', vi: 'Vịnh Dừa. Bếp nướng đỏ lửa đón khách hoàng hôn.' });
  const stalls = STALL_IDS.filter(owned);
  if (stalls.length) shots.push({ h: 19.5, ids: stalls, x: 430, y: 650, zoom: 0.95, en: `The Night Market. ${stalls.length} stalls, every one staffed and lit.`, vi: `Chợ Đêm. ${stalls.length} sạp, sạp nào cũng có người trông, đèn sáng rực.` });
  if (owned('restaurant')) shots.push({ h: 20, ids: ['restaurant'], zoom: 1.05, en: `The restaurant on the hill: ${s.biz.restaurant.employees.length} people prepping, cooking and serving.`, vi: `Nhà hàng trên đồi: ${s.biz.restaurant.employees.length} người sơ chế, nấu nướng và phục vụ.` });
  await cs.run('montage', async () => {
    G.runtime.realTime = time0;                                    // saves during the montage keep the real clock
    await fadeOut(500, true);
    caption(T('A day on the island — while you take a walk…', 'Một ngày trên đảo — trong lúc bạn đi dạo…'));
    await wait(1.6); caption(null);
    try {
      for (const shot of shots) {
        s.time = Math.round(shot.h * 60);
        setMood(shot.h >= 18.5 ? 'night' : 'day');
        G.runtime.showOpen = new Set(shot.ids);                   // every shop in the shot looks open, stock or not
        for (const id of shot.ids) { if (keeperOf(id)) { if (!bizOf(id).open) openShop(id); const a = keeperActor(id); if (a) { a.visible = true; a.setAct('work'); } } }
        const b = B(shot.ids[0]) || island().buildings[shot.ids[0]];
        const x = shot.x ?? (shot.ids.length > 1 ? shot.ids.reduce((a, id) => a + (B(id)?.x || 0), 0) / shot.ids.length : b?.x), y = shot.y ?? (b?.y || 1500) - 20;
        await fadeIn(350);
        await camTo(x, y, { zoom: shot.zoom || 1.2, rate: 9 });
        caption(T(shot.en, shot.vi));
        for (let k = 0; k < 2; k++) { const q = QUEUES[shot.ids[0]]; if (q) npcs.spawnVisitorAt?.(q[q.length - 1][0] + 40, q[q.length - 1][1] + 30, 'market'); }
        await wait(2.3);
        for (const id of shot.ids) keeperActor(id)?.setAct(null);
        caption(null);
        await fadeOut(300, true);
      }
      // pull back: the whole island at work
      s.time = Math.max(time0, 17 * 60); setMood('day');
      await fadeIn(400);
      await camTo(1300, 1500, { zoom: 0.42, rate: 1.4 });
      caption(T('Everywhere you look, someone is open for business.', 'Nhìn đâu cũng thấy quán xá mở cửa.'));
      await wait(2.6); caption(null);
    } finally { s.time = time0; G.runtime.realTime = null; G.runtime.showOpen = null; setMood(time0 >= 18.5 * 60 || time0 < 6 * 60 ? 'night' : 'day'); }
    await summonMeo();
    await say('meo', T('Every shop opened this morning without you. Nobody panicked. Well, I panicked a little, out of habit.', 'Sáng nay mọi quán tự mở cửa mà không cần bạn. Không ai hoảng. À, mình hoảng chút xíu, theo thói quen thôi.'), { emo: 'happy', tilt: 0.15 });
    await say('meo', T('You don\'t have to stand behind every counter any more. You built something that can live without you. That\'s the whole trick.', 'Bạn không cần đứng sau mọi quầy nữa. Bạn đã xây một thứ có thể tự sống mà không cần bạn. Bí quyết là vậy đó.'), { tilt: 0.1 });
    releaseMeo('plaza');
  });
}

// ---------------------------------------------------------------- Chapter 20: what the island became
async function epilogue() {
  const s = G.state, regs = regularsCount(), shops = Object.values(s.biz).filter(b => b.owned).length;
  const friends = Object.keys(RESIDENTS).filter(r => (s.friends[r] || 0) >= 20).length;
  const stops = [
    [900, 1560, T('Wind Plaza — where the whole island meets again.', 'Quảng trường gió — nơi cả đảo lại tụ họp.')],
    [430, 650, T('The Night Market — every lantern lit.', 'Chợ Đêm — mọi chiếc lồng đèn đều sáng.')],
    [1200, 700, T(`The restaurant on the hill — ${s.biz.restaurant.employees.length} people work there now.`, `Nhà hàng trên đồi — giờ có ${s.biz.restaurant.employees.length} người làm việc ở đó.`)],
    [2650, 640, T('Harbour Town — boats at every mooring.', 'Phố Cảng — bến nào cũng có thuyền.')],
    [2280, 1400, T('Firefly Islet — Vy is painting it all again.', 'Cù Lao Đom Đóm — Vy đang vẽ lại tất cả.')],
    [2300, 2240, T('Coconut Cove — the grill smoke drifts over the water.', 'Vịnh Dừa — khói quán nướng bay trên mặt nước.')],
    [900, 2470, T('The ferry — coming every morning again.', 'Con tàu — lại cập bến mỗi sáng.')],
  ];
  await fadeOut(500, true); caption(T(`Day ${s.day}.`, `Ngày ${s.day}.`)); await wait(1.4); caption(null); await fadeIn(500);
  for (const [x, y, text] of stops) { await camTo(x, y, { zoom: 1.05, rate: 2.2 }); caption(text); await wait(1.8); }
  caption(T(`When you arrived: one broken shed and a cat. Now: ${shops} businesses, ${regs} regulars, ${friends} close neighbours${(s.pets || []).length ? `, ${(s.pets || []).length} pet${(s.pets || []).length > 1 ? 's' : ''}` : ''} — and the same cat.`, `Khi bạn tới: một căn chòi hư và một con mèo. Giờ: ${shops} quán, ${regs} khách quen, ${friends} người hàng xóm thân${(s.pets || []).length ? `, ${(s.pets || []).length} thú cưng` : ''} — và vẫn con mèo đó.`));
  await wait(3.4); caption(null);
}


// ---------------------------------------------------------------- talking to Mèo Mây
// a function so the lines follow the current language setting
const MEO_LINES = () => [
  T('Did you know the banyan tree is older than the lighthouse? It told me. Trees talk if you nap near them long enough.', 'Bạn biết cây đa còn già hơn ngọn hải đăng không? Nó kể mình nghe đó. Ngủ gần cây đủ lâu là nghe cây nói.'),
  T('Chú Hải says it\'s going to rain. Chú Hải always says it\'s going to rain.', 'Chú Hải nói sắp mưa. Chú Hải lúc nào cũng nói sắp mưa.'),
  T('Bé Na asked me if cats like sweet chè. I said yes. I have never tried chè.', 'Bé Na hỏi mèo có thích chè không. Mình bảo có. Mình chưa ăn chè bao giờ.'),
  T('Regular customers remember how you treat them. So do cats. Just so you know.', 'Khách quen nhớ bạn đối xử với họ thế nào. Mèo cũng vậy. Nói cho bạn biết thôi.'),
  T('The best time to visit the beach is when the ferry leaves. So quiet. So many dropped snacks.', 'Lúc đẹp nhất để ra biển là khi tàu vừa đi. Yên tĩnh ghê. Lại còn nhiều đồ ăn vặt rơi.'),
  T('If a customer is in a hurry, their patience bar drops faster. Rushed people tip better, though!', 'Khách vội thì thanh kiên nhẫn tụt nhanh hơn. Nhưng người vội lại hay boa nhiều!'),
  T('Daily specials are 10% pricier and people love them. Check the menu board in each shop.', 'Món đặc biệt hôm nay đắt hơn 10% mà ai cũng thích. Xem bảng thực đơn ở mỗi quán nhé.'),
  T('I counted the fish in the pond. Eleven. Then twelve. One of them was a leaf.', 'Mình đếm cá trong hồ. Mười một con. Rồi mười hai. Một con là cái lá.'),
  T('Ông Lộc lets me sit on his nets. I pretend I\'m guarding them. I am napping.', 'Ông Lộc cho mình nằm trên lưới. Mình giả vờ canh lưới. Thật ra là ngủ.'),
  T('The night market smells like grilled corn and happiness. Mostly corn.', 'Chợ đêm thơm mùi bắp nướng và hạnh phúc. Chủ yếu là bắp.'),
  T('Rainy days are for staying inside and judging people through the window.', 'Ngày mưa là để ở trong nhà và nhận xét thiên hạ qua cửa sổ.'),
  T('I tried to catch a firefly once. It turned off. Rude.', 'Có lần mình bắt đom đóm. Nó tắt đèn luôn. Bất lịch sự.'),
  T('Your basement is the perfect temperature for a nap. I checked. Thoroughly.', 'Tầng hầm nhà bạn nhiệt độ vừa đúng để ngủ trưa. Mình kiểm tra rồi. Rất kỹ.'),
  T('Don\'t forget to rest. A tired shopkeeper drops the bánh mì. I would know — I eat what drops.', 'Đừng quên nghỉ ngơi. Chủ quán mệt là làm rơi bánh mì. Mình biết mà — mình ăn những gì rơi.'),
  T('Tourists love it when you do everything perfectly. They tip like they\'re on holiday — because they are.', 'Du khách thích khi bạn làm hoàn hảo. Họ boa như đang đi nghỉ — vì họ đang đi nghỉ thật.'),
];
export async function talkToMeo() {
  const m = G.meo, pl = G.player;
  if (cs.active) return;
  await cs.run('talk:meo', async () => {
    const wasNapping = m.act === 'sleep';
    m.stop(); m.sit = false; m.setAct(null); m.emote = null; face(m, pl); face(pl, m); m.data.busy = true;
    if (wasNapping) { m.setEmo('sleepy', 1.5); await say('meo', G.lang === 'vi' ? '*Ngáp*… Ơ, bạn đó hả? Mình đang mơ về cá…' : '*Yawn*… Oh, it\'s you! I was dreaming about fish…', { emo: 'sleepy' }); }
    m.doHop(60); sfx('meow');
    const st = currentStep();
    const avail = availableRecipes();
    const gate = pendingGate();
    const qo = questOption('meo');
    const opts = [T('What should I do next?', 'Mình nên làm gì tiếp?'), T('Tell me something', 'Kể chuyện đi'), T('Tell me a joke!', 'Kể chuyện cười đi!'), T('Rock, paper, scissors!', 'Oẳn tù tì!'), T('Bye!', 'Tạm biệt!')];
    if (gate) opts.unshift(T(`About the key to ${GATES[gate].en}…`, `Về chìa khóa ${GATES[gate].vi}…`));
    if (qo) opts.unshift(qo);
    const fishy = (G.state.fishForMeo || 0) > 0;
    if (fishy) opts.unshift(T('🐟 Here\'s a fish for you!', '🐟 Cá cho bạn nè!'));
    const pick = await ask('meo', choice([T(`Hi ${G.state.player.name}! Need something?`, `Chào ${G.state.player.name}! Cần gì không?`), T('Mew? Oh, it\'s you! Hello!', 'Meo? Ơ, bạn đó hả! Chào nha!'), T('I was *definitely* not asleep. What\'s up?', 'Mình *chắc chắn* không có ngủ. Có chuyện gì?')]), opts, { emo: 'happy' });
    let p = pick;
    if (fishy) { if (p === 0) { G.state.fishForMeo--; markDirty(true); m.doHop(90); sfx('meow'); fx.burst('heart', m.x, m.y - 30, 8, { up: 40 }); await say('meo', choice([T('A FISH. For ME. This is the best day of my life. (Until tomorrow\'s fish.)', 'CÁ. Cho MÌNH. Hôm nay là ngày đẹp nhất đời mình. (Cho tới con cá ngày mai.)'), T('*happy crunching noises* …Chú Hải taught you well.', '*tiếng nhai rộp rộp sung sướng* …Chú Hải dạy bạn giỏi ghê.'), T('You know the way to a cat\'s heart. It\'s through the fish.', 'Bạn biết đường tới trái tim mèo rồi đó. Đi qua con cá.')]), { emo: 'love' }); addXP(15, 'meo'); p = -1; } else p--; }
    if (p >= 0 && qo) { if (p === 0) { await questTalk(m, 'meo'); p = -1; } else p--; }
    if (p >= 0 && gate) { if (p === 0) { await keyTalk(gate); p = -1; } else p--; }
    if (p === 0) {
      if (avail.length) await say('meo', T('I wrote a new recipe in my notebook! Come to my house and have a look.', 'Mình vừa ghi công thức mới vào sổ tay! Qua nhà mình xem nhé.'), { emo: 'happy' });
      if (st?.text) await say('meo', hintFor(S().step));
      else await say('meo', T('Upgrade your shops, try new recipes, make everyone a regular. And visit me!', 'Nâng cấp quán, thử công thức mới, biến ai cũng thành khách quen. Và ghé thăm mình nữa!'));
    } else if (p === 1) {
      // her story, a memory at a time (then the usual chatter)
      const i = S().flags.meoMem || 0, mem = MEO_MEMORIES[i];
      if (mem && G.state.story.chapter >= mem.ch) {
        for (const [en, vi] of mem.lines) await say('meo', T(en, vi), { tilt: 0.12 });
        S().flags.meoMem = i + 1; markDirty(true);
        if (i === 0) toast({ text: T('Mèo Mây has more stories', 'Mèo Mây còn nhiều chuyện lắm'), sub: T('Ask again as the island grows.', 'Hỏi lại khi hòn đảo lớn dần nhé.'), icon: 'notebook' });
      } else await say('meo', choice(MEO_LINES()), { tilt: 0.15 });
    }
    else if (p === 2) { await say('meo', Math.random() < 0.6 ? meoJoke() : randomJoke(), { emo: 'happy', tilt: 0.2 }); meoAntic(m); }
    else if (p === 3) await playRPS(m, 'meo');
    else if (p !== -1) { m.setAct('wave'); await say('meo', T('See you around!', 'Hẹn gặp lại nha!'), { emo: 'happy' }); m.setAct(null); }
    m.data.busy = false;
    if (wasNapping) { m.data.napping = false; }
  }, { bars: false, keepHud: true });
}
async function keyTalk(id) {
  const g = GATES[id], m = G.meo;
  if (level() < g.level) { await say('meo', T(`Not yet! Come back when you're level ${g.level}. You're level ${level()}. I believe in you, but the key doesn't.`, `Chưa được đâu! Quay lại khi bạn đạt cấp ${g.level} nhé. Bạn đang cấp ${level()}. Mình tin bạn, nhưng cái chìa thì chưa.`), { emo: 'sad', tilt: 0.15 }); return; }
  if (G.state.money < g.cost) { await say('meo', T(`It's ${money(g.cost)}. You have ${money(Math.floor(G.state.money))}. I'd give you a discount, but I've already promised the money to a fish seller.`, `Giá ${money(g.cost)}. Bạn có ${money(Math.floor(G.state.money))}. Mình muốn giảm giá lắm, mà lỡ hứa trả tiền cho cô bán cá rồi.`), { emo: 'think' }); return; }
  const yes = await ask('meo', T(`The key to ${g.en}: ${money(g.cost)}. Deal?`, `Chìa khóa ${g.vi}: ${money(g.cost)}. Chốt không?`), [T('Deal!', 'Chốt!'), T('Maybe later', 'Để sau')], { emo: 'happy' });
  if (yes !== 0) { await say('meo', T('The key will wait. Keys are very patient.', 'Chìa khóa sẽ chờ. Chìa khóa kiên nhẫn lắm.')); return; }
  payGate(id);
  sfx('cash');
  m.setAct('think'); await wait(0.5);
  await say('meo', T('*Rummages in fur*… not that, that\'s a leaf… not that… AH. Here!', '*Lục trong lớp lông*… không phải, cái lá… không phải… A ĐÂY RỒI!'), { emo: 'happy' });
  m.setAct(null); m.doHop(90); sfx('fanfare');
  fx.burst('spark', m.x, m.y - 30, 16, { up: 50, speed: 70, col: '#ffd35a', life: 1.1 });
  const b = bizOf(id);
  b.unlocked = true;
  if (id === 'truck') { b.owned = true; b.repair = 1; unlockAchievement('truck'); }
  if (id === 'restaurant') b.owned = true;
  if (id === 'shed2') b.owned = true;
  markDirty(true);
  toast({ text: T(`You got the key to ${g.en}!`, `Bạn đã có chìa khóa ${g.vi}!`), icon: 'key', ms: 3200 });
  await say('meo', ({ shed2: T('Go fix it up! Chú Bảy has the wood.', 'Đi sửa nó đi! Chú Bảy có gỗ đó.'), truck: T('Beep beep! The truck is yours. Try not to drive it into the sea.', 'Bíp bíp! Xe là của bạn. Đừng lái xuống biển nha.'), night: T('Now the lanterns just need fixing. Chú Bảy sells everything you need.', 'Giờ chỉ cần sửa lồng đèn thôi. Chú Bảy bán đủ hết.'), restaurant: T('The big one! It needs a LOT of repairs. I believe in you. And in roof tiles.', 'Quán lớn nhất! Cần sửa RẤT nhiều. Mình tin bạn. Và tin ngói nữa.') })[id], { emo: 'happy' });
}
function hintFor(step) {
  return ({
    materials: T('Ben Vung Materials is on Market Street, north of the plaza. There\'s a button that buys exactly what the shed needs!', 'Tiệm VLXD Bền Vững ở Phố Chợ, phía bắc quảng trường. Có nút mua đúng đủ những gì căn chòi cần!'),
    repair: T('You have the materials! Walk up to the beach shed and tap the button to repair it.', 'Bạn có đủ vật liệu rồi! Đi tới căn chòi ở bãi biển rồi bấm nút để sửa.'),
    ingredients: T('Binh Minh Supermarket is the green one on Market Street. Tea, kumquats, sugar and ice!', 'Siêu thị Bình Minh là tiệm màu xanh ở Phố Chợ. Trà, tắc, đường và đá!'),
    prep: T('Inside the shed, the prep table is on the right. Tap a kumquat, tap the board, tap the bowl.', 'Trong quán, bàn sơ chế ở bên phải. Chạm trái tắc, chạm thớt, chạm tô.'),
    open: T('Press the green OPEN button inside your shed. Then stand at the counter.', 'Bấm nút MỞ CỬA màu xanh trong quán. Rồi đứng ở quầy.'),
    serve: T('Stand behind the counter and tap Serve. Pick the size, add the ingredients in order, set sugar and ice, then serve!', 'Đứng sau quầy rồi bấm Bán hàng. Chọn size, thêm nguyên liệu theo thứ tự, chỉnh đường và đá, rồi phục vụ!'),
    sleep: T('Your bed is in your house, top-left corner. Sleep whenever you\'re ready for tomorrow.', 'Giường ở góc trên bên trái trong nhà bạn. Ngủ khi nào bạn sẵn sàng cho ngày mai.'),
    grow: T('Serve customers well — perfect orders give the most reputation. Daily specials help too!', 'Phục vụ khách thật tốt — món hoàn hảo cho nhiều danh tiếng nhất. Món đặc biệt cũng giúp nữa!'),
    repair2: T('The bánh mì shed is in West Village, west of the plaza. Chú Bảy has the materials.', 'Chòi bánh mì ở Xóm Tây, phía tây quảng trường. Chú Bảy có đủ vật liệu.'),
    banhmi: T('Buy bread, pâté, pork, pickles, cucumber and cilantro, prep them, and open the bánh mì shop.', 'Mua bánh mì, pa tê, thịt heo, đồ chua, dưa leo và ngò, sơ chế rồi mở quán bánh mì.'),
    truck: T(`I have the food truck's keys. Reach level ${GATES.truck.level}, save ${money(GATES.truck.cost)}, then talk to me!`, `Mình giữ chìa khóa xe cuốn. Đạt cấp ${GATES.truck.level}, để dành ${money(GATES.truck.cost)}, rồi nói chuyện với mình!`),
    key2: T(`Reach level ${GATES.shed2.level} and save ${money(GATES.shed2.cost)}, then ask me for the key. Serving customers gives XP!`, `Đạt cấp ${GATES.shed2.level} và để dành ${money(GATES.shed2.cost)}, rồi hỏi mình lấy chìa. Phục vụ khách sẽ được kinh nghiệm!`),
    truckServe: T('Stock rice paper, noodles, herbs and shrimp for the truck. Tourists love spring rolls!', 'Chuẩn bị bánh tráng, bún, rau thơm và tôm cho xe. Du khách mê gỏi cuốn lắm!'),
    restoreNM: T('Chú Bảy sells lanterns and light strings now. Bring everything to the Night Market across the river.', 'Giờ Chú Bảy có bán lồng đèn và dây đèn. Mang hết tới Chợ Đêm bên kia sông.'),
    nightServe: T('Your night stall opens at 17:00. Rice paper, eggs and scallions for grilled rice paper!', 'Sạp đêm mở lúc 17:00. Bánh tráng, trứng và hành lá cho món bánh tráng nướng!'),
    buyResto: T(`The restaurant key: level ${GATES.restaurant.level} and ${money(GATES.restaurant.cost)}. It takes patience!`, `Chìa khóa nhà hàng: cấp ${GATES.restaurant.level} và ${money(GATES.restaurant.cost)}. Phải kiên nhẫn đó!`),
    repairResto: T('The restaurant needs roof tiles as well as wood, metal and paint.', 'Nhà hàng cần ngói, cùng với gỗ, tôn và sơn.'),
    hire: T('Inside the restaurant, the Staff board is in the bottom-right corner.', 'Trong nhà hàng, bảng Nhân viên ở góc dưới bên phải.'),
    restoServe: T('Open the restaurant and look after the guests. Staff will help with whatever they\'re assigned.', 'Mở cửa nhà hàng và chăm sóc khách. Nhân viên sẽ làm những việc được giao.'),
    team: T('Hire a cook and a server, and the restaurant runs itself while you\'re away.', 'Thuê một đầu bếp và một phục vụ, nhà hàng sẽ tự chạy khi bạn vắng mặt.'),
    destination: T('Grow your reputation and fully upgrade a shop. Then come see me at the plaza!', 'Tăng danh tiếng và nâng cấp tối đa một quán. Rồi tới quảng trường gặp mình!'),
    tour: T('Follow me! I\'ll show you around the island.', 'Đi theo mình nào! Mình dẫn bạn đi một vòng đảo.'),
    settle: T('Keep your drink stand busy: serve customers, aim for perfect orders and sleep each night. The goals are in your quest bar.', 'Giữ quán nước thật đông: phục vụ khách, cố làm món hoàn hảo và ngủ mỗi tối. Mục tiêu ở thanh nhiệm vụ.'),
    regulars: T('Customers who visit three times become regulars. Come learn a recipe at my house, and upgrade the drink stand from its counter.', 'Khách ghé ba lần sẽ thành khách quen. Ghé nhà mình học công thức, và nâng cấp quán nước ngay tại quầy.'),
    hireKeeper: T('Open Menu → Business and hire a shopkeeper for the drink stand. They open, prep and serve while you\'re away.', 'Mở Menu → Kinh doanh và thuê người trông quán nước. Họ tự mở cửa, sơ chế và bán khi bạn đi vắng.'),
    keeperRun: T('Let your shopkeeper run the drink stand while you sell bánh mì yourself in West Village.', 'Để người trông quán lo quán nước, còn bạn tự bán bánh mì ở Xóm Tây.'),
    supplies: T('In Menu → Business you can hire a supply runner to restock a shop. Upgrade the bánh mì shed and save some cash.', 'Trong Menu → Kinh doanh bạn có thể thuê người giao hàng để bổ sung nguyên liệu. Nâng cấp quán bánh mì và để dành ít tiền.'),
    nightIntro: T('Come with me to the Night Market across the river!', 'Đi với mình tới Chợ Đêm bên kia sông nào!'),
    buyStall: T('The Night Market has empty stalls for sale. Walk up to the sweet soup or snail stall to buy it.', 'Chợ Đêm còn sạp trống để bán. Đi tới sạp chè hoặc sạp ốc để mua.'),
    stallServe: T('Sell at your new stall after 17:00, and hire a stall keeper for one of your night stalls in Menu → Business.', 'Bán ở sạp mới sau 17:00, và thuê người trông một sạp đêm trong Menu → Kinh doanh.'),
    restoIntro: T('Come see the old restaurant with me!', 'Đi xem nhà hàng cũ với mình nào!'),
    harbour: T('Chú Bảy sells wood, metal and paint. Bring them with the money to the bridge site on the east coast.', 'Chú Bảy bán gỗ, tôn và sơn. Mang chúng cùng tiền tới chỗ xây cầu ở bờ đông.'),
    adopt: T('Cô Bông\'s pet shop is in Harbour Town, over the new bridge. Pick a friend to bring home!', 'Tiệm thú cưng của Cô Bông ở Phố Cảng, qua cây cầu mới. Chọn một bé mang về nhà nhé!'),
    cafe: T('The Harbour Café kiosk is in Harbour Town. Save up from your other shops, then walk up to it to buy it.', 'Ki-ốt Cà Phê Bến Cảng ở Phố Cảng. Để dành tiền từ các quán khác, rồi tới đó để mua.'),
    cafeServe: T('Stock coffee and milk, open the café and serve from its counter.', 'Chuẩn bị cà phê và sữa, mở quán rồi bán ở quầy.'),
    rest7: T('Learn egg coffee at my house, hire a café shopkeeper, and keep the café busy while you level up.', 'Học cà phê trứng ở nhà mình, thuê người trông quán cà phê, và giữ quán đông khách trong lúc lên cấp.'),
    bridge: T('The Long Bridge is east of the plaza. Chú Bảy has the wood, metal and paint it needs.', 'Cây Cầu Dài ở phía đông quảng trường. Chú Bảy có đủ gỗ, tôn và sơn cần dùng.'),
    islet: T('Cross the Long Bridge to Firefly Islet. Someone is painting out there!', 'Qua Cây Cầu Dài tới Cù Lao Đom Đóm. Có ai đó đang vẽ tranh ngoài đó!'),
    vyViews: T('Follow the marker to each view and stand there for a moment. Vy wants three of them.', 'Theo dấu chỉ tới từng cảnh đẹp và đứng đó một chút. Vy muốn ba cảnh.'),
    landlord: T('In Menu → Business you can buy the places you rent. Owned places pay no rent and bring a few more customers.', 'Trong Menu → Kinh doanh bạn có thể mua đứt nơi đang thuê. Nơi đã mua không phải trả tiền thuê và có thêm khách.'),
    festival: T('Reach the level, buy silk lanterns from Chú Bảy, and serve a big crowd in a single day.', 'Đạt đủ cấp, mua lồng đèn lụa ở Chú Bảy, và phục vụ thật đông khách trong một ngày.'),
    cove: T('The Cove Bridge goes past the east beach. It needs roof tiles as well as wood, metal and paint.', 'Cầu Vịnh Dừa ở sau bãi đông. Cần ngói, cùng với gỗ, tôn và sơn.'),
    smoothie: T('The Beach Smoothie Bar is on Sunny Beach, by the dock. Walk up to it to buy it.', 'Quán Sinh Tố Bãi Biển ở Bãi Biển, cạnh bến tàu. Đi tới đó để mua.'),
    grill: T('The Coconut Cove Grill is across the Cove Bridge. Walk up to it to buy it.', 'Quán Nướng Vịnh Dừa ở bên kia Cầu Vịnh Dừa. Đi tới đó để mua.'),
    grillServe: T('Stock seafood for the grill, open it and grill from the counter.', 'Chuẩn bị hải sản cho quán nướng, mở cửa rồi nướng ở quầy.'),
    allStalls: T('Every empty stall at the Night Market is for sale. Walk up to each one to buy it.', 'Mọi sạp trống ở Chợ Đêm đều đang bán. Đi tới từng sạp để mua.'),
    allStaff: T('Open Menu → Business: hire a keeper for every shop and stall, and a team for the restaurant.', 'Mở Menu → Kinh doanh: thuê người trông cho mọi quán và sạp, và một đội cho nhà hàng.'),
    keeper: T('Own every business, keep levelling up and make lots of regulars. The island is almost yours!', 'Sở hữu mọi quán, tiếp tục lên cấp và có thật nhiều khách quen. Hòn đảo gần như là của bạn rồi!'),
    free: T('The island is yours! Upgrade shops, try new recipes, decorate your home, and visit me.', 'Hòn đảo là của bạn! Nâng cấp quán, thử món mới, trang trí nhà, và ghé thăm mình nhé.'),
  })[step] || T('Just enjoy the island for a bit!', 'Cứ tận hưởng hòn đảo một chút đi!');
}

// ---------------------------------------------------------------- Mèo Mây's routine
const MEO_SPOTS = {
  plaza: [[970, 1650], [830, 1650], [900, 1650]], beach: [[700, 2296], [1120, 2330]], dock: [[900, 2480]], market: [[900, 1250]],
  nightmarket: [[456, 700]], shop: null, home: [[1480, 1748]],
};
export function updateMeo(dt) {
  const m = G.meo;
  if (!m || !flag('freeRoam') || cs.active || m.data.busy) return;
  const st = G.state, h = st.time / 60;
  const homeTime = (h >= (st.nightMarket.restored ? 22.5 : 20.5)) || h < 7 || (h >= 12.5 && h < 13.5);
  const inHome = scenes.meo.actors.includes(m);
  if (homeTime) {
    if (inHome) { if (!m.data.napping) { m.data.napping = true; m.x = scenes.meo.catBed.x; m.y = scenes.meo.catBed.y; m.face('down'); m.setAct('sleep'); m.showEmote('zzz', 600); } return; }
    if (m.data.goal !== 'home-walk') {
      m.data.goal = 'home-walk'; m.sit = false;
      if (G.scene !== island()) { placeMeo('meo', scenes.meo.meoSpot.x, scenes.meo.meoSpot.y); m.data.napping = false; return; }
      walk(m, 1480, 1740, { speed: 64 }).then(() => { if (m.data.goal === 'home-walk') { placeMeo('meo', scenes.meo.meoSpot.x, scenes.meo.meoSpot.y); m.data.napping = false; } });
    }
    return;
  }
  if (inHome) { m.setAct(null); m.emote = null; m.data.napping = false; m.doHop(80); placeMeo('island', 1480, 1752); m.data.until = 0; m.data.goal = null; }
  if (m.path) return;
  if (st.time < (m.data.until || 0)) {
    // idle: look at the player when near, occasionally hop or sit
    const pd = G.scene === island() ? dist(m.x, m.y, G.player.x, G.player.y) : 999;
    // found her napping somewhere new?
    if (m.data.outNap && pd < 60) { const naps = (st.meoNaps ||= {}); if (!naps[m.data.outNap]) { naps[m.data.outNap] = true; markDirty(); if (Object.keys(naps).length >= 4) unlockAchievement('meo_naps'); } }
    if (m.data.outNap) return;
    if (pd < 70) { if (!m.act) m.face(G.player); if (!m.data.waved) { m.data.waved = true; m.setAct('wave'); setTimeout(() => m.act === 'wave' && m.setAct(null), 1200); } }
    else m.data.waved = false;
    // silly antics when you're around to see them
    if (pd < 160 && !m.act && !m.sit && Math.random() < dt * 0.05) meoAntic(m);
    return;
  }
  // choose a new hangout
  let spot = null;
  const openBiz = Object.keys(BUSINESSES).filter(id => bizOf(id).open && id !== 'restaurant' && id !== 'night');
  const r = Math.random();
  if (openBiz.length && r < 0.35) { const id = choice(openBiz); const bld = B(id); spot = [bld.x + 50, bld.y + 30]; }
  else if ((npcs.ferry?.state === 'docked' || npcs.ferry?.state === 'arriving') && m.data.lastSpot !== 'dock' && r < 0.75) { spot = choice(MEO_SPOTS.dock); m.data.lastSpot = 'dock'; }
  else if (st.nightMarket.restored && h >= 17.5) spot = choice(MEO_SPOTS.nightmarket);
  else spot = choice([...MEO_SPOTS.plaza, ...MEO_SPOTS.beach, ...MEO_SPOTS.market]);
  m.sit = false;
  if (m.data.outNap) { m.data.outNap = null; m.setAct(null); m.emote = null; }
  m.data.goal = 'walk';
  if (spot !== MEO_SPOTS.dock[0]) m.data.lastSpot = null;
  // stay a while wherever she ends up, even if the walk was interrupted, so she never paces
  m.data.until = st.time + 999;
  walk(m, spot[0] + rand(-8, 8), spot[1] + rand(-4, 4), { speed: 62 }).then(ok => {
    m.data.until = G.state.time + (ok ? rand(25, 60) : rand(8, 15));
    if (!ok) return;
    m.face('down');
    // lazy afternoons: a nap wherever she happens to be (can you find all her favourite spots?)
    const hh = G.state.time / 60;
    if (hh >= 13.5 && hh < 16.5 && Math.random() < 0.45) { m.sit = true; m.setAct('sleep'); m.showEmote('zzz', 60); m.data.outNap = `${Math.round(spot[0] / 150)},${Math.round(spot[1] / 150)}`; m.data.until = G.state.time + rand(40, 70); return; }
    if (Math.random() < 0.5) m.sit = true;
  });
}
