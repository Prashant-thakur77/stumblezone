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
  PODIUM_SPOTS
} from '../config'
import { Round } from '../arena/rounds/types'
import { hud } from '../ui/state'
import { resolveBanner } from '../lib/banner'
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
  setName
} from '../net/crowns'
import { getPlayer } from '@dcl/sdk/players'
import { triggerEmote } from '~system/RestrictedActions'
import { record, best, formatSeconds } from './records'
import { play, setMusic, say } from './audio'
import { setJumbotron, setJumbotronColor, setConfetti } from '../arena/scenery'

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

export function setupScheduler(roundList: Round[]): void {
  rounds = roundList
  for (const r of rounds) r.build()

  bindSlotSource(() => slotIndex(Date.now()))

  onEliminated((p) => {
    seen.add(p.address)
    eliminated.add(p.address)
  })
  onFinished((p) => {
    seen.add(p.address)
    if (!firstFinisher) firstFinisher = p.address
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

  syncShow(showIndex(slot))

  active = rounds[roundIndex(slot)]
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

  hud.roundName = ROUND_NAMES[roundIndex(slot)]
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
  setMusic(phase === 'play' ? 'music-round' : 'music-lobby')

  if (phase === 'intro') {
    const next = Math.ceil(INTRO_SECONDS - elapsed)
    active.tick(dt, 0, false)
    // The hint is the whole of onboarding for a first-timer, so it stays up for most of the intro
    // and only yields to the countdown in the last five seconds.
    if (next <= 5) {
      hud.banner = String(next)
      hud.subtitle = 'Get ready!'
      if (next !== lastTick && next > 0) {
        lastTick = next
        play('tick')
      }
    } else {
      hud.banner = active.name
      hud.subtitle = isFinale(slot) ? 'FINAL ROUND - the show champion is decided here' : active.hint
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
      hud.banner = String(Math.ceil(GET_READY_SECONDS - playElapsed))
      hud.subtitle = 'Get ready!'
      active.tick(dt, playElapsed, false)
      return
    }
    if (!released) {
      released = true
      spectator.setRoundLive(true)
      if (!spectator.isOut()) {
        spectator.releaseInput()
        play('go')
        say('go')
      }
    }

    if (spectator.isOut() && outAt === 0) outAt = playElapsed

    if (!saidHurry && hud.roundClock > 0 && hud.roundClock <= 15) {
      saidHurry = true
      if (!spectator.isOut()) say('hurry_up')
    }

    active.tick(dt, playElapsed, true)

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
    if (survived) play('crown')
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
      say('congratulations')
    } else {
      spectator.sendToLobby()
    }
  }

  active.tick(dt, SLOT_SECONDS, false)
  // "QUALIFIED" is the party-game word, and it lands harder than "survived" - it says you are
  // through to something, not merely that you are not dead.
  hud.banner = spectator.isOut() ? 'ELIMINATED' : 'QUALIFIED!'
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
