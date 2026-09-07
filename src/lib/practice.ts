// The practice patch: tiles that sink when stepped on and come back a few seconds later.
//
// Hex-Drop's whole lesson is "a tile you stand on goes away", and the only place to learn it is
// the finale, with everything at stake. Here the same tile sinks a metre onto the lane floor and
// returns, so the lesson costs nothing.

export const SINK_DELAY = 0.6
export const SINK_TIME = 0.5
export const SINK_DEPTH = 1.2
export const RESPAWN = 4

export type TileState = { drop: number; solid: boolean }

export class Patch {
  private steppedAt: (number | null)[]

  constructor(count: number) {
    this.steppedAt = new Array(count).fill(null)
  }

  step(i: number, now: number): void {
    if (this.steppedAt[i] === null) this.steppedAt[i] = now
  }

  /** Where every tile is this frame: how far it has dropped (0..1) and whether it holds weight. */
  tick(now: number): TileState[] {
    return this.steppedAt.map((at, i) => {
      if (at === null) return { drop: 0, solid: true }
      const t = now - at
      if (t < SINK_DELAY) return { drop: 0, solid: true }
      if (t < SINK_DELAY + SINK_TIME) return { drop: (t - SINK_DELAY) / SINK_TIME, solid: false }
      if (t < RESPAWN) return { drop: 1, solid: false }
      this.steppedAt[i] = null
      return { drop: 0, solid: true }
    })
  }
}
