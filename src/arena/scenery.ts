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
  Material,
  TextShape,
  Font,
  Billboard,
  BillboardMode,
  Tween,
  EasingFunction
} from '@dcl/sdk/ecs'
import { Vector3, Quaternion, Color4, Color3 } from '@dcl/sdk/math'
import { buildConfetti, buildCloud, setVisible } from './models'
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
const PILLAR_HEIGHT = 14

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
  // A floor for the sky. Far below the kill plane, so it is scenery and never a surface.
  box(
    Vector3.create(ARENA_CENTER_X, GROUND_Y, ARENA_CENTER_Z),
    Vector3.create(64, 1, 64),
    { r: 0.36, g: 0.55, b: 0.36 }
  )

  // A ring of colourful pillars around the play area. These are the scene's main visual anchor:
  // they give the moving sweeper walls something to be measured against.
  for (let i = 0; i < PILLAR_COUNT; i++) {
    const angle = (i / PILLAR_COUNT) * Math.PI * 2
    const x = ARENA_CENTER_X + Math.cos(angle) * ARENA_RADIUS
    const z = ARENA_CENTER_Z + Math.sin(angle) * ARENA_RADIUS
    const color = PARTY_COLORS[i % PARTY_COLORS.length]

    cylinder(
      Vector3.create(x, ARENA_Y - 4 + PILLAR_HEIGHT / 2, z),
      Vector3.create(1.6, PILLAR_HEIGHT, 1.6),
      { r: 0.97, g: 0.97, b: 0.95 }
    )
    // A glowing cap, so the ring still reads at dusk and from the spectator ledge.
    const cap = box(
      Vector3.create(x, ARENA_Y - 4 + PILLAR_HEIGHT + 0.6, z),
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
        ARENA_Y + 2 + (i % 5) * 3.5,
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

export function setJumbotron(text: string): void {
  if (!jumbotron) return
  const t = TextShape.getMutable(jumbotron)
  if (t.text !== text) t.text = text
}
