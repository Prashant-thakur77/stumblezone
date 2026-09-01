import { test } from 'node:test'
import assert from 'node:assert/strict'
import { titleFor } from '../src/lib/titles'

test('titles rank champion over survivor over ironfoot over pioneer', () => {
  assert.equal(titleFor({ crowns: 0, streak: 0, finaleWins: 0 }), 'PIONEER')
  assert.equal(titleFor({ crowns: 10, streak: 0, finaleWins: 0 }), 'IRONFOOT')
  assert.equal(titleFor({ crowns: 10, streak: 3, finaleWins: 0 }), 'SURVIVOR')
  assert.equal(titleFor({ crowns: 0, streak: 3, finaleWins: 1 }), 'CHAMPION')
  assert.equal(titleFor({ crowns: 99, streak: 9, finaleWins: 2 }), 'CHAMPION')
})
