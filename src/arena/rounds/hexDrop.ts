// Round D - Hex-Drop, the finale.
//
// Two stacked layers of staggered tiles that vanish shortly after anyone stands on them. This is
// the one round whose state is genuinely player-caused rather than seeded, so it is the only one
// that needs to put anything on the wire.
//
// Step detection polls the local player's position rather than putting a TriggerArea on all 360
// tiles: 360 number comparisons per frame is far cheaper than 360 extra collider entities, and it
// keeps us well clear of the mobile entity budget.

import { engine, Transform } from '@dcl/sdk/ecs'
import { Vector3 } from '@dcl/sdk/math'
import { createTileGrid, TileGrid } from '../tiles'
import {
  ARENA_CENTER_X,
  ARENA_CENTER_Z,
  ARENA_Y,
  HEX_LAYER_GAP,
  TILE_NEUTRAL,
  TILE_WARNING
} from '../../config'
import { Round } from './types'
import { setBanner } from '../../ui/state'
import { play } from '../../systems/audio'
import { eliminate, isOut, onFall } from '../../systems/spectator'
import { emitTile, onTile } from '../../net/sync'

const COLS = 15
const ROWS = 12
const HEX_SIZE = 2
/** Grace between a step and the tile giving way. Long enough to run across, short enough to fear. */
const DECAY_MS = 500

type Pending = { layer: number; index: number; at: number }

let layers: TileGrid[] = []
let pending: Pending[] = []
let clock = 0

function tileKey(layer: number, index: number): number {
  return layer * 1000 + index
}

function markStepped(layer: number, index: number): void {
  if (layer < 0 || layer >= layers.length) return
  if (layers[layer].isSunk(index)) return
  if (pending.some((p) => p.layer === layer && p.index === index)) return
  pending.push({ layer, index, at: clock + DECAY_MS })
  layers[layer].setColor(index, TILE_WARNING)
}

export const hexDrop: Round = {
  name: 'Hex-Drop',
  hint: 'Every tile you touch falls away. Keep moving.',

  spawn() {
    return Vector3.create(ARENA_CENTER_X, ARENA_Y + 1.5, ARENA_CENTER_Z)
  },

  build() {
    layers = [0, 1].map((l) =>
      createTileGrid({
        cols: COLS,
        rows: ROWS,
        center: Vector3.create(ARENA_CENTER_X, ARENA_Y - l * HEX_LAYER_GAP, ARENA_CENTER_Z),
        tileSize: HEX_SIZE,
        gap: 0.2,
        stagger: true,
        thickness: 0.4
      })
    )
    for (const l of layers) l.setVisible(false)

    onTile((p, isSelf) => {
      if (isSelf) return
      markStepped(Math.floor(p.tileId / 1000), p.tileId % 1000)
    })
  },

  start() {
    pending = []
    clock = 0
    for (const l of layers) {
      l.setVisible(true)
      l.resetAll()
      l.setAllColors(TILE_NEUTRAL)
    }
    onFall(() => {
      // Through both layers is out. There is no second chance in the finale.
      if (!isOut()) eliminate()
    })
  },

  tick(dt: number, _elapsed: number, playing: boolean) {
    if (!playing) {
      setBanner('Hex-Drop', 'Keep moving. Every tile you touch falls away.')
      return
    }
    setBanner('', 'Last one standing wins')

    clock += dt * 1000

    // Sink whatever has run out its grace period.
    for (let i = pending.length - 1; i >= 0; i--) {
      if (clock >= pending[i].at) {
        layers[pending[i].layer].sink(pending[i].index)
        pending.splice(i, 1)
      }
    }

    if (isOut()) return

    const t = Transform.getOrNull(engine.PlayerEntity)
    if (!t) return

    // Which layer are we standing on? Whichever one is just below our feet.
    for (let l = 0; l < layers.length; l++) {
      const surfaceY = ARENA_Y - l * HEX_LAYER_GAP
      if (t.position.y < surfaceY - 0.2 || t.position.y > surfaceY + 3) continue
      const index = layers[l].indexAt(t.position)
      if (index < 0 || layers[l].isSunk(index)) continue
      if (pending.some((p) => p.layer === l && p.index === index)) continue
      markStepped(l, index)
      emitTile(tileKey(l, index))
      play('crack')
      break
    }
  },

  stop() {
    for (const l of layers) l.setVisible(false)
    pending = []
  }
}
