// The scheduler. Pure UTC math, no @dcl/sdk imports, no server, no network traffic.
//
// Every client independently computes which round is running, how far into it we are, and what
// seed drives its content. Two clients whose clocks agree to within a second agree on everything
// except at the instant of a slot boundary, which the get-ready freeze absorbs.

import { SLOT_SECONDS, ROUND_COUNT, INTRO_SECONDS, PLAY_SECONDS } from '../config'
import { hashSlot } from './prng'

export type Phase = 'intro' | 'play' | 'results'

export function slotIndex(nowMs: number): number {
  return Math.floor(nowMs / 1000 / SLOT_SECONDS)
}

/** Seconds elapsed inside the current slot, in [0, SLOT_SECONDS). */
export function slotElapsed(nowMs: number): number {
  return nowMs / 1000 - slotIndex(nowMs) * SLOT_SECONDS
}

/** Which round a slot runs. The double-modulo keeps pre-epoch slot numbers in range. */
export function roundIndex(slot: number): number {
  return ((slot % ROUND_COUNT) + ROUND_COUNT) % ROUND_COUNT
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
  return roundIndex(slot)
}

export function isFinale(slot: number): boolean {
  return roundIndex(slot) === ROUND_COUNT - 1
}

export function seedForSlot(slot: number): number {
  return hashSlot(slot)
}
