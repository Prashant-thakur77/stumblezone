// Generates the scene's sound effects and music as small mono files.
//
// Everything here is synthesised from maths - no downloaded samples, no licensing to track. Re-run
// with `node tools/make-audio.mjs` after editing.
//
// The brief is Fall Guys' own (see docs/FALLGUYS-PRESENTATION.md): a '70s sports-show theme played
// fast - 150bpm in F sharp minor - on slap bass, breakbeats and brass stabs, with a toy squeak for
// percussion and a key change halfway through the loop. The cues are TV stingers: a referee
// whistle, a fanfare, a sad little jingle, a slide whistle, a crowd.

import { writeFileSync, mkdirSync, unlinkSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

const RATE = 22050
const OUT = 'assets/Audio'

function wav(samples) {
  const data = Buffer.alloc(samples.length * 2)
  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]))
    data.writeInt16LE(Math.round(clamped * 32767), i * 2)
  }
  const header = Buffer.alloc(44)
  header.write('RIFF', 0)
  header.writeUInt32LE(36 + data.length, 4)
  header.write('WAVE', 8)
  header.write('fmt ', 12)
  header.writeUInt32LE(16, 16)
  header.writeUInt16LE(1, 20) // PCM
  header.writeUInt16LE(1, 22) // mono
  header.writeUInt32LE(RATE, 24)
  header.writeUInt32LE(RATE * 2, 28)
  header.writeUInt16LE(2, 32)
  header.writeUInt16LE(16, 34)
  header.write('data', 36)
  header.writeUInt32LE(data.length, 40)
  return Buffer.concat([header, data])
}

const n = (seconds) => Math.floor(seconds * RATE)

/** Smooth attack and release so nothing clicks at the edges. */
function envelope(i, total, attack = 0.01, release = 0.25) {
  const t = i / total
  const a = Math.min(1, t / attack)
  const r = Math.min(1, (1 - t) / release)
  return a * r
}

function tone({ seconds, from, to = from, harmonics = [1], curve = 'linear' }) {
  const total = n(seconds)
  const out = new Float32Array(total)
  let phase = 0
  for (let i = 0; i < total; i++) {
    const t = i / total
    const k = curve === 'exp' ? t * t : t
    const freq = from + (to - from) * k
    phase += (2 * Math.PI * freq) / RATE
    let v = 0
    for (let h = 0; h < harmonics.length; h++) v += harmonics[h] * Math.sin(phase * (h + 1))
    out[i] = v * envelope(i, total) * 0.4
  }
  return out
}

function noise({ seconds, decay = 6 }) {
  const total = n(seconds)
  const out = new Float32Array(total)
  let last = 0
  for (let i = 0; i < total; i++) {
    // Low-passed white noise reads as a soft crack rather than a hiss.
    const white = Math.random() * 2 - 1
    last = last * 0.6 + white * 0.4
    out[i] = last * Math.exp((-decay * i) / total) * 0.35
  }
  return out
}

function mix(...tracks) {
  const total = Math.max(...tracks.map((t) => t.length))
  const out = new Float32Array(total)
  for (const t of tracks) for (let i = 0; i < t.length; i++) out[i] += t[i]
  return out
}

function after(seconds, track) {
  const pad = new Float32Array(n(seconds) + track.length)
  pad.set(track, n(seconds))
  return pad
}


// --- Extra voices ----------------------------------------------------------

/** Seeded so the crowd and the drums are the same on every run - git diffs stay meaningful. */
let seed = 0x9e3779b9
function rnd() {
  seed = (Math.imul(seed ^ (seed >>> 16), 0x45d9f3b) ^ seed) >>> 0
  seed = (Math.imul(seed ^ (seed >>> 16), 0x45d9f3b) ^ seed) >>> 0
  return ((seed ^ (seed >>> 16)) >>> 0) / 4294967296
}

/** Slap bass: a square-ish pluck whose pitch snaps down from 1.5x in the first 12ms - the "slap". */
function slap(freq, seconds, gain = 0.3) {
  const total = n(seconds)
  const out = new Float32Array(total)
  let phase = 0
  for (let i = 0; i < total; i++) {
    const t = i / RATE
    const snap = 1 + 0.5 * Math.exp(-t / 0.012)
    phase += (2 * Math.PI * freq * snap) / RATE
    const sq = Math.sin(phase) + 0.33 * Math.sin(3 * phase) + 0.2 * Math.sin(5 * phase)
    const body = Math.sin(phase * 0.5) * 0.4
    out[i] = (sq * 0.6 + body) * Math.exp((-6 * i) / total) * gain
  }
  return out
}

