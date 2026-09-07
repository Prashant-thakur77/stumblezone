// The ring road: a lane down each side of the stadium and a plaza in each north corner.
//
// Until now the scene ended at the village's north edge; the stadium was something you saw, not
// something you could walk around. The lanes make the arena a building with an outside, and the
// plazas are the corners that the Hall of Fame and the Sky Cannon fill.

import { Vector3 } from '@dcl/sdk/math'
import { WEST_LANE, EAST_LANE, NW_PLAZA, NE_PLAZA, LOBBY, ARENA_CENTER_X, ARENA_CENTER_Z } from '../config'
import { floor, kerb } from './build'
import { decorModel, buildCrowd } from './models'

const Y = LOBBY.y

export function buildRing(): void {
  for (const lane of [WEST_LANE, EAST_LANE]) {
    floor(lane.x, Y, lane.z, lane.width, lane.depth)
    // The kerb goes on the arena side: that is the drop, and the edge people drift towards.
    const inner = lane.x < ARENA_CENTER_X ? lane.x + lane.width / 2 - 0.15 : lane.x - lane.width / 2 + 0.15
    kerb(inner, Y, lane.z, 0.3, lane.depth)
    // Lamps down the outer edge every eight metres.
    const outer = lane.x < ARENA_CENTER_X ? lane.x - lane.width / 2 + 0.6 : lane.x + lane.width / 2 - 0.6
    for (let z = lane.z - lane.depth / 2 + 4; z < lane.z + lane.depth / 2; z += 8) {
      decorModel('assets/Models/lampost-small.glb', Vector3.create(outer, Y, z), Vector3.create(1, 1, 1))
    }
  }

  for (const plaza of [NW_PLAZA, NE_PLAZA]) {
    floor(plaza.x, Y, plaza.z, plaza.size, plaza.size)
    // Kerb the two arena-facing edges of each plaza.
    const towardsX = plaza.x < ARENA_CENTER_X ? plaza.x + plaza.size / 2 - 0.15 : plaza.x - plaza.size / 2 + 0.15
    kerb(towardsX, Y, plaza.z, 0.3, plaza.size)
    const towardsZ = plaza.z - plaza.size / 2 + 0.15
    kerb(plaza.x, Y, towardsZ, plaza.size, 0.3)
    for (const dx of [-2.6, 2.6]) {
      decorModel('assets/Models/bush-02.glb', Vector3.create(plaza.x + dx, Y, plaza.z + plaza.size / 2 - 0.8), Vector3.create(1.2, 1.2, 1.2))
    }
    // A cluster of faces on each plaza, turned to watch the arena like the stadium ones.
    const faceY = (Math.atan2(ARENA_CENTER_X - plaza.x, ARENA_CENTER_Z - plaza.z) * 180) / Math.PI
    buildCrowd(Vector3.create(plaza.x, Y + 1.6, plaza.z + 1.5), faceY, 1.8)
  }
}
