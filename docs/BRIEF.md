# Stumblezone — Fall Guys-style party gauntlet for the Friendzone Buildathon
### Plays solo, with one friend, or with a crowd · deadline Sep 4 (extended Sep 11), 2026

---

## 0. Hackathon context — everything that matters from the official page

Event: Decentraland Friendzone Mobile Buildathon, run by DCL Regenesis Labs (the execution arm of the Decentraland DAO), hosted on DoraHacks: dorahacks.io/hackathon/friendzone. Virtual, 147 hackers registered, teams allowed, all projects must be open source (GitHub/GitLab/Bitbucket link required at submission).

The brief, in their words: turn your Decentraland World into the Friendzone no one wants to leave — a social hangout, multiplayer activity, cooperative challenge, or competitive game that feels intentionally designed for mobile from the start and gives people a reason to connect, stay longer, invite friends, and return regularly.

Timeline:
- Kickoff and build phase: Aug 14, 2026
- Build phase: Aug 14 – Sep 4 (three weeks)
- Submission deadline: Sep 4, 2026 — extended to Sep 11
- Judging: Sep 5–11 (the World must stay publicly accessible this whole week)
- Winner reveal and closing event: Sep 13

Prizes ($8,000 MANA pool): 1st $3,000, 2nd $2,000, 3rd $1,500, 4th $1,000, 5th $500 — all paid in MANA. Also: the first 50 eligible participants with a valid submission get a $30 Decentraland merch voucher, every eligible submission earns a Friendzone profile badge, and the top 10 projects may be featured in the Decentraland Mobile App's Discover section (subject to technical compatibility and continued accessibility).

Submission requirements — every project must:
1. Be a scene deployed in a Decentraland World and remain publicly accessible throughout judging
2. Create meaningful social interaction through environments, gameplay, activities, or social systems
3. Work as a persistent standalone experience — no scheduled event, host, performer, or moderator required
4. Be designed and tested for mobile devices, touch controls, and small screens
5. Be open source in a public GitHub repository
6. Be submitted through DoraHacks before the deadline
7. Be original and not used in past Decentraland competitions
8. Comply with the Friendzone T&C and Decentraland's Terms of Use

Empty venues and single-player experiences without a meaningful social component are not eligible.

Judging criteria, seven of them: mobile-first experience (designed for mobile, not adapted from desktop), social value (interaction, cooperation, competition, communication, shared participation), mobile UX and accessibility (controls, interfaces, text, onboarding for touch and small screens), performance and optimization (loads and runs smoothly within mobile limits), creativity and originality, retention and discovery value (reasons to return, share, invite), and overall execution (complete, stable, coherent, feature-ready). Their own framing: a simple, polished, enjoyable mobile experience may score higher than a technically complex project that performs poorly or lacks social interaction. Every eligible project is tested directly in the Decentraland Mobile App.

Support during the build: live workshops on Creator Hub workflows, mobile building and testing, UX/touch/performance, concept feedback, and deployment/GitHub/submission help — recordings shared after each session, plus a dedicated Friendzone channel in the Decentraland Discord. Use that channel for World NAME questions and live feedback on the build.

Official developer resources linked from the hackathon page (full URLs live in §5–§6 of this plan and in the docs map): Creator Hub and its AI skills, the DCL apps (Android/iOS/desktop), docs for scene quickstart, basic UI, player interaction, multiplayer server, mobile preview, sample mobile scenes, mobile UI, mobile performance, custom mobile controls, and publishing; the OpenDCL asset catalog (8,800+ free 3D assets added by Regenesis Labs), Genesis Plaza assets and Stom's asset repo, Decentraland Tools for Blender, the Blender MCP server, the Scene Optimizer, and the multiplayer server leaderboard example.

After the buildathon: promising submissions may be picked for incubation through the DCL Regenesis Labs Grants Program Season 2 and the Decentraland Foundation Creator Success Program — worth a roadmap paragraph in the README.

---

## 1. The concept

