# Open questions to resolve before/while building

Written 2026-08-31, at project kickoff. Answer these; delete them as they close.
Last updated 2026-08-31 after [ARCHITECTURE.md](ARCHITECTURE.md) landed.

## Blocking

1. **World deployment access.** Do you own a Decentraland NAME or ENS domain to deploy the World to?
   Requirement #1 of the buildathon is a live, publicly accessible World for the whole Sep 5–11 judging
   window. If there's no NAME yet, this is the single longest-lead item — ask in the Friendzone Discord
   channel whether participant NAMEs are provided, and do it on day one.
   (An ENS domain you already hold works and needs no MANA: 36 MB cap, 100 concurrent users — plenty.
   See ARCHITECTURE.md §3.)
2. **Wallet.** Which address deploys? Needed for `dcl deploy` and for any signed-fetch leaderboard writes.
   If deploys run from GitHub Actions, use a *disposable* wallet granted deploy rights, not the wallet
   that owns the NAME/ENS.

## Closed

3. ~~**Missing reference document.**~~ **Closed 2026-08-31.** The "Bloop's Pond plan" pointer in BRIEF.md §4
   is gone; [ARCHITECTURE.md](ARCHITECTURE.md) is now the authoritative networking document.
4. ~~**Multiplayer backend choice — blocking.**~~ **Downgraded 2026-08-31, no longer blocking.** The round
   scheduler is pure client-side UTC math, so nothing in the core game waits on a backend. Persistence
   (crowns, dailies, ghosts) is Layer 2 and optional: Multiplayer Server, a ~200-line Node ws server, or
   session-only crowns. Decide in Phase 5, timeboxed to half a day. A dead backend during judging now
   degrades leaderboards only — requirement #3 still holds.
5. ~~**Backend clock vs UTC wall-clock schedule.**~~ **Closed 2026-08-31: pure UTC.**
   `SLOT_SECONDS = 120`, `slot = floor(now/120)`, `roundType = slot % 5`, `seed = hash(slot)` — a
   10-minute cycle, computed identically on every client. Skew is absorbed by a 5-second "get ready"
   freeze at each round start; inputs are judged locally.

## Timeline reality

The plan's Phase 0–8 build order assumes a longer runway than remains. Today is Aug 31; the extended
deadline is Sep 11 and the World must be live from Sep 5. Practical read: aim to have a *submittable*
World deployed well before Sep 5, then improve it in place during the judging window. The stated cut order
(Jump Bar → persistence → daily challenge → Tip Toe → ghost times) is likely to be exercised, not held
in reserve. Phase 2 shrinking to ~half a day buys back some of that runway.

## Design decisions still open

- Solo mode: three lives per round, or continuous score attack? BRIEF.md says both in different places.
- Crown persistence: does an anonymous/guest visitor earn crowns, or is a wallet required to appear on
  the board? (Only decidable once Layer 2's option is picked — guests can't sign a `POST /result`.)
- Hex-Drop join window: how far into the slot can a player still enter before being forced to spectate?
  Everything else derives from the seed, so this is the one round with a real mid-round join limit.
