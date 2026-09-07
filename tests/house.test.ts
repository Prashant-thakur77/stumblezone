import { test } from 'node:test'
import assert from 'node:assert/strict'
import { beatTheHouse, HOUSE_MS } from '../src/lib/house'
import { ROUND_NAMES, PLAY_SECONDS } from '../src/config'

test('every round has a house time inside the round', () => {
  for (let id = 0; id < ROUND_NAMES.length; id++) {
    assert.ok(HOUSE_MS[id] !== undefined, ROUND_NAMES[id] + ' has no house time')
    assert.ok(HOUSE_MS[id] > 20000 && HOUSE_MS[id] < PLAY_SECONDS * 1000)
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
