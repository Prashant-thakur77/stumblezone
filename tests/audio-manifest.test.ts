import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

// Every name the audio module can play must have a file behind it. A missing file is silent in the
// client - no error, no sound - which is the worst kind of failure to find on a phone at 3am.
const src = readFileSync('src/systems/audio.ts', 'utf8')

function union(name: string): string[] {
  const m = src.match(new RegExp(`export type ${name} =([^=]*?)\\n\\n`))
  assert.ok(m, `no union named ${name} in audio.ts`)
  return [...m[1].matchAll(/'([a-z_-]+)'/g)].map((x) => x[1])
}

test('every clip has a wav', () => {
  const clips = union('Clip')
  assert.ok(clips.length >= 6)
  for (const c of clips) assert.ok(existsSync(`assets/Audio/${c}.wav`), `missing assets/Audio/${c}.wav`)
})

test('every music track has an mp3', () => {
  const tracks = union('Track')
  assert.ok(tracks.length >= 3)
  for (const t of tracks) assert.ok(existsSync(`assets/Audio/${t}.mp3`), `missing assets/Audio/${t}.mp3`)
})

test('every announcer line has an ogg', () => {
  const voices = union('Voice')
  assert.ok(voices.length >= 10)
  for (const v of voices) assert.ok(existsSync(`assets/Audio/vo/${v}.ogg`), `missing assets/Audio/vo/${v}.ogg`)
})
