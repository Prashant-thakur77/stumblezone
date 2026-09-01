import { test } from 'node:test'
import assert from 'node:assert/strict'
import { jumpBarSpeed, jumpBarBeams, JUMPBAR_SECOND_AT } from '../src/lib/jumpbar'
import { PLAY_SECONDS } from '../src/config'

test('the beam speeds up across the round and then holds', () => {
  assert.equal(jumpBarSpeed(0), 30)
  assert.ok(jumpBarSpeed(PLAY_SECONDS / 2) > 30)
  assert.equal(jumpBarSpeed(PLAY_SECONDS), 55)
  assert.equal(jumpBarSpeed(PLAY_SECONDS * 2), 55)
})

test('beams are seeded, the second one counter-rotates and arrives late', () => {
  const a = jumpBarBeams(1)
  const b = jumpBarBeams(1)
  const c = jumpBarBeams(2)
  assert.deepEqual(a, b)
  assert.equal(a.length, 2)
  assert.equal(a[0].direction, -a[1].direction)
  assert.ok(a[0].angle >= 0 && a[0].angle < 360)
  assert.notEqual(a[0].angle, c[0].angle)
  assert.equal(JUMPBAR_SECOND_AT, 50)
})
