// Pick a winner: a spectator's stake in the round they are watching.
//
// Being out is the least fun state in any elimination game. A pick gives it a stake with no
// server and no message: you choose from the players still in, and the same elimination
// messages everyone already receives decide whether you were right.

export const BET_QUALIFIED = 1
export const BET_OUTRIGHT = 2

export class Bet {
  private slot = NaN
  private pick = ''

  choose(address: string, slot: number): void {
    // One pick per round; changing your mind is the thing this exists to stop.
    if (this.slot === slot && this.pick !== '') return
    this.slot = slot
    this.pick = address
  }

  picked(slot: number): string {
    return this.slot === slot ? this.pick : ''
  }

  /** Crowns owed at results, and why. Null if you did not pick this round. */
  resolve(slot: number, survivors: string[], outright: boolean): { crowns: number; label: string } | null {
    if (this.slot !== slot || this.pick === '') return null
    const pick = this.pick
    this.pick = ''
    if (!survivors.includes(pick)) return { crowns: 0, label: 'YOUR PICK LOST' }
    if (outright && survivors.length === 1) return { crowns: BET_OUTRIGHT, label: 'YOUR PICK WON OUTRIGHT' }
    return { crowns: BET_QUALIFIED, label: 'YOUR PICK QUALIFIED' }
  }
}
