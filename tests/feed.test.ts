import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Feed, FEED_TTL_MS, FEED_MAX } from '../src/lib/feed'

test('a toast is visible for its TTL and then gone', () => {
  const f = new Feed()
  f.push('Alice is OUT', 1000)
  assert.deepEqual(f.visible(1000), ['Alice is OUT'])
  assert.deepEqual(f.visible(1000 + FEED_TTL_MS - 1), ['Alice is OUT'])
  assert.deepEqual(f.visible(1000 + FEED_TTL_MS), [])
})

test('newest first, capped at FEED_MAX', () => {
  const f = new Feed()
  for (let i = 0; i < FEED_MAX + 2; i++) f.push('t' + i, i)
  const v = f.visible(10)
  assert.equal(v.length, FEED_MAX)
  assert.equal(v[0], 't' + (FEED_MAX + 1))
})

test('the same text twice in a row is shown once', () => {
  const f = new Feed()
  f.push('Bob is OUT', 0)
  f.push('Bob is OUT', 10)
  assert.equal(f.visible(20).length, 1)
})
