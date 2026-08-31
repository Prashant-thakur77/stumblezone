# Stumblezone — architecture and DCL docs map

Written 2026-08-31. This file replaces the dangling reference in [BRIEF.md](BRIEF.md) §4
("full networking detail is in the Bloop's Pond plan") — everything needed is now here — and it
upgrades the architecture with the serverless-scheduler insight from the repo setup session.
**Where this file and BRIEF.md §4 disagree, this file wins.**

---

## 1. The architecture, serverless-first

Three layers, but the dependency direction is now inverted: the game is fully playable with zero
backend, and persistence is an optional layer on top. A backend outage during judging week degrades
leaderboards, never the game. That satisfies the "persistent standalone, no host required"
requirement (submission requirement #3) about as hard as it can be satisfied.

### Layer 0 — platform freebies

Everyone in the same World instance already sees avatars, nametags, text chat, and voice.
Co-presence costs zero code.

### Layer 1 — the deterministic scheduler (pure client math, no server)

Round scheduling is a function of UTC time, computed identically on every client:

```ts
SLOT_SECONDS = 120
slot      = floor(Date.now()/1000 / SLOT_SECONDS)
roundType = slot % 5          // A, B, C, D, lobby-break
seed      = hash(slot)        // e.g. splitmix/xxhash of the slot number
phase     = elapsed within slot → countdown / play / results
```

Five slots of 120s = a 10-minute cycle.

Everything random in a round derives from that seed through a seeded PRNG (mulberry32 is 4 lines):

- **Perfect Match:** fruit assignment per tile, target sequence, wave timings
- **Tip Toe:** which tiles are fake
- **Sweeper Gates:** wave speeds and gap offsets (motion position = `f(seed, elapsed)`, so a
  late-joining client renders walls in the correct mid-flight position)
- **Hex-Drop:** layout is static; only player-caused decay needs real sync

**Clock skew:** phones are NTP-synced, typically within a second. Absorb the residue with a
5-second "get ready" freeze at every round start, judge inputs locally, and never gate anything on
sub-second cross-client agreement. If paranoia strikes later, one fetch to any HTTP `Date` header at
scene load gives an offset correction — but ship without it first.

### Layer 1b — in-round sync between present players

`@dcl/sdk/network` message bus (plus `syncEntity` where a visual should be identical for everyone):

```ts
eliminated { slot, address }
finished   { slot, address, ms }
tile       { slot, tileId }        // Hex-Drop step decay only
cheer      { emoteId }
```

**Join mid-round:** derive the full board from seed + elapsed, apply any `tile` events received, and
if it's Hex-Drop past the join window, spectate until the next slot. Docs: the serverless-multiplayer
page in §2 below.

### Layer 2 — optional persistence (crowns, dailies, ghosts)

Three options, now genuinely optional:

- **Option A:** Decentraland's Multiplayer Server (authoritative-servers doc; live data panel under
  Creator Hub → Operate live → Server Data). Judge-aligned, zero hosting.
- **Option B:** ~200-line Node server — Express REST + `ws`, SQLite, free tier on Render/Fly with a
  keep-alive ping so it doesn't sleep during judging. Identity via signed fetch so reports are
  wallet-verified.
- **Option C:** none. Crowns live in the session via message bus; boards reset when the last player
  leaves. This is the new bottom of the cut order — a legitimate shipped game exists even here.

If Layer 2 exists, its whole API is `GET /boards` and `POST /result {slot, roundType, placement, ms}`,
signed. Sanity checks server-side: one report per slot per address, finish time at least the
theoretical par. **Timebox the A-vs-B decision to half a day**; the scheduler no longer waits on it.

### What this changes in BRIEF.md

- §4's "server publishes `{roundId, seed, startsAt}`" is **superseded**: nothing publishes the
  schedule, clients compute it.
- Phase 2 in the build order shrinks to "implement slot math + bus sync" (roughly half a day), and the
  Layer 2 decision slides to Phase 5, where boards are built.
- Cut order gains Option C before "daily challenge."

---

## 2. Decentraland docs — the complete reading map

Master index: `docs.decentraland.org/llms.txt` lists every page. Append `.md` to any docs URL for
clean markdown. Any page answers questions directly: `GET <url>.md?ask=<question>`. Point Claude Code
at `llms.txt` in Phase 0, and install the official AI skills: `npx skills add decentraland/sdk-skills`
(see the vibe-coding page).

Base URL for all paths below: `https://docs.decentraland.org/`

**Read before writing code (Phase 0):**

