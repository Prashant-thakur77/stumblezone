// Stumblezone - a four-act party gauntlet that runs on UTC and needs no server.
//
// Boot order matters: rounds build their entity pools once, the scheduler takes over the clock,
// and everything after that is driven by the time of day.

import { buildLobby } from './arena/lobby'
import { buildVillage } from './arena/village'
import { buildTower } from './arena/tower'
import { buildScenery } from './arena/scenery'
import { perfectMatch } from './arena/rounds/perfectMatch'
import { sweeper } from './arena/rounds/sweeper'
import { tipToe } from './arena/rounds/tipToe'
import { hexDrop } from './arena/rounds/hexDrop'
import { spotlight } from './arena/rounds/spotlight'
import { jumpBar } from './arena/rounds/jumpBar'
import { setupScheduler } from './systems/scheduler'
import { initSpectator } from './systems/spectator'
import { setupCrownSync } from './net/crowns'
import { setupHud } from './ui/hud'
import { initAudio } from './systems/audio'
import { initHats } from './systems/hats'

export function main() {
  initAudio()
  buildScenery()
  buildLobby()
  buildVillage()
  buildTower()
  initSpectator()
  initHats()
  setupHud()

  // Order must match ROUND_NAMES in config.ts - the scheduler indexes both by round id. A show
  // runs three of these plus the finale; which three is drawn from the show's seed.
  setupScheduler([perfectMatch, sweeper, tipToe, hexDrop, spotlight, jumpBar])

  setupCrownSync()
}
