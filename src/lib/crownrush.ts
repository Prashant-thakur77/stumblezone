// Crown Rush: king of the hill. A crown zone on the stage; every second inside is a point; the
// zone hops every twelve seconds and shrinks as the round goes on. Most points wins.
//
// It is the first round where players contest each other rather than the arena - two people
// wanting the same three metres of floor is the whole game - and it is the one that fits a phone
// best of all: walk to the ring, stay in it. The zone's path is a function of the seed and the
// clock, so every client sees the same ring; only the scores travel over the bus.

import { PLAY_SECONDS, GET_READY_SECONDS, WARMUP_SECONDS, DISC_RADIUS } from '../config'
import { mulberry32 } from './prng'

export const HOP_SECONDS = 12
export const ZONE_RADIUS_START = 3.2
export const ZONE_RADIUS_END = 1.7
/** Seconds into play when scoring starts: after the freeze and the warm-up. */
export const SCORING_FROM = GET_READY_SECONDS + WARMUP_SECONDS

export type Zone = { x: number; z: number; radius: number; hop: number }

/** Where the zone is at `elapsed` seconds into play. Hops land inside the walkable ring. */
export function zoneAt(seed: number, elapsed: number): Zone {
  const hop = Math.max(0, Math.floor((elapsed - SCORING_FROM) / HOP_SECONDS))
  const rng = mulberry32((seed ^ 0xc801) + hop * 7919)
  const a = rng() * Math.PI * 2
  const r = 2 + rng() * (DISC_RADIUS - 5)
  const t = Math.min(1, Math.max(0, (elapsed - SCORING_FROM) / (PLAY_SECONDS - SCORING_FROM)))
  return { x: Math.cos(a) * r, z: Math.sin(a) * r, radius: ZONE_RADIUS_START + (ZONE_RADIUS_END - ZONE_RADIUS_START) * t, hop }
}

/** Points earned this frame by someone `distance` from the zone centre. */
export function pointsFor(zone: Zone, distance: number, dt: number, elapsed: number): number {
  if (elapsed < SCORING_FROM || elapsed > PLAY_SECONDS) return 0
  return distance <= zone.radius ? dt : 0
}

/** Everyone's latest reported score, and who is winning. */
export class Scores {
  private byAddress = new Map<string, number>()

  report(address: string, points: number): void {
    const prev = this.byAddress.get(address) ?? 0
    if (points >= prev) this.byAddress.set(address, points)
  }

  get(address: string): number {
    return this.byAddress.get(address) ?? 0
  }

  /** The leader and their score; '' when nobody has scored. Ties go to the earlier reporter. */
  leader(): { address: string; points: number } {
    let best = { address: '', points: 0 }
    for (const [address, points] of this.byAddress) if (points > best.points) best = { address, points }
    return best
  }

  ranked(): { address: string; points: number }[] {
    return [...this.byAddress].map(([address, points]) => ({ address, points })).sort((a, b) => b.points - a.points)
  }

  reset(): void {
    this.byAddress.clear()
  }
}
