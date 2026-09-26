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

export function sfx(name, opt = {}) {
  if (!ctx || !started || !state.sfx) return;
  switch (name) {
    case 'blip': { const now = performance.now(); if (now - state.lastBlip < 45) return; state.lastBlip = now; tone((opt.pitch || 620) * (0.94 + Math.random() * 0.12), 0.05, { type: 'triangle', vol: 0.09 }); break; }
    case 'quack': tone(420, 0.09, { type: 'sawtooth', vol: 0.07, slide: -120 }); tone(400, 0.11, { type: 'sawtooth', vol: 0.07, slide: -150, when: 0.13 }); break;
    case 'woof': tone(230, 0.12, { type: 'square', vol: 0.07, slide: -90 }); tone(260, 0.1, { type: 'square', vol: 0.06, slide: -120, when: 0.16 }); break;
    case 'cluck': for (let i = 0; i < 3; i++) tone(700 + i * 60, 0.05, { type: 'triangle', vol: 0.08, slide: -200, when: i * 0.08 }); break;
    case 'coo': tone(360, 0.25, { type: 'sine', vol: 0.09, slide: 60 }); tone(330, 0.2, { type: 'sine', vol: 0.07, slide: -40, when: 0.26 }); break;
    case 'bleat': tone(520, 0.35, { type: 'sawtooth', vol: 0.05, slide: -60, vibrato: 18 }); break;
    case 'click': for (let i = 0; i < 4; i++) tone(1800, 0.02, { type: 'square', vol: 0.05, when: i * 0.06 }); break;
    case 'mew': tone(900, 0.16, { type: 'triangle', vol: 0.11, slide: 200, attack: 0.02 }); break;
    case 'splash': tone(300, 0.18, { type: 'sine', vol: 0.06, slide: -200 }); tone(900, 0.08, { type: 'triangle', vol: 0.04, slide: -500, when: 0.02 }); break;
    case 'meow': tone(740, 0.22, { type: 'triangle', vol: 0.13, slide: 260, attack: 0.02 }); tone(980, 0.18, { type: 'sine', vol: 0.07, slide: -300, when: 0.12 }); break;
    case 'tap': tone(520, 0.06, { type: 'sine', vol: 0.18, slide: 180 }); break;
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
