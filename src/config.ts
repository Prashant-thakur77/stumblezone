// Every tuning constant lives here. Rounds, layouts and UI all read from this file so that
// balance changes never require hunting through gameplay code.

// --- Scheduling -------------------------------------------------------------
// The whole schedule is a function of UTC time. Nothing publishes it; every client computes it.

export const SLOT_SECONDS = 120
export const ROUND_COUNT = 4

/** Phase split inside a slot. Must sum to SLOT_SECONDS — guarded by a unit test. */
export const INTRO_SECONDS = 30
export const PLAY_SECONDS = 75
export const RESULTS_SECONDS = 15

/** Locomotion is frozen for this long at the start of play, absorbing cross-client clock skew. */
export const GET_READY_SECONDS = 5

export const ROUND_NAMES = ['Perfect Match', 'Sweeper Gates', 'Tip Toe', 'Hex-Drop'] as const

// --- Gameplay ---------------------------------------------------------------

export const LIVES_PER_ROUND = 3

// --- Arena geometry ---------------------------------------------------------

export const TILE_SIZE = 3

/** Perfect Match is a PM_GRID x PM_GRID board. */
export const PM_GRID = 5

export const TIPTOE_WIDTH = 4
export const TIPTOE_LENGTH = 12

export const HEX_PER_LAYER = 180

/** Sweeper Gates walls are divided into this many columns; one of them is the gap. */
export const SWEEPER_COLUMNS = 6
