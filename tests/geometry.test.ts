import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  sweeperWaves,
  perfectMatchSchedule,
  perfectMatchWaveSeconds,
  PM_WAVE_COUNT
} from '../src/lib/layouts.ts'
import {
  ARENA_CENTER_X,
  ARENA_CENTER_Z,
  ARENA_Y,
  HEX_LAYER_GAP,
  HEX_LAYERS,
  HEX_COLS,
  HEX_ROWS,
  HEX_TILE_SIZE,
  KILL_Y,
  LOBBY,
  LEDGE,
  TILE_SIZE,
  PM_GRID,
  TIPTOE_WIDTH,
  TIPTOE_LENGTH,
  SWEEPER_COLUMNS,
  PLAY_SECONDS,
  INTRO_SECONDS,
  RESULTS_SECONDS,
  GET_READY_SECONDS,
  GROUND_Y,
  CROWD_SPOTS,
  SEARCHLIGHT_SPOTS,
  SEARCHLIGHT_TARGET
} from '../src/config.ts'

/** The scene is 4x4 parcels. Anything outside these bounds silently fails to render. */
const SCENE_MIN = 0
const SCENE_MAX = 64
const TILE_GAP = 0.15

function gridExtent(count: number, size: number, centre: number): [number, number] {
  const pitch = size + TILE_GAP
  const half = ((count - 1) * pitch) / 2 + size / 2
  return [centre - half, centre + half]
}

function assertInBounds(name: string, [lo, hi]: [number, number]): void {
  assert.ok(lo >= SCENE_MIN, `${name} starts at ${lo.toFixed(1)}, outside the scene (min ${SCENE_MIN})`)
  assert.ok(hi <= SCENE_MAX, `${name} ends at ${hi.toFixed(1)}, outside the scene (max ${SCENE_MAX})`)
}

test('the fall has somewhere to go: ground below the kill plane, arena high above it', () => {
  // The drama of falling needs a visible ground you almost reach. GROUND_Y is the solid floor;
  // the kill plane must sit just above it, and the arena must be far above both.
  assert.ok(KILL_Y > GROUND_Y, 'kill plane must be above the solid ground, or players land and stand')
  assert.ok(KILL_Y - GROUND_Y <= 4, 'catch players close to the ground - almost landing is the point')
  assert.ok(ARENA_Y - KILL_Y >= 15, `only ${ARENA_Y - KILL_Y}m of fall - not enough to feel it`)
})

test('nothing exceeds the scene height limit', () => {
  // 16 parcels: log2(17) * 20 = ~81m.
  const MAX = Math.log2(17) * 20
  for (const [name, y] of [
    ['ledge', LEDGE.y],
    ['jumbotron', ARENA_Y + 13],
    ['pillar tops', 35],
    ['rainbow top', 38 + 27.4],
    ['searchlight target', SEARCHLIGHT_TARGET.y]
  ] as [string, number][]) {
    assert.ok(y < MAX - 2, `${name} at ${y}m is over the ${MAX.toFixed(0)}m cap`)
  }
})

test('the kill plane sits clear of every standable surface', () => {
  // Regression: KILL_Y was -1 and Hex-Drop's lower deck was also at -1, so simply standing on the
  // second layer was a coin flip between playing on and being eliminated.
  const lowestSurface = ARENA_Y - (HEX_LAYERS - 1) * HEX_LAYER_GAP
  assert.ok(
    lowestSurface - KILL_Y >= 3,
    `only ${lowestSurface - KILL_Y}m between the lowest standable surface (${lowestSurface}) and KILL_Y (${KILL_Y})`
  )
  assert.ok(LOBBY.y > KILL_Y, 'the lobby floor is below the kill plane')
  assert.ok(LEDGE.y > KILL_Y, 'the spectator ledge is below the kill plane')
})

test('every round fits inside the scene bounds', () => {
  assertInBounds('Perfect Match x', gridExtent(PM_GRID, TILE_SIZE, ARENA_CENTER_X))
  assertInBounds('Perfect Match z', gridExtent(PM_GRID, TILE_SIZE, ARENA_CENTER_Z))
  assertInBounds('Tip Toe x', gridExtent(TIPTOE_WIDTH, TILE_SIZE, ARENA_CENTER_X))

  // Tip Toe's bridge plus a 6m pad at each end.
  const [tz0, tz1] = gridExtent(TIPTOE_LENGTH, TILE_SIZE, ARENA_CENTER_Z)
  assertInBounds('Tip Toe z including pads', [tz0 - 6, tz1 + 6])

  // Staggered rows push odd rows half a pitch further in x.
  const hexPitch = HEX_TILE_SIZE + 0.35
  const [hx0, hx1] = gridExtent(HEX_COLS, HEX_TILE_SIZE, ARENA_CENTER_X)
  assertInBounds('Hex-Drop x including stagger', [hx0, hx1 + hexPitch / 2])
  assertInBounds('Hex-Drop z', gridExtent(HEX_ROWS, HEX_TILE_SIZE, ARENA_CENTER_Z))
  assertInBounds('Sweeper platform z', [ARENA_CENTER_Z - 15, ARENA_CENTER_Z + 15])
  assertInBounds('Lobby z', [LOBBY.z - 6, LOBBY.z + 6])
})

