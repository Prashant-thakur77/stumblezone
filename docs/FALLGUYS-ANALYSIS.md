# What Fall Guys actually does, and what Stumblezone should take from it

Research-based analysis, 2026-09-01. Method: developer interviews (Mediatonic's Joe Walsh and Jeff
Tanton), level-design criticism, UX writing, and player-community post-mortems on why people quit.
Sources listed at the bottom. **No video was watched** — this is drawn from design literature,
which is more useful anyway: it says *why* things are the way they are.

---

## Part 1 — The ten principles, with evidence

### 1. Falling over IS the game, not the failure state
> "Falling over is basically their superpower. It's what they do best. We had to make sure falling
> over was always slapstick funny." — Jeff Tanton, creative director

Ragdoll exists to make losing funny. Mediatonic explicitly rejected "hyper athletic Ninja Warrior
characters". **Losing must entertain the loser.** If failure only frustrates, the loop dies.

### 2. The three-word rule
Mediatonic's internal rule: **a game mode must be explainable in three words.** Not a sentence —
three words. This is the hardest constraint in their design and the one that makes the game
teachable to a stranger in a noisy room.

### 3. Deliberately inconsistent difficulty *between* rounds
The developers wanted uneven difficulty so that a brutal round appearing is a *shock*. A show where
every act is equally hard has no dynamics. Variance is the point.

### 4. Ramping difficulty *within* a round
Ski Fall's three platforms each carry more hazards than the last. Roll Out's cylinders speed up and
sink into slime over time. Every good round is a curve, not a flat line.

### 5. Choke points create the comedy
Levels deliberately bottleneck players into "chaotic mosh pits where players end up jumping over,
pushing, pulling" each other. Bottlenecks stop skilled players solo-speedrunning and **force the
interaction that makes clips**. Wide-open levels produce parallel play, not shared play.

### 6. Qualification is a race to a quota, not a survival timer
Rounds end **when enough players qualify**, not when a clock expires. The funnel across a show is
roughly 60 → 42 → 28 → 12–9 → 1. Every round has a visible target and a visible countdown of slots.

### 7. It is one show with an arc, not a playlist of minigames
Rounds are acts. Stakes compound. Hex-A-Gone is *always* the final and only runs with under ten
players left — which is exactly why it is nerve-wracking. **The tension comes from the arc, not
from any single round.**

### 8. Music escalates with the tension
In Hex-A-Gone, if the round passes two minutes, the score moves to a more intense section. The
soundtrack tracks the drama rather than looping indifferently.

### 9. Teaching happens through the level, never through text
No tutorials. The opening section of a level is a warm-up that teaches by being survivable.
Difficulty ramps do the instruction.

### 10. The environment must read as *soft*
"All the creases and folds in the crash mats... all the mallets are made out of giant foam or soft
plastic." Physicality and softness tell you it is safe to fail here.

### And the one thing they got wrong
**Grabbing.** The most-cited reason players quit: griefing at finish lines, three-second stunlocks,
inconsistent netcode. Player-vs-player interference in a physics game with lag is a trap. The
community post-mortems are unanimous.

---

## Part 2 — Honest audit of Stumblezone against those ten

| # | Principle | Stumblezone today | Verdict |
|---|---|---|---|
| 1 | Falling is funny | 2s fall through clouds, announcer "YOU LOSE", ledge with CHEER | ✅ strong |
| 2 | Three-word rule | Hints are 8–12 words ("Walls sweep both ways and a beam spins the middle") | ❌ **fails** |
| 3 | Variance between rounds | All four rounds are ~equally hard, all 85s | ❌ **fails** |
| 4 | Ramp within a round | PM 6 waves ✅, Sweeper spinner accel ✅, Tip Toe flat ⚠️, Hex flat ⚠️ | 🟡 half |
| 5 | Choke points | Every round is wide open. Tip Toe's bridge is the only funnel | ❌ **weak** |
| 6 | Race to a quota | Fixed 85s survival clock; no target, no slots counting down | ❌ **fails** |
| 7 | One show with an arc | Four independent rounds; crowns accumulate but nothing compounds | ❌ **the big one** |
| 8 | Escalating music | Two static loops, phase-switched | 🟡 partial |
| 9 | Teach via level | Hints + signs do the teaching; no warm-up beat | 🟡 partial |
| 10 | Soft environment | Rounded discs, spheres, candy palette | ✅ good |
| — | No grabbing | No player-vs-player interference at all | ✅ **by design** |

**The headline:** we built four good minigames. Fall Guys is a *show*. That gap — principle 7 — is
worth more than every visual change we could still make.

---

## Part 3 — The plan, in priority order

Ordered by fun-per-hour against the Sep 4 deadline. Each item names the principle it closes.

### P1 — The Show Arc (closes #7, #6) — the single highest-value change
Make the four rounds one **8-minute show** with a champion, without ever locking a newcomer out.

- Track `showCrowns` per player across the current cycle (slots since the last cycle boundary).
- The HUD gains a **"SHOW: 3rd of 7"** line during play — your standing in the current show, not
  just all-time crowns.
