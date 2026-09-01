// Stumblezone - a four-round party gauntlet that runs on UTC and needs no server.
//
// Boot order matters: rounds build their entity pools once, the scheduler takes over the clock,
// and everything after that is driven by the time of day.

import { buildLobby } from './arena/lobby'
import { perfectMatch } from './arena/rounds/perfectMatch'
import { sweeper } from './arena/rounds/sweeper'
import { tipToe } from './arena/rounds/tipToe'
import { hexDrop } from './arena/rounds/hexDrop'
import { setupScheduler } from './systems/scheduler'
import { initSpectator } from './systems/spectator'
import { setupCrownSync } from './net/crowns'
import { setupHud } from './ui/hud'
import { initAudio } from './systems/audio'

export function main() {
  initAudio()
  buildLobby()
  initSpectator()
  setupHud()

  // Order must match ROUND_NAMES in config.ts - the scheduler indexes both by slot % 4.
  setupScheduler([perfectMatch, sweeper, tipToe, hexDrop])

  setupCrownSync()
}
