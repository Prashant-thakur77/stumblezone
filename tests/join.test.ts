import { test } from 'node:test'
import assert from 'node:assert/strict'
import { canJoinLate, secondsUntilPlay, JOIN_WINDOW_SECONDS } from '../src/lib/join'
import { INTRO_SECONDS, GET_READY_SECONDS, SLOT_SECONDS } from '../src/config'

const PLAY_STARTS = INTRO_SECONDS + GET_READY_SECONDS

test('during the intro nobody is late', () => {
  assert.equal(canJoinLate(0, true), false)
  assert.equal(canJoinLate(PLAY_STARTS - 0.1, false), false)
})

test('a join-safe round takes latecomers inside the window, and only then', () => {
  assert.equal(canJoinLate(PLAY_STARTS + 1, true), true)
  assert.equal(canJoinLate(PLAY_STARTS + JOIN_WINDOW_SECONDS - 0.1, true), true)
  assert.equal(canJoinLate(PLAY_STARTS + JOIN_WINDOW_SECONDS, true), false)
})

test('a round whose decay is synced per step never takes latecomers', () => {
  assert.equal(canJoinLate(PLAY_STARTS + 1, false), false)
})

test('the wait for the next round is never longer than a slot minus the join window', () => {
  // Worst case on a join-safe round: arriving the instant the window closes.
  const worst = secondsUntilPlay(PLAY_STARTS + JOIN_WINDOW_SECONDS)
  assert.equal(worst, SLOT_SECONDS - PLAY_STARTS - JOIN_WINDOW_SECONDS + PLAY_STARTS)
  assert.ok(worst <= 100, 'worst-case wait ' + worst + 's')
  assert.equal(secondsUntilPlay(0), PLAY_STARTS)
  assert.equal(secondsUntilPlay(SLOT_SECONDS - 1), 1 + PLAY_STARTS)
})
