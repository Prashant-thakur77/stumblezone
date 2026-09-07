// The Stumble Tower: a spiral of platforms climbed against the clock.
//
// Parkour is the most-played thing in Decentraland by a wide margin, and a village without a climb
// in it is missing the genre's default verb. The spiral is a pure function of the constants, so the
// test can prove every step is reachable with the SDK's stock jump before anyone builds it.

import { TOWER, LOBBY } from '../config'

export type Step = { x: number; y: number; z: number; angle: number }

/** Platform centres from the ground up. The last one is the lookout. */
export function towerSteps(): Step[] {
  const out: Step[] = []
  for (let i = 0; i < TOWER.steps; i++) {
    const angle = i * TOWER.stepDegrees
    const a = (angle * Math.PI) / 180
    out.push({
      x: TOWER.x + Math.cos(a) * TOWER.radius,
      y: LOBBY.y + (i + 1) * TOWER.rise,
      z: TOWER.z + Math.sin(a) * TOWER.radius,
      angle
    })
  }
  return out
}

/** Horizontal gap and rise between consecutive steps, for the reachability test. */
export function stepGaps(): { gap: number; rise: number }[] {
  const s = towerSteps()
  const gaps: { gap: number; rise: number }[] = []
  for (let i = 1; i < s.length; i++) {
    gaps.push({ gap: Math.hypot(s[i].x - s[i - 1].x, s[i].z - s[i - 1].z), rise: s[i].y - s[i - 1].y })
  }
  return gaps
}

export function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000)
  const tenths = Math.floor((ms % 1000) / 100)
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0') + '.' + tenths
}
