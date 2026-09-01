# Beyond Fall Guys — what else Stumblezone should add to win, and how

Design, 2026-09-02. Deadline 2026-09-11 (judging 09-05 → 09-11, World must stay live).
Nine days, one developer, phone testing by hand. Everything here is ranked by **score-per-hour
against the seven judging criteria**, not by how cool it is.

The brief's own framing decides the ranking: *"a simple, polished, enjoyable mobile experience may
score higher than a technically complex project that performs poorly or lacks social interaction"*
and *"every eligible project is tested directly in the Decentraland Mobile App"*. So: what a judge
sees on a phone in ten minutes, alone or with one colleague, is the whole game.

---

## 0. Where we stand — the honest ten-minute-judge audit

| Criterion | What the judge meets today | Gap |
|---|---|---|
| Mobile-first | walk + jump only, big HUD, `screenInset` | **`borderRadius` does not render on mobile** — every pill and card in the new HUD is a rectangle on the judging device. Must fix. |
| Social value | shared rounds, ledge + CHEER, Tip Toe sacrifice, crowns, podium | Nothing tells you *who* is doing what. No names in play, no feed, nothing visible happens when someone cheers, the leader looks like everyone else. |
| Mobile UX / accessibility | three-word hints, intro card, dots not glyphs | Colour is the only signal in Perfect Match; no colour names. No first-visit orientation beyond the sign. |
| Performance | 448 pooled entities, tweens, 3.5 MB | Fine. Not measured in a way the README can prove. |
| Creativity | auto-cycling show, solo-complete, seeded fairness | The four rounds are all recognisable Fall Guys rounds. Nothing here is *ours*. |
| Retention / discovery | crowns, PBs, schedule board | No reason to come back *tomorrow* and no reason to come back *at a time*. Nothing to share. |
| Execution | tests, docs, stable | Not deployed. Never phone-tested with two people. No thumbnail/video/submission text. |

---

## 1. The additions, ranked

Effort is my hours. Risk is the chance it breaks something that already works on a phone.

### Track 0 — Deploy first (you, 30 min) — *execution*
Deploy what exists **today** to `justchatting.dcl.eth`. Every track below redeploys on top. The
World must be live for the whole judging window and asset conversion takes up to an hour; nothing
is more valuable than the scene existing on 09-05.

### Track 1 — Mobile truth fixes (3 h, risk: none) — *mobile-first, UX*
1a. **Pill and card textures.** `borderRadius` is unsupported on mobile and nine-slice mode is
    not on mobile either, so rounded shapes must be **PNG textures with `textureMode: 'stretch'`**
    and a `color` tint. A tiny PNG writer in `tools/make-ui.mjs` (zlib only, no dependencies, same
    spirit as `make-audio.mjs`) emits `images/ui/pill.png` (512×128, full-radius ends), `card.png`
    (512×256, r=48) and `dot.png` (64×64 circle). `Pill`/`Card`/`Dots` in `src/ui/parts.tsx` switch
    to `uiBackground: { texture, textureMode: 'stretch', color }`; the dark outline becomes a
    second, 3 px larger shadow copy of the same texture underneath (which also gives the hard drop
    shadow the Fall Guys HUD has). Test: a manifest test that every texture referenced in
    `parts.tsx` exists.
1b. **Mobile virtual screen.** On mobile a 16:9 virtual size is overridden to **1600×720**.
    The layout is percentage-based so it survives, but the fixed-px pills get ~1.2× larger; verify
    on the phone and trim `fontSize`s, not layout.
1c. **Colour names.** Perfect Match's jumbotron and PlayBanner say the colour's *name*
    ("STAND ON LIME"), not just the swatch. `FRUIT_COLORS` gains a `name`. Colour-blind safe and
    also reads better in sunlight.

### Track 2 — Everyone sees everyone (6 h, risk: low) — *social value*
The message bus already carries `eliminated`, `finished`, `cheer`. Nothing *shows* them.
2a. **Elimination feed.** A three-line toast stack bottom-left: "Bob went down", "Alice finished
    first!", "You outlasted Bob". Source: `onEliminated`/`onFinished` + `displayName`. HUD state
    `feed: { text, until }[]`, pruned each frame. Pure formatting in `src/lib/feed.ts`, tested.
