# Stumble Village — design (2026-09-07)

## Why

The scenes that hold a crowd in Decentraland are not the ones with the best minigame; they are the
ones with a *place* around it. WonderMine is a mine you walk around between meteor drops. Golfcraft
is an island with a course on it. Vroomway is a garage you hang out in between races. Stumblezone
has an eight-minute show and a 24×12 m slab to wait on. The village turns the wait into the hangout.

Fall Guys' own retention loop outside the rounds is costumes: something you unlock by playing and
wear where everyone can see it. That is the centre of this design.

## What it is

A village floor at lobby height (y 20), 64 m wide and 18 m deep along the south edge, with the
existing lobby in the middle and a district either side:

- **Hat Market (west).** A shop front, six pedestals, a floating hat on each. Hats unlock by
  playing (qualify once, fall three times, five crowns, a three-streak, an outright win, a show
  championship). Step onto the market and the HUD offers every hat you have earned; wear one and
  everyone in the World sees it on your head. Nothing is spent — crowns stay a score.
- **Disco Deck (east).** A 4×4 floor of party-colour tiles that cycle, a mirror ball turning above
  it. Step on and the DANCE / CLAP / SHRUG row appears, so the wait between rounds is a dance floor.
- **Houses and lamps along the back.** A yellow house and two cabins, lamp posts, bushes, a
  fountain — a backdrop that reads as a town from the arena and from the ledge.
- **Star Hunt.** Five stars a day, placed by the UTC day's seed on ten candidate spots around the
  village. Walk through one for a crown; all five for three more. Everyone sees the same stars;
  collecting is per player.

## Rules

- Everything derives from what clients already share: the day, the show tally, the bus. The only
  new message is `wear { address, hat }`, re-sent by every client at each slot start so latecomers
  see everyone's hats within two minutes.
- Guests can wear hats locally; other clients cannot attach to a guest id, so a guest's hat is
  private to them. Wallet users are visible to all.
- No colliders on anything worn or decorative. The village floor and the shop are the only solids.
- Village geometry stays inside x,z ∈ [0,64], y ≥ 19, and under the arena ring's south edge.

- **Stumble Tower (added the same day).** Twelve platforms spiralling up the west corner to a
  lookout, a base pad that starts a stopwatch and a star at the top that stops it. Best time on
  the board. A test proves every step is a phone-sized jump (gap ≤ 2.4 m, rise ≤ 1.1 m).

## Status

Shipped 2026-09-07 in two commits (`6a61089` village, tower commit after). 97 tests green.
Phone-tuning left for the user: hat `scale`/`y` per hat in `src/lib/hats.ts`, and the tower's
step gaps if a standing jump on the phone falls short.

## Not in scope

An NPC host and a currency. Each is a good next step and none is needed for the village to work.
