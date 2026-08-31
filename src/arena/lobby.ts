// The lobby: spawn floor, the crown board, the schedule sign, and the onboarding sign.
//
// Onboarding is three lines and no more. A judge on a phone reads it in the four seconds before
// the next round starts, or not at all.

import { engine, Entity, Transform, MeshRenderer, MeshCollider, Material, TextShape, Font } from '@dcl/sdk/ecs'
import { Vector3, Quaternion, Color4, Color3 } from '@dcl/sdk/math'
import { ARENA_CENTER_X, LOBBY, LEDGE, PLATFORM_COLOR } from '../config'
import { standings, displayName } from '../net/crowns'
import { upcoming } from '../systems/scheduler'

let crownBoard: Entity
let scheduleBoard: Entity

function sign(text: string, position: Vector3, size: number, rotationY = 0): Entity {
  const e = engine.addEntity()
  Transform.create(e, {
    position,
    rotation: Quaternion.fromEulerDegrees(0, rotationY, 0)
  })
  TextShape.create(e, {
    text,
    fontSize: size,
    font: Font.F_SANS_SERIF,
    textColor: Color4.White(),
    // A thin dark outline keeps text readable against both the sky and the arena floor.
    outlineWidth: 0.15,
    outlineColor: Color3.Black()
  })
  return e
}

function slab(position: Vector3, scale: Vector3): Entity {
  const e = engine.addEntity()
  Transform.create(e, { position, scale })
  MeshRenderer.setBox(e)
  MeshCollider.setBox(e)
  Material.setPbrMaterial(e, {
    albedoColor: Color4.create(PLATFORM_COLOR.r, PLATFORM_COLOR.g, PLATFORM_COLOR.b, 1),
    roughness: 0.9
  })
  return e
}

export function buildLobby(): void {
  // Spawn floor.
  slab(Vector3.create(ARENA_CENTER_X, LOBBY.y - 0.5, LOBBY.z), Vector3.create(24, 1, 12))

  // Spectator ledge, high enough to watch the whole arena from.
  slab(Vector3.create(LEDGE.x, LEDGE.y - 0.5, LEDGE.z), Vector3.create(20, 1, 6))

  sign('STUMBLEZONE', Vector3.create(ARENA_CENTER_X, LOBBY.y + 5, LOBBY.z - 5), 8)
  sign(
    'Survive the round to win crowns.\nFall and you watch from the ledge.\nA new round starts every 2 minutes.',
    Vector3.create(ARENA_CENTER_X, LOBBY.y + 2.6, LOBBY.z - 5),
    2.5
  )

  crownBoard = sign('CROWNS', Vector3.create(ARENA_CENTER_X - 9, LOBBY.y + 3.5, LOBBY.z - 5), 2)
  scheduleBoard = sign('NEXT UP', Vector3.create(ARENA_CENTER_X + 9, LOBBY.y + 3.5, LOBBY.z - 5), 2)

  // Boards only need refreshing a couple of times a second, not every frame.
  let since = 0
  engine.addSystem((dt: number) => {
    since += dt
    if (since < 0.5) return
    since = 0
    refreshBoards()
  })
}

function refreshBoards(): void {
  const top = standings(5)
  const crownLines = top.length
    ? top.map((s, i) => `${i + 1}. ${displayName(s.address)}  ${s.crowns}`).join('\n')
    : 'No crowns yet.\nWin a round to get on the board.'
  TextShape.getMutable(crownBoard).text = 'CROWNS\n\n' + crownLines

  const nextLines = upcoming(3)
    .map((u) => {
      const m = Math.floor(u.inSeconds / 60)
      const s = u.inSeconds % 60
      return `${u.name}  ${m}:${String(s).padStart(2, '0')}`
    })
    .join('\n')
  TextShape.getMutable(scheduleBoard).text = 'NEXT UP\n\n' + nextLines
}
