# How Fall Guys *presents* itself, and what Stumblezone should take from it

Research-based analysis, 2026-09-02. The earlier [FALLGUYS-ANALYSIS.md](FALLGUYS-ANALYSIS.md)
covered *game design* — arc, choke points, three-word rounds — and all of it shipped. This pass
covers **presentation**: soundtrack, sound design, HUD/UX, and the look of the world. Method:
composer interviews, UI databases and portfolio write-ups, art-team threads, and track metadata.
No video was watched.

---

## Part 1 — The soundtrack (Jukio Kallio + Daniel Hagström)

What the composers actually say they did:

| Finding | Evidence |
|---|---|
| **Fast.** The main theme *Everybody Falls* runs at **153 BPM in F♯ minor** — a minor key made joyful by tempo and bounce, not a major-key nursery tune. | Tunebat / SongBPM track metadata |
| **Slap bass + breakbeats + "bulbous" synths.** The rhythm section is funky, not four-on-the-floor. | Bandcamp Daily interview |
| **'70s/'80s sports-programme themes** were the brief — brass-stab TV-fanfare energy, "then modernised into something more experimental". | Bandcamp Daily, Bandwagon |
| **"Eurovision modulations"**: the key jumps up mid-loop "sometimes mid-riff", which makes a looping track feel new without changing the melody, and the loop must modulate back to land seamlessly. | Bandcamp Daily |
| **Toy and household percussion** — recorded a balloon being inflated for the main theme; sampled toys as drums. | Bandwagon, Bandcamp Daily |
| **Anti-fatigue**: "small sonic variations and tonal contrast" because players hear each track hundreds of times. | Bandcamp Daily |
| Music tracks the drama — Hex-A-Gone switches to a more intense section past two minutes (already shipped as `music-tense`). | Fall Guys wiki |

### Audit of Stumblezone's music
Three beds at **120 BPM, I–vi–IV–V in C major, sine plucks over a sine kick**. Pleasant, but it
is a lullaby next to a sports theme. Nothing slaps, nothing modulates, nothing is a toy.

### What changes
- **Tempo 150 BPM**, key **F♯ minor** (i – VI – III – VII: the pop-minor loop that reads as
  "triumphant" at speed).
- A **slap-bass** voice: short square-ish pluck with a fast pitch snap on attack.
- **Breakbeat** drums: kick / noise snare / tight hats in a syncopated 2-bar pattern, not on every
  beat.
- **Brass stabs** on the off-beats: detuned saw stack with a fast decay.
- **Modulation** up a whole tone for the second half of the 16-bar loop, back for the loop point.
- A **balloon squeak** sample (synthesised: a high, wobbly sine with pitch jitter) as a percussion
  hit once per 4 bars — the toy-percussion signature.
- Lobby bed = same key and tempo, half-time drums, no stabs (talk-over-able). Round bed = full.
  Tense bed = +2 semitones, double-time hats, rising filter.

---

## Part 2 — Sound design

Fall Guys reads as a *TV game show in a stadium*: a crowd is always there, and every event is a
stinger, not a beep.

| Event | Fall Guys | Stumblezone today | Change |
|---|---|---|---|
| Ambience | Stadium crowd bed under everything in-round | none | **`crowd-bed` loop** at low volume during play |
| Round start | 3-2-1 countdown with pitch-up tones, then a **whistle** | flat tick, brighter tick | 3 rising tones + **referee whistle** on GO |
| Qualified | brass fanfare + **crowd roar** | two-note chime | **`qualified` fanfare** (brass triad) + `crowd-cheer` burst |
| Eliminated | a descending minor jingle, a little sad, a little funny | descending swoop | **`eliminated` jingle**: three descending minor notes with vibrato + `crowd-aww` |
| Falling | slide-whistle-style whoosh | silence until the ledge | **`fall` slide whistle** on the fall watcher |
| Bumper / wall hit | squeaky-toy "boing" | crack | **`squeak`** (balloon-squeak synth) on knockback |
| Jump pad | spring "boing" | silence | **`boing`** on the jump-pad trigger |
| Crown / winner | fanfare + confetti cannon | major arpeggio (keep) | keep; add crowd-cheer under it |

All still synthesised in `tools/make-audio.mjs` — no downloaded samples, no licensing.

---

## Part 3 — HUD and UX

What the Fall Guys HUD is (Game UI Database, Interface In Game, the fandom Interface page):

- **Typeface:** *Titan One* — "fat, friendly and clumsy". Everything is chunky white uppercase
  with a dark outline and a hard drop shadow.
- **Shapes:** rounded pills and rounded cards. Nothing is a rectangle with square corners.
- **Palette:** magenta/pink for the "you" accent, yellow for gold/stakes, cyan/blue for calm
  info, purple-navy for plates. Saturated, never muddy.
- **Round intro card:** large round name, a **category tag** above it (RACE / SURVIVAL / FINAL —
  FINAL is gold with a crown), the three-word tagline under it.
- **In-round top bar:** a qualified/alive counter pill in the middle, a timer pill beside it.
- **Splash moments:** `QUALIFIED!` (pink/yellow burst) and `ELIMINATED` (blue-grey) fill the centre
  of the screen for a few seconds with a stinger and confetti.
- **Countdown:** huge numerals that change colour each tick, then `GO!`.

