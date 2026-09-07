// Stumble Village: the town around the stadium.
//
// The scenes that hold a crowd in Decentraland are the ones with a place around the game - a mine
// to walk, an island, a garage. This is that place: the lobby in the middle, the Hat Market to
// the west, the Disco Deck to the east, houses along the back, and five stars a day hidden across
// all of it. Everything is CC0 from the OpenDCL catalog, measured with tools/measure-glb.mjs.
//
// Two things here are interactive and both are trigger areas: stepping onto the market opens the
// hat panel, stepping onto the disco opens the reactions row. Walking through a star collects it.

import {
  engine,
  Entity,
  Transform,
  MeshRenderer,
  MeshCollider,
  Material,
  VisibilityComponent,
  TriggerArea,
  triggerAreaEventsSystem,
  Tween,
  EasingFunction,
  TextShape,
  Font,
  Billboard,
  BillboardMode,
  AudioSource
} from '@dcl/sdk/ecs'
import { Vector3, Quaternion, Color4, Color3 } from '@dcl/sdk/math'
import {
  LOBBY,
  VILLAGE_FLOOR,
  HAT_MARKET,
  HAT_PEDESTALS,
  DISCO_DECK,
  DISCO_TILES,
  DISCO_TILE_SIZE,
  STAR_SPOTS,
  STARS_PER_DAY,
  PLATFORM_COLOR,
  PARTY_COLORS
} from '../config'
import { HATS } from '../lib/hats'
import { dailyStars, StarHunt, STAR_CROWNS, STAR_HUNT_BONUS } from '../lib/stars'
import { dayIndex } from '../lib/daily'
import { decorModel, buildStar, buildTree } from './models'
import { hud } from '../ui/state'
import { award } from '../net/crowns'
import { myAddress } from '../net/sync'
import { toast } from '../systems/feed'
import { play } from '../systems/audio'
import { errandDone } from '../systems/errands'

const Y = LOBBY.y
const hunt = new StarHunt()
let starEntities: Entity[] = []
let shownDay = NaN
const discoTiles: Entity[] = []
let discoPhase = 0
let discoClock = 0

function sign(text: string, position: Vector3, size: number): void {
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
}

type TriggerResult = Parameters<Parameters<typeof triggerAreaEventsSystem.onTriggerEnter>[1]>[0]

function isPlayer(result: TriggerResult): boolean {
  return result.trigger?.entity === engine.PlayerEntity
}

/** An invisible box that flips a HUD flag while the player stands in it. */
function zone(position: Vector3, scale: Vector3, enter: () => void, exit: () => void): void {
  const e = engine.addEntity()
  Transform.create(e, { position, scale })
  TriggerArea.setBox(e)
  triggerAreaEventsSystem.onTriggerEnter(e, (r) => {
    if (isPlayer(r)) enter()
  })
  triggerAreaEventsSystem.onTriggerExit(e, (r) => {
    if (isPlayer(r)) exit()
  })
}

function buildFloor(): void {
  const e = engine.addEntity()
  Transform.create(e, {
    position: Vector3.create(VILLAGE_FLOOR.x, Y - 0.5, VILLAGE_FLOOR.z),
    scale: Vector3.create(VILLAGE_FLOOR.width, 1, VILLAGE_FLOOR.depth)
  })
  MeshRenderer.setBox(e)
  MeshCollider.setBox(e)
  Material.setPbrMaterial(e, {
    albedoColor: Color4.create(PLATFORM_COLOR.r, PLATFORM_COLOR.g, PLATFORM_COLOR.b, 1),
    roughness: 0.45,
    specularIntensity: 1
  })
}

