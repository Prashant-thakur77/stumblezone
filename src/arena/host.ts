// The host: an avatar by the spawn point with a speech bubble that says what to do next.
//
// Every board in the village is a list; the host is a person, and people read people. The bubble
// rotates through the schedule, the daily, the errand you are on and the hat you could unlock,
// and it waves every twenty seconds so the eye finds it.

import { engine, Entity, Transform, AvatarShape, TextShape, Font, Billboard, BillboardMode } from '@dcl/sdk/ecs'
import { Vector3, Quaternion, Color4, Color3 } from '@dcl/sdk/math'
import { LOBBY, ARENA_CENTER_X, ROUND_NAMES } from '../config'
import { tipAt } from '../lib/tips'
import { dailyFor, dayIndex } from '../lib/daily'
import { unlockedHats, HATS } from '../lib/hats'
import { upcoming } from '../systems/scheduler'
import { hatStats } from '../systems/hats'
import { errandNext } from '../systems/errands'
import { crownsFor } from '../net/crowns'
import { myAddress } from '../net/sync'

let bubble: Entity
let host: Entity
let tick = 0
let since = 0
let waves = 0
let sinceWave = 0

export function buildHost(): void {
  host = engine.addEntity()
  Transform.create(host, {
    position: Vector3.create(ARENA_CENTER_X - 4, LOBBY.y, LOBBY.z + 3.5),
    rotation: Quaternion.fromEulerDegrees(0, 200, 0)
  })
  AvatarShape.create(host, {
    id: 'stumble-sam',
    name: 'Sam the Host',
    bodyShape: 'urn:decentraland:off-chain:base-avatars:BaseFemale',
    wearables: [
      'urn:decentraland:off-chain:base-avatars:eyebrows_00',
      'urn:decentraland:off-chain:base-avatars:mouth_00',
      'urn:decentraland:off-chain:base-avatars:eyes_00',
      'urn:decentraland:off-chain:base-avatars:pink_blue_socks',
      'urn:decentraland:off-chain:base-avatars:f_sweater',
      'urn:decentraland:off-chain:base-avatars:f_jeans',
      'urn:decentraland:off-chain:base-avatars:sneakers',
      'urn:decentraland:off-chain:base-avatars:pony_tail'
    ],
    emotes: [],
    hairColor: Color3.create(0.95, 0.35, 0.6),
    skinColor: Color3.create(0.85, 0.65, 0.5),
    expressionTriggerId: 'wave',
    expressionTriggerTimestamp: 0
  })

  bubble = engine.addEntity()
  Transform.create(bubble, { position: Vector3.create(ARENA_CENTER_X - 4, LOBBY.y + 2.5, LOBBY.z + 3.5) })
  Billboard.create(bubble, { billboardMode: BillboardMode.BM_Y })
  TextShape.create(bubble, {
    text: 'Welcome to Stumblezone!',
    fontSize: 1.1,
    font: Font.F_SANS_SERIF,
    textColor: Color4.create(1, 0.95, 0.6, 1),
    outlineWidth: 0.15,
    outlineColor: Color3.Black(),
    width: 6
  })

  engine.addSystem((dt: number) => {
    since += dt
    sinceWave += dt
    if (sinceWave >= 20) {
      sinceWave = 0
      waves += 1
      const a = AvatarShape.getMutable(host)
      a.expressionTriggerId = 'wave'
      a.expressionTriggerTimestamp = waves
    }
    if (since < 7) return
    since = 0
    tick += 1
    const next = upcoming(1)[0]
    const have = new Set(unlockedHats(hatStats()).map((h) => h.id))
    const nextHat = HATS.find((h) => !have.has(h.id))
    const errand = errandNext()
    TextShape.getMutable(bubble).text = tipAt(
      {
        nextRound: next ? next.name : ROUND_NAMES[0],
        inSeconds: next ? Math.max(0, next.inSeconds) : 0,
        daily: dailyFor(dayIndex(Date.now())).text,
        errand: errand ? errand.text : null,
        nextHat: nextHat ? nextHat.name + ' (' + nextHat.unlock.toLowerCase() + ')' : null,
        crowns: crownsFor(myAddress())
      },
      tick
    )
  })
}
