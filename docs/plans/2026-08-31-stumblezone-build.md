# Stumblezone Implementation Plan


**Goal:** Ship a live, mobile-first, auto-cycling 4-round Fall Guys-style gauntlet in a Decentraland World, deployed and publicly playable before Sep 4 2026 and stable through the Sep 5–11 judging window.

**Architecture:** Serverless-first. The round schedule is pure UTC math computed identically on every client (no backend); everything random derives from `seed = hash(slot)` through a seeded PRNG; only player-caused events cross the wire via the scene message bus. Four rounds are thin configs over one shared tile system. Persistence (crowns across sessions) is an optional layer added only if days remain.

**Tech Stack:** Decentraland SDK7 (`@dcl/sdk`), TypeScript, Node 20.19.6, `@dcl/sdk-commands` CLI, `node --test` + `tsx` for pure-logic unit tests, Kenney/OpenDCL CC0 assets.

**Spec:** [docs/BRIEF.md](../../BRIEF.md) and [docs/ARCHITECTURE.md](../../ARCHITECTURE.md)

---

## Global Constraints

Copied verbatim from the spec and from the SDK docs verified live on 2026-08-31.

- **Deadline:** submission Sep 4, extended Sep 11. World must be publicly accessible Sep 5–11 continuously.
- **Eligibility:** scene deployed in a Decentraland World; meaningful social interaction; persistent standalone (no host); designed and tested for mobile; open source public GitHub repo; submitted via DoraHacks. *"Empty venues and single-player experiences without a meaningful social component are not eligible."*
- **Node version:** 20 or later (have: v20.19.6).
- **Mobile hard limits** (scene fails to load above these): 1,200,000 triangles · 6,000 entities · 3,000 meshes · 2,000 geometries · 500 materials · 500 textures · 1,500 colliders · 150 MB content · 2,048 MB RSS · 2,000 draw calls.
- **Mobile soft limits** (warning): 1,000,000 tris · 4,800 entities · 2,400 meshes · 1,000 geometries · 400 materials · 400 textures · 1,200 colliders · 120 MB content · 1,000 draw calls.
- **Mobile performance target:** Performance score **above 90% on the High graphic profile**, tested on a mid-spec device (Samsung Galaxy A54 class).
- **Mobile input:** touch only. No hover, no keyboard, no right-click, **no gestures**. Bind key actions only to `IA_POINTER`, `IA_PRIMARY` (E), `IA_SECONDARY` (F), `IA_JUMP` (largest, most reachable button), or proximity triggers. **Never** bind gameplay to `IA_ACTION_3`–`IA_ACTION_6` — they hide behind a secondary menu.
- **Proximity voice chat does NOT exist on the mobile client.** No ETA. Every social feature must work through text chat, emotes, and in-scene UI.
- **`LightSource` (scene dynamic lights) is not on mobile** until v1.13.0 (Sept 2026). Do not depend on it.
- **`MessageBus` is flagged deprecated in the SDK.** It still works and is the right tool for ephemeral events; it must be used only through the `src/net/sync.ts` wrapper so it can be swapped in one file.
- **`syncEntity` must be called inside or after `main()`**, never at module top level.
- **`syncEntity` enum ids must be below 8001.**
- **ENS-based World:** 36 MB storage cap, up to 100 concurrent users. NAME-based World: 100 MB per NAME.
- **Deploys take 30–60 minutes** to convert before being reliably playable. The final deploy is not the last thing you do.

---

## Decisions locked before Task 1

These resolve open questions in the spec. Each is a one-line change if reversed.

1. **Cycle is `slot % 4`, not `slot % 5`.** ARCHITECTURE.md §1 spends a whole 120-second slot on a lobby break. That is two minutes of dead air every cycle, and a judge who walks in at the wrong moment stares at an empty arena. Instead each slot contains its own lobby: **30s intro/countdown + 75s play + 15s results**, and `ROUND_COUNT = 4` gives an 8-minute cycle with a round starting every 2 minutes. Worst-case wait for *any* round: 30 seconds. Worst-case wait for a *specific* round: 8 minutes. `ROUND_COUNT` stays a constant in `config.ts`, so reverting to a 5th break slot is one number.
2. **Solo mode is 3 lives per round**, not score attack. BRIEF says both in different places. Lives are the same mechanic as multiplayer elimination with a counter in front of it, so it costs no extra system. Ghost times land on the boards separately.
3. **Crowns are session-scoped for the submission** (ARCHITECTURE.md Layer 2 Option C). Cross-session persistence is Day 6+ work inside the judging window, never a blocker for the deploy.
4. **Guests earn crowns.** Session crowns are keyed on the address the explorer reports; no signing, no wallet gate. Revisit only if Layer 2 ships.
5. **Mobile testing starts Day 1, not Phase 6.** `npm run start -- --mobile` prints a QR that opens the scene on a phone on the same Wi-Fi. Mobile-first is judging criterion #1; it cannot be a pass at the end.
6. **Social replaces voice with text + emotes.** Proximity voice does not exist on mobile, so the spectator ledge's "heckle in voice" pillar is dead. Replaced by: a cheer button on the spectator HUD that fires `triggerEmote` on your own avatar and broadcasts a `cheer` event, plus a live "who's still in" list, plus the podium emote moment. Text chat is platform-free.

---

