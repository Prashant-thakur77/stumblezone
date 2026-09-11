# Fall Guys Presentation Pass — Implementation Plan


**Goal:** Make Stumblezone *sound* and *look* like a TV game show — Fall Guys' soundtrack energy, its stinger-per-event sound design, its chunky pill-shaped HUD, and its vinyl-toy stadium — without a single new engine feature or downloaded sample.

**Architecture:** Audio stays fully synthesised in `tools/make-audio.mjs` (music beds rebuilt at 150 BPM in F♯ minor with slap bass, breakbeats and a mid-loop modulation; seven new cues; a crowd bed). The HUD gets a small theme module and three presentational components (`Pill`, `ChunkyText`, `Card`) built from `borderRadius`/`borderWidth`/shadow-offset labels; phase-aware layout comes from one new `hud.phase` field the scheduler already knows. The world gains six CC0 GLBs placed through the existing `decorModel` helper, plus a material pass to glossy vinyl.

**Tech Stack:** `@dcl/sdk` 7.27 (react-ecs, Tween, Animator, AudioSource), Node 22, `node:test`, ffmpeg for MP3.

**Spec:** [docs/FALLGUYS-PRESENTATION.md](../../FALLGUYS-PRESENTATION.md)

## Global Constraints

- No emoji or special glyphs in any Label (Unity explorer has no glyphs).
- Every Label has explicit `width` and `height`.
- Only the CHEER `Button` carries a pointer handler.
- All new models are CC0 from the OpenDCL catalog; bounds measured from the GLB with `tools/measure-glb.mjs`, never trusted from the listing; placed with both collision masks 0.
- Scene stays inside the 4×4 parcel footprint (0–64 m) and under 81 m height (`tests/geometry.test.ts` enforces).
- Audio: cues are WAV, beds are MP3 at 96k; every `Clip`/`Track`/`Voice` name in `src/systems/audio.ts` must have a file (`tests/audio-manifest.test.ts` enforces).
- `npm test` (node:test) and `npm run build` both green before every commit.

---

### Task 1: Audio manifest test + new cue and track names

**Files:**
- Create: `tests/audio-manifest.test.ts`
- Modify: `src/systems/audio.ts`

**Interfaces:**
- Produces: `Clip` gains `'whistle' | 'qualified' | 'fall' | 'squeak' | 'boing' | 'crowd-cheer' | 'crowd-aww'`; `Track` gains `'crowd-bed'`; new export `setCrowd(on: boolean)`.

- [ ] **Step 1: Write the failing test**

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

// Every name the audio module can play must have a file behind it. A missing file is silent in the
// client - no error, no sound - which is the worst kind of failure to find on a phone at 3am.
const src = readFileSync('src/systems/audio.ts', 'utf8')
const union = (name: string) =>
  [...src.matchAll(new RegExp(`export type ${name} =([^\\n]*(?:\\n\\s*\\|[^\\n]*)*)`, 'g'))]
    .flatMap((m) => [...m[1].matchAll(/'([a-z_-]+)'/g)].map((x) => x[1]))