One arena, four Fall Guys-style rounds, cycling automatically on a fixed schedule forever. No host, no minimum players. Walk in at any moment and the board tells you "Perfect Match starts in 0:42". Survive rounds to earn crowns; crowns feed a daily leaderboard.

The trick that makes it work solo AND multiplayer: every round is a survival challenge against the arena, not against other players directly. With 8 players it's an elimination race for crowns. With 2 it's you and your friend cheering and trash-talking. Alone it's score attack against your personal best and the ghost times on the board, so a judge testing at 3am still has a complete game. Other players make it funnier, never mandatory.

Name: Stumblezone (Stumble Guys × Friendzone). Players are their own DCL avatars, which kills the biggest Fall Guys production cost: characters, costumes, and animations arrive free with every visitor.

---

## 2. The four rounds (all DCL-feasible, zero physics engine)

Every round uses only things the SDK gives us cheaply: tweened entities, collider toggles, trigger areas, texture swaps, and the avatar's built-in walk/jump. Nothing here needs server physics.

### Round A — Perfect Match (memory tiles)
5×5 tile grid over a pit. Tiles flash fruit textures for 5 seconds, then go blank. The board announces a target fruit, 3-2-1, and every wrong tile drops its collider and sinks for 2 seconds. Stand on the right fruit or fall. Three escalating waves per round (more fruits, shorter memory time). Falling teleports you to the spectator ledge (multiplayer) or costs one of three lives (solo).
Tech: MeshRenderer material swaps, collider on/off, one tween per sinking tile. The fruit sequence comes from a per-round seed, so every client computes identical tiles from one shared number.

### Round B — Sweeper Gates (Block Party)
A platform; wide low walls with door-sized gaps slide across it on tweens, faster each wave. Touching a wall's trigger zone doesn't shove you (no physics jank on mobile), it teleports you 3m back and dings one of three hearts. Zero hearts = spectator ledge. Survive 60 seconds.
Tech: 3–4 wall entities on looping tweens, TriggerArea per wall, wave speed table. All motion derived from server round-start time, so clients stay in sync without traffic.

### Round C — Tip Toe
A 4-tile-wide bridge to the goal; roughly half the tiles are fake and sink 0.4s after someone stands on them. Fallen tiles stay gone for the whole round, which is the social genius of this level: whoever goes first sacrifices themselves to reveal the path for everyone behind. First finisher gets bonus crowns so there's still a reason to lead.
Tech: identical to Perfect Match tiles; path layout from the round seed.

### Round D — Hex-Drop (the finale)
Two stacked layers of hexagon tiles; each tile vanishes half a second after being stepped on. Fall through both layers and you're out. Last player standing takes the crown; solo, it's a survival timer against the board's ghost times.
Tech: ~180 hexes per layer from one shared mesh, step detection by position-over-tile check each frame, despawn broadcast by tile id (or seeded decay, but this one genuinely needs per-step sync since players cause it).

Stretch round (only if day 9 is free) — Jump Bar: a slow rotating beam sweeps a circular pad, jump over it or get dinged. One tweened rotator plus a trigger.

### The meta loop
Rounds fire on UTC wall-clock, computed client-side with no server: 120-second slots, `slot % 5` selects A, B, C, D, lobby-break — a 10-minute cycle. See [ARCHITECTURE.md](ARCHITECTURE.md) §1. Between rounds everyone lands in a small lobby with the crown board, emote podium for the last winner, and the schedule. Crowns: survive = 1, top-3 = 2, win = 4, first-finisher bonuses. Daily crown leaderboard, all-time board, win streaks, personal bests per round. Daily challenge line on the board ("win Perfect Match without losing a life") for the comeback trigger.

---

## 3. Judging criteria check

