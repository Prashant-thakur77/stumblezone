import { test } from 'node:test'
import assert from 'node:assert/strict'
import { powerupsFor, Collection, POWERUP_TIMES, PICK_RADIUS } from '../src/lib/powerups'

test('two pickups a round, one of each kind, inside the stage, stable per seed', () => {
  for (let seed = 1; seed < 60; seed++) {
    const p = powerupsFor(seed, 11)
    assert.equal(p.length, 2)
    assert.deepEqual(p.map((x) => x.kind).sort(), ['boost', 'shield'])
    for (const x of p) {
      const r = Math.hypot(x.x, x.z)
      assert.ok(r >= 2 && r <= 11 - 0.5, 'pickup at radius ' + r)
    }
    assert.deepEqual(p.map((x) => x.at), POWERUP_TIMES)
  }
  assert.deepEqual(powerupsFor(9, 11), powerupsFor(9, 11))
  assert.notDeepEqual(powerupsFor(9, 11), powerupsFor(10, 11))
})

test('a pickup is taken once, only once it has appeared, only within reach', () => {
  const list = powerupsFor(3, 11)
  const c = new Collection()
  const p = list[0]
  assert.equal(c.tryTake(list, 0, p.at - 1, p.x, p.z), false, 'too early')
  assert.equal(c.tryTake(list, 0, p.at, p.x + PICK_RADIUS + 0.1, p.z), false, 'too far')
  assert.equal(c.tryTake(list, 0, p.at, p.x, p.z), true)
  assert.equal(c.tryTake(list, 0, p.at + 5, p.x, p.z), false, 'already taken')
  c.reset()
  assert.equal(c.tryTake(list, 0, p.at, p.x, p.z), true, 'a new round resets')
})