test('every clip has a wav', () => {
  const clips = union('Clip')
  assert.ok(clips.length >= 6)
  for (const c of clips) assert.ok(existsSync(`assets/Audio/${c}.wav`), `missing assets/Audio/${c}.wav`)
})
test('every track has an mp3', () => {
  for (const t of union('Track')) assert.ok(existsSync(`assets/Audio/${t}.mp3`), `missing ${t}.mp3`)
})
test('every voice has an ogg', () => {
  for (const v of union('Voice')) assert.ok(existsSync(`assets/Audio/vo/${v}.ogg`), `missing vo/${v}.ogg`)
})
```

- [ ] **Step 2: Run it** — `npm test` → passes for the current names (baseline).
- [ ] **Step 3: Add the new names** to `Clip` and `Track` in `audio.ts`, plus `VOLUMES` entries. Run `npm test` → **fails** on the missing files (that is the test doing its job).
- [ ] **Step 4:** Task 2 generates the files. Do not commit until Task 2 passes.

---

### Task 2: Rebuild the soundtrack and cues

**Files:**
- Modify: `tools/make-audio.mjs` (music section replaced; cues added)
- Regenerate: `assets/Audio/*.wav`, `assets/Audio/*.mp3`

**Interfaces:**
- Produces files for every name from Task 1.

- [ ] **Step 1: New voices.** Add `slap(freq, seconds)` (square-ish pluck with a 12 ms pitch snap from 1.5× down to 1×), `snare(seconds)` (noise burst + 180 Hz body), `hat(seconds)` (short high-passed noise), `stab(freq, seconds)` (three detuned saws ±0.6 %, fast decay), `squeakVoice(seconds)` (sine 1.6–2.4 kHz with 9 Hz pitch wobble and jitter).
- [ ] **Step 2: Music constants.** `BPM = 150`, root `F#3 = 185.0`, `PROGRESSION = [0, 8, 3, 10]` (i – VI – III – VII over F♯ minor), 16-bar loop, `modulate(bar) = bar >= 8 ? 2 : 0` semitones.
- [ ] **Step 3: Beds.** `roundMusic()` — bass on a syncopated 8-step pattern `[1,0,0,1,0,1,0,1]` playing root/fifth/octave, breakbeat `kick [1,0,0,0,0,0,1,0] / snare [0,0,1,0,0,0,1,0] / hat every 8th (accent every 2nd)`, brass stabs on steps 2 and 6 of every other bar as a minor triad, squeak every 4 bars on step 7. `lobbyMusic()` — same bass at half density, hats only, no stabs. `tenseMusic()` — +2 semitones on top of the modulation, hats every 16th, stabs every bar.
- [ ] **Step 4: Cues.** `whistle` (2.6 kHz sine, 7 Hz tremolo, 0.5 s), `qualified` (stab triad ascending root/3rd/5th then octave held, 0.9 s), `eliminated` (three descending notes E5→C5→A4 with 6 Hz vibrato, 1.0 s — replaces the swoop), `fall` (sine sliding 1400→300 Hz over 0.7 s — slide whistle), `squeak` (squeakVoice 0.18 s), `boing` (sine 90→260→140 Hz with 18 Hz wobble, 0.35 s), `crowd-cheer` (bandpassed noise swelling 0.1 s and decaying over 1.6 s, layered with 40 random short "voice" sines), `crowd-aww` (same noise, pitch-down sine at 300→200 Hz, 0.9 s). Tick becomes three rising pitches? No — `tick` stays one clip; the scheduler already plays it per second; keep it but brighten to a 2-harmonic 740 Hz blip.
- [ ] **Step 5: Crowd bed.** `crowd-bed` — 8 s of low-passed noise with two slow LFOs (0.11 Hz and 0.07 Hz) on gain so it breathes; MP3 loop.
- [ ] **Step 6: Run** `node tools/make-audio.mjs` then `npm test` → audio-manifest passes. Listen with `ffplay` unavailable? Check durations with `ffprobe` instead.
- [ ] **Step 7: Commit** `feat(audio): 150bpm show soundtrack, stingers, crowd`.

---

### Task 3: Wire the cues to events

**Files:**
- Modify: `src/systems/audio.ts` (`setCrowd`), `src/systems/scheduler.ts`, `src/systems/spectator.ts`, `src/arena/rounds/sweeper.ts`, `src/arena/lobby.ts`

- [ ] **Step 1** `audio.ts`: `crowd-bed` is created like the beds but toggled independently with `setCrowd(on)`, volume 0.25 — it sits under the music, not in place of it.
- [ ] **Step 2** `scheduler.ts`: on GO play `whistle` (keep `go` voice); at results `survived ? play('qualified') + play('crowd-cheer') : play('crowd-aww')`; `setCrowd(phase === 'play')`.
- [ ] **Step 3** `spectator.ts`: in `onFall` handler path play `fall` before anything else; `eliminate()` plays the new `eliminated` jingle (name unchanged).
- [ ] **Step 4** `sweeper.ts`: both knockback sites play `squeak`.
- [ ] **Step 5** `lobby.ts`: jump-pad trigger plays `boing`.
- [ ] **Step 6** `npm run build && npm test` → green. Commit `feat(audio): stingers on every event`.

---

### Task 4: HUD theme and components

**Files:**
- Create: `src/ui/theme.ts`, `src/ui/parts.tsx`
- Modify: `src/ui/state.ts` (+`phase: 'intro'|'ready'|'play'|'results'|'idle'`, +`roundTag: string`), `src/ui/hud.tsx`, `src/systems/scheduler.ts` (set `hud.phase`), `src/lib/banner.ts` (+`roundTag`)
- Test: `tests/banner.test.ts` (+roundTag cases)

**Interfaces:**
- `theme.ts` exports `C = { pink, yellow, cyan, navy, plate, white, shadow, green }` as `Color4` and `R = { pill: 22, card: 28 }`.
- `parts.tsx` exports `Pill({text,width,height?,color?,position,show?,fontSize?})`, `ChunkyText({text,fontSize,width,height,color?})`, `Card({children,width,position,color?})`, `Dots({count,max,position})`.
- `banner.ts` exports `roundTag(index: number, finale: boolean): string` → `'ROUND 1 · SURVIVAL'`… / `'FINAL ROUND'`.

- [ ] **Step 1: Failing test**

```ts
test('round tags read like a show card', () => {
  assert.equal(roundTag(0, false), 'ROUND 1  ·  SURVIVAL')
  assert.equal(roundTag(2, false), 'ROUND 3  ·  SURVIVAL')
  assert.equal(roundTag(3, true), 'FINAL ROUND')
})
```
- [ ] **Step 2:** implement `roundTag` in `banner.ts`; `npm test` green.
- [ ] **Step 3:** `theme.ts` + `parts.tsx`. `ChunkyText` = container with two absolutely-positioned Labels: shadow (`C.shadow`, `top: 3, left: 3`) then face. `Pill` = rounded (`borderRadius: R.pill`, `borderWidth: 3`, `borderColor: C.shadow`) plate with a `ChunkyText`. `Dots` = row of 16 px circles (`borderRadius: 8`), filled `C.pink` up to `count`, `C.plate` after.
- [ ] **Step 4:** `hud.tsx` rewritten on the parts:
  - top-centre: round-name pill (navy) with the round tag as a smaller pill above it (gold when finale);
  - top-left: `LIVES` label + `Dots`; top-right: alive pill (cyan) + show-rank pill;
  - clock pill under the name, turns pink when `roundClock <= 15`;
  - centre: `phase === 'ready'` → countdown numeral in `ChunkyText` 160 px cycling yellow/pink/cyan by value; `phase === 'intro'` → `Card` with tag, name (72), hint (30); `phase === 'results'` → splash `Card` pink for QUALIFIED!, blue-grey for ELIMINATED, with the detail line; `play` → banner/subtitle in `ChunkyText` as today;
  - spectator block: yellow CHEER pill button + "SPECTATING" label.
- [ ] **Step 5:** scheduler sets `hud.phase` and `hud.roundTag = roundTag(roundIndex(slot), isFinale(slot))`.
- [ ] **Step 6:** `npm run build && npm test`. Commit `feat(ui): show-card HUD with pills, chunky text and splashes`.

---

### Task 5: Models and materials

**Files:**
- Create: `tools/measure-glb.mjs`
- Download: `assets/Models/{crowd,small-light-beam,full-rainbow-animation,star,lollipop,lolli-face-smile,deco03,deco04}.glb`
- Modify: `src/arena/models.ts`, `src/arena/scenery.ts`, `src/arena/lobby.ts`, `src/arena/tiles.ts`, `src/config.ts` (+`CROWD_SPOTS`, `SEARCHLIGHT_SPOTS`), `docs/CREDITS.md`
- Test: `tests/geometry.test.ts` (+spots inside bounds and under height cap)

- [ ] **Step 1:** `measure-glb.mjs` — parse GLB JSON chunk, take `accessors[].min/max` for every mesh primitive POSITION, apply node scale, print size + min/max. Run on each download; check magic bytes `glTF`.
- [ ] **Step 2: Failing test** — `CROWD_SPOTS` and `SEARCHLIGHT_SPOTS` every `x,z ∈ [2,62]`, `y < 81`.
- [ ] **Step 3:** config spots: 8 crowd spots on the pillar ring at radius `ARENA_RADIUS+2`, `y = ARENA_Y+6`; 4 searchlights at the corners `(6,y,6) (58,y,6) (6,y,58) (58,y,58)`, `y = GROUND_Y`.
- [ ] **Step 4:** builders — `buildCrowd(pos, faceCenter)` (Animator `Curve.015Action`, Billboard BM_Y not needed — rotate to face centre), `buildSearchlight(pos)` (tilt 25°, `Tween RotateContinuous` speed 8 around Y via a parent pivot), `buildRainbow(pos)` (Animator `AllOn`), `buildStar(pos)` (Animator `CylinderAction`), `buildLolli(pos)` (lollipop + face child), `buildInflatable(src,pos,scale)`. Scales from measured bounds.
- [ ] **Step 5:** place: scenery → crowd ×8, searchlights ×4, rainbow behind the far edge (`z ≈ 62`, facing −z); lobby → stars on the three podium spots and on each jump pad, lollipops flanking the spawn, pig + animal in the lobby corners.
- [ ] **Step 6:** material pass — `tiles.ts` roughness 0.35 + `specularIntensity: 1`; lobby slabs 0.45; scenery pillars 0.5.
- [ ] **Step 7:** `npm run build && npm test`; total scene size `du -sh assets` < 36 MB. CREDITS updated. Commit `feat(world): stadium crowd, searchlights, rainbow, toys, vinyl materials`.

---

### Task 6: Docs
- [ ] README "What it looks and sounds like" paragraph; VISION.md presentation section pointing at the spec; CREDITS. Commit `docs: presentation pass`.

## Self-review
- Spec coverage: soundtrack (T2), sound design (T2–3), HUD (T4), world + materials (T5). ✔
- Names used across tasks: `setCrowd`, `roundTag`, `hud.phase`, `hud.roundTag`, `Pill/ChunkyText/Card/Dots`, `CROWD_SPOTS/SEARCHLIGHT_SPOTS` — consistent. ✔
