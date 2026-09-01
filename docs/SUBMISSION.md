# Stumblezone — DoraHacks submission pack

Everything the submission form asks for, in one place. Copy from here rather than rewriting.

## One-liner

A four-act party gauntlet in Decentraland that never stops: a new round starts every two minutes,
around the clock, with no server, no lobby and no minimum player count.

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
| Source | this repository |
| Design and research | [docs/VISION.md](VISION.md), [docs/FALLGUYS-PRESENTATION.md](FALLGUYS-PRESENTATION.md) |
| Architecture | [docs/ARCHITECTURE.md](ARCHITECTURE.md) |
| Credits and licences | [CREDITS.md](../CREDITS.md) |

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
