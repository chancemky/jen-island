// Account screen with a gently animated island backdrop.

import * as cloud from '../systems/cloud.js';
import { drawCat } from '../gfx/cat.js';
import { palm } from '../gfx/props.js';
import { unlockAudio, sfx } from '../core/audio.js';
import { TAU } from '../core/util.js';

const $ = id => document.getElementById(id);

export function showAuth() {
  return new Promise(resolve => {
    const scr = $('auth'); scr.classList.remove('hidden');
    let mode = 'login';
    const tabs = [...$('authTabs').children];
    tabs.forEach(b => b.onclick = () => { mode = b.dataset.tab; tabs.forEach(x => x.classList.toggle('on', x === b)); $('authSubmit').textContent = mode === 'login' ? 'Lên đảo · Play' : 'Tạo tài khoản · Create account'; $('authPass').autocomplete = mode === 'login' ? 'current-password' : 'new-password'; $('authMsg').textContent = ''; sfx('ui'); });
    const msg = (t, ok = false) => { $('authMsg').textContent = t; $('authMsg').classList.toggle('ok', ok); };
    let alive = true;
    animateBg($('authBg'), () => alive);
    $('authForm').onsubmit = async e => {
      e.preventDefault(); unlockAudio();
      const email = $('authEmail').value.trim(), pass = $('authPass').value;
      if (!/^\S+@\S+\.\S+$/.test(email)) return msg('Email chưa đúng · Please enter a valid email.');
      if (pass.length < 6) return msg('Mật khẩu ít nhất 6 ký tự · Password needs 6+ characters.');
      const btn = $('authSubmit'); btn.disabled = true; msg(mode === 'login' ? 'Đang đăng nhập…' : 'Đang tạo tài khoản…', true);
      try {
        const user = mode === 'login' ? await cloud.signIn(email, pass) : await cloud.signUp(email, pass);
        sfx('success'); alive = false;
        scr.classList.add('hidden');
        resolve(user);
      } catch (err) {
        sfx('error');
        if (err.confirm) msg('Kiểm tra email để xác nhận tài khoản, rồi đăng nhập. · Check your inbox to confirm, then log in.');
        else if (/invalid/i.test(err.message)) msg('Sai email hoặc mật khẩu · Wrong email or password.');
        else if (/registered|exists/i.test(err.message)) msg('Email này đã có tài khoản — hãy đăng nhập. · Account exists, please log in.');
        else if (err.status === 429) msg('Thử lại sau ít phút · Too many attempts, try again shortly.');
        else msg((err.message || 'Không kết nối được') + ' · Could not connect.');
      } finally { btn.disabled = false; }
    };
  });
}

function animateBg(cv, alive) {
  const c = cv.getContext('2d');
  const cat = { dir: 'down', moving: 0, walkPh: 0, seed: 2, emo: 'happy', blinkAmt: 0, act: 'wave', actT: 0, look: { cat: true } };
  const t0 = performance.now();
  const frame = now => {
    if (!alive()) return;
    const t = (now - t0) / 1000, dpr = Math.min(2, devicePixelRatio || 1), r = cv.getBoundingClientRect();
    if (cv.width !== Math.round(r.width * dpr)) { cv.width = r.width * dpr; cv.height = r.height * dpr; }
    const W = r.width, H = r.height;
    c.setTransform(dpr, 0, 0, dpr, 0, 0); c.lineJoin = 'round'; c.lineCap = 'round';
    const sky = c.createLinearGradient(0, 0, 0, H * 0.5); sky.addColorStop(0, '#8fd3f0'); sky.addColorStop(1, '#e6f7fb');
    c.fillStyle = sky; c.fillRect(0, 0, W, H);
    for (let i = 0; i < 5; i++) { const x = ((i * 190 + t * 8) % (W + 200)) - 100, y = 50 + (i * 47) % 140; c.fillStyle = 'rgba(255,255,255,.9)'; for (const [dx, dy, rr] of [[0, 0, 20], [20, 4, 16], [-20, 6, 14]]) { c.beginPath(); c.arc(x + dx, y + dy, rr, 0, TAU); c.fill(); } }
    const sea = H * 0.42;
    c.fillStyle = '#5ec2cf'; c.fillRect(0, sea, W, H - sea);
    for (let row = 0; row < 6; row++) { const y = sea + 10 + row * 16, off = (t * (14 + row * 6)) % 40; c.strokeStyle = 'rgba(255,255,255,.45)'; c.lineWidth = 1.5; c.beginPath(); for (let x = -40 - off; x < W + 40; x += 40) { c.moveTo(x, y); c.quadraticCurveTo(x + 10, y - 3, x + 20, y); } c.stroke(); }
    // island mound
    c.fillStyle = '#f5e2b3'; c.beginPath(); c.ellipse(W / 2, sea + 44, W * 0.62, 70, 0, Math.PI, TAU); c.fill();
    c.fillStyle = '#a3d68a'; c.beginPath(); c.ellipse(W / 2, sea + 56, W * 0.52, 66, 0, Math.PI, TAU); c.fill();
    c.save(); c.translate(W * 0.18, sea + 10); c.scale(1.1, 1.1); palm(c, t, { x: 1, h: 90 }); c.restore();
    c.save(); c.translate(W * 0.86, sea + 16); c.scale(-1, 1); palm(c, t, { x: 7, h: 76 }); c.restore();
    // Mèo Mây waving hello
    cat.actT = t; cat.blinkAmt = Math.sin(t * 1.3) > 0.97 ? 1 : 0; cat.hop = Math.max(0, Math.sin(t * 2.4)) * 3; cat.headTilt = Math.sin(t * 0.9) * 0.1;
    c.save(); c.translate(W / 2, sea + 8); c.scale(3.2, 3.2); drawCat(c, cat, t); c.restore();
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
