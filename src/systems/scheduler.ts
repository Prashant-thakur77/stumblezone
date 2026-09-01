// The round state machine.
//
// It owns no schedule of its own — it reads the clock, asks lib/schedule what should be happening,
// and drives the rounds accordingly. That is what makes the game hostless: with nobody in the
// scene at all, the arena still cycles, and a player walking in at any instant lands mid-cycle in
// exactly the same state as everyone already there.

import { engine } from '@dcl/sdk/ecs'
import { slotIndex, slotElapsed, roundIndex, phaseAt, seedForSlot, showIndex, isFinale } from '../lib/schedule'
import {
  INTRO_SECONDS,
  GET_READY_SECONDS,
  PLAY_SECONDS,
  ROUND_COUNT,
  ROUND_NAMES,
  SLOT_SECONDS,
  WARMUP_SECONDS,
  PODIUM_SPOTS,
  ARENA_Y
} from '../config'
import { Round } from '../arena/rounds/types'
import { hud } from '../ui/state'
import { resolveBanner, roundTag } from '../lib/banner'
import * as spectator from './spectator'
import { bindSlotSource, onEliminated, onFinished, myAddress } from '../net/sync'
import {
  award,
  standings,
  showStandings,
  showRank,
  syncShow,
  CROWN_SURVIVE,
  CROWN_WIN,
  CROWN_FIRST_FINISHER,
  FINALE_MULTIPLIER,
  setName,
  displayName
} from '../net/crowns'
import { getPlayer } from '@dcl/sdk/players'
import { triggerEmote } from '~system/RestrictedActions'
import { record, best, formatSeconds } from './records'
import { play, setMusic, setCrowd, say } from './audio'
import { setJumbotron, setJumbotronColor, setConfetti } from '../arena/scenery'
import { feed, toast } from './feed'

let rounds: Round[] = []
let activeSlot = -1
let active: Round | null = null
let released = false
let frozen = false
let scored = false

/** Everyone we have heard from this slot, and who is out. Drives the "N still alive" line. */
let seen = new Set<string>()
let eliminated = new Set<string>()
let firstFinisher = ''
/** When the local player's run in this slot ended, in seconds into the play phase. */
let outAt = 0
/** Last whole second we played a countdown tick on, so each tick fires exactly once. */
let lastTick = -1
let saidSet = false
let saidHurry = false
/** True when we arrived after this round had already started, so nothing here counts. */
let spectatingOnly = false
/** How many players have crossed this round's finish line, for the feed's placings. */
let finishers = 0

export function setupScheduler(roundList: Round[]): void {
  rounds = roundList
  for (const r of rounds) r.build()

  bindSlotSource(() => slotIndex(Date.now()))

  onEliminated((p, isSelf) => {
    seen.add(p.address)
    eliminated.add(p.address)
    // Your own elimination already has a stinger, a splash and an emote. Other people's do not.
    if (!isSelf) toast(displayName(p.address) + ' is OUT')
  })
  onFinished((p, isSelf) => {
    seen.add(p.address)
    if (!firstFinisher) firstFinisher = p.address
    finishers += 1
    toast((isSelf ? 'You' : displayName(p.address)) + ' finished ' + ordinal(finishers))
  })

  const me = getPlayer()
  if (me && me.name) setName(myAddress(), me.name)

  engine.addSystem(schedulerSystem)
}

function beginSlot(slot: number): void {
  if (active) active.stop()

  activeSlot = slot
  released = false
  frozen = false
  scored = false
  seen = new Set<string>([myAddress()])
  eliminated = new Set<string>()
  firstFinisher = ''

  setConfetti(false)
  setJumbotronColor(null)
  spectator.setRoundLive(false)
  spectator.resetForSlot()
  spectator.releaseInput()
  outAt = 0
  lastTick = -1
  saidSet = false
  saidHurry = false
  finishers = 0

  syncShow(showIndex(slot))

  active = rounds[roundIndex(slot)]
  spectator.setFloorY(active.floorY ?? ARENA_Y)
  active.start(seedForSlot(slot))
  if (isFinale(slot)) say('final_round')

  // Joining after the round has already begun means spectating it. Dropping a latecomer onto a
  // half-decayed board is worse than a clear "you're up next" - and it stops the alive count from
  // claiming a player who never actually played.
  const joinedLate = slotElapsed(Date.now()) > INTRO_SECONDS + GET_READY_SECONDS
  spectatingOnly = joinedLate
  if (joinedLate) {
    spectator.spectateOnly()
  } else {
    spectator.sendToLobby()
  }
}

