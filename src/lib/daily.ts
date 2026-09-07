// One small goal a day, worth three crowns.
//
// Everything else in this scene resets when you close the tab. The daily is the one thing that
// says "come back tomorrow and there is something new" without needing a server, an account or a
// single byte of storage: the challenge is a pure function of the UTC day, so every client shows
// the same one, and completing it pays out of the same session tally as everything else.

import { ROUND_NAMES } from '../config'

export const DAILY_CROWNS = 3

export type DailyKind = 'qualify' | 'first' | 'survive'
export type Daily = { id: number; text: string; roundId: number; kind: DailyKind }

/** Seven entries, so the same challenge lands on the same weekday - a rhythm people notice. */
const POOL: { roundId: number; kind: DailyKind }[] = [
  { roundId: 2, kind: 'first' },
  { roundId: 0, kind: 'qualify' },
  { roundId: 1, kind: 'survive' },
  { roundId: 4, kind: 'qualify' },
  { roundId: 5, kind: 'survive' },
  { roundId: 3, kind: 'qualify' },
  { roundId: 6, kind: 'qualify' }
]

export function dayIndex(nowMs: number): number {
  return Math.floor(nowMs / 86400000)
}

export function dailyFor(day: number): Daily {
  const id = ((day % POOL.length) + POOL.length) % POOL.length
  const entry = POOL[id]
  const name = ROUND_NAMES[entry.roundId]
  const text =
    entry.kind === 'first'
      ? 'Finish first in ' + name
      : entry.kind === 'survive'
        ? 'Last 60s in ' + name
        : 'Qualify in ' + name
  return { id, text, roundId: entry.roundId, kind: entry.kind }
}

export function dailyDone(
  daily: Daily,
  result: { roundId: number; survived: boolean; first: boolean; survivedMs: number }
): boolean {
  if (result.roundId !== daily.roundId) return false
  if (daily.kind === 'qualify') return result.survived
  if (daily.kind === 'first') return result.first
  // Surviving the whole round obviously clears a "last 60 seconds" goal too.
  return result.survived || result.survivedMs >= 60000
}
