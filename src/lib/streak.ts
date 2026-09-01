// Consecutive qualifications per player.
//
// A streak is the cheapest possible rivalry: it needs no persistence, no accounts and no server,
// and it gives the room a reason to watch one particular avatar. Two rounds in a row and a star
// appears over your name tag; fall once and it is gone.

export class Streaks {
  private counts = new Map<string, number>()

  qualified(address: string): void {
    this.counts.set(address, (this.counts.get(address) ?? 0) + 1)
  }

  eliminated(address: string): void {
    this.counts.set(address, 0)
  }

  streak(address: string): number {
    return this.counts.get(address) ?? 0
  }

  /** Everyone currently on a streak of at least `min` rounds. */
  hot(min = 2): string[] {
    return [...this.counts].filter(([, n]) => n >= min).map(([a]) => a)
  }
}
