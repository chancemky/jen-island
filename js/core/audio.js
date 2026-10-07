// Synthesized audio (no files to fail loading). iOS Safari only allows audio
// after a user gesture, so the context is created/resumed on first touch.
// Music: composed songs (core/music.js, data/songs.js) chosen by the game for the place
// and the time of day; a radio or record player in a room plays its own little tune.

import { initMusic, musicFrame, instNote, stinger as musicStinger } from './music.js';
import { hapticFor } from './haptics.js';

let ctx = null, master = null, musicGain = null, sfxGain = null, sfxWet = null, started = false;
const state = { music: true, sfx: true, musicVol: 0.8, sfxVol: 0.8, mood: 'day', nextNote: 0, step: 0, lastBlip: 0 };
// slider 0..1 → gain, on a gentle curve so the low end of the slider stays usable
const curve = v => Math.pow(Math.max(0, Math.min(1, v)), 1.6);
const musicLevel = () => state.music ? 0.28 * curve(state.musicVol) : 0;
const sfxLevel = () => state.sfx ? 0.7 * curve(state.sfxVol) : 0;

export function unlockAudio() {
  try {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
      musicGain = ctx.createGain(); musicGain.gain.value = musicLevel(); musicGain.connect(master);
      sfxGain = ctx.createGain(); sfxGain.gain.value = sfxLevel(); sfxGain.connect(master);
      // a small, warm room for the effects (a wet send most sounds use a little of)
      const len = Math.floor(ctx.sampleRate * 0.9), ir = ctx.createBuffer(2, len, ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 4); }
      const verb = ctx.createConvolver(); verb.buffer = ir; sfxWet = ctx.createGain(); sfxWet.gain.value = 0.22; sfxWet.connect(verb); verb.connect(sfxGain);
      initMusic(ctx, musicGain);
    }
    if (ctx.state !== 'running') ctx.resume?.().catch?.(() => {});
    // iOS needs a sound started inside the gesture to fully unlock
    const b = ctx.createBuffer(1, 1, 22050), s = ctx.createBufferSource(); s.buffer = b; s.connect(ctx.destination); s.start(0);
    started = true;
  } catch (e) { console.warn('audio', e); }
}
export const audioRunning = () => !!ctx && ctx.state === 'running';
export const __audioProbe = () => ({ ctx, master });     // (tests/audio.html measures levels here)
export function setAudio(opts) {
  Object.assign(state, opts);
  if (musicGain) musicGain.gain.setTargetAtTime(musicLevel(), ctx.currentTime, 0.15);
  if (sfxGain) sfxGain.gain.setTargetAtTime(sfxLevel(), ctx.currentTime, 0.05);
}
export function suspendAudio(on) { if (!ctx) return; if (on) ctx.suspend?.(); else ctx.resume?.(); }
export function setMood(m) { state.mood = m; }
// which song should play right now (main.js decides from the place and the time)
let chooseSong = () => state.mood === 'night' ? 'night' : 'day';
export function setSongChooser(fn) { chooseSong = fn; }
// a radio or record player playing in the room you're in (null = the island's own music)
const ROOM = { radio: { bpm: 104, scale: [0, 2, 4, 5, 7, 9, 11, 12], root: 62, wave: 'square', vol: 0.035 }, record: { bpm: 66, scale: [0, 3, 5, 7, 10, 12, 14, 15], root: 55, wave: 'sine', vol: 0.09 }, tv: { bpm: 120, scale: [0, 2, 4, 7, 9, 12], root: 64, wave: 'triangle', vol: 0.05 } };
export function setRoomMusic(style) { state.room = ROOM[style] ? style : null; }
export const roomMusic = () => state.room || null;
// one piano note (midi number): a soft hammer and a decaying string
export function playNote(n, vol = 0.14) {
  if (!ctx || !started || !state.sfx || ctx.state !== 'running') return;
  const hz = 440 * Math.pow(2, (n - 69) / 12);
  tone(hz, 1.2, { type: 'triangle', vol, attack: 0.004, decay: 1.3 }); tone(hz * 2, 0.5, { type: 'sine', vol: vol * 0.25, attack: 0.004, decay: 0.6 });
}

