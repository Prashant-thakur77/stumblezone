import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DropWatch, DROP_COOLDOWN_MS } from '../src/lib/drop'
import { DROP_PAD, DROP_MIN_HEIGHT, LOBBY } from '../src/config'

const HIGH = LOBBY.y + DROP_MIN_HEIGHT + 1

test('no credit without height', () => {
  const w = new DropWatch()
  w.sample(LOBBY.y + 1, 0)
  assert.equal(w.landed(DROP_PAD.x, DROP_PAD.z, 100), null)
})

test('perfect inside the inner ring, good inside the outer, nothing beyond', () => {
  const w = new DropWatch()
  w.sample(HIGH, 0)
  assert.equal(w.landed(DROP_PAD.x + 0.5, DROP_PAD.z, 500), 'perfect')
  const w2 = new DropWatch()
  w2.sample(HIGH, 0)
  assert.equal(w2.landed(DROP_PAD.x + 2, DROP_PAD.z, 500), 'good')
  const w3 = new DropWatch()
  w3.sample(HIGH, 0)
  assert.equal(w3.landed(DROP_PAD.x + 4, DROP_PAD.z, 500), null)
})

test('the height must be recent, and a landing pays once per cooldown', () => {
  const w = new DropWatch()
  w.sample(HIGH, 0)
  w.sample(LOBBY.y, 4000)
  assert.equal(w.landed(DROP_PAD.x, DROP_PAD.z, 4100), null, 'the height was more than three seconds ago')
  const w2 = new DropWatch()
  w2.sample(HIGH, 0)
  assert.equal(w2.landed(DROP_PAD.x, DROP_PAD.z, 500), 'perfect')
  w2.sample(HIGH, 600)
  assert.equal(w2.landed(DROP_PAD.x, DROP_PAD.z, 1000), null, 'inside the cooldown')
  w2.sample(HIGH, 500 + DROP_COOLDOWN_MS)
  assert.equal(w2.landed(DROP_PAD.x, DROP_PAD.z, 600 + DROP_COOLDOWN_MS), 'perfect')
})
