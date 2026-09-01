// Round A - Perfect Match.
//
// Three waves of a memory game on a 5x5 grid. Fruits show, the board blanks, a target is called,
// and every tile that isn't the target drops away. Layout comes from the slot seed, so every
// client renders identical fruit without exchanging a single message.

import { Vector3 } from '@dcl/sdk/math'
import { createTileGrid, TileGrid } from '../tiles'
import { perfectMatchWave, PerfectMatchWave } from '../../lib/layouts'
import {
  ARENA_CENTER_X,
  ARENA_CENTER_Z,
  ARENA_Y,
  PM_GRID,
  TILE_SIZE,
  FRUIT_COLORS,
  FRUIT_NAMES,
  TILE_NEUTRAL,
  PLAY_SECONDS
} from '../../config'
import { Round } from './types'
import { setBanner } from '../../ui/state'
import { loseLife, isOut, onFall, sendTo } from '../../systems/spectator'

const WAVES = 3
/** Derived, so retuning the slot split never silently leaves a wave hanging off the end. */
const WAVE_SECONDS = PLAY_SECONDS / WAVES
const BLANK_SECONDS = 1
// Long enough to cross the 15m grid at walking pace after the colour is called. At 3s this round
// was unwinnable for anyone standing on the far side of the board.
const CALL_SECONDS = 6

let grid: TileGrid
let seed = 0
let waves: PerfectMatchWave[] = []
/** Highest wave index already judged, so each wave only sinks tiles once. */
let judged = -1
let shown = -1

function safeSpot(wave: PerfectMatchWave): Vector3 {
  const i = wave.fruits.indexOf(wave.target)
  return Vector3.create(grid.homes[i].x, grid.homes[i].y + 2, grid.homes[i].z)
}

export const perfectMatch: Round = {
  name: 'Perfect Match',
  hint: 'Memorise the colours. When one is called, stand on it.',

  spawn() {
    return Vector3.create(ARENA_CENTER_X, ARENA_Y + 1.5, ARENA_CENTER_Z)
  },

  build() {
    grid = createTileGrid({
      cols: PM_GRID,
      rows: PM_GRID,
      center: Vector3.create(ARENA_CENTER_X, ARENA_Y, ARENA_CENTER_Z),
      tileSize: TILE_SIZE
    })
    grid.setVisible(false)
  },

  start(newSeed: number) {
    seed = newSeed
    waves = [0, 1, 2].map((w) => perfectMatchWave(seed, w))
    judged = -1
    shown = -1
    grid.setVisible(true)
    grid.resetAll()
    grid.setAllColors(TILE_NEUTRAL)

    onFall(() => {
      if (isOut()) return
      const last = judged >= 0 ? waves[Math.min(judged, WAVES - 1)] : waves[0]
      if (!loseLife()) void sendTo(safeSpot(last))
    })
  },

  tick(_dt: number, elapsed: number, playing: boolean) {
    if (!playing) {
      setBanner('Perfect Match', 'Memorise the fruit. Stand on the one they call.')
      return
    }

    const waveIndex = Math.min(Math.floor(elapsed / WAVE_SECONDS), WAVES - 1)
    const t = elapsed - waveIndex * WAVE_SECONDS
    const wave = waves[waveIndex]
    const blankAt = wave.memoryMs / 1000
    const callAt = blankAt + BLANK_SECONDS
    const judgeAt = callAt + CALL_SECONDS

    // Restore the board and paint the new wave's fruit exactly once per wave.
    if (shown !== waveIndex) {
      shown = waveIndex
      grid.resetAll()
      for (let i = 0; i < wave.fruits.length; i++) grid.setColor(i, FRUIT_COLORS[wave.fruits[i]])
    }

    if (t < blankAt) {
      setBanner('MEMORISE', 'Wave ' + (waveIndex + 1) + ' of ' + WAVES)
    } else if (t < callAt) {
      if (judged < waveIndex) grid.setAllColors(TILE_NEUTRAL)
      setBanner('...', '')
    } else if (t < judgeAt) {
      // The tiles are blank by now, so the called colour has to be named here or the round is
      // pure luck. Memory is tested by the blank board, not by hiding the instruction.
      const remaining = Math.ceil(judgeAt - t)
      setBanner('STAND ON ' + FRUIT_NAMES[wave.target], remaining + '...')
    } else if (judged < waveIndex) {
      judged = waveIndex
      for (let i = 0; i < wave.fruits.length; i++) {
        if (wave.fruits[i] !== wave.target) grid.sink(i)
        else grid.setColor(i, FRUIT_COLORS[wave.target])
      }
      setBanner('', '')
    }
  },

  stop() {
    grid.setVisible(false)
  }
}

/** The colour the current wave is asking for, so the HUD can show it as a swatch. */
export function currentTargetColor(elapsed: number): { r: number; g: number; b: number } | null {
  if (waves.length === 0) return null
  const waveIndex = Math.min(Math.floor(elapsed / WAVE_SECONDS), WAVES - 1)
  const wave = waves[waveIndex]
  const t = elapsed - waveIndex * WAVE_SECONDS
  const callAt = wave.memoryMs / 1000 + BLANK_SECONDS
  if (t < callAt) return null
  return FRUIT_COLORS[wave.target]
}
