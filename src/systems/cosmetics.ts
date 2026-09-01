// Things worn on other people's avatars: the show leader's crown, and a star over anyone on a
// qualifying streak.
//
// AvatarAttach is a local attachment - each client creates its own copy and parents it to an
// avatar it can see. Nothing is synced, and nothing needs to be: every client computes the same
// leader from the same crown tally and the same streaks from the same elimination messages, so
// everybody sees the crown on the same head.
//
// Guests have session ids rather than wallet addresses and cannot be attached to, so they are
// skipped rather than special-cased elsewhere.

import { engine, Entity, AvatarAttach, AvatarAnchorPointType, GltfContainer, Transform } from '@dcl/sdk/ecs'
import { Vector3 } from '@dcl/sdk/math'

let crownEntity: Entity | null = null
let crownOn = ''
const halos = new Map<string, Entity>()

function isAvatar(address: string): boolean {
  return address.startsWith('0x')
}

/** Idempotent: call it every time the standings change, it only touches what moved. */
export function refreshCosmetics(leaderAddress: string, hot: string[]): void {
  if (crownOn !== leaderAddress) {
    if (crownEntity) {
      engine.removeEntity(crownEntity)
      crownEntity = null
    }
    crownOn = leaderAddress
    if (isAvatar(leaderAddress)) {
      crownEntity = engine.addEntity()
      GltfContainer.create(crownEntity, { src: 'assets/Models/crown.glb' })
      Transform.create(crownEntity, { position: Vector3.create(0, 0.25, 0), scale: Vector3.create(0.4, 0.4, 0.4) })
      AvatarAttach.create(crownEntity, { avatarId: leaderAddress, anchorPointId: AvatarAnchorPointType.AAPT_HEAD })
    }
  }

  const want = new Set(hot.filter(isAvatar))
  for (const [address, entity] of halos) {
    if (!want.has(address)) {
      engine.removeEntity(entity)
      halos.delete(address)
    }
  }
  for (const address of want) {
    if (halos.has(address)) continue
    const e = engine.addEntity()
    GltfContainer.create(e, { src: 'assets/Models/star.glb' })
    Transform.create(e, { position: Vector3.create(0, 0.5, 0), scale: Vector3.create(0.3, 0.3, 0.3) })
    AvatarAttach.create(e, { avatarId: address, anchorPointId: AvatarAnchorPointType.AAPT_NAME_TAG })
    halos.set(address, e)
  }
}
