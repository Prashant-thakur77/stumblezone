import { test } from 'node:test'
import assert from 'node:assert/strict'
import { HATS, hatById, unlockedHats } from '../src/lib/hats'
import { dailyStars, StarHunt, STAR_CROWNS, STAR_HUNT_BONUS } from '../src/lib/stars'
import { VILLAGE_FLOOR, HAT_PEDESTALS, DISCO_DECK, DISCO_TILES, DISCO_TILE_SIZE, STAR_SPOTS, STARS_PER_DAY, LOBBY, KILL_Y } from '../src/config'

const none = { qualified: 0, crowns: 0, bestStreak: 0, wins: 0, finaleWins: 0, fell: 0 }

test('a new player has no hats; each hat has exactly one thing that unlocks it', () => {
  assert.deepEqual(unlockedHats(none), [])
  assert.equal(new Set(HATS.map((h) => h.id)).size, HATS.length)
  assert.deepEqual(unlockedHats({ ...none, qualified: 1 }).map((h) => h.id), ['cap'])
  assert.deepEqual(unlockedHats({ ...none, fell: 3 }).map((h) => h.id), ['hardhat'])
  assert.deepEqual(unlockedHats({ ...none, crowns: 5 }).map((h) => h.id), ['pumpkin'])
  assert.deepEqual(unlockedHats({ ...none, bestStreak: 3 }).map((h) => h.id), ['wizard'])
  assert.deepEqual(unlockedHats({ ...none, wins: 1 }).map((h) => h.id), ['fox'])
  assert.deepEqual(unlockedHats({ ...none, finaleWins: 1 }).map((h) => h.id), ['atari'])
  assert.equal(hatById('nope'), undefined)
  assert.equal(hatById('cap')?.name, 'CAP')
})

test('there is a pedestal for every hat, inside the village', () => {
  assert.equal(HAT_PEDESTALS.length, HATS.length)
  for (const p of HAT_PEDESTALS) {
    assert.ok(p.x > 1 && p.x < VILLAGE_FLOOR.width - 1)
    assert.ok(p.z > 0 && p.z < VILLAGE_FLOOR.depth)
  }
})

test('five stars a day, all on real spots, different from day to day, stable within a day', () => {
  for (let day = 0; day < 30; day++) {
    const s = dailyStars(day)
    assert.equal(s.length, STARS_PER_DAY)
    assert.equal(new Set(s).size, STARS_PER_DAY)
    for (const i of s) assert.ok(STAR_SPOTS[i] !== undefined)
  }
  assert.deepEqual(dailyStars(4), dailyStars(4))
  const days = new Set([0, 1, 2, 3, 4, 5, 6].map((d) => dailyStars(d).join(',')))
  assert.ok(days.size >= 4)
})

test('a star counts once, only if lit today, and the hunt resets at midnight', () => {
  const h = new StarHunt()
  const day = 12
  const lit = dailyStars(day)
  const unlit = STAR_SPOTS.map((_, i) => i).find((i) => !lit.includes(i)) as number
  assert.equal(h.collect(unlit, day), false)
  assert.equal(h.collect(lit[0], day), true)
  assert.equal(h.collect(lit[0], day), false)
  assert.equal(h.count(day), 1)
  for (const i of lit) h.collect(i, day)
  assert.ok(h.complete(day))
  assert.equal(h.count(day + 1), 0)
  assert.equal(STAR_CROWNS, 1)
  assert.equal(STAR_HUNT_BONUS, 3)
})

test('the village sits inside the scene, above the kill plane, and the disco fits its district', () => {
  assert.equal(VILLAGE_FLOOR.x - VILLAGE_FLOOR.width / 2, 0)
  assert.equal(VILLAGE_FLOOR.x + VILLAGE_FLOOR.width / 2, 64)
  assert.ok(VILLAGE_FLOOR.z + VILLAGE_FLOOR.depth / 2 <= 18)
  assert.ok(LOBBY.y > KILL_Y + 5)
  const half = (DISCO_TILES * DISCO_TILE_SIZE) / 2
  assert.ok(DISCO_DECK.x - half > VILLAGE_FLOOR.x + 12, 'the disco must not overlap the lobby')
  assert.ok(DISCO_DECK.x + half < 64)
  for (const s of STAR_SPOTS) {
    assert.ok(s.x >= 1 && s.x <= 63 && s.z >= 0.5 && s.z <= VILLAGE_FLOOR.depth)
  }
})

// Footprints of the village buildings as placed in src/arena/village.ts, from the pivots measured
// with tools/measure-glb.mjs. A building through the floor edge or over a star is invisible in
// the desktop preview until you walk into it on a phone.
const BUILDINGS: { name: string; x: [number, number]; z: [number, number] }[] = [
  { name: 'yellow house', x: [12.2 - 9.14, 12.2 + 0.24], z: [6.1 - 6.14, 6.1 + 0.15] },
  { name: 'cabin 3', x: [50 - 7.32, 50 - 2.04], z: [3.8 - 4.01, 3.8 + 2.3] },
  { name: 'cabin 2', x: [62 - 5.83, 62 - 2.57], z: [2.5 - 1.56, 2.5 + 1.56] },
  { name: 'shop', x: [11 - 4.55, 11 + 4.55], z: [15 - 3.06, 15 + 3.06] }
]

test('every building stands on the village floor', () => {
  for (const b of BUILDINGS) {
    assert.ok(b.x[0] >= 0 && b.x[1] <= 64, b.name + ' leaves the scene in x')
    assert.ok(b.z[0] >= -0.3 && b.z[1] <= VILLAGE_FLOOR.depth + 0.3, b.name + ' leaves the floor in z')
  }
})

test('no star hides inside a building or on a pedestal', () => {
  for (const s of STAR_SPOTS) {
    for (const b of BUILDINGS) {
      const inside = s.x > b.x[0] && s.x < b.x[1] && s.z > b.z[0] && s.z < b.z[1]
      assert.ok(!inside, 'star at ' + s.x + ',' + s.z + ' is inside the ' + b.name)
    }
    for (const p of HAT_PEDESTALS) assert.ok(Math.hypot(s.x - p.x, s.z - p.z) > 1.5)
  }
})