- Mobile-first: walk + one jump button, both native mobile controls. No aiming, no camera skill. Wide gaps and generous timers tuned for touch imprecision.
- Social: shared spectacle rounds, spectator ledge with a view (eliminated players watch and heckle in voice), Tip Toe's sacrificial pathfinding, podium emote moment, crown races between friends.
- Mobile UX: countdowns and round names in huge center-screen text, safe-area layout, three-line onboarding sign.
- Performance: one arena, instanced tiles from shared meshes, one texture atlas, tween-driven motion. Comfortably inside mobile budgets.
- Creativity: competitors in the BUIDL list have obbies and arenas; nobody has an auto-cycling multi-round gauntlet with a solo score-attack mode.
- Retention: daily crowns, daily challenge, PBs and ghost times, the schedule itself ("Hex-Drop is in 3 minutes, wait for it").
- Execution: four rounds sharing one tile system is a small codebase pretending to be a big game. That's the point.

Hostless check: the scheduler is pure UTC math on each client — no server owns it. The arena cycles for an audience of zero, and keeps cycling even if the optional persistence layer is down.

---

## 4. Architecture (condensed — **full detail, and the authoritative version, is in [ARCHITECTURE.md](ARCHITECTURE.md)**)

> **Superseded in one place:** this section originally had a server publishing
> `{roundId, type, seed, startsAt}`. It doesn't. The schedule is derived from UTC on every client,
> and the backend became optional. ARCHITECTURE.md §1 is the version to build from.

Three layers, dependency direction inverted. **Layer 0** free from the platform (avatars, chat, voice).
**Layer 1** the deterministic scheduler — pure client math over UTC slots, no server — plus, in-round,
`syncEntity` + the message bus from `@dcl/sdk/network` for eliminations, hex despawns, and celebration
events. **Layer 2** optional persistence for crowns, dailies and ghosts: Decentraland's Multiplayer
Server, a ~200-line Node ws server, or nothing at all (session-only crowns). The game is complete and
playable with Layer 2 absent.

The one idea that keeps net traffic near zero: determinism from seeds. `seed = hash(slot)`, and every
client derives identical tile layouts, fruit sequences, and wall timings from it plus elapsed time in
the slot. The only per-player traffic is `eliminated`, `finished{ms}`, and Hex-Drop's `tile{tileId}`.
If a persistence layer exists, crowns are validated server-side from those reports (finish time >=
theoretical par, one report per slot per address via signed fetch).

Client module map:

    src/
      index.ts             // boot, scene setup
      arena/
        lobby.ts           // podium, boards, schedule sign
        tiles.ts           // shared tile system: grid spawn, collider toggle, sink tween
        rounds/
          perfectMatch.ts  // uses tiles.ts + material swaps
          sweeper.ts       // walls, waves, hearts
          tipToe.ts        // uses tiles.ts + persistence within round
          hexDrop.ts       // hex grid + step detection
        scheduler.ts       // UTC slot math + seeded PRNG + round state machine
      ui/
        hud.tsx            // countdown, hearts, round banner, jump hint
        boards.tsx         // crowns, ghosts, daily challenge
      net/
        client.ts          // OPTIONAL Layer 2: signed fetch + ws (or Multiplayer Server SDK)
        sync.ts            // messageBus + syncEntity wiring
      systems/spectator.ts // ledge teleport, cheer emotes

Roughly 60% of the code is `tiles.ts` and the scheduler; the four rounds are thin configs on top. That's why four rounds fit in eleven days.

---

## 5. Reference repos (what to take from where)

