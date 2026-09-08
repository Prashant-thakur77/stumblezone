// The Stumble Tower: twelve platforms spiralling up the west corner of the village, a lookout at
// the top, and a stopwatch. Step on the base pad to start it, reach the lookout to stop it.
//
// Falling off lands you on the village floor, six metres below at worst - no kill plane, no lives,
// nothing at stake but the time. That is the point: it is the thing to do while the board says
// "NEXT UP in 1:12", and a best time on the board is a reason to try again.

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
import { TOWER, LOBBY, PARTY_COLORS } from '../config'
import { towerSteps, formatTime } from '../lib/tower'
import { recordTower, towerBest } from '../systems/records'
import { toast } from '../systems/feed'
import { play } from '../systems/audio'
import { buildStar } from './models'
import { errandDone } from '../systems/errands'

type TriggerResult = Parameters<Parameters<typeof triggerAreaEventsSystem.onTriggerEnter>[1]>[0]

let startedAt = 0
let topSign: Entity

function isPlayer(r: TriggerResult): boolean {
  return r.trigger?.entity === engine.PlayerEntity
}

function platform(position: Vector3, size: number, color: { r: number; g: number; b: number }): Entity {
  const e = engine.addEntity()
  Transform.create(e, { position, scale: Vector3.create(size, 0.3, size) })
  MeshRenderer.setBox(e)
  MeshCollider.setBox(e)
  Material.setPbrMaterial(e, {
    albedoColor: Color4.create(color.r, color.g, color.b, 1),
    roughness: 0.35,
    specularIntensity: 1
  })
  return e
}

function pad(position: Vector3, size: number, onEnter: () => void): void {
  const e = engine.addEntity()
  Transform.create(e, { position, scale: Vector3.create(size, 2, size) })
  TriggerArea.setBox(e)
  triggerAreaEventsSystem.onTriggerEnter(e, (r) => {
    if (isPlayer(r)) onEnter()
  })
}

function refreshSign(): void {
  const best = towerBest()
  TextShape.getMutable(topSign).text = 'STUMBLE TOWER\n' + (best > 0 ? 'best ' + formatTime(best) : 'Step on the gold pad to start the clock')
}

/** The running climb, as a stopwatch, or '' when the clock is not running. */
export function towerClock(): string {
  if (startedAt === 0) return ''
  // Abandoned: two minutes, or wandering off. Walking across the base pad is not a climb.
  const t = Transform.getOrNull(engine.PlayerEntity)
  const far = t ? Math.hypot(t.position.x - TOWER.x, t.position.z - TOWER.z) > 9 : false
  if (Date.now() - startedAt > 120000 || far) {
    startedAt = 0
    return ''
  }
  return formatTime(Date.now() - startedAt)
}

/** "TOWER BEST 0:41.7" for the lobby board, or an invitation if nobody has climbed it. */
export function towerLine(): string {
  const best = towerBest()
  return best > 0 ? 'TOWER BEST: ' + formatTime(best) : 'TOWER: not yet climbed'
}

export function buildTower(): void {
  const steps = towerSteps()

  // The central column, so the spiral reads as a tower and not as floating boxes.
  const column = engine.addEntity()
  const height = steps[steps.length - 1].y - LOBBY.y + 1
  Transform.create(column, {
    position: Vector3.create(TOWER.x, LOBBY.y + height / 2, TOWER.z),
    scale: Vector3.create(1.2, height, 1.2)
  })
  MeshRenderer.setCylinder(column)
  MeshCollider.setCylinder(column)
  Material.setPbrMaterial(column, {
    albedoColor: Color4.create(0.95, 0.95, 1, 1),
    roughness: 0.4,
    specularIntensity: 1
  })

  for (let i = 0; i < steps.length; i++) {
    const s = steps[i]
    const last = i === steps.length - 1
    platform(Vector3.create(s.x, s.y, s.z), last ? 3 : 1.7, PARTY_COLORS[i % PARTY_COLORS.length])
  }

  // The base pad: a marked square on the floor where the clock starts.
  const base = steps[0]
  const start = platform(Vector3.create(base.x, LOBBY.y + 0.06, base.z + 2.2), 2, { r: 1, g: 0.83, b: 0.25 })
  Material.setPbrMaterial(start, {
    albedoColor: Color4.create(1, 0.83, 0.25, 1),
    emissiveColor: Color3.create(1, 0.83, 0.25),
    emissiveIntensity: 0.8,
    roughness: 0.4
  })
  pad(Vector3.create(base.x, LOBBY.y + 1, base.z + 2.2), 2, () => {
    startedAt = Date.now()
    play('whistle')
    toast('TOWER: clock started')
  })

  const top = steps[steps.length - 1]
  buildStar(Vector3.create(top.x, top.y + 1.8, top.z), 0.9)
  pad(Vector3.create(top.x, top.y + 1, top.z), 3, () => {
    if (startedAt === 0) return
    const ms = Date.now() - startedAt
    startedAt = 0
    const best = recordTower(ms)
    play(best ? 'crown' : 'qualified')
    toast('TOWER ' + formatTime(ms) + (best ? '  ·  NEW BEST' : ''))
    refreshSign()
    errandDone('climb')
  })

  topSign = engine.addEntity()
  Transform.create(topSign, { position: Vector3.create(TOWER.x, LOBBY.y + 4.5, TOWER.z + 3.5) })
  Billboard.create(topSign, { billboardMode: BillboardMode.BM_Y })
  TextShape.create(topSign, {
    text: '',
    fontSize: 1.6,
    font: Font.F_SANS_SERIF,
    textColor: Color4.White(),
    outlineWidth: 0.15,
    outlineColor: Color3.Black()
  })
  refreshSign()
}
