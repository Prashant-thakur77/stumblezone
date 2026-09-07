# Stumblezone — DoraHacks submission pack

Everything the submission form asks for, in one place. Copy from here rather than rewriting.

## One-liner

A four-act party gauntlet in Decentraland that never stops: a new round starts every two minutes,
around the clock, with no server, no lobby and no minimum player count.

## Verified, not claimed

- `npm run verify` on every push (GitHub Actions, green): type check, 126 unit tests, asset budget,
  and a **headless boot of the real bundle** that drives a player through every round and phase
  for 14 slots and fails on any throw. It found and fixed a per-frame crash in Sweeper Gates.
- Measured load from that run: **1,124 entities, 665 mesh renderers, 113 GLTFs, 32 text shapes** -
  under a quarter of the 16-parcel mobile allowance. Assets: 5.6 MB.
- Every rounded HUD shape is a texture, because `borderRadius` does not render on the mobile client.

## The 100-word version

Stumblezone is a Fall Guys-style show that runs on the clock instead of a server. Six rounds, four
acts, a new one every two minutes — which three you get is drawn from the show's seed, and the
finale is always Hex-Drop. Eliminated players go to a spectator ledge and keep playing a different
game: cheering, which drives a hype meter that sets the whole stadium off. The leader wears a crown,
streaks wear a star, the daily challenge pays three crowns, and every fourth show pays double. It is
built for a phone: walk and jump, nothing else.

## Links

| What | Where |
|---|---|
| Play (mobile app or desktop) | `justchatting.dcl.eth` — <https://decentraland.org/jump/?realm=justchatting.dcl.eth> |
| Source | <https://github.com/Prashant-thakur77/stumblezone> |
| Video | `<VIDEO_URL>` — 75 s, script below |
| Design and research | [docs/VISION.md](VISION.md), [docs/FALLGUYS-PRESENTATION.md](FALLGUYS-PRESENTATION.md) |
| Architecture | [docs/ARCHITECTURE.md](ARCHITECTURE.md) |
| Credits and licences | [CREDITS.md](../CREDITS.md) |

## The five judges, and the line for each

The Sept 5 forum update named the judges and what each one is looking for. The BUIDL description
should let each of them find their criterion in the first paragraph they read.

| Judge | Looks for | The sentence for them |
|---|---|---|
| Giorgio (Regenesis Labs) | performance, mobile-first execution, polish | 3.6 MB of assets, pooled entities built once, engine-side tweens, every HUD shape a texture because the mobile client ignores `borderRadius`. `npm run verify` is green in CI. |
| Agus (Regenesis Labs) | mobile UX, accessibility, controls | Walk and jump is the whole control scheme. One-tap WATCH ARENA for spectators. Colours are named in words. Nothing near the joystick. |
| Bay Backner (Foundation) | social value, retention, discovery | Six hats earned in the show and worn where everyone sees them; a village with a dance floor and a daily star hunt. Spectators drive a hype meter that sets the stadium off; a named feed; worn crowns; a daily challenge and a Golden Show every fourth show; a share link on the wall. |
| Nico E (Foundation) | usability, onboarding, execution | A latecomer is dropped into a live round, not parked on a ledge. The hint is on the card, the sign, and the jumbotron. 86 tests over the things that fail silently. |
| MetaRyuk (DAO Council) | creativity, originality, social, retention | A whole stadium to walk: a practice yard, a speed lap, a hall of fame, a sky cannon, a sky course and a big drop, tied together by six errands and a host who tells you which one you are on. The schedule is a pure function of UTC - no host, no server, nothing to go down - and every show draws a different card. |

## Ten minutes on a phone before you submit (the honest "tested on mobile")

1. Spawn. Read Sam's bubble. Walk onto the Hat Market: panel appears. Walk off: it goes.
2. Wait for a round. Play it to the end - three hearts, a power-up star if it is a clock-driven
   round, the last-five numerals. Note whether SWITCH / REVERSE / BLACKOUT / CRUMBLE read.
3. Fall on purpose next round. On the ledge: CHEER x5 (crowd goes wild), BOO, WATCH ARENA, PICK.
4. Results: DANCE, GG. Check the feed line on the other phone if you have two.
5. Between rounds: tower to the top (is every step jumpable?), sky course to the box, the drop.
6. East lane: lap. West lane: practice patch. Corners: hall, cannon (do you land on the plaza?).
7. Anything that felt wrong is one constant: see the end of docs/TESTING.md for which.

## Your first three minutes (what a judge will actually see)

1. **0:00** Spawn in the lobby facing the arena. The title, the schedule board ("THIS SHOW: ... > Hex-Drop",
   "NEXT UP", "TODAY: ..."), the crown board, the podium. Bounce on a jump pad.
