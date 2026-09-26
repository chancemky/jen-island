// Synthesized audio (no files to fail loading). iOS Safari only allows audio
// after a user gesture, so the context is created/resumed on first touch.
// Music is a soft generative pentatonic loop with a day and a night mood.

let ctx = null, master = null, musicGain = null, sfxGain = null, started = false;
const state = { music: true, sfx: true, mood: 'day', nextNote: 0, step: 0, lastBlip: 0 };

export function unlockAudio() {
  try {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
      musicGain = ctx.createGain(); musicGain.gain.value = state.music ? 0.22 : 0; musicGain.connect(master);
      sfxGain = ctx.createGain(); sfxGain.gain.value = state.sfx ? 0.55 : 0; sfxGain.connect(master);
    }
    if (ctx.state === 'suspended') ctx.resume();
    // iOS needs a sound started inside the gesture to fully unlock
    const b = ctx.createBuffer(1, 1, 22050), s = ctx.createBufferSource(); s.buffer = b; s.connect(ctx.destination); s.start(0);
    started = true;
  } catch (e) { console.warn('audio', e); }
}
export function setAudio(opts) {
  Object.assign(state, opts);
  if (musicGain) musicGain.gain.setTargetAtTime(state.music ? 0.22 : 0, ctx.currentTime, 0.3);
  if (sfxGain) sfxGain.gain.setTargetAtTime(state.sfx ? 0.55 : 0, ctx.currentTime, 0.05);
}
export function suspendAudio(on) { if (!ctx) return; if (on) ctx.suspend?.(); else ctx.resume?.(); }
export function setMood(m) { state.mood = m; }

function tone(freq, dur, { type = 'sine', vol = 0.3, attack = 0.005, decay = null, slide = 0, dest = sfxGain, when = 0, detune = 0 } = {}) {
  if (!ctx || !dest) return;
  const t = ctx.currentTime + when;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t); o.detune.value = detune;
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + (decay ?? dur));
  o.connect(g); g.connect(dest);
  o.start(t); o.stop(t + (decay ?? dur) + 0.05);
}
function noise(dur, { vol = 0.2, freq = 1200, q = 1, when = 0, type = 'bandpass' } = {}) {
  if (!ctx) return;
  const t = ctx.currentTime + when;
  const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const s = ctx.createBufferSource(); s.buffer = buf;
  const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = ctx.createGain(); g.gain.value = vol;
  s.connect(f); f.connect(g); g.connect(sfxGain); s.start(t);
}


// A tiny animal "voice": a buzzy source whose pitch follows a contour, shaped
// by two moving formant filters (the "mouth"), with optional vibrato and breath.
// pts: [[time, pitch, F1, F2], ...]
function voice(pts, { vol = 0.12, type = 'sawtooth', vib = 0, vibRate = 7, when = 0, breath = 0, q = 7 } = {}) {
  if (!ctx || !sfxGain) return;
  const t0 = ctx.currentTime + when, end = t0 + pts[pts.length - 1][0];
  const o = ctx.createOscillator(); o.type = type;
  const f1 = ctx.createBiquadFilter(), f2 = ctx.createBiquadFilter(); f1.type = f2.type = 'bandpass'; f1.Q.value = q; f2.Q.value = q * 1.3;
  const g = ctx.createGain(), mix = ctx.createGain(); mix.gain.value = 1.6;
  o.frequency.setValueAtTime(pts[0][1], t0); f1.frequency.setValueAtTime(pts[0][2], t0); f2.frequency.setValueAtTime(pts[0][3], t0);
  for (const [dt, f, a, b] of pts.slice(1)) { o.frequency.linearRampToValueAtTime(f, t0 + dt); f1.frequency.linearRampToValueAtTime(a, t0 + dt); f2.frequency.linearRampToValueAtTime(b, t0 + dt); }
  if (vib) { const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = vibRate; lg.gain.value = vib; l.connect(lg); lg.connect(o.frequency); l.start(t0); l.stop(end + 0.05); }
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.02); g.gain.setValueAtTime(vol, Math.max(t0 + 0.03, end - 0.06)); g.gain.exponentialRampToValueAtTime(0.0001, end);
  o.connect(f1); o.connect(f2); f1.connect(mix); f2.connect(mix); mix.connect(g); g.connect(sfxGain);
  o.start(t0); o.stop(end + 0.05);
  if (breath) noise(pts[pts.length - 1][0], { vol: breath, freq: pts[0][3], q: 1.2, when });
}

