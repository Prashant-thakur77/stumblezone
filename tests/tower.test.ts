import { test } from 'node:test'
import assert from 'node:assert/strict'
import { towerSteps, stepGaps, formatTime } from '../src/lib/tower'
import { TOWER, LOBBY, LEDGE } from '../src/config'

test('every step is reachable with a stock jump, and the tower stays under the ledge', () => {
  // A standing jump in the explorer clears about 1.2m up and 3m across; leave margin for a thumb.
  for (const g of stepGaps()) {
    assert.ok(g.gap <= 2.4, 'gap ' + g.gap.toFixed(2) + 'm is too far for a phone')
    assert.ok(g.rise <= 1.1, 'rise ' + g.rise.toFixed(2) + 'm is too high')
    assert.ok(g.gap >= 1.2, 'steps must not overlap')
  }
  const top = towerSteps()[TOWER.steps - 1]
  assert.ok(top.y < LEDGE.y - 1, 'the lookout must stay below the spectator ledge')
  assert.ok(top.y > LOBBY.y + 10, 'a climb worth timing is at least ten metres')
})

test('the spiral stays in the west corner of the village', () => {
  for (const s of towerSteps()) {
    assert.ok(s.x >= 0.5 && s.x <= 5.5, 'x ' + s.x)
    assert.ok(s.z >= 9 && s.z <= 15, 'z ' + s.z)
  }
})

test('times read like a stopwatch', () => {
  assert.equal(formatTime(0), '0:00.0')
  assert.equal(formatTime(41_700), '0:41.7')
  assert.equal(formatTime(61_050), '1:01.0')
})
