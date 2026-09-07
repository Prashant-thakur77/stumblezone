// Round G - Copycat.
//
// A coach on the stage performs a sequence of poses; then it is your turn, with your own avatar.
// The scene reads the emote events the explorer reports for the local player, so the HUD's pose
// buttons and the emote wheel both count. Wrong or late costs a heart. Nothing here can push you
// off anything: it is the show's breather, and from the ledge it is a synchronised dance-off.

import { engine, Entity, Transform, AvatarShape, AvatarEmoteCommand, EmoteState, VisibilityComponent } from '@dcl/sdk/ecs'
import { Vector3, Quaternion, Color4, Color3 } from '@dcl/sdk/math'
import { triggerEmote } from '~system/RestrictedActions'
import { ARENA_CENTER_X, ARENA_CENTER_Z, ARENA_Y, DISC_RADIUS } from '../../config'
import { copycatWaves, locate, Performance, poseFromUrn, Pose, Wave } from '../../lib/copycat'
import { buildDisc, setDiscVisible } from '../disc'
import { Round } from './types'
import { setBanner, hud } from '../../ui/state'
import { setJumbotronColor } from '../scenery'
import { loseLife, isOut } from '../../systems/spectator'
import { play } from '../../systems/audio'

let disc: Entity[] = []
let coach: Entity
let waves: Wave[] = []
let running = false
const perf = new Performance()
/** Which wave the performance was reset for, which wave was judged, and which pose the coach showed. */
let performingWave = -1
let judgedWave = -1
let coachShown = ''
let coachTimestamp = 0
let penalised = false
let lastRecorded: { pose: string; at: number } = { pose: '', at: -10 }
let clock = 0

const LABEL: Record<Pose, string> = { dance: 'DANCE', clap: 'CLAP', wave: 'WAVE', dab: 'DAB', robot: 'ROBOT', fistpump: 'FIST PUMP' }

function buildCoach(): void {
  coach = engine.addEntity()
  Transform.create(coach, {
    position: Vector3.create(ARENA_CENTER_X, ARENA_Y, ARENA_CENTER_Z - DISC_RADIUS + 3),
    rotation: Quaternion.fromEulerDegrees(0, 180, 0)
  })
  AvatarShape.create(coach, {
    id: 'copycat-coach',
    name: 'Coach',
    bodyShape: 'urn:decentraland:off-chain:base-avatars:BaseMale',
    wearables: [
      'urn:decentraland:off-chain:base-avatars:eyebrows_00',
      'urn:decentraland:off-chain:base-avatars:mouth_00',
      'urn:decentraland:off-chain:base-avatars:eyes_00',
      'urn:decentraland:off-chain:base-avatars:m_sweater_02',
      'urn:decentraland:off-chain:base-avatars:trash_jean',
      'urn:decentraland:off-chain:base-avatars:sport_black_shoes',
      'urn:decentraland:off-chain:base-avatars:cornrows'
    ],
    emotes: [],
    hairColor: Color3.create(0.1, 0.1, 0.1),
    skinColor: Color3.create(0.55, 0.38, 0.25)
  })
}

function coachDo(pose: Pose): void {
  const a = AvatarShape.getMutable(coach)
  a.expressionTriggerId = pose
  a.expressionTriggerTimestamp = ++coachTimestamp
}

/** A pose from the HUD buttons: play it on the avatar and count it. */
export function performPose(pose: Pose): void {
  void triggerEmote({ predefinedEmote: pose })
  record(pose)
}

function record(pose: Pose): void {
  if (!running || !hud.poses || isOut()) return
  // The explorer reports the emote the button just triggered too; one press is one pose.
  if (lastRecorded.pose === pose && clock - lastRecorded.at < 1.2) return
  lastRecorded = { pose, at: clock }
  const wave = waves[performingWave]
  if (!wave) return
  const verdict = perf.perform(pose, wave.poses)
  if (verdict === 'wrong') {
    penalised = true
    play('squeak')
    loseLife()
    setBanner('WRONG POSE', 'It was ' + LABEL[wave.poses[perf.progress()]])
  } else if (verdict === 'complete') {
    play('survive')
  } else if (verdict === 'ok') {
    play('tick')
  }
}