- Hex-Drop, already the finale, becomes explicitly that: the banner reads **"FINAL ROUND — the
  show champion is decided here"**, and its crowns are **doubled**.
- At the podium moment, the announcer says the **show champion**, and the podium sign reads
  "SHOW CHAMPION" for 15s before reverting to the all-time board.
- A late joiner simply starts the show at zero and plays for the next one. Nothing is gated.

*Why it matters:* it converts four disconnected survival tests into a story with a winner, which is
what makes people say "one more show" rather than "one more round".

### P2 — Three-word rounds (closes #2)
Rewrite every hint to Mediatonic's rule. The long version can live on the lobby sign.

| Round | Now | Becomes |
|---|---|---|
| Perfect Match | "Memorise the colours. When one is called, stand on it." | **"Match the colour."** |
| Sweeper Gates | "Walls sweep both ways and a beam spins the middle. Mind the gap." | **"Dodge the walls."** |
| Tip Toe | "Half the tiles are fake. Whoever leads finds them the hard way." | **"Find the path."** |
| Hex-Drop | "Every tile you touch falls away. Four levels down before you are out." | **"Don't stop moving."** |

### P3 — Difficulty variance (closes #3)
Right now every round is a flat 85s of similar pressure. Give the show dynamics:
- **Perfect Match becomes the easy opener** — start at 4 waves not 6, longest memory 7s. It is the
  warm-up act and should feel winnable to a first-timer.
- **Sweeper stays medium.**
- **Tip Toe becomes the spike** — raise the fake-tile ratio ceiling and shorten decay to 300ms.
  This is the round that should make people gasp.
- **Hex-Drop is the finale** — already hardest by structure; the doubled crowns confirm it.

### P4 — A choke point in Sweeper (closes #5)
The platform is 30m wide and players spread out. Narrow the **middle third to a 10m causeway**
between two gaps in the floor, so the whole field is funnelled through the spinner's arc together.
Cost: one platform rebuilt from three boxes instead of one. Payoff: the mosh pit that makes clips.

### P5 — Warm-up beat (closes #9, #4)
The first **8 seconds of play in every round are harmless** — walls hold at the far edge, tiles do
not decay, no colour is called. A first-timer gets to look around and understand the space before
anything can kill them. Free to implement: rounds already receive `playElapsed`.

### P6 — Adaptive music (closes #8)
A third bed, `music-tense`, generated by the same script at a faster tempo with a busier arpeggio.
Swap to it for the final 20 seconds of every round — landing with the existing HURRY UP and the
spinner acceleration, so all three tension signals fire together.

### P7 — Tip Toe and Hex-Drop internal ramps (closes #4)
- Tip Toe: decay time shortens as the round progresses (500ms → 250ms), so late crossers get less
  thinking time than the pioneers.
- Hex-Drop: decay shortens per deck — the lower you fall, the faster the floor goes.

---

## Part 4 — What we deliberately will NOT copy

- **Grabbing / any player-vs-player interference.** The single most-cited reason players quit Fall
  Guys. In a mobile scene with network lag it would be worse, and it would break the "survival
  against the arena, not each other" rule that lets Stumblezone work solo.
- **60 players.** Worlds cap at 100 concurrent, but our design must be complete at N=1. Everything
  above scales down to a single judge at 3am.
- **Heavy RNG maps.** Cited alongside grabbing as a quit reason. Our seeded layouts are random but
  *fair by construction* — the Tip Toe solvability test exists precisely for this.
- **Team rounds.** They generate the "why are my teammates bad" frustration thread. Not worth it.

---

## Sources

- [Royale rumble: How Mediatonic created "the perfect blend of chaos and skill"](https://www.gamesradar.com/fall-guys-interview/) — GamesRadar (ragdoll philosophy, "falling over is funny", the three-word rule)
- [Q&A: Designing for seasons in Fall Guys](https://www.gamedeveloper.com/design/q-a-designing-for-seasons-in-bumbling-platform-royale-i-fall-guys-i-) — Game Developer
- [The Level Design Behind Fall Guys — A Junior's analysis](https://www.nathantubb.co.uk/post/the-level-design-behind-fall-guys-a-junior-s-analysis) — choke points, within-round ramps, teaching through level
- [Talking level design with the creators of Fall Guys](https://www.scmp.com/yp/discover/entertainment/tech-gaming/article/3104705/talking-level-design-creators-fall-guys) — SCMP
- [Hex-A-Gone wiki](https://fallguysultimateknockout.fandom.com/wiki/Hex-A-Gone) — finale-only placement, music escalation at two minutes
- [Fall Guys — Wikipedia](https://en.wikipedia.org/wiki/Fall_Guys) — round/elimination structure
- [Troll's with grabbing are killing the game](https://steamcommunity.com/app/1097150/discussions/0/3086646248544088762/) and [Fall Guys Players Demand Answers](https://happygamer.com/fall-guys-players-demand-answers-as-community-frustration-boils-over-137997/) — quit reasons
- [How Mediatonic crafted a cute battle royale](https://gamesbeat.com/fall-guys-ultimate-knockout-how-mediatonic-crafted-a-cute-battle-royale/) — GamesBeat