## File Structure

```
scene.json              # worldConfiguration, spawnPoints, title, thumbnail, rating
package.json            # @dcl/sdk, dev-dep tsx for tests
src/
  index.ts              # main(): build arena once, register systems
  config.ts             # every tuning constant, one file
  lib/                  # PURE. No DCL imports. Unit-tested.
    prng.ts             # hashSlot(), mulberry32()
    schedule.ts         # slotIndex(), slotElapsed(), roundIndex(), phaseAt()
    layouts.ts          # seeded per-round layouts
  arena/
    tiles.ts            # pooled tile grid: spawn once, show/hide/sink/reset
    lobby.ts            # spawn area, boards, podium, onboarding sign
    rounds/
      types.ts          # Round interface all four implement
      perfectMatch.ts
      hexDrop.ts
      sweeper.ts
      tipToe.ts
  net/
    sync.ts             # typed MessageBus wrapper: the ONLY file importing message-bus
    crowns.ts           # session crown tally + standings
  systems/
    scheduler.ts        # drives phase transitions, calls round.start/tick/stop
    spectator.ts        # eliminate(), ledge teleport, revive at next slot
  ui/
    hud.tsx             # countdown, round banner, lives, cheer button
    boards.tsx          # in-world text boards
tests/
  prng.test.ts
  schedule.test.ts
  layouts.test.ts
```

**Import style:** inside `src/`, import extensionless (`'../config'`) — the DCL tsconfig rejects `.ts` specifiers. Inside `tests/`, import with the `.ts` extension (`'../src/lib/prng.ts'`) — those files are outside the scene build and tsx resolves them directly.

`src/lib/` is pure TypeScript with zero `@dcl/sdk` imports. That is deliberate: it is the only code where a bug is invisible until a live round breaks, and it is the only code that can be unit-tested without an explorer. Everything else is verified by preview.

---

## Day 1 (Aug 31) — Foundations and a live World

### Task 1: Scaffold, deploy a cube, open it on a phone

**Blocked on:** a Decentraland NAME or ENS domain, and a deploy wallet. If neither exists, do Task 2 first and come back — but this is the longest-lead item in the whole plan, so start the NAME/ENS acquisition in parallel today.

**Files:**
- Create: whole scene skeleton via CLI
- Modify: `scene.json`
- Create: `.gitignore`, `README.md` stub

- [ ] **Step 1: Install the official SDK skills before writing any code**

```bash
cd /home/prashant/stumblezone
npx skills add decentraland/sdk-skills
```

- [ ] **Step 2: Scaffold the scene into the repo root**

```bash
npx @dcl/sdk-commands init --project scene-template
```

Expected: `scene.json`, `package.json`, `tsconfig.json`, `src/index.ts` appear. The repo already has `docs/`; the init must not clobber it — if it refuses to run on a non-empty folder, init into `/tmp/.../scaffold` and copy the files in.

- [ ] **Step 3: Run the preview on desktop**

```bash
npm run start
```

Expected: an explorer window opens with the default scene.

- [ ] **Step 4: Run the preview on your phone**

```bash
npm run start -- --mobile
```

Expected: a QR code in the terminal. Scan it with the phone on the same Wi-Fi; the scene opens in the Decentraland mobile app. **If this step does not work, stop and fix it before anything else** — the entire plan assumes a sub-minute mobile feedback loop.

- [ ] **Step 5: Configure `scene.json` for the World**

```json
{
  "worldConfiguration": { "name": "YOURNAME.dcl.eth" },
  "display": {
    "title": "Stumblezone",
    "description": "A four-round party gauntlet that never stops. Walk in, survive, win crowns.",
    "navmapThumbnail": "images/thumbnail.png"
  },
  "spawnPoints": [
    { "name": "lobby", "default": true,
      "position": { "x": [24, 40], "y": [1], "z": [4, 8] },
      "cameraTarget": { "x": 32, "y": 2, "z": 32 } }
  ],
  "policy": { "rating": "E" }
}
```

The spawn `position` uses ranges so a crowd arriving at once does not stack on one point.

- [ ] **Step 6: Deploy to the World and open it from the phone**

```bash
npm run deploy -- --target-content https://worlds-content-server.decentraland.org
```