export const copycat: Round = {
  name: 'Copycat',
  hint: 'Watch the coach. Do what he does.',
  twist: 'The sequence grows every wave',
  joinSafe: true,

  spawn(): Vector3 {
    return Vector3.create(ARENA_CENTER_X, ARENA_Y + 1, ARENA_CENTER_Z + 3)
  },

  build() {
    disc = buildDisc(Color4.create(0.55, 0.3, 0.75, 1))
    buildCoach()
    // The emote wheel counts: every emote the explorer reports for the local player is a pose.
    AvatarEmoteCommand.onChange(engine.PlayerEntity, (cmd) => {
      if (!cmd) return
      const state = cmd.state ?? EmoteState.ES_STARTED
      if (state !== EmoteState.ES_STARTED) return
      const pose = poseFromUrn(cmd.emoteUrn)
      if (pose) record(pose)
    })
    this.stop()
  },

  start(seed: number) {
    waves = copycatWaves(seed)
    running = true
    performingWave = -1
    judgedWave = -1
    coachShown = ''
    penalised = false
    clock = 0
    perf.reset()
    setDiscVisible(disc, true)
    VisibilityComponent.createOrReplace(coach, { visible: true })
  },

  tick(dt: number, elapsed: number, playing: boolean) {
    if (!running) return
    clock += dt
    if (!playing) {
      hud.poses = false
      return
    }
    const at = locate(waves, elapsed)
    const wave = waves[Math.min(at.index, waves.length - 1)]

    // Judge the wave that just ended, once.
    const ended = at.phase === 'done' ? waves.length - 1 : at.phase === 'wait' ? at.index - 1 : -1
    if (ended >= 0 && ended > judgedWave && performingWave === ended) {
      judgedWave = ended
      hud.poses = false
      if (perf.passed(waves[ended].poses)) {
        setBanner('NAILED IT', 'Wave ' + (ended + 1) + ' of ' + waves.length)
      } else if (!penalised && !isOut()) {
        play('squeak')
        loseLife()
        setBanner('TOO SLOW', 'The sequence was ' + waves[ended].poses.map((p) => LABEL[p]).join(' > '))
      }
    }

    if (at.phase === 'wait') {
      if (at.index === 0) setBanner('', 'The coach shows a sequence. Then you copy it.')
      return
    }
    if (at.phase === 'done') {
      hud.poses = false
      setBanner('ALL WAVES DONE', 'Take a bow')
      return
    }

    if (at.phase === 'show') {
      hud.poses = false
      const key = at.index + ':' + at.shown
      if (coachShown !== key) {
        coachShown = key
        coachDo(wave.poses[at.shown - 1])
        play('tick')
      }
      setBanner('WATCH', wave.poses.slice(0, at.shown).map((p) => LABEL[p]).join(' > '))
      setJumbotronColor({ r: 0.2, g: 0.8, b: 1.0 })
      return
    }

    // perform
    if (performingWave !== at.index) {
      performingWave = at.index
      penalised = false
      perf.reset()
      play('whistle')
    }
    // Everyone gets the buttons - players to score, spectators to dance along from the ledge.
    hud.poses = true
    const n = wave.poses.length
    const done = perf.progress()
    setBanner('YOUR TURN  ' + done + '/' + n, done >= n ? 'Done - hold it' : 'Next: ' + LABEL[wave.poses[Math.min(done, n - 1)]] + '  ·  ' + Math.ceil(wave.endAt - elapsed) + 's')
    setJumbotronColor({ r: 1.0, g: 0.24, b: 0.62 })
  },

  stop() {
    running = false
    hud.poses = false
    setDiscVisible(disc, false)
    if (coach) VisibilityComponent.createOrReplace(coach, { visible: false })
    setJumbotronColor(null)
  }
}
