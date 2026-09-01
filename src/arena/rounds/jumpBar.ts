// Round E - Jump Bar.
//
// One low beam sweeps a round stage; you jump it. At 50 seconds a second beam appears turning the
// other way, so the safe window closes from both sides. It is the gentlest round in the pool and
// the best possible first one: the only input it asks for is the jump button.
//
// Beam position comes from a Tween the engine runs, and every client starts it from the same
// seeded angle at the same UTC moment, so nothing needs syncing.

import {
  engine,
  Entity,
  Transform,
  MeshRenderer,
  MeshCollider,
  Material,
  VisibilityComponent,
  TriggerArea,
  triggerAreaEventsSystem,
  Physics,
  Tween,
  EasingFunction
} from '@dcl/sdk/ecs'
import { Vector3, Quaternion, Color4, Color3 } from '@dcl/sdk/math'
import { ARENA_CENTER_X, ARENA_CENTER_Z, ARENA_Y, DISC_RADIUS } from '../../config'
import { jumpBarBeams, jumpBarSpeed, JUMPBAR_SECOND_AT } from '../../lib/jumpbar'
import { buildDisc, setDiscVisible } from '../disc'
import { Round } from './types'
import { setBanner } from '../../ui/state'
import { loseLife, isOut } from '../../systems/spectator'
import { play } from '../../systems/audio'

/** How long after a hit before a beam can hit you again. */
const HIT_COOLDOWN_MS = 1200
/** The beam's top face sits about 0.75m up: high enough to demand a jump, low enough to clear. */
const BEAM_Y = ARENA_Y + 0.45

type Beam = { pivot: Entity; parts: Entity[] }

let disc: Entity[] = []
let beams: Beam[] = []
let layout = jumpBarBeams(0)
let running = false
let clock = 0
let lastHitAt = -HIT_COOLDOWN_MS
let secondShown = false

function buildBeam(index: number, color: Color4): Beam {
  const pivot = engine.addEntity()
  Transform.create(pivot, { position: Vector3.create(ARENA_CENTER_X, BEAM_Y, ARENA_CENTER_Z) })

  const bar = engine.addEntity()
  Transform.create(bar, {
    parent: pivot,
    position: Vector3.create(0, 0, 0),
    scale: Vector3.create(DISC_RADIUS * 2 - 1, 0.6, 0.6)
  })
  MeshRenderer.setBox(bar)
  Material.setPbrMaterial(bar, {
    albedoColor: color,
    roughness: 0.4,
    emissiveColor: Color3.create(color.r, color.g, color.b),
    emissiveIntensity: 0.8
  })

  const parts: Entity[] = [bar]
  // Rounded caps, in the same key as every other prop in the scene.
  for (const side of [-1, 1]) {
    const cap = engine.addEntity()
    Transform.create(cap, {
      parent: pivot,
      position: Vector3.create((side * (DISC_RADIUS * 2 - 1)) / 2, 0, 0),
      scale: Vector3.create(1.1, 1.1, 1.1)
    })
    MeshRenderer.setSphere(cap)
    Material.setPbrMaterial(cap, {
      albedoColor: color,
      roughness: 0.4,
      emissiveColor: Color3.create(color.r, color.g, color.b),
      emissiveIntensity: 0.6
    })
    parts.push(cap)
  }

  // The bar is the hit test. A trigger rather than a collider: a solid bar at ankle height would
  // shove players off the stage on contact, which reads as the game cheating.
  TriggerArea.setBox(bar)
  triggerAreaEventsSystem.onTriggerEnter(bar, (result) => {
    if (!running) return
    // The second beam exists from boot but only bites once it is on screen. An invisible bar
    // taking a heart is the single most unfair thing this round could do.
    if (index === 1 && !secondShown) return
    if (result.trigger?.entity !== engine.PlayerEntity) return
    if (isOut() || clock - lastHitAt < HIT_COOLDOWN_MS) return
    lastHitAt = clock
    play('squeak')
    if (!loseLife()) {
      // A nudge towards the centre: being clipped should cost a heart, not the round.
      Physics.applyKnockbackToPlayer(Vector3.create(ARENA_CENTER_X, ARENA_Y, ARENA_CENTER_Z), 10, DISC_RADIUS)
    }
  })

  return { pivot, parts }
}

function setBeamVisible(beam: Beam, on: boolean): void {
  for (const part of beam.parts) {
    VisibilityComponent.createOrReplace(part, { visible: on })
  }
}

/** Re-arms the continuous rotation at the pace the round has reached. */
function spin(beam: Beam, degreesPerSecond: number, direction: 1 | -1): void {
  Tween.createOrReplace(beam.pivot, {
    mode: Tween.Mode.RotateContinuous({
      direction: Quaternion.fromEulerDegrees(0, direction, 0),
      speed: degreesPerSecond
    }),
    duration: 0,
    easingFunction: EasingFunction.EF_LINEAR
  })
}

let lastSpinAt = 0

export const jumpBar: Round = {
  name: 'Jump Bar',
  hint: 'Jump the beam.',

  spawn(): Vector3 {
    return Vector3.create(ARENA_CENTER_X, ARENA_Y + 1, ARENA_CENTER_Z + DISC_RADIUS - 3)
  },

  build() {
    disc = buildDisc(Color4.create(0.30, 0.55, 0.85, 1))
    beams = [buildBeam(0, Color4.create(1.0, 0.24, 0.62, 1)), buildBeam(1, Color4.create(1.0, 0.83, 0.25, 1))]
    this.stop()
  },

  start(seed: number) {
    layout = jumpBarBeams(seed)
    clock = 0
    lastHitAt = -HIT_COOLDOWN_MS
    lastSpinAt = 0
    secondShown = false
    running = true
    setDiscVisible(disc, true)
    for (let i = 0; i < beams.length; i++) {
      Transform.getMutable(beams[i].pivot).rotation = Quaternion.fromEulerDegrees(0, layout[i].angle, 0)
      spin(beams[i], jumpBarSpeed(0), layout[i].direction)
      setBeamVisible(beams[i], i === 0)
    }
  },

  tick(dt: number, elapsed: number, playing: boolean) {
    if (!running) return
    clock += dt * 1000
    if (!playing) return

    // Re-arm the tween every few seconds rather than every frame: a continuous-rotation tween runs
    // in the engine, and replacing it 30 times a second would cost more than the round does.
    if (elapsed - lastSpinAt >= 5) {
      lastSpinAt = elapsed
      const speed = jumpBarSpeed(elapsed)
      for (let i = 0; i < beams.length; i++) spin(beams[i], speed, layout[i].direction)
    }

    if (!secondShown && elapsed >= JUMPBAR_SECOND_AT) {
      secondShown = true
      setBeamVisible(beams[1], true)
      play('whistle')
      setBanner('SECOND BEAM', 'Now they close on you')
    }
  },

  stop() {
    running = false
    setDiscVisible(disc, false)
    for (const beam of beams) {
      setBeamVisible(beam, false)
      Tween.deleteFrom(beam.pivot)
    }
  }
}