### What the SDK lets us do
`Label` has **no custom fonts, no outline, no rotation** — `font` is sans/serif/mono only. But
`uiTransform` supports **`borderRadius`, `borderWidth`, `borderColor`, `opacity`, `zIndex`**, and a
Label can be stacked on a copy of itself offset by a few px. So:

- **Pills and cards** come from `borderRadius` + `borderWidth` (a 3px dark border reads as the
  outline the font cannot draw).
- **Chunky text** = a `ChunkyText` component that renders a dark shadow Label 3px down-right
  under the white Label. Two labels, one look.
- **Category tags**, **countdown colour-flips**, and the **QUALIFIED / ELIMINATED splashes** are
  layout and colour only — no new engine features.
- No emoji, no special glyphs (Unity ships none). Lives are **drawn dots**, not `♥`.

---

## Part 4 — The world

The art team's own words (Dan Hoang's visual-development thread, ArtStation Art Blast, Creative
Bloq): **vinyl toys** were the material reference throughout; forms were sculpted in Play-Doh for
"forced simplicity" and "weight and mass"; the world must feel **physical** and **soft**; hazards
are **anthropomorphised and playful**; the stadium has a **crowd**, **spotlights**, and
**confetti cannons**; the palette is pastel pushed to its limit with saturated accents.

### Audit
Rounded discs, candy palette, clouds, balloons, trees, a crown, a finish flag. Materials are
**matte** (roughness 0.8–0.9) — that is foam, not vinyl. No crowd. No spotlights. Nothing
inflatable, nothing with a face.

### What changes (all CC0, OpenDCL catalog, bounds measured from the GLB not the listing)
| Model | Why | Where |
|---|---|---|
| `crowd` (animated floating faces, 1396 tri, 106 KB) | the stadium crowd | 8 clusters on the pillar ring, facing the arena |
| `small-light-beam` (16 tri, 11 KB) | sweeping stadium searchlights | 4 on the outer pillars, `RotateContinuous` |
| `full-rainbow-animation` (8.8k tri, 437 KB) | the backdrop behind the arena, `AllOn` | behind the far edge, at ground |
| `star` (spinning gold, 52 tri, 24 KB) | reward iconography | one per podium spot, one per jump pad |
| `lollipop` + `lolli-face-smile` (24 + 52 KB) | a character with a face in the lobby | flanking the spawn |
| `deco03` pink pig, `deco04` orange animal (inflatables, 142 + 179 KB) | the "inflatable" softness cue | lobby corners |

Plus a **material pass**: tiles and platforms to roughness **0.35**, specular on — glossy vinyl
instead of matte foam. Zero cost, and it is the single biggest "toy" cue there is.

Budget: ~1.0 MB of new models, ~15k new triangles. Well inside 36 MB / 1M tris.

---

## Sources

- [Bandcamp Daily — Fall Guys soundtrack interview](https://daily.bandcamp.com/features/jukio-kallio-daniel-hagstrom-fall-guys-soundtrack-interview) — slap bass, breakbeats, bulbous synths, Eurovision modulations, balloon sample, anti-fatigue
- [Bandwagon — Hagström & Kallio on the OST](https://www.bandwagon.asia/articles/fall-guys-ultimate-knockout-mediatonic-soundtrack-ost-daniel-hagstrom-jukio-kallio-interview-2020) — '80s sports themes, toy percussion, roles
- [Tunebat — Everybody Falls key & BPM](https://tunebat.com/Info/Everybody-Falls-Fall-Guys-Theme-Jukio-Kallio-Daniel-Hagstr-m/72uR0pYwXZM1jSsyk1YPlf), [SongBPM](https://songbpm.com/@jukio-kallio/everybody-falls-fall-guys-theme) — 153 BPM, F♯ minor
- [The Sound Architect podcast — Kallio & Hagström](https://www.thesoundarchitect.co.uk/tsap-s03e20/)
- [Graphic Pie — What font does Fall Guys use](https://www.graphicpie.com/fall-guys-font/), [dafont thread](https://www.dafont.com/forum/read/448358/fall-guys-menu-font), [Titan One on Google Fonts](https://fonts.google.com/specimen/Titan%2BOne)
- [Game UI Database — Fall Guys](https://www.gameuidatabase.com/gameData.php?id=305), [Interface In Game — Fall Guys](https://interfaceingame.com/games/fall-guys-ultimate-knockout/), [Fall Guys wiki — Interface](https://fallguysultimateknockout.fandom.com/wiki/Interface), [Screen](https://fallguysultimateknockout.fandom.com/wiki/Screen)
- [Dan Hoang — visual development thread](https://threadreaderapp.com/thread/1296917830244405254.html) — vinyl toys, Play-Doh, forced simplicity
- [ArtStation Magazine — Fall Guys Art Blast](https://magazine.artstation.com/2020/10/mediatonic-games-fall-guys-art-blast/), [Creative Bloq — concept art](https://www.creativebloq.com/news/fall-guys-concept-art), [PlayStation Blog — character design](https://blog.playstation.com/2020/05/25/creating-the-character-designs-of-fall-guys-out-on-ps4-this-summer/)
- [The Cutting Room Floor — Fall Guys](https://tcrf.net/Fall_Guys) — unused "qualified" indicator, final-round golden card
