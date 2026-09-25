// Release notes. Newest first. Every update adds an entry here (and bumps
// version.json to the same `v`). Players who already had an account see a
// "What's new" card listing the updates released since they last played;
// Settings keeps the last 20.

export const APP_VERSION = '3.0.0';

export const CHANGELOG = [
  {
    v: '3.0.0', date: '2026-09-25T21:07:07Z',
    title: ['The Big Island Update', 'Bản cập nhật Đảo Lớn'],
    items: [
      ['The whole island cast is now the hand-drawn characters, each with their own walk, blink and quirks', 'Toàn bộ cư dân giờ là các nhân vật vẽ tay, mỗi người có dáng đi, cái chớp mắt và tính cách riêng'],
      ['Levels with no cap, a level-up celebration, and a global leaderboard', 'Cấp độ không giới hạn, màn ăn mừng lên cấp và bảng xếp hạng toàn cầu'],
      ['Milestones with rewards', 'Cột mốc kèm phần thưởng'],
      ['Only your first shop is free: unlock the rest by paying Mèo Mây as you level up', 'Chỉ quán đầu tiên miễn phí: mở khóa các quán khác bằng cách trả tiền cho Mèo Mây khi lên cấp'],
      ['Set your own menu prices', 'Tự đặt giá cho thực đơn'],
      ['Many more upgrades for every shop', 'Thêm nhiều nâng cấp cho mọi quán'],
      ['Dishes build up layer by layer as you add each ingredient', 'Món ăn được xếp từng lớp theo từng nguyên liệu bạn thêm'],
      ['Recipe checklist, undo button and clear "missing / extra" hints at the counter', 'Danh sách công thức, nút hoàn tác và gợi ý "thiếu / thừa" rõ ràng ở quầy'],
      ['Supermarket aisles, and buying no longer jumps the list to the top', 'Siêu thị chia theo quầy, mua hàng không còn nhảy lên đầu danh sách'],
      ['New clothing shop with lots of outfits; change clothes at the wardrobe at home', 'Tiệm quần áo mới với rất nhiều trang phục; thay đồ ở tủ quần áo trong nhà'],
      ['A bigger island with new areas, side stories and new chapters', 'Hòn đảo rộng hơn với khu vực mới, chuyện phụ và chương mới'],
      ['Distinct houses and much cozier interiors', 'Nhà cửa riêng biệt và nội thất ấm cúng hơn nhiều'],
      ['Roaming animals, real rolling waves and better crop fields', 'Thú đi lang thang, sóng biển thật sự và ruộng đẹp hơn'],
      ['A better map, correct signposts and a pause button', 'Bản đồ đẹp hơn, biển chỉ đường đúng hướng và nút tạm dừng'],
      ['Funnier Mèo Mây and neighbours: jokes, surprise gifts and rock-paper-scissors', 'Mèo Mây và hàng xóm vui tính hơn: kể chuyện cười, quà bất ngờ và oẳn tù tì'],
      ['Fixes: getting stuck on trees, river lines over the bridge, sleeping pose, Mèo pacing at the dock', 'Sửa lỗi: kẹt vào cây, dòng sông vẽ đè cầu, tư thế ngủ, Mèo đi qua lại ở bến'],
      ['Refreshing the page now always loads the newest update', 'Tải lại trang giờ luôn có bản cập nhật mới nhất'],
    ],
  },
  {
    v: '2.0.0', date: '2026-09-25T17:18:53Z',
    title: ['Polish Pass', 'Bản trau chuốt'],
    items: [
      ['English by default, with a full Vietnamese option in Settings', 'Mặc định tiếng Anh, có tùy chọn tiếng Việt đầy đủ trong Cài đặt'],
      ['Longer days (about 20 minutes) and a sleepy after-midnight mode instead of a forced reset', 'Ngày dài hơn (khoảng 20 phút) và chế độ buồn ngủ sau nửa đêm thay vì bị ép sang ngày mới'],
      ['Shops close at midnight; sleeping wakes you at 6am', 'Các quán đóng cửa lúc nửa đêm; ngủ dậy lúc 6 giờ sáng'],
      ['25% more customers', 'Thêm 25% khách'],
      ['Cuter characters, windy trees and grass, and more decorations', 'Nhân vật dễ thương hơn, cây cỏ đung đưa trong gió, nhiều đồ trang trí hơn'],
      ['Clearer doors and a clock inside buildings; drinks start with no ice', 'Cửa rõ ràng hơn, có đồng hồ trong nhà; đồ uống mặc định không đá'],
    ],
  },
  {
    v: '1.0.0', date: '2026-09-25T15:55:37Z',
    title: ['Welcome to JEN Island', 'Chào mừng đến Đảo JEN'],
    items: [
      ['Arrive by boat, meet Mèo Mây and name your island', 'Đến đảo bằng thuyền, gặp Mèo Mây và đặt tên cho hòn đảo'],
      ['Repair shops, buy and prep ingredients, and serve customers', 'Sửa quán, mua và sơ chế nguyên liệu, phục vụ khách'],
      ['Chapters, the Night Market and a restaurant with staff', 'Các chương truyện, Chợ Đêm và nhà hàng có nhân viên'],
    ],
  },
];

const num = v => v.split('.').map(Number).reduce((s, n) => s * 1000 + n, 0);
export const newerThan = (a, b) => num(a) > num(b);
