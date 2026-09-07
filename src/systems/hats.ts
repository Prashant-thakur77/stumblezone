// What you wear, and telling everyone else.
//
// The hat is local state plus one bus message. Every client re-sends its own hat at each slot
// start, so someone who arrives later sees the whole room dressed within two minutes without any
// history on the bus.

import { emitWear, onWear, myAddress } from '../net/sync'
import { crownsFor } from '../net/crowns'
import { HATS, Hat, HatStats, unlockedHats } from '../lib/hats'
import { setHat } from './cosmetics'
import { session, finaleWinCount } from './records'
import { play } from './audio'
import { errandDone } from './errands'

let worn = ''

export function hatStats(): HatStats {
  const s = session.stats()
  return {
    qualified: s.qualified,
    crowns: crownsFor(myAddress()),
    bestStreak: s.bestStreak,
    wins: s.wins,
    finaleWins: finaleWinCount(),
    fell: s.fell
  }
}

/** One row per hat for the shop panel: what it is, whether you have it, how to get it. */
export function shopEntries(): { id: string; name: string; unlock: string; locked: boolean; wearing: boolean }[] {
  const have = new Set(unlockedHats(hatStats()).map((h) => h.id))
  return HATS.map((h: Hat) => ({ id: h.id, name: h.name, unlock: h.unlock, locked: !have.has(h.id), wearing: worn === h.id }))
}

/** Wear a hat you have earned, or '' for none. Silently ignores hats you have not. */
export function wearHat(id: string): void {
  if (id !== '' && !unlockedHats(hatStats()).some((h) => h.id === id)) return
  worn = id
  setHat(myAddress(), id, true)
  emitWear(id)
  if (id !== '') {
    play('boing')
    errandDone('hat')
  }
}

/** Re-send the hat, for latecomers. Called at every slot start. */
export function announceHat(): void {
  if (worn !== '') emitWear(worn)
}

export function initHats(): void {
  onWear((p) => setHat(p.address, p.hat, false))
}