2b. **Hype meter.** Every CHEER anyone sends bumps a `hype` counter on every client (message bus,
    cosmetic so divergence is harmless). Jumbotron shows `HYPE 12`; five cheers inside ten seconds
    fire `crowd-cheer` + a confetti flash for *everyone*, so spectators visibly affect the show.
    Live players see "THE CROWD IS GOING WILD" for two seconds. Logic in `src/lib/hype.ts`, tested.
2c. **Results emote bar.** During the 15 s results phase, three buttons — DANCE / CLAP / SHRUG
    (`triggerEmote` `disco` / `clap` / `shrug`) — for everyone, not only the eliminated. The lobby
    dances together after every round. This is the single cheapest "people interact" beat.
2d. **The leader wears the crown.** `AvatarAttach` a 0.4-scale `crown.glb` to `AAPT_HEAD` of the
    show leader's address. Each client attaches locally, computed from the *shared* crown tally
    (already merged by `mergeStandings`), so no extra sync: every client agrees who leads. Re-run
    at every results phase; requires ≥2 players seen and ≥1 crown. Streak halo: a 0.5-scale
    `star.glb` on `AAPT_NAME_TAG` for anyone who qualified three rounds running.
2e. **Names in the field.** The top-right pill on results expands to `IN: you, Alice, Bob` (max
    four names, then `+N`). "3 IN" becomes people, not a number.
2f. **Rivalry line.** On results, if another player was eliminated within 10 s of you (either
    side), the subtitle says "You outlasted Alice by 4s" / "Alice outlasted you by 2s". Pure
    function of the elimination timestamps we already collect. A rematch hook.

### Track 3 — Beyond Fall Guys: our own rounds, and shows that vary (10 h, risk: medium) — *creativity, retention*
3a. **Spotlight** — *"Stay out of the light."* Two searchlight cones (the `searchlight.glb` we
    already ship, hung 20 m above the sweeper disc pointing down) roam the floor on seeded
    Lissajous paths. Standing inside a cone's 3 m floor circle for 1.2 s costs a life; the cone
    turns red for the last 0.6 s as a warning and a hum rises. At 45 s a third cone joins and all
    speed up. Fully deterministic from `seed + elapsed`, per-frame point-in-circle on the local
    player only, no network. It uses the stadium we just built, and nobody else has it.
    New file `src/arena/rounds/spotlight.ts` (~150 lines) + `src/lib/spotlight.ts` for the pure
    path maths (tested: paths stay on the disc, warm-up harmless, speed schedule monotonic).
3b. **Jump Bar** — *"Jump the beam."* The sweeper's spinner alone on the disc, speeding up on a
    schedule; at 50 s a second beam counter-rotates at the same height so timing gets harder.
    Hit = knockback + life, as the sweeper does. ~100 lines, everything exists.
3c. **Varied shows.** Every show is still four acts and eight minutes (VISION §7 holds), but acts
    1–3 are **drawn from the pool** {Perfect Match, Sweeper, Tip Toe, Spotlight, Jump Bar} by the
    show's seed, no repeats, ordered easy → hard; the finale is always Hex-Drop. `roundForSlot`
    in `src/lib/schedule.ts` replaces `roundIndex`; `upcoming()` and the NEXT UP board follow.
    Tests: every round appears within any 5 shows, no repeat inside a show, finale fixed, all
    clients agree. This is why a judge who returns sees a *different* show.