| Repo | What to take |
|---|---|
| github.com/FrankBonanno/fall-guys-discord | Hex-A-Gone tile decay logic in React Three Fiber; the timing values that make it feel right. |
| github.com/amaan-bhati/r3f-fallguys | Web multiplayer Fall Guys in Three.js/R3F; how a browser build handles round flow and player sync. |
| github.com/veroblancos/Ultimate_Game_Party | The closest DCL-native base: SDK7 Squid Game-style elimination rounds. Study its round transitions and elimination handling first. |
| github.com/tensaix2j/decentraland_ninja_ball_parkour_multiplayer | DCL multiplayer platforming from the DCLGX 2024 winner's author; moving-platform patterns that behave on real clients. |
| github.com/JollyGrin/dcl-sdk7-tag | Minimal SDK7 message-bus multiplayer loop, the template for our sync.ts. |
| github.com/decentraland/sdk7-goerli-plaza | Official SDK7 idioms: tweens, triggers, UI, timers. Copy freely. |
| github.com/decentraland-scenes/wondermine-sdk7 (Apache-2.0) | Daily-loop, streaks, and server-validated leaderboard architecture. |
| github.com/decentraland-scenes/Land-Flipper-Game | Scene+server split and minimal ws protocol for a DCL game. |
| github.com/spatialsys/spatial-obby-template | Obby template (scripts + assets) for Spatial, DCL's closest cousin; checkpoint and kill-zone patterns translate almost 1:1. |
| github.com/GameabillityOnYt/obbying-revival-project | Open project rebuilding Roblox-style obbying outside Roblox; level-design conventions for touch-friendly courses. |
| github.com/SnipFernandez/FallGuysInUnityReplica · github.com/AbdullahAskin/FallGuys · github.com/94mark/unity-clone-project-FallGuys · github.com/RepahidiS/Fall-Bois | Unity Fall Guys replicas (Fall-Bois is mobile): round pacing, wave speed curves, camera framing. Design reference only. |
| github.com/Gevorez/HotTiles_UE5 | Hot-tiles floor variant, wave escalation ideas. |
| github.com/panwar8279/Multiplayer-Memory-Match | Websocket memory-match round logic for Perfect Match. |
| github.com/wass08/r3f-playroom-multiplayer-shooter-game | Wawa Sensei's multiplayer character sync in R3F; clean reference for interpolation thinking. |
| github.com/Namr/SuperVolleyball | A networked Mario Party minigame; small, readable netcode. |
| github.com/decentraland-scenes/moving-platforms | Official platform-movement patterns — the base for Sweeper Gates walls. |
| github.com/decentraland-scenes/rotating-platforms | Rotating platform patterns — the base for the Jump Bar stretch round. |
| github.com/decentraland-scenes/switchboard-platforms | Platform reacts when a player stands on it — the exact step-detection pattern for Hex-Drop and Tip Toe tiles. |
| github.com/decentraland-scenes/Leader-Board | The official leaderboard scene; pair with wondermine's server validation. |
| github.com/decentraland-scenes/Remote-door | REST-synced scene state in its smallest form. |
| github.com/decentraland-scenes/Block-Fountain | P2P sync micro-example. |
| github.com/decentraland-scenes/websocket-frisbee | Websocket position sync between players. |
| github.com/decentraland-scenes/beer-dispenser | P2P object messaging between players. |
| github.com/decentraland-scenes/Awesome-Repository | Index of every official example scene — check here before building anything from scratch. |

Note on the decentraland-scenes examples above: most are SDK6-era. Read them for the pattern, then write SDK7 with goerli-plaza syntax (or let Claude Code translate — the migrate-legacy-sdk6-scenes doc covers exactly this).

The Friendzone competitor repos (tower-obby, SkyBounce, arena-lounge, slipstream and friends) are the field to beat, and per the buildathon's originality rule they stay read-only.

---

## 6. Assets — the Fall Guys look without Fall Guys files

The vibe is chunky, bright, toy-plastic low-poly. Four CC0 sources cover the whole arena:

- kenney.nl — Platformer Kit, Prototype Textures (the classic dev-grid look, genuinely stylish for arenas), Food Kit (fruit for Perfect Match), UI Pack, and all sounds/particles. Everything CC0.
- quaternius.com — Ultimate Platformer Pack and props: ramps, spinners, hazards, coins. CC0.
- KayKit (kaylousberg.itch.io) — platformer and dungeon packs, same chunky style. CC0.
- poly.pizza — searchable CC0 aggregator when a specific prop is missing.

Plus the buildathon's own pipeline, exact repos:

