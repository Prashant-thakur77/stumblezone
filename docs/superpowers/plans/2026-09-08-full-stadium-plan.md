# The Full Stadium — using every metre of the scene (plan, 2026-09-08)

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Steps use `- [ ]` checkboxes.

**Goal:** Turn the unused two-thirds of the 64×64 m scene into places to be, things to do and
reasons to walk — so a visitor who arrives between rounds has ten minutes of things to try, and
every one of them feeds crowns, titles and the board.

**Architecture:** Same shape as everything shipped so far. Every new rule is a pure module in
`src/lib/` with a `node:test` file; every new place is a builder in `src/arena/` that uses the
existing `decorModel`, trigger-zone and sign helpers; every readout goes on the lobby board and,
where it matters in the moment, a toast. No new network messages except one (`lap`/`drop` results
go on the board only for the local player, like the tower). Nothing runs on the server, nothing is
persisted, nothing depends on anyone else being online.

**Spec:** this file is the spec; the design reasoning is in each phase's opening paragraph.

## Where the space is

| Zone | Now | Plan |
|---|---|---|
| Village strip, y 20, z 0–18 | Lobby, Hat Market, Disco Deck, Tower | + Big Drop landing pad, NPC host, disco music |
| **West lane, y 20, x 0–6, z 18–62** | empty | **Practice Yard** along the lane |
| **East lane, y 20, x 58–64, z 18–62** | empty | **Speed Lap** out-and-back, lamp-lit |
| **NW corner plaza, x 0–8, z 56–64** | empty | **Hall of Fame** + photo frame |
| **NE corner plaza, x 56–64, z 56–64** | empty | **Sky Cannon** + lap turnaround |
| **Sky over the village, y 33–48** | empty | **Sky Course** from the tower top to the **Sky Box** |
| Arena ring, y 24–40 | rounds, crowd, lights | pillar caps flash when the crowd goes wild |
| Ground, y 0–20 | fall zone | unchanged (the kill plane stays a Y test; nobody walks there) |

The pillars stand at radius 26 from (32, 36) — x 6–58 — so both lanes and both corner plazas are
clear of them. Clouds at radius 30–35 pass through the lanes at y 5–22; they have no colliders and
walking through one is a feature.

## Global constraints

