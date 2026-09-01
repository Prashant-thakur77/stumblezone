// Elimination, lives, and the spectator ledge.
//
// Falling is detected once, centrally, by watching the player's Y. Every round that can drop a
// player reuses it rather than writing its own fall check.
//
// Social note: the mobile client has no proximity voice chat, so an eliminated player who is simply
// parked somewhere has nothing to do. The ledge gives them a view of the arena and a cheer button,
// which is what keeps a round social for the people who lost it.

import { engine, Transform, InputModifier, InputAction, inputSystem, PointerEventType } from '@dcl/sdk/ecs'
import { Vector3 } from '@dcl/sdk/math'
import { movePlayerTo, triggerEmote } from '~system/RestrictedActions'
import { KILL_Y, LEDGE, LOBBY, LIVES_PER_ROUND, ARENA_Y } from '../config'
import { emitCheer, emitEliminated, onCheer } from '../net/sync'
import { play, say } from './audio'
import { toast } from './feed'
import { displayName } from '../net/crowns'

const CHEER_EMOTES = ['clap', 'wave', 'dance', 'headexplode']

let lives = LIVES_PER_ROUND
let out = false
/** Set while a movePlayerTo is in flight, so the fall watcher doesn't fire twice. */
let relocating = false
let fallHandler: (() => void) | null = null
/** True only while a round's play phase is running. Falls outside it are free rides home. */
let roundLive = false

/** Height of the lowest surface a player can legitimately stand on this round. */
let floorY = ARENA_Y
let falling = false

/** Rounds with a stack of decks (Hex-Drop) set this to the lowest one, so that dropping a deck
 *  is not scored as a fall by the sound. Everyone else leaves it at ARENA_Y. */
export function setFloorY(y: number): void {
  floorY = y
  falling = false
}

export function setRoundLive(live: boolean): void {
  roundLive = live
}

export function livesLeft(): number {
  return lives
}

export function isOut(): boolean {
  return out
}

/** Rounds register what should happen when the local player falls out of the world. */
export function onFall(cb: () => void): void {
  fallHandler = cb
}

export function resetForSlot(): void {
  lives = LIVES_PER_ROUND
  out = false
  relocating = false
  fallHandler = null
}

export async function sendTo(target: { x: number; y: number; z: number }): Promise<void> {
  relocating = true
  await movePlayerTo({ newRelativePosition: Vector3.create(target.x, target.y, target.z) })
  relocating = false
}

export function sendToLobby(): void {
  void sendTo(LOBBY)
}

/**
 * Spend a life. Returns true if that was the last one.
 *
 * Solo players get three lives per round instead of instant elimination, so a lone judge testing at
 * 3am still gets a real game rather than a five-second one.
 */
export function loseLife(): boolean {
  if (out) return true
  lives -= 1
  if (lives > 0) {
    // Losing a heart but staying in gets a softer cue than being knocked out entirely.
    play('crack')
    return false
  }
  eliminate()
  return true
}

/**
 * Sit this round out without being counted as eliminated by anyone else.
 *
 * Used for mid-round joiners: they watch from the ledge and are back in for the next slot, but no
 * `eliminated` message goes out, because they were never in the field to begin with.
 */
export function spectateOnly(): void {
  out = true
  void sendTo(LEDGE)
}

export function eliminate(): void {
  if (out) return
  out = true
  play('eliminated')
  say('you_lose')
  emitEliminated()
  void sendTo(LEDGE)
  // Deliberately NOT frozen. Being locked in place for the rest of a round is the least social
  // thing this game could do, and spectating is meant to be its heart. The ledge is 9m above the
  // arena and 10m clear of it, so a spectator can wander and cheer but cannot rejoin the round.
}

export function releaseInput(): void {
  InputModifier.deleteFrom(engine.PlayerEntity)
}

/** Freeze everyone for the get-ready beat, absorbing cross-client clock skew. */
export function freezeInput(): void {
  InputModifier.createOrReplace(engine.PlayerEntity, {
    mode: InputModifier.Mode.Standard({ disableAll: true })
  })
}

export function cheer(): void {
  const emote = CHEER_EMOTES[Math.floor(Math.random() * CHEER_EMOTES.length)]
  void triggerEmote({ predefinedEmote: emote })
  emitCheer(emote)
}

export function initSpectator(): void {
  // Other players' cheers already animate their own avatars over the network; this just keeps the
  // channel wired so the HUD can react to a crowd reacting.
  onCheer((p, isSelf) => {
    if (!isSelf) toast(displayName(p.address) + ' cheers!')
  })

  engine.addSystem(function fallWatcher() {
    if (relocating) return
    const t = Transform.getOrNull(engine.PlayerEntity)
    if (!t) return

    // The slide whistle. It plays the moment you are clearly below the floor with air under you,
    // not two seconds later at the kill plane - by then the fall is over and the joke is late.
    if (t.position.y < floorY - 3) {
      if (!falling && roundLive && !out) {
        falling = true
        play('fall')
      }
    } else {
      falling = false
    }

    if (t.position.y > KILL_Y) return

    // Spectators can walk off the ledge. Put them back rather than letting them fall forever.
    if (out) {
      void sendTo(LEDGE)
      return
    }
    // Now that the lobby itself floats 20m up, walking off its edge between rounds is possible -
    // and must cost nothing. Only a fall during live play belongs to the round.
    if (!roundLive) {
      sendToLobby()
      return
    }
    if (fallHandler) {
      fallHandler()
    } else {
      sendToLobby()
    }
  })

  // The cheer button. IA_PRIMARY is the mobile "E" button — reachable during play, unlike the
  // 1/2/3/4 buttons which hide behind a secondary menu.
  engine.addSystem(function cheerInput() {
    if (!out) return
    // Spectators only - a player still in the round needs IA_PRIMARY for nothing, but binding it
    // for everyone would fire emotes mid-run.
    if (inputSystem.isTriggered(InputAction.IA_PRIMARY, PointerEventType.PET_DOWN)) cheer()
  })
}
