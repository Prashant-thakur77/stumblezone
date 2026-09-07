// Headless boot smoke test: load the built scene, fake the renderer, run it for a few simulated
// hours of show time, and fail on the first exception or console.error.
//
// The unit tests cover the pure halves. This is the other half: does every builder, system and
// round survive being called for real, across every slot of the schedule, with nothing but the
// stock engine underneath. It cannot see pixels, but a crash on boot or a throw in the seventh
// round is exactly the failure a judge would hit and a type checker would never mention.
//
// Run: npm run build && node tools/smoke.mjs
import { createRequire } from 'node:module'
import Module from 'node:module'
import { readFileSync } from 'node:fs'
import { performance } from 'node:perf_hooks'

const require = createRequire(import.meta.url)
const scene = JSON.parse(readFileSync('scene.json', 'utf8'))

// --- ~system mocks: the renderer's side of every host API the bundle calls. --------------------
const ok = async () => ({})

// --- Load accounting: every PUT the scene sends the renderer, by entity and component. -----------
// This is the mobile budget measured rather than estimated: distinct entities, and how many carry
// a MeshRenderer (a draw call each), a GltfContainer, or a TextShape.
const COMPONENT_NAMES = { 1: 'Transform', 1017: 'MeshRenderer', 1041: 'GltfContainer', 1030: 'TextShape', 1019: 'MeshCollider', 1028: 'AudioSource', 1080: 'AvatarShape' }
const entities = new Set()
const perComponent = {}
const entityHas = {}
function tally(bytes) {
  if (!bytes || bytes.length === 0) return
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let o = 0
  while (o + 8 <= bytes.byteLength) {
    const len = v.getUint32(o, true)
    const type = v.getUint32(o + 4, true)
    if (len < 8) break
    if (type === 1 && o + 24 <= bytes.byteLength) {
      const entity = v.getUint32(o + 8, true)
      const component = v.getUint32(o + 12, true)
      if (entity > 512) {
        entities.add(entity)
        const key = entity + ':' + component
        if (!entityHas[key]) {
          entityHas[key] = true
          perComponent[component] = (perComponent[component] ?? 0) + 1
        }
      }
    }
    o += len
  }
}
/** Emotes the scene asked for, by name. `knockOut` only fires on a real elimination. */
const emotes = {}
const mocks = {
  '~system/EngineApi': {
    crdtGetState: async () => ({ hasEntities: false, data: [] }),
    crdtSendToRenderer: async ({ data }) => {
      tally(data)
      return { data: [] }
    },
    sendBatch: async () => ({ events: [] }),
    subscribe: ok,
    isServer: async () => ({ isServer: false })
  },
  '~system/Runtime': {
    getRealm: async () => ({ realmInfo: { baseUrl: 'http://localhost', realmName: 'smoke', networkId: 1, commsAdapter: '', isPreview: true } }),
    getExplorerInformation: async () => ({ agent: 'smoke', platform: 'desktop', configurations: {} }),
    readFile: async ({ fileName }) => ({ content: new Uint8Array(readFileSync(fileName)), hash: 'x' })
  },
  '~system/UserIdentity': {
    getUserData: async () => ({ data: { userId: '0xf2f886f852a3b481317805c135922b59e8777f97', displayName: 'Smoke', hasConnectedWeb3: true, version: 1, avatar: { wearables: [], emotes: [] } } })
  },
  '~system/CommunicationsController': { send: ok, sendBinary: async () => ({ data: [] }) },
  '~system/CommsApi': { consumeMessages: async () => ({ messages: [] }), getActiveVideoStreams: async () => ({ streams: [] }), publishData: ok, subscribeToTopic: ok },
  '~system/RestrictedActions': {
    movePlayerTo: async () => ({ success: true }),
    triggerEmote: async ({ predefinedEmote }) => {
      emotes[predefinedEmote] = (emotes[predefinedEmote] ?? 0) + 1
      return { success: true }
    },
    triggerSceneEmote: ok,
    teleportTo: ok,
    changeRealm: ok,
    openExternalUrl: ok,
    copyToClipboard: ok
  },
  '~system/SignedFetch': { signedFetch: async () => ({ ok: false, status: 0, body: '' }) }
}
const realLoad = Module._load
Module._load = function (request, ...rest) {
  if (request in mocks) return mocks[request]
  if (request.startsWith('~system/')) throw new Error('unmocked host module ' + request)
  return realLoad.call(this, request, ...rest)
}

// --- Fail loudly on anything the scene logs as an error. ----------------------------------------
const errors = []
const realError = console.error
console.error = (...args) => {
  errors.push(args.map(String).join(' '))
  realError(...args)
}
console.log = () => {}

