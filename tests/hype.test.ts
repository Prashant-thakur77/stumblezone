import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Hype, HYPE_CHEERS, HYPE_WINDOW_MS, HYPE_COOLDOWN_MS } from '../src/lib/hype'

test('level climbs with cheers inside the window and decays after it', () => {
  const h = new Hype()
  assert.equal(h.level(0), 0)
  h.cheer(0)
  h.cheer(100)
  assert.equal(h.level(200), 2 / HYPE_CHEERS)
  assert.equal(h.level(HYPE_WINDOW_MS + 200), 0)
})

test('five cheers in ten seconds goes wild exactly once until the cooldown passes', () => {
  const h = new Hype()
  for (let i = 0; i < HYPE_CHEERS; i++) h.cheer(i * 500)
  assert.equal(h.consumeWild(3000), true)
  assert.equal(h.consumeWild(3001), false)
  h.cheer(3100)
  assert.equal(h.consumeWild(3200), false)
  for (let i = 0; i < HYPE_CHEERS; i++) h.cheer(3000 + HYPE_COOLDOWN_MS + i * 100)
  assert.equal(h.consumeWild(3000 + HYPE_COOLDOWN_MS + 1000), true)
})
