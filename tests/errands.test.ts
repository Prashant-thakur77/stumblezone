import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Errands, ERRANDS } from '../src/lib/errands'

test('each errand pays once, and the set completes exactly at six', () => {
  const e = new Errands()
  assert.equal(e.done('hat'), true)
  assert.equal(e.done('hat'), false)
  assert.equal(e.count(), 1)
  assert.equal(e.next()?.id, 'dance')
  for (const x of ERRANDS) e.done(x.id)
  assert.ok(e.complete())
  assert.equal(e.next(), null)
  assert.equal(e.count(), ERRANDS.length)
})

test('the errand list has six distinct ids', () => {
  assert.equal(ERRANDS.length, 6)
  assert.equal(new Set(ERRANDS.map((e) => e.id)).size, 6)
})
