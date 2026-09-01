import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fieldLine, rivalry } from '../src/lib/field'

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
