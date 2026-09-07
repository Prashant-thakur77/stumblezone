// Round A - Perfect Match.
//
// Six escalating waves of a memory game on a 5x5 grid. Colours show, the board blanks, one is
// called, and every tile that isn't it drops away.
//
// Waves are variable length rather than fixed slices of the round: a wave is exactly as long as
// its own reveal-blank-call-settle sequence, so the board is always doing something. Cut into
// three equal 28s slices this round spent 51 of its 85 seconds showing a static board.
//
// Layout comes from the slot seed, so every client renders identical colours without exchanging a
// single message.

import { Vector3 } from '@dcl/sdk/math'
import { createTileGrid, TileGrid } from '../tiles'
import {
  perfectMatchWave,
  PerfectMatchWave,
  perfectMatchSchedule,
  perfectMatchWaveSeconds,
  PM_WAVE_COUNT,
  PM_BLANK_SECONDS,
  PM_CALL_SECONDS,
  PM_REVEAL_SECONDS as REVEAL_SECONDS
} from '../../lib/layouts'
import {
  ARENA_CENTER_X,
  ARENA_CENTER_Z,
  ARENA_Y,
  PM_GRID,
  TILE_SIZE,
  FRUIT_COLORS,
  FRUIT_NAMES,
  TILE_NEUTRAL,
  TILE_SHADE,
  TILE_WARNING
} from '../../config'
import { Round } from './types'
import { setBanner } from '../../ui/state'
import { setJumbotronColor } from '../scenery'
import { loseLife, isOut, onFall, sendTo } from '../../systems/spectator'

let grid: TileGrid
let waves: PerfectMatchWave[] = []
let starts: number[] = []
/** Highest wave already judged, so each wave drops its tiles exactly once. */
let judged = -1
let shown = -1
let warned = -1
let revealed = -1

function safeSpot(wave: PerfectMatchWave): Vector3 {
  const i = wave.fruits.indexOf(wave.target)
  return Vector3.create(grid.homes[i].x, grid.homes[i].y + 2, grid.homes[i].z)
}

/** Which wave `elapsed` falls in, and how far into it we are. */
function locate(elapsed: number): { index: number; t: number } {
  let index = 0
  for (let i = 0; i < starts.length; i++) {
    if (elapsed >= starts[i]) index = i
  }
  return { index, t: elapsed - starts[index] }
}

export const perfectMatch: Round = {
  name: 'Perfect Match',
  // Walls, waves, lights and beams all come from the seed and the clock - a latecomer sees
  // exactly what everyone else sees, so they play rather than wait.
  joinSafe: true,
  hint: 'Match the colour.',

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

  start(seed: number) {
    waves = []
    for (let w = 0; w < PM_WAVE_COUNT; w++) waves.push(perfectMatchWave(seed, w))
    starts = perfectMatchSchedule()
    judged = -1
    shown = -1
    warned = -1
    revealed = -1
    grid.setVisible(true)
    grid.resetAll()
    grid.setCheckerboard(TILE_NEUTRAL, TILE_SHADE)

    onFall(() => {
      if (isOut()) return
      const last = waves[Math.max(0, Math.min(judged, PM_WAVE_COUNT - 1))]
      if (!loseLife()) void sendTo(safeSpot(last))
    })
  },

  tick(_dt: number, elapsed: number, playing: boolean) {
    if (!playing) {
      setBanner('Perfect Match', this.hint)
      return
    }

    const { index, t } = locate(elapsed)
    // Past the last wave the round is simply won - hold the board and let the clock run out.
    if (index >= PM_WAVE_COUNT || elapsed > starts[PM_WAVE_COUNT - 1] + perfectMatchWaveSeconds(PM_WAVE_COUNT - 1)) {
      // The scheduler's banner resolver replaces this for anyone who is out, so it can never claim
      // an eliminated player made it to the end.
      setBanner('ALL WAVES CLEARED', 'Hold on until the round ends')
      return
    }

    const wave = waves[index]
    const blankAt = wave.memoryMs / 1000
    const callAt = blankAt + PM_BLANK_SECONDS
    const judgeAt = callAt + PM_CALL_SECONDS

    if (shown !== index) {
      shown = index
      grid.resetAll()
      for (let i = 0; i < wave.fruits.length; i++) grid.setColor(i, FRUIT_COLORS[wave.fruits[i]])
    }

    const waveLabel = 'Wave ' + (index + 1) + ' of ' + PM_WAVE_COUNT

    if (t < blankAt) {
      setBanner('MEMORISE', waveLabel)
    } else if (t < callAt) {
      if (judged < index) grid.setCheckerboard(TILE_NEUTRAL, TILE_SHADE)
      setBanner('...', waveLabel)
    } else if (t < judgeAt) {
      // The tiles are blank by now, so the called colour has to be named here or the round is
      // pure luck. Memory is tested by the blank board, not by hiding the instruction.
      setBanner('STAND ON ' + FRUIT_NAMES[wave.target], Math.ceil(judgeAt - t) + '...')
      setJumbotronColor(FRUIT_COLORS[wave.target])
      // In the last second every doomed tile starts shuddering. It gives a player who guessed
      // wrong one final beat to jump, and turns a static countdown into a visible threat.
      if (judgeAt - t < 1 && warned !== index) {
        warned = index
        for (let i = 0; i < wave.fruits.length; i++) {
          if (wave.fruits[i] !== wave.target) grid.warn(i, TILE_WARNING)
        }
      }
    } else if (t < judgeAt + REVEAL_SECONDS) {
      // The reveal. Every tile shows its colour again for a beat before the wrong ones go, so you
      // find out whether you were right by looking at the floor rather than by falling through it.
      // This is the moment the round is actually about, and it was missing entirely.
      if (revealed < index) {
        revealed = index
        for (let i = 0; i < wave.fruits.length; i++) {
          grid.setColor(i, FRUIT_COLORS[wave.fruits[i]], wave.fruits[i] === wave.target ? 1.8 : 0)
        }
      }
      setBanner('', 'It was ' + FRUIT_NAMES[wave.target])
    } else if (judged < index) {
      judged = index
      setJumbotronColor(null)
      for (let i = 0; i < wave.fruits.length; i++) {
        if (wave.fruits[i] !== wave.target) grid.sink(i)
      }
      setBanner('', waveLabel + ' cleared')
    }
  },

  stop() {
    setJumbotronColor(null)
    grid.setVisible(false)
  }
}
