// Power-ups on the stage: two stars a round, SHIELD and BOOST, each takeable once per player.

import { engine, Entity, Transform, MeshRenderer, Material, VisibilityComponent, AvatarLocomotionSettings, AvatarAttach, AvatarAnchorPointType, GltfContainer } from '@dcl/sdk/ecs'
import { Vector3, Color4, Color3 } from '@dcl/sdk/math'
import { ARENA_Y } from '../config'
import { powerupsFor, Powerup, Collection, BOOST_SECONDS } from '../lib/powerups'
import { buildStar } from '../arena/models'
import { hud } from '../ui/state'
import { toast } from './feed'
import { play } from './audio'
import { addShield, isOut } from './spectator'

const SHIELD_COLOR = { r: 0.2, g: 0.8, b: 1.0 }
const BOOST_COLOR = { r: 1.0, g: 0.83, b: 0.25 }

let rigs: { star: Entity; ring: Entity }[] = []
let list: Powerup[] = []
let centre = { x: 0, z: 0 }
let active = false
const taken = new Collection()
let boostUntil = 0
/** What the power-ups look like on you: a translucent bubble for SHIELD, a star overhead for BOOST. */
let bubble: Entity | null = null
let boostStar: Entity | null = null

function showBubble(on: boolean): void {
  if (on && !bubble) {
    bubble = engine.addEntity()
    Transform.create(bubble, { position: Vector3.create(0, 1, 0), scale: Vector3.create(1.9, 2.3, 1.9) })
    MeshRenderer.setSphere(bubble)
    Material.setPbrMaterial(bubble, { albedoColor: Color4.create(0.2, 0.8, 1.0, 0.28), transparencyMode: 2, roughness: 0.1, emissiveColor: Color3.create(0.2, 0.8, 1.0), emissiveIntensity: 0.6 })
    AvatarAttach.create(bubble, { anchorPointId: AvatarAnchorPointType.AAPT_POSITION })
  } else if (!on && bubble) {
    engine.removeEntity(bubble)
    bubble = null
  }
}

function showBoostStar(on: boolean): void {
  if (on && !boostStar) {
    boostStar = engine.addEntity()
    GltfContainer.create(boostStar, { src: 'assets/Models/star.glb', visibleMeshesCollisionMask: 0, invisibleMeshesCollisionMask: 0 })
    Transform.create(boostStar, { position: Vector3.create(0, 0.6, 0), scale: Vector3.create(0.35, 0.35, 0.35) })
    AvatarAttach.create(boostStar, { anchorPointId: AvatarAnchorPointType.AAPT_NAME_TAG })
  } else if (!on && boostStar) {
    engine.removeEntity(boostStar)
    boostStar = null
  }
}



function buildRig(): { star: Entity; ring: Entity } {
  const star = buildStar(Vector3.create(0, ARENA_Y + 1.4, 0), 0.6)
  const ring = engine.addEntity()
  Transform.create(ring, { position: Vector3.create(0, ARENA_Y + 0.08, 0), scale: Vector3.create(2.4, 0.06, 2.4) })
  MeshRenderer.setCylinder(ring)
  return { star, ring }
}

function paint(rig: { star: Entity; ring: Entity }, c: { r: number; g: number; b: number }): void {
  Material.setPbrMaterial(rig.ring, { albedoColor: Color4.create(c.r, c.g, c.b, 1), emissiveColor: Color3.create(c.r, c.g, c.b), emissiveIntensity: 1.5, roughness: 0.6 })
}

function show(i: number, on: boolean): void {
  VisibilityComponent.createOrReplace(rigs[i].star, { visible: on })
  VisibilityComponent.createOrReplace(rigs[i].ring, { visible: on })
}

export function initPowerups(): void {
  rigs = [buildRig(), buildRig()]
  for (let i = 0; i < rigs.length; i++) show(i, false)
}

/** A round with a stage: place this slot's two pickups. Rounds without one get none. */
export function startPowerups(seed: number, stageCentre: { x: number; z: number }, radius: number | undefined): void {
  taken.reset()
  endBoost()
  active = radius !== undefined
  if (!active) {
    for (let i = 0; i < rigs.length; i++) show(i, false)
    return
  }
  centre = stageCentre
  list = powerupsFor(seed, radius as number)
  for (let i = 0; i < rigs.length; i++) {
    const p = list[i]
    Transform.getMutable(rigs[i].star).position = Vector3.create(centre.x + p.x, ARENA_Y + 1.4 - 1.09 * 0.6, centre.z + p.z)
    Transform.getMutable(rigs[i].ring).position = Vector3.create(centre.x + p.x, ARENA_Y + 0.08, centre.z + p.z)
    paint(rigs[i], p.kind === 'shield' ? SHIELD_COLOR : BOOST_COLOR)
    show(i, false)
  }
}

export function stopPowerups(): void {
  active = false
  endBoost()
  showBubble(false)
  for (let i = 0; i < rigs.length; i++) show(i, false)
}

function endBoost(): void {
  if (boostUntil === 0) return
  boostUntil = 0
  hud.boost = 0
  showBoostStar(false)
  // Back to the client's defaults (jog 8, run 10, jump 1). Setting only what we changed.
  AvatarLocomotionSettings.createOrReplace(engine.PlayerEntity, { jogSpeed: 8, runSpeed: 10, jumpHeight: 1, runJumpHeight: 1.5 })
}

/** Called every frame of play with seconds since the whistle. */
export function tickPowerups(playElapsed: number): void {
  showBubble(hud.shield)
  if (boostUntil !== 0) {
    hud.boost = Math.max(0, Math.ceil((boostUntil - Date.now()) / 1000))
    if (Date.now() >= boostUntil) endBoost()
  }
  if (!active) return
  for (let i = 0; i < rigs.length; i++) {
    show(i, playElapsed >= list[i].at && !taken.has(i))
  }
  if (isOut()) return
  const t = Transform.getOrNull(engine.PlayerEntity)
  if (!t || Math.abs(t.position.y - ARENA_Y) > 3) return
  for (let i = 0; i < list.length; i++) {
    if (!taken.tryTake(list, i, playElapsed, t.position.x - centre.x, t.position.z - centre.z)) continue
    show(i, false)
    if (list[i].kind === 'shield') {
      addShield()
      play('survive')
      toast('SHIELD - your next fall is free')
    } else {
      boostUntil = Date.now() + BOOST_SECONDS * 1000
      hud.boost = BOOST_SECONDS
      showBoostStar(true)
      AvatarLocomotionSettings.createOrReplace(engine.PlayerEntity, { jogSpeed: 11, runSpeed: 14, jumpHeight: 1.5, runJumpHeight: 2 })
      play('boing')
      toast('BOOST - ' + BOOST_SECONDS + ' seconds of speed')
    }
  }
}
