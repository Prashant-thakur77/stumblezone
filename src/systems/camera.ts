// The scene's two cinematic cameras: the spectator's arena view, and the podium curtain call.
//
// A VirtualCamera is local to one client, which is exactly what both of these want - the camera is
// never synced, and every client runs the same shot at the same moment off the same clock.
//
// Two engine rules this obeys: a virtual camera placed outside the scene's parcels is silently
// ignored, so both live over the arena or the lobby; and the main camera's `virtualCameraEntity`
// must be cleared to hand control back, or the player is stuck looking at the podium forever.

import { engine, Entity, Transform, VirtualCamera, MainCamera, Tween, EasingFunction } from '@dcl/sdk/ecs'
import { Vector3 } from '@dcl/sdk/math'
import { ARENA_CENTER_X, ARENA_CENTER_Z, ARENA_Y, LEDGE, LOBBY, PODIUM_SPOTS } from '../config'

type Mode = 'none' | 'spectate' | 'podium' | 'flyover'

let podiumCam: Entity | null = null
let spectateCam: Entity | null = null
let mode: Mode = 'none'
let spectateWanted = false
let podiumUntil = 0
let flyCam: Entity | null = null
let flyUntil = 0

function lookTarget(at: Vector3): Entity {
  const e = engine.addEntity()
  Transform.create(e, { position: at })
  return e
}

function apply(next: Mode): void {
  if (mode === next) return
  mode = next
  const cam = next === 'podium' ? podiumCam : next === 'flyover' ? flyCam : next === 'spectate' ? spectateCam : undefined
  MainCamera.createOrReplace(engine.CameraEntity, { virtualCameraEntity: cam ?? undefined })
}

/**
 * The spectator's view: a high seat over the ledge looking down at the arena floor.
 *
 * Being eliminated should not mean losing sight of the round. On a phone, wrestling a third-person
 * camera round to face the arena is exactly the friction that makes people close the app instead of
 * watching the finish - so there is a button that just does it.
 */
export function setSpectatorCam(on: boolean): void {
  spectateWanted = on
  if (on && !spectateCam) {
    spectateCam = engine.addEntity()
    Transform.create(spectateCam, { position: Vector3.create(LEDGE.x, LEDGE.y + 5, LEDGE.z - 4) })
    VirtualCamera.create(spectateCam, {
      defaultTransition: { transitionMode: VirtualCamera.Transition.Time(0.8) },
      lookAtEntity: lookTarget(Vector3.create(ARENA_CENTER_X, ARENA_Y + 1, ARENA_CENTER_Z))
    })
  }
  if (mode !== 'podium') apply(on ? 'spectate' : 'none')
}

export function spectatorCamOn(): boolean {
  return spectateWanted
}

/**
 * The establishing shot: a slow crane across the arena during the round card, so you see the
 * board you are about to play. The camera drifts west to east, forty metres up, looking at the
 * stage; a static shot reads as a screenshot, a moving one as television.
 */
export function flyover(seconds = 6): void {
  if (mode === 'podium' || mode === 'spectate') return
  if (!flyCam) {
    flyCam = engine.addEntity()
    Transform.create(flyCam, { position: Vector3.create(ARENA_CENTER_X - 22, ARENA_Y + 20, ARENA_CENTER_Z - 26) })
    VirtualCamera.create(flyCam, {
      defaultTransition: { transitionMode: VirtualCamera.Transition.Time(0.8) },
      lookAtEntity: lookTarget(Vector3.create(ARENA_CENTER_X, ARENA_Y + 1, ARENA_CENTER_Z))
    })
  }
  Tween.createOrReplace(flyCam, {
    mode: Tween.Mode.Move({
      start: Vector3.create(ARENA_CENTER_X - 22, ARENA_Y + 20, ARENA_CENTER_Z - 26),
      end: Vector3.create(ARENA_CENTER_X + 22, ARENA_Y + 18, ARENA_CENTER_Z - 26)
    }),
    duration: seconds * 1000,
    easingFunction: EasingFunction.EF_EASESINE
  })
  flyUntil = Date.now() + seconds * 1000
  apply('flyover')
}

/** The curtain call: six seconds on the top step, then control goes back. */
export function podiumShot(seconds = 6): void {
  if (!podiumCam) {
    podiumCam = engine.addEntity()
    Transform.create(podiumCam, { position: Vector3.create(LOBBY.x + 7, LOBBY.y + 6, LOBBY.z + 9) })
    VirtualCamera.create(podiumCam, {
      // A timed transition rather than a cut: a hard cut on a phone reads as a glitch.
      defaultTransition: { transitionMode: VirtualCamera.Transition.Time(1.2) },
      lookAtEntity: lookTarget(Vector3.create(PODIUM_SPOTS[0].x, PODIUM_SPOTS[0].y + 1.2, PODIUM_SPOTS[0].z))
    })
  }
  podiumUntil = Date.now() + seconds * 1000
  apply('podium')
}

/** Registered once by the scheduler. Hands the camera back when a shot is over. */
export function cameraSystem(): void {
  if (flyUntil !== 0 && Date.now() >= flyUntil) {
    flyUntil = 0
    if (mode === 'flyover') {
      mode = 'flyover'
      apply(spectateWanted ? 'spectate' : 'none')
    }
  }
  if (podiumUntil === 0 || Date.now() < podiumUntil) return
  podiumUntil = 0
  // Back to whatever the player had chosen before the curtain call took over.
  mode = 'podium'
  apply(spectateWanted ? 'spectate' : 'none')
}
