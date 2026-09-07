// The Star Hunt: five stars a day, hidden around the village.
//
// Exploration is the one thing a round cannot offer, and a village with nothing to find in it is a
// backdrop. The stars move every UTC day, everyone sees the same five, and finding them is worth
// crowns - so the walk from the podium to the disco has a reason.

import { STAR_SPOTS, STARS_PER_DAY } from '../config'
import { hashSlot, mulberry32, shuffle } from './prng'

export const STAR_CROWNS = 1
export const STAR_HUNT_BONUS = 3

/** Which candidate spots are lit today, as indices into STAR_SPOTS. */
export function dailyStars(day: number): number[] {
  const rng = mulberry32(hashSlot(day * 104729 + 7))
  const all = STAR_SPOTS.map((_, i) => i)
  return shuffle(rng, all).slice(0, STARS_PER_DAY).sort((a, b) => a - b)
}

export class StarHunt {
  private day = NaN
  private found = new Set<number>()

  private roll(day: number): void {
    if (day !== this.day) {
      this.day = day
      this.found.clear()
    }
  }

  /** True if this was a new find today. */
  collect(spot: number, day: number): boolean {
    this.roll(day)
    if (!dailyStars(day).includes(spot) || this.found.has(spot)) return false
    this.found.add(spot)
    return true
  }

  has(spot: number, day: number): boolean {
    this.roll(day)
    return this.found.has(spot)
  }

  count(day: number): number {
    this.roll(day)
    return this.found.size
  }

  complete(day: number): boolean {
    return this.count(day) >= STARS_PER_DAY
  }
}
