// The island's music: composed songs (data/songs.js) played by a small synthesized
// band — plucked strings in the style of the đàn tranh (Karplus–Strong), a sáo flute,
// a đàn bầu with its pitch bends, marimba, music box, electric piano, pads, bass and soft
// percussion — through a shared reverb and a gentle compressor. Songs crossfade when
// the place or the time of day changes, and every second time round a song plays a
// lighter arrangement so it never feels like a short loop.

import { SONGS } from '../data/songs.js';

let ctx = null, out = null, verb = null;
const plucks = new Map();
let cur = null;                     // { id, song, bus, start, step, pass }
let fading = [];

const hz = m => 440 * Math.pow(2, (m - 69) / 12);
const NOTE = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };
// "C#5" → 73; accidentals # and b
function midi(tok) {
  const m = /^([a-gA-G])([#b]?)(-?\d)$/.exec(tok); if (!m) throw new Error('bad note ' + tok);
  return 12 * (+m[3] + 1) + NOTE[m[1].toLowerCase()] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
}
// "E5-2 G5-2 r-4 C4+E4-8 E5~-4" (16ths) → [{ at, len, notes, bend, accent }]; bars split by |
function parseLine(str, steps) {
  const bars = str.split('|').map(b => b.trim());
  return bars.map((bar, bi) => {
    const evs = []; let at = 0;
    for (const tok of bar.split(/\s+/).filter(Boolean)) {
      const [head, l] = tok.split('-'), len = +l;
      if (!(len > 0)) throw new Error(`bad length in "${tok}"`);
      if (head !== 'r') {
        const accent = head.endsWith('^'), bend = head.includes('~');
        evs.push({ at, len, notes: head.replace(/[~^]/g, '').split('+').map(midi), bend, accent });
      }
      at += len;
    }
    if (at !== steps) throw new Error(`bar ${bi + 1} is ${at} steps, not ${steps}: ${bar}`);
    return evs;
  });
}
// chord symbols: C, Am, F#m7, Bbmaj7, G7, Dsus4, Cadd9, C6
const QUAL = { '': [0, 4, 7], m: [0, 3, 7], 7: [0, 4, 7, 10], maj7: [0, 4, 7, 11], m7: [0, 3, 7, 10], sus2: [0, 2, 7], sus4: [0, 5, 7], add9: [0, 4, 7, 14], 6: [0, 4, 7, 9], m6: [0, 3, 7, 9], dim: [0, 3, 6] };
function chord(sym) {
  const m = /^([A-G])([#b]?)(.*)$/.exec(sym); if (!m || !QUAL[m[3]]) throw new Error('bad chord ' + sym);
  return { root: NOTE[m[1].toLowerCase()] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0), tones: QUAL[m[3]] };
}
// a song, ready to play: bars of lead lines, chords per half-bar, patterns
function compile(id) {
  const S = SONGS[id], steps = S.steps || 16;
  const chords = S.chords.flatMap(c => { const [a, b] = c.split('/'); return [chord(a), chord(b || a)]; });
  const lines = Object.fromEntries(Object.entries(S.lines).map(([k, L]) => [k, { ...L, bars: parseLine(L.notes, steps) }]));
  const bars = S.chords.length;
  for (const [k, L] of Object.entries(lines)) if (L.bars.length !== bars) throw new Error(`${id}.${k}: ${L.bars.length} bars, chords have ${bars}`);
  return { ...S, id, steps, bars, chords, lines, beat: 60 / S.bpm / 4 };
}
const compiled = {};
const song = id => (compiled[id] ||= compile(id));
// the content check: every song parses, every bar is full (throws with the problem)
export function checkSongs() { for (const id of Object.keys(SONGS)) song(id); return Object.keys(SONGS).length; }

// ---------------------------------------------------------------- the room
function impulse(sec = 2.6) {
  const len = Math.floor(ctx.sampleRate * sec), b = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
  return b;
}
export function initMusic(audioCtx, dest) {
  ctx = audioCtx;
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -20; comp.ratio.value = 3; comp.attack.value = 0.01; comp.release.value = 0.25;
  out = ctx.createGain(); out.gain.value = 1; out.connect(comp); comp.connect(dest);
  verb = ctx.createConvolver(); verb.buffer = impulse();
  const wet = ctx.createGain(); wet.gain.value = 0.32; verb.connect(wet); wet.connect(comp);
}

// ---------------------------------------------------------------- instruments
function env(g, t, vol, a, d) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); }
const PAN = { pluck: -0.25, flute: 0.2, danbau: 0.15, marimba: -0.15, musicbox: 0.3, epiano: -0.1, pad: 0, bass: 0, kalimba: 0.25, nylon: -0.3, strings: 0, bells: 0.35 };
let panNext = 0;
function voice(bus, sendAmt = 0.25) {
  const g = ctx.createGain();
  if (panNext && ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = panNext; g.connect(p); p.connect(bus); } else g.connect(bus);
  if (sendAmt) { const s = ctx.createGain(); s.gain.value = sendAmt; g.connect(s); s.connect(verb); }
  return g;
}
function osc(type, f, t, stop, dest, detune = 0) { const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); o.detune.value = detune; o.connect(dest); o.start(t); o.stop(stop); return o; }
// a plucked string, computed once per pitch (Karplus–Strong), warm and slightly bright
function pluckBuffer(m) {
  if (plucks.has(m)) return plucks.get(m);
  const sr = ctx.sampleRate, len = Math.floor(sr * 2.2), b = ctx.createBuffer(1, len, sr), d = b.getChannelData(0);
  const N = Math.max(2, Math.round(sr / hz(m))), ring = new Float32Array(N);
  let lp = 0; for (let i = 0; i < N; i++) { lp = lp * 0.55 + (Math.random() * 2 - 1) * 0.45; ring[i] = lp; }
  const damp = 0.4985 - Math.max(0, m - 72) * 0.0006;
  for (let i = 0, p = 0; i < len; i++) { const a = ring[p], b2 = ring[(p + 1) % N]; d[i] = a; ring[p] = (a + b2) * damp; p = (p + 1) % N; }
  plucks.set(m, b); return b;
}
const INST = {
  pluck(bus, t, m, dur, vol) {
    const s = ctx.createBufferSource(); s.buffer = pluckBuffer(m);
    const g = voice(bus, 0.3); g.gain.setValueAtTime(vol * 1.6, t); g.gain.setTargetAtTime(0.0001, t + Math.max(0.25, dur), 0.25);
    s.connect(g); s.start(t); s.stop(t + Math.max(0.3, dur) + 1.5);
  },
  flute(bus, t, m, dur, vol) {
    const stop = t + dur + 0.35, g = voice(bus, 0.35);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.06); g.gain.setValueAtTime(vol * 0.85, t + Math.max(0.07, dur - 0.05)); g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.25);
    const o = osc('sine', hz(m), t, stop, g), o2 = ctx.createGain(); o2.gain.value = 0.12; osc('triangle', hz(m) * 2, t, stop, o2); o2.connect(g);
    const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 5.2; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(hz(m) * 0.006, t + 0.35); lfo.connect(lg); lg.connect(o.frequency); lfo.start(t); lfo.stop(stop);
    // breath on the attack
    const n = ctx.createBufferSource(), nb = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.12), ctx.sampleRate), nd = nb.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = (Math.random() * 2 - 1) * (1 - i / nd.length);
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = hz(m) * 2; bp.Q.value = 2; const ng = ctx.createGain(); ng.gain.value = vol * 0.5;
    n.buffer = nb; n.connect(bp); bp.connect(ng); ng.connect(g); n.start(t);
  },
  // đàn bầu: one string, the left hand bends into notes and sings with a slow vibrato
  danbau(bus, t, m, dur, vol, ev, prev) {
    const stop = t + dur + 0.9, g = voice(bus, 0.4); env(g, t, vol, 0.012, dur + 0.7);
    const o = osc('sine', hz(m), t, stop, g), h = ctx.createGain(); h.gain.value = 0.18; osc('sine', hz(m) * 2, t, stop, h); h.connect(g);
    const from = ev?.bend ? m - 2 : prev && Math.abs(prev - m) <= 4 ? prev : null;
    if (from != null) { o.frequency.setValueAtTime(hz(from), t); o.frequency.exponentialRampToValueAtTime(hz(m), t + 0.12); }
    const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 4.6; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(hz(m) * 0.012, t + Math.min(0.6, dur)); lfo.connect(lg); lg.connect(o.frequency); lfo.start(t); lfo.stop(stop);
  },
  marimba(bus, t, m, dur, vol) {
    const stop = t + 0.9, g = voice(bus, 0.2); env(g, t, vol, 0.003, 0.55);
    osc('sine', hz(m), t, stop, g); const h = ctx.createGain(); env(h, t, vol * 0.35, 0.002, 0.12); osc('sine', hz(m) * 4, t, stop, h); h.connect(bus);
  },
  musicbox(bus, t, m, dur, vol) {
    const stop = t + 2, g = voice(bus, 0.45); env(g, t, vol, 0.002, 1.6);
    osc('sine', hz(m), t, stop, g); const h = ctx.createGain(); env(h, t, vol * 0.25, 0.002, 0.5); osc('sine', hz(m) * 3.01, t, stop, h); h.connect(g);
  },
  epiano(bus, t, m, dur, vol) {
    const stop = t + dur + 1.2, g = voice(bus, 0.3); env(g, t, vol, 0.006, dur + 0.9);
    osc('sine', hz(m), t, stop, g); const h = ctx.createGain(); env(h, t, vol * 0.3, 0.003, 0.3); osc('sine', hz(m) * 2, t, stop, h); h.connect(g);
    const trem = ctx.createOscillator(), tg = ctx.createGain(); trem.frequency.value = 4.5; tg.gain.value = vol * 0.25; trem.connect(tg); tg.connect(g.gain); trem.start(t); trem.stop(stop);
  },
  pad(bus, t, m, dur, vol) {
    const stop = t + dur + 1.4, g = voice(bus, 0.5);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + Math.min(0.8, dur * 0.4)); g.gain.setValueAtTime(vol, t + dur); g.gain.linearRampToValueAtTime(0.0001, t + dur + 1.2);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1100; lp.Q.value = 0.4; lp.connect(g);
    osc('sawtooth', hz(m), t, stop, lp, -7); osc('sawtooth', hz(m), t, stop, lp, 7);
  },
  // kalimba: thumb piano, a bright tine with a hollow wooden body
  kalimba(bus, t, m, dur, vol) {
    const stop = t + 1.8, g = voice(bus, 0.35); env(g, t, vol, 0.002, 1.3);
    osc('sine', hz(m), t, stop, g); const h = ctx.createGain(); env(h, t, vol * 0.4, 0.001, 0.09); osc('sine', hz(m) * 5.4, t, stop, h); h.connect(g);
    const b = ctx.createGain(); env(b, t, vol * 0.2, 0.002, 0.25); osc('triangle', hz(m) / 2, t, stop, b); b.connect(g);
  },
  // nylon guitar: a plucked string through a wooden body (two resonances), warmer than the đàn tranh
  nylon(bus, t, m, dur, vol) {
    const s = ctx.createBufferSource(); s.buffer = pluckBuffer(m);
    const body = ctx.createBiquadFilter(); body.type = 'peaking'; body.frequency.value = 220; body.gain.value = 6; body.Q.value = 1.2;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2400;
    const g = voice(bus, 0.28); g.gain.setValueAtTime(vol * 1.5, t); g.gain.setTargetAtTime(0.0001, t + Math.max(0.3, dur), 0.35);
    s.connect(body); body.connect(lp); lp.connect(g); s.start(t); s.stop(t + Math.max(0.3, dur) + 1.6);
  },
  // a soft string section: detuned saws, slow bow, gentle vibrato
  strings(bus, t, m, dur, vol) {
    const stop = t + dur + 1, g = voice(bus, 0.55);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.25); g.gain.setValueAtTime(vol, t + dur); g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.8);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1800; lp.Q.value = 0.3; lp.connect(g);
    const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 5; lg.gain.value = 4; lfo.connect(lg);
    for (const d of [-9, 0, 9]) { const o = osc('sawtooth', hz(m), t, stop, lp, d); lg.connect(o.detune); }
    lfo.start(t); lfo.stop(stop);
  },
  // glass bells: inharmonic partials, long shimmer
  bells(bus, t, m, dur, vol) {
    const stop = t + 2.6, g = voice(bus, 0.5); env(g, t, vol, 0.002, 2.2);
    osc('sine', hz(m), t, stop, g);
    for (const [r, k, d] of [[2.76, 0.35, 0.9], [5.4, 0.18, 0.4], [8.93, 0.08, 0.2]]) { const h = ctx.createGain(); env(h, t, vol * k, 0.001, d); osc('sine', hz(m) * r, t, stop, h); h.connect(g); }
  },
  bass(bus, t, m, dur, vol) {
    const stop = t + dur + 0.3, g = voice(bus, 0.05); env(g, t, vol, 0.01, Math.max(0.2, dur));
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 650; lp.connect(g);
    osc('triangle', hz(m), t, stop, lp); osc('sine', hz(m) / 2, t, stop, lp);
  },
};
// soft percussion
function noiseBuf(sec) { const b = ctx.createBuffer(1, Math.floor(ctx.sampleRate * sec), ctx.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return b; }
let NB = null;
const DRUM = {
  k(bus, t, v) { const g = voice(bus, 0.05); env(g, t, 0.5 * v, 0.003, 0.22); const o = osc('sine', 110, t, t + 0.3, g); o.frequency.exponentialRampToValueAtTime(45, t + 0.18); },
  s(bus, t, v) { const g = voice(bus, 0.3); env(g, t, 0.18 * v, 0.002, 0.14); const n = ctx.createBufferSource(); n.buffer = NB; const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1900; bp.Q.value = 0.7; n.connect(bp); bp.connect(g); n.start(t, Math.random()); n.stop(t + 0.2); },
  h(bus, t, v) { const g = voice(bus, 0.1); env(g, t, 0.07 * v, 0.001, 0.04); const n = ctx.createBufferSource(); n.buffer = NB; const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 7500; n.connect(hp); hp.connect(g); n.start(t, Math.random()); n.stop(t + 0.06); },
  sh(bus, t, v) { const g = voice(bus, 0.15); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.06 * v, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.1); const n = ctx.createBufferSource(); n.buffer = NB; const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 5200; bp.Q.value = 1.2; n.connect(bp); bp.connect(g); n.start(t, Math.random()); n.stop(t + 0.12); },
  wb(bus, t, v) { const g = voice(bus, 0.25); env(g, t, 0.16 * v, 0.001, 0.07); const o = osc('sine', 980, t, t + 0.1, g); o.frequency.exponentialRampToValueAtTime(760, t + 0.06); },
  g(bus, t, v) { const g = voice(bus, 0.6); env(g, t, 0.12 * v, 0.01, 3.2); osc('sine', 98, t, t + 3.4, g); const h = ctx.createGain(); env(h, t, 0.05 * v, 0.01, 2.2); osc('sine', 98 * 2.41, t, t + 3.4, h); h.connect(g); },
  c(bus, t, v) { const g = voice(bus, 0.5); env(g, t, 0.05 * v, 0.002, 1.4); osc('sine', 2637, t, t + 1.5, g); osc('sine', 3951, t, t + 1.5, g); },
};

