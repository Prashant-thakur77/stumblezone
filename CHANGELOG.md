# Changelog

All notable changes to Stumblezone. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [1.0.0] — 2026-09-11 — Friendzone Buildathon submission

### Added
- Eight rounds: Perfect Match, Sweeper Gates, Tip Toe, Spotlight, Jump Bar, Copycat, Crown Rush and
  the Hex-Drop final. Each show draws three from the pool by seed; the final is fixed.
- The show arc: four acts, a category-tagged card with a crane shot, the podium, the curtain-call
  camera, the encore dance floor, and a Golden Show every fourth show at double crowns.
- The crowd: spectator ledge with CHEER / BOO / WATCH ARENA and pick-who-wins; the hype meter and
  the crowd going wild; a named live feed; rivalry lines; GG; DANCE / CLAP / SHRUG on results.
- Worn cosmetics: the show leader's crown and the streak star, computed identically on every client.
- Retention: daily challenge, titles, streaks, personal bests, Beat the House, seven earned hats.
- Stumble Village: Hat Market, Disco Deck, Star Hunt, Stumble Tower, Sky Course, the Big Drop,
  Practice Yard, Speed Lap, Hall of Fame, Sky Cannon, Sam the Host, and six errands per visit.
- Power-ups (SHIELD, BOOST) and per-round twists (SWITCH, reverse, BLACKOUT, crumble, gold tile).
- Bonuses by name: CLUTCH, COMEBACK, CROWD BONUS.
- Procedural soundtrack: three beds, a crowd bed, a disco loop, thirteen stingers, ten announcer lines.
- Tooling: asset budget, UI-texture and audio generators, a headless smoke run and a two-client
  smoke run.

### Fixed
- Results detail packs into three lines on the card; reactions sit under it; the daily pill fits
  the corner of a phone screen. (Found in the on-device recording.)
- Every HUD plate is a texture: `borderRadius` does not render on the mobile client.
- Sweeper Gates walls stayed solid through other rounds; the kill plane sat on Hex-Drop's lower deck;
  the final sweeper wave closed faster than touch reaction time. Each now has a test.
- The per-show crown tally was never shared between clients (found by the two-client smoke run).

### Deployed
- `justchatting.dcl.eth`, 16 parcels, signed by hand from a laptop. No key in CI.

[1.0.0]: https://github.com/Prashant-thakur77/stumblezone/releases/tag/v1.0.0
