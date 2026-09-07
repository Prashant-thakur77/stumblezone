import { test } from 'node:test'
import assert from 'node:assert/strict'
import { skySteps, skyGaps, skyBox, skyBoxHeight } from '../src/lib/sky'
import { LEDGE, DROP_PAD, DROP_MIN_HEIGHT } from '../src/config'

test('every sky step is a phone-sized jump', () => {
  for (const g of skyGaps()) {
    assert.ok(g.gap <= 2.4 && g.gap >= 1.2, 'gap ' + g.gap.toFixed(2))
    assert.ok(g.rise <= 1.1 && g.rise >= 0, 'rise ' + g.rise.toFixed(2))
  }
})

test('the course stays over the village, clear of the ledge and under the height cap', () => {
  // Step 0 is the tower's own lookout; the course proper starts at step 1.
  for (const s of skySteps().slice(1)) {
    assert.ok(s.x >= 0 && s.x <= 64 && s.z >= 9 && s.z <= 18, 'step off the village strip')
    assert.ok(s.y < 81)
    // The ledge slab is x 22..42, y 35..37, z 5..11; the course must never come within 2m of it.
    const nearLedge = s.x > 20 && s.x < 44 && Math.abs(s.y - LEDGE.y) < 3 && s.z < 13
    assert.ok(!nearLedge, 'step next to the ledge at ' + s.x + ',' + s.y + ',' + s.z)
  }
})

test('the Sky Box is over the drop pad and high enough for the drop to count', () => {
  const b = skyBox()
  assert.ok(b.x - b.size / 2 <= DROP_PAD.x && b.x + b.size / 2 >= DROP_PAD.x, 'the box does not overhang the pad in x')
  assert.ok(b.x + b.size / 2 <= 64)
  assert.ok(skyBoxHeight() >= DROP_MIN_HEIGHT + 2, 'the box is only ' + skyBoxHeight().toFixed(1) + 'm up')
  assert.ok(b.y < 60)
})
