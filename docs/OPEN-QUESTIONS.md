# Open questions to resolve before/while building

Written 2026-08-31, at project kickoff. Answer these; delete them as they close.

## Blocking

1. **World deployment access.** Do you own a Decentraland NAME or ENS domain to deploy the World to?
   Requirement #1 of the buildathon is a live, publicly accessible World for the whole Sep 5–11 judging
   window. If there's no NAME yet, this is the single longest-lead item — ask in the Friendzone Discord
   channel whether participant NAMEs are provided, and do it on day one.
2. **Wallet.** Which address deploys? Needed for `dcl deploy` and for any signed-fetch leaderboard writes.
3. **Missing reference document.** Plan §4 defers all networking detail to "the Bloop's Pond plan, §4 and §6."
   That document is not on this machine. Either produce it, or write Stumblezone's networking section from
   scratch. Networking is the highest-risk part of the build; it cannot stay a pointer to a missing file.
4. **Multiplayer backend choice.** Decentraland Multiplayer Server vs. a self-hosted ~200-line Node ws server.
   If self-hosted: where does it run, and does it stay up unattended through Sep 5–11? A dead backend during
   judging fails requirement #3 (persistent standalone experience).

## Timeline reality

The plan's Phase 0–8 build order assumes a longer runway than remains. Today is Aug 31; the extended
deadline is Sep 11 and the World must be live from Sep 5. Practical read: aim to have a *submittable*
World deployed well before Sep 5, then improve it in place during the judging window. The stated cut order
(Jump Bar → daily challenge → Tip Toe → ghost times) is likely to be exercised, not held in reserve.

## Design decisions still open

- Solo mode: three lives per round, or continuous score attack? Plan says both in different places.
- Crown persistence: does an anonymous/guest visitor earn crowns, or is a wallet required to appear on the board?
- Does the round schedule run on a real backend clock, or can it be derived purely from UTC wall-clock
  (`floor(now / 8min)`) with no server at all? The latter removes the whole scheduler-server dependency.