function tone(freq, dur, { type = 'sine', vol = 0.3, attack = 0.005, decay = null, slide = 0, dest = sfxGain, when = 0, detune = 0, wet = 0, pan = 0, lp = 0 } = {}) {
  if (!ctx || !dest) return;
  const t = ctx.currentTime + when;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t); o.detune.value = detune;
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + (decay ?? dur));
  let src = o; if (lp) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; o.connect(f); src = f; }
  src.connect(g);
  let out = g; if (pan && ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = pan; g.connect(p); out = p; }
  out.connect(dest); if (wet && sfxWet && dest === sfxGain) { const w = ctx.createGain(); w.gain.value = wet; out.connect(w); w.connect(sfxWet); }
  o.start(t); o.stop(t + (decay ?? dur) + 0.05);
}
// a note from the band (core/music.js) as a sound effect: m is a midi number
const inst = (name, m, vol, when = 0, dur = 0.3, pan = 0) => instNote(name, sfxGain, m, dur, vol, when, pan);
// Scooter horn: two slightly dissonant buzzy tones through a small speaker (band-limited), with a flutter
function horn(when, dur) {
  if (!ctx || !sfxGain) return;
  const t = ctx.currentTime + when;
  const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1100; f.Q.value = 0.9;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2600;
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.11, t + 0.012); g.gain.setValueAtTime(0.11, t + dur - 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 38; lg.gain.value = 0.025; lfo.connect(lg); lg.connect(g.gain);
  for (const [hz, type] of [[415, 'sawtooth'], [498, 'square']]) { const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(hz * 0.97, t); o.frequency.linearRampToValueAtTime(hz, t + 0.03); o.connect(f); o.start(t); o.stop(t + dur + 0.05); }
  f.connect(lp); lp.connect(g); g.connect(sfxGain); lfo.start(t); lfo.stop(t + dur + 0.05);
}
function noise(dur, { vol = 0.2, freq = 1200, q = 1, when = 0, type = 'bandpass', to = 0, wet = 0 } = {}) {
  if (!ctx) return;
  const t = ctx.currentTime + when;
  const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const s = ctx.createBufferSource(); s.buffer = buf;
  const f = ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
  if (to) f.frequency.exponentialRampToValueAtTime(to, t + dur);
  const g = ctx.createGain(); g.gain.value = vol;
  s.connect(f); f.connect(g); g.connect(sfxGain); if (wet && sfxWet) { const w = ctx.createGain(); w.gain.value = wet; g.connect(w); w.connect(sfxWet); } s.start(t);
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
  hapticFor(name);
  if (!ctx || !started || !state.sfx || ctx.state !== 'running') return;
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
    case 'pop': tone(380, 0.08, { type: 'sine', vol: 0.2, slide: 560, wet: 0.2 }); tone(1400, 0.03, { type: 'sine', vol: 0.04, when: 0.05 }); break;
    case 'ui': inst('marimba', 84, 0.11, 0, 0.1); break;
    case 'back': inst('marimba', 79, 0.09); inst('marimba', 72, 0.08, 0.06); break;
    case 'coin': inst('bells', 95, 0.09, 0, 0.1, 0.2); inst('bells', 100, 0.1, 0.07, 0.3, 0.3); tone(1976, 0.05, { type: 'square', vol: 0.02, lp: 4000 }); break;
    case 'cash': noise(0.07, { vol: 0.12, freq: 2200, q: 2 }); noise(0.1, { vol: 0.08, freq: 900, q: 3, when: 0.05 }); inst('bells', 96, 0.11, 0.1, 0.4, 0.25); inst('bells', 100, 0.08, 0.16, 0.6, 0.3); break;   // cha-ching: the drawer, then the bell
    case 'buy': [72, 76, 79].forEach((m, i) => inst('marimba', m, 0.13, i * 0.055)); inst('bells', 91, 0.04, 0.17); break;
    case 'error': tone(196, 0.14, { type: 'triangle', vol: 0.14, lp: 900 }); tone(165, 0.2, { type: 'triangle', vol: 0.13, when: 0.11, lp: 800 }); break;
    case 'step': noise(0.03, { vol: 0.035, freq: 900 + Math.random() * 300, q: 2 }); break;
    case 'door': noise(0.22, { vol: 0.1, freq: 420, q: 4, to: 300 }); tone(150, 0.1, { type: 'sine', vol: 0.1, slide: -40 }); inst('bells', 88, 0.05, 0.06, 0.5, 0.3); inst('bells', 93, 0.035, 0.13, 0.5, -0.3); break;   // a creak, the latch and the shop bell
    case 'chop': noise(0.035, { vol: 0.22, freq: 3200, q: 1.2 }); tone(170, 0.08, { type: 'sine', vol: 0.18, slide: -60 }); break;   // the knife, then the wooden board
    case 'sizzle': noise(0.6, { vol: 0.1, freq: 5000, q: 0.6, type: 'highpass' }); for (let i = 0; i < 6; i++) noise(0.012, { vol: 0.12, freq: 3000 + Math.random() * 3000, q: 4, when: Math.random() * 0.55 }); break;
    case 'pour': noise(0.5, { vol: 0.2, freq: 500, q: 6, to: 1400, wet: 0.2 }); for (let i = 0; i < 5; i++) tone(500 + i * 120 + Math.random() * 60, 0.05, { type: 'sine', vol: 0.09, slide: 240, when: 0.05 + i * 0.08 }); break;   // liquid rising in the cup, with bubbles
    case 'ice': for (let i = 0; i < 4; i++) { const w = i * 0.055 + Math.random() * 0.02; noise(0.03, { vol: 0.18, freq: 4200 + Math.random() * 1500, q: 18, when: w }); tone(2600 + Math.random() * 900, 0.05, { type: 'sine', vol: 0.09, when: w, pan: (Math.random() - 0.5) * 0.6 }); } break;   // cubes clinking against glass
    case 'whoosh': noise(0.25, { vol: 0.14, freq: 800, q: 0.8 }); break;
    case 'hammer': noise(0.06, { vol: 0.3, freq: 900, q: 2 }); tone(180, 0.08, { type: 'square', vol: 0.06 }); break;
    case 'sparkle': [84, 88, 91, 93, 96].forEach((m, i) => inst('musicbox', m, 0.07, i * 0.05, 0.2, (i - 2) * 0.15)); break;
    case 'success': [60, 64, 67, 72].forEach((m, i) => inst('kalimba', m + 12, 0.13, i * 0.07)); inst('bells', 91, 0.05, 0.3, 0.6); break;
    case 'fanfare': [[72, 0], [76, 0.1], [79, 0.2], [76, 0.33], [79, 0.43], [84, 0.55]].forEach(([m, w]) => { tone(440 * Math.pow(2, (m - 69) / 12), 0.22, { type: 'sawtooth', vol: 0.05, when: w, lp: 2200, wet: 0.3 }); inst('bells', m + 12, 0.04, w); }); [60, 64, 67].forEach(m => inst('strings', m, 0.04, 0.55, 0.8)); break;
    case 'sad': tone(392, 0.2, { type: 'triangle', vol: 0.1 }); tone(330, 0.3, { type: 'triangle', vol: 0.1, when: 0.16 }); break;
    case 'bell': tone(1318, 0.8, { type: 'sine', vol: 0.12, decay: 0.9 }); tone(1975, 0.6, { type: 'sine', vol: 0.05, decay: 0.7 }); break;
    case 'horn': tone(220, 0.5, { type: 'sawtooth', vol: 0.05, attack: 0.05 }); tone(277, 0.5, { type: 'sawtooth', vol: 0.04, attack: 0.05 }); break;
    case 'beep': horn(0, 0.13); horn(0.2, 0.26); break;          // a scooter's two-tone electric horn: bíp-bíiip
    case 'blend': noise(0.7, { vol: 0.16, freq: 400, q: 3, to: 900 }); tone(120, 0.7, { type: 'sawtooth', vol: 0.06, slide: 80, lp: 700 }); for (let i = 0; i < 4; i++) noise(0.03, { vol: 0.06, freq: 2500, q: 8, when: 0.1 + i * 0.13 }); break;   // the motor, and ice knocking the jar
    case 'page': noise(0.14, { vol: 0.07, freq: 2600, q: 0.8, to: 4200 }); noise(0.05, { vol: 0.05, freq: 1500, q: 1, when: 0.1 }); break;
  }
}

