import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Lap } from '../src/lib/lap'
import { EAST_LANE, NE_PLAZA } from '../src/config'

test('a lap needs a start, a turn and a finish, in that order', () => {
  const lap = new Lap()
  assert.equal(lap.finish(1000), null, 'no clock running')
  lap.start(1000)
  assert.equal(lap.finish(5000), null, 'no turn: the course was cut')
  lap.turn()
  assert.equal(lap.finish(25300), 24300)
  assert.equal(lap.finish(26000), null, 'the clock stopped at the finish')
})

test('a second start resets the turn', () => {
  const lap = new Lap()
  lap.start(0)
  lap.turn()
  lap.start(100)
  assert.equal(lap.finish(200), null)
  assert.ok(lap.running())
})

test('the pads sit on the east lane and its plaza', () => {
  const start = { x: 61.5, z: 21 }
  const turn = { x: 60, z: 61 }
  assert.ok(Math.abs(start.x - EAST_LANE.x) <= EAST_LANE.width / 2 - 1)
  assert.ok(start.z >= EAST_LANE.z - EAST_LANE.depth / 2 + 1)
  assert.ok(Math.abs(turn.x - NE_PLAZA.x) <= NE_PLAZA.size / 2 - 1)
  assert.ok(Math.abs(turn.z - NE_PLAZA.z) <= NE_PLAZA.size / 2 - 1)
})
