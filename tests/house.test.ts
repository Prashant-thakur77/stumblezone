import { test } from 'node:test'
import assert from 'node:assert/strict'
import { beatTheHouse, HOUSE_MS, SCORE_ROUNDS, houseLine } from '../src/lib/house'
import { ROUND_NAMES, PLAY_SECONDS } from '../src/config'

test('every round has exactly one kind of house: a time inside the round, or a score', () => {
  for (let id = 0; id < ROUND_NAMES.length; id++) {
    const timed = HOUSE_MS[id] !== undefined
    const scored = SCORE_ROUNDS[id] !== undefined
    assert.ok(timed !== scored, ROUND_NAMES[id] + ' must have a time or a score, not both or neither')
    if (timed) assert.ok(HOUSE_MS[id] > 20000 && HOUSE_MS[id] < PLAY_SECONDS * 1000)
  }
})

test('survival rounds: last past the house, or survive outright', () => {
  assert.ok(beatTheHouse(1, false, HOUSE_MS[1] + 1, null).beaten)
  assert.ok(!beatTheHouse(1, false, HOUSE_MS[1] - 1000, null).beaten)
  assert.ok(beatTheHouse(1, true, 0, null).beaten)
  assert.match(beatTheHouse(1, false, 10000, null).label, /House on Sweeper Gates/)
})

test('Tip Toe: finish under the house, surviving without finishing is not enough', () => {
  assert.ok(beatTheHouse(2, true, 85000, HOUSE_MS[2] - 500).beaten)
  assert.ok(!beatTheHouse(2, true, 85000, HOUSE_MS[2] + 500).beaten)
  assert.ok(!beatTheHouse(2, true, 85000, null).beaten)
})

test('Crown Rush: the house is a score', () => {
  assert.ok(beatTheHouse(7, true, 85000, null, SCORE_ROUNDS[7]).beaten)
  assert.ok(!beatTheHouse(7, true, 85000, null, SCORE_ROUNDS[7] - 1).beaten)
})

test('the house line reads as a target', () => {
  assert.equal(houseLine(1), 'House: last ' + Math.round(HOUSE_MS[1] / 1000) + 's')
  assert.equal(houseLine(2), 'House: finish under ' + Math.round(HOUSE_MS[2] / 1000) + 's')
  assert.equal(houseLine(7), 'House: score ' + SCORE_ROUNDS[7])
})
