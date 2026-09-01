import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isGolden, slotsUntilGolden, GOLDEN_EVERY } from '../src/lib/schedule'
import { ROUND_COUNT } from '../src/config'

test('every fourth show is golden, including before the epoch', () => {
  assert.ok(!isGolden(0))
  assert.ok(!isGolden(2))
  assert.ok(isGolden(3))
  assert.ok(isGolden(7))
  assert.ok(isGolden(-1))
  assert.equal(GOLDEN_EVERY, 4)
})

test('slots until the next golden show, zero while inside one', () => {
  assert.equal(slotsUntilGolden(0), 3 * ROUND_COUNT)
  assert.equal(slotsUntilGolden(3 * ROUND_COUNT - 1), 1)
  assert.equal(slotsUntilGolden(3 * ROUND_COUNT), 0)
  assert.equal(slotsUntilGolden(3 * ROUND_COUNT + 3), 0)
  assert.equal(slotsUntilGolden(4 * ROUND_COUNT), 3 * ROUND_COUNT)
})
