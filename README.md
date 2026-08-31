# Stumblezone

**A four-round party gauntlet that never stops.** Walk in at any moment, survive the round, win crowns.
Built for the [Decentraland Friendzone Mobile Buildathon](https://dorahacks.io/hackathon/friendzone).

> **Play:** `/goto <world>` in the Decentraland mobile app.
> *(World name pending — see [docs/DEPLOY-SETUP.md](docs/DEPLOY-SETUP.md).)*

---

## What it is

One arena. Four Fall Guys-style rounds, cycling forever on a fixed schedule. A new round starts
**every two minutes**, whether anyone is watching or not.

| Round | The idea |
|---|---|
| **Perfect Match** | A 5×5 grid flashes colours, then blanks. A colour is called. Stand on it or the floor drops. Three waves, shorter memory each time. |
| **Sweeper Gates** | Walls with a door-sized gap sweep the platform, faster each wave. Find the gap. |
| **Tip Toe** | Half the bridge tiles are fake and vanish forever once stepped on. Whoever leads sacrifices themselves to reveal the path. |
| **Hex-Drop** | Two stacked layers of tiles that fall away seconds after you touch them. Last one standing takes the round. |

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

### 2. Social value
The buildathon rules exclude single-player experiences, and the mobile client **has no proximity
voice chat** — so every social feature here works over text, emotes and shared spectacle.
- **The spectator ledge.** Eliminated players are teleported to a raised ledge overlooking the arena
  with a **cheer button** that fires an emote everyone sees. Losing early keeps you in the round.
- **Tip Toe's sacrificial pathfinding** — the leader burns fake tiles for everyone behind them.
- **A live crown board** in the lobby, and an "N alive" counter that makes the field visible.
- Shared spectacle: everyone in the World runs the same round at the same instant.

### 3. Mobile UX and accessibility
- Countdown at 64px dead centre; round name, lives and alive-count on dark plates that survive any
  background.
- UI kept clear of the device safe area **and** of the client's own on-screen controls — nothing is
  placed near the bottom edge where the joystick and jump button live.
- Onboarding is three lines on a sign at spawn. It is readable in the four seconds before a round.

### 4. Performance and optimisation
- **448 entities total — 9% of the mobile soft limit** (4,800) and 7% of the hard limit.
- **Tiles are pooled, never respawned.** All 448 entities are created once at scene start and reset
  between rounds, so a World running unattended for a week has a flat entity count.
- SDK primitives and a shared palette — no GLB downloads, near-zero content size against the World
  storage cap.
- Motion is engine-side `Tween`, not per-frame transform writes.

### 5. Creativity and originality
Other entries are obbies and hangouts. This is an **auto-cycling multi-round gauntlet with a real
solo mode** — and the scheduling trick underneath it: the entire round schedule is a pure function of
UTC time, so there is no server, no host, and no authority to fail.

### 6. Retention and discovery value
- Crowns accumulate across the session; the board is the first thing you see in the lobby.
- The schedule sign shows the next three rounds, which creates the "Hex-Drop is in 3 minutes, wait
  for it" hook.
- Two-minute rounds mean the worst case wait for *something to do* is 30 seconds.

### 7. Overall execution
Four rounds share one tile system and one scheduler. Roughly 60% of the code is `tiles.ts` and
`scheduler.ts`; the rounds are thin configs on top. It is a small codebase pretending to be a big game.

---

## The architecture, in one paragraph

**There is no backend.** Round scheduling is `slot = floor(utc / 120)`, `round = slot % 4`,
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
npm test          # 24 unit tests over the scheduler, PRNG and layout generators
npm run build     # bundle + type check
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
src/arena/      tile pool, lobby, and the four rounds
src/systems/    scheduler and spectator/elimination
src/net/        message bus wrapper and session crown tally
src/ui/         mobile HUD
```

## Tests

`npm test` runs 24 tests over the parts where a bug is invisible until a live round breaks:

- **Clock skew** — samples 1,200 points across a slot and asserts two clients one second apart only
  disagree at the boundary. This is the evidence for shipping with no clock synchronisation.
- **Tip Toe solvability** — walks all 500 seeds and proves every generated bridge has a connected
  path to the far side. Purely random fake-tile placement eventually produces an unwinnable round
  that *every client agrees on* — no crash, no error, just a round nobody can finish.
- **Perfect Match fairness** — every board, every seed, has at least four safe tiles so a crowd has
  somewhere to stand.

## Roadmap

Cross-session crown persistence (Decentraland Multiplayer Server or a small signed-fetch service),
daily challenges, and ghost times are designed for but deliberately not depended on — see
ARCHITECTURE.md Layer 2. Post-buildathon, this is a candidate for the DCL Regenesis Labs Grants
Program and the Creator Success Program.

## Licence and credits

Open source per buildathon requirement #5. See [CREDITS.md](CREDITS.md).