Then in the mobile app chatbox: `/goto YOURNAME.dcl.eth`. Allow 30–60 minutes for conversion.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "chore: scaffold SDK7 scene, deploy to World"
```

**Done when:** you have walked the default scene in the live World on your own phone.

---

### Task 2: Pure-logic test harness

**Files:**
- Modify: `package.json`
- Create: `tests/.gitkeep`

**Interfaces:**
- Produces: `npm test` runs every `tests/*.test.ts` against `src/lib/`.

- [ ] **Step 1: Add the test runner**

```bash
npm i -D tsx
```

- [ ] **Step 2: Add the script to `package.json`**

```json
"scripts": {
  "test": "node --import tsx --test tests/*.test.ts"
}
```

- [ ] **Step 3: Verify the runner works with a throwaway test**

```ts
// tests/smoke.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
test('runner works', () => { assert.equal(1 + 1, 2) })
```

Run: `npm test` — Expected: `pass 1`.

- [ ] **Step 4: Delete the throwaway and commit**

```bash
rm tests/smoke.test.ts
git add -A && git commit -m "chore: add tsx test runner for pure logic"
```

---

### Task 3: Seeded PRNG

**Files:**
- Create: `src/lib/prng.ts`
- Test: `tests/prng.test.ts`

**Interfaces:**
- Produces: `hashSlot(slot: number): number` (uint32), `mulberry32(seed: number): () => number` (floats in `[0,1)`), `pick<T>(rng, arr): T`, `shuffle<T>(rng, arr): T[]`.

- [ ] **Step 1: Write the failing tests**

```ts
// tests/prng.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { hashSlot, mulberry32, shuffle } from '../src/lib/prng.ts'

test('hashSlot is deterministic and well-spread', () => {
  assert.equal(hashSlot(1000), hashSlot(1000))
  assert.notEqual(hashSlot(1000), hashSlot(1001))
  const seen = new Set<number>()
  for (let i = 0; i < 5000; i++) seen.add(hashSlot(i))
  assert.equal(seen.size, 5000, 'no collisions over 5000 consecutive slots')
})

test('hashSlot returns a uint32', () => {
  for (let i = 0; i < 1000; i++) {
    const h = hashSlot(i)
    assert.ok(Number.isInteger(h) && h >= 0 && h <= 0xffffffff)
  }
})

test('mulberry32 is deterministic for a seed', () => {
  const a = mulberry32(42), b = mulberry32(42)
  for (let i = 0; i < 100; i++) assert.equal(a(), b())
})

test('mulberry32 stays in [0,1) and is roughly uniform', () => {
  const rng = mulberry32(7)
  let sum = 0
  for (let i = 0; i < 100000; i++) {
    const v = rng()
    assert.ok(v >= 0 && v < 1)
    sum += v
  }
  assert.ok(Math.abs(sum / 100000 - 0.5) < 0.01)
})

test('shuffle is a permutation and is seed-stable', () => {
  const src = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
  const one = shuffle(mulberry32(3), src)
  const two = shuffle(mulberry32(3), src)
  assert.deepEqual(one, two)
  assert.deepEqual([...one].sort((a, b) => a - b), src)
  assert.deepEqual(src, [0,1,2,3,4,5,6,7,8,9], 'input not mutated')
})
```

- [ ] **Step 2: Run to verify they fail**

Run: `npm test` — Expected: FAIL, cannot resolve `../src/lib/prng.ts`.

- [ ] **Step 3: Implement**

```ts
// src/lib/prng.ts
// Pure. No DCL imports — this file is unit-tested outside the explorer.

/** splitmix32 finalizer. Maps a slot number to a well-spread uint32 seed. */
export function hashSlot(slot: number): number {
  let z = (slot + 0x9e3779b9) | 0
  z = Math.imul(z ^ (z >>> 16), 0x21f0aaad)
  z = Math.imul(z ^ (z >>> 15), 0x735a2d97)
  return (z ^ (z >>> 15)) >>> 0
}

/** mulberry32. Four lines, deterministic, good enough for gameplay. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return function () {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function pick<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)]
}

/** Fisher-Yates on a copy. Never mutates the input. */
export function shuffle<T>(rng: () => number, arr: readonly T[]): T[] {
  const out = arr.slice()
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}
```

- [ ] **Step 4: Run to verify they pass**

Run: `npm test` — Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/prng.ts tests/prng.test.ts
git commit -m "feat: seeded PRNG (splitmix32 hash + mulberry32)"
```

---

### Task 4: The deterministic scheduler

This is the load-bearing file of the whole project. Every client must agree on it with no communication.

**Files:**
- Create: `src/config.ts`, `src/lib/schedule.ts`
- Test: `tests/schedule.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `slotIndex(nowMs: number): number`
  - `slotElapsed(nowMs: number): number` — seconds into the slot, `[0, SLOT_SECONDS)`
  - `roundIndex(slot: number): number` — `0..ROUND_COUNT-1`
  - `phaseAt(elapsed: number): { phase: 'intro' | 'play' | 'results'; remaining: number }`
  - `seedForSlot(slot: number): number`

- [ ] **Step 1: Write `src/config.ts` first — later tasks import from it**

```ts
// src/config.ts
export const SLOT_SECONDS = 120
export const ROUND_COUNT = 4

/** Must sum to SLOT_SECONDS. Guarded by a unit test. */
export const INTRO_SECONDS = 30
export const PLAY_SECONDS = 75
export const RESULTS_SECONDS = 15

/** Locomotion is frozen for this long at the start of play, absorbing clock skew. */
export const GET_READY_SECONDS = 5

export const ROUND_NAMES = ['Perfect Match', 'Sweeper Gates', 'Tip Toe', 'Hex-Drop'] as const

export const LIVES_PER_ROUND = 3

// Arena geometry
export const ARENA_CENTER = { x: 32, z: 32 }
export const TILE_SIZE = 3
export const PM_GRID = 5          // Perfect Match is 5x5
export const TIPTOE_WIDTH = 4
export const TIPTOE_LENGTH = 12
export const HEX_PER_LAYER = 180
```

- [ ] **Step 2: Write the failing tests**

```ts
// tests/schedule.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { slotIndex, slotElapsed, roundIndex, phaseAt, seedForSlot } from '../src/lib/schedule.ts'
import { SLOT_SECONDS, ROUND_COUNT, INTRO_SECONDS, PLAY_SECONDS, RESULTS_SECONDS } from '../src/config.ts'

