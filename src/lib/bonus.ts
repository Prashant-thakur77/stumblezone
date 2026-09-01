// The three small payouts on top of qualifying.
//
// Each one exists to reward something the base rules ignore. CLUTCH pays for surviving on your last
// heart, so a bad round that you claw back is worth more than a clean one. COMEBACK pays for
// qualifying immediately after being knocked out, so falling early in a show is not the end of it.
// CROWD BONUS pays every survivor when the spectators drove the hype meter to the top - which is
// the only mechanism in the game where people who are *out* change what the people still in earn.

export const BONUS_CLUTCH = 1
export const BONUS_COMEBACK = 1
export const BONUS_CROWD = 1

export type BonusInput = {
  survived: boolean
  livesLeft: number
  wasOutLastRound: boolean
  crowdWentWild: boolean
  /** The round's crown multiplier - finale, Golden Show, or both. */
  stakes: number
}

export type Bonus = { label: string; crowns: number }

export function bonusesFor(input: BonusInput): Bonus[] {
  if (!input.survived) return []
  const out: Bonus[] = []
  if (input.livesLeft === 1) out.push({ label: 'CLUTCH', crowns: BONUS_CLUTCH * input.stakes })
  if (input.wasOutLastRound) out.push({ label: 'COMEBACK', crowns: BONUS_COMEBACK * input.stakes })
  if (input.crowdWentWild) out.push({ label: 'CROWD BONUS', crowns: BONUS_CROWD * input.stakes })
  return out
}