// --- Load and boot. ----------------------------------------------------------------------------
const m = require('../bin/index.js')
await m.onStart()
// main() is NOT called here: the SDK's own startup system calls the exported main() on the first
// update, exactly as the explorer does. Calling it by hand builds the scene twice.

// --- A player. The renderer owns the player's Transform, so the harness plays renderer: a
// hand-encoded CRDT PUT_COMPONENT for entity 1 (the player), component 1 (Transform), each frame.
// This is what makes the fall watcher, the practice tiles, the spotlight pools, the drop pad, the
// power-ups and every trigger-free position check actually run.
let lamport = 0
function playerAt(x, y, z) {
  const buf = new ArrayBuffer(8 + 16 + 44)
  const v = new DataView(buf)
  let o = 0
  v.setUint32(o, 8 + 16 + 44, true); o += 4 // message length
  v.setUint32(o, 1, true); o += 4 // PUT_COMPONENT
  v.setUint32(o, 1, true); o += 4 // entity: the player
  v.setUint32(o, 1, true); o += 4 // component: Transform
  v.setUint32(o, ++lamport, true); o += 4 // timestamp
  v.setUint32(o, 44, true); o += 4 // data length
  for (const f of [x, y, z, 0, 0, 0, 1, 1, 1, 1]) { v.setFloat32(o, f, true); o += 4 }
  v.setUint32(o, 0, true) // parent
  m.rendererTransport.onmessage(new Uint8Array(buf))
}

/** Where the player is at frame i: a tour of the whole scene, arena during play, village between. */
function tour(i) {
  const phase = (fake / 1000) % 120
  const a = i * 0.05
  if (phase >= 25 && phase < 105) {
    // In the arena during play: a slow circle, radius 6, plus a dip below the floor now and then.
    const dip = i % 97 === 0 ? -30 : 0
    return [32 + Math.cos(a) * 6, 24.5 + dip, 36 + Math.sin(a) * 6]
  }
  // Between rounds: the village, the lanes, the tower, the sky box, the ledge, in rotation.
  const spots = [
    [11, 20.2, 9], [53, 20.2, 10], [32, 20.2, 15.5], [2.5, 20.2, 27], [2.5, 20.2, 39], [2.5, 20.2, 52],
    [61.5, 20.2, 21], [60, 20.2, 61], [4, 20.2, 60], [59, 20.2, 59], [34, 45.6, 15], [32, 36.2, 8], [3, 33.2, 12]
  ]
  const s = spots[Math.floor(i / 20) % spots.length]
  return [s[0] + Math.cos(a) * 0.8, s[1], s[2] + Math.sin(a) * 0.8]
}

// --- Run the clock through fourteen slots (three and a half shows) at 30 fps, fast. ------------
// Rounds, phases, the daily and the Golden Show all key off Date.now(); two seconds a frame walks
// through every branch of the scheduler in a few hundred frames.
const start = Date.now()
let fake = start
const realNow = Date.now
Date.now = () => fake
const dt = 1 / 30
const SLOT = 120
const frames = Math.ceil((14 * SLOT) / 2)
const t0 = performance.now()
for (let i = 0; i < frames; i++) {
  fake += 2000
  playerAt(...tour(i))
  await m.onUpdate(dt)
}
// And a few hundred frames at real pace, so systems that throttle on dt get exercised too.
for (let i = 0; i < 300; i++) {
  fake += 33
  playerAt(...tour(frames + i))
  await m.onUpdate(dt)
}
Date.now = realNow

const ms = Math.round(performance.now() - t0)
if (errors.length > 0) {
  realError('\nsmoke: ' + errors.length + ' console.error line(s) during ' + (frames + 300) + ' frames:')
  for (const e of errors.slice(0, 10)) realError('  ' + e.split('\n')[0])
  process.exit(1)
}
// The injected player dips below the kill plane during play; if that never produced an
// elimination, the position feed is not reaching the scene and half of this run was hollow.
if (!emotes.knockOut) {
  realError('smoke: the player never got knocked out - the injected Transform is not being applied')
  process.exit(1)
}
realError('smoke: emotes ' + JSON.stringify(emotes))
const load = Object.entries(perComponent)
  .filter(([id]) => COMPONENT_NAMES[id])
  .map(([id, n]) => COMPONENT_NAMES[id] + ' ' + n)
  .join(', ')
realError('smoke: load - ' + entities.size + ' entities; ' + load)
// The mobile client's soft entity limit for a 16-parcel scene is about 4,800; a third of that is
// the comfortable line for a scene that also has to animate.
if (entities.size > 1600) {
  realError('smoke: ' + entities.size + ' entities is over the comfortable mobile line (1600)')
  process.exit(1)
}
realError('smoke: booted ' + scene.display.title + ', ran ' + (frames + 300) + ' frames across 14 slots in ' + ms + ' ms, no errors')
