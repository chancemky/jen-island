// "What's new": after an update, returning players get a card listing every
// update released since they last played (never ones from before their
// account existed; brand-new players see nothing). Settings keeps the last 20.

import { G, T, tr, markDirty } from '../systems/state.js';
import { CHANGELOG, APP_VERSION, newerThan } from '../data/changelog.js';
import { h } from './sheets.js';
import { escapeHtml } from '../core/util.js';
import { sfx } from '../core/audio.js';

const fmtDate = d => new Date(d).toLocaleDateString(G.lang === 'vi' ? 'vi-VN' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' });

export function unseenUpdates(s = G.state) {
  const seen = s.lastSeenVersion || APP_VERSION;
  return CHANGELOG.filter(e => newerThan(e.v, seen) && Date.parse(e.date) > (s.createdAt || 0));
}

function entryHtml(e, open = true) {
  return `<details class="wn-entry" ${open ? 'open' : ''}><summary><b>${escapeHtml(tr(e.title))}</b><small>v${e.v} · ${fmtDate(e.date)}</small></summary><ul>${e.items.map(i => `<li>${escapeHtml(tr(i))}</li>`).join('')}</ul></details>`;
}

export function showWhatsNew() {
  const s = G.state;
  const list = unseenUpdates(s);
  if (!list.length) { if (s.lastSeenVersion !== APP_VERSION) { s.lastSeenVersion = APP_VERSION; markDirty(true); } return Promise.resolve(); }
  return new Promise(res => {
    G.runtime.pause++;
    sfx('fanfare');
    const el = h('div', 'wn-wrap');
    el.innerHTML = `<div class="wn-card"><div class="wn-head"><span class="wn-badge">NEW</span><h2>${T("What's new on the island", 'Có gì mới trên đảo')}</h2><small>${T(list.length > 1 ? `${list.length} updates since you last played` : 'Since you last played', list.length > 1 ? `${list.length} bản cập nhật kể từ lần chơi trước` : 'Kể từ lần chơi trước')}</small></div>
      <div class="wn-body scroll">${list.map((e, i) => entryHtml(e, i === 0)).join('')}</div>
      <button class="btn big pink" type="button">${T("Let's play!", 'Chơi thôi!')}</button></div>`;
    document.getElementById('app').appendChild(el);
    el.querySelector('button').onclick = () => {
      sfx('success'); s.lastSeenVersion = APP_VERSION; markDirty(true);
      G.runtime.pause--; el.classList.add('out'); setTimeout(() => { el.remove(); res(); }, 250);
    };
  });
}

// Settings: the last 20 updates (only those since the account was created).
export function renderChangelog(pane) {
  const s = G.state;
  const list = CHANGELOG.filter(e => Date.parse(e.date) > (s.createdAt || 0)).slice(0, 20);
  const box = h('div', 'wn-list');
  box.innerHTML = list.length ? list.map((e, i) => entryHtml(e, i === 0)).join('') : `<div class="empty-note">${T('No updates since you joined yet. New ones will show up here!', 'Chưa có bản cập nhật nào kể từ khi bạn tham gia. Bản mới sẽ hiện ở đây!')}</div>`;
  pane.appendChild(box);
}
