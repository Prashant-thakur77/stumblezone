// Round B - Sweeper Gates.
//
// Walls with a door-sized gap sweep across a solid platform, faster each wave. Contact does not
// shove the player: physics knockback reads as jank on a touch device, so a hit teleports you a
// few metres back and costs a heart instead. Predictable beats realistic on a phone.
//
// Wall position is derived from the seed plus elapsed time, so a player joining mid-round sees the
// walls exactly where everyone else does without a single sync message.

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
import { sweeperWaves, SweeperWave } from '../../lib/layouts'
import {
  ARENA_CENTER_X,
  ARENA_CENTER_Z,
  ARENA_Y,
  SWEEPER_COLUMNS,
  WALL_COLOR,
  PLATFORM_COLOR,
  PARTY_COLORS,
  PLAY_SECONDS
} from '../../config'
import { Round } from './types'
import { setBanner } from '../../ui/state'
import { loseLife, isOut } from '../../systems/spectator'
import { play } from '../../systems/audio'

const PLATFORM_SIZE = 30
const WALL_COUNT = 4
const WALL_HEIGHT = 2.5
const WALL_THICKNESS = 0.8
const COLUMN_WIDTH = PLATFORM_SIZE / SWEEPER_COLUMNS
/** How long after a hit before the same wall can hit you again. */
const HIT_COOLDOWN_MS = 1200

type Wall = {
  /** Left slab and right slab; the space between them is the gap. */
  left: Entity
  right: Entity
}

let platform: Entity
/** All three slabs: the two ends and the narrow causeway between them. */
let platformParts: Entity[] = []
/** The rotating beam at the centre, and the pivot it hangs off. */
let spinner: Entity
let spinnerPivot: Entity
let bumpers: Entity[] = []
let walls: Wall[] = []
let waves: SweeperWave[] = []
let lastHitAt = 0
let clock = 0
/**
 * Whether this round is the active one.
 *
 * Hiding a wall does not disarm it: VisibilityComponent only stops it drawing, while its
 * MeshCollider and TriggerArea keep working. Without this guard the sweeper's walls stayed solid
 * and kept dealing damage through Hex-Drop and Tip Toe, invisibly.
 */
let running = false
/** The final-20s speed-up fires once per round. */
let accelerated = false

function slab(position: Vector3, scale: Vector3): Entity {
  const e = engine.addEntity()
  Transform.create(e, { position, scale })
  MeshRenderer.setBox(e)
  MeshCollider.setBox(e)
  Material.setPbrMaterial(e, {
    albedoColor: Color4.create(PLATFORM_COLOR.r, PLATFORM_COLOR.g, PLATFORM_COLOR.b, 1),
    roughness: 0.45,
    specularIntensity: 1
  })
  return e
}

function buildSlab(): Entity {
  const e = engine.addEntity()
  MeshRenderer.setBox(e)
  MeshCollider.setBox(e)
  Material.setPbrMaterial(e, {
    albedoColor: Color4.create(WALL_COLOR.r, WALL_COLOR.g, WALL_COLOR.b, 1),
    roughness: 0.7
  })
  TriggerArea.setBox(e)
  triggerAreaEventsSystem.onTriggerEnter(e, (result) => {
    if (!running) return
    if (result.trigger?.entity !== engine.PlayerEntity) return
    if (isOut() || clock - lastHitAt < HIT_COOLDOWN_MS) return
    lastHitAt = clock
    // Squeaky toy: a wall in Fall Guys is foam, and foam squeaks.
    play('squeak')
    if (!loseLife()) {
      // A shove, not a teleport. Being flicked backwards by a wall you can see reads as the wall
      // hitting you; blinking to a spawn point reads as the game glitching.
      const hit = Transform.get(e).position
      Physics.applyKnockbackToPlayer(hit, 12, 6)
    }
  })
  return e
}

/**
 * A long beam sweeping a circle at the centre of the platform.
 *
 * Every good party-game stage has one big rotating thing. It converts the round from "watch one
 * axis" into "watch the walls AND the middle", which is the difference between a puzzle you solve
 * once and a stage you have to keep reading.
 */