function schedulerSystem(dt: number): void {
  const now = Date.now()
  const slot = slotIndex(now)
  const elapsed = slotElapsed(now)
  const { phase, remaining } = phaseAt(elapsed)

  if (slot !== activeSlot) beginSlot(slot)
  if (!active) return

  hud.toasts = feed.visible(now)
  hud.roundName = ROUND_NAMES[roundIndex(slot)]
  hud.finale = isFinale(slot)
  hud.roundTag = roundTag(roundIndex(slot), hud.finale)
  hud.countdown = Math.ceil(remaining)
  hud.lives = spectator.livesLeft()
  hud.out = spectator.isOut()
  hud.alive = Math.max(1, seen.size - eliminated.size)

  // Your place in the current show. This is the line that makes four rounds feel like one evening.
  const rank = showRank(myAddress())
  hud.showLine = rank.of > 0 && showStandings(1).length > 0 ? 'SHOW ' + ordinal(rank.place) + ' of ' + rank.of : ''

  // The in-world banner covers the angles the HUD does not: looking up, looking across the arena,
  // or looking down from the spectator ledge.
  setJumbotron(hud.roundName + '\n' + (hud.banner || String(hud.countdown)))

  // Seconds left in the round itself, for the always-visible HUD timer.
  hud.roundClock = phase === 'play' ? Math.max(0, Math.ceil(INTRO_SECONDS + PLAY_SECONDS - elapsed)) : 0

  // The score follows the drama: lobby bed between rounds, the driving bed while playing, and a
  // faster, busier one for the last 20 seconds - landing with HURRY UP and the spinner speed-up so
  // every tension signal fires at once.
  setMusic(phase !== 'play' ? 'music-lobby' : hud.roundClock <= 20 ? 'music-tense' : 'music-round')
  // The stadium is only full while something is happening in it.
  setCrowd(phase === 'play')

  if (phase === 'intro') {
    const next = Math.ceil(INTRO_SECONDS - elapsed)
    active.tick(dt, 0, false)
    // The hint is the whole of onboarding for a first-timer, so it stays up for most of the intro
    // and only yields to the countdown in the last five seconds.
    if (next <= 5) {
      hud.phase = 'countdown'
      hud.banner = String(next)
      hud.subtitle = 'Get ready!'
      if (next !== lastTick && next > 0) {
        lastTick = next
        play('tick')
      }
    } else {
      hud.phase = 'card'
      hud.banner = active.name
      hud.subtitle = isFinale(slot) ? 'The show champion is decided here' : active.hint
    }
    return
  }

  if (phase === 'play') {
    const playElapsed = elapsed - INTRO_SECONDS

    // The get-ready freeze. Two clients whose clocks differ by a second both spend this window
    // locked in place, which is why nothing here needs sub-second agreement.
    if (playElapsed < GET_READY_SECONDS) {
      if (!frozen) {
        frozen = true
        // Place everyone on the mark, then freeze. The lobby and the arena are separate spaces on
        // purpose - players are teleported in rather than walking, so the field always starts
        // together and nobody misses the opening seconds crossing scenery.
        void spectator.sendTo(active.spawn())
        spectator.freezeInput()
        say('ready')
      }
      if (!saidSet && GET_READY_SECONDS - playElapsed <= 2) {
        saidSet = true
        say('set')
      }
      hud.phase = 'countdown'
      hud.banner = String(Math.ceil(GET_READY_SECONDS - playElapsed))
      hud.subtitle = 'Get ready!'
      active.tick(dt, playElapsed, false)
      return
    }
    hud.phase = 'play'
    if (!released) {
      released = true
      spectator.setRoundLive(true)
      if (!spectator.isOut()) {
        spectator.releaseInput()
        play('whistle')
        say('go')
      }
    }

    if (spectator.isOut() && outAt === 0) outAt = playElapsed

    if (!saidHurry && hud.roundClock > 0 && hud.roundClock <= 15) {
      saidHurry = true
      if (!spectator.isOut()) say('hurry_up')
    }

    // The warm-up beat: the first seconds of play are harmless, so a first-timer gets to look
    // around and understand the space before anything can kill them. Fall Guys teaches through
    // level design rather than text, and its levels open with a survivable stretch for exactly
    // this reason. Rounds receive `playing: false` and hold their hazards.
    const warm = playElapsed < GET_READY_SECONDS + WARMUP_SECONDS
    active.tick(dt, playElapsed, !warm)
    if (warm) {
      hud.banner = ''
      hud.subtitle = active.hint
    }

    // Rounds write whatever suits their own state machine; this has the final word, so no round
    // can tell an eliminated player they are still doing well.
    const resolved = resolveBanner({
      out: spectator.isOut(),
      spectatingOnly,
      banner: hud.banner,
      subtitle: hud.subtitle
    })
    hud.banner = resolved.banner
    hud.subtitle = resolved.subtitle
    return
  }

  // Results.
  if (!scored) {
    scored = true
    spectator.setRoundLive(false)
    const survived = !spectator.isOut()
    const stakes = isFinale(slot) ? FINALE_MULTIPLIER : 1
    if (survived && !spectatingOnly) {
      award(myAddress(), CROWN_SURVIVE * stakes)
      // Sole survivor takes the round. Requires someone to have been beaten - surviving alone is
      // worth a crown, but it is not a win.
      if (seen.size > 1 && eliminated.size === seen.size - 1) award(myAddress(), CROWN_WIN * stakes)
    }
    if (firstFinisher === myAddress()) award(myAddress(), CROWN_FIRST_FINISHER)
    // The stinger and the crowd's verdict, before any announcer line.
    if (spectatingOnly) {
      // Watched, did not play: no fanfare and no groan for you.
    } else if (survived) {
      play('qualified')
      play('crowd-cheer')
    } else {
      play('crowd-aww')
    }
    setConfetti(survived)

    const survivedMs = Math.round((survived ? PLAY_SECONDS : outAt) * 1000)
    // A round you watched is not a round you played - it must not set a personal best.
    const beatIt = spectatingOnly ? false : record(hud.roundName, survivedMs)

    // One announcer line per result, most specific wins: a sole-survivor win beats a new best,
    // which beats plain qualification. The eliminated heard "you lose" when they fell.
    const onPodium = isFinale(slot) && showStandings(3).some((s) => s.address === myAddress())
    if (!spectatingOnly && !onPodium) {
      const wonOutright = survived && seen.size > 1 && eliminated.size === seen.size - 1
      if (wonOutright) say('congratulations')
      else if (survived && beatIt) say('new_highscore')
      else if (survived) say('you_win')
      else say('game_over')
    }
    hud.resultDetail = spectatingOnly
      ? 'You watched this one. You are in for the next.'
      : seen.size > 1
      ? (survived ? '+1 crown' : eliminated.size + ' of ' + seen.size + ' went down')
      : beatIt
        ? 'New best! ' + formatSeconds(survivedMs)
        : formatSeconds(survivedMs) + '  ·  best ' + formatSeconds(best(hud.roundName))

    spectator.releaseInput()

    // The cycle's celebration peak: after the finale, the podium. Each client moves only itself -
    // rank comes from the shared crown tally, so every client agrees who stands where and everyone
    // sees the same three avatars arrive on the steps.
    const cycleEnd = isFinale(slot)
    const rank = cycleEnd ? showStandings(3).findIndex((s) => s.address === myAddress()) : -1
    if (rank >= 0) {
      const spot = PODIUM_SPOTS[rank]
      void spectator.sendTo({ x: spot.x, y: spot.y, z: spot.z })
      void triggerEmote({ predefinedEmote: rank === 0 ? 'raiseHand' : 'clap' })
      setConfetti(true)
      play('crown')
      say('congratulations')
    } else {
      spectator.sendToLobby()
    }
  }

  active.tick(dt, SLOT_SECONDS, false)
  // "QUALIFIED" is the party-game word, and it lands harder than "survived" - it says you are
  // through to something, not merely that you are not dead.
  hud.phase = 'results'
  // A mid-round joiner watched, so they were neither. The card tells them what happens next.
  hud.banner = spectatingOnly ? 'NEXT ROUND' : spectator.isOut() ? 'ELIMINATED' : 'QUALIFIED!'
  hud.subtitle = hud.resultDetail + '  ·  next in ' + Math.ceil(remaining) + 's'
}

function ordinal(n: number): string {
  const suffix = n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'
  return n + suffix
}

/** What is coming up, for the lobby schedule sign. */
export function upcoming(count = 3): { name: string; inSeconds: number }[] {
  const now = Date.now()
  const slot = slotIndex(now)
  const elapsed = slotElapsed(now)
  const out: { name: string; inSeconds: number }[] = []
  for (let i = 1; i <= count; i++) {
    out.push({
      name: ROUND_NAMES[roundIndex(slot + i)],
      inSeconds: Math.round(i * SLOT_SECONDS - elapsed)
    })
  }
  return out
}
