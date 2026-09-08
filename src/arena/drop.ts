// The Big Drop's target on the village floor, and the watcher that scores a landing.

import { engine, Transform, MeshRenderer, Material } from '@dcl/sdk/ecs'
import { Vector3, Color4, Color3 } from '@dcl/sdk/math'
import { DROP_PAD, LOBBY } from '../config'
import { DropWatch, PERFECT_RADIUS, GOOD_RADIUS } from '../lib/drop'
import { zone, sign } from './build'
import { award } from '../net/crowns'
import { myAddress } from '../net/sync'
import { toast } from '../systems/feed'
import { play } from '../systems/audio'
import { setConfetti } from './scenery'
import { isRoundLive, isOut } from '../systems/spectator'
import { errandDone } from '../systems/errands'

const watch = new DropWatch()
let confettiUntil = 0

function ring(radius: number, color: { r: number; g: number; b: number }, y: number): void {
  const e = engine.addEntity()
  Transform.create(e, { position: Vector3.create(DROP_PAD.x, y, DROP_PAD.z), scale: Vector3.create(radius * 2, 0.04, radius * 2) })
  MeshRenderer.setCylinder(e)
  Material.setPbrMaterial(e, { albedoColor: Color4.create(color.r, color.g, color.b, 1), emissiveColor: Color3.create(color.r, color.g, color.b), emissiveIntensity: 0.6, roughness: 0.5 })
}

export function buildDrop(): void {
  ring(GOOD_RADIUS, { r: 1, g: 0.83, b: 0.25 }, LOBBY.y + 0.03)
  ring(1.8, { r: 1, g: 0.24, b: 0.62 }, LOBBY.y + 0.06)
  ring(PERFECT_RADIUS, { r: 0.2, g: 0.8, b: 1 }, LOBBY.y + 0.09)
  sign('BIG DROP\nJump from the Sky Box above. Land in the blue ring.', Vector3.create(DROP_PAD.x, LOBBY.y + 2.6, DROP_PAD.z + 2), 1.1)

  zone(Vector3.create(DROP_PAD.x, LOBBY.y + 1, DROP_PAD.z), Vector3.create(GOOD_RADIUS * 2, 2, GOOD_RADIUS * 2), () => {
    if (isRoundLive() && !isOut()) return
    const t = Transform.getOrNull(engine.PlayerEntity)
    if (!t) return
    const result = watch.landed(t.position.x, t.position.z, Date.now())
    if (result === null) return
    errandDone('drop')
    if (result === 'perfect') {
      award(myAddress(), 2)
      play('crown')
      toast('PERFECT LANDING  +2')
      setConfetti(true)
      confettiUntil = Date.now() + 2500
    } else {
      award(myAddress(), 1)
      play('qualified')
      toast('NICE DROP  +1')
    }
  })

  engine.addSystem(() => {
    const t = Transform.getOrNull(engine.PlayerEntity)
    if (t) watch.sample(t.position.y, Date.now())
    if (confettiUntil !== 0 && Date.now() > confettiUntil) {
      confettiUntil = 0
      if (!isRoundLive()) setConfetti(false)
    }
  })
}