export function sfx(name, opt = {}) {
  if (!ctx || !started || !state.sfx) return;
  switch (name) {
    case 'blip': { const now = performance.now(); if (now - state.lastBlip < 45) return; state.lastBlip = now; tone((opt.pitch || 620) * (0.94 + Math.random() * 0.12), 0.05, { type: 'triangle', vol: 0.09 }); break; }
    case 'quack': for (const w of [0, 0.2]) voice([[0, 300, 900, 2400], [0.05, 320, 1100, 2600], [0.16, 240, 800, 2200]], { vol: 0.16, q: 9, when: w, breath: 0.03 }); break;
    case 'woof': for (const w of [0, 0.22]) { voice([[0, 330, 700, 1500], [0.04, 420, 900, 1700], [0.14, 210, 500, 1200]], { vol: 0.2, q: 4, when: w, breath: 0.09 }); } break;
    case 'cluck': { for (let i = 0; i < 3; i++) voice([[0, 520, 900, 2000], [0.03, 600, 1100, 2300], [0.08, 460, 800, 1800]], { vol: 0.12, q: 6, when: i * 0.13 }); voice([[0, 480, 700, 1700], [0.12, 720, 1100, 2300], [0.34, 620, 900, 2000]], { vol: 0.12, q: 6, when: 0.42 }); break; }
    case 'coo': voice([[0, 300, 350, 800], [0.12, 340, 380, 850], [0.34, 290, 320, 750]], { type: 'triangle', vol: 0.14, q: 3, vib: 6, vibRate: 11 }); voice([[0, 320, 350, 800], [0.2, 280, 320, 740]], { type: 'triangle', vol: 0.12, q: 3, when: 0.42 }); break;
    case 'bleat': voice([[0, 460, 600, 1700], [0.08, 520, 750, 1900], [0.55, 430, 650, 1600], [0.7, 380, 550, 1500]], { vol: 0.16, q: 6, vib: 45, vibRate: 13, breath: 0.03 }); break;
    case 'snip': tone(2400, 0.03, { type: 'square', vol: 0.05, slide: -900 }); tone(2000, 0.03, { type: 'square', vol: 0.04, slide: -700, when: 0.07 }); break;
    case 'slurp': tone(500, 0.18, { type: 'sine', vol: 0.06, slide: 300, vibrato: 30 }); break;
    case 'munch': for (let i = 0; i < 2; i++) tone(180 + Math.random() * 60, 0.05, { type: 'square', vol: 0.05, slide: -60, when: i * 0.09 }); break;
    case 'moo': voice([[0, 140, 400, 900], [0.3, 160, 600, 1000], [0.9, 120, 350, 800]], { vol: 0.2, q: 5, vib: 3 }); break;
    case 'fishsplash': noise(0.25, { vol: 0.12, freq: 1400, q: 0.8 }); tone(700, 0.08, { type: 'sine', vol: 0.05, slide: -400, when: 0.02 }); break;
    case 'click': for (let i = 0; i < 4; i++) tone(1800, 0.02, { type: 'square', vol: 0.05, when: i * 0.06 }); break;
    case 'mew': voice([[0, 700, 450, 2200], [0.1, 950, 700, 1900], [0.28, 800, 750, 1300], [0.4, 620, 550, 1000]], { vol: 0.13, q: 7, vib: 8, vibRate: 6 }); break;
    case 'splash': tone(300, 0.18, { type: 'sine', vol: 0.06, slide: -200 }); tone(900, 0.08, { type: 'triangle', vol: 0.04, slide: -500, when: 0.02 }); break;
    case 'meow': voice([[0, 620, 420, 2300], [0.14, 880, 800, 1800], [0.4, 760, 750, 1200], [0.62, 560, 500, 900]], { vol: 0.15, q: 7, vib: 10, vibRate: 6 }); break;
    case 'tap': tone(520, 0.06, { type: 'sine', vol: 0.18, slide: 180 }); break;
    case 'hop': tone(300, 0.12, { type: 'sine', vol: 0.12, slide: 360 }); break;
    case 'pop': tone(420, 0.09, { type: 'sine', vol: 0.22, slide: 520 }); break;
    case 'ui': tone(700, 0.05, { type: 'triangle', vol: 0.12 }); break;
    case 'back': tone(520, 0.08, { type: 'triangle', vol: 0.12, slide: -200 }); break;
    case 'coin': tone(988, 0.08, { type: 'square', vol: 0.07 }); tone(1319, 0.22, { type: 'square', vol: 0.07, when: 0.07 }); break;
    case 'cash': for (let i = 0; i < 3; i++) tone(1200 + i * 180, 0.07, { type: 'square', vol: 0.05, when: i * 0.05 }); noise(0.08, { vol: 0.08, freq: 5000, when: 0.05 }); break;
    case 'buy': tone(660, 0.07, { type: 'triangle', vol: 0.15 }); tone(880, 0.12, { type: 'triangle', vol: 0.15, when: 0.06 }); break;
    case 'error': tone(220, 0.14, { type: 'square', vol: 0.06 }); tone(180, 0.16, { type: 'square', vol: 0.06, when: 0.1 }); break;
    case 'step': noise(0.03, { vol: 0.035, freq: 900 + Math.random() * 300, q: 2 }); break;
    case 'door': noise(0.18, { vol: 0.12, freq: 380, q: 3 }); tone(160, 0.12, { type: 'sine', vol: 0.08, slide: -40 }); break;
    case 'chop': noise(0.05, { vol: 0.25, freq: 2400, q: 1.5 }); tone(300, 0.05, { type: 'triangle', vol: 0.08 }); break;
    case 'sizzle': noise(0.5, { vol: 0.12, freq: 6000, q: 0.6, type: 'highpass' }); break;
    case 'pour': for (let i = 0; i < 6; i++) tone(500 + i * 90, 0.06, { type: 'sine', vol: 0.06, when: i * 0.035 }); break;
    case 'ice': for (let i = 0; i < 3; i++) tone(2400 + Math.random() * 800, 0.04, { type: 'triangle', vol: 0.06, when: i * 0.06 }); break;
    case 'whoosh': noise(0.25, { vol: 0.14, freq: 800, q: 0.8 }); break;
    case 'hammer': noise(0.06, { vol: 0.3, freq: 900, q: 2 }); tone(180, 0.08, { type: 'square', vol: 0.06 }); break;
    case 'sparkle': for (let i = 0; i < 5; i++) tone(1568 * Math.pow(1.122, i), 0.12, { type: 'sine', vol: 0.06, when: i * 0.05 }); break;
    case 'success': [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.18, { type: 'triangle', vol: 0.12, when: i * 0.08 })); break;
    case 'fanfare': [523, 659, 784, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, { type: 'triangle', vol: 0.13, when: i * 0.11 })); break;
    case 'sad': tone(392, 0.2, { type: 'triangle', vol: 0.1 }); tone(330, 0.3, { type: 'triangle', vol: 0.1, when: 0.16 }); break;
    case 'bell': tone(1318, 0.8, { type: 'sine', vol: 0.12, decay: 0.9 }); tone(1975, 0.6, { type: 'sine', vol: 0.05, decay: 0.7 }); break;
    case 'horn': tone(220, 0.5, { type: 'sawtooth', vol: 0.05, attack: 0.05 }); tone(277, 0.5, { type: 'sawtooth', vol: 0.04, attack: 0.05 }); break;
    case 'beep': tone(880, 0.07, { type: 'square', vol: 0.04 }); tone(880, 0.07, { type: 'square', vol: 0.04, when: 0.11 }); break;
    case 'splash': noise(0.3, { vol: 0.12, freq: 1600, q: 0.7 }); break;
    case 'blend': noise(0.6, { vol: 0.1, freq: 500, q: 3 }); tone(140, 0.6, { type: 'sawtooth', vol: 0.03, slide: 60 }); break;
    case 'page': noise(0.12, { vol: 0.08, freq: 3000, q: 0.8 }); break;
  }
}

