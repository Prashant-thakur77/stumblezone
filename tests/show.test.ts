import { test } from 'node:test'
import assert from 'node:assert/strict'
import { showIndex, actIndex, isFinale, roundIndex } from '../src/lib/schedule.ts'
import { ROUND_COUNT } from '../src/config.ts'

test('a show is exactly one pass through every round', () => {
  const first = showIndex(0)
  for (let i = 0; i < ROUND_COUNT; i++) {
    assert.equal(showIndex(i), first, `slot ${i} should still be show ${first}`)
  }
  assert.equal(showIndex(ROUND_COUNT), first + 1, 'the next slot starts a new show')
})

test('every show contains each act exactly once', () => {
  const acts = new Set<number>()
  for (let i = 0; i < ROUND_COUNT; i++) acts.add(actIndex(i))
  assert.equal(acts.size, ROUND_COUNT, 'a show must run every round once')
})

test('exactly one slot per show is the finale, and it is the last one', () => {
  let finales = 0
  for (let i = 0; i < ROUND_COUNT; i++) if (isFinale(i)) finales++
  assert.equal(finales, 1, 'a show has exactly one finale')
  assert.ok(isFinale(ROUND_COUNT - 1), 'the finale is the last act')
  assert.equal(roundIndex(ROUND_COUNT - 1), ROUND_COUNT - 1)
})

test('show boundaries never fall mid-show for negative or large slots', () => {
  for (const slot of [-8, -1, 0, 7, 1_000_000, 14_638_333]) {
    const show = showIndex(slot)
    const act = actIndex(slot)
    assert.ok(Number.isInteger(show), `show ${show} not an integer at slot ${slot}`)
    assert.ok(act >= 0 && act < ROUND_COUNT, `act ${act} out of range at slot ${slot}`)
  }
})
