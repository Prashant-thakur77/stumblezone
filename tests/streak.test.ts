import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Streaks } from '../src/lib/streak'

test('qualifying builds a streak and elimination breaks it', () => {
  const s = new Streaks()
  s.qualified('a')
  s.qualified('a')
  s.qualified('b')
  assert.equal(s.streak('a'), 2)
  assert.equal(s.streak('b'), 1)
  assert.deepEqual(s.hot(2), ['a'])
  s.eliminated('a')
  assert.equal(s.streak('a'), 0)
  assert.deepEqual(s.hot(2), [])
})

test('an unknown player has no streak', () => {
  assert.equal(new Streaks().streak('nobody'), 0)
})