// ---------------------------------------------------------------- music
const SCALES = { day: [0, 2, 4, 7, 9, 12, 14, 16], night: [0, 3, 5, 7, 10, 12, 15, 17] };
const PROG = { day: [0, 5, 3, 4], night: [0, 3, 5, 4] };
export function musicTick() {
  if (!ctx || !started || !state.music || ctx.state !== 'running') return;
  const now = ctx.currentTime;
  if (state.nextNote < now - 1) state.nextNote = now + 0.1;
  while (state.nextNote < now + 0.4) {
    const beat = 60 / (state.mood === 'night' ? 76 : 88) / 2;
    const s = state.step, bar = Math.floor(s / 8) % 4;
    const root = (state.mood === 'night' ? 57 : 60) + [0, 5, 3, 4][bar] * (PROG[state.mood][bar] === 0 ? 0 : 1);
    const scale = SCALES[state.mood] || SCALES.day;
    const hz = n => 440 * Math.pow(2, (n - 69) / 12);
    const when = state.nextNote - now;
    if (s % 8 === 0) { tone(hz(root - 24), beat * 7, { type: 'sine', vol: 0.12, attack: 0.08, decay: beat * 7, dest: musicGain, when }); tone(hz(root - 12 + 7), beat * 6, { type: 'triangle', vol: 0.05, attack: 0.1, decay: beat * 6, dest: musicGain, when }); }
    // plucked melody on a gentle random walk, with rests
    if (Math.random() < (s % 2 ? 0.45 : 0.75)) {
      state.mel = Math.max(0, Math.min(scale.length - 1, (state.mel ?? 3) + Math.round((Math.random() - 0.5) * 3)));
      const n = root + scale[state.mel];
      tone(hz(n), beat * 1.6, { type: 'triangle', vol: 0.07, attack: 0.004, decay: beat * 1.8, dest: musicGain, when });
      tone(hz(n + 12), beat, { type: 'sine', vol: 0.02, attack: 0.004, decay: beat * 1.2, dest: musicGain, when });
    }
    if (s % 4 === 2) noise(0.03, { vol: 0.02, freq: 7000, q: 1, when });
    state.nextNote += beat; state.step++;
  }
}