/** Three detuned saws with a fast decay: the brass stab of every sports-show theme. */
function stab(freq, seconds, gain = 0.16) {
  const total = n(seconds)
  const out = new Float32Array(total)
  const phases = [0, 0, 0]
  const detune = [0.994, 1, 1.006]
  for (let i = 0; i < total; i++) {
    let v = 0
    for (let k = 0; k < 3; k++) {
      phases[k] += (2 * Math.PI * freq * detune[k]) / RATE
      // Bandlimited-ish saw: first six harmonics.
      for (let h = 1; h <= 6; h++) v += Math.sin(phases[k] * h) / h
    }
    out[i] = v * 0.12 * envelope(i, total, 0.02, 0.6) * gain
  }
  return out
}

function snare(seconds = 0.14, gain = 0.4) {
  const total = n(seconds)
  const out = new Float32Array(total)
  let phase = 0
  let last = 0
  for (let i = 0; i < total; i++) {
    const t = i / total
    phase += (2 * Math.PI * 180) / RATE
    const white = rnd() * 2 - 1
    last = last * 0.3 + white * 0.7
    out[i] = (Math.sin(phase) * 0.5 * Math.exp(-9 * t) + last * 0.5 * Math.exp(-6 * t)) * gain
  }
  return out
}

function hat(seconds = 0.05, gain = 0.16) {
  const total = n(seconds)
  const out = new Float32Array(total)
  let last = 0
  for (let i = 0; i < total; i++) {
    const white = rnd() * 2 - 1
    // High-pass by differencing.
    const v = white - last
    last = white
    out[i] = v * Math.exp((-12 * i) / total) * gain
  }
  return out
}

/** A balloon squeak: a high sine with a slow wobble and a nervous jitter. Toy percussion. */
function squeak(seconds = 0.18, base = 1900, gain = 0.28) {
  const total = n(seconds)
  const out = new Float32Array(total)
  let phase = 0
  for (let i = 0; i < total; i++) {
    const t = i / RATE
    const f = base * (1 + 0.12 * Math.sin(2 * Math.PI * 9 * t) + 0.02 * (rnd() - 0.5))
    phase += (2 * Math.PI * f) / RATE
    out[i] = (Math.sin(phase) + 0.3 * Math.sin(2 * phase)) * envelope(i, total, 0.05, 0.4) * gain
  }
  return out
}

/** Filtered noise with an attack and a long tail: a crowd. `voices` adds little "hey"s on top. */
function crowd({ seconds, attack = 0.1, release = 0.7, voices = 0, centre = 900, gain = 0.5 }) {
  const total = n(seconds)
  const out = new Float32Array(total)
  let lp = 0
  let lp2 = 0
  const k = Math.min(1, centre / RATE * 6)
  for (let i = 0; i < total; i++) {
    const white = rnd() * 2 - 1
    lp += (white - lp) * k
    lp2 += (lp - lp2) * k
    out[i] = (lp - lp2) * 3 * envelope(i, total, attack, release) * gain
  }
  for (let v = 0; v < voices; v++) {
    const at = rnd() * seconds * 0.6
    const f = 260 + rnd() * 320
    const t = tone({ seconds: 0.12 + rnd() * 0.2, from: f, to: f * (0.85 + rnd() * 0.3), harmonics: [1, 0.4, 0.2] })
    const start = n(at)
    for (let i = 0; i < t.length && start + i < total; i++) out[start + i] += t[i] * 0.25
  }
  return out
}

mkdirSync(OUT, { recursive: true })

// --- Music -------------------------------------------------------------------
// Everybody Falls runs at 153bpm in F sharp minor: a minor key made joyful by tempo and bounce.
// We do the same at 150. Sixteen bars, i - VI - III - VII, with the key stepping up a whole tone for
// the back half ("Eurovision modulation") and dropping back at the loop point.
//
// The loop points matter: every bed is a whole number of bars with notes wrapping into the start.

const BPM = 150
const BEAT = 60 / BPM
const BAR = BEAT * 4
const BARS = 16
const STEP = BEAT / 2

const NOTE = (root, semis) => root * Math.pow(2, semis / 12)
const FS2 = 92.5
const FS3 = 185.0
const FS4 = 369.99

/** i - VI - III - VII in F sharp minor, as semitone offsets from the root. */
const PROGRESSION = [0, 8, 3, 10]
/** Whole-tone lift for bars 8-15. */
const lift = (bar) => (bar >= 8 ? 2 : 0)

/** Minor triad for the tonic bars, major for the borrowed ones. */
const triad = (degree) => (degree === 0 ? [0, 3, 7] : [0, 4, 7])