/** Houses, lamps, bushes and a fountain along the back. Pivot offsets are from measure-glb. */
function buildBackdrop(): void {
  // The yellow house: pivot on a corner, extends +x and -z; rotated 90 it spans x-9..x, z-6..z.
  decorModel('assets/Models/house-6-m-yellow.glb', Vector3.create(12.2, Y, 6.1), Vector3.create(1, 1, 1), 90)
  // Cabins: pivots sit east of the model (x -7.3..-2 and -5.8..-2.6).
  decorModel('assets/Models/track5building3.glb', Vector3.create(50, Y, 3.8), Vector3.create(1, 1, 1), 0)
  decorModel('assets/Models/track5building2.glb', Vector3.create(62, Y, 2.5), Vector3.create(1, 1, 1), 0)
  // The shop front behind the pedestals, turned so its 9m side faces the market.
  decorModel('assets/Models/shop-black.glb', Vector3.create(HAT_MARKET.x, Y, 15), Vector3.create(1, 1, 1), 90)

  decorModel('assets/Models/fountain-03.glb', Vector3.create(22, Y, 15), Vector3.create(1, 1, 1))

  for (const [x, z] of [
    [2, 16],
    [21, 1],
    [43, 1],
    [62, 16],
    [46, 16]
  ] as [number, number][]) {
    decorModel('assets/Models/lampost-small.glb', Vector3.create(x, Y, z), Vector3.create(1, 1, 1))
  }
  for (const [x, z] of [
    [4, 1],
    [30, 1],
    [36, 1],
    [55, 15],
    [17, 1]
  ] as [number, number][]) {
    decorModel('assets/Models/bush-02.glb', Vector3.create(x, Y, z), Vector3.create(1.3, 1.3, 1.3))
  }
  buildTree(Vector3.create(3, Y - 0.5, 3), 1.1)
  buildTree(Vector3.create(60, Y - 0.5, 12), 1.1)
}

/** Six pedestals, a floating hat on each, and the zone that opens the panel. */
function buildHatMarket(): void {
  sign('HAT MARKET\nEarn them in the show. Step up to wear one.', Vector3.create(HAT_MARKET.x, Y + 4.2, HAT_MARKET.z + 3), 1.6)

  for (let i = 0; i < HATS.length; i++) {
    const hat = HATS[i]
    const spot = HAT_PEDESTALS[i]
    const pedestal = engine.addEntity()
    Transform.create(pedestal, { position: Vector3.create(spot.x, Y + 0.5, spot.z), scale: Vector3.create(1.1, 1, 1.1) })
    MeshRenderer.setCylinder(pedestal)
    MeshCollider.setCylinder(pedestal)
    const c = PARTY_COLORS[i % PARTY_COLORS.length]
    Material.setPbrMaterial(pedestal, { albedoColor: Color4.create(c.r, c.g, c.b, 1), roughness: 0.35, specularIntensity: 1 })

    // The hat, oversized so it reads from across the village, turning slowly on its pedestal.
    const s = hat.scale * 1.6
    const e = decorModel(hat.model, Vector3.create(spot.x, Y + 1.9 + hat.y * 1.6, spot.z), Vector3.create(s, s, s))
    Tween.create(e, {
      mode: Tween.Mode.RotateContinuous({ direction: Quaternion.fromEulerDegrees(0, 1, 0), speed: 30 }),
      duration: 0,
      easingFunction: EasingFunction.EF_LINEAR
    })
    sign(hat.name + '\n' + hat.unlock, Vector3.create(spot.x, Y + 3.1, spot.z), 0.9)
  }

  zone(
    Vector3.create(HAT_MARKET.x, Y + 1.5, HAT_MARKET.z),
    Vector3.create(16, 3, 5),
    () => (hud.shop = true),
    () => (hud.shop = false)
  )
}

/** A 4x4 floor of party tiles that cycle, a mirror ball above, and the zone for the dance row. */
function buildDiscoDeck(): void {
  const half = (DISCO_TILES * DISCO_TILE_SIZE) / 2
  for (let r = 0; r < DISCO_TILES; r++) {
    for (let c = 0; c < DISCO_TILES; c++) {
      const e = engine.addEntity()
      Transform.create(e, {
        position: Vector3.create(
          DISCO_DECK.x - half + DISCO_TILE_SIZE / 2 + c * DISCO_TILE_SIZE,
          Y + 0.06,
          DISCO_DECK.z - half + DISCO_TILE_SIZE / 2 + r * DISCO_TILE_SIZE
        ),
        scale: Vector3.create(DISCO_TILE_SIZE - 0.15, 0.12, DISCO_TILE_SIZE - 0.15)
      })
      MeshRenderer.setBox(e)
      discoTiles.push(e)
    }
  }
  paintDisco()

  // The deck's own music, spatial: it fades in as you walk over and is gone by the podium. The
  // only sound in the scene that belongs to a place rather than to the show.
  const speaker = engine.addEntity()
  Transform.create(speaker, { position: Vector3.create(DISCO_DECK.x, Y + 2, DISCO_DECK.z) })
  AudioSource.create(speaker, { audioClipUrl: 'assets/Audio/music-disco.mp3', loop: true, playing: true, volume: 0.6 })

  const ball = decorModel('assets/Models/disco-ball.glb', Vector3.create(DISCO_DECK.x, Y + 6, DISCO_DECK.z), Vector3.create(1.4, 1.4, 1.4))
  Tween.create(ball, {
    mode: Tween.Mode.RotateContinuous({ direction: Quaternion.fromEulerDegrees(0, 1, 0), speed: 20 }),
    duration: 0,
    easingFunction: EasingFunction.EF_LINEAR
  })
  sign('DISCO DECK\nStep on and dance - the pose buttons are Copycat practice', Vector3.create(DISCO_DECK.x, Y + 4.2, DISCO_DECK.z + half + 1), 1.6)

  zone(
    Vector3.create(DISCO_DECK.x, Y + 1.5, DISCO_DECK.z),
    Vector3.create(DISCO_TILES * DISCO_TILE_SIZE, 3, DISCO_TILES * DISCO_TILE_SIZE),
    () => (hud.dance = true),
    () => (hud.dance = false)
  )
}

