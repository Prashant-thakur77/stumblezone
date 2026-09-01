// The round state machine.
//
// It owns no schedule of its own — it reads the clock, asks lib/schedule what should be happening,
// and drives the rounds accordingly. That is what makes the game hostless: with nobody in the
// scene at all, the arena still cycles, and a player walking in at any instant lands mid-cycle in
// exactly the same state as everyone already there.

import { engine } from '@dcl/sdk/ecs'
import { slotIndex, slotElapsed, roundIndex, phaseAt, seedForSlot } from '../lib/schedule'
import { INTRO_SECONDS, GET_READY_SECONDS, PLAY_SECONDS, ROUND_NAMES, SLOT_SECONDS } from '../config'
import { Round } from '../arena/rounds/types'
import { hud } from '../ui/state'
import * as spectator from './spectator'
import { bindSlotSource, onEliminated, onFinished, myAddress } from '../net/sync'
import { award, CROWN_SURVIVE, CROWN_WIN, CROWN_FIRST_FINISHER, setName } from '../net/crowns'
import { getPlayer } from '@dcl/sdk/players'
import { record, best, formatSeconds } from './records'

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

  spectator.resetForSlot()
  spectator.releaseInput()
  outAt = 0

  active = rounds[roundIndex(slot)]
  active.start(seedForSlot(slot))

  // Joining after the round has already begun means spectating it. Dropping a latecomer onto a
  // half-decayed board is worse than a clear "you're up next" - and it stops the alive count from
  // claiming a player who never actually played.
  const joinedLate = slotElapsed(Date.now()) > INTRO_SECONDS + GET_READY_SECONDS
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

  if (phase === 'intro') {
    const next = Math.ceil(INTRO_SECONDS - elapsed)
    active.tick(dt, 0, false)
    // The hint is the whole of onboarding for a first-timer, so it stays up for most of the intro
    // and only yields to the countdown in the last five seconds.
    if (next <= 5) {
      hud.banner = String(next)
      hud.subtitle = 'Get ready!'
    } else {
      hud.banner = active.name
      hud.subtitle = active.hint
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
      }
      hud.banner = String(Math.ceil(GET_READY_SECONDS - playElapsed))
      hud.subtitle = 'Get ready!'
      active.tick(dt, playElapsed, false)
      return
    }
    if (!released) {
      released = true
      if (!spectator.isOut()) spectator.releaseInput()
    }

    if (spectator.isOut() && outAt === 0) outAt = playElapsed

    active.tick(dt, playElapsed, true)
    return
  }

  // Results.
  if (!scored) {
    scored = true
    const survived = !spectator.isOut()
    if (survived) {
      award(myAddress(), CROWN_SURVIVE)
      // Sole survivor takes the round. Requires someone to have been beaten - surviving alone is
      // worth a crown, but it is not a win.
      if (seen.size > 1 && eliminated.size === seen.size - 1) award(myAddress(), CROWN_WIN)
    }
    if (firstFinisher === myAddress()) award(myAddress(), CROWN_FIRST_FINISHER)

    const survivedMs = Math.round((survived ? PLAY_SECONDS : outAt) * 1000)
    const beatIt = record(hud.roundName, survivedMs)
    hud.resultDetail = seen.size > 1
      ? (survived ? '+1 crown' : eliminated.size + ' of ' + seen.size + ' went down')
      : beatIt
        ? 'New best! ' + formatSeconds(survivedMs)
        : formatSeconds(survivedMs) + '  ·  best ' + formatSeconds(best(hud.roundName))

    spectator.releaseInput()
    spectator.sendToLobby()
  }

  active.tick(dt, SLOT_SECONDS, false)
  hud.banner = spectator.isOut() ? 'ELIMINATED' : 'SURVIVED'
  hud.subtitle = hud.resultDetail + '  ·  next in ' + Math.ceil(remaining) + 's'
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
