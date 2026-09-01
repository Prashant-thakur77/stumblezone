// The lobby: spawn floor, the crown board, the schedule sign, and the onboarding sign.
//
// Onboarding is three lines and no more. A judge on a phone reads it in the four seconds before
// the next round starts, or not at all.

import {
  engine,
  Entity,
  Transform,
  MeshRenderer,
  MeshCollider,
  Material,
  TextShape,
  Font,
  Billboard,
  BillboardMode,
  TriggerArea,
  triggerAreaEventsSystem,
  Physics,
  Tween,
  TweenSequence,
  TweenLoop,
  EasingFunction
} from '@dcl/sdk/ecs'
import { Vector3, Color4, Color3 } from '@dcl/sdk/math'
import { ARENA_CENTER_X, LOBBY, LEDGE, PLATFORM_COLOR, PARTY_COLORS } from '../config'
import { standings, displayName } from '../net/crowns'
import { buildCrown, buildBalloons, buildTree } from './models'
import { upcoming } from '../systems/scheduler'

let crownBoard: Entity
let scheduleBoard: Entity
let podiumSign: Entity

function sign(text: string, position: Vector3, size: number): Entity {
  const e = engine.addEntity()
  Transform.create(e, { position })
  // Billboarded around Y so a sign is readable from anywhere in the lobby and stays upright.
  // Fixed-rotation text is a coin flip: face it the wrong way and the onboarding is invisible.
  Billboard.create(e, { billboardMode: BillboardMode.BM_Y })
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

  // Signs sit on the arena side of the lobby. The spawn point faces +z toward the arena, so
  // anything placed behind the player is onboarding nobody ever reads.
  const SIGN_Z = LOBBY.z + 5

  sign('STUMBLEZONE', Vector3.create(ARENA_CENTER_X, LOBBY.y + 6, SIGN_Z), 8)
  sign(
    'Qualify to win crowns.\nFall and you cheer from the ledge.\nNew round every 2 minutes.\nBounce on the pads while you wait!',
    Vector3.create(ARENA_CENTER_X, LOBBY.y + 3.4, SIGN_Z),
    2.5
  )

  crownBoard = sign('CROWNS', Vector3.create(ARENA_CENTER_X - 9, LOBBY.y + 4, SIGN_Z), 2)
  scheduleBoard = sign('NEXT UP', Vector3.create(ARENA_CENTER_X + 9, LOBBY.y + 4, SIGN_Z), 2)

  // The podium. A physical place the leader's name appears is worth more than another line on a
  // board - it gives the crowd something to gather round and someone to point at between rounds.
  const podiumX = ARENA_CENTER_X
  const podiumZ = LOBBY.z - 3
  const steps: [number, number][] = [
    [0, 1.2],
    [-3, 0.8],
    [3, 0.5]
  ]
  for (const [dx, height] of steps) {
    const e = engine.addEntity()
    Transform.create(e, {
      position: Vector3.create(podiumX + dx, LOBBY.y + height / 2 - 0.5, podiumZ),
      scale: Vector3.create(2.6, height, 2.6)
    })
    MeshRenderer.setBox(e)
    MeshCollider.setBox(e)
    Material.setPbrMaterial(e, {
      albedoColor: Color4.create(1.0, 0.84, 0.0, 1),
      roughness: 0.6,
      emissiveColor: Color3.create(1.0, 0.84, 0.0),
      emissiveIntensity: 0.5
    })
  }
  // A real spinning crown on the tallest step. The podium is the one place in the scene a player
  // stands still and looks at something, so it is worth a model rather than a box.
  buildCrown(Vector3.create(podiumX, LOBBY.y + 1.2, podiumZ))

  // Balloon clusters framing the lobby. Scaled to 0.22 - the model renders 44m across natively.
  buildBalloons(Vector3.create(ARENA_CENTER_X - 12, LOBBY.y + 5, LOBBY.z + 1))
  buildBalloons(Vector3.create(ARENA_CENTER_X + 12, LOBBY.y + 5, LOBBY.z + 1))

  podiumSign = sign('', Vector3.create(podiumX, LOBBY.y + 3.2, podiumZ), 2.4)

  buildJumpPads()
  buildPerch()

  // Trees at the lobby corners. Soft, rounded, and they stop the spawn reading as a bare slab.
  for (const [tx, tz] of [
    [-14, -2],
    [14, -2],
    [-14, 10],
    [14, 10]
  ] as [number, number][]) {
    buildTree(Vector3.create(ARENA_CENTER_X + tx, LOBBY.y - 0.5, LOBBY.z + tz), 1.2)
  }

  // Boards only need refreshing a couple of times a second, not every frame.
  let since = 0
  engine.addSystem((dt: number) => {
    since += dt
    if (since < 0.5) return
    since = 0
    refreshBoards()
  })
}

