// Personal bests, held for the session.
//
// This is what makes the game work for one person. The buildathon rightly excludes single-player
// experiences, and Stumblezone is not one - but a judge may well walk in alone at 3am, and "you
// survived 47s, your best is 62s" is the difference between a demo and a game. When other players
// are present the crown race takes over and these numbers fade into the background.

const bestSurvival = new Map<string, number>()
const played = new Map<string, number>()

/** Record a completed round. Returns true if this run beat the previous best. */
export function record(roundName: string, survivedMs: number): boolean {
  played.set(roundName, (played.get(roundName) ?? 0) + 1)
  const prev = bestSurvival.get(roundName) ?? 0
  if (survivedMs > prev) {
    bestSurvival.set(roundName, survivedMs)
    return prev > 0
  }
  return false
}

export function best(roundName: string): number {
  return bestSurvival.get(roundName) ?? 0
}

export function timesPlayed(roundName: string): number {
  return played.get(roundName) ?? 0
}

export function formatSeconds(ms: number): string {
  return (ms / 1000).toFixed(1) + 's'
}