test('phase durations sum to the slot length', () => {
  assert.equal(INTRO_SECONDS + PLAY_SECONDS + RESULTS_SECONDS, SLOT_SECONDS)
})

test('slotIndex advances exactly once per SLOT_SECONDS', () => {
  const t = 1_756_600_000_000
  const s = slotIndex(t)
  assert.equal(slotIndex(t + (SLOT_SECONDS - 1) * 1000), s)
  assert.equal(slotIndex(t + SLOT_SECONDS * 1000), s + 1)
})

test('slotElapsed stays inside the slot and is continuous', () => {
  for (let ms = 0; ms < SLOT_SECONDS * 1000 * 3; ms += 997) {
    const e = slotElapsed(ms)
    assert.ok(e >= 0 && e < SLOT_SECONDS)
  }
})

test('slotIndex and slotElapsed agree', () => {
  const t = 1_756_600_123_456
  assert.ok(Math.abs(slotIndex(t) * SLOT_SECONDS + slotElapsed(t) - t / 1000) < 1e-6)
})

test('roundIndex cycles through every round and is never negative', () => {
  const seen = new Set<number>()
  for (let s = 0; s < ROUND_COUNT * 3; s++) {
    const r = roundIndex(s)
    assert.ok(r >= 0 && r < ROUND_COUNT)
    seen.add(r)
  }
  assert.equal(seen.size, ROUND_COUNT)
  assert.equal(roundIndex(-1), ROUND_COUNT - 1, 'negative slots must not produce a negative index')
})

test('phaseAt covers the whole slot with no gap and no overlap', () => {
  const boundaries = [0, INTRO_SECONDS, INTRO_SECONDS + PLAY_SECONDS]
  assert.equal(phaseAt(boundaries[0]).phase, 'intro')
  assert.equal(phaseAt(boundaries[1] - 0.001).phase, 'intro')
  assert.equal(phaseAt(boundaries[1]).phase, 'play')
  assert.equal(phaseAt(boundaries[2] - 0.001).phase, 'play')
  assert.equal(phaseAt(boundaries[2]).phase, 'results')
  assert.equal(phaseAt(SLOT_SECONDS - 0.001).phase, 'results')
})

test('phaseAt remaining counts down to zero at each boundary', () => {
  assert.equal(phaseAt(0).remaining, INTRO_SECONDS)
  assert.ok(phaseAt(INTRO_SECONDS - 0.001).remaining < 0.01)
  assert.equal(phaseAt(INTRO_SECONDS).remaining, PLAY_SECONDS)
  assert.equal(phaseAt(INTRO_SECONDS + PLAY_SECONDS).remaining, RESULTS_SECONDS)
})

test('two clients one second apart agree on the round for 99% of a slot', () => {
  let disagree = 0
  const base = 1_756_600_000_000
  for (let ms = 0; ms < SLOT_SECONDS * 1000; ms += 100) {
    const a = roundIndex(slotIndex(base + ms))
    const b = roundIndex(slotIndex(base + ms + 1000))
    if (a !== b) disagree++
  }
  assert.ok(disagree <= 10, `clock skew of 1s desyncs ${disagree} sample points`)
})

test('seedForSlot is stable and differs between slots', () => {
  assert.equal(seedForSlot(500), seedForSlot(500))
  assert.notEqual(seedForSlot(500), seedForSlot(501))
})
```

The skew test is the one that matters: it proves a one-second clock difference only disagrees across the slot boundary, which the 5-second get-ready freeze absorbs.

- [ ] **Step 3: Run to verify they fail**

Run: `npm test` — Expected: FAIL, cannot resolve `../src/lib/schedule.ts`.

- [ ] **Step 4: Implement**

```ts
// src/lib/schedule.ts
// Pure. No DCL imports. Every client computes identical values from UTC alone.
import { SLOT_SECONDS, ROUND_COUNT, INTRO_SECONDS, PLAY_SECONDS, RESULTS_SECONDS } from '../config'
import { hashSlot } from './prng'

export type Phase = 'intro' | 'play' | 'results'

export function slotIndex(nowMs: number): number {
  return Math.floor(nowMs / 1000 / SLOT_SECONDS)
}

/** Seconds elapsed inside the current slot, in [0, SLOT_SECONDS). */
export function slotElapsed(nowMs: number): number {
  const secs = nowMs / 1000
  return secs - slotIndex(nowMs) * SLOT_SECONDS
}

/** Round for a slot. The double-modulo keeps negative slot numbers in range. */
export function roundIndex(slot: number): number {
  return ((slot % ROUND_COUNT) + ROUND_COUNT) % ROUND_COUNT
}

export function phaseAt(elapsed: number): { phase: Phase; remaining: number } {
  if (elapsed < INTRO_SECONDS) {
    return { phase: 'intro', remaining: INTRO_SECONDS - elapsed }
  }
  if (elapsed < INTRO_SECONDS + PLAY_SECONDS) {
    return { phase: 'play', remaining: INTRO_SECONDS + PLAY_SECONDS - elapsed }
  }
  return { phase: 'results', remaining: SLOT_SECONDS - elapsed }
}