2. **0:00–0:40** Either the intro card of the next round (tag, name, three-word hint, 3-2-1), or -
   if you arrived mid-round on a clock-driven round - "JOINED LATE - GO!" and you are already playing.
3. **First round** Three hearts. The whistle. The hazard that costs a heart is telegraphed (the light
   turns red, the beam is low and bright, the walls are slow at first).
4. **If you fall** You land on the ledge over the arena with CHEER and WATCH ARENA. Five cheers in
   ten seconds and the crowd goes wild - confetti, roar, board. The feed says who else is out.
5. **Results** QUALIFIED! or ELIMINATED, a named rivalry line, bonuses by name, DANCE / CLAP / SHRUG.
6. **After four acts** The podium, the crane shot, the champion's card with the share link.

## Video script (75 seconds, two phones)

Shoot in portrait on one phone, screen-record the other. No voice-over needed; captions carry it.

| Time | Shot | Caption |
|---|---|---|
| 0–8 s | Lobby: pan from the title across the boards to the arena and the rainbow | **A party show that never stops. A new round every 2 minutes.** |
| 8–18 s | Intro card, 3-2-1, whistle, Spotlight round | **Six rounds. Every show draws a different card.** |
| 18–30 s | Phone A falls; lands on the ledge; taps CHEER five times | **Fall, and you're not done - you're the crowd.** |
| 30–38 s | Phone B (still in): confetti fires, "THE CROWD IS GOING WILD" | **Five cheers sets the stadium off. For everyone.** |
| 38–48 s | Results: QUALIFIED!, "You outlasted Alice by 4s", CLUTCH +1, DANCE | **Names, rivalries, bonuses.** |
| 48–58 s | Hex-Drop finale, last tile, podium crane shot, crown on the winner's head | **Four acts. One champion. Then it starts again.** |
| 58–68 s | Lobby board: TODAY's challenge, GOLDEN SHOW countdown | **A reason to come back tomorrow.** |
| 68–75 s | The jump link on screen | **justchatting.dcl.eth - open it on your phone.** |

## Announcement text (Friendzone Discord channel / forum)

> **Stumblezone is live** - a Fall Guys-style show that runs on the clock: a new round every two
> minutes, six rounds drawn into four-act shows, a podium at the end. Fall and you cheer from the
> ledge - five cheers and the crowd goes wild for everyone. Built for the phone from the first
> commit. `justchatting.dcl.eth` · decentraland.org/jump/?realm=justchatting.dcl.eth
> Crown Rush Hour: <date/time UTC> - come fill the stadium.

## Two events during judging week

Create them at events.decentraland.org (Submit Event): name "Stumblezone - Crown Rush Hour",
World `justchatting.dcl.eth`, 45 minutes each, one at 18:00 UTC and one at 02:00 UTC so both
hemispheres get one. Paste the announcement text as the description and the thumbnail as the image.
An event is a listing in the app's Events tab - discovery the scene cannot buy any other way.

## Submission order (do this today)

1. Redeploy (the live World is the Sep 1 build otherwise).
2. Push to a public GitHub repo; put the URL above.
3. Submit the BUIDL on DoraHacks with the one-liner, the 100-word version, the repo, the World
   name and the jump link. Editing stays open until the deadline; the video goes in when it exists.
4. Post the announcement; create the two events.

## How it scores, criterion by criterion

1. **Mobile-first** — walk and jump is the whole control scheme; every UI shape is a texture because
   the mobile client ignores `borderRadius`; nothing uses a mobile-unsupported feature.
2. **Social** — a named live feed, a crowd hype meter only spectators can fill, reactions on the
   results card, worn crowns and streak stars, rivalry lines, and a shared podium curtain call.
3. **UX and accessibility** — no emoji (the Unity client ships no glyphs), explicit sizes on every
   label, `screenInset: 'interactable'` so nothing collides with the joystick, colours named in words
   as well as shown.
4. **Performance** — pooled entities built once at boot, engine-side tweens, 3.6 MB of assets against
   a 240 MB allowance (`npm run budget`).
5. **Creativity** — the schedule is a pure function of UTC, so there is no host and nothing to fail;
   and the show varies itself by seed rather than by anyone's input.
6. **Retention** — daily challenge, Golden Show every fourth show, titles, streaks, personal bests,
   and a lobby board that tells you what is coming and when.
7. **Execution** — 70 unit tests over the parts that fail silently, and six rounds sharing one tile
   system, one stage builder and one scheduler.

## Running it locally

```bash
npm install
npm test
npm run build
npm run start -- --mobile   # QR code to open it on a phone
```

Requires Node 22+ (pinned via Volta).

## Deploying

```bash
npm run deploy -- --target-content https://worlds-content-server.decentraland.org
```

Signed in the browser with the wallet that owns the name. The seed phrase lives on paper and appears
in no file in this repository, and no CI job holds a key.
