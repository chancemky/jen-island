// "Which island do you want to keep?" — when this device and the cloud disagree
// (played on two devices, or a guest logging in to an account that has an island).

import { T } from '../systems/state.js';
import { escapeHtml } from '../core/util.js';
import { sfx } from '../core/audio.js';

const card = s => `${escapeHtml(s?.island?.name || 'Bistro Island')} · ${T(`Day ${s?.day} · Chapter ${s?.story?.chapter}`, `Ngày ${s?.day} · Chương ${s?.story?.chapter}`)}`;
// resolves 'here' or 'cloud'
export function chooseIsland(here, cloud, { why = T('This island was also played on another device. The one you don\'t pick will be replaced.', 'Hòn đảo này cũng được chơi trên một thiết bị khác. Hòn đảo bạn không chọn sẽ bị thay thế.'), cloudLabel = T('The other device\'s island', 'Đảo trên thiết bị kia') } = {}) {
  return new Promise(res => {
    const el = document.createElement('div'); el.className = 'modal'; el.style.zIndex = 300;   // (above the loading screen)
    el.innerHTML = `<div class="card"><h2>${T('Which island do you want to keep?', 'Bạn muốn giữ hòn đảo nào?')}</h2>
      <p style="font-weight:800;line-height:1.4">${why}</p>
      <div style="display:flex;flex-direction:column;gap:8px;margin-top:12px">
        <button type="button" class="btn big" data-a="cloud">${cloudLabel}<small style="display:block;font-size:12px;opacity:.8">${card(cloud)}</small></button>
        <button type="button" class="btn ghost" data-a="here">${T('The island on this device', 'Đảo trên máy này')}<small style="display:block;font-size:12px;opacity:.8">${card(here)}</small></button>
      </div></div>`;
    document.getElementById('app').appendChild(el);
    for (const b of el.querySelectorAll('button')) b.onclick = () => { sfx('ui'); el.remove(); res(b.dataset.a); };
  });
}
