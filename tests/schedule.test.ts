import { test } from 'node:test'
import assert from 'node:assert/strict'
import { slotIndex, slotElapsed, roundIndex, phaseAt, seedForSlot } from '../src/lib/schedule.ts'
import {
  SLOT_SECONDS,
  ROUND_COUNT,
  ROUND_NAMES,
  FINALE_ROUND,
  INTRO_SECONDS,
  PLAY_SECONDS,
  RESULTS_SECONDS,
  GET_READY_SECONDS
} from '../src/config.ts'

test('phase durations sum to the slot length', () => {
  assert.equal(INTRO_SECONDS + PLAY_SECONDS + RESULTS_SECONDS, SLOT_SECONDS)
})

test('slotIndex advances exactly once per SLOT_SECONDS', () => {
  // Anchor on an exact slot boundary, or the +1s/-1s assertions straddle two slots.
  const s = slotIndex(1_756_600_000_000)
  const start = s * SLOT_SECONDS * 1000
  assert.equal(slotIndex(start), s)
  assert.equal(slotIndex(start + (SLOT_SECONDS * 1000 - 1)), s, 'last millisecond still in slot')
  assert.equal(slotIndex(start + SLOT_SECONDS * 1000), s + 1, 'next millisecond starts the next slot')
  assert.equal(slotElapsed(start), 0)
})

test('slotElapsed stays inside the slot', () => {
  for (let ms = 0; ms < SLOT_SECONDS * 1000 * 3; ms += 997) {
    const e = slotElapsed(ms)
    assert.ok(e >= 0 && e < SLOT_SECONDS, `elapsed ${e} out of range at ${ms}ms`)
  }
})

test('slotIndex and slotElapsed reconstruct the clock', () => {
  const t = 1_756_600_123_456
  assert.ok(Math.abs(slotIndex(t) * SLOT_SECONDS + slotElapsed(t) - t / 1000) < 1e-6)
})

test('roundIndex names a real round for every slot, and every round is reachable', () => {
  const seen = new Set<number>()
  for (let s = 0; s < ROUND_COUNT * 40; s++) {
    const r = roundIndex(s)
    assert.ok(r >= 0 && r < ROUND_NAMES.length, `round ${r} out of range for slot ${s}`)
    seen.add(r)
  }
  assert.equal(seen.size, ROUND_NAMES.length, 'not every round is reachable across shows')
  const back = roundIndex(-1)
  assert.ok(back >= 0 && back < ROUND_NAMES.length, 'negative slots must not produce a negative index')
  assert.equal(back, FINALE_ROUND, 'slot -1 is the last act of the show before the epoch')
})

test('phaseAt covers the whole slot with no gap and no overlap', () => {
  const playStart = INTRO_SECONDS
  const resultsStart = INTRO_SECONDS + PLAY_SECONDS
  assert.equal(phaseAt(0).phase, 'intro')
  assert.equal(phaseAt(playStart - 0.001).phase, 'intro')
  assert.equal(phaseAt(playStart).phase, 'play')
  assert.equal(phaseAt(resultsStart - 0.001).phase, 'play')
  assert.equal(phaseAt(resultsStart).phase, 'results')
  assert.equal(phaseAt(SLOT_SECONDS - 0.001).phase, 'results')
})

test('phaseAt remaining counts down to zero at each boundary', () => {
  assert.equal(phaseAt(0).remaining, INTRO_SECONDS)
  assert.ok(phaseAt(INTRO_SECONDS - 0.001).remaining < 0.01)
  assert.equal(phaseAt(INTRO_SECONDS).remaining, PLAY_SECONDS)
  assert.equal(phaseAt(INTRO_SECONDS + PLAY_SECONDS).remaining, RESULTS_SECONDS)
})

test('a one-second clock skew only disagrees across the slot boundary', () => {
  // This is the test that justifies shipping with no clock sync at all.
  let disagree = 0
  const base = 1_756_600_000_000
  const samples = SLOT_SECONDS * 10
  for (let i = 0; i < samples; i++) {
    const ms = base + i * 100
    if (roundIndex(slotIndex(ms)) !== roundIndex(slotIndex(ms + 1000))) disagree++
  }
  assert.ok(disagree <= 10, `1s skew desyncs ${disagree} of ${samples} sample points`)
})

test('the get-ready freeze is long enough to cover the skew window', () => {
  // Two clients 1s apart must both be frozen when the later one starts playing.
  assert.ok(GET_READY_SECONDS >= 2, 'freeze must comfortably exceed realistic NTP drift')
})

test('seedForSlot is stable and differs between slots', () => {
  assert.equal(seedForSlot(500), seedForSlot(500))
  assert.notEqual(seedForSlot(500), seedForSlot(501))
})