// a short musical moment over the song (level up, a new chapter, a prize…)
export function stinger(id) {
  if (!ctx || !started || ctx.state !== 'running') return;
  if (!state.music) { if (id !== 'morning') sfx(id === 'friend' ? 'sparkle' : 'fanfare'); return; }    // music off: the plain effect instead
  musicStinger(id, musicGain);
}

// ---------------------------------------------------------------- music
export function musicTick() {
  if (!ctx || !started || ctx.state !== 'running') return;
  const radio = ROOM[state.room];
  musicFrame(state.music && !radio ? chooseSong() : null);
  if (!state.music || !radio) return;
  // the room's radio / record player: a little tune on its own wavelength
  const now = ctx.currentTime;
  if (state.nextNote < now - 1) state.nextNote = now + 0.1;
  while (state.nextNote < now + 0.4) {
    const R = radio, beat = 60 / R.bpm / 2, when = state.nextNote - now, hz = n => 440 * Math.pow(2, (n - 69) / 12), st = state.step;
    if (st % 8 === 0) tone(hz(R.root - 24 + [0, 5, 7, 5][Math.floor(st / 8) % 4]), beat * 6, { type: 'sine', vol: 0.1, attack: 0.05, decay: beat * 6, dest: musicGain, when });
    if (Math.random() < (st % 2 ? 0.5 : 0.85)) { state.mel = Math.max(0, Math.min(R.scale.length - 1, (state.mel ?? 3) + Math.round((Math.random() - 0.5) * 3))); tone(hz(R.root + R.scale[state.mel]), beat * 1.4, { type: R.wave, vol: R.vol, attack: 0.004, decay: beat * 1.5, dest: musicGain, when }); }
    if (st % 2 === 1) noise(0.02, { vol: 0.015, freq: 6000, q: 1, when });
    state.nextNote += beat; state.step++;
  }
}
