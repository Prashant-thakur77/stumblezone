import { test } from 'node:test'
import assert from 'node:assert/strict'
import { hashSlot, mulberry32, pick, shuffle } from '../src/lib/prng.ts'

test('hashSlot is deterministic and collision-free over consecutive slots', () => {
  assert.equal(hashSlot(1000), hashSlot(1000))
  assert.notEqual(hashSlot(1000), hashSlot(1001))
  const seen = new Set<number>()
  for (let i = 0; i < 5000; i++) seen.add(hashSlot(i))
  assert.equal(seen.size, 5000, 'no collisions over 5000 consecutive slots')
})

test('hashSlot returns a uint32', () => {
  for (let i = 0; i < 1000; i++) {
    const h = hashSlot(i)
    assert.ok(Number.isInteger(h) && h >= 0 && h <= 0xffffffff, `bad hash ${h} for slot ${i}`)
  }
})

test('hashSlot spreads adjacent slots far apart', () => {
  // Adjacent slots must not produce adjacent seeds, or consecutive rounds feel similar.
  for (let i = 0; i < 500; i++) {
    const d = Math.abs(hashSlot(i) - hashSlot(i + 1))
    assert.ok(d > 1000, `slots ${i} and ${i + 1} hash too close (delta ${d})`)
  }
})

test('mulberry32 is deterministic for a seed', () => {
  const a = mulberry32(42)
  const b = mulberry32(42)
  for (let i = 0; i < 100; i++) assert.equal(a(), b())
})

test('mulberry32 stays in [0,1) and is roughly uniform', () => {
  const rng = mulberry32(7)
  let sum = 0
  for (let i = 0; i < 100000; i++) {
    const v = rng()
    assert.ok(v >= 0 && v < 1, `out of range: ${v}`)
    sum += v
  }
  assert.ok(Math.abs(sum / 100000 - 0.5) < 0.01, `mean ${sum / 100000} is not uniform`)
})

test('shuffle is a permutation, seed-stable, and does not mutate its input', () => {
  const src = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
  const one = shuffle(mulberry32(3), src)
  const two = shuffle(mulberry32(3), src)
  assert.deepEqual(one, two)
  assert.deepEqual([...one].sort((a, b) => a - b), src)
  assert.deepEqual(src, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], 'input was mutated')
})

test('pick stays inside the array', () => {
  const rng = mulberry32(11)
  const arr = ['a', 'b', 'c']
  for (let i = 0; i < 1000; i++) assert.ok(arr.includes(pick(rng, arr)))
})
