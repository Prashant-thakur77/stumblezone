// The scheduler. Pure UTC math, no @dcl/sdk imports, no server, no network traffic.
//
// Every client independently computes which round is running, how far into it we are, and what
// seed drives its content. Two clients whose clocks agree to within a second agree on everything
// except at the instant of a slot boundary, which the get-ready freeze absorbs.

import {
  SLOT_SECONDS,
  ROUND_COUNT,
  INTRO_SECONDS,
  PLAY_SECONDS,
  ROUND_POOL,
  ROUND_DIFFICULTY,
  FINALE_ROUND
} from '../config'
import { hashSlot, mulberry32, shuffle } from './prng'

export type Phase = 'intro' | 'play' | 'results'

export function slotIndex(nowMs: number): number {
  return Math.floor(nowMs / 1000 / SLOT_SECONDS)
}

/** Seconds elapsed inside the current slot, in [0, SLOT_SECONDS). */
export function slotElapsed(nowMs: number): number {
  return nowMs / 1000 - slotIndex(nowMs) * SLOT_SECONDS
}

/**
 * The three pool rounds this show runs, in order, easiest first.
 *
 * Two people who show up an hour apart should not see the same four rounds in the same order, and
 * a judge who plays two shows back to back should see a different card the second time. The draw
 * is seeded by the show number, so every client agrees without a word passing between them.
 */
const drawn = new Map<number, number[]>()

export function showRounds(show: number): number[] {
  // Memoised: roundIndex is on the hot path (the scheduler asks for this show and the next every
  // frame of a finale, and the lobby board asks for three future slots twice a second), and a
  // shuffle allocates. A handful of shows is enough; older ones are dropped.
  const hit = drawn.get(show)
  if (hit) return hit
  const rng = mulberry32(hashSlot(show * 7919 + 31))
  const acts = shuffle(rng, ROUND_POOL as readonly number[])
    .slice(0, ROUND_COUNT - 1)
    .sort((a, b) => ROUND_DIFFICULTY[a] - ROUND_DIFFICULTY[b])
  drawn.set(show, acts)
  if (drawn.size > 8) drawn.delete(drawn.keys().next().value as number)
  return acts
}

/** Which round (an index into ROUND_NAMES) a slot runs. The finale is always the same round. */
export function roundIndex(slot: number): number {
  const act = actIndex(slot)
  return act === ROUND_COUNT - 1 ? FINALE_ROUND : showRounds(showIndex(slot))[act]
}

export function phaseAt(elapsed: number): { phase: Phase; remaining: number } {
  if (elapsed < INTRO_SECONDS) {
    return { phase: 'intro', remaining: INTRO_SECONDS - elapsed }
  }
  if (elapsed < INTRO_SECONDS + PLAY_SECONDS) {
    return { phase: 'play', remaining: INTRO_SECONDS + PLAY_SECONDS - elapsed }
  }
  return { phase: 'results', remaining: SLOT_SECONDS - elapsed }
}

/**
 * Which show a slot belongs to. Four rounds make one show, and a show has a champion.
 *
 * This is what turns a playlist of minigames into an evening's entertainment: Fall Guys' tension
 * comes from the arc across its rounds, not from any single round in isolation.
 */
export function showIndex(slot: number): number {
  return Math.floor(slot / ROUND_COUNT)
}

/** Which act of the show this slot is, 0-based. The last act is the finale. */
export function actIndex(slot: number): number {
  return ((slot % ROUND_COUNT) + ROUND_COUNT) % ROUND_COUNT
}

export function isFinale(slot: number): boolean {
  return actIndex(slot) === ROUND_COUNT - 1
}

/** How often the stakes double. Every fourth show is a Golden Show. */
export const GOLDEN_EVERY = 4

/**
 * A Golden Show pays double crowns for everything.
 *
 * It gives the schedule a shape beyond "the next round starts in 40 seconds": there is a reason to
 * still be here in twenty minutes, and a reason for the lobby to fill up before it starts.
 */
export function isGolden(show: number): boolean {
  return ((show % GOLDEN_EVERY) + GOLDEN_EVERY) % GOLDEN_EVERY === GOLDEN_EVERY - 1
}

/** Slots until the next Golden Show, or 0 during one. */
export function slotsUntilGolden(slot: number): number {
  const show = showIndex(slot)
  if (isGolden(show)) return 0
  const into = ((show % GOLDEN_EVERY) + GOLDEN_EVERY) % GOLDEN_EVERY
  const nextGoldenShow = show + (GOLDEN_EVERY - 1 - into)
  return nextGoldenShow * ROUND_COUNT - slot
}

export function seedForSlot(slot: number): number {
  return hashSlot(slot)
}
