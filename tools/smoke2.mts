// Two clients, one bus: load the built scene twice, wire the message bus between them, run the
// same clock through eight slots, and check they agree on what happened.
//
// The single-client smoke test catches throws. This catches the other thing that only shows up
// with two phones in the room: two clients settling different winners, one client counting a
// player the other never saw, a tally that diverges. Player A is steered into the Crown Rush zone
// and player B is kept out of it, so the expected winner is known.
//
// Run: npm run build && npx tsx tools/smoke2.mts
import { createRequire } from 'node:module'
import Module from 'node:module'
import { readFileSync, copyFileSync } from 'node:fs'
import { zoneAt } from '../src/lib/crownrush'
import { slotIndex, slotElapsed, roundIndex, seedForSlot } from '../src/lib/schedule'
import { ROUND_NAMES, ARENA_CENTER_X, ARENA_CENTER_Z, ARENA_Y, INTRO_SECONDS, SLOT_SECONDS } from '../src/config'

const require = createRequire(import.meta.url)

type Client = {
  name: string
  address: string
  inbox: string[]
  sent: { message: string; payload: any }[]
  emotes: Record<string, number>
  m: any
  lamport: number
}

const clients: Client[] = []
let current: Client | null = null
const errors: string[] = []

function mocksFor(c: Client) {
  const ok = async () => ({})
  return {
    '~system/EngineApi': {
      crdtGetState: async () => ({ hasEntities: false, data: [] }),
      crdtSendToRenderer: async () => ({ data: [] }),
      sendBatch: async () => {
        // Deliver whatever the other client sent since the last frame, as comms events.
        const events = c.inbox.splice(0).map((message) => ({ generic: { eventId: 'comms', eventData: JSON.stringify({ sender: 'peer', message }) } }))
        return { events }
      },
      subscribe: ok,
      isServer: async () => ({ isServer: false })
    },
    '~system/Runtime': {
      getRealm: async () => ({ realmInfo: { baseUrl: 'http://localhost', realmName: 'smoke2', networkId: 1, commsAdapter: '', isPreview: true } }),
      getExplorerInformation: async () => ({ agent: 'smoke', platform: 'desktop', configurations: {} }),
      readFile: async ({ fileName }: { fileName: string }) => ({ content: new Uint8Array(readFileSync(fileName)), hash: 'x' })
    },
    '~system/UserIdentity': {
      getUserData: async () => ({ data: { userId: c.address, displayName: c.name, hasConnectedWeb3: true, version: 1, avatar: { wearables: [], emotes: [] } } })
    },
    '~system/CommunicationsController': {
      send: async ({ message }: { message: string }) => {
        try {
          const m = JSON.parse(message)
          c.sent.push({ message: m.message, payload: m.payload })
        } catch {}
        for (const other of clients) if (other !== c) other.inbox.push(message)
        return {}
      },
      sendBinary: async () => ({ data: [] })
    },
    '~system/CommsApi': { consumeMessages: async () => ({ messages: [] }), getActiveVideoStreams: async () => ({ streams: [] }), publishData: ok, subscribeToTopic: ok },
    '~system/RestrictedActions': {
      movePlayerTo: async () => ({ success: true }),
      triggerEmote: async ({ predefinedEmote }: { predefinedEmote: string }) => {
        c.emotes[predefinedEmote] = (c.emotes[predefinedEmote] ?? 0) + 1
        return { success: true }
      },
      triggerSceneEmote: ok, teleportTo: ok, changeRealm: ok, openExternalUrl: ok, copyToClipboard: ok
    },
    '~system/SignedFetch': { signedFetch: async () => ({ ok: false, status: 0, body: '' }) }
  } as Record<string, unknown>
}

const realLoad = (Module as any)._load
;(Module as any)._load = function (request: string, ...rest: unknown[]) {
  if (request.startsWith('~system/')) {
    if (!current) throw new Error('no current client for ' + request)
    const mocks = mocksFor(current)
    if (!(request in mocks)) throw new Error('unmocked host module ' + request)
    return mocks[request]
  }
  return realLoad.call(this, request, ...rest)
}
const realError = console.error
console.error = (...args: unknown[]) => {
  errors.push((current ? current.name + ': ' : '') + args.map(String).join(' '))
}
console.log = () => {}

