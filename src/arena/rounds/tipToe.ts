// Round C - Tip Toe.
//
// A bridge where roughly half the tiles are fake and sink once stepped on, permanently for the
// round. That permanence is the round's whole social point: whoever goes first burns themselves
// revealing the path for everyone behind, so a first-finisher bonus exists to make leading worth it.

import { engine, Entity, Transform, MeshRenderer, MeshCollider, Material, VisibilityComponent } from '@dcl/sdk/ecs'
import { Vector3, Color4 } from '@dcl/sdk/math'
import { createTileGrid, TileGrid } from '../tiles'
import { tipToeFakes } from '../../lib/layouts'
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
  TILE_WARNING
} from '../../config'
import { Round } from './types'
import { setBanner } from '../../ui/state'
import { play } from '../../systems/audio'
import { loseLife, isOut, onFall, sendTo } from '../../systems/spectator'
import { emitTile, onTile, emitFinished } from '../../net/sync'

const DECAY_MS = 400

let grid: TileGrid
/** Solid ground at both ends. Without these the bridge floats in mid-air with no way on or off. */
let startPad: Entity
let finishPad: Entity
let fakes: boolean[] = []
let pending: { index: number; at: number }[] = []
let clock = 0
let finished = false
let startAt = 0

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
    roughness: 0.9
  })
  return e
}

function step(index: number): void {
  if (index < 0 || grid.isSunk(index)) return
  if (!fakes[index]) return
  if (pending.some((p) => p.index === index)) return
  pending.push({ index, at: clock + DECAY_MS })
  grid.setColor(index, TILE_WARNING)
}

export const tipToe: Round = {
  name: 'Tip Toe',
  hint: 'Half the tiles are fake. Whoever leads finds them the hard way.',

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
    startAt = 0
    grid.setVisible(true)
    setPadsVisible(true)
    grid.resetAll()
    grid.setCheckerboard(TILE_NEUTRAL, TILE_SHADE)
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
    for (let i = pending.length - 1; i >= 0; i--) {
      if (clock >= pending[i].at) {
        grid.sink(pending[i].index)
        pending.splice(i, 1)
      }
    }

    if (isOut() || finished) return

    const t = Transform.getOrNull(engine.PlayerEntity)
    if (!t) return

    const index = grid.indexAt(t.position)
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
  for (const e of [startPad, finishPad]) {
    VisibilityComponent.createOrReplace(e, { visible })
    if (visible) {
      if (!MeshCollider.has(e)) MeshCollider.setBox(e)
    } else {
      MeshCollider.deleteFrom(e)
    }
  }
}
