// Who owns the middle of the screen, and who owns the band above the joystick.
//
// The HUD grew to eighteen elements, each with its own hand-written visibility rule, and a
// box-overlap check found six pairs that could be on screen at once - a giant countdown numeral
// over the round name, the hat panel under the pose buttons, spectator buttons under both. The
// fix is not more conditions: it is that two regions have exactly one owner at a time, decided
// here, in a function a test can enumerate.

export type Phase = 'card' | 'countdown' | 'play' | 'results'

export type CentreState = {
  phase: Phase
  welcome: boolean
  /** Seconds left in the round; the last five get the big numeral. */
  roundClock: number
  /** True when the play banner has something to say. */
  banner: boolean
}

export type Centre = 'welcome' | 'countdown' | 'card' | 'results' | 'last5' | 'play' | 'none'

/**
 * The middle of the screen, in priority order: the one-time welcome outranks everything except a
 * live round, the last five seconds outrank the play banner, and nothing shares the space.
 */
export function centreCard(s: CentreState): Centre {
  if (s.welcome && s.phase !== 'play') return 'welcome'
  if (s.phase === 'countdown') return 'countdown'
  if (s.phase === 'card') return 'card'
  if (s.phase === 'results') return 'results'
  if (s.roundClock > 0 && s.roundClock <= 5) return 'last5'
  return s.banner ? 'play' : 'none'
}

export type BandState = {
  phase: Phase
  /** Copycat's perform window, or the encore. */
  poses: boolean
  /** Standing in the Hat Market. */
  shop: boolean
  /** Standing on the Disco Deck. */
  dance: boolean
  /** Eliminated, watching from the ledge. */
  out: boolean
}

export type Band = 'poses' | 'shop' | 'spectator' | 'none'

/**
 * The bottom band. Poses win because they are the only one with a deadline; the shop and the deck
 * are places you chose to stand in; the spectator's buttons are the fallback for being out.
 */
export function bottomBand(s: BandState): Band {
  if (s.poses) return 'poses'
  if (s.dance && s.phase !== 'play') return 'poses'
  if (s.shop && s.phase !== 'play') return 'shop'
  if (s.out) return 'spectator'
  return 'none'
}

/** What the top corners show. Between rounds they carry the meta; during a round they get out of the way. */
export function showsMeta(phase: Phase): boolean {
  return phase !== 'play'
}
