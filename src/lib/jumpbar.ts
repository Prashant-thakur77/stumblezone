// Jump Bar: one low beam sweeping a round stage. Jump it, or it takes a life.
//
// It is the genre's simplest round and the best one to put early in a show: a first-timer on a
// phone learns the jump button here, with three lives, before anything asks them to read a board.
// The escalation is a straight ramp in speed plus a second, counter-rotating beam at 50 seconds -
// two beams turning opposite ways make the gap between them close from both sides.

import { PLAY_SECONDS } from '../config'
import { mulberry32 } from './prng'

export const JUMPBAR_SECOND_AT = 50
/** Both beams reverse here. Rhythm you had learned becomes rhythm you have to relearn. */
export const JUMPBAR_REVERSE_AT = 70

export function jumpBarDirection(base: 1 | -1, elapsed: number): 1 | -1 {
  return elapsed >= JUMPBAR_REVERSE_AT ? ((-base) as 1 | -1) : base
}

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

/**
 * Where a beam is at `elapsed`, in degrees, from its seeded start: the integral of the speed ramp,
 * reversed after JUMPBAR_REVERSE_AT. The engine turns the beam between ticks; this is what every
 * client resets the pivot to every few seconds, so a latecomer or a hitching phone sees the same
 * beam everyone else does.
 */
export function jumpBarAngle(base: number, direction: 1 | -1, elapsed: number): number {
  const travelled = (t: number) => {
    const c = Math.min(Math.max(t, 0), PLAY_SECONDS)
    // integral of MIN + (MAX-MIN) * t / PLAY from 0 to c, plus the flat tail past PLAY
    return MIN_SPEED * c + ((MAX_SPEED - MIN_SPEED) * c * c) / (2 * PLAY_SECONDS) + Math.max(0, t - PLAY_SECONDS) * MAX_SPEED
  }
  const forward = travelled(Math.min(elapsed, JUMPBAR_REVERSE_AT))
  const back = elapsed > JUMPBAR_REVERSE_AT ? travelled(elapsed) - travelled(JUMPBAR_REVERSE_AT) : 0
  return (((base + direction * (forward - back)) % 360) + 360) % 360
}