export function seedForSlot(slot: number): number {
  return hashSlot(slot)
}
```

- [ ] **Step 5: Run to verify they pass**

Run: `npm test` — Expected: all pass, including the skew test.

- [ ] **Step 6: Commit**

```bash
git add src/config.ts src/lib/schedule.ts tests/schedule.test.ts
git commit -m "feat: deterministic UTC slot scheduler"
```

**Done when:** `npm test` is green and the skew test proves 1-second clock drift is harmless.

---

## Day 2 (Sep 1) — Tile system, first round, sync

### Task 5: Seeded layouts

**Files:**
- Create: `src/lib/layouts.ts`
- Test: `tests/layouts.test.ts`

**Interfaces:**
- Consumes: `mulberry32`, `shuffle` from `src/lib/prng.ts`; constants from `src/config.ts`.
- Produces:
  - `perfectMatchWave(seed: number, wave: number): { fruits: number[]; target: number; memoryMs: number }` — `fruits` has `PM_GRID * PM_GRID` entries.
  - `tipToeFakes(seed: number): boolean[]` — `TIPTOE_WIDTH * TIPTOE_LENGTH`, row-major, `true` means fake.
  - `sweeperWaves(seed: number): { speed: number; gapCol: number }[]`

- [ ] **Step 1: Write the failing tests**

```ts
// tests/layouts.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { perfectMatchWave, tipToeFakes, sweeperWaves } from '../src/lib/layouts.ts'
import { PM_GRID, TIPTOE_WIDTH, TIPTOE_LENGTH } from '../src/config.ts'

test('perfectMatchWave is deterministic for a seed and wave', () => {
  assert.deepEqual(perfectMatchWave(123, 0), perfectMatchWave(123, 0))
  assert.notDeepEqual(perfectMatchWave(123, 0).fruits, perfectMatchWave(123, 1).fruits)
})

test('perfectMatchWave fills the grid and the target is always reachable', () => {
  for (let seed = 0; seed < 400; seed++) {
    for (let wave = 0; wave < 3; wave++) {
      const w = perfectMatchWave(seed, wave)
      assert.equal(w.fruits.length, PM_GRID * PM_GRID)
      assert.ok(w.fruits.includes(w.target), 'at least one safe tile must exist')
      assert.ok(w.fruits.filter((f) => f === w.target).length >= 3, 'a crowd needs room to stand')
    }
  }
})

test('perfectMatchWave memory time shortens each wave', () => {
  const w = [0, 1, 2].map((i) => perfectMatchWave(9, i).memoryMs)
  assert.ok(w[0] > w[1] && w[1] > w[2])
  assert.ok(w[2] >= 2000, 'never shorter than 2s — touch players need to look')
})

test('tipToeFakes always leaves a connected path to the far side', () => {
  for (let seed = 0; seed < 500; seed++) {
    const fakes = tipToeFakes(seed)
    assert.equal(fakes.length, TIPTOE_WIDTH * TIPTOE_LENGTH)
    // walk row by row; a row is passable if it has a real tile adjacent to a
    // real tile in the row before it
    let reachable = new Set<number>()
    for (let c = 0; c < TIPTOE_WIDTH; c++) if (!fakes[c]) reachable.add(c)
    assert.ok(reachable.size > 0, `seed ${seed}: first row fully fake`)
    for (let r = 1; r < TIPTOE_LENGTH; r++) {
      const next = new Set<number>()
      for (const c of reachable) {
        for (const d of [-1, 0, 1]) {
          const nc = c + d
          if (nc >= 0 && nc < TIPTOE_WIDTH && !fakes[r * TIPTOE_WIDTH + nc]) next.add(nc)
        }
      }
      reachable = next
      assert.ok(reachable.size > 0, `seed ${seed}: row ${r} unreachable`)
    }
  }
})

test('tipToeFakes actually hides roughly half the tiles', () => {
  let fake = 0, total = 0
  for (let seed = 0; seed < 200; seed++) {
    const f = tipToeFakes(seed)
    fake += f.filter(Boolean).length
    total += f.length
  }
  const ratio = fake / total
  assert.ok(ratio > 0.3 && ratio < 0.6, `fake ratio ${ratio} outside the fun range`)
})

test('sweeperWaves speeds escalate and gaps stay on the board', () => {
  const waves = sweeperWaves(77)
  assert.deepEqual(waves, sweeperWaves(77))
  for (let i = 1; i < waves.length; i++) {
    assert.ok(waves[i].speed >= waves[i - 1].speed, 'waves must not get easier')
  }
  for (const w of waves) assert.ok(w.gapCol >= 0 && w.gapCol < 6)
})
```

The Tip Toe connectivity test is the important one. A seed that generates an impassable bridge is an unwinnable round that every client agrees on — the worst possible bug, and unfindable by playtesting.

- [ ] **Step 2: Run to verify they fail**

Run: `npm test` — Expected: FAIL, cannot resolve `../src/lib/layouts.ts`.

- [ ] **Step 3: Implement**

```ts
// src/lib/layouts.ts
// Pure. No DCL imports.
import { mulberry32, shuffle } from './prng'
import { PM_GRID, TIPTOE_WIDTH, TIPTOE_LENGTH } from '../config'

const FRUIT_COUNT = [3, 4, 5]        // more fruits each wave
const MEMORY_MS = [6000, 4000, 2500] // less time each wave

