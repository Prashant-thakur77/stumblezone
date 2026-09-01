// A short crane shot of the podium after the finale.
//
// A show needs a curtain call, and the SDK gives one for free: a VirtualCamera placed above the
// lobby looking at the top step, swapped in for six seconds and then handed back. Everything here
// is local to one client - the camera is not synced and does not need to be, because every client
// runs this at the same moment on the same clock.
//
// Two engine rules this obeys: a virtual camera outside the scene's parcels is silently ignored,
// so it lives over the lobby; and the main camera must have its virtualCameraEntity cleared before
// anything else touches it, or control never comes back to the player.

import { engine, Entity, Transform, VirtualCamera, MainCamera } from '@dcl/sdk/ecs'
import { Vector3 } from '@dcl/sdk/math'
import { LOBBY, PODIUM_SPOTS } from '../config'

let cam: Entity | null = null
let target: Entity | null = null
let until = 0

export function podiumShot(seconds = 6): void {
  if (!cam) {
    target = engine.addEntity()
    Transform.create(target, {
      position: Vector3.create(PODIUM_SPOTS[0].x, PODIUM_SPOTS[0].y + 1.2, PODIUM_SPOTS[0].z)
    })
    cam = engine.addEntity()
    Transform.create(cam, { position: Vector3.create(LOBBY.x + 7, LOBBY.y + 6, LOBBY.z + 9) })
    VirtualCamera.create(cam, {
      // A timed transition rather than a cut: a hard cut on a phone reads as a glitch.
      defaultTransition: { transitionMode: VirtualCamera.Transition.Time(1.2) },
      lookAtEntity: target
    })
  }
  MainCamera.createOrReplace(engine.CameraEntity, { virtualCameraEntity: cam })
  until = Date.now() + seconds * 1000
}

/** Hands the camera back when the shot is over. Registered once by the scheduler. */
export function cameraSystem(): void {
  if (until === 0 || Date.now() < until) return
  until = 0
  MainCamera.createOrReplace(engine.CameraEntity, { virtualCameraEntity: undefined })
}
