// The only file in the scene that talks to the message bus.
//
// The SDK flags MessageBus as deprecated, and it is the right tool anyway only for the ephemeral,
// fire-and-forget events below. Keeping every use behind this wrapper means a future migration to
// synced components touches one file instead of every round.
//
// Two rules this module exists to enforce:
//   1. Every payload carries its slot, and stale slots are dropped. A message arriving 200ms after
//      a slot boundary must never sink a tile in the round that just started.
//   2. The bus echoes your own messages back to you. Handlers receive `isSelf` so they can ignore
//      an effect they already applied locally.

import { MessageBus } from '@dcl/sdk/message-bus'
import { getPlayer } from '@dcl/sdk/players'

const bus = new MessageBus()

export type Eliminated = { slot: number; address: string }
export type Finished = { slot: number; address: string; ms: number }
export type TileStep = { slot: number; address: string; tileId: number }
export type Cheer = { slot: number; address: string; emote: string }
export type Standings = { slot: number; address: string; crowns: [string, number][] }

/** Stable identity for this client. Falls back to a per-session id for guests. */
let cachedAddress = ''
export function myAddress(): string {
  if (cachedAddress) return cachedAddress
  const p = getPlayer()
  if (p && p.userId) {
    cachedAddress = p.userId
  } else {
    // Guests still play and still earn session crowns; they just get an ephemeral id.
    cachedAddress = 'guest-' + Math.floor(Math.random() * 0xffffff).toString(16)
  }
  return cachedAddress
}

/** Current slot, injected by the scheduler so this module stays free of scheduling logic. */
let currentSlot = () => 0
export function bindSlotSource(fn: () => number): void {
  currentSlot = fn
}

function on<T extends { slot: number; address: string }>(
  channel: string,
  cb: (payload: T, isSelf: boolean) => void
): void {
  bus.on(channel, (payload: T) => {
    if (!payload || payload.slot !== currentSlot()) return
    cb(payload, payload.address === myAddress())
  })
}

export function emitEliminated(): void {
  bus.emit('eliminated', { slot: currentSlot(), address: myAddress() } as Eliminated)
}
export function onEliminated(cb: (p: Eliminated, isSelf: boolean) => void): void {
  on<Eliminated>('eliminated', cb)
}

export function emitFinished(ms: number): void {
  bus.emit('finished', { slot: currentSlot(), address: myAddress(), ms } as Finished)
}
export function onFinished(cb: (p: Finished, isSelf: boolean) => void): void {
  on<Finished>('finished', cb)
}

export function emitTile(tileId: number): void {
  bus.emit('tile', { slot: currentSlot(), address: myAddress(), tileId } as TileStep)
}
export function onTile(cb: (p: TileStep, isSelf: boolean) => void): void {
  on<TileStep>('tile', cb)
}

export function emitCheer(emote: string): void {
  bus.emit('cheer', { slot: currentSlot(), address: myAddress(), emote } as Cheer)
}
export function onCheer(cb: (p: Cheer, isSelf: boolean) => void): void {
  on<Cheer>('cheer', cb)
}

// --- Late-joiner catch-up ---------------------------------------------------
// MessageBus has no history, so a player arriving mid-session would see an empty crown board.
// On join we ask, and whoever already has a tally answers. These two are deliberately exempt from
// the slot guard: catch-up is not tied to a round.

export function requestStandings(): void {
  bus.emit('hello', { slot: currentSlot(), address: myAddress() })
}
export function onStandingsRequested(cb: (fromAddress: string) => void): void {
  bus.on('hello', (p: { address: string }) => {
    if (!p || p.address === myAddress()) return
    cb(p.address)
  })
}

export function emitStandings(crowns: [string, number][]): void {
  bus.emit('standings', { slot: currentSlot(), address: myAddress(), crowns } as Standings)
}
export function onStandings(cb: (p: Standings) => void): void {
  bus.on('standings', (p: Standings) => {
    if (!p || p.address === myAddress()) return
    cb(p)
  })
}
