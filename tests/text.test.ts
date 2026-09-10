import { test } from 'node:test'
import assert from 'node:assert/strict'
import { packLines } from '../src/lib/text'

test('segments are packed greedily into lines that fit', () => {
  const lines = packLines('aaaa  ·  bbbb  ·  cccc  ·  dddd', 13, 3)
  assert.deepEqual(lines, ['aaaa  ·  bbbb', 'cccc  ·  dddd'])
})

test('a segment longer than a line gets a line of its own', () => {
  assert.deepEqual(packLines('short  ·  this one is far too long', 10, 3), ['short', 'this one is far too long'])
})

test('overflow beyond maxLines is dropped, never squeezed', () => {
  const lines = packLines('a  ·  b  ·  c  ·  d  ·  e', 1, 2)
  assert.deepEqual(lines, ['a', 'b'])
})

test('empty text gives no lines', () => {
  assert.deepEqual(packLines('', 40, 3), [])
})
