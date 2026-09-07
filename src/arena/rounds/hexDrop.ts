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
  HEX_LAYERS,
  HEX_COLS,
  HEX_ROWS,
  HEX_TILE_SIZE,
  TILE_NEUTRAL,
  TILE_SHADE,
  DECK_TWO,
  TILE_WARNING
} from '../../config'
import { Round } from './types'
import { setBanner } from '../../ui/state'
import { hexCrumble, HEX_CRUMBLE_AT } from '../../lib/layouts'
import { play } from '../../systems/audio'
import { eliminate, isOut, onFall } from '../../systems/spectator'
import { emitTile, onTile } from '../../net/sync'


/** Grace between a step and the tile giving way. Long enough to run across, short enough to fear. */
/** Top deck is forgiving; each deck below is twitchier. Falling costs you thinking time as well. */
const DECAY_MS_TOP = 600
const DECAY_MS_PER_DECK = 90

type Pending = { layer: number; index: number; at: number }

let layers: TileGrid[] = []
let pending: Pending[] = []
let clock = 0
let seedNow = 0
let crumbled = false

function tileKey(layer: number, index: number): number {
  return layer * 1000 + index
}

function markStepped(layer: number, index: number): void {
  if (layer < 0 || layer >= layers.length) return
  if (layers[layer].isSunk(index)) return
  if (pending.some((p) => p.layer === layer && p.index === index)) return
  pending.push({ layer, index, at: clock + Math.max(220, DECAY_MS_TOP - layer * DECAY_MS_PER_DECK) })
  layers[layer].warn(index, TILE_WARNING)
}

/** Which deck the local player is standing on, or -1 if they are between or off the stack. */
function currentDeck(): number {
  const t = Transform.getOrNull(engine.PlayerEntity)
  if (!t) return -1
  for (let l = 0; l < layers.length; l++) {
    const surfaceY = ARENA_Y - l * HEX_LAYER_GAP
    if (t.position.y >= surfaceY - 0.3 && t.position.y <= surfaceY + 3) return l
  }
  return -1
}

export const hexDrop: Round = {
  name: 'Hex-Drop',
  // Dropping a deck is progress, not a fall. Only the drop off the bottom deck is.
  floorY: ARENA_Y - (HEX_LAYERS - 1) * HEX_LAYER_GAP,
  hint: 'Do not stop moving.',

  spawn() {
    return Vector3.create(ARENA_CENTER_X, ARENA_Y + 1.5, ARENA_CENTER_Z)
  },

  build() {
    layers = Array.from({ length: HEX_LAYERS }, (_, l) => l).map((l) =>
      createTileGrid({
        cols: HEX_COLS,
        rows: HEX_ROWS,
        center: Vector3.create(ARENA_CENTER_X, ARENA_Y - l * HEX_LAYER_GAP, ARENA_CENTER_Z),
        tileSize: HEX_TILE_SIZE,
        gap: 0.35,
        stagger: true,
        thickness: 0.4,
        shape: 'disc'
      })
    )
    for (const l of layers) l.setVisible(false)

    onTile((p, isSelf) => {
      if (isSelf) return
      markStepped(Math.floor(p.tileId / 1000), p.tileId % 1000)
    })
  },

  start(seed: number) {
    seedNow = seed
    crumbled = false
    pending = []
    clock = 0
    for (let i = 0; i < layers.length; i++) {
      const layer = layers[i]
      layer.setVisible(true)
      layer.resetAll()
      // The lower deck is visibly darker, so a player who drops through knows instantly that they
      // are on their last chance rather than wondering which layer they are on.
      // Each deck down is darker than the one above, so how far you have fallen - and how many
      // chances are left - reads instantly without a word of UI.
      const t = i / Math.max(1, HEX_LAYERS - 1)
      const mix = (a: number, b: number) => a + (b - a) * t
      const light = {
        r: mix(TILE_NEUTRAL.r, DECK_TWO.r),
        g: mix(TILE_NEUTRAL.g, DECK_TWO.g),
        b: mix(TILE_NEUTRAL.b, DECK_TWO.b)
      }
      const dark = {
        r: mix(TILE_SHADE.r, DECK_TWO.r * 0.8),
        g: mix(TILE_SHADE.g, DECK_TWO.g * 0.8),
        b: mix(TILE_SHADE.b, DECK_TWO.b * 0.8)
      }
      layer.setCheckerboard(light, dark)
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
    const deck = currentDeck()
    setBanner('', deck < 0 ? 'Last one standing wins' : 'Level ' + (deck + 1) + ' of ' + HEX_LAYERS)

    clock += dt * 1000

    // The crumble: at sixty seconds a third of the top deck goes on its own. Standing still on
    // the top deck was a strategy; now it is a gamble. Everyone computes the same tiles.
    if (!crumbled && _elapsed >= HEX_CRUMBLE_AT) {
      crumbled = true
      for (const i of hexCrumble(seedNow, HEX_COLS * HEX_ROWS)) markStepped(0, i)
      play('crack')
      setBanner('CRUMBLE!', 'The top deck is going')
    }

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
