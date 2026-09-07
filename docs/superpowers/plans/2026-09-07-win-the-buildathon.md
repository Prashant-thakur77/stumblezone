# Win the Buildathon — final-week plan (2026-09-07)

> Judging runs Sep 5–11 in the Decentraland mobile app. Results Sep 13. Everything below is
> ordered by how much it moves a judge's score per hour spent. Items marked **(you)** need the
> wallet, a phone, or an account and cannot be done from this repo.

**Spec:** `docs/superpowers/specs/2026-09-02-beyond-fall-guys-design.md` (all six tracks shipped,
82 tests green). This plan covers what is left between a finished build and a winning entry.

## What the research says

- Judges (forum update, Sep 5): Giorgio — performance, mobile-first, polish · Agus — mobile UX,
  controls · Bay Backner — social value, retention, discovery · Nico E — usability, onboarding,
  execution · MetaRyuk — creativity, social, retention. All test **in the mobile app**.
- Hackathon judges form an opinion in the first 30 seconds and see the README when they cannot
  play; a 60–90 s video is the single highest-leverage artefact; submit early, not at the wire.
- Top 10 may be featured in the mobile app's **Discover** section — the thumbnail is the pitch there.
- Hard eligibility: World live all week, **public GitHub repo**, DoraHacks BUIDL submitted by Sep 11.

## Gates (blocking, today) **(you)**

- [ ] **G1 Redeploy.** The live World is the Sep 1 build; everything since (6 rounds, feed, hype,
      textures) is only on this machine. `npm run deploy -- --target-content https://worlds-content-server.decentraland.org`
- [x] **G2 Public GitHub repo.** `git remote -v` is empty. Create `stumblezone` (public) on GitHub, then
      `git remote add origin git@github.com:<you>/stumblezone.git && git push -u origin main`.
      Then put the URL in README.md and docs/SUBMISSION.md where it says https://github.com/Prashant-thakur77/stumblezone.
- [ ] **G3 Submit the BUIDL now** with the text in docs/SUBMISSION.md; edit until the deadline.

## Task 1: Late joiners play instead of waiting — *onboarding, first 30 s*

A judge who arrives after the get-ready freeze currently sits on the ledge until the next slot —
up to 100 s of "you're up next" as their first impression. Four of the six rounds derive every
hazard from the seed and the clock, so a latecomer can be dropped straight in.

- Create `src/lib/join.ts`: `JOIN_WINDOW_SECONDS = 40`, `canJoinLate(elapsed, joinSafe)`,
  `secondsUntilPlay(elapsed)`.
- Add `joinSafe?: boolean` to `Round`; true on Perfect Match, Sweeper Gates, Spotlight, Jump Bar.
  Tip Toe and Hex-Drop stay spectate-only (their decay is per-step synced; a latecomer misses it).
- `beginSlot`: inside the window on a join-safe round, spawn into the arena live with a
  "JOINED LATE · GO!" banner; otherwise the ledge as today, but with a live "NEXT ROUND IN 0:47"
  banner during play so the wait is explained, not silent.
- Test: window bounds; worst-case wait on a join-safe round ≤ 55 s.

## Task 2: Discover thumbnail — *discovery*

`tools/make-thumbnail.py` (Pillow): 1024×768, the HUD palette, the title, "a new round every 2
minutes", hex tiles. Replaces the Aug 31 placeholder. **(you)** swap in a real phone screenshot of
the stadium if you get one — the script's output is the fallback, not the ceiling.

## Task 3: CI that proves the README — *execution*

`.github/workflows/ci.yml` uses `setup-node@v1` and Node 24 and runs only the build. Switch to
`setup-node@v4`, Node 22, `npm run verify` (build + 82 tests + budget). No secrets, ever.

## Task 4: Submission kit — *all criteria, through the judges' eyes*

- `docs/SUBMISSION.md`: 75-second video script (shot list, two phones), the BUIDL description
  mapped to the five judges' stated focus areas, a "your first three minutes" walkthrough,
  Discord/forum announcement text, and the steps to create two DCL events. **(you)** record, post.
- `README.md`: "For judges — your first three minutes" at the top, repo/video placeholders.
- `docs/TESTING.md`: late-join checks.

## Task 5 (you, Sep 8–10): two-phone playtest → fixes → redeploy → video → events

Redeploy after every fix; the World judges see is whatever was deployed last.
