// Hats: the thing you unlock by playing and wear where everyone can see it.
//
// Fall Guys' retention outside the rounds is costumes, and the reason it works is that a costume is
// a public record of something you did. Nothing here is bought - crowns stay a score - every hat is
// earned by a specific thing that happened in the show, and the condition is printed under the
// locked hat so a player knows what to go and do.

export type HatStats = { qualified: number; crowns: number; bestStreak: number; wins: number; finaleWins: number; fell: number; rushWins: number }

export type Hat = {
  id: string
  name: string
  model: string
  /** Scale applied to the model when worn. */
  scale: number
  /** Vertical offset from the head anchor, in metres, after scaling. */
  y: number
  /** The condition, as printed on the pedestal. */
  unlock: string
  unlocked(s: HatStats): boolean
}

export const HATS: Hat[] = [
  { id: 'cap', name: 'CAP', model: 'assets/Models/blau-blue-hat.glb', scale: 1.3, y: 0.32, unlock: 'Qualify once', unlocked: (s) => s.qualified >= 1 },
  { id: 'hardhat', name: 'HARD HAT', model: 'assets/Models/construction-hat-01.glb', scale: 1.1, y: 0.2, unlock: 'Fall three times', unlocked: (s) => s.fell >= 3 },
  { id: 'pumpkin', name: 'PUMPKIN', model: 'assets/Models/creepy-pumpkin-helmet.glb', scale: 1.1, y: 0.2, unlock: 'Earn 5 crowns', unlocked: (s) => s.crowns >= 5 },
  { id: 'wizard', name: 'WIZARD', model: 'assets/Models/v-01.glb', scale: 1.4, y: -1.75, unlock: 'Three in a row', unlocked: (s) => s.bestStreak >= 3 },
  { id: 'fox', name: 'FOX', model: 'assets/Models/asian-fox.glb', scale: 0.4, y: 0.05, unlock: 'Win a round outright', unlocked: (s) => s.wins >= 1 },
  { id: 'atari', name: 'ATARI', model: 'assets/Models/atari-hat.glb', scale: 0.5, y: 0.25, unlock: 'Win a show', unlocked: (s) => s.finaleWins >= 1 },
  { id: 'crown', name: 'CROWN', model: 'assets/Models/crown.glb', scale: 0.32, y: 0.18, unlock: 'Win Crown Rush', unlocked: (s) => s.rushWins >= 1 }
]

export function hatById(id: string): Hat | undefined {
  return HATS.find((h) => h.id === id)
}

export function unlockedHats(s: HatStats): Hat[] {
  return HATS.filter((h) => h.unlocked(s))
}