export function perfectMatchWave(
  seed: number,
  wave: number
): { fruits: number[]; target: number; memoryMs: number } {
  const rng = mulberry32(seed ^ ((wave + 1) * 0x9e37))
  const kinds = FRUIT_COUNT[Math.min(wave, FRUIT_COUNT.length - 1)]
  const cells = PM_GRID * PM_GRID
  const target = Math.floor(rng() * kinds)

  // Guarantee at least 4 safe tiles, then fill the rest at random, then shuffle
  // so the safe tiles are not clustered at the start of the array.
  const fruits: number[] = [target, target, target, target]
  while (fruits.length < cells) fruits.push(Math.floor(rng() * kinds))
  return { fruits: shuffle(rng, fruits), target, memoryMs: MEMORY_MS[Math.min(wave, MEMORY_MS.length - 1)] }
}

export function tipToeFakes(seed: number): boolean[] {
  const rng = mulberry32(seed ^ 0x7a1c)
  const fakes: boolean[] = new Array(TIPTOE_WIDTH * TIPTOE_LENGTH).fill(true)

  // Carve a guaranteed path first: a random walk from row 0 to the far side that
  // only ever steps to an adjacent column. Then everything else is random.
  let col = Math.floor(rng() * TIPTOE_WIDTH)
  for (let row = 0; row < TIPTOE_LENGTH; row++) {
    fakes[row * TIPTOE_WIDTH + col] = false
    const step = Math.floor(rng() * 3) - 1
    col = Math.max(0, Math.min(TIPTOE_WIDTH - 1, col + step))
  }

  // Add decoy real tiles so the carved path is not obvious by elimination.
  for (let i = 0; i < fakes.length; i++) {
    if (fakes[i] && rng() < 0.35) fakes[i] = false
  }
  return fakes
}

export function sweeperWaves(seed: number): { speed: number; gapCol: number }[] {
  const rng = mulberry32(seed ^ 0x5eed)
  const BASE = 3.0 // metres per second
  return [0, 1, 2, 3].map((i) => ({
    speed: BASE + i * 0.9,
    gapCol: Math.floor(rng() * 6),
  }))
}
```

- [ ] **Step 4: Run to verify they pass**

Run: `npm test` — Expected: all pass, including 500 Tip Toe seeds proving connectivity.

- [ ] **Step 5: Commit**

```bash
git add src/lib/layouts.ts tests/layouts.test.ts
git commit -m "feat: seeded round layouts with guaranteed-solvable Tip Toe"
```

---

### Task 6: The pooled tile system

Roughly 60% of the game's value lives here. Every round except Sweeper Gates is a config over it.

**Files:**
- Create: `src/arena/tiles.ts`

**Interfaces:**
- Consumes: `TILE_SIZE`, `ARENA_CENTER` from config.
- Produces:
  - `createTileGrid(opts: { cols: number; rows: number; origin: Vector3; hex?: boolean }): TileGrid`
  - `TileGrid.setMaterial(i: number, fruit: number): void`
  - `TileGrid.sink(i: number, delayMs: number): void` — drops the collider, then tweens the tile down 6m
  - `TileGrid.resetAll(): void` — restores every tile to solid and visible
  - `TileGrid.setVisible(visible: boolean): void`
  - `TileGrid.indexAt(position: Vector3): number | -1`

- [ ] **Step 1: Implement the pool**

Key constraints this must respect:
- **Entities are created once in `main()` and never destroyed.** Creating 360 entities every 2 minutes will thrash the engine and drift toward the 6,000-entity hard limit. `resetAll()` restores state; nothing is respawned.
- **Sinking is `MeshCollider.deleteFrom(entity)` followed by `Tween.setMove(entity, from, to, 2000)`.** Removing the collider is what makes the player fall; the tween is only the visual.
- **Reset is `Transform.getMutable(e).position = home` plus `MeshCollider.setBox(e)`,** with `Tween.deleteFrom(e)` first so a stale tween does not fight the reset.
- One shared material per fruit kind, created once. Not one material per tile — 25 tiles × 5 fruits would blow past the 400-material soft limit across rounds.

```ts
// src/arena/tiles.ts  (shape; fill in against the SDK skills' verified patterns)
import { engine, Transform, MeshRenderer, MeshCollider, Material, Tween, TweenSequence, Entity } from '@dcl/sdk/ecs'
import { Vector3, Quaternion, Color4 } from '@dcl/sdk/math'
import { TILE_SIZE } from '../config'

