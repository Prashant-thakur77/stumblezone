// A word under your standing that says what kind of night you are having.
//
// Titles cost nothing to compute and give a player something to chase that is not a number: three
// rounds without falling makes you a SURVIVOR whether or not you are winning, and one finale win
// makes you a CHAMPION for the rest of the session.

export type TitleInput = { crowns: number; streak: number; finaleWins: number; villager?: boolean }

export function titleFor(s: TitleInput): string {
  // Most specific wins: a champion who is also on a streak is still a champion.
  if (s.finaleWins >= 1) return 'CHAMPION'
  if (s.streak >= 3) return 'SURVIVOR'
  // Every errand in the village done: earned by exploring, not by surviving.
  if (s.villager) return 'VILLAGER'
  if (s.crowns >= 10) return 'IRONFOOT'
  return 'PIONEER'
}
