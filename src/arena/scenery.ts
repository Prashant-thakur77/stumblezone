// Static decoration. Built once, never touched again.
//
// Purpose is readability as much as looks: without a horizon, a ground plane and a ring of colour
// around the play area, four rounds of pale boxes floating in empty sky are genuinely hard to
// judge distance in. The pillars give the eye something fixed to measure the moving walls against.
//
// Nothing here has a collider except the ground, which sits far below the kill plane and exists
// only so the sky has a floor.

import {
  engine,
  Entity,
  Transform,
  MeshRenderer,
  MeshCollider,
  Material,
  TextShape,
  Font,
  Billboard,
  BillboardMode,
  Tween,
  EasingFunction
} from '@dcl/sdk/ecs'
import { Vector3, Quaternion, Color4, Color3 } from '@dcl/sdk/math'
import { buildConfetti, buildCloud, buildTree, setVisible } from './models'
import {
  ARENA_CENTER_X,
  ARENA_CENTER_Z,
  ARENA_Y,
  ARENA_RADIUS,
  GROUND_Y,
  PARTY_COLORS,
  PLATFORM_COLOR
} from '../config'

const PILLAR_COUNT = 12
/** Pillars rise from the ground, past the arena - so falling means falling down their length. */
const PILLAR_HEIGHT = 34

function box(position: Vector3, scale: Vector3, color: { r: number; g: number; b: number }, glow = 0): Entity {
  const e = engine.addEntity()
  Transform.create(e, { position, scale })
  MeshRenderer.setBox(e)
  Material.setPbrMaterial(e, {
    albedoColor: Color4.create(color.r, color.g, color.b, 1),
    roughness: 0.85,
    metallic: 0,
    ...(glow > 0
      ? { emissiveColor: Color3.create(color.r, color.g, color.b), emissiveIntensity: glow }
      : {})
  })
  return e
}

function cylinder(position: Vector3, scale: Vector3, color: { r: number; g: number; b: number }): Entity {
  const e = engine.addEntity()
  Transform.create(e, { position, scale })
  MeshRenderer.setCylinder(e)
  Material.setPbrMaterial(e, {
    albedoColor: Color4.create(color.r, color.g, color.b, 1),
    roughness: 0.8
  })
  return e
}

/** The big billboarded countdown over the arena, readable from the lobby and the ledge alike. */
let jumbotron: Entity
let confetti: Entity