export type TileGrid = {
  entities: Entity[]
  homes: Vector3[]
  setMaterial(i: number, kind: number): void
  sink(i: number, delayMs: number): void
  resetAll(): void
  setVisible(v: boolean): void
  indexAt(p: Vector3): number
}
```

- [ ] **Step 2: Verify in preview with a throwaway system**

Add a temporary system to `src/index.ts` that builds a 5×5 grid and sinks a random tile every second.

Run: `npm run start`
Expected: tiles sink one by one; standing on one drops you through as it goes.

- [ ] **Step 3: Verify on the phone**

Run: `npm run start -- --mobile`
Expected: same behaviour, smooth, and falling through feels fair with touch controls.

- [ ] **Step 4: Check the entity budget**

In the mobile preview open **Scene Limits Preview** (top-right icon). Expected: entities and colliders far below the soft limits with the biggest grid (Hex-Drop, 360 tiles) built.

- [ ] **Step 5: Commit**

```bash
git add src/arena/tiles.ts src/index.ts
git commit -m "feat: pooled tile grid with sink and reset"
```

**Done when:** a 360-tile grid builds, sinks, and resets without allocating new entities, and the mobile limits panel is green.

---

### Task 7: The typed sync wrapper

**Files:**
- Create: `src/net/sync.ts`

**Interfaces:**
- Produces:
  - `emitEliminated(slot: number)`, `emitFinished(slot: number, ms: number)`, `emitTile(slot: number, tileId: number)`, `emitCheer(emote: string)`
  - `onEliminated(cb)`, `onFinished(cb)`, `onTile(cb)`, `onCheer(cb)`
  - Every payload carries `slot`; handlers **must** drop messages whose `slot` is not the current one.

- [ ] **Step 1: Implement**

Three rules this file exists to enforce:
1. **It is the only file that imports `@dcl/sdk/message-bus`.** The API is deprecated; when it is removed, one file changes.
2. **Every handler drops stale slots.** A message that arrives 200ms after a slot boundary must not sink a tile in the new round.
3. **Your own messages come back to you.** The docs are explicit: `.on` cannot distinguish self-sent messages. Include the sender address in the payload and ignore your own where double-applying would be wrong.

```ts
// src/net/sync.ts
import { MessageBus } from '@dcl/sdk/message-bus'
import { getPlayer } from '@dcl/sdk/src/players'

const bus = new MessageBus()

export type Eliminated = { slot: number; address: string }
export type Finished   = { slot: number; address: string; ms: number }
export type TileStep   = { slot: number; address: string; tileId: number }
export type Cheer      = { slot: number; address: string; emote: string }
```

- [ ] **Step 2: Verify with two preview windows**

```bash
npm run start
```
then open a second window at:
`decentraland://realm=http://127.0.0.1:8000&local-scene=true&debug=true&multi-instance=true`

Expected: an event emitted in window A logs in window B with a matching `slot`.

- [ ] **Step 3: Commit**

```bash
git add src/net/sync.ts && git commit -m "feat: typed message bus wrapper with slot guards"
```

---

### Task 8: Perfect Match

**Files:**
- Create: `src/arena/rounds/types.ts`, `src/arena/rounds/perfectMatch.ts`
- Create: `src/systems/scheduler.ts`, `src/systems/spectator.ts`

**Interfaces:**
- Produces: `type Round = { name: string; build(): void; start(seed: number): void; tick(dt: number, elapsed: number): void; stop(): void }`

- [ ] **Step 1: Define the Round interface**

Every round implements exactly this. `build()` runs once in `main()` and creates entities; `start(seed)` resets them for a new slot; `stop()` hides them.

- [ ] **Step 2: Implement the scheduler system**

```ts
// src/systems/scheduler.ts — shape
// Every frame: compute slot/elapsed/phase from Date.now().
// On slot change      -> stop() the old round, start(seedForSlot(slot)) the new one.
// On entering 'play'  -> freeze locomotion for GET_READY_SECONDS via InputModifier,
//                        then release. This is what absorbs clock skew.
// On entering 'results' -> show standings, teleport survivors to the podium.
```

The freeze uses `InputModifier.createOrReplace(engine.PlayerEntity, { mode: InputModifier.Mode.Standard({ disableAll: true }) })` and is removed after `GET_READY_SECONDS`. Verify the exact field shape against the SDK skills before writing it.

- [ ] **Step 3: Implement the spectator system**

`eliminate()` → `movePlayerTo` the ledge, mark the player out for this slot, show the cheer UI. Revive automatically on the next slot change. Solo players spend a life instead of being eliminated until lives hit zero.

- [ ] **Step 4: Implement Perfect Match**

Three waves inside the 75s play phase. Per wave: apply `perfectMatchWave(seed, wave).fruits` as materials, hold for `memoryMs`, blank every tile, announce the target, count down 3-2-1, then sink every tile whose fruit is not the target.

- [ ] **Step 5: Play it solo in preview and on the phone**

Expected: you can win by standing on the right fruit and lose by standing on the wrong one, three waves in a row, inside one slot.

- [ ] **Step 6: Commit**

```bash
git commit -am "feat: Perfect Match round on the scheduler"
```

**Done when:** you can win and lose Perfect Match alone on your phone, and the round starts on the slot boundary without any server.

---

## Day 3 (Sep 2) — The finale round and the social layer

### Task 9: Hex-Drop

**Files:** Create `src/arena/rounds/hexDrop.ts`

The only round that genuinely needs network sync, because decay is player-caused, not seeded.

- [ ] **Step 1: Build two stacked hex layers from the pooled grid** (180 per layer, offset rows, second layer 4m below)
- [ ] **Step 2: Detect steps with `TriggerArea`** — a `TriggerArea.setBox` per tile, `triggerAreaEventsSystem.onTriggerEnter`. Note from the docs: **the trigger fires for other players' avatars too**, so decay looks right locally even before a message arrives. Broadcast `emitTile` only for your own steps (`result.trigger?.entity === engine.PlayerEntity`), and apply incoming `tile` events idempotently.
- [ ] **Step 3: Sink 500ms after the step**, collider removed at sink time
- [ ] **Step 4: Falling through both layers eliminates**; last player standing wins
- [ ] **Step 5: Test with two preview windows** — Expected: a tile stepped in window A decays in window B within a frame or two, and the same tile is never double-sunk
- [ ] **Step 6: Commit**

