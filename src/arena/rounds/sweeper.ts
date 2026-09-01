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
  triggerAreaEventsSystem
} from '@dcl/sdk/ecs'
import { Vector3, Color4 } from '@dcl/sdk/math'
import { sweeperWaves, SweeperWave } from '../../lib/layouts'
import {
  ARENA_CENTER_X,
  ARENA_CENTER_Z,
  ARENA_Y,
  SWEEPER_COLUMNS,
  WALL_COLOR,
  PLATFORM_COLOR
} from '../../config'
import { Round } from './types'
import { setBanner } from '../../ui/state'
import { loseLife, isOut, sendTo } from '../../systems/spectator'

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
    if (!loseLife()) {
      void sendTo({ x: ARENA_CENTER_X, y: ARENA_Y + 1.5, z: ARENA_CENTER_Z - PLATFORM_SIZE / 2 + 2 })
    }
  })
  return e
}

export const sweeper: Round = {
  name: 'Sweeper Gates',
  hint: 'Walls sweep across. Get through the gap, keep your hearts.',

  spawn() {
    return Vector3.create(ARENA_CENTER_X, ARENA_Y + 1.5, ARENA_CENTER_Z - PLATFORM_SIZE / 2 + 3)
  },

  build() {
    platform = engine.addEntity()
    Transform.create(platform, {
      position: Vector3.create(ARENA_CENTER_X, ARENA_Y - 0.25, ARENA_CENTER_Z),
      scale: Vector3.create(PLATFORM_SIZE, 0.5, PLATFORM_SIZE)
    })
    MeshRenderer.setBox(platform)
    MeshCollider.setBox(platform)
    Material.setPbrMaterial(platform, {
      albedoColor: Color4.create(PLATFORM_COLOR.r, PLATFORM_COLOR.g, PLATFORM_COLOR.b, 1),
      roughness: 0.9
    })

    for (let i = 0; i < WALL_COUNT; i++) {
      walls.push({ left: buildSlab(), right: buildSlab() })
    }
    this.stop()
  },

  start(seed: number) {
    waves = sweeperWaves(seed)
    clock = 0
    lastHitAt = 0
    running = true
    VisibilityComponent.createOrReplace(platform, { visible: true })
    MeshCollider.setBox(platform)
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
    VisibilityComponent.createOrReplace(platform, { visible: false })
    MeshCollider.deleteFrom(platform)
    for (const w of walls) {
      for (const slab of [w.left, w.right]) {
        VisibilityComponent.createOrReplace(slab, { visible: false })
        // Must actually remove the collider - an invisible wall is still a solid wall.
        MeshCollider.deleteFrom(slab)
      }
    }
  }
}
