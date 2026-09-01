import { test } from 'node:test'
import assert from 'node:assert/strict'
import { dayIndex, dailyFor, dailyDone, DAILY_CROWNS } from '../src/lib/daily'
import { ROUND_NAMES } from '../src/config'

test('one challenge per UTC day, stable, cycling through the pool', () => {
  assert.equal(dayIndex(0), 0)
  assert.equal(dayIndex(86400000 * 3 + 5), 3)
  assert.deepEqual(dailyFor(4), dailyFor(4))
  assert.deepEqual(dailyFor(-1), dailyFor(-1))
  const ids = new Set([0, 1, 2, 3, 4, 5].map((d) => dailyFor(d).id))
  assert.ok(ids.size >= 5, 'the pool must not repeat itself within a week')
  assert.equal(DAILY_CROWNS, 3)
})

test('every challenge names a real round in its text', () => {
  for (let d = 0; d < 14; d++) {
    const c = dailyFor(d)
    assert.ok(ROUND_NAMES[c.roundId] !== undefined)
    assert.ok(c.text.includes(ROUND_NAMES[c.roundId]))
  }
})

test('completion rules', () => {
  const qualify = { id: 0, text: '', roundId: 2, kind: 'qualify' as const }
  assert.ok(dailyDone(qualify, { roundId: 2, survived: true, first: false, survivedMs: 85000 }))
  assert.ok(!dailyDone(qualify, { roundId: 1, survived: true, first: false, survivedMs: 85000 }))
  const first = { ...qualify, kind: 'first' as const }
  assert.ok(!dailyDone(first, { roundId: 2, survived: true, first: false, survivedMs: 85000 }))
  assert.ok(dailyDone(first, { roundId: 2, survived: true, first: true, survivedMs: 85000 }))
  const survive = { ...qualify, kind: 'survive' as const }
  assert.ok(!dailyDone(survive, { roundId: 2, survived: false, first: false, survivedMs: 59000 }))
  assert.ok(dailyDone(survive, { roundId: 2, survived: false, first: false, survivedMs: 60000 }))
})