**Done when:** two clients finish a full Hex-Drop and both agree on who won.

### Task 10: Crowns, standings, and the cheer loop

**Files:** Create `src/net/crowns.ts`, `src/ui/hud.tsx`, `src/ui/boards.tsx`, `src/arena/lobby.ts`

- [ ] **Step 1: Session crown tally** — survive 1, top-3 2, win 4, first-finisher bonus; keyed on address, held in memory, rebuilt from `finished`/`eliminated` events
- [ ] **Step 2: HUD** — round banner, countdown, lives, and the **cheer button** for eliminated players (fires `triggerEmote` and broadcasts `cheer`). Bind it to `IA_PRIMARY`, never to `IA_ACTION_3+`.
- [ ] **Step 3: Safe-area layout** — read `creator/build-for-mobile/develop/safe-area.md` and keep all UI clear of the client's own controls; the jump button corner is off-limits
- [ ] **Step 4: In-world boards** — session crowns, next-three-rounds schedule, and a three-line onboarding sign at spawn
- [ ] **Step 5: Verify every UI element on the phone**, not just in desktop preview
- [ ] **Step 6: Commit**

**Done when:** an eliminated player on a phone can watch, cheer, see who is still alive, and see the crown standings update live.

---

## Day 4 (Sep 3) — The remaining two rounds

Both are configs over systems that already exist. **If Day 3 slipped, cut Sweeper Gates and Tip Toe here and go straight to Day 5** — a two-round gauntlet that is polished and live beats a four-round one that is not.

### Task 11: Sweeper Gates
- [ ] Walls on `Tween.setMove` + `TweenSequence` with `TweenLoop.TL_YOYO`, speeds from `sweeperWaves(seed)`
- [ ] `TriggerArea` per wall; on hit, `movePlayerTo` 3m back and dock a heart (no physics shove — it is jank on touch)
- [ ] Position derived from `f(seed, elapsed)` so a late joiner renders walls mid-flight correctly
- [ ] Verify on phone, commit

### Task 12: Tip Toe
- [ ] Bridge from the pooled grid using `tipToeFakes(seed)`
- [ ] Fake tiles sink 400ms after a step and **stay gone for the whole round** — this is the round's social hook: the leader sacrifices themselves to reveal the path
- [ ] Sync via the same `tile` event as Hex-Drop
- [ ] First finisher gets bonus crowns so leading is still worth it
- [ ] Verify on phone, commit

### Task 13: Unattended stability soak
- [ ] Leave the scene running in preview for 60 minutes across ~8 full cycles
- [ ] **Done when:** no crash, no entity-count growth, no tile stuck sunk, no memory climb in the limits panel

---

## Day 5 (Sep 4) — Mobile pass, juice, ship

**This is submission day. Deploy early — conversion takes 30–60 minutes.**

### Task 14: Mobile hardening
- [ ] Profile on a real mid-spec Android; target **Performance > 90% on the High profile**
- [ ] Check every metric in the Scene Limits Preview against the soft limits table
- [ ] Text sizes, tap targets, safe area, onboarding — all judged directly by criterion #3
- [ ] Run `SceneOptimizer` over the GLBs before deploying

### Task 15: Juice
- [ ] Countdown drama, elimination whoosh, crown fanfare, confetti on the podium (Kenney CC0 audio + particles)
- [ ] Do **not** use `LightSource` — it is not on mobile until v1.13.0

### Task 16: Ship
- [ ] Final deploy, then wait for conversion and verify from a phone on mobile data (not just Wi-Fi)
- [ ] `README.md` structured around the seven judging criteria, with the mobile-first and social sections first
- [ ] `CREDITS.md` for every CC0 asset
- [ ] 2-player demo video captured on phones
- [ ] DoraHacks submission with the public GitHub link
- [ ] **Done when:** the World is live, a stranger can play it from the mobile app, and the submission is in.

---

## Sep 5–11 — Judging window

The World must stay up. Work in this order, deploying only after verifying in preview:

1. **Playtest with 6 people on phones.** Fix what confused them; tune wave speeds from what you watched.
2. **Optional Layer 2 persistence** — daily crowns across sessions. Timebox to half a day. Skip it if anything else is shaky.
3. **Schedule two "crown rush hours"** on the DCL events page and post in the Friendzone Discord so judges walk into a live crowd. Criterion #2 is social value, and an occupied arena demonstrates it better than any README.
4. **Watch the Discord** for judge-reported breakage.

**Freeze rule:** no deploy after Sep 10 unless it fixes something broken. A World that goes down mid-judging fails requirement #1 outright.

---

## Cut order

Exercised top-down the moment a day slips. Everything above the line still constitutes a complete, eligible submission.

1. Jump Bar stretch round — already cut, do not start it
2. Cross-session persistence (Layer 2) — session crowns are enough
3. Daily challenge line
4. Tip Toe
5. Sweeper Gates
6. Ghost times

**Never cut:** the scheduler, Perfect Match, Hex-Drop, the crowns board, the spectator/cheer loop, the mobile pass. The spectator loop is not polish — it is the social component eligibility depends on.
