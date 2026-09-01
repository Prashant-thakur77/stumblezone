import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync } from 'node:fs'

// The mobile client does not render `borderRadius`, so every rounded plate in the HUD is a tinted
// PNG. A missing texture is an invisible plate with floating text on it - no error, no warning.
const files = readdirSync('src/ui').filter((f) => f.endsWith('.tsx') || f.endsWith('.ts'))
const src = files.map((f) => readFileSync('src/ui/' + f, 'utf8')).join('\n')

test('every UI texture referenced exists', () => {
  const refs = [...src.matchAll(/images\/ui\/([a-z-]+\.png)/g)].map((m) => m[1])
  assert.ok(refs.length >= 3, 'expected pill, card and dot textures to be referenced')
  for (const r of new Set(refs)) assert.ok(existsSync('images/ui/' + r), 'missing images/ui/' + r)
})

test('the HUD never relies on borderRadius (it does not render on mobile)', () => {
  // Property use only - the comments explaining why it is banned are allowed to name it.
  assert.ok(!/borderRadius\s*[:=]/.test(src), 'borderRadius used in src/ui')
})

test('the textures are real PNGs', () => {
  for (const f of ['pill', 'card', 'dot']) {
    const b = readFileSync('images/ui/' + f + '.png')
    assert.equal(b.toString('latin1', 1, 4), 'PNG')
  }
})
