// The Sky Course and the Sky Box: the climb continues from the tower, and ends at the best seat
// in the house - a glass-floored platform over the village, with the drop off its south edge.

import { engine, Transform, MeshRenderer, MeshCollider, Material } from '@dcl/sdk/ecs'
import { Vector3, Color4 } from '@dcl/sdk/math'
import { PARTY_COLORS, WALL_COLOR } from '../config'
import { skySteps, skyBox } from '../lib/sky'
import { solid, kerb, sign } from './build'
import { buildStar } from './models'

export function buildSky(): void {
  const steps = skySteps()
  // Step 0 is the tower's lookout, already built.
  for (let i = 1; i < steps.length; i++) {
    const s = steps[i]
    solid(Vector3.create(s.x, s.y, s.z), Vector3.create(1.7, 0.3, 1.7), PARTY_COLORS[i % PARTY_COLORS.length])
  }

  const b = skyBox()
  // The glass floor: a translucent slab you can see the village through.
  const glass = engine.addEntity()
  Transform.create(glass, { position: Vector3.create(b.x, b.y - 0.15, b.z), scale: Vector3.create(b.size, 0.3, b.size) })
  MeshRenderer.setBox(glass)
  MeshCollider.setBox(glass)
  Material.setPbrMaterial(glass, {
    albedoColor: Color4.create(0.2, 0.8, 1.0, 0.35),
    transparencyMode: 2,
    roughness: 0.1,
    specularIntensity: 1
  })
  // Kerbs on three sides; the south edge is open - that is where the drop is.
  kerb(b.x - b.size / 2 + 0.15, b.y, b.z, 0.3, b.size)
  kerb(b.x + b.size / 2 - 0.15, b.y, b.z, 0.3, b.size)
  kerb(b.x, b.y, b.z + b.size / 2 - 0.15, b.size, 0.3)
  // A rail on the west corner so the last step reads as an arrival, not the middle of nowhere.
  solid(Vector3.create(b.x - b.size / 2 + 0.3, b.y + 1, b.z + b.size / 2 - 0.3), Vector3.create(0.2, 2, 0.2), WALL_COLOR)

  buildStar(Vector3.create(b.x, b.y + 3.2, b.z), 1.0)
  sign('SKY BOX\nThe drop is off the south edge - aim for the rings', Vector3.create(b.x, b.y + 2.4, b.z), 1.2)
}
