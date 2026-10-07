// The Island Board's sheet: today's notes pinned to cork, each with the neighbour's face.

import { G, T } from '../systems/state.js';
import { openSheet, h, btn } from './sheets.js';
import { todaysNotes, noteText, giverName, have, takeNote, handIn, canHandIn } from '../systems/board.js';
import { RESIDENTS } from '../data/looks.js';
import { drawVillagerHead } from '../gfx/villager.js';
import { escapeHtml } from '../core/util.js';
import { sfx } from '../core/audio.js';
import { toast } from './hud.js';
import { iconURL } from '../gfx/food.js';

const PAPER = ['#fff8e1', '#fdeef2', '#eaf6f1', '#eef1fd'];
const PIN = ['#e8584e', '#6fbfb0', '#f2c14e', '#b39ddb'];
export function openBoard() {
  openSheet({ title: T('Island Board', 'Bảng tin đảo'), sub: T(`Day ${G.state.day} · new notes every morning`, `Ngày ${G.state.day} · lời nhờ mới mỗi sáng`), cls: 'board-sheet', build: (body, api) => {
    const wall = h('div', 'cork scroll'); body.appendChild(wall);
    const notes = todaysNotes();
    if (!notes.length) wall.appendChild(h('div', 'empty-note', T('No notes today. The island is managing by itself!', 'Hôm nay không có lời nhờ nào. Cả đảo tự lo được rồi!')));
    notes.forEach((n, i) => {
      const card = h('div', `note s-${n.state}`);
      card.style.setProperty('--paper', PAPER[i % 4]); card.style.setProperty('--pin', PIN[i % 4]); card.style.setProperty('--tilt', `${[-1.6, 1.2, -0.8, 1.8][i % 4]}deg`);
      const face = document.createElement('canvas'); face.width = face.height = 96; face.className = 'note-face';
      const c = face.getContext('2d'); c.lineJoin = c.lineCap = 'round';
      try { drawVillagerHead(c, 48, 52, 66, { look: RESIDENTS[n.giver].look, dir: 'down', emo: n.state === 'done' ? 'love' : 'happy' }, 1); } catch { /* no face, still a note */ }
      const prog = n.state === 'taken' ? `<div class="note-bar"><i style="width:${Math.min(100, have(n) / n.n * 100)}%"></i></div><small>${Math.min(have(n), n.n)} / ${n.n}${n.kind === 'bring' || n.kind === 'mats' ? T(' in your bag', ' trong túi') : ''}</small>` : '';
      const info = h('div', 'note-body', `<b>${escapeHtml(giverName(n))}</b><p>${escapeHtml(noteText(n))}</p>${prog}<span class="note-pay"><img src="${iconURL('coin', 32)}" alt=""> ${n.pay}k${n.present ? ' + 🎁' : ''} · 💗</span>`);
      card.append(face, info);
      if (n.state === 'open') card.appendChild(btn(T('Take note', 'Nhận lời'), () => { takeNote(n); toast({ text: T(`You took ${giverName(n)}'s note`, `Bạn nhận lời nhờ của ${giverName(n)}`), sub: escapeHtml(noteText(n)), icon: 'notebook', ms: 2600 }); api.rebuild(); }, 'buy note-btn'));
      else if (n.state === 'taken' && (n.kind === 'bring' || n.kind === 'mats')) card.appendChild(btn(T('Hand over', 'Gửi đồ'), () => { if (handIn(n)) api.rebuild(); }, 'buy note-btn', !canHandIn(n)));
      else if (n.state === 'done') card.appendChild(h('div', 'note-stamp', T('THANKS!', 'CẢM ƠN!')));
      wall.appendChild(card);
    });
    wall.appendChild(h('div', 'note-foot', T('Notes you take are counted as you play. Bring-notes are handed over here. Unfinished notes come down at midnight.', 'Lời nhờ đã nhận được tính khi bạn chơi. Mang đồ thì gửi ở đây. Lời nhờ chưa xong sẽ được gỡ lúc nửa đêm.')));
    sfx('page');
  } });
}