function bed(bars, events, gain = 1) {
  const total = n(bars * BAR)
  const out = new Float32Array(total)
  for (const [at, track] of events) {
    const start = n(at)
    for (let i = 0; i < track.length; i++) {
      // Wrap rather than clip, so a note started near the end tails into the loop point.
      out[(start + i) % total] += track[i] * gain
    }
  }
  return out
}

function kick(seconds = 0.16, gain = 0.5) {
  const total = n(seconds)
  const out = new Float32Array(total)
  let phase = 0
  for (let i = 0; i < total; i++) {
    const t = i / total
    const freq = 120 * Math.exp(-5 * t) + 48
    phase += (2 * Math.PI * freq) / RATE
    out[i] = Math.sin(phase) * Math.exp(-5 * t) * gain
  }
  return out
}

/** Bass pattern per bar: which of the eight eighth-notes play, and which scale tone (root/5th/oct). */
const BASS_STEPS = [
  [0, 1, 0, 0, 1, 0, 1, 0], // steps
  [0, 0, 0, 0, 7, 0, 12, 0] // intervals when they hit
]
const BASS_LOBBY = [1, 0, 0, 0, 0, 0, 1, 0]
const KICK = [1, 0, 0, 0, 0, 0, 1, 0]
const SNARE = [0, 0, 1, 0, 0, 0, 1, 0]

function drums(events, bar, { hats = 'eighths', kicks = true } = {}) {
  for (let s = 0; s < 8; s++) {
    const at = bar * BAR + s * STEP
    if (kicks && KICK[s]) events.push([at, kick()])
    if (kicks && SNARE[s]) events.push([at, snare()])
    if (hats === 'eighths') events.push([at, hat(0.05, s % 2 ? 0.1 : 0.16)])
    if (hats === 'sixteenths') {
      events.push([at, hat(0.05, 0.16)])
      events.push([at + STEP / 2, hat(0.04, 0.09)])
    }
    if (hats === 'sparse' && s % 2 === 0) events.push([at, hat(0.05, 0.1)])
  }
  // Ghost snare before the bar line every second bar: the breakbeat shuffle.
  if (bar % 2 === 1 && kicks) events.push([bar * BAR + 7.5 * STEP, snare(0.08, 0.18)])
}

function bass(events, bar, semis, pattern, gain = 0.3) {
  const root = NOTE(FS2, semis)
  for (let s = 0; s < 8; s++) {
    if (!pattern[s]) continue
    const interval = BASS_STEPS[1][s]
    events.push([bar * BAR + s * STEP, slap(NOTE(root, interval), STEP * 0.9, gain)])
  }
}

function stabs(events, bar, semis, degree, steps) {
  const root = NOTE(FS4, semis)
  for (const s of steps) {
    for (const iv of triad(degree)) events.push([bar * BAR + s * STEP, stab(NOTE(root, iv), STEP * 0.8)])
  }
}

function roundMusic() {
  const events = []
  for (let bar = 0; bar < BARS; bar++) {
    const degree = PROGRESSION[bar % 4]
    const semis = degree + lift(bar)
    bass(events, bar, semis, BASS_STEPS[0])
    drums(events, bar)
    // Brass on the "and" of 1 and the "and" of 3, every other bar - a call, then space to answer.
    if (bar % 2 === 0) stabs(events, bar, semis, degree, [1, 5])
    else stabs(events, bar, semis, degree, [3])
    // The toy: one balloon squeak every four bars, on the last off-beat.
    if (bar % 4 === 3) events.push([bar * BAR + 7 * STEP, squeak(0.16, 2100, 0.2)])
  }
  return bed(BARS, events)
}

function lobbyMusic() {
  const events = []
  for (let bar = 0; bar < BARS; bar++) {
    const degree = PROGRESSION[bar % 4]
    const semis = degree + lift(bar)
    bass(events, bar, semis, BASS_LOBBY, 0.24)
    drums(events, bar, { hats: 'sparse', kicks: false })
    // A held pad instead of stabs: the same triad, long and quiet, so the lobby can be talked over.
    const root = NOTE(FS3, semis)
    for (const iv of triad(degree)) events.push([bar * BAR, stab(NOTE(root, iv), BAR * 0.95, 0.05)])
    if (bar % 8 === 7) events.push([bar * BAR + 6 * STEP, squeak(0.14, 1700, 0.12)])
  }
  return bed(BARS, events)
}

