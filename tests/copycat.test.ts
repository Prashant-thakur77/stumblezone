import { test } from 'node:test'
import assert from 'node:assert/strict'
import { copycatWaves, copycatFits, locate, Performance, poseFromUrn, POSES, SHOW_PER_POSE } from '../src/lib/copycat'

test('four waves, growing, never the same pose twice running, inside the round', () => {
  for (let seed = 1; seed < 60; seed++) {
    const w = copycatWaves(seed)
    assert.deepEqual(w.map((x) => x.poses.length), [2, 3, 4, 5])
    for (const wave of w) {
      for (let i = 1; i < wave.poses.length; i++) assert.notEqual(wave.poses[i], wave.poses[i - 1])
      for (const p of wave.poses) assert.ok((POSES as readonly string[]).includes(p))
      assert.ok(wave.showAt < wave.performAt && wave.performAt < wave.endAt)
    }
    assert.deepEqual(w, copycatWaves(seed))
  }
  assert.ok(copycatFits(), 'the last wave must end before the round does')
  assert.notDeepEqual(copycatWaves(1)[3].poses, copycatWaves(2)[3].poses)
})

test('locate walks wait -> show (one pose at a time) -> perform -> done', () => {
  const w = copycatWaves(3)
  assert.equal(locate(w, 0).phase, 'wait')
  const s = locate(w, w[0].showAt + SHOW_PER_POSE * 0.5)
  assert.equal(s.phase, 'show')
  assert.equal(s.shown, 1)
  assert.equal(locate(w, w[0].showAt + SHOW_PER_POSE * 1.5).shown, 2)
  assert.equal(locate(w, w[0].performAt + 0.1).phase, 'perform')
  assert.equal(locate(w, w[3].endAt + 0.1).phase, 'done')
})

test('a performance is judged pose by pose', () => {
  const p = new Performance()
  const seq = ['dance', 'clap', 'wave'] as const
  assert.equal(p.perform('dance', [...seq]), 'ok')
  assert.equal(p.perform('wave', [...seq]), 'wrong')
  assert.equal(p.perform('clap', [...seq]), 'ignored')
  assert.ok(!p.passed([...seq]))
  p.reset()
  assert.equal(p.perform('dance', [...seq]), 'ok')
  assert.equal(p.perform('clap', [...seq]), 'ok')
  assert.equal(p.perform('wave', [...seq]), 'complete')
  assert.ok(p.passed([...seq]))
  assert.equal(p.perform('dab', [...seq]), 'ignored', 'nothing after completion counts against you')
})

test('emote URNs map back to poses', () => {
  assert.equal(poseFromUrn('dance'), 'dance')
  assert.equal(poseFromUrn('urn:decentraland:off-chain:base-emotes:clap'), 'clap')
  assert.equal(poseFromUrn('urn:decentraland:matic:collections-v2:0xabc:1'), null)
})