/**
 * Bouncy pads in the lobby.
 *
 * Roughly a third of every cycle is intro and results, and an empty lobby for 35 seconds is the
 * single most boring thing in the game. These cost four entities and give people something to
 * play with - and messing about on them is exactly the kind of thing a crowd does together.
 *
 * Deliberately physics, not a teleport: mutating the player's Transform does nothing, the engine
 * owns it. Physics.applyImpulseToPlayer is the supported way to move a player.
 */
function buildJumpPads(): void {
  const spots: [number, number][] = [
    [-8, 3],
    [8, 3],
    [-4, -2],
    [4, -2]
  ]
  for (const [dx, dz] of spots) {
    const x = ARENA_CENTER_X + dx
    const z = LOBBY.z + dz

    const padColor = PARTY_COLORS[(Math.abs(dx) + Math.abs(dz)) % PARTY_COLORS.length]
    const e = engine.addEntity()
    Transform.create(e, {
      position: Vector3.create(x, LOBBY.y + 0.1, z),
      scale: Vector3.create(3, 0.4, 3)
    })
    MeshRenderer.setBox(e)
    MeshCollider.setBox(e)
    Material.setPbrMaterial(e, {
      albedoColor: Color4.create(padColor.r, padColor.g, padColor.b, 1),
      roughness: 0.5,
      emissiveColor: Color3.create(padColor.r, padColor.g, padColor.b),
      emissiveIntensity: 0.9
    })
    // A slow bob, so the pads read as springy before anyone steps on one.
    Tween.createOrReplace(e, {
      mode: Tween.Mode.Move({
        start: Vector3.create(x, LOBBY.y + 0.05, z),
        end: Vector3.create(x, LOBBY.y + 0.3, z)
      }),
      duration: 900,
      easingFunction: EasingFunction.EF_EASESINE
    })
    TweenSequence.createOrReplace(e, { sequence: [], loop: TweenLoop.TL_YOYO })

    const trigger = engine.addEntity()
    Transform.create(trigger, {
      position: Vector3.create(x, LOBBY.y + 1, z),
      scale: Vector3.create(3, 2, 3)
    })
    TriggerArea.setBox(trigger)
    triggerAreaEventsSystem.onTriggerEnter(trigger, (result) => {
      if (result.trigger?.entity !== engine.PlayerEntity) return
      Physics.applyImpulseToPlayer(Vector3.create(0, 1, 0), 14)
    })
  }
}

/**
 * A little stepped perch beside the spawn.
 *
 * Three platforms a normal jump apart, so it is reliably climbable without depending on how far a
 * physics impulse actually throws you. Somewhere to go, something to stand on top of, and a spot
 * to watch the arena from while the countdown runs.
 */
function buildPerch(): void {
  const steps: [number, number, number][] = [
    [-6, 1.6, 9],
    [-2, 3.0, 11],
    [3, 4.4, 10]
  ]
  for (let i = 0; i < steps.length; i++) {
    const [dx, y, dz] = steps[i]
    const c = PARTY_COLORS[(i + 2) % PARTY_COLORS.length]
    const e = engine.addEntity()
    Transform.create(e, {
      position: Vector3.create(ARENA_CENTER_X + dx, y, LOBBY.z + dz - 6),
      scale: Vector3.create(4, 0.5, 4)
    })
    MeshRenderer.setCylinder(e, 1, 1)
    MeshCollider.setCylinder(e, 1, 1)
    Material.setPbrMaterial(e, {
      albedoColor: Color4.create(c.r, c.g, c.b, 1),
      roughness: 0.7,
      emissiveColor: Color3.create(c.r, c.g, c.b),
      emissiveIntensity: 0.35
    })
  }
}

function refreshBoards(): void {
  const top = standings(5)
  const crownLines = top.length
    ? top.map((s, i) => `${i + 1}. ${displayName(s.address)}  ${s.crowns}`).join('\n')
    : 'No crowns yet.\nWin a round to get on the board.'
  TextShape.getMutable(crownBoard).text = 'CROWNS\n\n' + crownLines

  const leader = top.length ? top[0] : null
  TextShape.getMutable(podiumSign).text = leader
    ? 'CROWN LEADER\n' + displayName(leader.address) + '\n' + leader.crowns + ' crowns'
    : 'CROWN LEADER\n\nUp for grabs'

  const nextLines = upcoming(3)
    .map((u) => {
      const m = Math.floor(u.inSeconds / 60)
      const s = u.inSeconds % 60
      return `${u.name}  ${m}:${String(s).padStart(2, '0')}`
    })
    .join('\n')
  TextShape.getMutable(scheduleBoard).text = 'NEXT UP\n\n' + nextLines
}
