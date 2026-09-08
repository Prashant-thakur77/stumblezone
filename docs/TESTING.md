# Playtest guide

The scene has never been played. Everything in it compiles and 31 unit tests pass, but pacing,
sightlines and feel can only be judged in the client. This is the checklist for the first run.

## Setup (once)

1. Install **Decentraland** on your phone (Android or iOS).
2. Put the phone on the **same Wi-Fi** as this laptop.

## Run it

```bash
cd /home/prashant/stumblezone
npm run start -- --mobile
```

A QR code prints in the terminal. Scan it with the phone camera and it opens the scene in the
Decentraland app. No wallet, no World, no NAME needed — this streams straight from the laptop.

Leave the terminal running. Edits rebuild automatically; pull down to reload in the app.

## What you should see

You spawn in the **lobby**, facing the arena. Behind the arena direction: a gold three-step podium
and four billboarded signs — the title, three lines of instructions, CROWNS, and NEXT UP. Beyond
them, a ring of twelve white pillars with glowing coloured caps, and a big floating round name and
countdown over the arena.

**A round starts every 2 minutes**, on the UTC clock. The cycle is Perfect Match, Sweeper Gates,
Tip Toe, Hex-Drop, repeating forever. NEXT UP tells you what is coming and when.

At the start of play you are **teleported into the arena** and frozen for 5 seconds, then released.

## Checklist

Work through this and note anything that is wrong or feels bad. "Feels bad" is a real bug report —
most of what needs fixing now is pacing, not correctness.

### First impressions
- [ ] Does it load without errors, and how long does it take?
- [ ] Can you read the signs from the spawn point without walking to them?
- [ ] Is the floating countdown over the arena readable from the lobby?
- [ ] Frame rate: smooth, or chugging?

### Perfect Match (6 waves, colours)
- [ ] Do the tiles show clear, distinguishable colours?
- [ ] Is the memorise phase long enough on wave 1? Too long?
- [ ] When "STAND ON RED" appears, can you reach a safe tile in 6 seconds from the far corner?
- [ ] Do the wrong tiles actually drop, and do you fall with them?
- [ ] After falling, are you put back on a safe tile with a life gone?
- [ ] Do six waves feel exciting or exhausting?

### Sweeper Gates
- [ ] Can you see walls coming in time to move?
- [ ] Walls alternate direction — is that fun or confusing?
- [ ] Is the gap easy enough to aim for with a joystick?
- [ ] Does hitting a wall knock you back and cost a heart?

### Tip Toe
- [ ] Can you get onto the bridge from the start pad?
- [ ] Do fake tiles vanish shortly after you step on them?
- [ ] Do real tiles stay solid?
- [ ] Can you reach the finish pad at the far end?

### Hex-Drop
- [ ] Do tiles fall away behind you as you move?
- [ ] Is the lower deck visibly darker than the upper one?
- [ ] Does falling through both decks eliminate you?

### Eliminated / spectating
- [ ] Are you teleported to a high ledge with a view of the arena?
- [ ] Can you walk around up there (you should be able to)?
- [ ] Is there a large CHEER button on screen, and does it play an emote?
- [ ] If you walk off the ledge, are you put back?

### HUD and audio
- [ ] Round name top centre, lives top left, "N alive" top right — all readable?
- [ ] Is anything hidden behind the joystick or jump button?
- [ ] Countdown ticks, a "go" sound, cracks when tiles break, a sting when you go out?
- [ ] At results: does it show your time and personal best?

### Between rounds
- [ ] Are you returned to the lobby?
- [ ] Does the CROWNS board update after you survive a round?
- [ ] Does the podium show a crown leader?

## Reporting back

Most useful, in order:

1. **Anything that crashed, or that you could not do at all** (couldn't reach the bridge, fell
   through the floor, got stuck).
2. **Screenshots.** Even one of the lobby and one of each round tells me more than a paragraph.
3. **Pacing.** Too fast, too slow, too long waiting, too hard, too easy — per round.
4. **Anything you couldn't read** on the phone screen.

Two-player testing is worth doing once it works solo — a second phone, or a friend, on the same
World. Elimination, the alive counter and the crown board only really exercise with a crowd.

---

## Phone checklist for the "beyond Fall Guys" features

Run `npm run start -- --mobile` and scan the QR. Everything below is a mobile-only failure mode —
none of it can be caught in the desktop preview.

