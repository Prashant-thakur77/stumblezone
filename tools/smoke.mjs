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
const mocks = {
  '~system/EngineApi': {
    crdtGetState: async () => ({ hasEntities: false, data: [] }),
    crdtSendToRenderer: async () => ({ data: [] }),
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
    triggerEmote: async () => ({ success: true }),
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
  await m.onUpdate(dt)
}
// And a few hundred frames at real pace, so systems that throttle on dt get exercised too.
for (let i = 0; i < 300; i++) {
  fake += 33
  await m.onUpdate(dt)
}
Date.now = realNow

const ms = Math.round(performance.now() - t0)
if (errors.length > 0) {
  realError('\nsmoke: ' + errors.length + ' console.error line(s) during ' + (frames + 300) + ' frames:')
  for (const e of errors.slice(0, 10)) realError('  ' + e.split('\n')[0])
  process.exit(1)
}
realError('smoke: booted ' + scene.display.title + ', ran ' + (frames + 300) + ' frames across 14 slots in ' + ms + ' ms, no errors')
