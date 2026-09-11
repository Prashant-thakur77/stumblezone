# Contributing

Thanks for looking. Stumblezone is a small codebase with strong opinions; this page is the short
version of them so a first pull request lands cleanly.

## Setup

```bash
git clone https://github.com/Prashant-thakur77/stumblezone.git
cd stumblezone
npm install          # Node 22+ (pinned via Volta; see .nvmrc)
npm run verify       # build, 156 unit tests, asset budget, two headless smoke runs
```

`npm run start -- --mobile` prints a QR that opens the scene on your phone. **Test on a phone before
opening a pull request** — the desktop preview renders things the mobile client does not
(`borderRadius`, wrapped labels, particle systems), and none of them raise an error.

## How the code is organised

- **`src/lib/`** — pure logic. No `@dcl/*` imports, ever. Every file here has a test in `tests/`.
  If a rule can be expressed as a pure function of numbers and strings, it goes here first.
- **`src/arena/`, `src/systems/`, `src/ui/`** — thin SDK wiring over `lib/`. Rounds implement the
  `Round` interface in `src/arena/rounds/types.ts`: `build()` once at boot, `start(seed)`,
  `tick(dt, elapsed, playing)`, `stop()`, and a `spawn()` point.
- **`src/config.ts`** — every tuning number, in one place, with a comment saying why.
- **`src/net/sync.ts`** — the only file that touches the message bus. Every payload carries its
  slot; stale slots are dropped.

## Rules that are tested, so you will hit them

- No `borderRadius` in `src/ui/`. Use the PNG plates from `tools/make-ui.mjs`.
- Every `Label` has an explicit `width` and `height`. No emoji.
- Everything stays inside the 4×4 parcels (x, z ∈ [0, 64]) and under the height cap (~81 m).
- New rounds go in `ROUND_NAMES` (`src/config.ts`) **and** the `setupScheduler([...])` list in
  `src/index.ts`, in the same order. A test checks.
- Anything a second client would need to agree on must be derivable from the seed or from a bus
  message — never from local state alone. `npm run smoke2` runs two clients on one bus and asserts
  they name the same winner.

## Adding a round

1. Pure rules in `src/lib/<round>.ts` with a test: pacing, layout from seed, escalation points.
2. The `Round` in `src/arena/rounds/<round>.ts`, built on the shared stage in `src/arena/disc.ts`
   if it is a round stage.
3. A name, a three-word hint, a control line, a house time, a difficulty in `src/config.ts`.
4. Add it to the pool. Run `npm run verify` and play it on a phone.

## Commits and pull requests

- Conventional messages: `feat:`, `fix:`, `docs:`, `test:`, `perf:`, `chore:`. Scope in
  parentheses where it helps (`feat(round): …`, `fix(ui): …`).
- One change per pull request. Say what you saw on the phone.
- `npm run verify` must be green. CI runs it on every push.

## Reporting a bug

Use the bug template. The most useful thing you can include is **the device, the round, and the
second on the round clock** — the schedule is deterministic, so with those three the bug reproduces.
