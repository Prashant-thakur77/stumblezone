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
import { KILL_Y, LEDGE, LOBBY, LIVES_PER_ROUND } from '../config'
import { emitCheer, emitEliminated, onCheer } from '../net/sync'

const CHEER_EMOTES = ['clap', 'wave', 'dance', 'headexplode']

let lives = LIVES_PER_ROUND
let out = false
/** Set while a movePlayerTo is in flight, so the fall watcher doesn't fire twice. */
let relocating = false
let fallHandler: (() => void) | null = null

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
  if (lives > 0) return false
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
  InputModifier.createOrReplace(engine.PlayerEntity, {
    mode: InputModifier.Mode.Standard({ disableAll: true })
  })
}

export function eliminate(): void {
  if (out) return
  out = true
  emitEliminated()
  void sendTo(LEDGE)
  // Eliminated players are spectators, not participants: freeze locomotion so they can't wander
  // back into a round they are out of.
  InputModifier.createOrReplace(engine.PlayerEntity, {
    mode: InputModifier.Mode.Standard({ disableAll: true })
  })
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
  onCheer(() => {})

  engine.addSystem(function fallWatcher() {
    if (relocating || out) return
    const t = Transform.getOrNull(engine.PlayerEntity)
    if (!t || t.position.y > KILL_Y) return
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
    if (inputSystem.isTriggered(InputAction.IA_PRIMARY, PointerEventType.PET_DOWN)) cheer()
  })
}
