// The round stage that Spotlight and Jump Bar share.
//
// Both rounds want the same thing - a flat circle with nowhere to hide and a clean edge to fall
// off - so it is built once here rather than twice with slightly different numbers. Each round
// owns its own copy of the entities (rounds build their pools once at boot and only toggle
// visibility afterwards), and colours it to its own mood.

import { engine, Entity, Transform, MeshRenderer, MeshCollider, Material, VisibilityComponent } from '@dcl/sdk/ecs'
import { Vector3, Color4 } from '@dcl/sdk/math'
import { ARENA_CENTER_X, ARENA_CENTER_Z, ARENA_Y, DISC_RADIUS, WALL_COLOR } from '../config'

/** A stage disc plus its raised lip, hidden until the round starts. */
export function buildDisc(color: Color4): Entity[] {
  const parts: Entity[] = []

  const floor = engine.addEntity()
  // The cylinder's origin is its centre, and its top must sit at ARENA_Y like every other round's
  // floor, so the whole 1m slab hangs below that line.
  Transform.create(floor, {
    position: Vector3.create(ARENA_CENTER_X, ARENA_Y - 0.5, ARENA_CENTER_Z),
    scale: Vector3.create(DISC_RADIUS * 2, 1, DISC_RADIUS * 2)
  })
  MeshRenderer.setCylinder(floor)
  MeshCollider.setCylinder(floor)
  Material.setPbrMaterial(floor, { albedoColor: color, roughness: 0.35, specularIntensity: 1 })
  parts.push(floor)

  // A lip, so the edge of the stage reads from across the arena and in a phone-sized viewport.
  const lip = engine.addEntity()
  Transform.create(lip, {
    position: Vector3.create(ARENA_CENTER_X, ARENA_Y + 0.1, ARENA_CENTER_Z),
    scale: Vector3.create(DISC_RADIUS * 2 + 0.8, 0.3, DISC_RADIUS * 2 + 0.8)
  })
  MeshRenderer.setCylinder(lip)
  Material.setPbrMaterial(lip, {
    albedoColor: Color4.create(WALL_COLOR.r, WALL_COLOR.g, WALL_COLOR.b, 1),
    roughness: 0.4,
    specularIntensity: 1
  })
  parts.push(lip)

  setDiscVisible(parts, false)
  return parts
}

/**
 * Show or hide the stage. The collider goes with it: an invisible disc that still blocks movement
 * would sit inside every other round's arena and quietly break them.
 */
export function setDiscVisible(parts: Entity[], on: boolean): void {
  for (let i = 0; i < parts.length; i++) {
    VisibilityComponent.createOrReplace(parts[i], { visible: on })
    // Only the floor (the first part) is ever walked on; the lip is decoration.
    if (i !== 0) continue
    if (on) MeshCollider.setCylinder(parts[i])
    else MeshCollider.deleteFrom(parts[i])
  }
}
