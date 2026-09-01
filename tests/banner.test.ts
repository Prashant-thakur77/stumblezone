import { test } from 'node:test'
import assert from 'node:assert/strict'
import { resolveBanner, roundTag } from '../src/lib/banner.ts'

test('an eliminated player is never told they survived', () => {
  // Regression: Perfect Match printed "SURVIVED" for the whole tail of the round, to everyone,
  // including players who had already fallen out of it.
  const out = resolveBanner({
    out: true,
    spectatingOnly: false,
    banner: 'SURVIVED',
    subtitle: 'Hold on until the round ends'
  })
  assert.notEqual(out.banner, 'SURVIVED')
  assert.ok(!out.subtitle.includes('survived'))
  assert.ok(out.subtitle.toLowerCase().includes('eliminated'))
})

test('a mid-round joiner is told they are watching, not that they are out', () => {
  const out = resolveBanner({ out: true, spectatingOnly: true, banner: 'Wave 3 survived', subtitle: '' })
  assert.ok(out.subtitle.toLowerCase().includes('watching'))
  assert.ok(!out.subtitle.toLowerCase().includes('eliminated'))
})

test('a player still in the round sees exactly what the round wrote', () => {
  const input = { out: false, spectatingOnly: false, banner: 'STAND ON RED', subtitle: '3...' }
  const out = resolveBanner(input)
  assert.equal(out.banner, 'STAND ON RED')
  assert.equal(out.subtitle, '3...')
})

test('round tags read like a show card', () => {
  assert.equal(roundTag(0, false), 'ROUND 1  ·  SURVIVAL')
  assert.equal(roundTag(2, false), 'ROUND 3  ·  SURVIVAL')
  assert.equal(roundTag(3, true), 'FINAL ROUND')
})
