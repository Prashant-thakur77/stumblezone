// What this visit added up to.
//
// Crowns say how you did against everyone else; this says how you did against yourself, and it is
// the line worth putting on screen at the end of a show. It costs one object and no storage: a
// session is a visit, and when the tab closes the visit is over.

export type SessionStats = { rounds: number; qualified: number; fell: number; bestStreak: number; wins: number; rushWins: number }

export class Session {
  private rounds = 0
  private qualified = 0
  private streak = 0
  private best = 0
  private wins = 0
  private rushWins = 0

  round(survived: boolean): void {
    this.rounds += 1
    if (survived) {
      this.qualified += 1
      this.streak += 1
      if (this.streak > this.best) this.best = this.streak
    } else {
      this.streak = 0
    }
  }

  /** An outright win: you were the last one standing with someone else beaten. */
  won(): void {
    this.wins += 1
  }

  /** A Crown Rush win: top score with someone else on the board. */
  wonRush(): void {
    this.rushWins += 1
  }

  stats(): SessionStats {
    return {
      rounds: this.rounds,
      qualified: this.qualified,
      fell: this.rounds - this.qualified,
      bestStreak: this.best,
      wins: this.wins,
      rushWins: this.rushWins
    }
  }

  summary(): string {
    if (this.rounds === 0) return 'Your first round. Welcome to the show.'
    return this.rounds + ' rounds  ·  ' + this.qualified + ' qualified  ·  best streak ' + this.best
  }
}