**HUD shapes (the reason this pass exists)**
- [ ] Every pill and card is *rounded*. A hard rectangle means a texture failed to load — check the
      console for `images/ui/*.png` and re-run `npm run ui`.
- [ ] Each plate has a dark edge under it, offset down-right. No edge means the shadow copy is
      drawing on top rather than underneath.
- [ ] Life dots are circles, not squares.
- [ ] The CHEER button is a rounded pill and is tappable with a thumb.

**Feed, hype and reactions**
- [ ] Get eliminated on one device and confirm the other device shows "<name> is OUT" within a
      second, and that it disappears after four.
- [ ] Cheer five times in ten seconds from the ledge: the crowd roars, confetti fires, and
      "THE CROWD IS GOING WILD" appears. Then confirm a sixth cheer does *not* fire it again.
- [ ] On the results card, tap DANCE / CLAP / SHRUG. Your avatar plays the emote and the other
      device's feed says you cheered.

**Rounds**
- [ ] Jump Bar: the beam is jumpable from a standing jump at the start and still jumpable at the end.
      At 50s a second beam appears turning the other way, and it does not take a heart before it is
      visible.
- [ ] Spotlight: the stage is clearly darker than the lights. Standing in one turns it red for about
      half a second and ticks before it takes a heart. Stepping out cancels it.
- [ ] Both rounds: walk to the edge of the disc and confirm you can fall off it.
- [ ] Confirm the disc is *gone* during Tip Toe and Hex-Drop — an invisible collider left behind
      would let you stand in mid-air.

**Show rules**
- [ ] Watch two consecutive shows and confirm the three acts differ between them, and that both end
      on Hex-Drop.
- [ ] The intro card tag reads "ROUND 2 · SURVIVAL", not a round id.
- [ ] On a Golden Show the card, the top tag and the jumbotron are gold, and the lobby board says
      "GOLDEN SHOW NOW - DOUBLE CROWNS".
- [ ] The lobby board shows "TODAY: <challenge>" and a countdown to the next Golden Show.

**Cosmetics and camera**
- [ ] With two accounts, confirm the show leader wears a crown on *both* screens.
- [ ] Qualify twice in a row and confirm a star appears over your name tag on the other device.
- [ ] After a finale, the podium crane shot plays for about six seconds and control comes back.
      If the camera sticks, that is `virtualCameraEntity` not being cleared — a hard blocker.

