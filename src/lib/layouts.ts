// Seeded round layouts. Pure — no @dcl/sdk imports.
//
// Every layout is a function of the slot seed alone, so a player joining halfway through a round
// reconstructs the identical board without asking anyone for it.

import { mulberry32, shuffle } from './prng'
import { PM_GRID, TIPTOE_WIDTH, TIPTOE_LENGTH, SWEEPER_COLUMNS } from '../config'

/** Distinct colours per wave. More kinds means a harder board to memorise. */
const FRUIT_KINDS = [3, 3, 4, 4, 5, 5]

/** How long the colours stay visible before the board blanks, per wave. */
const MEMORY_MS = [6000, 4500, 3500, 3000, 2500, 2000]

/** How many waves a full round runs. */
export const PM_WAVE_COUNT = FRUIT_KINDS.length

/** Seconds each wave spends on: blank board, colour called, then settling after the drop. */
export const PM_BLANK_SECONDS = 1
export const PM_CALL_SECONDS = 6
export const PM_SETTLE_SECONDS = 3

/** Wall-clock length of one wave, which shortens as the memory phase does. */
export function perfectMatchWaveSeconds(wave: number): number {
  const w = Math.min(wave, MEMORY_MS.length - 1)
  return MEMORY_MS[w] / 1000 + PM_BLANK_SECONDS + PM_CALL_SECONDS + PM_SETTLE_SECONDS
}

/** Cumulative start time of each wave, so `tick` can locate itself from elapsed seconds alone. */
export function perfectMatchSchedule(): number[] {
  const starts: number[] = []
  let t = 0
  for (let i = 0; i < PM_WAVE_COUNT; i++) {
    starts.push(t)
    t += perfectMatchWaveSeconds(i)
  }
  return starts
}

/** Safe tiles guaranteed on every Perfect Match board, so a crowd always has somewhere to stand. */
const MIN_SAFE_TILES = 4

export type PerfectMatchWave = {
  fruits: number[]
  target: number
  memoryMs: number
}

export function perfectMatchWave(seed: number, wave: number): PerfectMatchWave {
  const w = Math.min(wave, FRUIT_KINDS.length - 1)
  const rng = mulberry32(seed ^ ((wave + 1) * 0x9e37))
  const kinds = FRUIT_KINDS[w]
  const cells = PM_GRID * PM_GRID
  const target = Math.floor(rng() * kinds)

  // Seed the guaranteed safe tiles first, fill the rest at random, then shuffle so the safe ones
  // are not predictably clustered at the start of the board.
  const fruits: number[] = []
  for (let i = 0; i < MIN_SAFE_TILES; i++) fruits.push(target)
  while (fruits.length < cells) fruits.push(Math.floor(rng() * kinds))

  return { fruits: shuffle(rng, fruits), target, memoryMs: MEMORY_MS[w] }
}

/**
 * Which Tip Toe tiles are fake, row-major over a TIPTOE_WIDTH x TIPTOE_LENGTH bridge.
 *
 * A path is carved first and decoys are added afterwards, so the bridge is solvable for every
 * possible seed. Generating fakes purely at random would eventually produce an unwinnable round
 * that every client agrees on — the worst kind of bug, and one playtesting would never find.
 */
export function tipToeFakes(seed: number): boolean[] {
  const rng = mulberry32(seed ^ 0x7a1c)
  const fakes: boolean[] = new Array(TIPTOE_WIDTH * TIPTOE_LENGTH).fill(true)

  // Carve a guaranteed route: a random walk that only ever steps to an adjacent column.
  let col = Math.floor(rng() * TIPTOE_WIDTH)
  for (let row = 0; row < TIPTOE_LENGTH; row++) {
    fakes[row * TIPTOE_WIDTH + col] = false
    col = Math.max(0, Math.min(TIPTOE_WIDTH - 1, col + Math.floor(rng() * 3) - 1))
  }

  // Add decoy real tiles so the carved route can't be spotted by elimination.
  for (let i = 0; i < fakes.length; i++) {
    if (fakes[i] && rng() < 0.35) fakes[i] = false
  }
  return fakes
}

export type SweeperWave = {
  speed: number
  gapCol: number
  /** +1 travels away from the lobby, -1 towards it. Alternating stops the round being a metronome. */
  direction: 1 | -1
}

/** Wall speed in metres per second, escalating each wave, with a seeded gap position. */
export function sweeperWaves(seed: number): SweeperWave[] {
  const rng = mulberry32(seed ^ 0x5eed)
  // Tuned against DCL avatar locomotion (~2 m/s walking) and touch reaction time. At the old
  // 3.0 + 0.9 the final wave closed every 1.6s, which no joystick player can read in time.
  const BASE_SPEED = 2.2
  const STEP = 0.5
  return [0, 1, 2, 3].map((i) => ({
    speed: BASE_SPEED + i * STEP,
    gapCol: Math.floor(rng() * SWEEPER_COLUMNS),
    direction: (i % 2 === 0 ? 1 : -1) as 1 | -1
  }))
}
