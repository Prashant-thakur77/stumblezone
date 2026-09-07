// The Speed Lap: out to the corner plaza and back, against the clock.
//
// The east lane is a forty-metre straight, and the simplest thing to do with a straight is run it.
// The turnaround pad is what makes it a lap and not a sprint: a finish without a turn is nothing,
// so there is no way to cut the course by standing next to the start.

export class Lap {
  private startedAt = 0
  private turned = false

  start(nowMs: number): void {
    this.startedAt = nowMs
    this.turned = false
  }

  turn(): void {
    if (this.startedAt !== 0) this.turned = true
  }

  running(): boolean {
    return this.startedAt !== 0
  }

  startedAtMs(): number {
    return this.startedAt
  }

  cancel(): void {
    this.startedAt = 0
    this.turned = false
  }

  /** Elapsed ms for a completed lap, or null if the clock was not running or the turn was skipped. */
  finish(nowMs: number): number | null {
    if (this.startedAt === 0 || !this.turned) return null
    const ms = nowMs - this.startedAt
    this.startedAt = 0
    this.turned = false
    return ms
  }
}