/**
 * The tension bed: two semitones up on top of the modulation, sixteenth hats, a stab every bar and
 * a bass that never rests. Fall Guys moves Hex-A-Gone's score to a more intense section once a
 * round passes two minutes; this fires for the last 20 seconds of every round.
 */
function tenseMusic() {
  const events = []
  for (let bar = 0; bar < BARS; bar++) {
    const degree = PROGRESSION[bar % 4]
    const semis = degree + lift(bar) + 2
    bass(events, bar, semis, [1, 1, 0, 1, 1, 0, 1, 1], 0.3)
    drums(events, bar, { hats: 'sixteenths' })
    stabs(events, bar, semis, degree, [1, 5, 7])
    if (bar % 2 === 1) events.push([bar * BAR + 7 * STEP, squeak(0.12, 2400, 0.18)])
  }
  return bed(BARS, events)
}

/**
 * The Disco Deck's own loop: four-on-the-floor, off-beat hats, an octave bass that never rests,
 * and the stabs on the "and"s. It plays from a speaker on the deck, so it is spatial - the one
 * piece of music in the scene that belongs to a place instead of to the show.
 */
function discoMusic() {
  const events = []
  for (let bar = 0; bar < BARS; bar++) {
    const degree = PROGRESSION[bar % 4]
    const semis = degree + lift(bar)
    bass(events, bar, semis, [1, 0, 1, 0, 1, 0, 1, 0], 0.28)
    for (let s = 0; s < 8; s++) {
      const at = bar * BAR + s * STEP
      if (s % 2 === 0) events.push([at, kick(0.18, 0.55)])
      else events.push([at, hat(0.06, 0.18)])
      if (s === 2 || s === 6) events.push([at, snare(0.1, 0.22)])
    }
    stabs(events, bar, semis, degree, [1, 3, 5, 7])
    if (bar % 4 === 3) events.push([bar * BAR + 6 * STEP, squeak(0.14, 1900, 0.16)])
  }
  return bed(BARS, events)
}

/** Eight seconds of a stadium breathing: two slow LFOs on a filtered noise bed. */
function crowdBed() {
  const total = n(8)
  const out = crowd({ seconds: 8, attack: 0.001, release: 0.001, centre: 700, gain: 0.7 })
  for (let i = 0; i < total; i++) {
    const t = i / RATE
    const swell = 0.7 + 0.2 * Math.sin(2 * Math.PI * 0.11 * t) + 0.1 * Math.sin(2 * Math.PI * 0.07 * t + 1)
    out[i] *= swell
  }
  // Cross-fade the last 0.3s into the first so the loop point does not tick.
  const fade = n(0.3)
  for (let i = 0; i < fade; i++) {
    const k = i / fade
    out[total - fade + i] = out[total - fade + i] * (1 - k) + out[i] * k
  }
  return out
}

// --- Cues --------------------------------------------------------------------

