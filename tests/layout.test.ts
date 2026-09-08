import { test } from 'node:test'
import assert from 'node:assert/strict'
import { centreCard, bottomBand, showsMeta, Phase, Centre, Band } from '../src/lib/layout'

const PHASES: Phase[] = ['card', 'countdown', 'play', 'results']

test('exactly one thing owns the centre, for every combination of flags', () => {
  const seen = new Set<Centre>()
  for (const phase of PHASES) {
    for (const welcome of [true, false]) {
      for (const roundClock of [0, 3, 5, 6, 40]) {
        for (const banner of [true, false]) {
          const c = centreCard({ phase, welcome, roundClock, banner })
          seen.add(c)
          // The welcome card never sits under anything, and never survives a live round.
          if (welcome && phase !== 'play') assert.equal(c, 'welcome')
          if (phase === 'play' && welcome) assert.notEqual(c, 'welcome')
          // The big numeral only exists in the last five seconds of play.
          if (c === 'last5') assert.ok(phase === 'play' && roundClock > 0 && roundClock <= 5)
        }
      }
    }
  }
  assert.deepEqual([...seen].sort(), ['card', 'countdown', 'last5', 'none', 'play', 'results', 'welcome'])
})

test('the play banner yields to the last five seconds', () => {
  assert.equal(centreCard({ phase: 'play', welcome: false, roundClock: 5, banner: true }), 'last5')
  assert.equal(centreCard({ phase: 'play', welcome: false, roundClock: 6, banner: true }), 'play')
  assert.equal(centreCard({ phase: 'play', welcome: false, roundClock: 6, banner: false }), 'none')
})

test('exactly one thing owns the bottom band, poses first', () => {
  const seen = new Set<Band>()
  for (const phase of PHASES) {
    for (const poses of [true, false]) {
      for (const shop of [true, false]) {
        for (const dance of [true, false]) {
          for (const out of [true, false]) {
            const b = bottomBand({ phase, poses, shop, dance, out })
            seen.add(b)
            if (poses) assert.equal(b, 'poses', 'a pose window has a deadline and outranks a place you stood in')
            // Neither panel opens over a live round.
            if (phase === 'play' && !poses) assert.notEqual(b, 'shop')
          }
        }
      }
    }
  }
  assert.deepEqual([...seen].sort(), ['none', 'poses', 'shop', 'spectator'])
})

test('the corners carry the meta only between rounds', () => {
  assert.equal(showsMeta('play'), false)
  for (const p of ['card', 'countdown', 'results'] as Phase[]) assert.equal(showsMeta(p), true)
})
