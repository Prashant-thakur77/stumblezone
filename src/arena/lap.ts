// The Speed Lap on the east lane: a start pad at the village end, a turnaround pad on the plaza.

import { Vector3 } from '@dcl/sdk/math'
import { EAST_LANE, NE_PLAZA, LOBBY } from '../config'
import { Lap } from '../lib/lap'
import { formatTime } from '../lib/tower'
import { pad, sign } from './build'
import { recordLap, lapBest } from '../systems/records'
import { toast } from '../systems/feed'
import { play } from '../systems/audio'
import { isRoundLive, isOut } from '../systems/spectator'
import { errandDone } from '../systems/errands'

const lap = new Lap()
const START = { x: EAST_LANE.x, z: EAST_LANE.z - EAST_LANE.depth / 2 + 3 }
const TURN = { x: NE_PLAZA.x, z: NE_PLAZA.z + 1 }

/** The running lap, as a stopwatch, or '' when the clock is not running. */
export function lapClock(): string {
  return lap.running() ? formatTime(Date.now() - lap.startedAtMs()) : ''
}

/** "LAP BEST: 0:24.3" for the lobby board. */
export function lapLine(): string {
  const best = lapBest()
  return best > 0 ? 'LAP BEST: ' + formatTime(best) : 'LAP: not yet run'
}

export function buildLap(): void {
  sign('SPEED LAP\nTo the corner and back', Vector3.create(START.x, LOBBY.y + 3.6, START.z + 2.5), 1.5)

  pad(START.x, LOBBY.y, START.z, 2.4, { r: 1, g: 0.83, b: 0.25 }, () => {
    if (isRoundLive() && !isOut()) return
    const ms = lap.finish(Date.now())
    if (ms !== null) {
      const best = recordLap(ms)
      play(best ? 'crown' : 'qualified')
      toast('LAP ' + formatTime(ms) + (best ? '  ·  NEW BEST' : ''))
      errandDone('lap')
      return
    }
    lap.start(Date.now())
    play('whistle')
    toast('LAP: go to the corner and back')
  })

  pad(TURN.x, LOBBY.y, TURN.z, 2.4, { r: 0.2, g: 0.8, b: 1 }, () => {
    if (!lap.running()) return
    lap.turn()
    play('tick')
    toast('TURN - now back')
  })
}
