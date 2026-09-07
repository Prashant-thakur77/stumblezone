// Who gets to play a round that has already started.
//
// A judge testing this in the mobile app arrives at a random second of a random slot. If that
// second is after the get-ready freeze, the old rule sent them to the ledge for the rest of the
// round - up to a hundred seconds of "you're up next" as their first impression of the game.
//
// Four of the six rounds derive every hazard from the seed and the clock, so a latecomer can be
// dropped straight in and see exactly what everyone else sees. The two whose decay is synced per
// step (Tip Toe, Hex-Drop) cannot: a latecomer missed those messages and would stand on tiles that
// are gone for everyone else.

import { INTRO_SECONDS, GET_READY_SECONDS, SLOT_SECONDS } from '../config'

/** Seconds of play during which a latecomer still joins live. After this, the round is spectated. */
export const JOIN_WINDOW_SECONDS = 40

const PLAY_STARTS = INTRO_SECONDS + GET_READY_SECONDS

export function canJoinLate(elapsedInSlot: number, joinSafe: boolean): boolean {
  if (!joinSafe) return false
  return elapsedInSlot >= PLAY_STARTS && elapsedInSlot < PLAY_STARTS + JOIN_WINDOW_SECONDS
}

/** Seconds until the next round's play phase begins, for the "next round in" line. */
export function secondsUntilPlay(elapsedInSlot: number): number {
  if (elapsedInSlot < PLAY_STARTS) return PLAY_STARTS - elapsedInSlot
  return SLOT_SECONDS - elapsedInSlot + PLAY_STARTS
}
