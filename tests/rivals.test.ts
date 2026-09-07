import { test } from 'node:test'
import assert from 'node:assert/strict'
import { HeadToHead } from '../src/lib/rivals'

test('wins and losses per rival, and the rival you meet most', () => {
  const h = new HeadToHead()
  assert.equal(h.score('a'), '')
  h.record('a', true)
  h.record('a', false)
  h.record('a', true)
  h.record('b', false)
  assert.equal(h.score('a'), '2-1')
  assert.equal(h.score('b'), '0-1')
  assert.equal(h.main(), 'a')
  h.reset()
  assert.equal(h.main(), '')
})
