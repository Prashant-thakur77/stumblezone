// Round D - Spotlight.
//
// The stage goes dark and roaming pools of light hunt the players across it. Stand in one for
// more than a beat and it costs a heart; the light turns red first, so the punishment is always
// telegraphed. A third light and a speed-up arrive at 45 seconds.
//
// This is the round that most rewards the thing this scene is built around - watching. From the
// spectator ledge the paths are obvious; on the floor they are not.

import {
  engine,
  Entity,
  Transform,
  MeshRenderer,
  Material,
  VisibilityComponent,
  GltfContainer
} from '@dcl/sdk/ecs'
import { Vector3, Quaternion, Color4, Color3 } from '@dcl/sdk/math'
import { ARENA_CENTER_X, ARENA_CENTER_Z, ARENA_Y, DISC_RADIUS } from '../../config'
import { spotCentre, spotCount, SpotTracker, SPOT_RADIUS, SPOT_THIRD_AT } from '../../lib/spotlight'
import { buildDisc, setDiscVisible } from '../disc'
import { Round } from './types'
import { setBanner } from '../../ui/state'
import { loseLife, isOut } from '../../systems/spectator'
import { play } from '../../systems/audio'

/** How high above the stage the beam emitters hang. */
const RIG_HEIGHT = 20
const SAFE = Color4.create(1.0, 0.92, 0.55, 1)
const DANGER = Color4.create(1.0, 0.25, 0.25, 1)

type Spot = {
  /** The beam model in the air. */
  rig: Entity
  /** The bright disc it casts on the floor - the thing players actually read. */
  pool: Entity
  warned: boolean
}

let disc: Entity[] = []
let spots: Spot[] = []
let tracker = new SpotTracker()
let seedNow = 0
let running = false
let thirdAnnounced = false
/** Warning ticks are throttled: the tracker warns every frame, and 30 ticks a second is a buzz. */
let lastTickAt = 0
let clock = 0

function buildSpot(): Spot {
  const rig = engine.addEntity()
  Transform.create(rig, {
    position: Vector3.create(ARENA_CENTER_X, ARENA_Y + RIG_HEIGHT, ARENA_CENTER_Z),
    // -90 about X points the beam's local -Z straight down at the stage.
    rotation: Quaternion.fromEulerDegrees(-90, 0, 0),
    scale: Vector3.create(0.62, 0.62, 0.25)
  })
  GltfContainer.create(rig, { src: 'assets/Models/searchlight.glb' })

  const pool = engine.addEntity()
  Transform.create(pool, {
    position: Vector3.create(ARENA_CENTER_X, ARENA_Y + 0.06, ARENA_CENTER_Z),
    scale: Vector3.create(SPOT_RADIUS * 2, 0.06, SPOT_RADIUS * 2)
  })
  MeshRenderer.setCylinder(pool)
  // Emissive and unlit-bright, so the circle reads on a phone screen in daylight. No collider:
  // the light is a place, not an object.
  Material.setPbrMaterial(pool, {
    albedoColor: SAFE,
    emissiveColor: Color3.create(SAFE.r, SAFE.g, SAFE.b),
    emissiveIntensity: 2,
    roughness: 1
  })

  return { rig, pool, warned: false }
}

function setSpotVisible(spot: Spot, on: boolean): void {
  VisibilityComponent.createOrReplace(spot.rig, { visible: on })
  VisibilityComponent.createOrReplace(spot.pool, { visible: on })
}

function paint(spot: Spot, danger: boolean): void {
  if (spot.warned === danger) return
  spot.warned = danger
  const c = danger ? DANGER : SAFE
  Material.setPbrMaterial(spot.pool, {
    albedoColor: c,
    emissiveColor: Color3.create(c.r, c.g, c.b),
    emissiveIntensity: danger ? 3 : 2,
    roughness: 1
  })
}

function moveSpot(spot: Spot, x: number, z: number): void {
  Transform.getMutable(spot.pool).position = Vector3.create(x, ARENA_Y + 0.06, z)
  Transform.getMutable(spot.rig).position = Vector3.create(x, ARENA_Y + RIG_HEIGHT, z)
}

export const spotlight: Round = {
  name: 'Spotlight',
  hint: 'Stay out of the light.',

  spawn(): Vector3 {
    return Vector3.create(ARENA_CENTER_X, ARENA_Y + 1, ARENA_CENTER_Z)
  },

  build() {
    // A dark stage, so the lights are the brightest thing on screen by a wide margin.
    disc = buildDisc(Color4.create(0.16, 0.13, 0.32, 1))
    spots = [buildSpot(), buildSpot(), buildSpot()]
    this.stop()
  },

  start(seed: number) {
    seedNow = seed
    tracker = new SpotTracker()
    running = true
    clock = 0
    lastTickAt = 0
    thirdAnnounced = false
    setDiscVisible(disc, true)
    for (let i = 0; i < spots.length; i++) {
      const p = spotCentre(seed, i, 0)
      moveSpot(spots[i], ARENA_CENTER_X + p.x, ARENA_CENTER_Z + p.z)
      paint(spots[i], false)
      setSpotVisible(spots[i], i < spotCount(0))
    }
  },

  tick(dt: number, elapsed: number, playing: boolean) {
    if (!running) return
    clock += dt

    const live = spotCount(elapsed)
    for (let i = 0; i < spots.length; i++) {
      const on = i < live
      setSpotVisible(spots[i], on)
      if (!on) continue
      const p = spotCentre(seedNow, i, elapsed)
      moveSpot(spots[i], ARENA_CENTER_X + p.x, ARENA_CENTER_Z + p.z)
    }

    if (!thirdAnnounced && elapsed >= SPOT_THIRD_AT) {
      thirdAnnounced = true
      play('whistle')
      setBanner('THIRD LIGHT', 'And they are faster now')
    }

    if (!playing || isOut()) return

    const t = Transform.getOrNull(engine.PlayerEntity)
    if (!t) return
    // Only count light you are standing in: a player on the ledge is above the stage, not on it.
    const onStage = Math.abs(t.position.y - ARENA_Y) < 3
    let inside = false
    let lit: Spot | null = null
    for (let i = 0; i < live; i++) {
      const c = Transform.get(spots[i].pool).position
      if (Math.hypot(t.position.x - c.x, t.position.z - c.z) < SPOT_RADIUS) {
        inside = true
        lit = spots[i]
        break
      }
    }

    const verdict = tracker.update(onStage && inside, dt)
    for (let i = 0; i < live; i++) paint(spots[i], verdict !== 'ok' && spots[i] === lit)
    if (verdict === 'warn') {
      if (clock - lastTickAt >= 0.2) {
        lastTickAt = clock
        play('tick')
      }
    } else if (verdict === 'hit') {
      play('squeak')
      loseLife()
    }
  },

  stop() {
    running = false
    setDiscVisible(disc, false)
    for (const spot of spots) setSpotVisible(spot, false)
  }
}