// Two copies of the bundle, so require() gives two module instances.
copyFileSync('bin/index.js', 'bin/index-b.js')
for (const [name, address, path] of [
  ['A', '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', '../bin/index.js'],
  ['B', '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', '../bin/index-b.js']
] as const) {
  const c: Client = { name, address, inbox: [], sent: [], emotes: {}, m: null, lamport: 0 }
  clients.push(c)
  current = c
  c.m = require(path)
  await c.m.onStart()
}

function playerAt(c: Client, x: number, y: number, z: number) {
  const buf = new ArrayBuffer(68)
  const v = new DataView(buf)
  let o = 0
  for (const u of [68, 1, 1, 1, ++c.lamport, 44]) { v.setUint32(o, u, true); o += 4 }
  for (const f of [x, y, z, 0, 0, 0, 1, 1, 1, 1]) { v.setFloat32(o, f, true); o += 4 }
  v.setUint32(o, 0, true)
  c.m.rendererTransport.onmessage(new Uint8Array(buf))
}

// --- The clock and the tour --------------------------------------------------------------------
// Start one slot before the next Crown Rush, so the scored-round path is always exercised.
let startSlot = slotIndex(Date.now())
while (ROUND_NAMES[roundIndex(startSlot + 1)] !== 'Crown Rush') startSlot++
let fake = startSlot * SLOT_SECONDS * 1000
const realNow = Date.now
Date.now = () => fake
const dt = 1 / 30

/** A stands in the Crown Rush zone; B stands on the stage but out of it. Elsewhere both stand centre. */
function positions(): [number, number, number][] {
  const slot = slotIndex(fake)
  const elapsed = slotElapsed(fake)
  const round = ROUND_NAMES[roundIndex(slot)]
  const inPlay = elapsed >= INTRO_SECONDS && elapsed < INTRO_SECONDS + 85
  if (!inPlay) return [[32, 20.2, 8], [34, 20.2, 8]]
  if (round === 'Crown Rush') {
    const z = zoneAt(seedForSlot(slot), elapsed - INTRO_SECONDS)
    const a: [number, number, number] = [ARENA_CENTER_X + z.x, ARENA_Y + 0.5, ARENA_CENTER_Z + z.z]
    // B: opposite side of the stage, 6m from centre - never inside a zone (zones sit 2..9.4m out with radius <= 3.2, so only if directly opposite... keep B at the far mirror point, clamped to stay >= 3.6m from the zone).
    let bx = ARENA_CENTER_X - z.x * 0.5
    let bz = ARENA_CENTER_Z - z.z * 0.5
    if (Math.hypot(bx - a[0], bz - a[2]) < z.radius + 0.5) { bx = ARENA_CENTER_X - z.x; bz = ARENA_CENTER_Z - z.z }
    return [a, [bx, ARENA_Y + 0.5, bz]]
  }
  return [[ARENA_CENTER_X + 1, ARENA_Y + 0.5, ARENA_CENTER_Z], [ARENA_CENTER_X - 1, ARENA_Y + 0.5, ARENA_CENTER_Z + 1]]
}

const slots = 12
const frames = Math.ceil((slots * SLOT_SECONDS) / 2)
const rushSlots = new Set<number>()
for (let i = 0; i < frames; i++) {
  fake += 2000
  const slot = slotIndex(fake)
  if (ROUND_NAMES[roundIndex(slot)] === 'Crown Rush') rushSlots.add(slot)
  const pos = positions()
  for (let k = 0; k < clients.length; k++) {
    current = clients[k]
    playerAt(clients[k], ...pos[k])
    await clients[k].m.onUpdate(dt)
  }
}
// Let the last flushes land, then ask both clients for their standings the way a newcomer would,
// so the comparison is between two answers given after every merge - not two mid-flight flushes.
for (let i = 0; i < 90; i++) {
  fake += 33
  for (const c of clients) {
    current = c
    await c.m.onUpdate(dt)
  }
}
for (const c of clients) c.inbox.push(JSON.stringify({ message: 'hello', payload: { slot: slotIndex(fake), address: 'newcomer' } }))
for (let i = 0; i < 3; i++) {
  fake += 33
  for (const c of clients) {
    current = c
    await c.m.onUpdate(dt)
  }
}
Date.now = realNow

