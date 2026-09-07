// The Hall of Fame on the north-west plaza: five plinths, the top five names, a crown on the first.
//
// A board is a list; a plinth is a place. Standing next to your own name on a pedestal, with a
// crown turning over the one above it, is what makes a session tally worth chasing.

import { engine, Entity, Transform, MeshRenderer, MeshCollider, Material, TextShape } from '@dcl/sdk/ecs'
import { Vector3, Color4 } from '@dcl/sdk/math'
import { NW_PLAZA, LOBBY, PARTY_COLORS, WALL_COLOR } from '../config'
import { standings, displayName } from '../net/crowns'
import { buildCrown } from './models'
import { sign, solid, zone } from './build'
import { hud } from '../ui/state'
import { triggerEmote } from '~system/RestrictedActions'

const Y = LOBBY.y
const HEIGHTS = [1.6, 1.3, 1.1, 0.9, 0.9]
const names: Entity[] = []
let since = 0
let cheeseAt = 0

export function buildHall(): void {
  sign('HALL OF FAME\nCrowns this session', Vector3.create(NW_PLAZA.x, Y + 4.4, NW_PLAZA.z + 2.5), 1.5)

  // An arc facing the lane, tallest in the middle.
  const order = [2, 0, 1, 3, 4] // plinth index by position, left to right: 3rd, 1st, 2nd, 4th, 5th
  for (let pos = 0; pos < 5; pos++) {
    const rank = order[pos]
    const x = NW_PLAZA.x - 3 + pos * 1.5
    const z = NW_PLAZA.z + 1.8 - Math.abs(pos - 2) * 0.5
    const h = HEIGHTS[rank]
    const e = engine.addEntity()
    Transform.create(e, { position: Vector3.create(x, Y + h / 2, z), scale: Vector3.create(0.8, h, 0.8) })
    MeshRenderer.setCylinder(e)
    MeshCollider.setCylinder(e)
    const c = PARTY_COLORS[rank % PARTY_COLORS.length]
    Material.setPbrMaterial(e, { albedoColor: Color4.create(c.r, c.g, c.b, 1), roughness: 0.35, specularIntensity: 1 })
    names[rank] = sign('', Vector3.create(x, Y + h + 0.7, z), 0.8)
    if (rank === 0) buildCrown(Vector3.create(x, Y + h, z))
  }

  // The photo frame on the arena edge: four bars and a title, and a wave when you stand in it.
  const fx = NW_PLAZA.x + NW_PLAZA.size / 2 - 1.2
  const fz = NW_PLAZA.z - 1
  solid(Vector3.create(fx, Y + 3, fz - 2), Vector3.create(0.25, 3, 0.25), WALL_COLOR)
  solid(Vector3.create(fx, Y + 3, fz + 2), Vector3.create(0.25, 3, 0.25), WALL_COLOR)
  solid(Vector3.create(fx, Y + 4.5, fz), Vector3.create(0.25, 0.25, 4.25), WALL_COLOR)
  solid(Vector3.create(fx, Y + 1.5, fz), Vector3.create(0.25, 0.25, 4.25), WALL_COLOR)
  sign('STUMBLEZONE', Vector3.create(fx, Y + 5.1, fz), 1.4)
  zone(Vector3.create(fx - 1, Y + 1.5, fz), Vector3.create(1.6, 3, 3.6), () => {
    if (Date.now() - cheeseAt < 4000) return
    cheeseAt = Date.now()
    void triggerEmote({ predefinedEmote: 'wave' })
    hud.subtitle = 'Say cheese'
  })

  refresh()
  engine.addSystem((dt: number) => {
    since += dt
    if (since < 2) return
    since = 0
    refresh()
  })
}

function refresh(): void {
  const top = standings(5)
  for (let rank = 0; rank < 5; rank++) {
    const s = top[rank]
    const t = TextShape.getMutable(names[rank])
    const text = s ? rank + 1 + '. ' + displayName(s.address) + '\n' + s.crowns : rank + 1 + '.\nyour name here'
    if (t.text !== text) t.text = text
  }
}
