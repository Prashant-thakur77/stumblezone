import { test } from 'node:test'
import assert from 'node:assert/strict'
import { showIndex, actIndex, isFinale, roundIndex, showRounds } from '../src/lib/schedule.ts'
import { ROUND_COUNT, ROUND_POOL, ROUND_DIFFICULTY, FINALE_ROUND } from '../src/config.ts'

test('a show is exactly one pass through its four acts', () => {
  const first = showIndex(0)
  for (let i = 0; i < ROUND_COUNT; i++) {
    assert.equal(showIndex(i), first, `slot ${i} should still be show ${first}`)
  }
  assert.equal(showIndex(ROUND_COUNT), first + 1, 'the next slot starts a new show')
})

test('every show contains each act exactly once', () => {
  const acts = new Set<number>()
  for (let i = 0; i < ROUND_COUNT; i++) acts.add(actIndex(i))
  assert.equal(acts.size, ROUND_COUNT, 'a show must run every act once')
})

test('exactly one slot per show is the finale, and it is the last one', () => {
  let finales = 0
  for (let i = 0; i < ROUND_COUNT; i++) if (isFinale(i)) finales++
  assert.equal(finales, 1, 'a show has exactly one finale')
  assert.ok(isFinale(ROUND_COUNT - 1), 'the finale is the last act')
  assert.equal(roundIndex(ROUND_COUNT - 1), FINALE_ROUND)
})

test('show boundaries never fall mid-show for negative or large slots', () => {
  for (const slot of [-8, -1, 0, 7, 1_000_000, 14_638_333]) {
    const show = showIndex(slot)
    const act = actIndex(slot)
    assert.ok(Number.isInteger(show), `show ${show} not an integer at slot ${slot}`)
    assert.ok(act >= 0 && act < ROUND_COUNT, `act ${act} out of range at slot ${slot}`)
  }
})

test('every show draws three distinct pool rounds, easy to hard, ending in the finale round', () => {
  for (let show = 0; show < 50; show++) {
    const acts = showRounds(show)
    assert.equal(acts.length, ROUND_COUNT - 1)
    assert.equal(new Set(acts).size, acts.length, 'a show must not repeat a round')
    for (const id of acts) assert.ok((ROUND_POOL as readonly number[]).includes(id))
    for (let i = 1; i < acts.length; i++) {
      assert.ok(ROUND_DIFFICULTY[acts[i - 1]] <= ROUND_DIFFICULTY[acts[i]], 'acts must escalate')
    }
    for (let a = 0; a < ROUND_COUNT - 1; a++) {
      assert.equal(roundIndex(show * ROUND_COUNT + a), acts[a])
    }
    assert.equal(roundIndex(show * ROUND_COUNT + ROUND_COUNT - 1), FINALE_ROUND)
    assert.ok(isFinale(show * ROUND_COUNT + ROUND_COUNT - 1))
  }
})

test('shows differ from one another, and each draw is stable', () => {
  const draws = new Set<string>()
  for (let show = 0; show < 20; show++) draws.add(showRounds(show).join(','))
  assert.ok(draws.size >= 4, 'the draw must actually vary between shows')
  assert.deepEqual(showRounds(11), showRounds(11))
  assert.deepEqual(showRounds(-3), showRounds(-3))
  for (const id of showRounds(-3)) assert.ok((ROUND_POOL as readonly number[]).includes(id))
})