- `x, z ∈ [0, 64]`, `y < 81`. Every new position asserted by `tests/space.test.ts`.
- Every jump: horizontal gap ≤ 2.4 m, rise ≤ 1.1 m (the tower test's numbers).
- No colliders on decor; solids are floors, kerbs, platforms, the practice tiles.
- Nothing new during a live round: village content never teleports, freezes or scores a player
  who is in the arena. Every zone handler early-outs on `spectator.isRoundLive() && !isOut()`.
- Falling off a lane must return you to the village, not eliminate you: `fallWatcher` sends a
  player below `KILL_Y` to the lobby when no round is live (check in Task 1; fix if not).
- `npm run verify` green before every commit. Deploy is outside this plan.

---

## Phase 1 — The Ring Road (the space itself)

Two lanes and two plazas, so the stadium can be walked around and the corners exist to be filled.

### Task 1: Lanes, plazas, kerbs, lamps

**Files:** `src/config.ts` (+`LANES`, `PLAZAS`), `src/arena/ring.ts` (new), `src/index.ts`,
`src/systems/spectator.ts` (verify fall-out-of-round), `tests/space.test.ts` (new)

- [x] Config:
  ```ts
  export const WEST_LANE = { x: 3, z: 40, width: 6, depth: 44 }   // x 0..6, z 18..62
  export const EAST_LANE = { x: 61, z: 40, width: 6, depth: 44 }  // x 58..64
  export const NW_PLAZA = { x: 4, z: 60, size: 8 }
  export const NE_PLAZA = { x: 60, z: 60, size: 8 }
  ```
- [x] `ring.ts`: `buildRing()` — four slabs (PLATFORM_COLOR, collider), a 0.3 m kerb along each
  lane's inner edge (x 6 / x 58) and along the plazas' arena-facing edges, `lampost-small` every
  8 m on the outer edge, two `bush-02` per plaza, a `crowd.glb` cluster on each plaza facing the
  arena (`buildCrowd`, scale 1.8).
- [x] Test: every slab/kerb/lamp inside the scene; lanes do not overlap the village floor
  (z ≥ 18) or any pillar (`hypot(x-32, z-36) - 26 > 1` for lane inner edges).
- [x] Verify `fallWatcher`: below `KILL_Y` with no live round → `sendToLobby()`. If it eliminates,
  guard with `if (!roundLive) { sendToLobby(); return }`.
- [x] Commit `feat(space): ring road - two lanes and two corner plazas`.

---

## Phase 2 — Things to do on the road

### Task 2: Speed Lap (east lane)

The lane is a straight; the game is out-and-back against the clock, like the tower but on foot.

**Files:** `src/lib/lap.ts`, `tests/lap.test.ts`, `src/arena/lap.ts`, `src/systems/records.ts`
(`recordLap/lapBest`), `src/arena/lobby.ts` (board line)

- [x] `lap.ts` (lib): `class Lap { start(nowMs); turn(nowMs); finish(nowMs): number | null }` —
  a finish without a turn returns null (you cannot cut the course). Reuse `formatTime` from
  `lib/tower.ts`.
- [x] Arena: start/finish pad at (61, 20, 20) (emissive yellow 2×2), turnaround pad on the NE
  plaza at (60, 20, 60). Toast "LAP 0:24.3 · NEW BEST"; `play('whistle')` on start.
- [x] Board: `LAP BEST: 0:24.3` under the tower line.
- [x] Tests: start→finish with no turn is null; start→turn→finish returns elapsed; a second start
  resets. Pads inside the lane.

### Task 3: Practice Yard (west lane) — learn the hazards with nothing at stake

Three miniature hazards in a row, north to south, each with a sign. No lives, no scoring: the
feedback is the hazard itself (a sinking tile, a red light, a beam that shoves you a metre).

**Files:** `src/lib/practice.ts`, `tests/practice.test.ts`, `src/arena/practice.ts`

- [x] **Hex patch** (z 24–31): 3×3 tiles of 1.8 m at y 20.05 over the lane floor. Stepping on
  one (Transform-over-tile check like Hex-Drop) sinks it 1.2 m over 0.5 s after `SINK_DELAY 0.6`,
  restores after `RESPAWN 4 s`. Pure lib: `class Patch { step(i, now); tick(now): TileState[] }`.
- [x] **Roaming light** (z 34–44): one `spotCentre` pool (reuse `lib/spotlight.ts` with a 3.5 m
  radius figure) that turns red after `SPOT_HIT_SECONDS`; no life lost — toast "That would have
  cost a heart" once per entry.
- [x] **Mini beam** (z 47–56): a 4 m beam on a pivot at y 20.45, 40°/s, `applyKnockbackToPlayer`
  strength 6 towards the lane centre on contact. Same trigger pattern as Jump Bar.
- [x] Sign at (3, 24, 21): "PRACTICE YARD - no lives here. Learn the moves, then play."
- [x] Tests: patch timing (sink after delay, restore after respawn, never both), practice light
  stays inside the lane, beam ends inside x 0..6.

### Task 4: Hall of Fame + photo frame (NW plaza)

**Files:** `src/arena/hall.ts`, `src/net/crowns.ts` (`standings` already), `tests/space.test.ts`

- [x] Five plinths in an arc (cylinders 0.8 wide, heights 1.6/1.3/1.1/0.9/0.9), a `crown.glb` on
  #1, a billboard name sign on each refreshed every 2 s from `standings(5)` — "1. Alice  14".
  Empty plinths read "your name here".
- [x] A photo frame on the plaza's arena edge: four `WALL_COLOR` boxes making a 4×3 m frame at
  y 21.5–24.5 with "STUMBLEZONE" over it; standing inside its zone triggers `wave` once and shows
  the banner "Say cheese" for 2 s. (No screenshot API in the SDK; the frame is for the phone's own.)
- [x] Sign: "HALL OF FAME - crowns this session".

### Task 5: Sky Cannon (NE plaza)

**Files:** `src/arena/cannon.ts`

- [x] A barrel (cylinder 1.6 wide, tilted 15° towards the arena) on the plaza; stepping onto its
  pad fires `Physics.applyImpulseToPlayer(Vector3.create(-0.25, 1, -0.25), 26)`, `play('boing')`,
  toast "AIRBORNE". You rise ~15 m, see the whole stadium, land back on the plaza or the lane.
- [x] Guard: no fire while a round is live and you are in it.
- [x] A test that the impulse's landing estimate (`v²·sin2θ/g` with the SDK's 9.8) stays inside
  the plaza+lane footprint; tune strength until it does.

---

## Phase 3 — The sky

### Task 6: Sky Course and Sky Box

From the tower's lookout (2.6, 33.2, 12) fourteen platforms climb east over the village to a
glass-floored Sky Box at (32, 46, 15), the best seat in the house. The tower already proved the
step rule; this reuses its lib.

**Files:** `src/config.ts` (`SKY_COURSE`), `src/lib/sky.ts`, `tests/sky.test.ts`, `src/arena/sky.ts`

- [x] `skySteps()`: 14 steps from the lookout, `dx 2.1`, `dy 0.92`, `z` weaving 13.5↔16.5 so the
  line never crosses the ledge (z 5–11) or the jumbotron. Last step is the Sky Box: 8×8 slab with
  a `Material` alpha 0.35 cyan floor, kerbs, a sign "SKY BOX - the drop is on the south side".
- [x] Tests: every gap ≤ 2.4, rise ≤ 1.1; every step z ∈ [13, 17]; top y < 60; no step within
  2 m of the ledge slab (x 22–42, y 35–37, z 5–11).

### Task 7: The Big Drop

**Files:** `src/lib/drop.ts`, `tests/drop.test.ts`, `src/arena/drop.ts`, `src/arena/village.ts`

- [x] Landing pad 6×6 at (32, 20.08, 15.5), concentric rings (yellow 6, pink 3.6, cyan 1.6).
- [x] Lib: `class DropWatch { sample(y, x, z, now); landed(x, z, now): 'perfect' | 'good' | null }`
  — records the max height in the last 3 s; a landing counts if that max ≥ pad + 20 m; `perfect`
  within 0.8 m of centre, `good` within 3 m.
- [x] Arena: zone over the pad; on enter ask the watch; `perfect` → +2 crowns, `play('crown')`,
  confetti 2 s, toast "PERFECT LANDING +2"; `good` → +1 "NICE DROP +1". Guard as always.
- [x] Tests: no credit without height; perfect/good radii; a second landing within 10 s of the
  first does not pay twice.

---

## Phase 4 — Life and glue

### Task 8: Village Errands (the loop that ties it together)

Five errands a visit; each pays one crown, all five pay five more and the title VILLAGER.

**Files:** `src/lib/errands.ts`, `tests/errands.test.ts`, `src/systems/errands.ts`,
`src/lib/titles.ts` (VILLAGER between SURVIVOR and IRONFOOT), `src/arena/lobby.ts`, hooks in
tower/lap/drop/village/hats.

- [x] Errands: `climb` (tower top), `lap` (finish a lap), `stars3` (three stars), `dance`
  (a reaction while `hud.dance`), `hat` (wear one), `drop` (any landing). `class Errands {
  done(id): boolean /* true first time */; count(); complete() }`.
- [x] Board: "ERRANDS 3/6 - next: run a lap". Toast per errand "ERRAND DONE +1".
- [x] Tests: each pays once; completion pays the bonus once; title flips.

### Task 9: A host with something to say

**Files:** `src/arena/host.ts`, `src/lib/tips.ts`, `tests/tips.test.ts`

- [x] An `AvatarShape` at (29, 20, 10.5) facing spawn, `expressionTriggerId: 'wave'` every 20 s,
  a billboard speech bubble 1.2 m above it cycling `tips.ts` lines every 7 s: the schedule
  ("Spotlight in 0:42"), the daily, the errand you are on, "five cheers sets the crowd off", the
  hat you could unlock next. `nextTip(state, i)` is pure and tested: never repeats consecutively,
  prefers the errand line while errands remain.

### Task 10: Sound and spectacle

**Files:** `tools/make-audio.mjs` (+`music-disco`), `src/systems/audio.ts` (Track), `src/arena/village.ts`,
`src/arena/scenery.ts` (`flashPillars(seconds)`), `src/systems/scheduler.ts`

- [x] A 124 BPM disco loop (four-on-the-floor, off-beat hats, octave bass) as `music-disco.mp3`,
  played from an `AudioSource` on the Disco Deck entity, looping, volume 0.6 — spatial, so it
  fades in as you walk over. Manifest test covers it automatically.
- [x] When the crowd goes wild: the 12 pillar caps go emissive white for 4 s and the four
  searchlights double their sweep rate for the same window. Pure cosmetic; one call from the
  scheduler's `consumeWild` branch.

### Task 11: Docs, tests, budget

- [x] `tests/space.test.ts` collects every new footprint; README gets a "The stadium, walked"
  section and the layout table above; TESTING.md a phone checklist per phase; CREDITS.md any new
  models (the plan reuses what is already downloaded except `music-disco`).
- [x] `npm run budget` still under 10 MB total.

---

## Outcome

All eleven tasks shipped on 2026-09-08 (117 tests, 5.6 MB of assets). Deviations, all deliberate:

- Lanes are 5 m wide, not 6: a 6 m west lane put its kerb inside the pillar at 180°. Caught by
  `tests/space.test.ts` before anything was built.
- The sky course weaves one metre (z 14↔15), not three: a three-metre sidestep with a 2.1 m stride
  is a 3.7 m jump. The first four steps ramp from the lookout (z 10.1) into the band.
- The cannon fires straight up (strength 22) rather than leaning towards the arena, so you land
  where you started; a lean risked dropping people into a live round.
- The photo frame's "Say cheese" is a toast, not the HUD subtitle, which the scheduler rewrites
  every frame.
- The host is an `AvatarShape` with a billboard bubble and no NPC library dependency.

## Order and cut line

Do phases in order. Each task is independently shippable. If time runs out, cut from the bottom:
Task 9 (host) → Task 4's photo frame → Task 5 (cannon) → Task 3's light and beam (keep the hex
patch) → Task 10's pillar flash. Never cut: Tasks 1, 2, 6, 7, 8 — they are the space and the loop.

## Phone tuning the executor cannot do

Sky-step and cannon numbers are computed, not felt. After each redeploy: can you make every sky
step from a standing jump; does the cannon land you on the plaza; is the practice beam a nudge and
not a shove. Each is a single constant in `src/config.ts`.
