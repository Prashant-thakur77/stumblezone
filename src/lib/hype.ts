// The crowd's temperature.
//
// Spectators have exactly one verb - CHEER - and until now it did nothing anyone could see. This
// turns a burst of cheering into an event: enough of them inside a sliding window and the stadium
// erupts, which is the only way an eliminated player gets to change what happens on screen.

export const HYPE_WINDOW_MS = 10000
export const HYPE_CHEERS = 5
export const HYPE_COOLDOWN_MS = 20000

export class Hype {
  private cheers: number[] = []
  private lastWildAt = -Infinity

  cheer(nowMs: number): void {
    this.cheers.push(nowMs)
    this.prune(nowMs)
  }

  private prune(nowMs: number): void {
    this.cheers = this.cheers.filter((t) => nowMs - t < HYPE_WINDOW_MS)
  }

  /** 0 to 1, where 1 means the crowd is about to go off. */
  level(nowMs: number): number {
    this.prune(nowMs)
    return Math.min(1, this.cheers.length / HYPE_CHEERS)
  }

  /** True once when the crowd tips over, then quiet for the cooldown so it stays an event. */
  consumeWild(nowMs: number): boolean {
    if (nowMs - this.lastWildAt < HYPE_COOLDOWN_MS) return false
    if (this.level(nowMs) < 1) return false
    this.lastWildAt = nowMs
    this.cheers = []
    return true
  }
}