function buildSpinner(): void {
  spinnerPivot = engine.addEntity()
  Transform.create(spinnerPivot, {
    position: Vector3.create(ARENA_CENTER_X, ARENA_Y + 1.0, ARENA_CENTER_Z)
  })

  spinner = engine.addEntity()
  // Parented to the pivot, so rotating the pivot sweeps the beam around the platform.
  Transform.create(spinner, {
    parent: spinnerPivot,
    position: Vector3.create(0, 0, 0),
    scale: Vector3.create(PLATFORM_SIZE * 0.75, 1.4, 1.4)
  })
  MeshRenderer.setBox(spinner)
  MeshCollider.setBox(spinner)
  Material.setPbrMaterial(spinner, {
    albedoColor: Color4.create(1.0, 0.72, 0.15, 1),
    roughness: 0.55,
    emissiveColor: Color3.create(1.0, 0.72, 0.15),
    emissiveIntensity: 0.7
  })

  // Rounded caps on the beam ends. Nothing in this style is a hard-edged box.
  for (const side of [-1, 1]) {
    const cap = engine.addEntity()
    Transform.create(cap, {
      parent: spinnerPivot,
      position: Vector3.create((side * PLATFORM_SIZE * 0.75) / 2, 0, 0),
      scale: Vector3.create(2.2, 2.2, 2.2)
    })
    MeshRenderer.setSphere(cap)
    MeshCollider.setSphere(cap)
    Material.setPbrMaterial(cap, {
      albedoColor: Color4.create(1.0, 0.45, 0.3, 1),
      roughness: 0.5,
      emissiveColor: Color3.create(1.0, 0.45, 0.3),
      emissiveIntensity: 0.6
    })
  }

  TriggerArea.setBox(spinner)
  triggerAreaEventsSystem.onTriggerEnter(spinner, (result) => {
    if (!running) return
    if (result.trigger?.entity !== engine.PlayerEntity) return
    if (isOut() || clock - lastHitAt < HIT_COOLDOWN_MS) return
    lastHitAt = clock
    play('squeak')
    if (!loseLife()) {
      Physics.applyKnockbackToPlayer(
        Vector3.create(ARENA_CENTER_X, ARENA_Y, ARENA_CENTER_Z),
        16,
        PLATFORM_SIZE
      )
    }
  })
}

/**
 * Soft bumpers lining the causeway's two open edges.
 *
 * They used to ring the old 30m platform at radius 14 - which, now that the middle third is a 10m
 * causeway, would leave most of them floating in mid-air. Lining the drop is better placement
 * anyway: they sit exactly where a knockback threatens to shove you off.
 */
function buildBumpers(): void {
  const CAUSEWAY_HALF = 5
  const spots: [number, number][] = []
  for (let i = 0; i < 5; i++) {
    const z = ARENA_CENTER_Z - 4 + i * 2
    spots.push([ARENA_CENTER_X - CAUSEWAY_HALF + 0.6, z])
    spots.push([ARENA_CENTER_X + CAUSEWAY_HALF - 0.6, z])
  }
  for (let i = 0; i < spots.length; i++) {
    const [bx, bz] = spots[i]
    const e = engine.addEntity()
    Transform.create(e, {
      position: Vector3.create(bx, ARENA_Y + 0.7, bz),
      scale: Vector3.create(1.6, 1.6, 1.6)
    })
    MeshRenderer.setSphere(e)
    MeshCollider.setSphere(e)
    const c = PARTY_COLORS[i % PARTY_COLORS.length]
    Material.setPbrMaterial(e, {
      albedoColor: Color4.create(c.r, c.g, c.b, 1),
      roughness: 0.45,
      emissiveColor: Color3.create(c.r, c.g, c.b),
      emissiveIntensity: 0.5
    })
    bumpers.push(e)
  }
}

