import { test } from 'node:test'
import assert from 'node:assert/strict'
import { bonusesFor, BONUS_CLUTCH, BONUS_COMEBACK, BONUS_CROWD } from '../src/lib/bonus'

const base = { survived: true, livesLeft: 3, wasOutLastRound: false, crowdWentWild: false, stakes: 1 }

test('no bonuses for an ordinary qualification', () => {
  assert.deepEqual(bonusesFor(base), [])
})

test('clutch is surviving on your last life', () => {
  const b = bonusesFor({ ...base, livesLeft: 1 })
  assert.deepEqual(b, [{ label: 'CLUTCH', crowns: BONUS_CLUTCH }])
})

test('comeback is qualifying right after being knocked out', () => {
  const b = bonusesFor({ ...base, wasOutLastRound: true })
  assert.deepEqual(b, [{ label: 'COMEBACK', crowns: BONUS_COMEBACK }])
})

test('the crowd bonus pays every survivor when the stadium went wild', () => {
  const b = bonusesFor({ ...base, crowdWentWild: true })
  assert.deepEqual(b, [{ label: 'CROWD BONUS', crowns: BONUS_CROWD }])
})

test('nothing pays out if you did not survive', () => {
  assert.deepEqual(bonusesFor({ ...base, survived: false, livesLeft: 0, wasOutLastRound: true, crowdWentWild: true }), [])
})

test('bonuses stack and scale with the round stakes', () => {
  const b = bonusesFor({ survived: true, livesLeft: 1, wasOutLastRound: true, crowdWentWild: true, stakes: 2 })
  assert.deepEqual(
    b.map((x) => x.label),
    ['CLUTCH', 'COMEBACK', 'CROWD BONUS']
  )
  assert.equal(
    b.reduce((a, x) => a + x.crowns, 0),
    (BONUS_CLUTCH + BONUS_COMEBACK + BONUS_CROWD) * 2
  )
})
