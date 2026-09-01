// Generates the scene's sound effects as small mono WAV files.
//
// Everything here is synthesised from maths - no downloaded samples, no licensing to track, and
// the whole set weighs well under 100 KB. Re-run with `node tools/make-audio.mjs` after editing.

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

mkdirSync(OUT, { recursive: true })

const clips = {
  // Countdown: a flat blip, then a brighter one on go.
  'tick.wav': tone({ seconds: 0.09, from: 660, harmonics: [1, 0.2] }),
  'go.wav': tone({ seconds: 0.3, from: 880, to: 1320, harmonics: [1, 0.3, 0.1] }),

  // A tile giving way underfoot.
  'crack.wav': mix(noise({ seconds: 0.22, decay: 9 }), tone({ seconds: 0.18, from: 300, to: 90, curve: 'exp' })),

  // Falling out: a descending swoop.
  'eliminated.wav': tone({ seconds: 0.75, from: 700, to: 120, harmonics: [1, 0.25], curve: 'exp' }),

  // Surviving the round.
  'survive.wav': mix(
    tone({ seconds: 0.16, from: 523 }),
    after(0.13, tone({ seconds: 0.3, from: 784, harmonics: [1, 0.3] }))
  ),

  // Crown fanfare: a major arpeggio.
  'crown.wav': mix(
    tone({ seconds: 0.15, from: 523, harmonics: [1, 0.35] }),
    after(0.12, tone({ seconds: 0.15, from: 659, harmonics: [1, 0.35] })),
    after(0.24, tone({ seconds: 0.15, from: 784, harmonics: [1, 0.35] })),
    after(0.36, tone({ seconds: 0.55, from: 1047, harmonics: [1, 0.4, 0.15] }))
  )
}

// --- Music -------------------------------------------------------------------
// Two looping beds, synthesised the same way as the cues. 120bpm, eight bars each.
//
// The loop points matter: the last sample must lead cleanly back into the first, so both tracks
// are written as a whole number of bars with no trailing decay.

const BPM = 120
const BEAT = 60 / BPM
const BAR = BEAT * 4

/** Semitone offsets from a root, as scale degrees. */
const NOTE = (root, semis) => root * Math.pow(2, semis / 12)
const C4 = 261.63

function pluck(freq, seconds, gain = 0.22) {
  const total = n(seconds)
  const out = new Float32Array(total)
  let phase = 0
  for (let i = 0; i < total; i++) {
    phase += (2 * Math.PI * freq) / RATE
    // A soft triangle-ish tone: fundamental plus a quiet fifth, decaying quickly.
    const v = Math.sin(phase) + 0.25 * Math.sin(phase * 3)
    out[i] = v * Math.exp((-4.5 * i) / total) * gain
  }
  return out
}

function kick(seconds = 0.16, gain = 0.5) {
  const total = n(seconds)
  const out = new Float32Array(total)
  let phase = 0
  for (let i = 0; i < total; i++) {
    const t = i / total
    const freq = 110 * Math.exp(-4 * t) + 45
    phase += (2 * Math.PI * freq) / RATE
    out[i] = Math.sin(phase) * Math.exp(-5 * t) * gain
  }
  return out
}

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

/** I - vi - IV - V, the friendliest progression there is. */
const PROGRESSION = [0, -3, 5, 7]

function lobbyMusic() {
  const events = []
  for (let bar = 0; bar < 8; bar++) {
    const root = NOTE(C4, PROGRESSION[bar % 4])
    // Slow arpeggio, two notes a bar - calm enough to talk over.
    events.push([bar * BAR, pluck(root, BEAT * 1.8, 0.16)])
    events.push([bar * BAR + BEAT * 2, pluck(root * 1.5, BEAT * 1.8, 0.13)])
    events.push([bar * BAR + BEAT, pluck(root / 2, BEAT * 2.5, 0.1)])
  }
  return bed(8, events)
}

function roundMusic() {
  const events = []
  for (let bar = 0; bar < 8; bar++) {
    const root = NOTE(C4, PROGRESSION[bar % 4])
    // Eighth-note arpeggio over a four-on-the-floor kick: busier, pushes you to move.
    const shape = [1, 1.25, 1.5, 2, 1.5, 1.25]
    for (let step = 0; step < 8; step++) {
      const f = root * shape[step % shape.length]
      events.push([bar * BAR + step * (BEAT / 2), pluck(f, BEAT * 0.45, 0.11)])
    }
    for (let b = 0; b < 4; b++) events.push([bar * BAR + b * BEAT, kick()])
    events.push([bar * BAR, pluck(root / 2, BEAT * 3, 0.12)])
  }
  return bed(8, events)
}

clips['music-lobby.wav'] = lobbyMusic()
clips['music-round.wav'] = roundMusic()

let total = 0
for (const [name, samples] of Object.entries(clips)) {
  const buf = wav(samples)
  writeFileSync(`${OUT}/${name}`, buf)
  total += buf.length
  console.log(`${name.padEnd(16)} ${(buf.length / 1024).toFixed(1)} KB`)
}
// Music goes out as MP3: it is the format the SDK recommends for music, and it is a third the
// size of the equivalent WAV. Short cues stay WAV, where the decode overhead of MP3 would show up
// as latency on a retrigger.
for (const name of ['music-lobby', 'music-round']) {
  const wav = `${OUT}/${name}.wav`
  const mp3 = `${OUT}/${name}.mp3`
  try {
    execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', wav, '-codec:a', 'libmp3lame', '-b:a', '96k', mp3])
    unlinkSync(wav)
    console.log(`${name}.mp3`.padEnd(16) + ' (converted from wav)')
  } catch {
    console.log(`${name}: ffmpeg unavailable, keeping wav`)
  }
}

console.log(`\ntotal ${(total / 1024).toFixed(1)} KB before mp3 conversion`)
