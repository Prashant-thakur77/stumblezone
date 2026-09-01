# Stumblezone — the complete vision

What this game is when it is finished, written down so every remaining hour gets spent moving
toward the same picture. Grounded in what is already built (marked ✅), honest about what is not
(marked ▢). Written 2026-09-01; deploy target Sep 4, judging Sep 5–11.

---

## 1. The one-sentence fantasy

**You wander into a floating carnival in the sky where a game show is permanently in progress, and
within thirty seconds you are playing.**

Everything in the project serves that sentence. No menus, no lobby queue, no host, no instructions
longer than three lines. The arena was running before you arrived and it keeps running after you
leave. The crowd — when there is one — is the show; when there isn't, the clock and your own best
times are opponent enough.

## 2. The player's first three minutes (the judge's experience)

This is the sequence a judge on a phone actually walks through, and it is the thing we tune above
all else:

1. **0:00 — Spawn.** You land in a bright carnival lobby: balloons, trees, a gold podium with a
   spinning crown, jump pads pulsing underfoot. Music is playing. Ahead, past the signs, an arena
   ring of glowing pillars floats over open sky with clouds drifting through it. A huge floating
   sign says what round is next and a countdown is already running. ✅
2. **0:10 — You read one sign.** Three lines: qualify to win crowns, fall and you cheer from the
   ledge, new round every 2 minutes. That is the entire onboarding. ✅
3. **0:20 — You bounce on a jump pad** because it is glowing and right there. Maybe you climb the
   perch. The countdown hits zero. ✅
4. **0:30 — You are teleported onto the round floor** with everyone else, frozen for a five-second
   get-ready, told in one line what to do: "Memorise the colours. When one is called, stand on it."
   The round music kicks in. ✅
5. **0:35–2:00 — You play.** You probably lose a life or two. The floor shudders before it drops,
   so every failure is legible: you saw it coming, you were just too slow. If you go out, you are
   lifted to a ledge with a full view, a CHEER button, and other losers to commiserate with. ✅
6. **2:00 — Results.** QUALIFIED! with confetti, or the honest count of how many outlasted you.
   Your crown total ticks up on the lobby board; if you lead, your name is on the podium. ✅
7. **2:10 — NEXT UP: Sweeper Gates, 1:50.** You bounce on the pads and wait, because you already
   want the next one. That desire is the entire retention model. ✅

Every design decision below exists to protect this loop.

## 3. The four rounds — how each should look and play

The shared shape: **20s intro** (hint + countdown in the lobby) → **85s play** (5s frozen get-ready,
then the game) → **15s results**. A full cycle of all four rounds is 8 minutes. Nothing waits for
players; everything derives from the UTC clock and the slot seed. ✅

### Round 1 — Perfect Match (memory)
- **Looks:** a 5×5 checkerboard of fat tiles in candy colours over open sky.
- **Plays:** six escalating waves. Colours show (6s down to 2s), the board blanks, a colour is
  called by name — STAND ON RED — with a 6-second countdown, every doomed tile shudders in the
  last second, then a 1.2s **reveal** shows every colour again before the wrong tiles drop. ✅
- **Escalation:** more colours (3→5), less memory time, same rules. ✅
- **Signature moment:** the reveal — the whole field looking down at the floor at once. ✅
- ▢ *Wanted:* the called colour shown as a coloured swatch on the jumbotron, not just named in
  text (colour-blind players get the name, everyone else gets the flash).

### Round 2 — Sweeper Gates (dodging)
- **Looks:** a blue platform ringed by glowing bumper spheres, walls in coral pink sweeping across,
  a huge golden beam with sphere caps spinning at the centre.
- **Plays:** four walls, alternating directions, each with a gap to thread. Hits knock you back
  (never teleport) and cost one of three hearts. Survive 85 seconds. ✅
- **Escalation:** each wall belongs to a faster wave. ✅
- **Signature moment:** threading a gap just as the spinner sweeps past behind you. ✅
- ▢ *Wanted:* the spinner accelerating in the final 20 seconds, with a musical cue.

### Round 3 — Tip Toe (nerve)
- **Looks:** a four-wide bridge of tiles stretching to a finish flag, over a long drop.
- **Plays:** roughly half the tiles are fake and drop moments after a touch — permanently. The
  crowd's path knowledge accumulates: whoever leads pays for it, whoever follows profits. First
  finisher earns a bonus crown. ✅
- **Signature moment:** the standoff — four players hovering at the same broken row, each waiting
  for someone else to test a tile. ✅ (emerges on its own with 3+ players)
- ▢ *Wanted:* fallen tiles leaving a faint "scar" so the death map reads at a glance from the back
  of the bridge.

### Round 4 — Hex-Drop (the finale)
- **Looks:** four stacked decks of round tiles, each deck darker than the one above, over the void.
- **Plays:** every tile you touch shudders and falls a half-second later. Four levels of second
  chances, then the drop. Last one standing takes 4 crowns; alone, it is a survival clock against
  your best. ✅
