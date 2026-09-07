import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Bet, BET_QUALIFIED, BET_OUTRIGHT } from '../src/lib/bet'

test('one pick per round, resolved by who survived', () => {
  const b = new Bet()
  assert.equal(b.resolve(5, ['a'], false), null)
  b.choose('a', 5)
  b.choose('b', 5)
  assert.equal(b.picked(5), 'a', 'the first pick stands')
  assert.deepEqual(b.resolve(5, ['a', 'c'], false), { crowns: BET_QUALIFIED, label: 'YOUR PICK QUALIFIED' })
  assert.equal(b.resolve(5, ['a'], false), null, 'resolved once')
})

test('an outright win pays double; a fallen pick pays nothing', () => {
  const b = new Bet()
  b.choose('a', 6)
  assert.deepEqual(b.resolve(6, ['a'], true), { crowns: BET_OUTRIGHT, label: 'YOUR PICK WON OUTRIGHT' })
  b.choose('a', 7)
  assert.deepEqual(b.resolve(7, ['b'], false), { crowns: 0, label: 'YOUR PICK LOST' })
  assert.equal(b.picked(7), '')
})
