// The round state machine.
//
// It owns no schedule of its own — it reads the clock, asks lib/schedule what should be happening,
// and drives the rounds accordingly. That is what makes the game hostless: with nobody in the
// scene at all, the arena still cycles, and a player walking in at any instant lands mid-cycle in
// exactly the same state as everyone already there.

import { engine } from '@dcl/sdk/ecs'
import { slotIndex, slotElapsed, roundIndex, phaseAt, seedForSlot } from '../lib/schedule'
import { INTRO_SECONDS, GET_READY_SECONDS, ROUND_NAMES, SLOT_SECONDS } from '../config'
import { Round } from '../arena/rounds/types'
import { hud } from '../ui/state'
import * as spectator from './spectator'
import { bindSlotSource, onEliminated, onFinished, myAddress } from '../net/sync'
import { award, CROWN_SURVIVE, CROWN_WIN, CROWN_FIRST_FINISHER, setName } from '../net/crowns'
import { getPlayer } from '@dcl/sdk/players'

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
  spectator.sendToLobby()

  active = rounds[roundIndex(slot)]
  active.start(seedForSlot(slot))
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
    hud.banner = next <= 5 ? String(next) : hud.banner
    hud.subtitle = next <= 5 ? 'Get ready!' : hud.subtitle
    return
  }

  if (phase === 'play') {
    const playElapsed = elapsed - INTRO_SECONDS

    // The get-ready freeze. Two clients whose clocks differ by a second both spend this window
    // locked in place, which is why nothing here needs sub-second agreement.
    if (playElapsed < GET_READY_SECONDS) {
      if (!frozen) {
        frozen = true
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

    active.tick(dt, playElapsed, true)
    return
  }

  // Results.
  if (!scored) {
    scored = true
    const survived = !spectator.isOut()
    if (survived) {
      award(myAddress(), CROWN_SURVIVE)
      // Sole survivor takes the round.
      if (seen.size > 1 && eliminated.size === seen.size - 1) award(myAddress(), CROWN_WIN)
    }
    if (firstFinisher === myAddress()) award(myAddress(), CROWN_FIRST_FINISHER)
    spectator.releaseInput()
    spectator.sendToLobby()
  }

  active.tick(dt, SLOT_SECONDS, false)
  hud.banner = spectator.isOut() ? 'ELIMINATED' : 'SURVIVED'
  hud.subtitle = 'Next round in ' + Math.ceil(remaining) + 's'
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