test('sweeper walls stay within touch reaction time', () => {
  // Regression: at 3.0 + 0.9 the last wave closed every 1.6s. A joystick player cannot read that.
  const AVATAR_WALK_SPEED = 2
  const PLATFORM_SIZE = 30
  const WALL_COUNT = 4
  const span = PLATFORM_SIZE + 6

  const waves = sweeperWaves(1234)
  for (const w of waves) {
    const secondsBetweenWalls = span / WALL_COUNT / w.speed
    assert.ok(
      secondsBetweenWalls >= 2,
      `walls arrive every ${secondsBetweenWalls.toFixed(1)}s at speed ${w.speed} - not reactable on touch`
    )
    // The gap must be crossable sideways in the time a wall takes to reach you.
    const gapWidth = PLATFORM_SIZE / SWEEPER_COLUMNS
    assert.ok(gapWidth >= AVATAR_WALK_SPEED, `gap of ${gapWidth}m is too narrow to aim for on a joystick`)
  }
})

test('Perfect Match gives enough time to cross the board after a colour is called', () => {
  // Regression: the call window was 3s, and the grid is 15m corner to corner. A player on the far
  // side physically could not reach a safe tile before the floor dropped.
  const CALL_SECONDS = 6
  const AVATAR_WALK_SPEED = 2
  const pitch = TILE_SIZE + TILE_GAP
  const boardWidth = (PM_GRID - 1) * pitch
  const worstCaseWalk = boardWidth / AVATAR_WALK_SPEED
  assert.ok(
    CALL_SECONDS >= worstCaseWalk * 0.45,
    `${CALL_SECONDS}s to cross ${boardWidth.toFixed(1)}m (needs ~${worstCaseWalk.toFixed(1)}s end to end)`
  )
})

test('a round leaves more of the cycle playable than waiting', () => {
  // 38% of every cycle used to be intro plus results. A judge who walks in wants to play, not read.
  const dead = INTRO_SECONDS + RESULTS_SECONDS
  const cycle = INTRO_SECONDS + PLAY_SECONDS + RESULTS_SECONDS
  assert.ok(dead / cycle < 0.32, `${((dead / cycle) * 100).toFixed(0)}% of the cycle is dead time`)
})

test('the Perfect Match wave schedule fills the play phase without overrunning it', () => {
  // Regression: three equal 28s slices left 51 of the round's 85 seconds showing a static board.
  const starts = perfectMatchSchedule()
  assert.equal(starts.length, PM_WAVE_COUNT)

  const total = starts[starts.length - 1] + perfectMatchWaveSeconds(PM_WAVE_COUNT - 1)
  assert.ok(total <= PLAY_SECONDS, `waves run ${total.toFixed(1)}s, longer than the ${PLAY_SECONDS}s play phase`)
  assert.ok(
    total > PLAY_SECONDS * 0.9,
    `waves only fill ${total.toFixed(1)}s of ${PLAY_SECONDS}s - the rest is dead air`
  )

  // Waves must get shorter, i.e. harder, as the round goes on.
  for (let i = 1; i < PM_WAVE_COUNT; i++) {
    assert.ok(
      perfectMatchWaveSeconds(i) <= perfectMatchWaveSeconds(i - 1),
      `wave ${i} is not at least as hard as wave ${i - 1}`
    )
  }
})

test('the get-ready freeze fits inside the play phase', () => {
  assert.ok(GET_READY_SECONDS > 0 && GET_READY_SECONDS < PLAY_SECONDS)
  assert.ok(INTRO_SECONDS > GET_READY_SECONDS, 'intro must be longer than the freeze that follows it')
})

test('the stadium dressing stays inside the parcels', () => {
  // Crowd clusters are ~4m across and searchlight bases ~5m, so anything closer than 2m to an
  // edge would hang over into the neighbour's parcel and be clipped by the client.
  for (const [name, spots] of [
    ['crowd', CROWD_SPOTS],
    ['searchlight', SEARCHLIGHT_SPOTS]
  ] as [string, { x: number; y: number; z: number }[]][]) {
    for (const s of spots) {
      assert.ok(s.x >= 2 && s.x <= 62, `${name} at x=${s.x.toFixed(1)} is on the parcel edge`)
      assert.ok(s.z >= 2 && s.z <= 62, `${name} at z=${s.z.toFixed(1)} is on the parcel edge`)
      assert.ok(s.y >= GROUND_Y && s.y < 81, `${name} at y=${s.y.toFixed(1)} is out of the world`)
    }
  }
  assert.equal(CROWD_SPOTS.length, 8)
  assert.equal(SEARCHLIGHT_SPOTS.length, 4)
})
