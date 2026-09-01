# Vision Gap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close every ▢ item in docs/VISION.md §8 that can be closed by code, and stage the two that cannot (World deploy, phone playtest) so they cost zero extra time when unblocked.

**Architecture:** No new systems. Every task extends an existing module — scenery, scheduler, lobby, sweeper, tipToe — and every change stays inside the established rules: pure logic in `src/lib` with tests, scene code verified by `npm run build` + preview, primitives for anything plural, one GLB for anything singular, no backend, no new inputs.

**Tech Stack:** Decentraland SDK7 (`@dcl/sdk` 7.x), TypeScript, node:test via tsx.

**Spec:** docs/VISION.md (§8 gap list, priority order) — read it first; every task below cites the gap it closes.

## Global Constraints

- Node 22 (pinned via Volta in package.json) — Node 20 breaks the CLI.
- `npm test` (36 tests) and `npm run build` must pass after every task.
- Mobile budgets: stay under 15% of entities (soft limit 4,800), no new textures, no LightSource (missing on mobile until client v1.13).
- Every Label keeps an explicit width/height; no emoji in any UI or TextShape string.
- Banner/announcer honesty: all result text flows through `resolveBanner` / the results block — no task may write "you did well" text outside them.
- Deadline shape: Tasks 1–4 on Sep 2. Task 5 on Sep 3. Task 6 the moment the World name arrives, and no later than Sep 4 morning. Task 7 only if everything else is done AND the Sep 3 playtest was clean.

---

### Task 1: Jumbotron target swatch (VISION §3 Round 1 ▢)

Perfect Match names the called colour ("STAND ON RED") but never *shows* it. The jumbotron —
already a billboarded TextShape over the arena — becomes the colour swatch: its text takes the
target colour during the call, white otherwise.

**Files:**
- Modify: `src/arena/scenery.ts` (add `setJumbotronColor`)
- Modify: `src/arena/rounds/perfectMatch.ts` (drive it)
- Modify: `src/systems/scheduler.ts` (reset on slot begin)

**Interfaces:**
- Produces: `setJumbotronColor(color: { r: number; g: number; b: number } | null): void` — null restores white.
- Consumes: `TextShape.getMutable(jumbotron)`, `FRUIT_COLORS[wave.target]`.

- [ ] **Step 1: Add the setter to scenery.ts**, next to `setJumbotron`:

```ts
/** Tint the jumbotron text. Perfect Match uses this to SHOW the called colour, not just name it. */
export function setJumbotronColor(color: { r: number; g: number; b: number } | null): void {
  if (!jumbotron) return
  const t = TextShape.getMutable(jumbotron)
  t.textColor = color ? Color4.create(color.r, color.g, color.b, 1) : Color4.White()
}
```

- [ ] **Step 2: Drive it from perfectMatch.ts.** In the call branch (`t < judgeAt`), after `setBanner('STAND ON ' + ...)`:

```ts
setJumbotronColor(FRUIT_COLORS[wave.target])
```

and in the branch that follows the reveal (`judged < index` body), plus in `stop()`:

```ts
setJumbotronColor(null)
```

Import at top: `import { setJumbotronColor } from '../scenery'`

- [ ] **Step 3: Reset in scheduler.ts** inside `beginSlot`, next to `setConfetti(false)`: add `setJumbotronColor(null)` (import from `'../arena/scenery'`).
- [ ] **Step 4: Verify** — `npm run build` (0 errors), `npm test` (36 pass).
- [ ] **Step 5: Commit** — `git commit -m "feat: jumbotron shows the called colour as a swatch"`

### Task 2: End-of-cycle podium moment (VISION §6 ▢ — the missing celebration peak)

After Hex-Drop's results begin, the top three crown holders are placed on the podium steps, the
crowd sees them emote under confetti, and the announcer congratulates. Only the LOCAL player can be
moved, so each client checks its own rank and moves itself — everyone else sees the avatars arrive.

**Files:**
- Modify: `src/arena/lobby.ts` (export the step positions)
- Modify: `src/systems/scheduler.ts` (the moment itself)

**Interfaces:**
- Produces: `PODIUM_SPOTS: Vector3[]` — index = rank 0/1/2, standing position on each step.
- Consumes: `standings(3)` from crowns, `spectator.sendTo`, `triggerEmote` from `~system/RestrictedActions`, `setConfetti`, `say`.

- [ ] **Step 1: Export spots from lobby.ts.** The steps are built at `[0, 1.2] [-3, 0.8] [3, 0.5]` around `(ARENA_CENTER_X, LOBBY.z - 3)`. Above the build code add:

```ts
/** Standing spots on the podium steps, tallest first. Rank r of the cycle stands at PODIUM_SPOTS[r]. */
export const PODIUM_SPOTS = [
  Vector3.create(ARENA_CENTER_X, LOBBY.y + 1.4, LOBBY.z - 3),
  Vector3.create(ARENA_CENTER_X - 3, LOBBY.y + 1.0, LOBBY.z - 3),
  Vector3.create(ARENA_CENTER_X + 3, LOBBY.y + 0.7, LOBBY.z - 3)
]
```

