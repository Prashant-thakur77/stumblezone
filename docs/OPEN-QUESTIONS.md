# Open questions to resolve before/while building

Kickoff 2026-08-31. Last updated 2026-08-31 after the first build session.

## Blocking

1. **World deployment access.** Still open, and now the only thing between the build and a live World.

   **Finding (2026-08-31):** the buildathon does **not** provide NAMEs. The official workshop recap
   states participants need *"a Decentraland Name for publishing"* and links only to the shop. No
   sponsorship, no vouchers. The $30 merch voucher is merch credit, unrelated.

   You currently hold no wallet and no crypto, so the routes are, in order of preference:
   - **Borrow one.** Anyone owning any ENS domain or DCL NAME can grant your address deploy rights
     (Creator Hub → Manage → Permissions → Multi-Scene World → Collaborators). Free, instant, no KYC.
     Ask GDG friends and the Friendzone Discord — it is a two-minute favour.
   - **Buy an ENS domain** (~1yr fee + gas). Requires funding a wallet.
   - **Buy a DCL NAME** (100 MANA + gas). More expensive; storage cap we don't need.

   **Critical path is exchange KYC, not money** — 1–3 days for a first-time verification. Start it
   immediately if the borrow route isn't confirmed. See [DEPLOY-SETUP.md](DEPLOY-SETUP.md).

2. **Wallet.** Follows from item 1. Recommendation: skip GitHub Actions CI entirely for this build
   and deploy manually — six deploys over eleven days does not justify the setup or its failure mode.

## Closed

3. ~~Missing networking reference document.~~ Closed — [ARCHITECTURE.md](ARCHITECTURE.md) is authoritative.
4. ~~Multiplayer backend choice (blocking).~~ Downgraded — the scheduler needs no backend. Session
   crowns shipped; cross-session persistence is post-submission.
5. ~~Backend clock vs UTC wall-clock schedule.~~ Closed: pure UTC. `slot = floor(now/120)`,
   `round = slot % 4`, `seed = hash(slot)`.
6. ~~Solo mode: three lives or score attack?~~ Closed: **three lives per round**. Same mechanic as
   multiplayer elimination with a counter in front, so it costs no extra system.
7. ~~Crown persistence: wallet required?~~ Closed: **guests earn crowns**. Session-scoped tally keyed
   on the reported address, with a `guest-xxxx` fallback. No signing, no wallet gate.
8. ~~Node version.~~ Closed, and it was a real blocker: `@dcl/sdk-commands` v7.27.0 calls
   `fs.globSync`, a **Node 22+** API, despite the docs saying "Node 20 or later". Every build failed
   with an opaque `TypeError`. Node 22.23.2 is now pinned in `package.json` via Volta.

## Still to verify (needs a human at the keyboard)

- **Nothing has been seen running in an actual explorer.** All code compiles and the pure logic has
  24 passing tests, but no round has been played. `npm run start` is the next step and the first
  place real bugs will appear — tile heights, fall thresholds, wall speeds, and whether the sweeper
  gap is actually wide enough to run through.
- Wave speeds, memory durations and the Hex-Drop decay window are first guesses. They need a
  playtest to tune.
- Mobile safe-area layout is written to the documented rules but not yet checked on a real phone.

## Timeline

Deploy target Sep 4, judging Sep 5–11. Day-1 plan work (scaffold, scheduler, layouts, all four
rounds, HUD, lobby) is complete ahead of schedule. The remaining risk is entirely in item 1.
