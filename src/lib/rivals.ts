// Head-to-head across a show.
//
// The results card already names the player nearest you on the clock. Counting the rounds you
// beat them and the rounds they beat you turns a line into a rivalry: "vs Alice: 2-1" is a score
// two people will talk about, and the next round settles it.

export class HeadToHead {
  private wins = new Map<string, number>()
  private losses = new Map<string, number>()

  record(rival: string, iWon: boolean): void {
    const m = iWon ? this.wins : this.losses
    m.set(rival, (m.get(rival) ?? 0) + 1)
  }

  reset(): void {
    this.wins.clear()
    this.losses.clear()
  }

  /** "2-1" for a rival you have met, or '' if you have not. */
  score(rival: string): string {
    const w = this.wins.get(rival) ?? 0
    const l = this.losses.get(rival) ?? 0
    return w + l === 0 ? '' : w + '-' + l
  }

  /** The rival you have met most often this show. */
  main(): string {
    let best = ''
    let n = 0
    const all = new Set([...this.wins.keys(), ...this.losses.keys()])
    for (const a of all) {
      const c = (this.wins.get(a) ?? 0) + (this.losses.get(a) ?? 0)
      if (c > n) {
        n = c
        best = a
      }
    }
    return best
  }
}
