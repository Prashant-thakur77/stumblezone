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

/** The zone's edge never reaches the stage edge: a ring you cannot stand in is not a zone. */
const EDGE_MARGIN = 0.8

export function hopAt(elapsed: number): number {
  return Math.max(0, Math.floor((elapsed - SCORING_FROM) / HOP_SECONDS))
}

/** Seconds until the ring next moves: to the first hop before scoring starts, then per cycle. */
export function nextHopIn(elapsed: number): number {
  if (elapsed < SCORING_FROM) return SCORING_FROM - elapsed
  return HOP_SECONDS - ((elapsed - SCORING_FROM) % HOP_SECONDS)
}

export function radiusAt(elapsed: number): number {
  const t = Math.min(1, Math.max(0, (elapsed - SCORING_FROM) / (PLAY_SECONDS - SCORING_FROM)))
  return ZONE_RADIUS_START + (ZONE_RADIUS_END - ZONE_RADIUS_START) * t
}

/** Where the zone is at `elapsed` seconds into play. Every hop lands wholly inside the stage. */
export function zoneAt(seed: number, elapsed: number): Zone {
  const hop = hopAt(elapsed)
  const rng = mulberry32((seed ^ 0xc801) + hop * 7919)
  const a = rng() * Math.PI * 2
  const maxCentre = DISC_RADIUS - EDGE_MARGIN - ZONE_RADIUS_START
  const r = 2 + rng() * (maxCentre - 2)
  return { x: Math.cos(a) * r, z: Math.sin(a) * r, radius: radiusAt(elapsed), hop }
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

  /** The leader and their score; '' when nobody has scored. Ties break on address, so every client agrees. */
  leader(): { address: string; points: number } {
    const top = this.ranked()[0]
    return top && top.points > 0 ? top : { address: '', points: 0 }
  }

  /** Highest first; ties by address, the same rule the crown standings use, so no client disagrees. */
  ranked(): { address: string; points: number }[] {
    return [...this.byAddress]
      .map(([address, points]) => ({ address, points }))
      .sort((a, b) => b.points - a.points || a.address.localeCompare(b.address))
  }

  size(): number {
    return this.byAddress.size
  }

  reset(): void {
    this.byAddress.clear()
  }
}
