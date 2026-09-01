// The scene's few GLB models.
//
// Deliberately few. Everything with many instances - the 433 tiles, the walls, the bumpers - stays
// an SDK primitive, because 433 GLB draw calls would cost far more than the look is worth on a
// phone. Models are used only where they are seen up close and there is exactly one of them.
//
// All four are CC0 from the OpenDCL catalog. None ships a `_collider` mesh, and none of them
// should be solid, so every one is placed with both collision masks at 0: pure decoration that
// players walk through rather than trip over.
//
// Bounding boxes were measured from the GLB rather than trusted from the catalog listing - the
// balloon group lists as 17m but actually renders at 44m across, which unscaled would swallow half
// the scene.

import { engine, Entity, Transform, GltfContainer, Animator, VisibilityComponent } from '@dcl/sdk/ecs'
import { Vector3, Quaternion } from '@dcl/sdk/math'

/** Decoration only: never solid, so nothing here can block a round. */
const DECOR = { visibleMeshesCollisionMask: 0, invisibleMeshesCollisionMask: 0 }

export function decorModel(src: string, position: Vector3, scale: Vector3, rotationY = 0): Entity {
  const e = engine.addEntity()
  Transform.create(e, {
    position,
    scale,
    rotation: Quaternion.fromEulerDegrees(0, rotationY, 0)
  })
  GltfContainer.create(e, { src, ...DECOR })
  return e
}

/**
 * The podium crown. Ships with a "Spinning" clip, so it turns on its own.
 *
 * Native size 2.01 x 1.08 x 2.01m with its pivot on the base, which is why it sits directly on the
 * podium's top face with no vertical offset needed.
 */
export function buildCrown(position: Vector3): Entity {
  const e = decorModel('assets/Models/crown.glb', position, Vector3.create(1.4, 1.4, 1.4))
  Animator.create(e, {
    states: [{ clip: 'Spinning', playing: true, loop: true }]
  })
  return e
}

/** Native 5.93 x 3.48 x 1.03m - already the right size for a finish line, so it is placed 1:1. */
export function buildFinishFlag(position: Vector3): Entity {
  return decorModel('assets/Models/finish-flag.glb', position, Vector3.create(1, 1, 1))
}

/**
 * Balloon cluster. Native bounds are 44.30 x 25.77 x 44.33m - four times what the catalog claims -
 * so this is scaled to 0.22 for a cluster about 10m across, and its origin is offset because the
 * model is not centred on its own pivot (min x -23.66, max x 20.64).
 */
export function buildBalloons(position: Vector3): Entity {
  return decorModel('assets/Models/balloons.glb', position, Vector3.create(0.22, 0.22, 0.22))
}

/** Celebration burst. Native 11.44 x 11.74 x 8.08m, hidden until someone qualifies. */
export function buildConfetti(position: Vector3): Entity {
  const e = decorModel('assets/Models/confetti.glb', position, Vector3.create(1.2, 1.2, 1.2))
  VisibilityComponent.create(e, { visible: false })
  return e
}

export function setVisible(e: Entity, visible: boolean): void {
  VisibilityComponent.createOrReplace(e, { visible })
}