export function buildScenery(): void {
  // The ground. Solid and green, 24m below the arena - the thing a falling player watches rush
  // up at them. The kill plane sits 2m above it, so nobody quite lands, but everybody almost does.
  const ground = box(
    Vector3.create(ARENA_CENTER_X, GROUND_Y - 0.5, ARENA_CENTER_Z),
    Vector3.create(64, 1, 64),
    { r: 0.4, g: 0.62, b: 0.38 }
  )
  MeshCollider.setBox(ground)

  // A soft pink splash pad directly under the arena: the visual promise of a place to land.
  const pad = engine.addEntity()
  Transform.create(pad, {
    position: Vector3.create(ARENA_CENTER_X, GROUND_Y + 0.06, ARENA_CENTER_Z),
    scale: Vector3.create(ARENA_RADIUS * 1.6, 0.1, ARENA_RADIUS * 1.6)
  })
  MeshRenderer.setCylinder(pad, 1, 1)
  Material.setPbrMaterial(pad, {
    albedoColor: Color4.create(0.99, 0.75, 0.83, 1),
    roughness: 0.9
  })

  // Trees scattered on the ground below, for scale while you fall.
  for (const [gx, gz] of [
    [10, 12],
    [52, 14],
    [8, 50],
    [55, 52],
    [14, 32],
    [50, 34]
  ] as [number, number][]) {
    buildTree(Vector3.create(gx, GROUND_Y - 0.3, gz), 1.6)
  }

  // A ring of colourful pillars around the play area. These are the scene's main visual anchor:
  // they give the moving sweeper walls something to be measured against.
  for (let i = 0; i < PILLAR_COUNT; i++) {
    const angle = (i / PILLAR_COUNT) * Math.PI * 2
    const x = ARENA_CENTER_X + Math.cos(angle) * ARENA_RADIUS
    const z = ARENA_CENTER_Z + Math.sin(angle) * ARENA_RADIUS
    const color = PARTY_COLORS[i % PARTY_COLORS.length]

    cylinder(
      Vector3.create(x, GROUND_Y + PILLAR_HEIGHT / 2, z),
      Vector3.create(1.6, PILLAR_HEIGHT, 1.6),
      { r: 0.97, g: 0.97, b: 0.95 }
    )
    // A glowing cap, so the ring still reads at dusk and from the spectator ledge.
    const cap = box(
      Vector3.create(x, GROUND_Y + PILLAR_HEIGHT + 0.6, z),
      Vector3.create(2.4, 1.2, 2.4),
      color,
      1.4
    )
    // Slow continuous spin, each cap a little different. Ambient motion is what stops a static
    // arena reading as a screenshot - and it costs nothing, the engine drives the tween.
    Tween.createOrReplace(cap, {
      mode: Tween.Mode.RotateContinuous({
        direction: Quaternion.fromEulerDegrees(0, i % 2 === 0 ? 1 : -1, 0),
        speed: 12
      }),
      duration: 0,
      easingFunction: EasingFunction.EF_LINEAR
    })
  }

  // Round banner above the arena. The HUD covers the player looking forward; this covers the
  // player looking up, across the arena, or down from the ledge.
  // Cloud puffs ringing the arena at varying heights. They animate on their own, so the sky is
  // never completely still, and they give the sheer drop below the arena a sense of altitude.
  const CLOUDS = 14
  for (let i = 0; i < CLOUDS; i++) {
    const angle = (i / CLOUDS) * Math.PI * 2 + 0.3
    const radius = ARENA_RADIUS + 4 + (i % 3) * 2.5
    buildCloud(
      Vector3.create(
        ARENA_CENTER_X + Math.cos(angle) * radius,
        // From just above the ground to just under the arena: the band a falling player drops
        // through. Falling through a cloud is the whole point of having them.
        GROUND_Y + 5 + (i % 5) * 4.2,
        ARENA_CENTER_Z + Math.sin(angle) * radius
      ),
      5 + (i % 3) * 1.5
    )
  }

  confetti = buildConfetti(Vector3.create(ARENA_CENTER_X, ARENA_Y + 8, ARENA_CENTER_Z))

  jumbotron = engine.addEntity()
  Transform.create(jumbotron, { position: Vector3.create(ARENA_CENTER_X, ARENA_Y + 13, ARENA_CENTER_Z) })
  Billboard.create(jumbotron, { billboardMode: BillboardMode.BM_Y })
  TextShape.create(jumbotron, {
    text: '',
    fontSize: 10,
    font: Font.F_SANS_SERIF,
    textColor: Color4.White(),
    outlineWidth: 0.2,
    outlineColor: Color3.Black()
  })
}

/** Burst of confetti over the arena. Shown for the results phase when the local player qualified. */
export function setConfetti(on: boolean): void {
  if (confetti) setVisible(confetti, on)
}

/** Tint the jumbotron text. Perfect Match uses this to SHOW the called colour, not just name it. */
export function setJumbotronColor(color: { r: number; g: number; b: number } | null): void {
  if (!jumbotron) return
  const t = TextShape.getMutable(jumbotron)
  t.textColor = color ? Color4.create(color.r, color.g, color.b, 1) : Color4.White()
}

export function setJumbotron(text: string): void {
  if (!jumbotron) return
  const t = TextShape.getMutable(jumbotron)
  if (t.text !== text) t.text = text
}
