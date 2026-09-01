// Jump Bar: one low beam sweeping a round stage. Jump it, or it takes a life.
//
// It is the genre's simplest round and the best one to put early in a show: a first-timer on a
// phone learns the jump button here, with three lives, before anything asks them to read a board.
// The escalation is a straight ramp in speed plus a second, counter-rotating beam at 50 seconds -
// two beams turning opposite ways make the gap between them close from both sides.

import { PLAY_SECONDS } from '../config'
import { mulberry32 } from './prng'

export const JUMPBAR_SECOND_AT = 50

const MIN_SPEED = 30
const MAX_SPEED = 55

/** Degrees per second. Tuned so the beam is always jumpable with the SDK's default locomotion. */
export function jumpBarSpeed(elapsed: number): number {
  const t = Math.min(1, Math.max(0, elapsed / PLAY_SECONDS))
  return MIN_SPEED + (MAX_SPEED - MIN_SPEED) * t
}

export function jumpBarBeams(seed: number): { angle: number; direction: 1 | -1 }[] {
  const rng = mulberry32(seed ^ 0x0b4a)
  const first = Math.floor(rng() * 360)
  return [
    { angle: first, direction: 1 },
    { angle: (first + 90) % 360, direction: -1 }
  ]
}
