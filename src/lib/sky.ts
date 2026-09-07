// The Sky Course: from the tower's lookout, east over the village, up to the Sky Box.
//
// The tower proved the rule - a phone can make a 2.4m gap and a 1.1m rise - so this reuses its
// spacing and adds only a weave in z, which keeps the line clear of the spectator ledge and makes
// each step a small decision instead of a straight run.

import { SKY_COURSE, SKY_BOX, TOWER, LOBBY } from '../config'
import { towerSteps, Step } from './tower'

/** The lookout is the first step; the Sky Box is the last. */
export function skySteps(): Step[] {
  const lookout = towerSteps()[TOWER.steps - 1]
  const out: Step[] = [{ x: lookout.x, y: lookout.y, z: lookout.z, angle: 0 }]
  // The lookout sits south of the weave band, so the first four steps ramp across to it; a jump
  // that moves a metre sideways and two forward is still inside the tower's rule.
  const RAMP = 4
  for (let i = 1; i <= SKY_COURSE.steps; i++) {
    const weave = i % 2 === 0 ? SKY_COURSE.zMin : SKY_COURSE.zMax
    const z = i <= RAMP ? lookout.z + (SKY_COURSE.zMin - lookout.z) * (i / RAMP) : weave
    out.push({ x: lookout.x + i * SKY_COURSE.dx, y: lookout.y + i * SKY_COURSE.dy, z, angle: 0 })
  }
  return out
}

/** The Sky Box slab: centred on the last step, its floor at that step's height. */
export function skyBox(): { x: number; y: number; z: number; size: number } {
  const last = skySteps()[SKY_COURSE.steps]
  return { x: last.x + SKY_BOX.size / 2 - 1, y: last.y, z: (SKY_COURSE.zMin + SKY_COURSE.zMax) / 2, size: SKY_BOX.size }
}

export function skyGaps(): { gap: number; rise: number }[] {
  const s = skySteps()
  const gaps: { gap: number; rise: number }[] = []
  for (let i = 1; i < s.length; i++) {
    gaps.push({ gap: Math.hypot(s[i].x - s[i - 1].x, s[i].z - s[i - 1].z), rise: s[i].y - s[i - 1].y })
  }
  return gaps
}

/** Metres the Sky Box floor is above the village. */
export function skyBoxHeight(): number {
  return skyBox().y - LOBBY.y
}
