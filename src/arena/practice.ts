// The Practice Yard on the west lane: three miniature hazards and no lives.
//
// A first-timer meets every hazard for the first time in a round, with hearts on the line, on a
// phone. Here the same three things - a tile that sinks, a light that turns red, a beam that
// shoves - are on a lane with nothing at stake, so the round is the second time, not the first.

import {
  engine,
  Entity,
  Transform,
  MeshRenderer,
  MeshCollider,
  Material,
  TriggerArea,
  triggerAreaEventsSystem,
  Physics,
  Tween,
  EasingFunction
} from '@dcl/sdk/ecs'
import { Vector3, Quaternion, Color4, Color3 } from '@dcl/sdk/math'
import { WEST_LANE, LOBBY, PARTY_COLORS, FRUIT_COLORS } from '../config'
import { Patch, SINK_DEPTH } from '../lib/practice'
import { spotCentre, SpotTracker, SPOT_RADIUS } from '../lib/spotlight'
import { sign, isPlayer } from './build'
import { toast } from '../systems/feed'
import { play } from '../systems/audio'

const Y = LOBBY.y
const X = WEST_LANE.x
const TILE = 1.7
const PATCH_Z = 27
const LIGHT_Z = 39
const BEAM_Z = 52

const patch = new Patch(9)
const tiles: { e: Entity; x: number; z: number }[] = []
let clock = 0

const tracker = new SpotTracker()
let pool: Entity
let poolWarned = false
let toldOnce = false

const SAFE = Color4.create(1.0, 0.92, 0.55, 1)
const DANGER = Color4.create(1.0, 0.25, 0.25, 1)

function buildPatch(): void {
  for (let i = 0; i < 9; i++) {
    const col = (i % 3) - 1
    const row = Math.floor(i / 3)
    const x = X + col * (TILE + 0.1)
    const z = PATCH_Z + (row - 1) * (TILE + 0.1)
    const e = engine.addEntity()
    Transform.create(e, { position: Vector3.create(x, Y + 0.15, z), scale: Vector3.create(TILE, 0.3, TILE) })
    MeshRenderer.setBox(e)
    MeshCollider.setBox(e)
    const c = FRUIT_COLORS[i % FRUIT_COLORS.length]
    Material.setPbrMaterial(e, { albedoColor: Color4.create(c.r, c.g, c.b, 1), roughness: 0.35, specularIntensity: 1 })
    tiles.push({ e, x, z })
  }
  sign('SINKING TILES\nStand still and see', Vector3.create(X, Y + 3.2, PATCH_Z - 3.2), 1.2)
}

function buildLight(): void {
  pool = engine.addEntity()
  Transform.create(pool, { position: Vector3.create(X, Y + 0.06, LIGHT_Z), scale: Vector3.create(SPOT_RADIUS * 2, 0.06, SPOT_RADIUS * 2) })
  MeshRenderer.setCylinder(pool)
  paint(false)
  sign('ROAMING LIGHT\nDo not stand in it', Vector3.create(X, Y + 3.2, LIGHT_Z - 6), 1.2)
}

function paint(danger: boolean): void {
  if (poolWarned === danger) return
  poolWarned = danger
  const c = danger ? DANGER : SAFE
  Material.setPbrMaterial(pool, { albedoColor: c, emissiveColor: Color3.create(c.r, c.g, c.b), emissiveIntensity: danger ? 3 : 2, roughness: 1 })
}

function buildBeam(): void {
  const pivot = engine.addEntity()
  Transform.create(pivot, { position: Vector3.create(X, Y + 0.45, BEAM_Z) })
  const bar = engine.addEntity()
  Transform.create(bar, { parent: pivot, scale: Vector3.create(4, 0.5, 0.5) })
  MeshRenderer.setBox(bar)
  const c = PARTY_COLORS[0]
  Material.setPbrMaterial(bar, { albedoColor: Color4.create(c.r, c.g, c.b, 1), emissiveColor: Color3.create(c.r, c.g, c.b), emissiveIntensity: 0.8, roughness: 0.4 })
  Tween.create(pivot, {
    mode: Tween.Mode.RotateContinuous({ direction: Quaternion.fromEulerDegrees(0, 1, 0), speed: 40 }),
    duration: 0,
    easingFunction: EasingFunction.EF_LINEAR
  })
  TriggerArea.setBox(bar)
  let lastHit = 0
  triggerAreaEventsSystem.onTriggerEnter(bar, (r) => {
    if (!isPlayer(r) || clock - lastHit < 1.2) return
    lastHit = clock
    play('squeak')
    // A nudge, not a shove: the lane is five metres wide and the point is the timing, not the fall.
    Physics.applyKnockbackToPlayer(Vector3.create(X, Y, BEAM_Z), 4, 3)
  })
  sign('JUMP THE BEAM\nIt only nudges here', Vector3.create(X, Y + 3.2, BEAM_Z - 4), 1.2)
}

export function buildPractice(): void {
  sign('PRACTICE YARD\nNo lives here. Learn the moves, then play.', Vector3.create(X, Y + 4.2, WEST_LANE.z - WEST_LANE.depth / 2 + 2), 1.5)
  buildPatch()
  buildLight()
  buildBeam()

  engine.addSystem((dt: number) => {
    clock += dt
    const t = Transform.getOrNull(engine.PlayerEntity)

    // Tiles: whichever one the player stands on starts its clock; every tile follows its state.
    if (t && Math.abs(t.position.y - Y) < 1.5) {
      for (let i = 0; i < tiles.length; i++) {
        if (Math.abs(t.position.x - tiles[i].x) < TILE / 2 && Math.abs(t.position.z - tiles[i].z) < TILE / 2) patch.step(i, clock)
      }
    }
    const states = patch.tick(clock)
    for (let i = 0; i < tiles.length; i++) {
      const m = Transform.getMutable(tiles[i].e)
      const y = Y + 0.15 - states[i].drop * SINK_DEPTH
      if (m.position.y !== y) m.position.y = y
      if (states[i].solid && !MeshCollider.has(tiles[i].e)) MeshCollider.setBox(tiles[i].e)
      if (!states[i].solid && MeshCollider.has(tiles[i].e)) MeshCollider.deleteFrom(tiles[i].e)
    }

    // The light: Spotlight's path squeezed into the lane, and the same warning timer.
    const p = spotCentre(99, 0, clock)
    const lx = X + p.x * 0.18
    const lz = LIGHT_Z + p.z * 0.55
    Transform.getMutable(pool).position = Vector3.create(lx, Y + 0.06, lz)
    const inside = !!t && Math.abs(t.position.y - Y) < 1.5 && Math.hypot(t.position.x - lx, t.position.z - lz) < SPOT_RADIUS
    const verdict = tracker.update(inside, dt)
    paint(verdict !== 'ok')
    if (verdict === 'hit') {
      play('squeak')
      if (!toldOnce) {
        toldOnce = true
        toast('In a round, that would have cost a heart')
      }
    }
    if (!inside) toldOnce = false
  })
}
