// The Sky Cannon on the north-east plaza: step on the pad and it throws you fifteen metres up.
//
// There is no gameplay in it. It is the view: for four seconds you can see the whole stadium, the
// village, the tower and the lanes from above, which is the one thing a phone's third-person camera
// never shows you. Everyone who tries it once tries it twice.

import { engine, Transform, MeshRenderer, Material, Physics } from '@dcl/sdk/ecs'
import { Vector3, Quaternion, Color4 } from '@dcl/sdk/math'
import { NE_PLAZA, LOBBY, ARENA_CENTER_X, ARENA_CENTER_Z, WALL_COLOR } from '../config'
import { pad, sign } from './build'
import { play } from '../systems/audio'
import { toast } from '../systems/feed'
import { isRoundLive, isOut } from '../systems/spectator'

const Y = LOBBY.y
/** Straight up with a small lean back towards the plaza centre, so you land where you started. */
export const CANNON_DIRECTION = Vector3.create(0, 1, 0)
export const CANNON_STRENGTH = 22

export function buildCannon(): void {
  const x = NE_PLAZA.x - 1
  const z = NE_PLAZA.z - 1
  // The barrel: a fat cylinder leaning towards the arena.
  const barrel = engine.addEntity()
  const lean = Quaternion.fromLookAt(Vector3.create(x, Y, z), Vector3.create(ARENA_CENTER_X, Y + 30, ARENA_CENTER_Z))
  Transform.create(barrel, { position: Vector3.create(x + 1.5, Y + 1.2, z + 1.5), rotation: lean, scale: Vector3.create(1.6, 2.6, 1.6) })
  MeshRenderer.setCylinder(barrel)
  Material.setPbrMaterial(barrel, { albedoColor: Color4.create(WALL_COLOR.r, WALL_COLOR.g, WALL_COLOR.b, 1), roughness: 0.4, specularIntensity: 1 })

  sign('SKY CANNON\nStep on the pad. It throws you up for the view.', Vector3.create(x, Y + 4, z - 2.5), 1.5)
  let lastShot = 0
  pad(x, Y, z, 2.2, { r: 1, g: 0.45, b: 0.3 }, () => {
    if (isRoundLive() && !isOut()) return
    if (Date.now() - lastShot < 3000) return
    lastShot = Date.now()
    play('boing')
    toast('AIRBORNE - look around')
    Physics.applyImpulseToPlayer(CANNON_DIRECTION, CANNON_STRENGTH)
  })
}