const clips = {
  // Countdown: a bright blip per second, then the whistle on go.
  'tick.wav': tone({ seconds: 0.09, from: 740, harmonics: [1, 0.3] }),
  'go.wav': tone({ seconds: 0.3, from: 880, to: 1320, harmonics: [1, 0.3, 0.1] }),
  // Referee whistle: a high sine with a fast tremolo. The sound of a sports show starting.
  'whistle.wav': (() => {
    const t = tone({ seconds: 0.5, from: 2600, harmonics: [1, 0.15] })
    for (let i = 0; i < t.length; i++) t[i] *= 0.75 + 0.25 * Math.sin(2 * Math.PI * 28 * (i / RATE))
    return t
  })(),

  // A tile giving way underfoot.
  'crack.wav': mix(noise({ seconds: 0.22, decay: 9 }), tone({ seconds: 0.18, from: 300, to: 90, curve: 'exp' })),

  // Eliminated: three descending minor notes with a wobble. Sad, a little funny, never harsh.
  'eliminated.wav': mix(
    stab(659.25, 0.3, 0.5),
    after(0.28, stab(523.25, 0.3, 0.5)),
    after(0.56, mix(stab(440, 0.55, 0.5), tone({ seconds: 0.55, from: 440, to: 415, harmonics: [1, 0.3] })))
  ),

  // Surviving a wave inside a round.
  'survive.wav': mix(
    tone({ seconds: 0.16, from: 523 }),
    after(0.13, tone({ seconds: 0.3, from: 784, harmonics: [1, 0.3] }))
  ),

  // Qualified: a brass fanfare up the triad and held on the octave.
  'qualified.wav': mix(
    stab(369.99, 0.16, 0.6),
    after(0.14, stab(440, 0.16, 0.6)),
    after(0.28, stab(554.37, 0.16, 0.6)),
    after(0.42, mix(stab(739.99, 0.6, 0.7), stab(554.37, 0.6, 0.4), stab(369.99, 0.6, 0.3)))
  ),

  // Crown fanfare: a major arpeggio, kept from before because it works.
  'crown.wav': mix(
    tone({ seconds: 0.15, from: 523, harmonics: [1, 0.35] }),
    after(0.12, tone({ seconds: 0.15, from: 659, harmonics: [1, 0.35] })),
    after(0.24, tone({ seconds: 0.15, from: 784, harmonics: [1, 0.35] })),
    after(0.36, tone({ seconds: 0.55, from: 1047, harmonics: [1, 0.4, 0.15] }))
  ),

  // Falling off the arena: a slide whistle going down.
  'fall.wav': tone({ seconds: 0.7, from: 1400, to: 300, harmonics: [1, 0.2], curve: 'exp' }),

  // Bumper and wall hits: a squeaky toy.
  'squeak.wav': mix(squeak(0.18, 1900, 0.4), after(0.06, squeak(0.12, 2300, 0.2))),

  // Jump pad: a spring.
  'boing.wav': (() => {
    const total = n(0.35)
    const out = new Float32Array(total)
    let phase = 0
    for (let i = 0; i < total; i++) {
      const t = i / RATE
      const f = 90 + 170 * Math.exp(-t * 6) * (1 + 0.5 * Math.sin(2 * Math.PI * 18 * t))
      phase += (2 * Math.PI * f) / RATE
      out[i] = (Math.sin(phase) + 0.3 * Math.sin(2 * phase)) * envelope(i, total, 0.02, 0.5) * 0.45
    }
    return out
  })(),

  // The crowd reacting: a roar for a qualifier, a groan for an elimination.
  'crowd-cheer.wav': crowd({ seconds: 1.7, attack: 0.08, release: 0.6, voices: 40, centre: 1000, gain: 0.55 }),
  'crowd-aww.wav': mix(
    crowd({ seconds: 0.9, attack: 0.15, release: 0.5, voices: 0, centre: 500, gain: 0.45 }),
    tone({ seconds: 0.9, from: 300, to: 200, harmonics: [1, 0.5, 0.25] })
  ),

  'music-lobby.wav': lobbyMusic(),
  'music-round.wav': roundMusic(),
  'music-tense.wav': tenseMusic(),
  'music-disco.wav': discoMusic(),
  'crowd-bed.wav': crowdBed()
}

// Soft-clip the beds so a stab landing on a kick never wraps into a click, then bring every file to
// the same peak: cues to -3 dB, beds to -1 dB. The per-clip volumes in src/systems/audio.ts do the
// actual mixing; the files themselves should all be "as loud as a file can be" so that those
// volumes mean the same thing for every cue.
for (const name of ['music-lobby.wav', 'music-round.wav', 'music-tense.wav', 'music-disco.wav']) {
  const t = clips[name]
  for (let i = 0; i < t.length; i++) t[i] = Math.tanh(t[i] * 1.2)
}
for (const [name, t] of Object.entries(clips)) {
  let peak = 0
  for (let i = 0; i < t.length; i++) peak = Math.max(peak, Math.abs(t[i]))
  const target = name.startsWith('music') || name.startsWith('crowd-bed') ? 0.89 : 0.7
  const k = peak > 0 ? target / peak : 1
  for (let i = 0; i < t.length; i++) t[i] *= k
}

let total = 0
for (const [name, samples] of Object.entries(clips)) {
  const buf = wav(samples)
  writeFileSync(`${OUT}/${name}`, buf)
  total += buf.length
  console.log(`${name.padEnd(18)} ${(buf.length / 1024).toFixed(1)} KB`)
}
// Music goes out as MP3: it is the format the SDK recommends for music, and it is a third the
// size of the equivalent WAV. Short cues stay WAV, where the decode overhead of MP3 would show up
// as latency on a retrigger.
for (const name of ['music-lobby', 'music-round', 'music-tense', 'music-disco', 'crowd-bed']) {
  const wav = `${OUT}/${name}.wav`
  const mp3 = `${OUT}/${name}.mp3`
  try {
    execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', wav, '-codec:a', 'libmp3lame', '-b:a', '96k', mp3])
    unlinkSync(wav)
    console.log(`${name}.mp3`.padEnd(18) + ' (converted from wav)')
  } catch {
    console.log(`${name}: ffmpeg unavailable, keeping wav`)
  }
}

console.log(`\ntotal ${(total / 1024).toFixed(1)} KB before mp3 conversion`)
