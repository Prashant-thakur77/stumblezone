import { test } from 'node:test'
import assert from 'node:assert/strict'
import { WEST_LANE, EAST_LANE, NW_PLAZA, NE_PLAZA, VILLAGE_FLOOR, ARENA_CENTER_X, ARENA_CENTER_Z, ARENA_RADIUS } from '../src/config'

// Every place outside the arena, as a footprint. Anything outside the parcels renders as nothing,
// and anything overlapping a pillar is a wall in the middle of a lane.
type Box = { name: string; x: [number, number]; z: [number, number] }

export function footprints(): Box[] {
  const rect = (name: string, c: { x: number; z: number }, w: number, d: number): Box => ({
    name,
    x: [c.x - w / 2, c.x + w / 2],
    z: [c.z - d / 2, c.z + d / 2]
  })
  return [
    rect('west lane', WEST_LANE, WEST_LANE.width, WEST_LANE.depth),
    rect('east lane', EAST_LANE, EAST_LANE.width, EAST_LANE.depth),
    rect('nw plaza', NW_PLAZA, NW_PLAZA.size, NW_PLAZA.size),
    rect('ne plaza', NE_PLAZA, NE_PLAZA.size, NE_PLAZA.size)
  ]
}

test('the ring road stays inside the scene', () => {
  for (const b of footprints()) {
    assert.ok(b.x[0] >= 0 && b.x[1] <= 64, b.name + ' leaves the scene in x')
    assert.ok(b.z[0] >= 0 && b.z[1] <= 64, b.name + ' leaves the scene in z')
  }
})

test('lanes start where the village ends and never touch a pillar', () => {
  for (const lane of [WEST_LANE, EAST_LANE]) {
    assert.ok(lane.z - lane.depth / 2 >= VILLAGE_FLOOR.z + VILLAGE_FLOOR.depth / 2 - 0.01, 'lane overlaps the village')
    // The inner edge is the closest a lane gets to the pillar ring.
    const inner = lane.x < ARENA_CENTER_X ? lane.x + lane.width / 2 : lane.x - lane.width / 2
    for (let z = lane.z - lane.depth / 2; z <= lane.z + lane.depth / 2; z += 0.5) {
      const d = Math.hypot(inner - ARENA_CENTER_X, z - ARENA_CENTER_Z)
      assert.ok(d > ARENA_RADIUS + 0.8, 'lane inner edge within a pillar at z ' + z)
    }
  }
})

test('the plazas sit in the corners, touching their lane', () => {
  assert.equal(NW_PLAZA.x - NW_PLAZA.size / 2, 0)
  assert.equal(NE_PLAZA.x + NE_PLAZA.size / 2, 64)
  assert.equal(NW_PLAZA.z + NW_PLAZA.size / 2, 64)
  assert.ok(NW_PLAZA.z - NW_PLAZA.size / 2 <= WEST_LANE.z + WEST_LANE.depth / 2, 'a gap between the west lane and its plaza')
  assert.ok(NE_PLAZA.z - NE_PLAZA.size / 2 <= EAST_LANE.z + EAST_LANE.depth / 2, 'a gap between the east lane and its plaza')
})

test('the practice yard fits down the west lane, in order, with room between stations', () => {
  // z of each station, from src/arena/practice.ts; the ring hops +/-2.5 and the signs sit 4m back.
  // name, centre z, how far it reaches either way (hop + radius, or the sign behind it)
  const stations: [string, number, number][] = [
    ['patch', 27, 2.5],
    ['light', 39, 6],
    ['beam', 50, 4],
    ['ring', 58, 3.7]
  ]
  const laneStart = WEST_LANE.z - WEST_LANE.depth / 2
  const laneEnd = WEST_LANE.z + WEST_LANE.depth / 2
  for (const [name, z, reach] of stations) {
    assert.ok(z - reach >= laneStart, name + ' starts before the lane does')
    assert.ok(z + reach <= laneEnd, name + ' runs past the end of the lane')
  }
  for (let i = 1; i < stations.length; i++) {
    const gap = stations[i][1] - stations[i - 1][1]
    assert.ok(gap >= 8, 'only ' + gap + 'm between ' + stations[i - 1][0] + ' and ' + stations[i][0])
  }
})
