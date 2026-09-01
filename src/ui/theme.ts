// The HUD's palette and radii, in one place.
//
// Fall Guys' HUD is chunky white uppercase on saturated rounded plates: magenta for "you", yellow
// for gold and stakes, cyan for calm information, a purple-navy for plates. The SDK cannot load
// Titan One or draw an outline, so the "chunky" comes from a 3px border on every plate and a
// shadow copy under every big label (see parts.tsx).

import { Color4 } from '@dcl/sdk/math'

export const C = {
  pink: Color4.create(1.0, 0.24, 0.62, 1),
  yellow: Color4.create(1.0, 0.83, 0.25, 1),
  cyan: Color4.create(0.2, 0.8, 1.0, 1),
  green: Color4.create(0.36, 0.86, 0.5, 1),
  slate: Color4.create(0.42, 0.46, 0.62, 1),
  navy: Color4.create(0.17, 0.11, 0.33, 1),
  /** Plates behind small readouts: navy at 85%, so the world still shows through. */
  plate: Color4.create(0.17, 0.11, 0.33, 0.85),
  /** The dark under every plate edge and every big label. */
  shadow: Color4.create(0.09, 0.05, 0.2, 1),
  white: Color4.White(),
  /** An unspent life dot. */
  dim: Color4.create(1, 1, 1, 0.25)
}

export const R = {
  pill: 22,
  card: 30
}

/** The colour a countdown numeral wears: it flips each second so the tick is seen as well as heard. */
export function countdownColor(n: number): Color4 {
  return [C.cyan, C.pink, C.yellow][n % 3]
}