- `creator/scenes-sdk7/getting-started/` — sdk-101 · dev-workflow · coding-scenes · using-the-cli · preview-scene
- `creator/scenes-sdk7/getting-started/` — vibe-coding · useful-resources
- `creator/scenes-sdk7/designing-the-experience/` — design-games · mvp-guidelines · ux-ui-guide
- `creator/scene-editor/get-started/` — editor-installation · scene-editor-essentials

**Core SDK (Phases 1–5):**

- Architecture: `creator/scenes-sdk7/architecture/` — entities-components · systems · custom-components · querying-components · subscribe-to-changes · data-oriented-programming
- Interactivity: `creator/scenes-sdk7/interactivity/` — button-events/click-events · register-callback · system-based-events · advanced-button-events · proximity-events; event-listeners · player-avatar · user-data · runtime-data · touch-screen-controls (On-screen Controls) · raycasting · player-physics
- 3D essentials: `creator/scenes-sdk7/3d-content-essentials/` — shape-components · colliders · materials · entity-positioning · move-entities · 3d-model-animations · trigger-areas · sounds · text · particle-system · lights · camera
- UI: `creator/scenes-sdk7/2d-ui/` — onscreen-ui · ui-positioning · ui_background · ui_button_events · ui_input_binding · ui_special_types · ui_text · dynamic-ui
- Patterns: `creator/scenes-sdk7/programming-patterns/` — game-objects · async-functions · mutable-data

**Networking (Phase 2 and Phase 5):**

- `creator/scenes-sdk7/networking/serverless-multiplayer` ← the message bus + `syncEntity` page, **now the core dependency**
- `creator/scenes-sdk7/networking/` — authoritative-servers (Multiplayer Server) · third-party-servers · network-connections
- `creator/scene-editor/operate-live/server-data`
- `contributor/authentication/signed-fetch` and `contributor/scene-runtime/runtime-modules/signed-fetch`

**Mobile (continuous, dedicated pass in Phase 6):**

- `creator/build-for-mobile/mobile-client/` — overview · sample-scenes · missing-features · hardware-requirements
- `creator/build-for-mobile/develop/` — detect-platform · preview-on-mobile · safe-area · ui-best-practices · input-on-mobile · optimize-performance
- `creator/build-for-mobile/publish/` — get-featured (the Mobile Discover prize) · ios-curation
- Player side: `mobile-app/` — getting-started · controls · troubleshooting

**Optimization and debugging (Phase 6):**

- `creator/scenes-sdk7/optimizing/` — performance-optimization · scene-limitations · pre-load-resources
- `creator/scenes-sdk7/debugging/` — debug-in-preview · debug-in-prod · troubleshooting

**3D assets (asset passes in Phases 7–8):**

- `creator/3d-modeling-and-animations/` — 3d-models · meshes · materials · textures · colliders · animations

**Scene config, publishing, post-launch (Phase 0 and Phase 8):**

- `creator/scenes-sdk7/kinds-of-projects/` — scene-metadata (worldConfiguration, spawnPoints, thumbnail, age rating) · scene-files · kinds-of-project (size limits)
- `creator/scenes-sdk7/publishing/` — publishing · publishing-options · make-discoverable
- `creator/scene-editor/publish/publish-scene` — conversion status; final deploys take 30–60 min to be reliably playable
- `creator/scenes-sdk7/other/scene-analytics` — retention numbers for the grant pitch
- `creator/scenes-sdk7/libraries/` — manage-dependencies · libraries
- Roadmap only: `creator/rewards/` — overview · getting-started · integrations

**Skim so nothing is missed, not needed for this build:** smart-items pages, wearables-and-emotes,
the blockchain section, smart-wearables, portable-experiences, contributor internals, the APIs reference.

---

## 3. Deployment facts that matter

- A World needs a Decentraland NAME (100 MANA) or any ENS domain. **ENS Worlds:** 36 MB storage cap,
  up to 100 concurrent users — plenty. **NAME-based Worlds** draw from a storage budget (100 MB per
  NAME, +100 MB per LAND, +100 MB per 2,000 MANA held).
- `scene.json` needs `worldConfiguration: { name: "yourname.dcl.eth" }` (or the ENS name), plus
  spawnPoints, title, description, thumbnail, rating.
- Deploy: Creator Hub → Publish to World, or
  `npm run deploy -- --target-content https://worlds-content-server.decentraland.org`.
- Enter: `decentraland://?realm=NAME.dcl.eth`, or `/goto NAME.dcl.eth` in the chatbox.
- Auto-deploy via GitHub Actions works with a `DCL_PRIVATE_KEY` secret — use a **disposable wallet
  given deploy rights**, never the wallet that owns the NAME/ENS.
- The World must stay up Sep 5–11. If Layer 2 is Option B, keep-alive the free-tier host; with the
  serverless scheduler, even a dead backend leaves the game running.
