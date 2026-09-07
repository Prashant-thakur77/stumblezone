import { test } from 'node:test'
import assert from 'node:assert/strict'
import { zoneAt, pointsFor, Scores, nextHopIn, HOP_SECONDS, SCORING_FROM, ZONE_RADIUS_START, ZONE_RADIUS_END } from '../src/lib/crownrush'
import { DISC_RADIUS, PLAY_SECONDS } from '../src/config'

test('the zone stays wholly on the stage for every seed, hops every twelve seconds, shrinks, and is stable', () => {
  for (let seed = 0; seed < 400; seed++) {
    for (let t = SCORING_FROM; t <= PLAY_SECONDS; t += 3) {
      const z = zoneAt(seed * 7919 + 13, t)
      assert.ok(Math.hypot(z.x, z.z) + z.radius <= DISC_RADIUS - 0.5, 'zone off the stage, seed ' + seed + ' at ' + t)
    }
  }
  let lastHop = -1
  let hops = 0
  for (let t = 0; t <= PLAY_SECONDS; t += 0.5) {
    const z = zoneAt(11, t)
    if (z.hop !== lastHop) {
      lastHop = z.hop
      hops++
    }
  }
  assert.ok(hops >= 5, 'only ' + hops + ' hops')
  assert.equal(zoneAt(11, SCORING_FROM + HOP_SECONDS + 1).hop, 1)
  assert.ok(zoneAt(11, SCORING_FROM).radius > zoneAt(11, PLAY_SECONDS).radius)
  assert.ok(Math.abs(zoneAt(11, SCORING_FROM).radius - ZONE_RADIUS_START) < 1e-9)
  assert.ok(Math.abs(zoneAt(11, PLAY_SECONDS).radius - ZONE_RADIUS_END) < 1e-9)
  assert.deepEqual(zoneAt(11, 40), zoneAt(11, 40))
  assert.notDeepEqual(zoneAt(11, 40), zoneAt(12, 40))
})

test('points only inside the zone, only during scoring', () => {
  const z = zoneAt(3, 30)
  assert.equal(pointsFor(z, z.radius - 0.1, 0.5, 30), 0.5)
  assert.equal(pointsFor(z, z.radius + 0.1, 0.5, 30), 0)
  assert.equal(pointsFor(z, 0, 0.5, SCORING_FROM - 1), 0)
})

test('scores keep the best report per player and name a leader', () => {
  const s = new Scores()
  assert.equal(s.leader().address, '')
  s.report('a', 5)
  s.report('b', 7)
  s.report('a', 3)
  assert.equal(s.get('a'), 5, 'a stale lower report does not overwrite')
  assert.deepEqual(s.leader(), { address: 'b', points: 7 })
  assert.deepEqual(s.ranked().map((r) => r.address), ['b', 'a'])
})

test('the hop timer counts to the first hop, then per cycle', () => {
  assert.equal(nextHopIn(0), SCORING_FROM)
  assert.equal(nextHopIn(SCORING_FROM), HOP_SECONDS)
  assert.equal(nextHopIn(SCORING_FROM + HOP_SECONDS - 1), 1)
})

test('ties break on address so every client names the same winner', () => {
  const s = new Scores()
  s.report('zed', 4)
  s.report('amy', 4)
  assert.equal(s.leader().address, 'amy')
  const s2 = new Scores()
  s2.report('amy', 4)
  s2.report('zed', 4)
  assert.equal(s2.leader().address, 'amy')
  assert.equal(s2.size(), 2)
})
