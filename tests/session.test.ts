import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Session } from '../src/lib/session'

test('a session counts rounds, qualifications, falls and the best streak', () => {
  const s = new Session()
  assert.equal(s.summary(), 'Your first round. Welcome to the show.')
  s.round(true)
  s.round(true)
  s.round(false)
  s.round(true)
  assert.deepEqual(s.stats(), { rounds: 4, qualified: 3, fell: 1, bestStreak: 2 })
  assert.equal(s.summary(), '4 rounds  ·  3 qualified  ·  best streak 2')
})

test('the best streak survives a later collapse', () => {
  const s = new Session()
  for (let i = 0; i < 5; i++) s.round(true)
  s.round(false)
  s.round(true)
  assert.equal(s.stats().bestStreak, 5)
})
