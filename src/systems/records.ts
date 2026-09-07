// Personal bests, held for the session.
//
// This is what makes the game work for one person. The buildathon rightly excludes single-player
// experiences, and Stumblezone is not one - but a judge may well walk in alone at 3am, and "you
// survived 47s, your best is 62s" is the difference between a demo and a game. When other players
// are present the crown race takes over and these numbers fade into the background.

const bestSurvival = new Map<string, number>()
const played = new Map<string, number>()

/** Record a completed round. Returns true if this run beat the previous best. */
import { Session } from '../lib/session'

/** What this visit adds up to. Lives here so the hats and the scheduler share one copy. */
export const session = new Session()

/** Finale wins this session. One is enough to be a CHAMPION for the rest of the night. */
let finaleWins = 0

export function recordFinaleWin(): void {
  finaleWins += 1
}

export function finaleWinCount(): number {
  return finaleWins
}

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

/** Fastest Stumble Tower climb this session, in ms. Zero until someone reaches the top. */
let towerBestMs = 0

/** Returns true if this climb is the new best. */
export function recordTower(ms: number): boolean {
  if (towerBestMs !== 0 && ms >= towerBestMs) return false
  towerBestMs = ms
  return true
}

export function towerBest(): number {
  return towerBestMs
}

/** Fastest Speed Lap this session, in ms. */
let lapBestMs = 0

export function recordLap(ms: number): boolean {
  if (lapBestMs !== 0 && ms >= lapBestMs) return false
  lapBestMs = ms
  return true
}

export function lapBest(): number {
  return lapBestMs
}
