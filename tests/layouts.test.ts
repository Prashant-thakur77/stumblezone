import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  perfectMatchWave,
  tipToeFakes,
  sweeperWaves,
  effectiveTarget,
  tipToeGold,
  hexCrumble,
  SWITCH_SECONDS,
  PM_WAVE_COUNT
} from '../src/lib/layouts.ts'
import { PM_GRID, TIPTOE_WIDTH, TIPTOE_LENGTH, SWEEPER_COLUMNS } from '../src/config.ts'

test('perfectMatchWave is deterministic per seed and wave', () => {
  assert.deepEqual(perfectMatchWave(123, 0), perfectMatchWave(123, 0))
  assert.notDeepEqual(perfectMatchWave(123, 0).fruits, perfectMatchWave(123, 1).fruits)
  assert.notDeepEqual(perfectMatchWave(123, 0).fruits, perfectMatchWave(124, 0).fruits)
})

test('perfectMatchWave fills the grid and always leaves room to stand', () => {
  for (let seed = 0; seed < 400; seed++) {
    for (let wave = 0; wave < 3; wave++) {
      const w = perfectMatchWave(seed, wave)
      assert.equal(w.fruits.length, PM_GRID * PM_GRID)
      const safe = w.fruits.filter((f) => f === w.target).length
      assert.ok(safe >= 4, `seed ${seed} wave ${wave}: only ${safe} safe tiles`)
      for (const f of w.fruits) assert.ok(Number.isInteger(f) && f >= 0)
    }
  }
})

test('perfectMatchWave safe tiles are not all clustered in one corner', () => {
  // If the shuffle were skipped, the guaranteed safe tiles would sit at indices 0..3.
  let leadingRuns = 0
  for (let seed = 0; seed < 200; seed++) {
    const w = perfectMatchWave(seed, 0)
    if (w.fruits.slice(0, 4).every((f) => f === w.target)) leadingRuns++
  }
  assert.ok(leadingRuns < 10, `${leadingRuns}/200 boards put every safe tile at the start`)
})

test('perfectMatchWave memory time shortens each wave but stays readable on a phone', () => {
  const ms = [0, 1, 2].map((i) => perfectMatchWave(9, i).memoryMs)
  assert.ok(ms[0] > ms[1] && ms[1] > ms[2], `memory times not descending: ${ms}`)
  assert.ok(ms[2] >= 2000, 'never shorter than 2s — touch players need time to look')
})

test('tipToeFakes always leaves a walkable path to the far side', () => {
  // A seed producing an impassable bridge is an unwinnable round every client agrees on.
  for (let seed = 0; seed < 500; seed++) {
    const fakes = tipToeFakes(seed)
    assert.equal(fakes.length, TIPTOE_WIDTH * TIPTOE_LENGTH)

    let reachable = new Set<number>()
    for (let c = 0; c < TIPTOE_WIDTH; c++) if (!fakes[c]) reachable.add(c)
    assert.ok(reachable.size > 0, `seed ${seed}: first row is entirely fake`)

    for (let r = 1; r < TIPTOE_LENGTH; r++) {
      const next = new Set<number>()
      for (const c of reachable) {
        for (const d of [-1, 0, 1]) {
          const nc = c + d
          if (nc >= 0 && nc < TIPTOE_WIDTH && !fakes[r * TIPTOE_WIDTH + nc]) next.add(nc)
        }
      }
      reachable = next
      assert.ok(reachable.size > 0, `seed ${seed}: row ${r} is unreachable`)
    }
  }
})

test('tipToeFakes is deterministic and hides a meaningful share of tiles', () => {
  assert.deepEqual(tipToeFakes(31), tipToeFakes(31))
  let fake = 0
  let total = 0
  for (let seed = 0; seed < 200; seed++) {
    const f = tipToeFakes(seed)
    fake += f.filter(Boolean).length
    total += f.length
  }
  const ratio = fake / total
  assert.ok(ratio > 0.25 && ratio < 0.6, `fake ratio ${ratio.toFixed(2)} outside the fun range`)
})

test('sweeperWaves escalate and keep every gap on the board', () => {
  const waves = sweeperWaves(77)
  assert.deepEqual(waves, sweeperWaves(77))
  assert.ok(waves.length >= 3, 'a 75s round needs at least three waves')
  for (let i = 1; i < waves.length; i++) {
    assert.ok(waves[i].speed > waves[i - 1].speed, `wave ${i} is not faster than wave ${i - 1}`)
  }
  for (const w of waves) {
    assert.ok(w.gapCol >= 0 && w.gapCol < SWEEPER_COLUMNS, `gap ${w.gapCol} off the board`)
    assert.ok(w.speed > 0 && w.speed < 12, `speed ${w.speed} is not survivable on touch`)
  }
})

test('a switch wave keeps four safe tiles for both colours, and switches only late', () => {
  let switches = 0
  for (let seed = 1; seed < 200; seed++) {
    for (let w = 0; w < PM_WAVE_COUNT; w++) {
      const wave = perfectMatchWave(seed, w)
      if (wave.switchTo === undefined) continue
      switches++
      assert.ok(w >= 2, 'no switch before the third wave')
      assert.notEqual(wave.switchTo, wave.target)
      assert.ok(wave.fruits.filter((f) => f === wave.switchTo).length >= 4, 'switch colour needs safe tiles')
      assert.ok(wave.fruits.filter((f) => f === wave.target).length >= 4)
      assert.equal(effectiveTarget(wave, SWITCH_SECONDS + 0.1), wave.target)
      assert.equal(effectiveTarget(wave, SWITCH_SECONDS), wave.switchTo)
    }
  }
  assert.ok(switches > 50, 'switches should be common enough to matter: ' + switches)
})

test('the gold tile is a real tile past the first row', () => {
  for (let seed = 1; seed < 100; seed++) {
    const fakes = tipToeFakes(seed)
    const g = tipToeGold(seed, fakes)
    assert.ok(!fakes[g], 'gold on a fake tile')
    assert.ok(g >= TIPTOE_WIDTH, 'gold on the first row')
  }
})

test('the crumble takes about a third of the top deck, never all of it', () => {
  for (let seed = 1; seed < 50; seed++) {
    const c = hexCrumble(seed, 99)
    assert.ok(c.length > 15 && c.length < 55, 'crumble of ' + c.length)
    assert.deepEqual(c, hexCrumble(seed, 99))
  }
})