- **Signature moment:** two players circling the last intact patch of the bottom deck. ✅
- ▢ *Wanted:* a low ominous music layer fading in as you fall to deeper decks.

## 4. The world — what it should look like when you pan the camera

A **floating carnival at golden hour**, 24 metres above a solid green ground. Fixed late-afternoon
sky. The arena is a disc of colour in open air: white pillars rising the full 34m from the ground
past the arena, cloud puffs drifting in the fall zone below the tiles, a pink splash pad and trees
on the ground beneath. **A fall is a two-second story** — through the clouds, down the pillars,
the ground rushing up — ended a moment before impact. The lobby is the carnival's
midway: podium, balloons, trees, bouncy pads, big readable signs. Everything is fat, rounded,
saturated, and slightly glowing. Nothing is grey. Nothing is still: caps spin, pads bob, clouds
drift, doomed tiles shudder, the crown rotates. ✅

The style rule that keeps it coherent: **SDK primitives for anything with many copies, one GLB for
anything singular** (crown, finish flag, balloons, clouds, trees, confetti). This is also the
performance rule — we sit at 12% of the entity budget and 2% of the triangle budget, which is what
"comfortably inside mobile limits" looks like on a judge's mid-range phone. ✅

## 5. Sound — the game should be audible with your eyes closed

- Lobby: calm plucked loop. Round: driving kick-led loop. Phase-switched. ✅
- Countdown ticks → GO chirp → your own steps cracking tiles → descending sting when you fall →
  fanfare and confetti when you qualify. ✅
- **A real announcer** (CC0, Kenney Voiceover Pack): READY / SET / GO at every start, HURRY UP at
  15 seconds, YOU WIN / GAME OVER / CONGRATULATIONS / NEW HIGH SCORE to match your actual result,
  YOU LOSE the moment you fall, and FINAL ROUND for Hex-Drop. ✅
- All synthesised in-repo (tools/make-audio.mjs) — no licensing, 0.5 MB. ✅
- ▢ *Wanted:* a rising tension layer in each round's last 15 seconds; a soft crowd "oooh" when
  anyone nearby is eliminated (both synthesisable the same way).

## 6. Social — designed for a crowd, honest alone

The buildathon's bar is meaningful social interaction, and mobile has **no proximity voice**, so
every social feature works through presence, text, emotes and shared spectacle:

- Everyone in the World is in the same round at the same second — shared fate is the baseline. ✅
- Spectator ledge with free movement and a big CHEER button that fires visible emotes. ✅
- Tip Toe's sacrificial pathfinding — cooperation nobody has to agree to. ✅
- Crowns on a live board, the leader's name over the podium, "N alive" pressure in the HUD. ✅
- Solo is never a dead end: three lives per round, personal bests, ghost-times on the results line.
  A judge at 3am gets a complete game and a reason to try one more cycle. ✅
- ▢ *Wanted:* an end-of-cycle "podium moment" — after Hex-Drop, the top three crown holders are
  teleported onto the podium steps for 10 seconds of confetti and emotes.

## 7. What is deliberately NOT in this game

Saying no is part of the vision:

- **No backend.** The schedule is UTC maths; crowns are session-scoped. An outage cannot exist. ✅
- **No new controls.** Walk and jump, full stop. Anything needing a third input is out. ✅
- **No text-heavy anything.** If it cannot be said in one line, it gets redesigned. ✅
- **No round longer than 85 seconds**, no cycle longer than 8 minutes, no wait without something
  bouncy nearby. ✅
- **No wallet gate.** Guests earn crowns like everyone else. ✅

## 8. Gap list — everything between here and "finished", in priority order

1. ▢ **World name + first deploy** (blocked on Regenesis Labs reply; wallet is ready).
   Everything else is polish; this is existence.
2. ▢ **A real playtest cycle on phones** — the wobble duration, wall speeds, hex decay, music mix
   and HUD sizes are all tuned by arithmetic, not by hands. Two sessions of "play, adjust, replay".
3. ▢ Jumbotron colour swatch for Perfect Match (small, high value).
4. ▢ End-of-cycle podium moment (the game's missing celebration peak).
5. ▢ Tension audio layers + crowd reactions (the announcer's HURRY UP covers part of this). ✅ partly
6. ▢ Tip Toe scars; Hex-Drop deck music layer; spinner acceleration.
7. ▢ **Submission kit:** thumbnail image, 60–90s two-phone demo video, DoraHacks form, two
   scheduled "crown rush hour" events during judging week so judges can meet a crowd.
8. ▢ Stretch, only if everything above is done: a fifth round (Jump Bar — one rotating beam on a
   disc, all pieces already exist in the sweeper).

## 9. The measure of done

Hand a phone to someone who has never seen Decentraland, say nothing, and watch. It is finished
when, without a single question, they: bounce on a pad, join a round, lose, cheer somebody from the
ledge, win a crown two rounds later, and ask whether they can keep playing. Every item in the gap
list either serves that test or gets cut.