- [ ] **Step 2: The moment, in scheduler.ts.** In the results block, replace `spectator.sendToLobby()` with:

```ts
// The cycle's celebration peak: after the finale, the podium. Each client moves only itself -
// rank comes from the shared crown tally, so every client agrees who stands where.
const cycleEnd = roundIndex(slot) === ROUND_COUNT - 1
const rank = cycleEnd ? standings(3).findIndex((s) => s.address === myAddress()) : -1
if (rank >= 0) {
  void spectator.sendTo(PODIUM_SPOTS[rank])
  void triggerEmote({ predefinedEmote: rank === 0 ? 'raiseHand' : 'clap' })
  setConfetti(true)
} else {
  spectator.sendToLobby()
}
```

Imports: `import { PODIUM_SPOTS } from '../arena/lobby'`, `import { standings } from '../net/crowns'`, `import { triggerEmote } from '~system/RestrictedActions'`.
Note `setConfetti(true)` already fires for survivors — the extra call just covers a rank-holder who did not survive the finale.

- [ ] **Step 3: Verify no circular import.** `lobby.ts` must not import from `scheduler.ts` at module top-level — it currently imports `upcoming`; if the compiler flags a cycle, move `PODIUM_SPOTS` into `src/config.ts` instead (it is pure data; config is the natural home).
- [ ] **Step 4: Verify** — build 0 errors, tests 36 pass, and in preview: survive a Hex-Drop with any crowns and confirm you land on a step and emote.
- [ ] **Step 5: Commit** — `git commit -m "feat: end-of-cycle podium moment"`

### Task 3: Spinner acceleration + final-20s pressure (VISION §3 Round 2 ▢)

- [ ] **Step 1: In `src/arena/rounds/sweeper.ts`** add near the state flags: `let accelerated = false`, reset `accelerated = false` in `start()`.
- [ ] **Step 2: In `tick`, during play**, after the wall loop:

```ts
// The last 20 seconds: the beam nearly doubles its sweep rate. Pairs with the announcer's
// HURRY UP so the pressure is heard and seen at the same moment.
if (!accelerated && elapsed > PLAY_SECONDS - 20) {
  accelerated = true
  Tween.createOrReplace(spinnerPivot, {
    mode: Tween.Mode.RotateContinuous({
      direction: Quaternion.fromEulerDegrees(0, 1, 0),
      speed: 46
    }),
    duration: 0,
    easingFunction: EasingFunction.EF_LINEAR
  })
}
```

Import `PLAY_SECONDS` from config.
- [ ] **Step 3: Verify** — build, tests, and confirm `speed: 46` still passes the wall-pacing test (it must: the test covers walls, not the spinner — check `tests/geometry.test.ts` asserts nothing about spinner speed; if a reviewer wants one, add `assert.ok(46 < 60)` with the reaction-time rationale).
- [ ] **Step 4: Commit** — `git commit -m "feat: sweeper beam accelerates for the final 20 seconds"`

### Task 4: Tip Toe scars (VISION §3 Round 3 ▢)

Fallen tiles already rest visibly 8m below the bridge, but from the far end the gap they left is
hard to read. A pool of thin dark plates marks every burnt tile at bridge level.

**Files:**
- Modify: `src/arena/rounds/tipToe.ts`

**Interfaces:**
- Consumes: `grid.homes`, existing `step()` flow.
- Produces: nothing external — a private pool.

- [ ] **Step 1: Build the pool in `build()`** after the pads (26 = worst-case fake count on a 48-tile bridge at the tested 25–60% ratio):

```ts
// Scar plates: one appears where each fake tile fell, so the death map reads from the back of
// the bridge. Pooled and re-laid per round like every other repeated thing in the scene.
for (let i = 0; i < 26; i++) {
  const e = engine.addEntity()
  Transform.create(e, { position: Vector3.create(0, -50, 0), scale: Vector3.create(TILE_SIZE, 0.08, TILE_SIZE) })
  MeshRenderer.setBox(e)
  Material.setPbrMaterial(e, { albedoColor: Color4.create(0.18, 0.14, 0.2, 1), roughness: 1 })
  scars.push(e)
}
```

with `let scars: Entity[] = []`, `let nextScar = 0` in module state, `Color4` added to the math import and `Material` to the ecs import.

- [ ] **Step 2: Place a scar when a fake tile actually sinks** — in the pending-expiry loop inside `tick`, where `grid.sink(pending[i].index)` runs, add:

```ts
const h = grid.homes[pending[i].index]
if (nextScar < scars.length) {
  Transform.getMutable(scars[nextScar]).position = Vector3.create(h.x, h.y - 0.35, h.z)
  nextScar++
}
```

- [ ] **Step 3: Reset in `start()`** — `nextScar = 0` and every scar back to `y: -50`; hide nothing in `stop()` beyond that same parking (scars have no collider, parking them is enough).
- [ ] **Step 4: Verify** — build, tests, preview: burnt tiles leave dark plates; count entities stays under 15% (26 more ≈ 640 total ≈ 13%).
- [ ] **Step 5: Commit** — `git commit -m "feat: tip toe scars mark every burnt tile"`