**Late joiners (the judge's first 30 seconds)**
- [ ] Join during play of Perfect Match, Sweeper, Spotlight or Jump Bar, inside the first 40 s:
      you spawn in the arena, see "JOINED LATE - GO!", and can lose a heart immediately.
- [ ] Join during Tip Toe or Hex-Drop, or after the 40 s window: you land on the ledge and the
      banner reads "NEXT ROUND IN Ns", counting down every second.
- [ ] A live latecomer who qualifies is counted and scores; one on the ledge is not counted as eliminated.

**Stumble Village**
- [ ] The floor is continuous from x 0 to 64 at lobby height; no seam at the old lobby edges.
- [ ] Walk onto the Hat Market: the panel appears with six hats; locked ones show their condition.
      Qualify once, come back, tap WEAR CAP: the cap sits on your head, not in your face - if it
      floats or clips, adjust `scale` / `y` for that hat in `src/lib/hats.ts` (one line each).
- [ ] On a second device, confirm the hat is visible on the first player within one slot.
- [ ] Step onto the Disco Deck: tiles cycle colour, the ball turns, the reactions row appears.
- [ ] Walk through a star: it disappears for you only, "STAR 1/5 +1" in the feed, the board updates.
- [ ] Nothing in the village blocks the path from spawn to the podium, the boards, or the pads.
- [ ] Stumble Tower: every step is reachable with a standing jump on the phone; the base pad starts
      the clock, the star at the top stops it, the time shows in the feed and on the board.

**The ring road and the sky**
- [ ] Walk from the village onto each lane: no step at the join, kerb on the arena side.
- [ ] Practice Yard: a tile you stand on sinks after half a second and comes back in four; the
      light turns red before the toast; the beam nudges, never throws you off the lane.
- [ ] Speed Lap: start pad, turn pad on the corner, finish at the start; a straight-back finish
      without the turn does nothing.
- [ ] Hall of Fame shows the crown board's names on the plinths; the frame makes you wave.
- [ ] Sky Cannon lands you back on the plaza or the lane, not in the arena. If it overshoots, lower
      `CANNON_STRENGTH` in `src/arena/cannon.ts`.
- [ ] Sky Course: every step from a standing jump; the Sky Box floor is see-through; the drop from
      its south edge lands on the rings and pays.
- [ ] Sam waves every twenty seconds and the bubble changes every seven.
- [ ] The disco loop is audible on the deck and gone by the podium.
- [ ] Five cheers: the pillar caps flash white for four seconds.

**Moments (cycles 1-3)**
- [ ] The crane shot plays during the round card and hands the camera back before the freeze.
- [ ] A SHIELD star on Sweeper: take it, get hit - no heart lost, "SHIELD took the hit".
- [ ] A BOOST star: eight seconds of noticeably faster running; then back to normal.
- [ ] Perfect Match wave 3+: at least one round in three shows "SWITCH! STAND ON ..." with time
      to move. If it feels impossible, raise `SWITCH_SECONDS` in `src/lib/layouts.ts`.
- [ ] Jump Bar at 70 s: "REVERSE!" and both beams turn the other way.
- [ ] Spotlight at 60 s: two seconds of no lights, then they are somewhere else.
- [ ] Hex-Drop at 60 s: "CRUMBLE!" and about a third of the top deck falls.
- [ ] Tip Toe: a gold tile visible from the start pad; stepping on it pays once.
- [ ] From the ledge: PICK buttons for the players still in; the result pays at the card.
- [ ] BOO plays the groan on the other device and shows in its feed.
- [ ] GG on the results card lands as "<name> says GG" on the rival's device.
- [ ] The last five seconds show as big numerals; the crowd gets louder as HYPE fills.

**Copycat, the house, the welcome card**
- [ ] First spawn: the HOW TO PLAY card, GOT IT dismisses it; it never comes back this session.
- [ ] Copycat: the coach on the stage performs each pose as it is named; then six buttons appear;
      tapping them plays the emote on your avatar and advances "YOUR TURN 1/3". A wrong one costs
      a heart at once; running out of time costs one at the end. The emote wheel counts too.
- [ ] Results card shows "BEAT THE HOUSE +1" when you outlasted the house time, or the house time
      you missed. Alone, this is the line that gives the round a score.

**Later on 09-08**
- [ ] Other players show by real name in the feed and on the boards, not as 0x addresses.
- [ ] "<name> joined the show" / "left" appear in the feed on the other device.
- [ ] A SHIELD shows as a blue bubble around you (visible on the other device); BOOST shows a star
      over your name tag.
- [ ] The results card ends with "NEXT: <round> in Ns" and, after a rival round, "vs <name> this
      show: 2-1".
- [ ] While climbing the tower or running the lap, a green stopwatch pill counts under the round tag.
- [ ] After a finale: ENCORE toast, pose buttons open for everyone for fifteen seconds.
- [ ] Copycat's coach is dancing on the stage during the round card; the jumbotron shows the crowd
      favourite once anyone picks.

**Crown Rush**
- [ ] A gold ring with a crown over it on the stage; standing inside counts up "IN THE ZONE 12";
      the ring hops every twelve seconds with a boing and gets smaller as the round goes on.
- [ ] With two devices: both scores show up on each other's results card and the same winner is
      named on both. The spectator's PICK pays out for the winner.

**The simplified HUD (Day 1)**
- [ ] Nothing ever overlaps: at most one card in the centre and one panel above the joystick.
- [ ] During a live round the corners are quiet - no daily, no show standing, no round tag, no
      stopwatch; they come back the moment the round ends.
- [ ] The last five seconds show the numeral *below* the round name, not over it.
- [ ] The welcome card goes away on GOT IT, at the first whistle, or after thirty seconds.
- [ ] Eliminated during Copycat: you get the pose buttons, not the cheer buttons underneath them.

**Onboarding and signage (Day 2)**
- [ ] The round card reads: name, what to do, which control, then the twist and the house target.
- [ ] Three signposts are readable from the spawn point without walking.
- [ ] Before your first round Sam's first line points at the Practice Yard; after it, he stops.
- [ ] The card after a finale names tomorrow's daily challenge.
- [ ] Stand in the Hat Market when a round starts: the panel is gone when you land in the arena,
      and it does not come back until you step on the market again.

**Commentary and the crown trainer**
- [ ] After a finale Sam names the champion; after a Crown Rush he names who held the zone and for
      how long; at a three-streak he calls it; when a second player walks in he welcomes them by name.
- [ ] The Practice Yard's fourth station is a gold ring that hops every eight seconds; standing in
      it toasts once and explains what it would be worth in Crown Rush.
