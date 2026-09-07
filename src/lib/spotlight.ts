// Spotlight - "Stay out of the light."
//
// Pools of light roam a dark stage; linger in one and you lose a heart. It is the only round in
// the pool that punishes standing still, which is exactly the habit a nervous first-timer falls
// into on a phone, and it is legible at a glance: bright circle bad, dark floor good.
//
// The paths are Lissajous figures - two sine waves at incommensurate frequencies - so a light
// never repeats a loop you could memorise, and never needs a path to be synced: every client
// computes the same position from the seed and the round clock.

import { DISC_RADIUS } from '../config'
import { mulberry32 } from './prng'

/** How long you may stand in a light before it costs you. */
export const SPOT_HIT_SECONDS = 1.2
/** The last stretch of that, during which the light turns red and ticks. */
export const SPOT_WARN_SECONDS = 0.6
export const SPOT_RADIUS = 1.8
export const SPOT_THIRD_AT = 45
/** Lights out for two seconds, then they come back somewhere else. Two seconds of pure nerves. */
export const BLACKOUT_AT = 60
export const BLACKOUT_SECONDS = 2

export function inBlackout(elapsed: number): boolean {
  return elapsed >= BLACKOUT_AT && elapsed < BLACKOUT_AT + BLACKOUT_SECONDS
}

export function spotCount(elapsed: number): number {
  return elapsed >= SPOT_THIRD_AT ? 3 : 2
}

export function spotSpeed(elapsed: number): number {
  return elapsed >= SPOT_THIRD_AT ? 1.5 : 1
}

/** Metres from the centre of the stage. Never further out than the walkable ring. */
export function spotCentre(seed: number, index: number, t: number): { x: number; z: number } {
  const rng = mulberry32((seed ^ 0x51907) + index * 7919)
  const fx = 0.11 + rng() * 0.07
  const fz = 0.13 + rng() * 0.07
  const px = rng() * Math.PI * 2
  const pz = rng() * Math.PI * 2
  // Both axes swing to +/-r, so the corner of that box would be r*sqrt(2) from the centre. Scaling
  // by 1/sqrt(2) keeps the whole figure inside the walkable ring.
  const r = (DISC_RADIUS - 2) / Math.SQRT2
  // The speed-up warps the clock rather than the shape, so the paths stay inside the stage.
  let tt = t < SPOT_THIRD_AT ? t : SPOT_THIRD_AT + (t - SPOT_THIRD_AT) * spotSpeed(t)
  // After the blackout the lights come back somewhere else: the clock jumps by a seeded amount.
  if (t >= BLACKOUT_AT + BLACKOUT_SECONDS) tt += 7 + rng() * 9
  return {
    x: r * Math.sin(fx * tt * Math.PI * 2 + px),
    z: r * Math.sin(fz * tt * Math.PI * 2 + pz)
  }
}

/** How long the player has been standing in light, and what that means this frame. */
export class SpotTracker {
  private inLight = 0

  update(inside: boolean, dt: number): 'ok' | 'warn' | 'hit' {
    if (!inside) {
      this.inLight = 0
      return 'ok'
    }
    this.inLight += dt
    if (this.inLight >= SPOT_HIT_SECONDS) {
      // The clock restarts after a hit, so one long stand costs one heart per SPOT_HIT_SECONDS.
      this.inLight = 0
      return 'hit'
    }
    return this.inLight >= SPOT_HIT_SECONDS - SPOT_WARN_SECONDS ? 'warn' : 'ok'
  }
}
