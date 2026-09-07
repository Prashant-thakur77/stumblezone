// Beat the House: an opponent who is always there.
//
// A judge testing alone at three in the morning has nobody to beat. The house time is the
// designer's par for each round - survive past it, or finish Tip Toe under it - and beating it
// pays a crown whether or not anyone else was playing. It is the opponent that never logs off.

import { ROUND_NAMES } from '../config'

export const HOUSE_CROWNS = 1

/** Milliseconds, by round id. Survival rounds: last this long. Tip Toe: finish faster than this. */
export const HOUSE_MS: Record<number, number> = {
  0: 60000, // Perfect Match - through wave four
  1: 62000, // Sweeper Gates - past the speed-up
  2: 40000, // Tip Toe - finish under 40s
  3: 55000, // Hex-Drop - outlast the crumble
  4: 65000, // Spotlight - past the third light and the blackout
  5: 72000, // Jump Bar - past the reversal
  6: 58000 // Copycat - through wave three
}

export const FINISH_ROUNDS = new Set([2])

export type HouseResult = { beaten: boolean; label: string }

export function beatTheHouse(roundId: number, survived: boolean, survivedMs: number, finishMs: number | null): HouseResult {
  const house = HOUSE_MS[roundId]
  const name = ROUND_NAMES[roundId] ?? 'the round'
  const secs = (ms: number) => Math.round(ms / 1000) + 's'
  if (house === undefined) return { beaten: false, label: '' }
  if (FINISH_ROUNDS.has(roundId)) {
    if (finishMs !== null && finishMs <= house) return { beaten: true, label: 'BEAT THE HOUSE  ·  ' + secs(finishMs) + ' vs house ' + secs(house) }
    return { beaten: false, label: 'House on ' + name + ': finish under ' + secs(house) }
  }
  const lasted = survived ? Number.POSITIVE_INFINITY : survivedMs
  if (lasted >= house) return { beaten: true, label: 'BEAT THE HOUSE  ·  house was ' + secs(house) }
  return { beaten: false, label: 'House on ' + name + ': last ' + secs(house) + ' (you: ' + secs(survivedMs) + ')' }
}
