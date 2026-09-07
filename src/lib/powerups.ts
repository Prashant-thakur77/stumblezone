// Power-ups: two pickups a round on the clock-driven stages, each takeable once by every player.
//
// Fair without a server: positions come from the slot's seed, timing from the clock, and each
// client tracks its own collection - so nobody races anyone for a pickup, and nobody sees one
// vanish because someone else got there. SHIELD absorbs one heart. BOOST is eight seconds of
// running faster and jumping higher.

import { mulberry32 } from './prng'

export type PowerKind = 'shield' | 'boost'
export type Powerup = { kind: PowerKind; x: number; z: number; at: number }

export const POWERUP_TIMES = [20, 50]
export const BOOST_SECONDS = 8
export const PICK_RADIUS = 1.3

/** Two pickups inside `radius` of the stage centre, never inside the innermost 2m. */
export function powerupsFor(seed: number, radius: number): Powerup[] {
  const rng = mulberry32(seed ^ 0x9077)
  const kinds: PowerKind[] = rng() < 0.5 ? ['shield', 'boost'] : ['boost', 'shield']
  return POWERUP_TIMES.map((at, i) => {
    const a = rng() * Math.PI * 2
    const r = 2 + rng() * (radius - 2.5)
    return { kind: kinds[i], x: Math.cos(a) * r, z: Math.sin(a) * r, at }
  })
}

export class Collection {
  private taken = new Set<number>()

  reset(): void {
    this.taken.clear()
  }

  /** True the first time a live pickup is reached; false if early, far, or already taken. */
  tryTake(list: Powerup[], i: number, elapsed: number, dx: number, dz: number): boolean {
    const p = list[i]
    if (!p || elapsed < p.at || this.taken.has(i)) return false
    if (Math.hypot(dx - p.x, dz - p.z) > PICK_RADIUS) return false
    this.taken.add(i)
    return true
  }

  has(i: number): boolean {
    return this.taken.has(i)
  }
}
