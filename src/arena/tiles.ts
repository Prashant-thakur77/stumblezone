// The pooled tile grid every round is built on.
//
// Entities are created once at scene start and never destroyed. Rounds reset them instead.
// Respawning 360 tiles every two minutes would thrash the engine and creep toward the
// 6,000-entity mobile hard limit over a long session; a pool keeps the count flat forever.

import {
  engine,
  Entity,
  Transform,
  MeshRenderer,
  MeshCollider,
  Material,
  VisibilityComponent,
  Tween,
  TweenSequence,
  EasingFunction
} from '@dcl/sdk/ecs'
import { Vector3, Color4, Color3 } from '@dcl/sdk/math'
import { TILE_NEUTRAL } from '../config'

/** How far a doomed tile falls, and how long it takes. */
const SINK_DISTANCE = 8
const SINK_MS = 1200

export type Rgb = { r: number; g: number; b: number }

export type TileGridOptions = {
  cols: number
  rows: number
  /** World position of the grid's centre. */
  center: Vector3
  tileSize: number
  /** Gap between tiles, in metres. Keeps the grid readable from above. */
  gap?: number
  /** Offset alternate rows by half a tile, for the Hex-Drop honeycomb look. */
  stagger?: boolean
  thickness?: number
}

export type TileGrid = {
  entities: Entity[]
  /** Resting position of each tile, used to undo a sink. */
  homes: Vector3[]
  cols: number
  rows: number
  setColor(index: number, color: Rgb, glow?: number): void
  setAllColors(color: Rgb): void
  /** Two-tone the grid so individual tiles stay distinguishable when they are all blank. */
  setCheckerboard(light: Rgb, dark: Rgb): void
  /** Drop the collider now, then tween the tile out of sight. Idempotent. */
  sink(index: number): void
  isSunk(index: number): boolean
  /** Restore every tile to solid, visible and at its home position. */
  resetAll(): void
  setVisible(visible: boolean): void
  /** Grid index directly under a world position, or -1 if none. */
  indexAt(position: Vector3): number
}

export function createTileGrid(opts: TileGridOptions): TileGrid {
  const { cols, rows, center, tileSize } = opts
  const gap = opts.gap ?? 0.15
  const thickness = opts.thickness ?? 0.5
  const stagger = opts.stagger ?? false
  const pitch = tileSize + gap

  const entities: Entity[] = []
  const homes: Vector3[] = []
  const sunk: boolean[] = []

  const originX = center.x - ((cols - 1) * pitch) / 2
  const originZ = center.z - ((rows - 1) * pitch) / 2

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const stagOffset = stagger && row % 2 === 1 ? pitch / 2 : 0
      const home = Vector3.create(originX + col * pitch + stagOffset, center.y, originZ + row * pitch)

      const e = engine.addEntity()
      Transform.create(e, { position: home, scale: Vector3.create(tileSize, thickness, tileSize) })
      MeshRenderer.setBox(e)
      MeshCollider.setBox(e)
      Material.setPbrMaterial(e, {
        albedoColor: Color4.create(TILE_NEUTRAL.r, TILE_NEUTRAL.g, TILE_NEUTRAL.b, 1),
        roughness: 0.8,
        metallic: 0
      })

      entities.push(e)
      homes.push(home)
      sunk.push(false)
    }
  }

  function setColor(index: number, color: Rgb, glow = 0): void {
    if (index < 0 || index >= entities.length) return
    Material.setPbrMaterial(entities[index], {
      albedoColor: Color4.create(color.r, color.g, color.b, 1),
      roughness: 0.8,
      metallic: 0,
      ...(glow > 0
        ? { emissiveColor: Color3.create(color.r, color.g, color.b), emissiveIntensity: glow }
        : {})
    })
  }

  return {
    entities,
    homes,
    cols,
    rows,
    setColor,

    setAllColors(color: Rgb) {
      for (let i = 0; i < entities.length; i++) setColor(i, color)
    },

    setCheckerboard(light: Rgb, dark: Rgb) {
      for (let i = 0; i < entities.length; i++) {
        const row = Math.floor(i / cols)
        const col = i % cols
        setColor(i, (row + col) % 2 === 0 ? light : dark)
      }
    },

    sink(index: number) {
      if (index < 0 || index >= entities.length || sunk[index]) return
      sunk[index] = true
      const e = entities[index]
      // Removing the collider is what actually drops the player. The tween is only the visual,
      // so nothing may wait on it before the tile stops being solid.
      MeshCollider.deleteFrom(e)
      const from = homes[index]
      Tween.createOrReplace(e, {
        mode: Tween.Mode.Move({
          start: from,
          end: Vector3.create(from.x, from.y - SINK_DISTANCE, from.z)
        }),
        duration: SINK_MS,
        easingFunction: EasingFunction.EF_EASEINQUAD
      })
    },

    isSunk(index: number) {
      return sunk[index] === true
    },

    resetAll() {
      for (let i = 0; i < entities.length; i++) {
        const e = entities[i]
        // Clear any in-flight tween first, or it fights the position we are about to set.
        if (Tween.has(e)) Tween.deleteFrom(e)
        if (TweenSequence.has(e)) TweenSequence.deleteFrom(e)
        const t = Transform.getMutable(e)
        t.position = homes[i]
        if (!MeshCollider.has(e)) MeshCollider.setBox(e)
        sunk[i] = false
      }
    },

    setVisible(visible: boolean) {
      for (const e of entities) {
        VisibilityComponent.createOrReplace(e, { visible })
        if (visible) {
          if (!MeshCollider.has(e)) MeshCollider.setBox(e)
        } else {
          MeshCollider.deleteFrom(e)
        }
      }
    },

    indexAt(position: Vector3) {
      const half = tileSize / 2
      for (let i = 0; i < homes.length; i++) {
        const h = homes[i]
        if (Math.abs(position.x - h.x) <= half && Math.abs(position.z - h.z) <= half) return i
      }
      return -1
    }
  }
}
