// Shared builders for the village and the ring road: floors, kerbs, signs, trigger zones.
//
// Every place outside the arena is made of the same four things, and every one of them has a
// rule worth keeping in one spot: floors collide, kerbs are low enough to step over on purpose,
// signs billboard so they cannot face the wrong way, and zones only ever react to the local player.

import {
  engine,
  Entity,
  Transform,
  MeshRenderer,
  MeshCollider,
  Material,
  TriggerArea,
  triggerAreaEventsSystem,
  TextShape,
  Font,
  Billboard,
  BillboardMode
} from '@dcl/sdk/ecs'
import { Vector3, Color4, Color3 } from '@dcl/sdk/math'
import { PLATFORM_COLOR, WALL_COLOR } from '../config'

export type Rgb = { r: number; g: number; b: number }
export type TriggerResult = Parameters<Parameters<typeof triggerAreaEventsSystem.onTriggerEnter>[1]>[0]

export function isPlayer(result: TriggerResult): boolean {
  return result.trigger?.entity === engine.PlayerEntity
}

/** A solid box. `glow` adds emissive in the same colour, for pads and markers. */
export function solid(position: Vector3, scale: Vector3, color: Rgb = PLATFORM_COLOR, glow = 0): Entity {
  const e = engine.addEntity()
  Transform.create(e, { position, scale })
  MeshRenderer.setBox(e)
  MeshCollider.setBox(e)
  Material.setPbrMaterial(e, {
    albedoColor: Color4.create(color.r, color.g, color.b, 1),
    roughness: 0.45,
    specularIntensity: 1,
    ...(glow > 0 ? { emissiveColor: Color3.create(color.r, color.g, color.b), emissiveIntensity: glow } : {})
  })
  return e
}

/** A floor slab whose top is at `topY`. */
export function floor(x: number, topY: number, z: number, width: number, depth: number, color: Rgb = PLATFORM_COLOR): Entity {
  return solid(Vector3.create(x, topY - 0.5, z), Vector3.create(width, 1, depth), color)
}

/** A 0.3m kerb: enough to notice the edge, low enough to step over when you mean to. */
export function kerb(x: number, topY: number, z: number, width: number, depth: number): Entity {
  return solid(Vector3.create(x, topY + 0.15, z), Vector3.create(width, 0.3, depth), WALL_COLOR)
}

export function sign(text: string, position: Vector3, size: number): Entity {
  const e = engine.addEntity()
  Transform.create(e, { position })
  Billboard.create(e, { billboardMode: BillboardMode.BM_Y })
  TextShape.create(e, {
    text,
    fontSize: size,
    font: Font.F_SANS_SERIF,
    textColor: Color4.White(),
    outlineWidth: 0.15,
    outlineColor: Color3.Black()
  })
  return e
}

/** An invisible box that calls back when the local player walks in (and, optionally, out). */
export function zone(position: Vector3, scale: Vector3, enter: () => void, exit?: () => void): Entity {
  const e = engine.addEntity()
  Transform.create(e, { position, scale })
  TriggerArea.setBox(e)
  triggerAreaEventsSystem.onTriggerEnter(e, (r) => {
    if (isPlayer(r)) enter()
  })
  if (exit) {
    triggerAreaEventsSystem.onTriggerExit(e, (r) => {
      if (isPlayer(r)) exit()
    })
  }
  return e
}

/** A glowing marker square on a floor, with a zone over it. The unit of "step here to start". */
export function pad(x: number, topY: number, z: number, size: number, color: Rgb, onEnter: () => void): void {
  solid(Vector3.create(x, topY + 0.04, z), Vector3.create(size, 0.08, size), color, 0.8)
  zone(Vector3.create(x, topY + 1, z), Vector3.create(size, 2, size), onEnter)
}