export const sweeper: Round = {
  name: 'Sweeper Gates',
  // Walls, waves, lights and beams all come from the seed and the clock - a latecomer sees
  // exactly what everyone else sees, so they play rather than wait.
  joinSafe: true,
  pickupRadius: 12,
  hint: 'Dodge the walls.',

  spawn() {
    return Vector3.create(ARENA_CENTER_X, ARENA_Y + 1.5, ARENA_CENTER_Z - PLATFORM_SIZE / 2 + 3)
  },

  build() {
    // The platform is built as three slabs, not one, so the middle third is a narrow causeway with
    // open air either side.
    //
    // This is the choke point. Fall Guys bottlenecks players deliberately - it stops the good ones
    // solo-speedrunning and forces everyone into the same space at the same moment, which is where
    // the comedy and the clips come from. A 30m-wide platform lets a field spread out and play in
    // parallel; a 10m causeway makes them play together.
    const CAUSEWAY_WIDTH = 10
    const endDepth = (PLATFORM_SIZE - CAUSEWAY_WIDTH) / 2

    platform = slab(
      Vector3.create(ARENA_CENTER_X, ARENA_Y - 0.25, ARENA_CENTER_Z - PLATFORM_SIZE / 2 + endDepth / 2),
      Vector3.create(PLATFORM_SIZE, 0.5, endDepth)
    )
    platformParts = [
      platform,
      slab(
        Vector3.create(ARENA_CENTER_X, ARENA_Y - 0.25, ARENA_CENTER_Z + PLATFORM_SIZE / 2 - endDepth / 2),
        Vector3.create(PLATFORM_SIZE, 0.5, endDepth)
      ),
      slab(
        Vector3.create(ARENA_CENTER_X, ARENA_Y - 0.25, ARENA_CENTER_Z),
        Vector3.create(CAUSEWAY_WIDTH, 0.5, CAUSEWAY_WIDTH)
      )
    ]

    for (let i = 0; i < WALL_COUNT; i++) {
      walls.push({ left: buildSlab(), right: buildSlab() })
    }
    buildSpinner()
    buildBumpers()
    this.stop()
  },

  start(seed: number) {
    waves = sweeperWaves(seed)
    clock = 0
    lastHitAt = 0
    running = true
    accelerated = false
    for (const part of platformParts) {
      VisibilityComponent.createOrReplace(part, { visible: true })
      if (!MeshCollider.has(part)) MeshCollider.setBox(part)
    }
    setPropsVisible(true)
    // The beam speeds up with the waves, so the round escalates on two axes at once.
    Tween.createOrReplace(spinnerPivot, {
      mode: Tween.Mode.RotateContinuous({
        direction: Quaternion.fromEulerDegrees(0, 1, 0),
        speed: 26
      }),
      duration: 0,
      easingFunction: EasingFunction.EF_LINEAR
    })
    for (const w of walls) {
      for (const slab of [w.left, w.right]) {
        VisibilityComponent.createOrReplace(slab, { visible: true })
        if (!MeshCollider.has(slab)) MeshCollider.setBox(slab)
      }
    }
  },

  tick(dt: number, elapsed: number, playing: boolean) {
    if (!playing) {
      setBanner('Sweeper Gates', 'Walls sweep across. Find the gap.')
      return
    }
    clock += dt * 1000
    setBanner('', 'Mind the gap')

    // The last 20 seconds: the beam nearly doubles its sweep rate. Lands at the same moment as the
    // announcer's HURRY UP, so the pressure is heard and seen together.
    if (!accelerated && elapsed > PLAY_SECONDS - 20) {
      accelerated = true
      Tween.createOrReplace(spinnerPivot, {
        mode: Tween.Mode.RotateContinuous({
          direction: Quaternion.fromEulerDegrees(0, 1, 0),
          speed: 46
        }),
        duration: 0,
        easingFunction: EasingFunction.EF_LINEAR
      })
    }

    const half = PLATFORM_SIZE / 2

    for (let i = 0; i < walls.length; i++) {
      // Each wall belongs to a wave, and each wave has its own speed and gap column. Position is a
      // pure function of elapsed time, so late joiners land on the same frame as everyone else.
      const wave = waves[i % waves.length]
      const span = PLATFORM_SIZE + 6
      const offset = (i * span) / walls.length
      const travelled = (elapsed * wave.speed + offset) % span
      // Half the walls run the other way, so the round cannot be beaten by facing one direction
      // and walking. Position stays a pure function of elapsed time either way, so a late joiner
      // still renders every wall exactly where everyone else sees it.
      const z =
        wave.direction === 1
          ? ARENA_CENTER_Z - half - 3 + travelled
          : ARENA_CENTER_Z + half + 3 - travelled

      const gapCentre = ARENA_CENTER_X - half + (wave.gapCol + 0.5) * COLUMN_WIDTH
      const leftWidth = Math.max(0.1, gapCentre - COLUMN_WIDTH / 2 - (ARENA_CENTER_X - half))
      const rightWidth = Math.max(0.1, ARENA_CENTER_X + half - (gapCentre + COLUMN_WIDTH / 2))

      const lt = Transform.getMutable(walls[i].left)
      lt.position = Vector3.create(ARENA_CENTER_X - half + leftWidth / 2, ARENA_Y + WALL_HEIGHT / 2, z)
      lt.scale = Vector3.create(leftWidth, WALL_HEIGHT, WALL_THICKNESS)

      const rt = Transform.getMutable(walls[i].right)
      rt.position = Vector3.create(ARENA_CENTER_X + half - rightWidth / 2, ARENA_Y + WALL_HEIGHT / 2, z)
      rt.scale = Vector3.create(rightWidth, WALL_HEIGHT, WALL_THICKNESS)
    }
  },

  stop() {
    running = false
    for (const part of platformParts) {
      VisibilityComponent.createOrReplace(part, { visible: false })
      MeshCollider.deleteFrom(part)
    }
    setPropsVisible(false)
    if (Tween.has(spinnerPivot)) Tween.deleteFrom(spinnerPivot)
    for (const w of walls) {
      for (const slab of [w.left, w.right]) {
        VisibilityComponent.createOrReplace(slab, { visible: false })
        // Must actually remove the collider - an invisible wall is still a solid wall.
        MeshCollider.deleteFrom(slab)
      }
    }
  }
}


/** Show or hide the spinner and bumpers, removing colliders so they never block another round. */
function setPropsVisible(visible: boolean): void {
  const props = [spinner, ...bumpers]
  for (const e of props) {
    VisibilityComponent.createOrReplace(e, { visible })
    if (visible) {
      if (!MeshCollider.has(e)) {
        if (e === spinner) MeshCollider.setBox(e)
        else MeshCollider.setSphere(e)
      }
    } else {
      MeshCollider.deleteFrom(e)
    }
  }
  for (const child of engine.getEntitiesWith(Transform)) {
    // The beam's two end caps are parented to the pivot and share its fate.
    if (child[1].parent === spinnerPivot && child[0] !== spinner) {
      VisibilityComponent.createOrReplace(child[0], { visible })
      if (visible) {
        if (!MeshCollider.has(child[0])) MeshCollider.setSphere(child[0])
      } else {
        MeshCollider.deleteFrom(child[0])
      }
    }
  }
}
