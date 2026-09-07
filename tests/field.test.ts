import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fieldLine, rivalry, nearestRival } from '../src/lib/field'

test('fieldLine names the first few and counts the rest', () => {
  assert.equal(fieldLine(['you']), 'IN: you')
  assert.equal(fieldLine(['you', 'Alice', 'Bob', 'Cy', 'Di']), 'IN: you, Alice, Bob +2')
  assert.equal(fieldLine([]), '')
})

test('rivalry picks the closest rival you outlasted, or who outlasted you', () => {
  const me = { name: 'you', outMs: 40000 }
  assert.equal(rivalry(me, [{ name: 'Alice', outMs: 36000 }, { name: 'Bob', outMs: 10000 }]), 'You outlasted Alice by 4s')
  assert.equal(rivalry(me, [{ name: 'Alice', outMs: 42500 }]), 'Alice outlasted you by 3s')
  assert.equal(rivalry({ name: 'you', outMs: null }, [{ name: 'Alice', outMs: 42500 }]), 'You outlasted Alice')
  assert.equal(rivalry(me, []), '')
  // Two survivors have no story to tell each other.
  assert.equal(rivalry({ name: 'you', outMs: null }, [{ name: 'Alice', outMs: null }]), '')
})

test('the GG target is the same person the results line names', () => {
  const me = { name: 'you', outMs: 30000 }
  const others = [
    { name: 'Alice', outMs: 20000, address: 'a' },
    { name: 'Bob', outMs: 35000, address: 'b' }
  ]
  // Bob is nearer on the clock (5s) but Alice is the one you beat - the line names Alice, so must the GG.
  assert.equal(rivalry(me, others), 'You outlasted Alice by 10s')
  assert.equal(nearestRival(me, others)?.rival.address, 'a')
  assert.equal(nearestRival({ name: 'you', outMs: null }, [{ name: 'Cy', outMs: null, address: 'c' }]), null)
})
