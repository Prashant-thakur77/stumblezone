// The scene's few GLB models.
//
// Deliberately few. Everything with many instances - the 433 tiles, the walls, the bumpers - stays
// an SDK primitive, because 433 GLB draw calls would cost far more than the look is worth on a
// phone. Models are used only where they are seen up close and there is exactly one of them.
//
// All are CC0 from the OpenDCL catalog. None ships a `_collider` mesh, and none of them
// should be solid, so every one is placed with both collision masks at 0: pure decoration that
// players walk through rather than trip over.
//
// Bounding boxes were measured from the GLB rather than trusted from the catalog listing - the
// balloon group lists as 17m but actually renders at 44m across, which unscaled would swallow half
// the scene.

import {
  engine,
  Entity,
  Transform,
  GltfContainer,
  Animator,
  VisibilityComponent,
  Tween,
  TweenSequence,
  TweenLoop,
  EasingFunction
} from '@dcl/sdk/ecs'
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

/**
 * A drifting cloud puff. Measures 0.7m natively - the catalog says 1.5 - so it is scaled up hard.
 * Ships an idle animation clip, which is why the sky is never completely still.
 */
export function buildCloud(position: Vector3, size = 6): Entity {
  const e = decorModel('assets/Models/cloud-puff.glb', position, Vector3.create(size, size, size))
  Animator.create(e, { states: [{ clip: 'Animation', playing: true, loop: true }] })
  return e
}

/** Native 4.1 x 5.3 x 4.4m with its base near the origin, so it is placed at ground level 1:1. */
export function buildTree(position: Vector3, scale = 1): Entity {
  return decorModel('assets/Models/tree.glb', position, Vector3.create(scale, scale, scale))
}

// ---- Stadium dressing (docs/FALLGUYS-PRESENTATION.md, Part 4). Every bound below came from
// tools/measure-glb.mjs, not from the catalog page.

/**
 * A cluster of animated floating faces: the crowd. Native 1.73 x 1.28 x 1.73m with its base at
 * y=0.96, so the cluster is dropped by that much (times scale) to sit its feet on `position`.
 * `faceY` turns it to look at the arena.
 */
export function buildCrowd(position: Vector3, faceY: number, scale = 2.6): Entity {
  const e = decorModel(
    'assets/Models/crowd.glb',
    Vector3.create(position.x, position.y - 0.96 * scale, position.z),
    Vector3.create(scale, scale, scale),
    faceY
  )
  Animator.create(e, { states: [{ clip: 'Curve.015Action', playing: true, loop: true }] })
  return e
}

/**
 * A stadium searchlight. The model is a 16-triangle cone 80m long with its apex at the origin and
 * its length along -Z, so `fromLookAt` from the base to a point BEHIND it aims the cone at
 * `target`. Scaled to 0.5 on Z (a 40m beam) and it sweeps +-24 degrees of yaw on a yoyo tween: a
 * slow, bounded sweep rather than a full rotation, so the beam never leaves the parcel.
 */
export function buildSearchlight(position: Vector3, target: Vector3, sweepSeconds = 7): Entity {
  const d = Vector3.normalize(Vector3.subtract(target, position))
  const aim = Quaternion.fromLookAt(position, Vector3.subtract(position, d))
  const e = decorModel('assets/Models/searchlight.glb', position, Vector3.create(0.6, 0.6, 0.5))
  Transform.getMutable(e).rotation = aim
  const swing = Quaternion.fromEulerDegrees(0, 24, 0)
  const back = Quaternion.fromEulerDegrees(0, -24, 0)
  Tween.create(e, {
    mode: Tween.Mode.Rotate({ start: Quaternion.multiply(swing, aim), end: Quaternion.multiply(back, aim) }),
    duration: sweepSeconds * 1000,
    easingFunction: EasingFunction.EF_EASESINE
  })
  TweenSequence.create(e, { sequence: [], loop: TweenLoop.TL_YOYO })
  return e
}

/**
 * The animated rainbow backdrop: 54 x 55 x 9m centred on its own origin (min y -27), so `position`
 * is the middle of the arch, not its feet. Its plane is XY, so unrotated it faces the lobby.
 */
export function buildRainbow(position: Vector3, scale = 1): Entity {
  const e = decorModel('assets/Models/rainbow.glb', position, Vector3.create(scale, scale, scale))
  Animator.create(e, { states: [{ clip: 'AllOn', playing: true, loop: true }] })
  return e
}

/** A spinning gold star, 1.5m natively with its base at y=1.09. `position` is where its base goes. */
export function buildStar(position: Vector3, scale = 1.2): Entity {
  const e = decorModel(
    'assets/Models/star.glb',
    Vector3.create(position.x, position.y - 1.09 * scale, position.z),
    Vector3.create(scale, scale, scale)
  )
  Animator.create(e, { states: [{ clip: 'CylinderAction', playing: true, loop: true }] })
  return e
}

/**
 * A lollipop with a face on it: the lobby's one character. The lollipop model lies along +Z
 * (13.2m long, 0.5m thick), so it is stood up with a -90 degree X rotation; the face is a flat
 * 2.4 x 2.2m plate in the XZ plane that sits at the head end as a child, once per side so it smiles
 * both ways. `position` is the foot of the stick.
 */
export function buildLolli(position: Vector3, scale = 0.45, faceY = 0): Entity {
  const e = engine.addEntity()
  Transform.create(e, {
    position,
    scale: Vector3.create(scale, scale, scale),
    rotation: Quaternion.multiply(Quaternion.fromEulerDegrees(0, faceY, 0), Quaternion.fromEulerDegrees(-90, 0, 0))
  })
  GltfContainer.create(e, { src: 'assets/Models/lollipop.glb', ...DECOR })
  for (const flip of [0, 180]) {
    const face = engine.addEntity()
    Transform.create(face, {
      parent: e,
      // In the stick's local frame +Z is "up the stick"; the head is centred 9.7m along it.
      position: Vector3.create(0, flip === 0 ? -0.55 : 0.55, 9.66),
      rotation: Quaternion.fromEulerDegrees(0, 0, flip)
    })
    GltfContainer.create(face, { src: 'assets/Models/lolli-face.glb', ...DECOR })
    Animator.create(face, { states: [{ clip: 'faceAction', playing: true, loop: true }] })
  }
  return e
}

/** The inflatables. Each has its base well above its origin; `baseY` is that measured offset. */
export function buildInflatable(src: 'pig' | 'critter', position: Vector3, faceY = 0): Entity {
  const scale = src === 'pig' ? 0.55 : 0.65
  const baseY = src === 'pig' ? 3.21 : 3.96
  return decorModel(
    'assets/Models/inflatable-' + src + '.glb',
    Vector3.create(position.x, position.y - baseY * scale, position.z),
    Vector3.create(scale, scale, scale),
    faceY
  )
}

export function setVisible(e: Entity, visible: boolean): void {
  VisibilityComponent.createOrReplace(e, { visible })
}
