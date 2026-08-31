// Round C - Tip Toe.
//
// A bridge where roughly half the tiles are fake and sink once stepped on, permanently for the
// round. That permanence is the round's whole social point: whoever goes first burns themselves
// revealing the path for everyone behind, so a first-finisher bonus exists to make leading worth it.

import { engine, Transform } from '@dcl/sdk/ecs'
import { Vector3 } from '@dcl/sdk/math'
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
  PLATFORM_COLOR
} from '../../config'
import { Round } from './types'
import { setBanner } from '../../ui/state'
import { loseLife, isOut, onFall, sendTo } from '../../systems/spectator'
import { emitTile, onTile, emitFinished } from '../../net/sync'

const DECAY_MS = 400

let grid: TileGrid
let fakes: boolean[] = []
let pending: { index: number; at: number }[] = []
let clock = 0
let finished = false
let startAt = 0

/** Just before the first row, where a fallen player is put back. */
function startSpot(): Vector3 {
  const h = grid.homes[Math.floor(TIPTOE_WIDTH / 2)]
  return Vector3.create(h.x, h.y + 2, h.z - TILE_SIZE * 2)
}

function step(index: number): void {
  if (index < 0 || grid.isSunk(index)) return
  if (!fakes[index]) return
  if (pending.some((p) => p.index === index)) return
  pending.push({ index, at: clock + DECAY_MS })
  grid.setColor(index, PLATFORM_COLOR)
}

export const tipToe: Round = {
  name: 'Tip Toe',

  build() {
    grid = createTileGrid({
      cols: TIPTOE_WIDTH,
      rows: TIPTOE_LENGTH,
      center: Vector3.create(ARENA_CENTER_X, ARENA_Y, ARENA_CENTER_Z),
      tileSize: TILE_SIZE
    })
    grid.setVisible(false)
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
    grid.resetAll()
    grid.setAllColors(TILE_NEUTRAL)
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
    }

    // Past the far edge of the last row is the finish line.
    const lastRowZ = grid.homes[grid.homes.length - 1].z
    if (t.position.z > lastRowZ + TILE_SIZE) {
      finished = true
      emitFinished(Math.round((elapsed - startAt) * 1000))
      setBanner('FINISHED!', '')
    }
  },

  stop() {
    grid.setVisible(false)
    pending = []
  }
}
