// Round H - Crown Rush.
//
// King of the hill on the round stage. A crown zone - a glowing ring with a crown turning above
// it - and every second you stand inside is a point. It hops every twelve seconds and shrinks as
// the round goes on, so the crowd inside it gets tighter. Nobody is eliminated: the round is
// about wanting the same floor as someone else, which no other round asks of you.

import { engine, Entity, Transform, MeshRenderer, Material, VisibilityComponent } from '@dcl/sdk/ecs'
import { Vector3, Color4, Color3 } from '@dcl/sdk/math'
import { ARENA_CENTER_X, ARENA_CENTER_Z, ARENA_Y } from '../../config'
import { zoneAt, pointsFor, SCORING_FROM, HOP_SECONDS, Zone } from '../../lib/crownrush'
import { buildDisc, setDiscVisible } from '../disc'
import { buildCrown } from '../models'
import { Round } from './types'
import { setBanner } from '../../ui/state'
import { setJumbotronColor } from '../scenery'
import { isOut } from '../../systems/spectator'
import { play } from '../../systems/audio'

let disc: Entity[] = []
let ring: Entity
let crown: Entity
let seedNow = 0
let running = false
let points = 0
let lastHop = -1
let inside = false
let clock = 0

const GOLD = { r: 1.0, g: 0.83, b: 0.25 }

function buildRing(): void {
  ring = engine.addEntity()
  Transform.create(ring, { position: Vector3.create(ARENA_CENTER_X, ARENA_Y + 0.06, ARENA_CENTER_Z), scale: Vector3.create(6, 0.06, 6) })
  MeshRenderer.setCylinder(ring)
  Material.setPbrMaterial(ring, {
    albedoColor: Color4.create(GOLD.r, GOLD.g, GOLD.b, 0.55),
    transparencyMode: 2,
    emissiveColor: Color3.create(GOLD.r, GOLD.g, GOLD.b),
    emissiveIntensity: 1.6,
    roughness: 0.6
  })
  crown = buildCrown(Vector3.create(ARENA_CENTER_X, ARENA_Y + 2.2, ARENA_CENTER_Z))
}

function place(z: Zone): void {
  const r = Transform.getMutable(ring)
  r.position.x = ARENA_CENTER_X + z.x
  r.position.z = ARENA_CENTER_Z + z.z
  r.scale.x = z.radius * 2
  r.scale.z = z.radius * 2
  const c = Transform.getMutable(crown)
  c.position.x = ARENA_CENTER_X + z.x
  c.position.z = ARENA_CENTER_Z + z.z
}

function setVisible(on: boolean): void {
  VisibilityComponent.createOrReplace(ring, { visible: on })
  VisibilityComponent.createOrReplace(crown, { visible: on })
}

export const crownRush: Round = {
  name: 'Crown Rush',
  hint: 'Stand in the crown zone.',
  twist: 'The zone hops every 12s and shrinks',
  joinSafe: true,
  scored: true,
  pickupRadius: 10,

  spawn(): Vector3 {
    return Vector3.create(ARENA_CENTER_X, ARENA_Y + 1, ARENA_CENTER_Z + 6)
  },

  build() {
    disc = buildDisc(Color4.create(0.85, 0.55, 0.2, 1))
    buildRing()
    this.stop()
  },

  start(seed: number) {
    seedNow = seed
    running = true
    points = 0
    lastHop = -1
    inside = false
    clock = 0
    setDiscVisible(disc, true)
    setVisible(true)
    place(zoneAt(seed, 0))
  },

  score(): number {
    return points
  },

  tick(dt: number, elapsed: number, playing: boolean) {
    if (!running) return
    clock += dt
    const zone = zoneAt(seedNow, elapsed)
    if (zone.hop !== lastHop) {
      lastHop = zone.hop
      place(zone)
      if (playing) play('boing')
    } else if (playing) {
      // The shrink, a little every frame.
      const r = Transform.getMutable(ring)
      r.scale.x = zone.radius * 2
      r.scale.z = zone.radius * 2
    }
    if (!playing) {
      setBanner('', 'Every second in the ring is a point. Most points wins.')
      return
    }
    if (isOut()) return
    const t = Transform.getOrNull(engine.PlayerEntity)
    if (!t) return
    const d = Math.hypot(t.position.x - (ARENA_CENTER_X + zone.x), t.position.z - (ARENA_CENTER_Z + zone.z))
    const onStage = Math.abs(t.position.y - ARENA_Y) < 3
    const gained = onStage ? pointsFor(zone, d, dt, elapsed) : 0
    points += gained
    const nowInside = gained > 0
    if (nowInside !== inside) {
      inside = nowInside
      if (inside) play('tick')
    }
    setJumbotronColor(inside ? GOLD : null)
    const untilHop = elapsed < SCORING_FROM ? SCORING_FROM - elapsed : HOP_SECONDS_LEFT(elapsed)
    setBanner(inside ? 'IN THE ZONE  ' + Math.floor(points) : 'GET IN THE ZONE  ' + Math.floor(points), 'hops in ' + Math.ceil(untilHop) + 's')
  },

  stop() {
    running = false
    setDiscVisible(disc, false)
    if (ring) setVisible(false)
    setJumbotronColor(null)
  }
}

function HOP_SECONDS_LEFT(elapsed: number): number {
  return HOP_SECONDS - ((elapsed - SCORING_FROM) % HOP_SECONDS)
}
