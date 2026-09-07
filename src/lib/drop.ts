// The Big Drop: jump from the Sky Box, land on the target.
//
// Height is the proof. A landing only counts if you were at least DROP_MIN_HEIGHT above the pad
// in the last three seconds - walking onto the pad from the village is not a drop - and where you
// land inside the rings decides the payout.

import { DROP_PAD, DROP_MIN_HEIGHT, LOBBY } from '../config'

export const PERFECT_RADIUS = 0.8
export const GOOD_RADIUS = 3
export const DROP_MEMORY_MS = 3000
export const DROP_COOLDOWN_MS = 10000

export type Landing = 'perfect' | 'good' | null

export class DropWatch {
  private samples: { y: number; at: number }[] = []
  private lastLandingAt = -Infinity

  sample(y: number, nowMs: number): void {
    this.samples.push({ y, at: nowMs })
    while (this.samples.length > 0 && nowMs - this.samples[0].at > DROP_MEMORY_MS) this.samples.shift()
  }

  private peak(): number {
    let max = -Infinity
    for (const s of this.samples) if (s.y > max) max = s.y
    return max
  }

  landed(x: number, z: number, nowMs: number): Landing {
    if (nowMs - this.lastLandingAt < DROP_COOLDOWN_MS) return null
    if (this.peak() < LOBBY.y + DROP_MIN_HEIGHT) return null
    const d = Math.hypot(x - DROP_PAD.x, z - DROP_PAD.z)
    if (d > GOOD_RADIUS) return null
    this.lastLandingAt = nowMs
    this.samples = []
    return d <= PERFECT_RADIUS ? 'perfect' : 'good'
  }
}
