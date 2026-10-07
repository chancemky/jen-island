// Bistro Island's soundtrack, written out note by note and played by core/music.js.
//
// Lines: notes as "<note><octave>-<16ths>" ("E5-4" is a quarter note, "r-2" an eighth
// rest), chords as "C4+E4-8", "~" bends into a note (đàn bầu), "^" accents it; bars are
// separated by "|" and must fill the bar exactly. `chords` has one symbol per bar, or
// "F/G" for two halves. Accompaniment is built from the chords: `arps` and `bass` are
// step patterns over chord tones (1 root, 3 third, 5 fifth, 7 seventh, 8 octave, 9 ninth,
// "." rest); `drums` are step patterns (x hit, o soft) for k kick, s snare, h hat,
// sh shaker, wb woodblock, c finger cymbal; `gong` strikes every n bars.
// light: 'rest' — on every second pass the line or arp sits out (the first half, for lines).

const A = (...bars) => bars.join(' | ');

export const SONGS = {
  // ---- the boat ride in: wide, hopeful, a sáo over rippling strings (D major pentatonic)
  title: {
    en: 'Over the Waves', vi: 'Vượt Sóng',
    bpm: 84,
    chords: ['D', 'Bm', 'G', 'A', 'D', 'Bm', 'G', 'A', 'G', 'D', 'Em', 'A', 'G', 'Bm', 'Asus4/A', 'D'],
    lines: {
      lead: { inst: 'flute', vol: 0.11, notes: A(
        'A4-4 D5-4 E5-4 F#5-4', 'F#5-6 E5-2 D5-4 B4-4', 'D5-6 E5-2 B4-8', 'A4-12 r-4',
        'A4-4 D5-4 E5-4 A5-4', 'A5-6 F#5-2 E5-4 D5-4', 'E5-4 F#5-4 E5-4 B4-4', 'E5-12 r-4',
        'B5-6 A5-2 F#5-4 E5-4', 'F#5-6 E5-2 D5-8', 'E5-4 F#5-4 A5-4 B5-4', 'A5-12 r-4',
        'B5-4 A5-4 F#5-4 E5-4', 'F#5-6 E5-2 D5-4 B4-4', 'D5-8 E5-8', 'D5-14 r-2') },
    },
    arps: [{ inst: 'pluck', oct: 4, vol: 0.06, pattern: '1.5.8.5.3.5.8.5.', len: 3 }],
    bass: { pattern: '1.......5.......', vol: 0.09, len: 6 },
    pad: { oct: 3, vol: 0.022 },
    drums: { c: 'x...............' },
  },

  // ---- morning on the island: bright marimba, a strummed pluck, shaker (C pentatonic)
  morning: {
    en: 'Island Morning', vi: 'Sáng Trên Đảo',
    bpm: 96,
    chords: ['C', 'Am', 'F', 'G', 'C', 'Am', 'F/G', 'C',
      'C', 'Am', 'F', 'G', 'C', 'Am', 'F/G', 'C',
      'F', 'C', 'Dm', 'G', 'F', 'C', 'Dm', 'G',
      'C', 'Am', 'F', 'G', 'C', 'Am', 'F/G', 'C'],
    lines: {
      lead: { inst: 'marimba', vol: 0.15, light: 'rest', notes: A(
        'E5-2 G5-2 A5-4 G5-2 E5-2 D5-4', 'C5-2 D5-2 E5-4 A4-8', 'A4-2 C5-2 D5-2 E5-2 G5-4 E5-4', 'D5-12 r-4',
        'E5-2 G5-2 A5-4 C6-2 A5-2 G5-4', 'E5-2 G5-2 A5-4 E5-8', 'D5-2 E5-2 G5-4 A5-2 G5-2 D5-4', 'C5-12 r-4',
        'E5-2 G5-2 A5-4 G5-2 E5-2 D5-4', 'C5-2 D5-2 E5-4 A4-8', 'A4-2 C5-2 D5-2 E5-2 G5-4 E5-4', 'D5-4 E5-4 G5-4 A5-4',
        'E5-2 G5-2 A5-4 C6-2 A5-2 G5-4', 'E5-2 G5-2 A5-4 E5-8', 'D5-2 E5-2 G5-4 A5-2 G5-2 D5-4', 'C5-8 G4-4 C5-4',
        'A5-4 C6-4 A5-4 G5-4', 'E5-6 G5-2 E5-8', 'D5-4 E5-4 G5-4 A5-4', 'G5-12 r-4',
        'A5-4 C6-4 D6-4 C6-4', 'A5-6 G5-2 E5-8', 'D5-2 E5-2 G5-4 A5-2 G5-2 E5-4', 'D5-8 r-8',
        'E5-2 G5-2 A5-4 G5-2 E5-2 D5-4', 'C5-2 D5-2 E5-4 A4-8', 'A4-2 C5-2 D5-2 E5-2 G5-4 E5-4', 'D5-12 r-4',
        'E5-2 G5-2 A5-4 C6-2 A5-2 G5-4', 'E5-2 G5-2 A5-4 E5-8', 'D5-2 E5-2 G5-4 A5-2 G5-2 D5-4', 'C5-12 r-4') },
    },
    arps: [{ inst: 'kalimba', oct: 4, vol: 0.07, pattern: '1.358.5.1.358.5.', len: 2 }],
    bass: { pattern: '1...5...1.5.8...', vol: 0.1 },
    drums: { sh: 'o.x.o.x.o.x.o.x.', k: 'x.......x.......' },
    drumsLight: { sh: 'o...o...o...o...' },
  },

  // ---- Market Street at midday: a busy plucked tune, the sáo answers (G pentatonic)
  day: {
    en: 'Market Street', vi: 'Phố Chợ',
    bpm: 104,
    chords: ['G', 'Em', 'C', 'D', 'G', 'Em', 'C', 'G',
      'G', 'Em', 'C', 'D', 'G', 'Em', 'C', 'G',
      'C', 'D', 'Bm', 'Em', 'C', 'D', 'G', 'G',
      'G', 'Em', 'C', 'D', 'G', 'Em', 'C', 'G'],
    lines: {
      lead: { inst: 'pluck', vol: 0.12, notes: A(
        'B4-2 D5-2 E5-2 D5-2 B4-4 A4-4', 'G4-2 A4-2 B4-4 E5-8', 'E5-2 G5-2 E5-2 D5-2 B4-4 D5-4', 'A4-12 r-4',
        'B4-2 D5-2 E5-2 G5-2 E5-4 D5-4', 'B4-2 D5-2 E5-4 G5-4 E5-4', 'D5-2 E5-2 D5-2 B4-2 A4-4 B4-4', 'G4-12 r-4',
        'B4-2 D5-2 E5-2 D5-2 B4-4 A4-4', 'G4-2 A4-2 B4-4 E5-8', 'E5-2 G5-2 E5-2 D5-2 B4-4 D5-4', 'A4-12 r-4',
        'B4-2 D5-2 E5-2 G5-2 E5-4 D5-4', 'B4-2 D5-2 E5-4 G5-4 E5-4', 'D5-2 E5-2 D5-2 B4-2 A4-4 B4-4', 'G4-12 r-4',
        'E5-4 G5-4 A5-4 G5-4', 'A5-6 G5-2 E5-4 D5-4', 'D5-4 B4-4 D5-4 E5-4', 'E5-12 r-4',
        'G5-4 E5-4 G5-4 A5-4', 'B5-6 A5-2 G5-4 E5-4', 'D5-2 E5-2 D5-2 B4-2 A4-4 G4-4', 'G4-8 r-8',
        'B4-2 D5-2 E5-2 D5-2 B4-4 A4-4', 'G4-2 A4-2 B4-4 E5-8', 'E5-2 G5-2 E5-2 D5-2 B4-4 D5-4', 'A4-12 r-4',
        'B4-2 D5-2 E5-2 G5-2 E5-4 D5-4', 'B4-2 D5-2 E5-4 G5-4 E5-4', 'D5-2 E5-2 D5-2 B4-2 A4-4 B4-4', 'G4-12 r-4') },
      answer: { inst: 'flute', vol: 0.07, notes: A(
        'r-16', 'r-16', 'r-16', 'r-16', 'r-16', 'r-16', 'r-16', 'r-16',
        'D6-8 B5-8', 'G5-16', 'E6-8 D6-8', 'A5-16', 'B5-8 D6-8', 'E6-16', 'G5-8 E5-8', 'D5-16',
        'r-16', 'r-16', 'r-16', 'r-16', 'r-16', 'r-16', 'r-16', 'r-16',
        'D6-8 B5-8', 'G5-16', 'E6-8 D6-8', 'A5-16', 'B5-8 D6-8', 'E6-16', 'G5-8 E5-8', 'D5-16') },
    },
    arps: [{ inst: 'marimba', oct: 4, vol: 0.06, pattern: '..5...8...5...3.', light: 'rest' }],
    bass: { pattern: '1..1..5.1..1..5.', vol: 0.1, len: 2 },
    drums: { k: 'x.......x.......', s: '....o.......o...', h: 'o.o.o.o.o.o.o.o.' },
    drumsLight: { h: 'o...o...o...o...' },
  },

  // ---- the island at night: đàn bầu over a soft pad (A minor pentatonic)
  night: {
    en: 'Night Breeze', vi: 'Gió Đêm',
    bpm: 72,
    chords: ['Am', 'F', 'C', 'G', 'Am', 'F', 'Dm', 'Am',
      'Dm', 'Am', 'Em', 'Am', 'F', 'C', 'G', 'Am',
      'Am', 'F', 'C', 'G', 'Am', 'F', 'Dm', 'Am'],
    lines: {
      lead: { inst: 'danbau', vol: 0.15, notes: A(
        'E5~-8 D5-4 C5-4', 'A4-12 r-4', 'C5-4 D5-4 E5-4 G5-4', 'D5-12 r-4',
        'E5~-8 G5-4 A5-4', 'A5-6 G5-2 E5-8', 'D5-4 E5-4 D5-4 C5-4', 'A4-12 r-4',
        'D5~-8 E5-4 D5-4', 'C5-8 A4-8', 'G4-4 A4-4 C5-4 D5-4', 'E5~-12 r-4',
        'A5-8 G5-4 E5-4', 'G5-8 E5-4 D5-4', 'D5-4 E5-4 G5-4 D5-4', 'E5-12 r-4',
        'E5~-8 D5-4 C5-4', 'A4-12 r-4', 'C5-4 D5-4 E5-4 G5-4', 'D5-12 r-4',
        'E5~-8 G5-4 A5-4', 'A5-6 G5-2 E5-8', 'D5-4 E5-4 D5-4 C5-4', 'A4-16') },
    },
    arps: [{ inst: 'pluck', oct: 3, vol: 0.045, pattern: '1...5...8...5...', len: 4, light: 'rest' }],
    bass: { pattern: '1...............', vol: 0.08, len: 12 },
    pad: { oct: 3, vol: 0.028 },
  },

  // ---- the Night Market: lanterns, woodblock, a đàn bầu in the southern mode (D)
  nightmarket: {
    en: 'Night Market', vi: 'Chợ Đêm',
    bpm: 92,
    chords: ['Dm', 'C', 'Gm', 'Dm', 'F', 'C', 'Dm', 'Dm',
      'Dm', 'C', 'Gm', 'Dm', 'F', 'C', 'Dm', 'Dm',
      'Bb', 'F', 'C', 'Dm', 'Bb', 'F', 'Gm', 'A',
      'Dm', 'C', 'Gm', 'Dm', 'F', 'C', 'Dm', 'Dm'],
    lines: {
      lead: { inst: 'danbau', vol: 0.14, light: 'rest', notes: A(
        'A4-4 D5-4 F5-4 G5-4', 'A5~-6 G5-2 F5-8', 'G5-4 F5-4 D5-4 C5-4', 'D5-12 r-4',
        'F5-4 G5-4 A5-4 C6-4', 'A5-6 G5-2 F5-4 G5-4', 'F5-4 D5-4 C5-4 A4-4', 'D5~-12 r-4',
        'A4-4 D5-4 F5-4 G5-4', 'A5~-6 G5-2 F5-8', 'G5-4 F5-4 D5-4 C5-4', 'D5-8 F5-4 A5-4',
        'F5-4 G5-4 A5-4 C6-4', 'A5-6 G5-2 F5-4 G5-4', 'F5-4 D5-4 C5-4 A4-4', 'D5-16',
        'D6~-6 C6-2 A5-8', 'C6-4 A5-4 G5-4 F5-4', 'G5-6 A5-2 G5-8', 'F5-12 r-4',
        'D5-4 F5-4 G5-4 A5-4', 'C6~-6 A5-2 G5-8', 'G5-4 F5-4 D5-4 C5-4', 'A4-12 r-4',
        'A4-4 D5-4 F5-4 G5-4', 'A5~-6 G5-2 F5-8', 'G5-4 F5-4 D5-4 C5-4', 'D5-12 r-4',
        'F5-4 G5-4 A5-4 C6-4', 'A5-6 G5-2 F5-4 G5-4', 'F5-4 D5-4 C5-4 A4-4', 'D5~-12 r-4') },
    },
    arps: [{ inst: 'pluck', oct: 4, vol: 0.05, pattern: '1.5.8.5.1.5.8.9.', len: 2 }],
    bass: { pattern: '1.....1.5.......', vol: 0.1 },
    pad: { oct: 3, vol: 0.018, light: 'rest' },
    drums: { wb: 'x..x..x...x.x...', k: 'x.......x.......', sh: '..o...o...o...o.' },
    drumsLight: { wb: 'x.......x.......' },
    gong: 16,
  },

  // ---- your home: a music-box waltz (F major, 3/4)
  home: {
    en: 'Home Sweet Home', vi: 'Tổ Ấm',
    bpm: 66, steps: 12,
    chords: ['F', 'Dm', 'Bb', 'C', 'F', 'Dm', 'Bb', 'C', 'Bb', 'F', 'Gm', 'C', 'F', 'Dm', 'C', 'F'],
    lines: {
      lead: { inst: 'musicbox', vol: 0.13, notes: A(
        'A5-4 C6-4 A5-4', 'F5-8 A5-4', 'G5-4 F5-4 D5-4', 'C5-12',
        'A5-4 C6-4 F6-4', 'E6-4 D6-4 C6-4', 'D6-4 C6-4 A5-4', 'G5-12',
        'F5-4 G5-4 A5-4', 'C6-8 A5-4', 'Bb5-4 A5-4 G5-4', 'E5-8 G5-4',
        'A5-4 G5-4 F5-4', 'D6-8 C6-4', 'Bb5-4 A5-4 G5-4', 'F5-12') },
    },
    arps: [{ inst: 'epiano', oct: 3, vol: 0.05, pattern: '1...35..35..', len: 3 }, { inst: 'kalimba', oct: 5, vol: 0.03, pattern: '...........5', len: 2, light: 'rest' }],
    bass: { pattern: '1...........', vol: 0.06, len: 10 },
  },

  // ---- a café: brushed swing, electric piano, a sáo playing jazz (C major)
  cafe: {
    en: 'Café Corner', vi: 'Góc Cà Phê',
    bpm: 100, swing: 0.33,
    chords: ['Fmaj7', 'Em7', 'Dm7', 'G7', 'Cmaj7', 'Am7', 'Dm7', 'G7', 'Fmaj7', 'Em7', 'Dm7', 'G7', 'Cmaj7', 'Am7', 'Dm7', 'G7'],
    lines: {
      lead: { inst: 'flute', vol: 0.09, light: 'rest', notes: A(
        'E5-3 F5-1 A5-4 G5-4 E5-4', 'D5-6 E5-2 B4-8', 'C5-2 D5-2 F5-4 A5-4 G5-4', 'F5-6 E5-2 D5-8',
        'E5-4 G5-4 B5-4 A5-4', 'G5-6 E5-2 C5-8', 'D5-2 E5-2 F5-4 D5-4 B4-4', 'G4-12 r-4',
        'A5-4 C6-4 E6-4 C6-4', 'B5-6 G5-2 E5-8', 'F5-4 A5-4 G5-2 F5-2 E5-4', 'D5-12 r-4',
        'E5-2 G5-2 B5-4 A5-4 G5-4', 'E5-6 C5-2 A4-8', 'D5-4 F5-4 A5-2 G5-2 F5-4', 'G5-8 r-8') },
    },
    arps: [{ inst: 'epiano', oct: 4, vol: 0.04, pattern: '..3.7.....5.7...', len: 3 }, { inst: 'strings', oct: 3, vol: 0.018, pattern: '1.......5.......', len: 8, light: 'rest' }],
    bass: { pattern: '1...5...8...5...', vol: 0.1, len: 4 },
    drums: { h: 'x..ox..ox..ox..o', s: '....o.......o...', k: 'o.......o.......' },
  },

  // ---- the Lantern Festival: drums, gong, the whole island playing (C pentatonic)
  festival: {
    en: 'Festival of Lanterns', vi: 'Hội Đèn Lồng',
    bpm: 116,
    chords: ['C', 'F', 'Am', 'G', 'C', 'F', 'G', 'C',
      'C', 'F', 'Am', 'G', 'C', 'F', 'G', 'C',
      'Am', 'Em', 'F', 'C', 'Am', 'Em', 'F', 'G',
      'C', 'F', 'Am', 'G', 'C', 'F', 'G', 'C'],
    lines: {
      lead: { inst: 'flute', vol: 0.11, notes: A(
        'G5-2 A5-2 C6-4 A5-2 G5-2 E5-4', 'A5-4 G5-4 E5-4 D5-4', 'C5-2 D5-2 E5-4 G5-4 E5-4', 'D5-12 r-4',
        'G5-2 A5-2 C6-4 D6-4 C6-4', 'A5-4 C6-4 A5-4 G5-4', 'E5-2 G5-2 A5-4 G5-2 E5-2 D5-4', 'C5-12 r-4',
        'G5-2 A5-2 C6-4 A5-2 G5-2 E5-4', 'A5-4 G5-4 E5-4 D5-4', 'C5-2 D5-2 E5-4 G5-4 E5-4', 'D5-12 r-4',
        'G5-2 A5-2 C6-4 D6-4 C6-4', 'A5-4 C6-4 A5-4 G5-4', 'E5-2 G5-2 A5-4 G5-2 E5-2 D5-4', 'C5-12 r-4',
        'E6-4 D6-4 C6-4 A5-4', 'G5-8 E5-8', 'A5-4 C6-4 D6-4 E6-4', 'C6-12 r-4',
        'A5-4 C6-4 D6-4 C6-4', 'G5-6 A5-2 G5-4 E5-4', 'D5-2 E5-2 G5-4 A5-4 C6-4', 'D6-12 r-4',
        'G5-2 A5-2 C6-4 A5-2 G5-2 E5-4', 'A5-4 G5-4 E5-4 D5-4', 'C5-2 D5-2 E5-4 G5-4 E5-4', 'D5-12 r-4',
        'G5-2 A5-2 C6-4 D6-4 C6-4', 'A5-4 C6-4 A5-4 G5-4', 'E5-2 G5-2 A5-4 G5-2 E5-2 D5-4', 'C5-12 r-4') },
    },
    arps: [{ inst: 'pluck', oct: 4, vol: 0.06, pattern: '1585158515851585', len: 1 }],
    bass: { pattern: '1.1.5...1.1.5.8.', vol: 0.11, len: 2 },
    drums: { k: 'x...x...x...x...', s: '....x.......x..o', h: 'xoxoxoxoxoxoxoxo', wb: '..x.....x.x.....' },
    drumsLight: { k: 'x.......x.......', h: 'x.x.x.x.x.x.x.x.' },
    gong: 8,
  },

  // ---- the beaches and Coconut Cove: a sunny lilt, offbeat strums (F pentatonic)
  beach: {
    en: 'Coconut Cove', vi: 'Vịnh Dừa',
    bpm: 100,
    chords: ['F', 'C', 'Dm', 'Bb', 'F', 'C', 'Bb', 'C', 'Dm', 'Bb', 'F', 'C', 'Bb', 'C', 'F', 'F'],
    lines: {
      lead: { inst: 'marimba', vol: 0.15, light: 'rest', notes: A(
        'C5-2 D5-2 F5-4 A5-4 G5-4', 'G5-6 F5-2 D5-8', 'F5-2 G5-2 A5-4 C6-4 A5-4', 'G5-8 F5-4 D5-4',
        'C5-2 D5-2 F5-4 A5-2 G5-2 F5-4', 'G5-4 A5-4 G5-4 C5-4', 'D5-4 F5-4 G5-4 D5-4', 'C5-12 r-4',
        'A5-4 C6-4 D6-4 C6-4', 'D6-6 C6-2 A5-8', 'C6-4 A5-4 G5-4 F5-4', 'G5-12 r-4',
        'F5-4 G5-4 A5-4 C6-4', 'D6-6 C6-2 A5-4 G5-4', 'A5-2 G5-2 F5-4 D5-4 C5-4', 'F5-12 r-4') },
    },
    arps: [{ inst: 'nylon', oct: 3, vol: 0.07, pattern: '1.3.5.3.1.3.5.8.', len: 2 }, { inst: 'pluck', oct: 4, vol: 0.035, pattern: '..3.5...3.5.8...', len: 2, light: 'rest' }],
    bass: { pattern: '1.....1.5.......', vol: 0.1, len: 3 },
    drums: { sh: 'o.x.o.x.o.x.o.x.', k: 'x.......x.......' },
    drumsLight: { sh: 'o...o...o...o...' },
  },

  // ---- Harbour Town: gulls, ropes and a seaside sáo (G major)
  harbour: {
    en: 'Harbour Town', vi: 'Phố Cảng',
    bpm: 98,
    chords: ['G', 'D', 'Em', 'C', 'G', 'D', 'C', 'D', 'Em', 'C', 'G', 'D', 'C', 'D', 'G', 'G'],
    lines: {
      lead: { inst: 'flute', vol: 0.1, notes: A(
        'D5-4 G5-4 B5-4 A5-4', 'A5-6 F#5-2 D5-8', 'E5-4 G5-4 B5-4 G5-4', 'E5-8 C5-8',
        'D5-2 E5-2 G5-4 B5-4 D6-4', 'C6-4 A5-4 F#5-4 A5-4', 'G5-4 E5-4 C5-4 E5-4', 'D5-12 r-4',
        'B5-4 G5-4 E5-4 G5-4', 'C6-6 B5-2 A5-8', 'B5-4 D6-4 B5-4 G5-4', 'A5-12 r-4',
        'E6-4 D6-4 C6-4 B5-4', 'A5-6 B5-2 A5-4 F#5-4', 'G5-4 D5-4 B4-4 D5-4', 'G5-12 r-4') },
    },
    arps: [{ inst: 'epiano', oct: 3, vol: 0.045, pattern: '1...35..1...35..', len: 3 }, { inst: 'pluck', oct: 4, vol: 0.04, pattern: '......8.......8.', light: 'rest' }],
    bass: { pattern: '1.......5.......', vol: 0.1, len: 6 },
    drums: { h: 'o...o...o...o...', s: '........o.......' },
  },

  // ---- Firefly Islet: a hush, a music box, little lights in the dark (E minor)
  islet: {
    en: 'Firefly Islet', vi: 'Cù Lao Đom Đóm',
    bpm: 60,
    chords: ['Em', 'C', 'G', 'D', 'C', 'Am', 'Em', 'Em'],
    lines: {
      lead: { inst: 'musicbox', vol: 0.13, notes: A(
        'B5-8 G5-4 E5-4', 'E6-8 D6-4 B5-4', 'D6-4 B5-4 G5-4 B5-4', 'A5-12 r-4',
        'G5-8 E5-4 G5-4', 'A5-8 C6-4 E6-4', 'D6-4 B5-4 G5-4 E5-4', 'E5-12 r-4') },
    },
    arps: [{ inst: 'pluck', oct: 4, vol: 0.035, pattern: '1.......5.......', len: 6, light: 'rest' }, { inst: 'bells', oct: 5, vol: 0.025, pattern: '......8.......5.', len: 4 }],
    pad: { oct: 3, vol: 0.026 },
    drums: { c: 'x...............' },
  },

  // ---- Mèo Mây: a tiptoeing, curious little theme (C major)
  meo: {
    en: 'Mèo Mây\'s Tiptoe', vi: 'Mèo Mây Rón Rén',
    bpm: 120,
    chords: ['C', 'F', 'G', 'C', 'Am', 'Dm', 'G7', 'C'],
    lines: {
      lead: { inst: 'marimba', vol: 0.15, notes: A(
        'G5-1 r-1 E5-1 r-1 G5-1 r-1 C6-2 B5-2 A5-2 G5-4', 'A5-2 r-2 F5-2 r-2 A5-2 C6-2 A5-4', 'B5-2 G5-2 D5-2 G5-2 B5-2 D6-2 B5-4', 'C6-4 G5-4 E5-4 r-4',
        'E5-2 r-2 A5-2 r-2 C6-2 B5-2 A5-4', 'F5-2 A5-2 D6-4 C6-2 A5-2 F5-4', 'D5-2 F5-2 G5-2 B5-2 D6-2 B5-2 G5-4', 'C6-2 r-2 G5-2 r-2 C5-4 r-4') },
    },
    bass: { inst: 'pluck', oct: 2, pattern: '1...5...1...5...', vol: 0.08, len: 2 },
    drums: { wb: '....x.......x...' },
  },
};