### Task 5: Submission kit (VISION §8 item 7 — everything except the video)

- [ ] **Step 1: Thumbnail.** Check for a rasterizer: `command -v convert inkscape rsvg-convert`. If any exists, generate `images/scene-thumbnail.png` (per the scene-metadata docs: PNG, min 1024×768 recommended) from a designed SVG — arena-pink ground, title STUMBLEZONE, four round icons as coloured discs. If none exists, the thumbnail comes from Step 2's phone session: screenshot the arena from the ledge in landscape, crop to 4:3, replace `images/scene-thumbnail.png`. Either way verify `scene.json` → `display.navmapThumbnail` still points at it.
- [ ] **Step 2: Playtest checklist run** (docs/TESTING.md) on the phone — one full 8-minute cycle minimum, notes into docs/TESTING.md under a `## Findings Sep 3` heading, each finding tagged fix-now / ship-anyway.
- [ ] **Step 3: README refresh** — test count (36+), the sky/announcer/vision sections, and a `## Play it` block with the World URL from Task 6 once known.
- [ ] **Step 4: DoraHacks draft** — create the submission on dorahacks.io/hackathon/friendzone with repo link, description (reuse README §what-it-is), and mark video "coming"; the form can be edited until deadline, so drafting early costs nothing and catches field surprises (team info, wallet, licence).
- [ ] **Step 5: Events** — on decentraland.org/events create two "Crown Rush Hour" events during Sep 5–11 at EU-evening and US-evening times, pointing at the World.
- [ ] **Step 6: Commit** — `git commit -m "chore: submission kit - thumbnail, readme, findings"`

### Task 6: Deploy day (VISION §8 item 1 — gated on the World name)

- [ ] **Step 1:** The moment the name arrives, add to `scene.json`: `"worldConfiguration": { "name": "<the-name>" }` (exact string from Regenesis Labs; parcels question from the DM answered first — if their World has content at `0,0`–`3,3`, coordinate before deploying).
- [ ] **Step 2:** `npm run build && npm test` — green before any deploy.
- [ ] **Step 3:** `npm run deploy -- --target-content https://worlds-content-server.decentraland.org` — sign with the granted wallet in the browser window.
- [ ] **Step 4:** Wait 30–60 min conversion, then on the phone over **mobile data**: `/goto <name>` — walk one full cycle.
- [ ] **Step 5:** Update README Play-it block + DoraHacks draft with the live URL. Commit and push the public repo.
- [ ] **Step 6:** Re-deploy cadence for fixes: batch, deploy at most twice daily, never within 2h of a Crown Rush event.

### Task 7 (STRETCH — only after 1–6 and a clean playtest): Jump Bar, the fifth round

A rotating beam over a disc — every piece already exists in the sweeper. Gated because a fifth
round changes the cycle length, which touches the scheduler's core numbers.

- [ ] **Step 1:** `src/config.ts`: `ROUND_COUNT = 5`, append `'Jump Bar'` to `ROUND_NAMES`. The slot maths (`slot % ROUND_COUNT`) and every test parametrised on `ROUND_COUNT` adapt automatically — run `npm test` and fix any that hard-code 4 (grep first: `grep -rn "slot % 4\|ROUND_COUNT - 1" src tests`).
- [ ] **Step 2:** `src/arena/rounds/jumpBar.ts`: a 24m disc platform at `ARENA_Y` (`MeshRenderer.setCylinder`), one spinner pivot + beam + sphere caps copied from `sweeper.ts`'s `buildSpinner` with `WALL_HEIGHT`-low beam (y offset `+0.9` so it is jumpable), speed ramping `14 → 34` across the round via the Task-3 recreate-tween pattern at 30s and 60s. Hits: same knockback + heart flow as the sweeper. `spawn()` at disc edge; hint: `'One bar. It spins. Jump.'`
- [ ] **Step 3:** Register in `src/index.ts`'s `setupScheduler([...])` **in position matching ROUND_NAMES order**, and give Hex-Drop's `final_round` announcement a look — it keys on `ROUND_COUNT - 1`, which is now Jump Bar; move Hex-Drop to last position in BOTH lists so the finale stays the finale.
- [ ] **Step 4:** Verify — build, all tests, preview one full 10-minute five-round cycle.
- [ ] **Step 5:** Commit — `git commit -m "feat: jump bar, round five"`

---

## Self-review (done at drafting)

- **Spec coverage:** VISION §8 items 1→7 map to Tasks 6, 5.2, 1, 2, 3+partial-5, 4, 5/7. Item 5's "crowd oooh" is deliberately dropped — the announcer covers the moment, and synthesising a convincing crowd is poor value before Sep 4. Item 8 (stretch) is Task 7.
- **Type consistency:** `setJumbotronColor` signature matches scenery's existing `Rgb`-free style (inline shape, matching `setColor`'s parameter type); `PODIUM_SPOTS` uses `Vector3.create` like every position in the codebase; Task 7's names match `ROUND_NAMES` ordering rule stated in index.ts's comment.
- **Placeholder scan:** no TBDs; the two genuinely blocked items (name, phone) are staged as gates with explicit unblock actions, not fake steps.