// ---------------------------------------------------------------- playing
function startSong(id, at) {
  const bus = ctx.createGain(); bus.gain.setValueAtTime(0.0001, at); bus.gain.exponentialRampToValueAtTime(1, at + 1.6); bus.connect(out);
  cur = { id, song: song(id), bus, start: at, step: 0, pass: 0, prevLead: {} };
  onSong?.(id, SONGS[id]);
  for (const L of Object.values(cur.song.lines)) if (L.inst === 'pluck') for (const bar of L.bars) for (const ev of bar) ev.notes.forEach(pluckBuffer);
}
function stopSong(at) {
  if (!cur) return;
  const b = cur.bus; b.gain.cancelScheduledValues(at); b.gain.setValueAtTime(b.gain.value || 1, at); b.gain.exponentialRampToValueAtTime(0.0001, at + 2.2);
  fading.push(b); setTimeout(() => { b.disconnect(); fading = fading.filter(x => x !== b); }, 3000);
  cur = null;
}
// schedule one 16th step of the current song
function playStep(S, step, t) {
  const barI = Math.floor(step / S.steps) % S.bars, inBar = step % S.steps, half = inBar < S.steps / 2 ? 0 : 1;
  const ch = S.chords[barI * 2 + half], light = cur.pass % 2 === 1, sw = S.swing && inBar % 2 === 1 ? S.beat * S.swing : 0;
  const tt = t + sw + (Math.random() - 0.5) * 0.008;
  // written lines (lead, counter-melody…)
  for (const [k, L] of Object.entries(S.lines)) {
    if (light && L.light === 'rest' && barI < S.bars / 2) continue;
    for (const ev of L.bars[barI]) if (ev.at === inBar) {
      const dur = ev.len * S.beat, vol = L.vol * (ev.accent ? 1.25 : 1) * (0.9 + Math.random() * 0.15);
      panNext = PAN[L.inst] || 0;
      for (const n of ev.notes) INST[L.inst](cur.bus, tt, n + (L.oct || 0) * 12, dur, vol, ev, cur.prevLead[k]);
      cur.prevLead[k] = ev.notes[ev.notes.length - 1];
    }
  }
  // accompaniment from the chords
  const tone = (c, d, oct) => 12 * (oct + 1) + c.root + ({ 1: 0, 3: c.tones[1], 5: c.tones[2], 7: c.tones[3] ?? 12, 8: 12, 9: 14 }[d] ?? 0);
  for (const A of S.arps || []) {
    if (light && A.light === 'rest') continue;
    const p = A.pattern[inBar % A.pattern.length]; if (p === '.') continue;
    panNext = PAN[A.inst] || 0;
    INST[A.inst](cur.bus, tt, tone(ch, +p, A.oct), S.beat * (A.len || 2), A.vol * (0.9 + Math.random() * 0.15));
    panNext = 0;
  }
  if (S.bass) { const p = S.bass.pattern[inBar % S.bass.pattern.length]; if (p !== '.') INST[S.bass.inst || 'bass'](cur.bus, tt, tone(ch, +p, S.bass.oct ?? 2), S.beat * (S.bass.len || 3), S.bass.vol); }
  if (S.pad && inBar % (S.steps / 2) === 0 && (!light || S.pad.light !== 'rest')) for (const d of [1, 3, 5]) INST.pad(cur.bus, t, tone(ch, d, S.pad.oct ?? 3), S.beat * S.steps / 2, S.pad.vol);
  if (S.drums) for (const [k, pat] of Object.entries(light && S.drumsLight ? S.drumsLight : S.drums)) {
    const c = pat[inBar % pat.length]; if (c === 'x' || c === 'o') DRUM[k](cur.bus, tt, c === 'x' ? 1 : 0.55);
  }
  if (S.gong && inBar === 0 && barI % S.gong === 0) DRUM.g(cur.bus, t, 1);
}
// called every frame: keep half a second of music scheduled; change songs on request
let asked = null, askedAt = 0;
export function musicFrame(want) {
  if (!ctx || !out) return;
  NB ||= noiseBuf(1.5);
  const now = ctx.currentTime;
  // a new song only once the wish has held for a moment (walking along an area's edge
  // shouldn't flip between two songs); silence (music off) is immediate
  if (want !== asked) { asked = want; askedAt = now; }
  if (want !== (cur?.id ?? null) && (!want || now - askedAt > 1.5 || !cur)) {
    stopSong(now);
    if (want && SONGS[want]) startSong(want, now + 0.35);
  }
  if (!cur) return;
  const S = cur.song;
  while (cur.start + cur.step * S.beat < now + 0.5) {
    const t = cur.start + cur.step * S.beat;
    if (t >= now - 0.05) playStep(S, cur.step, t);
    cur.step++;
    if (cur.step % (S.steps * S.bars) === 0) cur.pass++;
  }
}
export const currentSong = () => cur?.id || null;
// one note of a band instrument, for sound effects (into the effects bus, panned)
export function instNote(inst, bus, m, dur, vol, when = 0, pan = 0) {
  if (!ctx || !INST[inst]) return;
  panNext = pan; INST[inst](bus, ctx.currentTime + when, m, dur, vol); panNext = 0;
}
// ---------------------------------------------------------------- stingers
// Short musical moments for big events, played over the song (which ducks for a moment).
const STING = {
  levelup:  { inst: 'bells', bpm: 150, notes: [[72, 0], [76, 1], [79, 2], [84, 3, 4]], bed: [[60, 64, 67], 3] },
  chapter:  { inst: 'strings', bpm: 96, notes: [[67, 0, 2], [72, 2, 2], [76, 4, 2], [79, 6, 6]], bed: [[48, 55, 64], 6], also: 'bells' },
  morning:  { inst: 'kalimba', bpm: 132, notes: [[72, 0], [74, 1], [76, 2], [79, 3], [81, 4, 3]] },
  award:    { inst: 'bells', bpm: 140, notes: [[79, 0], [84, 1], [88, 2], [91, 3, 3], [96, 6, 4]], bed: [[60, 67, 76], 7], also: 'strings' },
  newshop:  { inst: 'marimba', bpm: 160, notes: [[67, 0], [71, 1], [74, 2], [79, 3], [83, 4], [86, 5, 3]], bed: [[55, 62, 71], 5] },
  rare:     { inst: 'musicbox', bpm: 120, notes: [[81, 0], [79, 1], [84, 2], [88, 4, 4]], also: 'bells' },
  friend:   { inst: 'nylon', bpm: 120, notes: [[64, 0], [67, 1], [71, 2], [76, 3, 3]], bed: [[52, 59, 64], 4] },
};
const SVOL = { bells: 0.42, marimba: 0.34, musicbox: 0.4, nylon: 0.3, kalimba: 0.2, strings: 0.09 };
export function stinger(id, bus) {
  const S = STING[id]; if (!ctx || !S) return 0;
  const beat = 60 / S.bpm / 2, t0 = ctx.currentTime + 0.02;
  for (const [m, at, len = 1] of S.notes) {
    panNext = PAN[S.inst] || 0; INST[S.inst](bus, t0 + at * beat, m, len * beat, SVOL[S.inst] || 0.16);
    if (S.also) { panNext = -(PAN[S.also] || 0.2); INST[S.also](bus, t0 + at * beat, m + 12, len * beat, (SVOL[S.also] || 0.16) * 0.3); }
  }
  if (S.bed) { panNext = 0; for (const m of S.bed[0]) INST.pad(bus, t0, m, S.bed[1] * beat, 0.03); }
  panNext = 0;
  const end = (Math.max(...S.notes.map(([, at, len = 1]) => at + len)) + 1) * beat;
  // duck the song under the stinger
  if (cur) { const g = cur.bus.gain, now = ctx.currentTime; g.cancelScheduledValues(now); g.setTargetAtTime(0.35, now, 0.05); g.setTargetAtTime(1, now + end, 0.4); }
  return end;
}
// told when a new song starts (the HUD shows its name)
let onSong = null;
export function onSongStart(fn) { onSong = fn; }