function paintDisco(): void {
  for (let i = 0; i < discoTiles.length; i++) {
    const c = PARTY_COLORS[(i + discoPhase) % PARTY_COLORS.length]
    Material.setPbrMaterial(discoTiles[i], {
      albedoColor: Color4.create(c.r, c.g, c.b, 1),
      emissiveColor: Color3.create(c.r, c.g, c.b),
      emissiveIntensity: 0.8,
      roughness: 0.3
    })
  }
}

/** The stars: one entity per candidate spot, shown only on the days it is lit and not yet found. */
function buildStarHunt(): void {
  for (let i = 0; i < STAR_SPOTS.length; i++) {
    const s = STAR_SPOTS[i]
    const e = buildStar(Vector3.create(s.x, Y + 1.6, s.z), 0.7)
    // A generous sphere: walking near a star should be enough on a touchscreen.
    const t = engine.addEntity()
    Transform.create(t, { position: Vector3.create(s.x, Y + 1, s.z), scale: Vector3.create(2.6, 2.6, 2.6) })
    TriggerArea.setSphere(t)
    triggerAreaEventsSystem.onTriggerEnter(t, (r) => {
      if (!isPlayer(r)) return
      const day = dayIndex(Date.now())
      if (!hunt.collect(i, day)) return
      VisibilityComponent.createOrReplace(e, { visible: false })
      award(myAddress(), STAR_CROWNS)
      play('crown')
      if (hunt.count(day) >= 3) errandDone('stars3')
      if (hunt.complete(day)) {
        award(myAddress(), STAR_HUNT_BONUS)
        toast('STAR HUNT COMPLETE  +' + (STAR_CROWNS + STAR_HUNT_BONUS))
      } else {
        toast('STAR ' + hunt.count(day) + '/' + STARS_PER_DAY + '  +' + STAR_CROWNS)
      }
    })
    starEntities.push(e)
  }
  refreshStars()
}

/** Show today's stars (minus the ones already found). Cheap, so it runs on every day change. */
function refreshStars(): void {
  const day = dayIndex(Date.now())
  shownDay = day
  const lit = new Set(dailyStars(day))
  for (let i = 0; i < starEntities.length; i++) {
    VisibilityComponent.createOrReplace(starEntities[i], { visible: lit.has(i) && !hunt.has(i, day) })
  }
}

/** "STARS 2/5" for the lobby board. */
export function starLine(): string {
  const day = dayIndex(Date.now())
  return hunt.complete(day) ? 'STAR HUNT: DONE' : 'STAR HUNT: ' + hunt.count(day) + '/' + STARS_PER_DAY + ' found'
}

export function buildVillage(): void {
  buildFloor()
  buildBackdrop()
  buildHatMarket()
  buildDiscoDeck()
  buildStarHunt()

  engine.addSystem((dt: number) => {
    // The disco cycles three times a second - fast enough to read as lights, slow enough that
    // sixteen material writes cost nothing.
    discoClock += dt
    if (discoClock >= 0.35) {
      discoClock = 0
      discoPhase = (discoPhase + 1) % PARTY_COLORS.length
      paintDisco()
    }
    if (dayIndex(Date.now()) !== shownDay) refreshStars()
  })
}
