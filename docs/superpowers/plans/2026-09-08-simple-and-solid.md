# Simple and solid — the last three days (plan, 2026-09-08)

## What the popular scenes actually teach

WonderMine is the most-visited scene in Decentraland and its author's stated goal was *"to give
players a fun reason to log in every day, starting with simple game mechanics… so people can
immediately start playing without a steep learning curve."* Golfcraft splits a **training zone**
from **competition mode**, so nobody's first swing is a scored one. Both lessons are about the
first ninety seconds, not about features. Stumblezone has more features than either; what it does
not yet have is their restraint.

So: no new systems this week. Three days of making what exists legible, then submit.

---

## Day 1 (tonight) — one owner per region, and the six real overlaps

The HUD has grown to ~18 elements with hand-written visibility rules, and a box-overlap check of
the 1920×1080 virtual canvas finds six pairs that can be on screen together:

| Overlap | When |
|---|---|
| Last-five numeral ↔ play banner | every round's last five seconds |
| Last-five numeral ↔ the top pills | same |
| Welcome card ↔ daily pill | a first visit |
| Spectator buttons ↔ pose row | eliminated during Copycat or the encore |
| Spectator buttons ↔ hat panel | eliminated, standing in the market |
| Pose row ↔ hat panel | the encore, standing in the market |

**Task 1.1 — one centre, one bottom band.** `centreCard()` returns exactly one of
`welcome | countdown | card | results | play | last5`, and `bottomBand()` exactly one of
`poses | shop | spectator | none`. Every component renders on its own name; no component writes
another's exclusion rule. Test: the pure selectors, over every combination of flags.

**Task 1.2 — quieter during play.** While a round is live the screen carries only: round name,
clock, lives, field, the banner, and the feed. The show standing, the daily, the activity
stopwatch and the round tag are between-rounds information and wait there.

**Task 1.3 — the welcome card times out.** Thirty seconds, or GOT IT, or the first whistle.

## Day 2 (Sep 9) — the first ninety seconds

**Task 2.1 — the funnel Golfcraft has.** Sam sends a first-time visitor to the Practice Yard by
name ("Two minutes to the round — the yard is left, it costs nothing"), and the yard's sign says
what it teaches. Signposts at the spawn point face the three places a newcomer should find:
arena, market, yard.

**Task 2.2 — the daily is the reason to come back, so say it once.** The results card of your
last round before you leave should name tomorrow's challenge. A "COME BACK" line on the podium.

**Task 2.3 — one-line onboarding on the round card.** Every round already has `hint` and `twist`;
add the control ("Walk", "Walk and jump", "Tap the poses") so the card answers *what do I press*.

**Task 2.4 — cut anything that confuses.** A pass with fresh eyes over every string on screen:
if a line does not tell a player what to do or what just happened, it goes.

## Day 3 (Sep 10) — proof and submission

- Phone pass (docs/TESTING.md), fix what it finds, redeploy, and **submit the BUIDL**.
- Video (75 s script in docs/SUBMISSION.md), two events, announcement post.

## Day 4 (Sep 11) — buffer

Deadline day. Nothing new; only fixes to what the phone found.

## Not doing

New rounds, new places, persistence. Eight rounds and a village are already more than a judge
will see in one visit; the risk from here is confusion, not thinness.
