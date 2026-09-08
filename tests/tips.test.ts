import { test } from 'node:test'
import assert from 'node:assert/strict'
import { tipAt, tipLines } from '../src/lib/tips'

const base = { nextRound: 'Spotlight', inSeconds: 42, daily: 'Qualify in Tip Toe', errand: null, nextHat: 'CAP', crowns: 0 }

test('the schedule line reads as a clock', () => {
  assert.equal(tipLines(base)[0], 'Spotlight in 0:42. Be in the arena for the whistle.')
})

test('never the same line twice in a row, and the errand comes round every other tick', () => {
  const s = { ...base, errand: 'run a Speed Lap' }
  let prev = ''
  for (let i = 0; i < 20; i++) {
    const line = tipAt(s, i)
    assert.notEqual(line, prev, 'repeat at tick ' + i)
    if (i % 2 === 0) assert.ok(line.startsWith('Errand:'))
    prev = line
  }
})

test('with no errand left the lines simply rotate', () => {
  const seen = new Set<string>()
  for (let i = 0; i < 6; i++) seen.add(tipAt(base, i))
  assert.equal(seen.size, tipLines(base).length)
})

test('the schedule line carries the twist when the round has one', () => {
  assert.equal(tipLines({ ...base, twist: 'Blackout at 60s' })[0], 'Spotlight in 0:42. Blackout at 60s.')
})

test('a newcomer is pointed at the practice yard first', () => {
  assert.match(tipLines({ ...base, newcomer: true })[0], /Practice Yard/)
  assert.ok(!tipLines(base).some((l) => /Practice Yard/.test(l)))
})
