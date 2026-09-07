// The village errands: six things to do per visit, each paying a crown, all six paying five more.
//
// This is the loop that ties the places together. The tower, the lap, the stars, the deck, the
// hats and the drop each call `errandDone` once when their thing happens; everything else - the
// pay-once rule, the bonus, the board line - lives in the pure Errands class.

import { Errands, ERRANDS, ERRAND_CROWNS, ERRANDS_BONUS, ErrandId } from '../lib/errands'
import { award } from '../net/crowns'
import { myAddress } from '../net/sync'
import { toast } from './feed'
import { play } from './audio'

const errands = new Errands()

export function errandDone(id: ErrandId): void {
  if (!errands.done(id)) return
  award(myAddress(), ERRAND_CROWNS)
  if (errands.complete()) {
    award(myAddress(), ERRANDS_BONUS)
    play('crown')
    toast('ALL ERRANDS DONE  +' + (ERRAND_CROWNS + ERRANDS_BONUS) + '  ·  VILLAGER')
  } else {
    play('survive')
    toast('ERRAND DONE  +' + ERRAND_CROWNS + '  ·  ' + errands.count() + '/' + ERRANDS.length)
  }
}

export function errandsComplete(): boolean {
  return errands.complete()
}

/** "ERRANDS 3/6 - next: run a lap" for the lobby board and the host. */
export function errandLine(): string {
  if (errands.complete()) return 'ERRANDS: all done - VILLAGER'
  const next = errands.next()
  return 'ERRANDS ' + errands.count() + '/' + ERRANDS.length + ' - next: ' + (next ? next.text : '')
}
