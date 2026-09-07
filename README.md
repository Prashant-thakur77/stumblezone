# Stumblezone

**The game show that runs itself — and the crowd plays too.** A new round every two minutes, on the
clock, with no host and no server. Fall, and you're not out: you're the crowd, and five cheers set
the stadium off. Four rounds make a show; the show ends on a podium; around it is a village to walk.
Built for the [Decentraland Friendzone Mobile Buildathon](https://dorahacks.io/hackathon/friendzone).

> **Play it:** open the Decentraland mobile app and go to **`justchatting.dcl.eth`**, or tap
> <https://decentraland.org/jump/?realm=justchatting.dcl.eth>. A round starts every two minutes,
> around the clock. No lobby, no queue, no minimum player count.

---

## For judges — your first three minutes

You will arrive at a random second of a random round. If it is a clock-driven round you are dropped
straight in ("JOINED LATE - GO!"); if not, the banner counts down to the next one while you bounce
on the pads. **Walk and jump is the entire control scheme.** Fall, and you land on a ledge over the
arena with a CHEER button - five cheers in ten seconds sets the stadium off for everyone. Four
rounds make a show; the show ends on a podium. The whole loop is eight minutes.

Source: <https://github.com/Prashant-thakur77/stumblezone> · Video: `<VIDEO_URL>` · Submission notes: [docs/SUBMISSION.md](docs/SUBMISSION.md)

## What it is

One arena, eight rounds, a village around it. A new round starts **every two minutes**, whether
anyone is watching or not — the schedule is a pure function of the clock, so there is nothing to
host and nothing to go down. One of the rounds, **Copycat**, could only exist here: the coach
performs a sequence of poses and you copy it with your *own avatar's* emotes, which the scene reads
back from the explorer. (The genre debt is to the party-show format; the research is in
[docs/FALLGUYS-PRESENTATION.md](docs/FALLGUYS-PRESENTATION.md).)

**Eight rounds, four acts.** Each show draws three rounds from the pool below — seeded by the show
number, ordered easy to hard, never repeating inside a show — and always ends on Hex-Drop, the only
round whose floor genuinely runs out. Two shows in a row are two different cards.

| Round | The idea |
|---|---|
| **Perfect Match** | A 5×5 grid flashes colours, then blanks. A colour is called. Stand on it or the floor drops. Three waves, shorter memory each time. |
| **Sweeper Gates** | Walls with a door-sized gap sweep the platform, faster each wave. Find the gap. |
| **Tip Toe** | Half the bridge tiles are fake and vanish forever once stepped on. Whoever leads sacrifices themselves to reveal the path. |
| **Spotlight** | The stage goes dark and roaming pools of light hunt you across it. Linger in one and it costs a heart. A third light and a speed-up at 45s. |
| **Jump Bar** | One low beam sweeps the stage; jump it. At 50s a second beam appears turning the other way. |
| **Crown Rush** | King of the hill. A crown zone on the stage; every second inside is a point; it hops every 12 s and shrinks. Nobody is eliminated — most points wins. The first round where you contest another player for the same floor. |
| **Copycat** | A coach performs DANCE > CLAP > WAVE. You copy it, in order, in time, with your own avatar — pose buttons or the emote wheel. Wrong or late costs a heart; the sequence grows. |
| **Hex-Drop** *(finale)* | Two stacked layers of tiles that fall away seconds after you touch them. Last one standing takes the show. |

## What it looks and sounds like

A game show in a stadium, not a test level. The HUD is rounded pills and cards in pink, yellow and
cyan with chunky drop-shadowed type; each round opens on a category-tagged card (**ROUND 3 ·
SURVIVAL**, gold **FINAL ROUND**), a 3-2-1 that flips colour every tick, and closes on a
full-screen **QUALIFIED!** or **ELIMINATED** splash. The soundtrack is a 150 BPM F♯ minor sports
theme — slap bass, breakbeats, brass stabs, a key change halfway through the loop, a balloon
squeak on the fours — with a stadium crowd under every round, a referee whistle on GO, a fanfare
and a roar when you qualify, a sad little jingle and an "aww" when you don't, a slide whistle when
you fall, squeaky-toy bumpers and springy jump pads. The arena has a crowd of animated faces on
the pillar ring, four sweeping searchlights, a rainbow behind the far edge, glossy vinyl-toy
materials, and lollipops with faces in the lobby. All of it is derived from what the Fall Guys
composers and artists have said in interviews — the research and every decision are in
[docs/FALLGUYS-PRESENTATION.md](docs/FALLGUYS-PRESENTATION.md).

Every round is a survival challenge **against the arena**, never directly against another player.
That is what lets the same code be an eight-player elimination race, a two-player grudge match, or a
solo score attack at 3am — without a lobby, a queue, or a minimum player count.

---

## How it scores against the seven judging criteria

### 1. Mobile-first experience
Designed for touch from the first commit, not ported to it.
- **Walk and jump. That is the entire control scheme.** No aiming, no camera skill, no precision taps.
- Actions bind only to `IA_JUMP` and `IA_PRIMARY` — the large, always-reachable mobile buttons.
  Nothing is bound to `IA_ACTION_3`–`6`, which hide behind a secondary menu on mobile.
- Generous gaps and timers tuned for touch imprecision; the memory phase never drops below 2.5s.
- Mobile tested from day one via `npm run start -- --mobile`, not in a pass at the end.

## Stumble Village

The scenes that hold a crowd in Decentraland are the ones with a *place* around the game — a mine
to walk, an island, a garage. The village is that place, at lobby height around the stadium:

- **Hat Market.** Seven hats on seven pedestals, each earned by something you did in the show — qualify
  once, fall three times, five crowns, a three-streak, an outright win, a show championship, a Crown
  Rush win (that one is a crown). Step
  onto the market, tap one, and everyone in the World sees it on your head. Nothing is bought;
  crowns stay a score.
- **Disco Deck.** A floor of party tiles that cycle under a mirror ball. Step on and the
  DANCE / CLAP / SHRUG row appears, so the wait between rounds is a dance floor.
- **Star Hunt.** Five stars a day, placed by the UTC day's seed on ten spots around the village.
  Walk through one for a crown; all five for three more. Everyone sees the same stars.
- **Stumble Tower.** Twelve platforms spiralling up the west corner, a lookout at the top, and a
  stopwatch: step on the base pad, reach the star, your time goes on the board. Nothing at stake
  but the time — it is the thing to do while the board says "NEXT UP in 1:12".
- Houses, cabins, lamps, bushes and a fountain along the back, so the town reads as a town from the
  arena and from the ledge.

## The stadium, walked

The village was the middle third of the scene. The rest is now places too, and every one of them
feeds crowns, the board and the errand list:

| Where | What |
|---|---|
| **West lane** | **Practice Yard** — a 3×3 patch of tiles that sink and return, a roaming light that turns red, a beam that only nudges. No lives: learn the moves, then play. |
| **East lane** | **Speed Lap** — out to the corner pad and back against the clock. A finish without the turn is nothing, so the course cannot be cut. |
| **North-west plaza** | **Hall of Fame** — five plinths, the top five names, a crown turning on the first; a photo frame facing the arena. |
| **North-east plaza** | **Sky Cannon** — step on the pad and it throws you fifteen metres up for the one view a phone camera never gives you. |
| **The sky** | **Sky Course** — fourteen platforms from the tower's lookout to a glass-floored **Sky Box** 25 m over the village. Every step is a phone-sized jump, by test. |
| **Village floor** | **The Big Drop** — off the Sky Box's south edge onto three rings. Inside the middle one: PERFECT LANDING, +2. |
| **Spawn** | **Sam the Host** — an avatar with a speech bubble that says what's next: the schedule, the daily, the errand you're on, the hat you could unlock. |
| **Everywhere** | **Village Errands** — six things per visit (a hat, a dance, the tower, three stars, a lap, the drop), one crown each, five more and the **VILLAGER** title for all six. |

The Disco Deck has its own music now — a synthesised disco loop from a speaker on the deck, spatial,
so it fades in as you walk over — and when the crowd goes wild the twelve pillar caps flash white.

## Moments

Places are where you go; these are what happens to you while you're there:

- **The establishing shot** — a six-second crane over the arena during every round card, so you see
  the board before you're on it.
- **Power-ups** — a SHIELD (absorbs one heart; a bubble around you) and a BOOST (faster, higher for
  eight seconds; a star over your name) appear at 20 s and 50 s on the clock-driven rounds. Seeded,
  per player, takeable once each: fair with no server, and nobody watches one vanish.
- **Twists** — Perfect Match's later waves may **SWITCH** the call 1.8 s before the judge; Jump Bar's
  beams **reverse** at 70 s; Spotlight goes to **BLACKOUT** for two seconds at 60 s and the lights
  come back somewhere else; Hex-Drop's top deck **crumbles** on its own at 60 s; Tip Toe has a
  **gold tile** worth a crown.
- **Spectators with a stake** — pick who wins from the ledge (+1 if they qualify, +2 outright),
  CHEER or **BOO**, and a **GG** button on the results card that reaches your rival by name.
- **Beat the House** — every round has a house time; last past it (or finish Tip Toe under it) for
  a crown, alone or not. The opponent that never logs off.
- **Call-outs** — "Alice leads the show with 5" at the whistle, **FINAL TWO** when the field is down
  to two, **ON FIRE** at three in a row, **PAST YOUR BEST** the second you beat it, **MVP** at results.
- **The last five seconds** as 150 px numerals, and a crowd bed that swells with the hype meter.
- **The encore** — after every finale, the podium is a dance floor: everyone's pose buttons open
  for fifteen seconds. Joins and departures are in the feed, by real name.

## Beyond the format

The genre gives you rounds. These are the things layered on top that make it a *show*:

- **A live feed.** "Alice is OUT", "Bob finished 2nd", "Cy cheers!" — three lines in the corner,
  gone in four seconds. A number tells you the size of the field; a name tells you who you are racing.
- **A hype meter the crowd controls.** Five spectator cheers inside ten seconds and the stadium
  erupts: a roar, confetti over the arena and a line on the board. It is the only way an eliminated
  player changes what happens on screen, and it is entirely in their hands.
- **Reactions on the results card** — DANCE / CLAP / SHRUG, so the fifteen seconds of standings are
  a room reacting together rather than dead air.
- **Worn cosmetics.** The show leader wears a crown on their head; anyone on a two-round qualifying
  streak wears a star over their name tag. Both are computed identically on every client from the
  same messages, so everybody sees the same crown on the same head with nothing synced.
- **Rivalries.** "You outlasted Alice by 4s" — the nearest player to you on the clock, named.
- **Titles** — PIONEER, IRONFOOT, SURVIVOR, CHAMPION — under your standing.
- **A daily challenge** worth three crowns, a pure function of the UTC day, so it needs no storage
  and every client shows the same one.
- **The Golden Show**: every fourth show pays double crowns, with a gold card, a gold jumbotron and
  a countdown in the lobby.
- **A curtain call** — a six-second crane shot of the podium for everyone after the finale.
- **WATCH ARENA** — one tap points a spectator's camera at the round they were knocked out of,
  instead of asking them to wrestle a third-person camera round on a touchscreen.
- **Bonuses with names**: CLUTCH (survived on your last heart), COMEBACK (qualified straight after
  being knocked out), CROWD BONUS (paid to every survivor when the spectators drove the meter to
  the top).
- **A session summary** on the end-of-show card: rounds played, qualified, best streak.

### 2. Social value
The buildathon rules exclude single-player experiences, and the mobile client **has no proximity
voice chat** — so every social feature here works over text, emotes and shared spectacle.
- **The spectator ledge.** Eliminated players are teleported to a raised ledge overlooking the arena,
  where they can **walk freely** and hit a large on-screen **CHEER** button that fires an emote
  everyone sees. They are deliberately *not* frozen — being locked in place for the rest of a round
  is the least social thing this game could do. The ledge is 9m above and 10m clear of the arena, so
  a spectator can wander and heckle but cannot rejoin the round.
- **The cheer button does something.** Five cheers in ten seconds sets the crowd off for everyone —
  spectators are participants, not an audience.
- **Reactions on the results card** and **a named live feed** of who fell, who finished and who cheered.
- **Tip Toe's sacrificial pathfinding** — the leader burns fake tiles for everyone behind them.
- **A live crown board** in the lobby, a named field readout ("IN: you, Alice, Bob +2"), and a
  crown worn by whoever leads the show.
- Shared spectacle: everyone in the World runs the same round at the same instant.

### 3. Mobile UX and accessibility
- **Every rounded plate in the HUD is a tinted PNG, not a `borderRadius`** — the mobile client
  ignores that property, so a HUD built the obvious way comes out as hard rectangles on the one
  device this scene is for. Same for the things mobile does not support at all: no particle systems,
  no dynamic lights, no nine-slice textures, no input modifiers.
- Countdown at 64px dead centre; round name, lives and alive-count on dark plates that survive any
  background.
- UI kept clear of the device safe area **and** of the client's own on-screen controls — nothing is
  placed near the bottom edge where the joystick and jump button live.
- Onboarding is three lines on a sign at spawn. It is readable in the four seconds before a round.

### 4. Performance and optimisation
- **Under 10% of the mobile entity soft limit** (4,800), with every round's pool built once at boot.
- **`npm run budget`** prints the asset weight and fails over the limits: currently **3.6 MB**, 1.5%
  of this scene's 240 MB allowance.
- **Tiles are pooled, never respawned.** All 448 entities are created once at scene start and reset
  between rounds, so a World running unattended for a week has a flat entity count.
- SDK primitives for everything with many copies; fourteen small CC0 GLBs (2 MB, ~25k triangles
  in total) for the singular things — crown, crowd, searchlights, rainbow, toys. `assets/` is
  3.5 MB against a 36 MB cap.
- Motion is engine-side `Tween`, not per-frame transform writes.
- All music, ambience and cues are **synthesised procedurally** by `tools/make-audio.mjs` — three
  beds, a crowd bed and thirteen stingers, no downloaded samples and no licensing to track.

### 5. Creativity and originality
Other entries are obbies and hangouts. This is an **auto-cycling multi-round gauntlet with a real
solo mode** — and the scheduling trick underneath it: the entire round schedule is a pure function of
UTC time, so there is no server, no host, and no authority to fail.

### 6. Retention and discovery value
- **A daily challenge** worth three crowns — a reason to come back tomorrow that needs no account.
- **The Golden Show** every fourth show, with a countdown in the lobby — a reason to stay another
  twenty minutes.
- **A different card every show**: three of five pool rounds, drawn by seed, so the second show a
  judge plays is not the first one again.
- **Titles and streaks** to chase that are not just a number.
- Crowns accumulate across the session; the board is the first thing you see in the lobby.
- **Personal bests** per round, so a judge walking in alone at 3am still has something to beat.
- Only 29% of each cycle is intro and results — the rest is playing.
- The schedule sign shows the next three rounds, which creates the "Hex-Drop is in 3 minutes, wait
  for it" hook.
- Two-minute rounds mean the worst case wait for *something to do* is 30 seconds.

### 7. Overall execution
Four rounds share one tile system and one scheduler. Roughly 60% of the code is `tiles.ts` and
`scheduler.ts`; the rounds are thin configs on top. It is a small codebase pretending to be a big game.

---

## The architecture, in one paragraph

**There is no backend.** Round scheduling is `slot = floor(utc / 120)`, `act = slot % 4`,
`round = act < 3 ? showRounds(show)[act] : Hex-Drop`,
`seed = hash(slot)` — computed identically on every client. Every layout, colour, wall speed and gap
position derives from that seed through a seeded PRNG, so a player joining mid-round reconstructs the
exact board everyone else sees without exchanging a message. The only network traffic is what players
*cause*: `eliminated`, `finished`, `tile` and `cheer`. Clock skew is absorbed by a five-second
get-ready freeze at the start of every round, which a unit test proves is sufficient for one second
of drift.

The upshot for judging week: **there is nothing that can go down.** No server outage can stop the
arena cycling.

Full detail in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

---

## Running it

Requires **Node 22+** (the SDK CLI uses `fs.globSync`; Node 20 fails with an opaque `TypeError`).
The version is pinned in `package.json` via Volta.

```bash
npm install
npm test          # 70 unit tests over the scheduler, PRNG, layouts and show rules
npm run build     # bundle + type check
npm run budget    # asset weight against the scene's limits
npm run smoke     # boots the built scene headless and runs 14 slots of the show; fails on any throw
npm run start     # desktop preview
npm run start -- --mobile   # prints a QR to open the scene on your phone
```

Deploying to a World: see [docs/DEPLOY-SETUP.md](docs/DEPLOY-SETUP.md).

## Layout

```
src/lib/        pure logic, no SDK imports, fully unit-tested
  prng.ts       splitmix32 hash + mulberry32
  schedule.ts   UTC slot math - the thing that replaces the server
  layouts.ts    seeded per-round layouts
  spotlight.ts  roaming-light paths and the linger timer
  jumbar.ts     beam pacing
  feed.ts       the corner feed's expiry rules
  hype.ts       the crowd meter
  daily.ts      the day's challenge
  field.ts      field readout and rivalries
  titles.ts     PIONEER / IRONFOOT / SURVIVOR / CHAMPION
  streak.ts     qualifying streaks
  hats.ts       the six hats and what unlocks each
  stars.ts      the daily star hunt
  tower.ts      the tower spiral, with a test that every step is a phone-sized jump
  sky.ts        the sky course, same rule, plus the box over the drop pad
  drop.ts       landing scoring: height in the last three seconds, rings, pay-once
  lap.ts        the speed lap's start/turn/finish rule
  practice.ts   sinking-tile timing
  errands.ts    the six errands and the pay-once rule
  tips.ts       what the host says, and in what order
src/arena/      tile pool, lobby, village, the shared round stage, and the six rounds
src/systems/    scheduler, spectator, cosmetics, camera, feed, hype
src/net/        message bus wrapper and session crown tally
src/ui/         mobile HUD
```

## Tests

`npm test` runs 70 tests over the parts where a bug is invisible until a live round breaks:

- **Clock skew** — samples 1,200 points across a slot and asserts two clients one second apart only
  disagree at the boundary. This is the evidence for shipping with no clock synchronisation.
- **Tip Toe solvability** — walks all 500 seeds and proves every generated bridge has a connected
  path to the far side. Purely random fake-tile placement eventually produces an unwinnable round
  that *every client agrees on* — no crash, no error, just a round nobody can finish.
- **Perfect Match fairness** — every board, every seed, has at least four safe tiles so a crowd has
  somewhere to stand.
- **Show variety** — every show for 50 shows draws three distinct pool rounds, ordered easy to hard,
  ending on the finale, and shows differ from one another.
- **Spotlight paths stay on the stage** — every light, every quarter-second, for the whole round.
  A Lissajous figure whose two axes each swing the full radius would leave the disc at the corners.
- **A headless boot** (`tools/smoke.mjs`) loads the real bundle with the renderer's host APIs
  mocked, lets the SDK's own startup call `main()`, and runs 1,100 frames through every round and
  phase. It found a wall in Sweeper Gates built without a `Transform` — a throw every frame of that
  round that the type checker, the unit tests and the desktop preview all missed.
- **Two clients on one bus** (`tools/smoke2.mts`) loads the bundle twice, wires each client's
  message bus into the other's, steers one player into the Crown Rush zone and the other out of
  it, runs twelve slots, and asserts both clients agree on every crown tally and name the same
  winner. Its first run found that crowns were only ever shared when someone joined - and that the
  per-show tally was never shared at all, so every client's "show leader" was itself.
- **The UI never uses `borderRadius`** and every texture it names exists on disk. Both are silent
  failures on a phone: no error, just a flat rectangle or an invisible plate.
- **Geometry and pacing invariants** — the kill plane must clear every standable surface, every
  round must fit inside the scene bounds, wall pacing must stay within touch reaction time, and the
  call window must be long enough to cross the board. Each of these encodes a bug that was found
  and fixed: the kill plane once sat exactly on Hex-Drop's lower deck, and the final sweeper wave
  once closed every 1.6s.

## Roadmap

Cross-session crown persistence (Decentraland Multiplayer Server or a small signed-fetch service)
and ghost times are designed for but deliberately not depended on — see ARCHITECTURE.md Layer 2.
Daily challenges shipped without needing any of it. Post-buildathon, this is a candidate for the DCL Regenesis Labs Grants
Program and the Creator Success Program.

## Licence and credits

Open source per buildathon requirement #5. See [CREDITS.md](CREDITS.md).