### Track 4 — Reasons to return (5 h, risk: low) — *retention, discovery*
4a. **Daily challenge.** Derived from the UTC day, no server: a template table × round
    ("Qualify Tip Toe with all three lives", "Finish top three in Sweeper Gates", "Survive 60 s
    of Spotlight"). On the lobby sign and the intro card footer; completing it awards +3 crowns and
    a DAILY DONE pill for the session. `src/lib/daily.ts`, tested: deterministic, valid for the
    day's shows, never names a round that is not in the pool.
4b. **Golden Show.** Every fourth show (`showIndex % 4 === 3`) doubles crowns throughout, the
    pillar caps and searchlights go gold, and the NEXT UP board counts down to it: "GOLDEN SHOW in
    14:20". A visible time to come back for and to bring a friend to. Pure schedule maths, tested.
4c. **Titles.** Session titles from what we already record: PIONEER (first to finish Tip Toe),
    IRONFOOT (a round without losing a life), SURVIVOR (qualified all four acts of one show),
    CHAMPION (won a show). Shown in the top-right pill and on the podium sign with the name.
4d. **Share hook.** The lobby sign gains a line "Bring a friend: decentraland.org/jump/?realm=
    justchatting.dcl.eth" and the results splash a "next show in M:SS — invite someone" line. Zero
    code risk, directly answers the "share, invite" criterion.

### Track 5 — Spectacle (4 h, risk: low-medium) — *execution, creativity*
5a. **Podium cinematic.** For the 15 s podium moment, a `VirtualCamera` crane shot: from high over
    the arena gliding down to the podium, `lookAtEntity` the champion, then released. Clamped
    inside the parcel AABB (the engine silently disables out-of-bounds cameras). Everyone sees the
    same shot, including the ledge.
5b. **Golden Show dressing** (with 4b): cap colours, searchlight tint, a gold intro card.
5c. **Elimination emote.** On losing your last life, `triggerEmote('knockOut')` before the
    teleport so falling has a body language. One line.

### Track 6 — Proof and submission kit (4 h + your video) — *execution*
6a. `tools/budget.mjs`: counts entities and triangles from the built scene and the GLBs, prints the
    numbers the README quotes. A test asserts entities < 1 000 and tris < 100 k.
6b. Thumbnail (`images/scene-thumbnail.png`, 1024×768) from a phone screenshot of the stadium.
6c. `docs/TESTING.md` updated with real phone findings from each redeploy.
6d. README "Play it" block (World link, jump link, what to do in the first 60 s) and a
    `docs/SUBMISSION.md` with the DoraHacks form text ready to paste.
6e. Two DCL Events ("Crown Rush Hour") inside the judging week so judges can meet a crowd.
6f. A 60–90 s two-phone video (yours).

### Gated — Persistent leaderboard via the Multiplayer Server (spike, 3 h timebox, risk: HIGH)
The only no-backend persistence is Decentraland's hosted Multiplayer Server (`@dcl/sdk@auth-server`
branch, `Storage.set` / `Storage.player.set`). It would give all-time crowns across days — a real
retention win the judges (Regenesis Labs) explicitly listed as a resource. But it swaps the SDK to
a different branch, the server cold-starts ~15 s in production, `MessageBus` throws on the server
side, and none of it can be phone-verified without a redeploy. **Do not attempt before Track 6 is
done and the World has survived a phone test.** If tried: on a branch, timebox three hours, merge
only if `npm run start -- --mobile` and a redeploy both work.

---

## 2. What we will NOT add
- Custom on-screen controls or a dive button — walk and jump is the whole point (VISION §7).
- Particles, dynamic lights, audio analysis — none of them run on mobile today.
- Grabbing, teams, or any spectator power that *changes* the round for live players: the message
  bus is unordered, so spectator votes could diverge between clients. Hype stays cosmetic.
- A longer show. Six rounds do not fit eight minutes; the pool (3c) gives variety instead.

---

## 3. Order and calendar

| Day | Build | Redeploy |
|---|---|---|
| 09-02 | Track 0 (you) · Track 1 | yes — first live World |
| 09-03 | Track 2 | evening |
| 09-04 | Track 3a, 3b | — |
| 09-05 | Track 3c · Track 4 | evening (judging starts; World already live) |
| 09-06 | Track 5 · two-phone playtest · fixes | evening |
| 09-07 | Track 6a–d · TESTING.md findings | — |
| 09-08 | Fix list from playtests; gated spike only if all green | evening |
| 09-09 | Events, video, SUBMISSION.md final | final |
| 09-10 | **Submit on DoraHacks** (one day of margin) | — |

Cut order if time runs short: gated spike → 5a → 3b → 4c → 2f → 2d. Never cut: Track 1, 2a–2c,
3a, 3c, 4a, Track 6.

---

## 4. How each track is tested
- Pure logic (`src/lib/*`): unit tests in `tests/` — feed formatting, hype thresholds, spotlight
  paths, show composition, daily challenge, golden-show schedule, titles.
- Manifests: UI textures and audio clips referenced in code exist on disk.
- Geometry: spotlight cones and camera path inside the parcel bounds and under the height cap.
- Everything visual: `npm run start -- --mobile` on your phone after each track, findings into
  `docs/TESTING.md`. Two phones for Track 2 (feed, hype, crown on the leader).
