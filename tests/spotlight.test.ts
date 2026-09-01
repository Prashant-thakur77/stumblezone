import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  spotCentre,
  spotCount,
  spotSpeed,
  SpotTracker,
  SPOT_HIT_SECONDS,
  SPOT_WARN_SECONDS,
  SPOT_THIRD_AT
} from '../src/lib/spotlight'
import { DISC_RADIUS } from '../src/config'

test('spots stay on the stage for the whole round and differ by seed and index', () => {
  for (let t = 0; t <= 90; t += 0.25) {
    for (let i = 0; i < 3; i++) {
      const p = spotCentre(7, i, t)
      assert.ok(Math.hypot(p.x, p.z) <= DISC_RADIUS - 2 + 1e-9, 'spot ' + i + ' left the stage at ' + t)
    }
  }
  assert.notDeepEqual(spotCentre(1, 0, 3), spotCentre(2, 0, 3))
  assert.notDeepEqual(spotCentre(1, 0, 3), spotCentre(1, 1, 3))
  assert.deepEqual(spotCentre(5, 1, 12.5), spotCentre(5, 1, 12.5))
})

test('a third light and a speed-up arrive at 45s', () => {
  assert.equal(spotCount(0), 2)
  assert.equal(spotCount(SPOT_THIRD_AT - 0.1), 2)
  assert.equal(spotCount(SPOT_THIRD_AT), 3)
  assert.equal(spotSpeed(0), 1)
  assert.equal(spotSpeed(SPOT_THIRD_AT), 1.5)
})

test('standing in the light warns, then hits, and stepping out resets', () => {
  const s = new SpotTracker()
  assert.equal(s.update(true, SPOT_HIT_SECONDS - SPOT_WARN_SECONDS - 0.1), 'ok')
  assert.equal(s.update(true, 0.2), 'warn')
  assert.equal(s.update(false, 0.1), 'ok')
  assert.equal(s.update(true, SPOT_HIT_SECONDS - 0.1), 'warn')
  assert.equal(s.update(true, 0.2), 'hit')
  assert.equal(s.update(true, 0.1), 'ok')
})
