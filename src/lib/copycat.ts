// Copycat: watch a sequence of poses, then perform it - with your actual avatar.
//
// Every other round is about where your feet are. This one is about what your avatar does, which
// is the thing Decentraland has that a browser game does not: a body that everyone else can see,
// with a vocabulary of emotes built in. The scene reads the emote events the explorer reports, so
// the emote wheel counts as much as the buttons the HUD offers.

import { PLAY_SECONDS, GET_READY_SECONDS, WARMUP_SECONDS } from '../config'
import { mulberry32 } from './prng'

export const POSES = ['dance', 'clap', 'wave', 'dab', 'robot', 'fistpump'] as const
export type Pose = (typeof POSES)[number]

/** Seconds each pose is shown for, and seconds allowed to perform each one. */
export const SHOW_PER_POSE = 1.1
export const PERFORM_PER_POSE = 2.6
/** A beat between the last shown pose and "your turn". */
export const GAP_SECONDS = 0.8
const LENGTHS = [2, 3, 4, 5]

export type Wave = { poses: Pose[]; showAt: number; performAt: number; endAt: number }

/** Four waves that fit inside the round, sequences growing, never the same pose twice running. */
export function copycatWaves(seed: number): Wave[] {
  const rng = mulberry32(seed ^ 0xc0c4)
  const waves: Wave[] = []
  let t = GET_READY_SECONDS + WARMUP_SECONDS
  for (const len of LENGTHS) {
    const poses: Pose[] = []
    while (poses.length < len) {
      const p = POSES[Math.floor(rng() * POSES.length)]
      if (poses.length > 0 && poses[poses.length - 1] === p) continue
      poses.push(p)
    }
    const showAt = t
    const performAt = showAt + len * SHOW_PER_POSE + GAP_SECONDS
    const endAt = performAt + len * PERFORM_PER_POSE
    waves.push({ poses, showAt, performAt, endAt })
    t = endAt + 1.5
  }
  return waves
}

export function copycatFits(): boolean {
  const last = copycatWaves(1)[LENGTHS.length - 1]
  return last.endAt < PLAY_SECONDS
}

/** Which wave and phase a moment of play is in. */
export function locate(waves: Wave[], t: number): { index: number; phase: 'wait' | 'show' | 'perform' | 'done'; shown: number } {
  for (let i = 0; i < waves.length; i++) {
    const w = waves[i]
    if (t < w.showAt) return { index: i, phase: 'wait', shown: 0 }
    if (t < w.performAt) return { index: i, phase: 'show', shown: Math.min(w.poses.length, Math.floor((t - w.showAt) / SHOW_PER_POSE) + 1) }
    if (t < w.endAt) return { index: i, phase: 'perform', shown: w.poses.length }
  }
  return { index: waves.length, phase: 'done', shown: 0 }
}

/** What a player has performed this wave, judged against the sequence as it comes in. */
export class Performance {
  private done: Pose[] = []
  private failed = false

  reset(): void {
    this.done = []
    this.failed = false
  }

  /** Returns 'ok' for a correct next pose, 'complete' when the sequence is finished, 'wrong' otherwise. */
  perform(pose: Pose, sequence: Pose[]): 'ok' | 'complete' | 'wrong' | 'ignored' {
    if (this.failed || this.done.length >= sequence.length) return 'ignored'
    if (sequence[this.done.length] !== pose) {
      this.failed = true
      return 'wrong'
    }
    this.done.push(pose)
    return this.done.length === sequence.length ? 'complete' : 'ok'
  }

  progress(): number {
    return this.done.length
  }

  /** At the end of the perform window: did they finish it? */
  passed(sequence: Pose[]): boolean {
    return !this.failed && this.done.length >= sequence.length
  }
}

/** The explorer reports emote URNs; the predefined ones end in the pose's name. */
export function poseFromUrn(urn: string): Pose | null {
  const lower = urn.toLowerCase()
  for (const p of POSES) if (lower === p || lower.endsWith(':' + p) || lower.endsWith('/' + p)) return p
  return null
}
