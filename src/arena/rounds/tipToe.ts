// Round C - Tip Toe.
//
// A bridge where roughly half the tiles are fake and sink once stepped on, permanently for the
// round. That permanence is the round's whole social point: whoever goes first burns themselves
// revealing the path for everyone behind, so a first-finisher bonus exists to make leading worth it.

import { engine, Entity, Transform, MeshRenderer, MeshCollider, Material, VisibilityComponent } from '@dcl/sdk/ecs'
import { Vector3, Color4 } from '@dcl/sdk/math'
import { createTileGrid, TileGrid } from '../tiles'
import { tipToeFakes, tipToeGold } from '../../lib/layouts'
import { award } from '../../net/crowns'
import { myAddress } from '../../net/sync'
import { toast } from '../../systems/feed'
import {
  ARENA_CENTER_X,
  ARENA_CENTER_Z,
  ARENA_Y,
  TIPTOE_WIDTH,
  TIPTOE_LENGTH,
  TILE_SIZE,
  TILE_NEUTRAL,
  TILE_SHADE,
  PLATFORM_COLOR,
  TILE_WARNING,
  PLAY_SECONDS
} from '../../config'
import { Round } from './types'
import { setBanner } from '../../ui/state'
import { play } from '../../systems/audio'
import { buildFinishFlag, setVisible } from '../models'
import { loseLife, isOut, onFall, sendTo } from '../../systems/spectator'
import { emitTile, onTile, emitFinished } from '../../net/sync'

/** Pioneers get a beat to react; late crossers get less. The bridge speeds up as the round runs. */
const DECAY_MS_START = 450
const DECAY_MS_END = 250

let grid: TileGrid
/** Solid ground at both ends. Without these the bridge floats in mid-air with no way on or off. */
let startPad: Entity
let finishPad: Entity
let finishFlag: Entity
/**
 * Scar plates: one is laid where each fake tile fell.
 *
 * The fallen tile drops 8m and is hard to read from the back of the bridge; a dark plate at bridge
 * level turns accumulated damage into a map, which is what makes following someone worthwhile.
 * Pooled and re-laid per round like every other repeated thing in the scene.
 */
let scars: Entity[] = []
let nextScar = 0
/** Current decay window, recomputed each frame from how far the round has run. */
let decayMs = DECAY_MS_START
let fakes: boolean[] = []
let pending: { index: number; at: number }[] = []
let clock = 0
let finished = false
let startAt = 0
/** The gold tile: a real tile worth a crown to whoever steps on it, once each. */
let gold = -1
let goldTaken = false
const GOLD = { r: 1.0, g: 0.83, b: 0.25 }

const PAD_DEPTH = 6

function firstRowZ(): number {
  return grid.homes[0].z
}

function lastRowZ(): number {
  return grid.homes[grid.homes.length - 1].z
}

/** On the start pad, where a fallen player is put back. */
function startSpot(): Vector3 {
  return Vector3.create(ARENA_CENTER_X, ARENA_Y + 1.5, firstRowZ() - PAD_DEPTH / 2 - TILE_SIZE / 2)
}

function pad(z: number): Entity {
  const e = engine.addEntity()
  Transform.create(e, {
    position: Vector3.create(ARENA_CENTER_X, ARENA_Y - 0.25, z),
    scale: Vector3.create(TIPTOE_WIDTH * (TILE_SIZE + 0.15) + 2, 0.5, PAD_DEPTH)
  })
  MeshRenderer.setBox(e)
  MeshCollider.setBox(e)
  Material.setPbrMaterial(e, {
    albedoColor: Color4.create(PLATFORM_COLOR.r, PLATFORM_COLOR.g, PLATFORM_COLOR.b, 1),
    roughness: 0.35,
    specularIntensity: 1
  })
  return e
}

function step(index: number): void {
  if (index < 0 || grid.isSunk(index)) return
  if (!fakes[index]) return
  if (pending.some((p) => p.index === index)) return
  pending.push({ index, at: clock + decayMs })
  grid.warn(index, TILE_WARNING)
}

