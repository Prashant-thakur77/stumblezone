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

// --- Arena placement (scene is 4x4 parcels = 64m x 64m) ---------------------

export const ARENA_CENTER_X = 32
export const ARENA_CENTER_Z = 36

/** Play surface height. Falling below KILL_Y counts as a fall. */
export const ARENA_Y = 4

/**
 * Must sit well below the LOWEST standable surface in any round - which is Hex-Drop's second
 * layer at ARENA_Y - HEX_LAYER_GAP. At -1 it was level with that layer, so simply standing on
 * the lower deck was a coin flip between playing on and being eliminated.
 */
export const HEX_LAYER_GAP = 4
export const KILL_Y = -6

/** Eliminated players watch from here. High enough to see the whole arena. */
export const LEDGE = { x: 32, y: 13, z: 8 }

/** Where players stand between rounds. */
export const LOBBY = { x: 32, y: 1, z: 7 }

// --- Palette ----------------------------------------------------------------
// Chunky, bright, toy-plastic. Fruit colours are deliberately far apart in hue
// so they stay distinguishable on a small screen in bright sunlight.

export const FRUIT_COLORS = [
  { r: 0.95, g: 0.26, b: 0.21 }, // strawberry red
  { r: 1.0, g: 0.76, b: 0.03 }, // banana yellow
  { r: 0.3, g: 0.69, b: 0.31 }, // lime green
  { r: 0.13, g: 0.59, b: 0.95 }, // blueberry blue
  { r: 0.61, g: 0.15, b: 0.69 } // grape purple
] as const

export const FRUIT_NAMES = ['RED', 'YELLOW', 'GREEN', 'BLUE', 'PURPLE'] as const

export const TILE_NEUTRAL = { r: 0.93, g: 0.93, b: 0.9 }
/** A tile that has been stepped on and is about to give way. Reads as danger at a glance. */
export const TILE_WARNING = { r: 0.98, g: 0.55, b: 0.15 }
export const TILE_FAKE_HINT = { r: 0.85, g: 0.85, b: 0.82 }
export const WALL_COLOR = { r: 0.99, g: 0.42, b: 0.31 }
export const PLATFORM_COLOR = { r: 0.55, g: 0.76, b: 0.88 }
