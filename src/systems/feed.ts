// The scene's one Feed instance, plus the shorthand every caller uses.
//
// It lives here rather than in the scheduler so that any system - a round, the spectator, the
// crown tally - can post a line without importing the scheduler and creating a cycle.

import { Feed } from '../lib/feed'

export const feed = new Feed()

export function toast(text: string): void {
  feed.push(text, Date.now())
}