- github.com/dcl-regenesislabs/opendcl — the OpenDCL catalog (8,800+ free GLBs, maintained by the org judging you)
- github.com/decentraland-scenes/Genesis-Plaza — full source of the revamped Genesis Plaza, models included
- github.com/stom66/dcl-genesis-plaza-assets — Stom's Genesis Plaza asset repository from the resources list
- github.com/decentraland/builder-assets and github.com/decentraland/asset-packs — official Builder/editor asset packs
- github.com/decentraland/SceneOptimizer — official GLB texture dedupe/compression, run before every deploy
- github.com/ahujasid/blender-mcp — drive Blender from Claude Code for custom pieces (hex tile, sweeper walls, crown trophy)
- github.com/stom66/blender-addon-dcl-collider-toolkit — DCL collider setup inside Blender
- github.com/diegodorado/blend2decentraland — Blender-to-DCL scene export addon

Confetti and crown fanfare from Kenney's particle and audio packs.

Budget: one 512 atlas for tiles and walls, Bloop-free scene means the whole arena should land under ~80k triangles. Keep every round's props pooled and reused across cycles.

---

## 7. Build order — work continuously, ship when green

Each phase has a done-check. Move on only when it passes; the order exists because every phase leans on the one before it.

Phase 0 — foundations. Creator Hub, repo, World access (NAME / ENS domain / ask the Friendzone Discord if participant NAMEs are provided). Deploy a cube and open it in the mobile app on your actual phone. `npx skills add decentraland/sdk-skills`. Greybox the arena and lobby with Kenney prototype textures.
Done when: you can walk the greybox on your phone in the live World.

Phase 1 — core tile tech. tiles.ts (grid spawn, collider toggle, sink tween, seeded layouts) plus the scheduler state machine running on local time. Build Perfect Match on top of it.
Done when: you can win and lose Perfect Match alone in preview.

Phase 2 — networking (now ~half a day). Implement the UTC slot math and seeded PRNG, plus message-bus sync for `eliminated` / `finished` / `tile`. No backend decision needed here — it moved to Phase 5.
Done when: two browser windows show the same round at the same moment, and a client joining mid-round renders the correct board state.

Phase 3 — elimination and the finale. Hex-Drop (step detection, tileStepped sync), spectator ledge, server-side elimination reports, crowns v1.
Done when: two clients finish a full Hex-Drop and the winner's crown shows on both.

Phase 4 — remaining rounds. Sweeper Gates and Tip Toe, both thin configs on the systems that already exist.
Done when: the 4-round cycle runs unattended for an hour without breaking.

Phase 5 — meta layer. Decide persistence (Multiplayer Server vs own ws server vs session-only — timebox to half a day), then boards (daily crowns, ghosts, streaks, daily challenge), podium moment, solo lives and score-attack mode.
Done when: a solo session feels like a complete game.

Phase 6 — mobile pass. Safe area, jump button mapping, text sizes, FPS profiling, all with the build-for-mobile docs open.
Done when: stable FPS and comfortable tapping on the worst Android you can borrow.

Phase 7 — juice and playtest. Confetti, fanfares, countdown drama, elimination whoosh. Then a 6-person phone playtest with GDG friends; fix what confused them and tune wave speeds from what you watched.
Done when: playtesters replay without being asked to.

Phase 8 — ship. Feature freeze. Final deploy (allow 30–60 min for asset conversion before it's reliably playable), scene.json metadata and thumbnail, README structured around the seven judging criteria, a 2-player phone-captured demo video, CREDITS.md, DoraHacks submission — submit with room to spare, then keep the World live through the whole judging window. Schedule two "crown rush hours" on the DCL events page and post the World in the Friendzone Discord so judges can walk into a live crowd.

Cut order if time runs short: Jump Bar, persistence (fall back to session-only crowns), daily challenge, Tip Toe, ghost times. Never cut: the scheduler, Perfect Match, Hex-Drop, the crowns board, mobile polish.
