// Session crown tally.
//
// Crowns live only as long as someone is in the scene (ARCHITECTURE.md Layer 2, Option C).
// Cross-session persistence is a post-submission upgrade and deliberately not a dependency:
// a dead backend must never stop the game from running.

import { emitStandings, onStandings, onStandingsRequested, requestStandings } from './sync'

/** Crowns awarded per outcome. */
export const CROWN_SURVIVE = 1
export const CROWN_TOP3 = 2
export const CROWN_WIN = 4
export const CROWN_FIRST_FINISHER = 1

const crowns = new Map<string, number>()
/** Display names, so the board shows something friendlier than an address. */
const names = new Map<string, string>()

export function award(address: string, amount: number): void {
  crowns.set(address, (crowns.get(address) ?? 0) + amount)
}

export function setName(address: string, name: string): void {
  if (name) names.set(address, name)
}

export function displayName(address: string): string {
  const n = names.get(address)
  if (n) return n
  if (address.startsWith('guest-')) return 'Guest ' + address.slice(6, 10)
  return address.slice(0, 6) + '...' + address.slice(-4)
}

export function crownsFor(address: string): number {
  return crowns.get(address) ?? 0
}

/** Highest first. Ties broken by address so every client renders the same order. */
export function standings(limit = 10): { address: string; crowns: number }[] {
  return Array.from(crowns.entries())
    .map(([address, c]) => ({ address, crowns: c }))
    .sort((a, b) => (b.crowns - a.crowns) || a.address.localeCompare(b.address))
    .slice(0, limit)
}

export function totalPlayers(): number {
  return crowns.size
}

/**
 * Merge a peer's tally into ours, taking the higher count per player.
 *
 * Two clients that both witnessed a round agree already; max() is the safe reconciliation when
 * one of them missed events while loading, and it can never double-count.
 */
export function mergeStandings(incoming: [string, number][]): void {
  for (const [address, count] of incoming) {
    if (count > (crowns.get(address) ?? 0)) crowns.set(address, count)
  }
}

export function setupCrownSync(): void {
  onStandings((p) => mergeStandings(p.crowns))
  onStandingsRequested(() => {
    // Only answer if we actually have something to share, so an empty scene stays quiet.
    if (crowns.size > 0) emitStandings(Array.from(crowns.entries()))
  })
  requestStandings()
}
