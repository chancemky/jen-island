// Welcome / account screen with a gently animated island backdrop. New players can
// start right away as a guest; accounts (log in, sign up, password reset) are optional.

import * as cloud from '../systems/cloud.js';
import { T, setLang } from '../systems/state.js';
import { applyStaticText } from './statictext.js';
import { drawCat } from '../gfx/cat.js';
import { palm } from '../gfx/props.js';
import { iconURL } from '../gfx/food.js';
import { unlockAudio, sfx } from '../core/audio.js';
import { TAU } from '../core/util.js';
import { track } from '../systems/telemetry.js';

const $ = id => document.getElementById(id);
const MIN_PW = 8;

// start: 'landing' (welcome), 'login', 'signup' or 'reset' (from a reset email).
// cancellable: the Back button closes the screen and resolves null (used from inside the game).
export function showAuth({ start = 'landing', cancellable = false } = {}) {
  return new Promise(resolve => {
    const scr = $('auth'); scr.classList.remove('hidden');
    let mode = start === 'signup' ? 'signup' : 'login', alive = true;
    const tabs = [...$('authTabs').children];
    for (const img of scr.querySelectorAll('img[data-icon]')) img.src = iconURL(img.dataset.icon, 40);
    const finish = user => { alive = false; scr.classList.add('hidden'); resolve(user); };
    const show = view => {
      $('authLanding').hidden = view !== 'landing'; $('authFormWrap').hidden = view !== 'form'; $('authReset').hidden = view !== 'reset';
      if (view === 'form') setTimeout(() => $('authEmail').focus(), 200);
    };
    const label = () => {
      $('authSubmit').textContent = mode === 'login' ? T('Play', 'Lên đảo') : T('Create account', 'Tạo tài khoản');
      $('forgotBtn').hidden = mode !== 'login';
      $('authPass').autocomplete = mode === 'login' ? 'current-password' : 'new-password';
      tabs.forEach(x => x.classList.toggle('on', x.dataset.tab === mode));
    };
    const msg = (t, ok = false, el = 'authMsg') => { $(el).textContent = t; $(el).classList.toggle('ok', ok); };
    applyStaticText(); label();
    show(start === 'landing' ? 'landing' : start === 'reset' ? 'reset' : 'form');
    for (const b of document.querySelectorAll('#langPick button')) b.onclick = () => { setLang(b.dataset.lang); applyStaticText(); label(); sfx('ui'); };
    tabs.forEach(b => b.onclick = () => { mode = b.dataset.tab; label(); msg(''); sfx('ui'); });
    animateBg($('authBg'), () => alive);
    $('playGuest').onclick = () => { unlockAudio(); sfx('success'); track('guest_start'); finish(cloud.guestUser(true)); };
    $('showLogin').onclick = () => { sfx('ui'); show('form'); };
    $('authBack').onclick = () => { sfx('back'); msg(''); if (cancellable) finish(null); else show('landing'); };
    $('pwEye').onclick = () => { const i = $('authPass'); i.type = i.type === 'password' ? 'text' : 'password'; $('pwEye').classList.toggle('on', i.type === 'text'); };
    $('forgotBtn').onclick = async () => {
      const email = $('authEmail').value.trim();
      if (!/^\S+@\S+\.\S+$/.test(email)) { sfx('error'); return msg(T('Type your email above, then tap “Forgot your password?” again.', 'Nhập email ở trên, rồi bấm “Quên mật khẩu?” lần nữa.')); }
      try { await cloud.requestPasswordReset(email); sfx('success'); msg(T('Check your inbox: we sent a link to choose a new password.', 'Kiểm tra hộp thư: chúng tôi đã gửi liên kết để đặt mật khẩu mới.'), true); }
      catch (err) { sfx('error'); msg(err.status === 429 ? T('Too many attempts — try again in a few minutes.', 'Thử lại sau ít phút nhé.') : T('Could not send the email. ', 'Không gửi được email. ') + (err.message || '')); }
    };
    $('authForm').onsubmit = async e => {
      e.preventDefault(); unlockAudio();
      const email = $('authEmail').value.trim(), pass = $('authPass').value;
      if (!/^\S+@\S+\.\S+$/.test(email)) return msg(T('Please enter a valid email.', 'Email chưa đúng.'));
      if (mode === 'signup' && pass.length < MIN_PW) return msg(T(`Password needs at least ${MIN_PW} characters.`, `Mật khẩu cần ít nhất ${MIN_PW} ký tự.`));
      const btn = $('authSubmit'); btn.disabled = true; msg(mode === 'login' ? T('Signing in…', 'Đang đăng nhập…') : T('Creating your account…', 'Đang tạo tài khoản…'), true);
      try {
        const user = mode === 'login' ? await cloud.signIn(email, pass) : await cloud.signUp(email, pass);
        sfx('success'); track(mode === 'login' ? 'login' : 'signup', { fromGuest: cancellable }); finish(user);
      } catch (err) {
        sfx('error');
        if (err.confirm) msg(T('Check your inbox to confirm your account, then log in.', 'Kiểm tra email để xác nhận tài khoản, rồi đăng nhập.'));
        else if (/invalid/i.test(err.message)) msg(T('Wrong email or password.', 'Sai email hoặc mật khẩu.'));
        else if (/registered|exists/i.test(err.message)) msg(T('That email already has an account — please log in.', 'Email này đã có tài khoản — hãy đăng nhập.'));
        else if (/weak|password/i.test(err.message)) msg(T('Please choose a stronger password.', 'Hãy chọn mật khẩu mạnh hơn.'));
        else if (err.status === 429) msg(T('Too many attempts — try again in a few minutes.', 'Thử lại sau ít phút nhé.'));
        else msg(T('Could not connect. ', 'Không kết nối được. ') + (err.message || ''));
      } finally { btn.disabled = false; }
    };
    $('authReset').onsubmit = async e => {
      e.preventDefault();
      const pass = $('resetPass').value;
      if (pass.length < MIN_PW) return msg(T(`Password needs at least ${MIN_PW} characters.`, `Mật khẩu cần ít nhất ${MIN_PW} ký tự.`), false, 'resetMsg');
      $('resetSubmit').disabled = true;
      try { await cloud.setNewPassword(pass); sfx('success'); finish(cloud.currentUser()); }
      catch (err) { sfx('error'); msg(/weak|password/i.test(err.message) ? T('Please choose a stronger password.', 'Hãy chọn mật khẩu mạnh hơn.') : T('Could not save the password. ', 'Không lưu được mật khẩu. ') + (err.message || ''), false, 'resetMsg'); }
      finally { $('resetSubmit').disabled = false; }
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
