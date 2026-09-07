import { test } from 'node:test'
import assert from 'node:assert/strict'
import { jumpBarSpeed, jumpBarBeams, jumpBarDirection, jumpBarAngle, JUMPBAR_SECOND_AT, JUMPBAR_REVERSE_AT } from '../src/lib/jumpbar'
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

test('both beams reverse at 70s and stay reversed', () => {
  assert.equal(jumpBarDirection(1, JUMPBAR_REVERSE_AT - 0.1), 1)
  assert.equal(jumpBarDirection(1, JUMPBAR_REVERSE_AT), -1)
  assert.equal(jumpBarDirection(-1, JUMPBAR_REVERSE_AT + 10), 1)
})

test('the beam angle is a function of the clock, and turns back after the reversal', () => {
  assert.equal(jumpBarAngle(10, 1, 0), 10)
  // One second at the starting speed is thirty degrees, near enough.
  assert.ok(Math.abs(jumpBarAngle(0, 1, 1) - jumpBarSpeed(0)) < 0.5)
  const atReverse = jumpBarAngle(0, 1, JUMPBAR_REVERSE_AT)
  const later = jumpBarAngle(0, 1, JUMPBAR_REVERSE_AT + 1)
  const diff = ((later - atReverse + 540) % 360) - 180
  assert.ok(diff < 0, 'after the reversal the beam moves the other way')
  assert.ok(jumpBarAngle(350, -1, 2) < 350 && jumpBarAngle(350, -1, 2) > 280)
  for (let t = 0; t < 90; t += 0.5) {
    const a = jumpBarAngle(123, 1, t)
    assert.ok(a >= 0 && a < 360)
  }
})