// The scene identifies itself from the renderer's PlayerIdentityData, which this harness does not
// provide, so each client is a guest with an id of its own choosing. Read it back from its messages.
for (const c of clients) {
  const any = c.sent.find((m) => m.payload && m.payload.address)
  if (any) c.address = any.payload.address
}

// --- Checks --------------------------------------------------------------------------------------
function fail(msg: string): never {
  realError('smoke2: FAIL - ' + msg)
  for (const c of clients) {
    const counts: Record<string, number> = {}
    for (const m of c.sent) counts[m.message] = (counts[m.message] ?? 0) + 1
    realError('  ' + c.name + ' sent ' + JSON.stringify(counts) + ' emotes ' + JSON.stringify(c.emotes))
    const st = [...c.sent].reverse().find((m) => m.message === 'standings')
    realError('  ' + c.name + ' last standings ' + JSON.stringify(st?.payload))
  }
  process.exit(1)
}
if (errors.length) fail(errors.length + ' console.error line(s): ' + errors[0].split('\n')[0])

// 1. Presence: each client heard the other's "here" at least once per slot it played.
for (const c of clients) {
  const heres = c.sent.filter((s) => s.message === 'here').length
  if (heres < slots) fail(c.name + ' sent only ' + heres + ' presence messages over ' + slots + ' slots')
}

// 2. Standings agree: the last standings each client broadcast list the same crowns for both.
const last = (c: Client) => [...c.sent].reverse().find((s) => s.message === 'standings')?.payload?.crowns as [string, number][] | undefined
const sa = last(clients[0])
const sb = last(clients[1])
if (!sa || !sb) fail('a client never broadcast standings')
const tally = (s: [string, number][]) => Object.fromEntries(s)
const ta = tally(sa!)
const tb = tally(sb!)
for (const c of clients) {
  if ((ta[c.address] ?? 0) !== (tb[c.address] ?? 0)) fail('clients disagree on ' + c.name + "'s crowns: A sees " + ta[c.address] + ', B sees ' + tb[c.address])
}
// Both tallies must know both players: a client that only knows itself has a private show.
for (const c of clients) {
  if (!(c.address in ta) || !(c.address in tb)) fail('a client never learned ' + c.name + "'s crowns")
}
// The show tally is shared too, and agrees.
const lastShow = (c: Client) => [...c.sent].reverse().find((s) => s.message === 'standings')?.payload?.showCrowns as [string, number][] | undefined
const showA = tally(lastShow(clients[0]) ?? [])
const showB = tally(lastShow(clients[1]) ?? [])
for (const c of clients) {
  if ((showA[c.address] ?? -1) !== (showB[c.address] ?? -1)) fail('clients disagree on ' + c.name + "'s show crowns: " + showA[c.address] + ' vs ' + showB[c.address])
}

// 3. Crown Rush: if it ran, A (in the zone) reported more points than B, on both clients' scores.
if (rushSlots.size > 0) {
  const scoresBy = (c: Client) => c.sent.filter((s) => s.message === 'score').map((s) => s.payload.points as number)
  const aMax = Math.max(0, ...scoresBy(clients[0]))
  const bMax = Math.max(0, ...scoresBy(clients[1]))
  if (!(aMax > bMax)) fail('Crown Rush ran ' + rushSlots.size + 'x but A (' + aMax.toFixed(1) + ') did not out-score B (' + bMax.toFixed(1) + ')')
  if ((ta[clients[0].address] ?? 0) <= (tb[clients[1].address] ?? 0)) fail('A won Crown Rush but does not lead the tally: A ' + ta[clients[0].address] + ' vs B ' + tb[clients[1].address])
}

realError('smoke2: two clients, ' + slots + ' slots, ' + (rushSlots.size ? rushSlots.size + ' Crown Rush' : 'no Crown Rush') + '; tally A ' + (ta[clients[0].address] ?? 0) + ' / B ' + (tb[clients[1].address] ?? 0) + ' agreed on both; emotes A ' + JSON.stringify(clients[0].emotes) + ' B ' + JSON.stringify(clients[1].emotes))