export const tipToe: Round = {
  name: 'Tip Toe',
  hint: 'Find the path.',
  twist: 'One gold tile is worth a crown',

  spawn() {
    return startSpot()
  },

  build() {
    grid = createTileGrid({
      cols: TIPTOE_WIDTH,
      rows: TIPTOE_LENGTH,
      center: Vector3.create(ARENA_CENTER_X, ARENA_Y, ARENA_CENTER_Z),
      tileSize: TILE_SIZE
    })
    startPad = pad(grid.homes[0].z - PAD_DEPTH / 2 - TILE_SIZE / 2)
    finishPad = pad(grid.homes[grid.homes.length - 1].z + PAD_DEPTH / 2 + TILE_SIZE / 2)
    // Players could not see where the bridge ended. A finish line is the single clearest way to
    // say "get here" without a word of instruction.
    finishFlag = buildFinishFlag(
      Vector3.create(ARENA_CENTER_X, ARENA_Y, grid.homes[grid.homes.length - 1].z + PAD_DEPTH / 2 + TILE_SIZE / 2)
    )

    // 26 covers the worst case: a 48-tile bridge at the tested 25-60% fake ratio.
    for (let i = 0; i < 26; i++) {
      const e = engine.addEntity()
      Transform.create(e, {
        position: Vector3.create(0, -50, 0),
        scale: Vector3.create(TILE_SIZE, 0.08, TILE_SIZE)
      })
      MeshRenderer.setBox(e)
      Material.setPbrMaterial(e, { albedoColor: Color4.create(0.18, 0.14, 0.2, 1), roughness: 1 })
      scars.push(e)
    }
    grid.setVisible(false)
    setPadsVisible(false)
    onTile((p, isSelf) => {
      if (!isSelf) step(p.tileId)
    })
  },

  start(seed: number) {
    fakes = tipToeFakes(seed)
    pending = []
    clock = 0
    finished = false
    // Park every scar out of sight; they have no collider, so parking is all the reset they need.
    nextScar = 0
    for (const e of scars) Transform.getMutable(e).position = Vector3.create(0, -50, 0)
    startAt = 0
    grid.setVisible(true)
    setPadsVisible(true)
    grid.resetAll()
    grid.setCheckerboard(TILE_NEUTRAL, TILE_SHADE)
    gold = tipToeGold(seed, fakes)
    goldTaken = false
    // Gold is on show from the start: a real tile you can see, worth going out of your way for.
    grid.setColor(gold, GOLD, 1.2)
    onFall(() => {
      if (isOut()) return
      if (!loseLife()) void sendTo(startSpot())
    })
  },

  tick(dt: number, elapsed: number, playing: boolean) {
    if (!playing) {
      setBanner('Tip Toe', 'Half these tiles are fake. Cross anyway.')
      return
    }
    if (startAt === 0) startAt = elapsed

    clock += dt * 1000
    // Ramp within the round: the floor gets twitchier the longer the crossing takes.
    const progress = Math.min(1, (elapsed - startAt) / PLAY_SECONDS)
    decayMs = DECAY_MS_START + (DECAY_MS_END - DECAY_MS_START) * progress

    for (let i = pending.length - 1; i >= 0; i--) {
      if (clock >= pending[i].at) {
        const h = grid.homes[pending[i].index]
        if (nextScar < scars.length) {
          Transform.getMutable(scars[nextScar]).position = Vector3.create(h.x, h.y - 0.35, h.z)
          nextScar++
        }
        grid.sink(pending[i].index)
        pending.splice(i, 1)
      }
    }

    if (isOut() || finished) return

    const t = Transform.getOrNull(engine.PlayerEntity)
    if (!t) return

    const index = grid.indexAt(t.position)
    if (index === gold && !goldTaken) {
      goldTaken = true
      award(myAddress(), 1)
      play('crown')
      toast('GOLD TILE  +1')
      grid.setColor(gold, TILE_NEUTRAL)
    }
    if (index >= 0 && !grid.isSunk(index) && fakes[index]) {
      step(index)
      emitTile(index)
      play('crack')
    }

    // Reaching the finish pad ends your run.
    if (t.position.z > lastRowZ() + TILE_SIZE) {
      finished = true
      emitFinished(Math.round((elapsed - startAt) * 1000))
      setBanner('FINISHED!', '')
    }
  },

  stop() {
    grid.setVisible(false)
    setPadsVisible(false)
    pending = []
  }
}

function setPadsVisible(visible: boolean): void {
  setVisible(finishFlag, visible)
  for (const e of [startPad, finishPad]) {
    VisibilityComponent.createOrReplace(e, { visible })
    if (visible) {
      if (!MeshCollider.has(e)) MeshCollider.setBox(e)
    } else {
      MeshCollider.deleteFrom(e)
    }
  }
}
