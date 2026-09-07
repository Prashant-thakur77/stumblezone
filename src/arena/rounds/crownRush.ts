// Round H - Crown Rush.
//
// King of the hill on the round stage. A crown zone - a glowing ring with a crown turning above
// it - and every second you stand inside is a point. It hops every twelve seconds and shrinks as
// the round goes on, so the crowd inside it gets tighter. Nobody is eliminated: the round is
// about wanting the same floor as someone else, which no other round asks of you.

import { engine, Entity, Transform, MeshRenderer, Material } from '@dcl/sdk/ecs'
import { Vector3, Color4, Color3 } from '@dcl/sdk/math'
import { ARENA_CENTER_X, ARENA_CENTER_Z, ARENA_Y, GET_READY_SECONDS, PLAY_SECONDS } from '../../config'
import { zoneAt, pointsFor, nextHopIn, hopAt, radiusAt, Zone } from '../../lib/crownrush'
import { buildDisc, setDiscVisible } from '../disc'
import { buildCrown, setVisible } from '../models'
import { Round } from './types'
import { setBanner } from '../../ui/state'
import { setJumbotronColor } from '../scenery'
import { isOut, onFall, loseLife, sendTo } from '../../systems/spectator'
import { play } from '../../systems/audio'

let disc: Entity[] = []
let ring: Entity
let crown: Entity
let seedNow = 0
let running = false
let points = 0
let lastHop = -1
let inside = false
let zone: Zone = { x: 0, z: 0, radius: 3, hop: 0 }
let writtenRadius = 0
let shownPoints = -1
let shownHop = -1
let shownInside = false

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
  writtenRadius = z.radius
  const c = Transform.getMutable(crown)
  c.position.x = ARENA_CENTER_X + z.x
  c.position.z = ARENA_CENTER_Z + z.z
}

function show(on: boolean): void {
  setVisible(ring, on)
  setVisible(crown, on)
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
    lastHop = 0
    inside = false
    shownPoints = -1
    shownHop = -1
    shownInside = false
    zone = zoneAt(seed, 0)
    setDiscVisible(disc, true)
    show(true)
    place(zone)
    // Off the stage costs a heart and a walk back; the score stays. Nobody is eliminated here.
    onFall(() => {
      if (isOut()) return
      if (!loseLife()) void sendTo(this.spawn())
    })
  },

  score(): number {
    return points
  },

  tick(dt: number, rawElapsed: number, playing: boolean) {
    if (!running) return
    // The clock stops where play stops: the ring must not hop to a phantom spot during results.
    const elapsed = Math.min(rawElapsed, PLAY_SECONDS)

    // The zone only changes on a hop; the radius shrinks so slowly a write every centimetre is plenty.
    const hop = hopAt(elapsed)
    if (hop !== lastHop) {
      lastHop = hop
      zone = zoneAt(seedNow, elapsed)
      place(zone)
      if (playing) play('boing')
    } else {
      zone.radius = radiusAt(elapsed)
      if (Math.abs(zone.radius - writtenRadius) >= 0.01) {
        const r = Transform.getMutable(ring)
        r.scale.x = zone.radius * 2
        r.scale.z = zone.radius * 2
        writtenRadius = zone.radius
      }
    }

    if (!playing) {
      // The scheduler owns the banner during the freeze (the 5-4-3-2-1) and after play; the
      // rules line belongs to the warm-up only.
      if (rawElapsed >= GET_READY_SECONDS && rawElapsed < PLAY_SECONDS) setBanner('', 'Every second in the ring is a point. Most points wins.')
      if (rawElapsed >= PLAY_SECONDS) setJumbotronColor(null)
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
    // Strings only when a number changes: the banner is rebuilt at most a few times a second.
    const p = Math.floor(points)
    const h = Math.ceil(nextHopIn(elapsed))
    if (p !== shownPoints || h !== shownHop || inside !== shownInside) {
      shownPoints = p
      shownHop = h
      shownInside = inside
      setBanner((inside ? 'IN THE ZONE  ' : 'GET IN THE ZONE  ') + p, 'hops in ' + h + 's')
    }
  },

  stop() {
    running = false
    setDiscVisible(disc, false)
    if (ring) show(false)
    setJumbotronColor(null)
  }
}
