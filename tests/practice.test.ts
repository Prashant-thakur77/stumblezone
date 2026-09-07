import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Patch, SINK_DELAY, SINK_TIME, RESPAWN } from '../src/lib/practice'

test('a stepped tile holds for the delay, sinks, stays down, then returns whole', () => {
  const p = new Patch(2)
  p.step(0, 10)
  assert.deepEqual(p.tick(10 + SINK_DELAY - 0.01)[0], { drop: 0, solid: true })
  const mid = p.tick(10 + SINK_DELAY + SINK_TIME / 2)[0]
  assert.ok(mid.drop > 0.4 && mid.drop < 0.6 && !mid.solid)
  assert.deepEqual(p.tick(10 + SINK_DELAY + SINK_TIME + 1)[0], { drop: 1, solid: false })
  assert.deepEqual(p.tick(10 + RESPAWN + 0.01)[0], { drop: 0, solid: true })
  assert.deepEqual(p.tick(10 + RESPAWN + 0.01)[1], { drop: 0, solid: true }, 'the other tile never moved')
})

test('stepping again while down does not restart the clock', () => {
  const p = new Patch(1)
  p.step(0, 0)
  p.step(0, 2)
  assert.deepEqual(p.tick(RESPAWN + 0.01)[0], { drop: 0, solid: true })
})

test('a tile never reports both sunk and solid', () => {
  const p = new Patch(1)
  p.step(0, 0)
  for (let t = 0; t < RESPAWN + 1; t += 0.05) {
    const s = p.tick(t)[0]
    assert.ok(!(s.drop > 0 && s.solid), 'sunk and solid at ' + t)
  }
})
