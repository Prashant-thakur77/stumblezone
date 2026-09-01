// Every tuning constant lives here. Rounds, layouts and UI all read from this file so that
// balance changes never require hunting through gameplay code.

// --- Scheduling -------------------------------------------------------------
// The whole schedule is a function of UTC time. Nothing publishes it; every client computes it.

export const SLOT_SECONDS = 120
export const ROUND_COUNT = 4

/** Phase split inside a slot. Must sum to SLOT_SECONDS — guarded by a unit test. */
export const INTRO_SECONDS = 20
export const PLAY_SECONDS = 85
export const RESULTS_SECONDS = 15

/** Locomotion is frozen for this long at the start of play, absorbing cross-client clock skew. */
export const GET_READY_SECONDS = 5

/** After the freeze, this many seconds where nothing can kill you. Time to read the space. */
export const WARMUP_SECONDS = 6

export const ROUND_NAMES = ['Perfect Match', 'Sweeper Gates', 'Tip Toe', 'Hex-Drop'] as const

// --- Gameplay ---------------------------------------------------------------

export const LIVES_PER_ROUND = 3

// --- Arena geometry ---------------------------------------------------------

export const TILE_SIZE = 3

/** Perfect Match is a PM_GRID x PM_GRID board. */
export const PM_GRID = 5

export const TIPTOE_WIDTH = 4
export const TIPTOE_LENGTH = 12

export const HEX_COLS = 11
export const HEX_ROWS = 9
export const HEX_TILE_SIZE = 2.6

/** Sweeper Gates walls are divided into this many columns; one of them is the gap. */
export const SWEEPER_COLUMNS = 6

// --- Arena placement (scene is 4x4 parcels = 64m x 64m) ---------------------

export const ARENA_CENTER_X = 32
export const ARENA_CENTER_Z = 36

/**
 * Play surface height. The whole game floats 24m over a visible, solid ground, because a fall
 * only means something if there is somewhere to fall PAST and somewhere to almost land: ~2 seconds
 * of clouds, pillars and the ground rushing up, caught a moment before impact.
 */
export const ARENA_Y = 24

/**
 * Must sit well below the LOWEST standable surface in any round - which is Hex-Drop's second
 * layer at ARENA_Y - HEX_LAYER_GAP. At -1 it was level with that layer, so simply standing on
 * the lower deck was a coin flip between playing on and being eliminated.
 */
export const HEX_LAYER_GAP = 4
/** Hex-Drop decks. Four levels means three real second chances before you are out. */
export const HEX_LAYERS = 4
export const KILL_Y = 2

/** Eliminated players watch from here. High enough to see the whole arena. */
export const LEDGE = { x: 32, y: 36, z: 8 }

/** Where players stand between rounds. */
export const LOBBY = { x: 32, y: 20, z: 7 }

/**
 * Standing spots on the podium steps, tallest first. Rank r of the cycle stands at PODIUM_SPOTS[r].
 *
 * Lives in config rather than lobby.ts because the scheduler needs it and lobby.ts already imports
 * the scheduler - putting it there would close an import cycle. It is pure data either way.
 */
export const PODIUM_SPOTS = [
  { x: 32, y: 21.4, z: 4 },
  { x: 29, y: 21.0, z: 4 },
  { x: 35, y: 20.7, z: 4 }
] as const

// --- Palette ----------------------------------------------------------------
// Chunky, bright, toy-plastic. Fruit colours are deliberately far apart in hue
// so they stay distinguishable on a small screen in bright sunlight.

export const FRUIT_COLORS = [
  { r: 1.0, g: 0.29, b: 0.36 }, // watermelon
  { r: 1.0, g: 0.82, b: 0.15 }, // banana
  { r: 0.29, g: 0.85, b: 0.51 }, // lime
  { r: 0.2, g: 0.68, b: 1.0 }, // blueberry
  { r: 0.78, g: 0.38, b: 1.0 } // grape
] as const

export const FRUIT_NAMES = ['RED', 'YELLOW', 'GREEN', 'BLUE', 'PURPLE'] as const

export const TILE_NEUTRAL = { r: 1.0, g: 0.97, b: 0.92 }
/** A tile that has been stepped on and is about to give way. Reads as danger at a glance. */
export const TILE_WARNING = { r: 1.0, g: 0.48, b: 0.1 }
export const TILE_SHADE = { r: 0.99, g: 0.85, b: 0.89 }
/** Hex-Drop's lower deck, darker so you know you are on your last chance. */
export const DECK_TWO = { r: 0.72, g: 0.78, b: 0.95 }
export const WALL_COLOR = { r: 1.0, g: 0.36, b: 0.42 }
export const PLATFORM_COLOR = { r: 0.42, g: 0.78, b: 0.95 }

// --- Scenery -----------------------------------------------------------------

/** Festival colours for the pillar ring and bunting. Bright, saturated, toy-plastic. */
export const PARTY_COLORS = [
  { r: 0.95, g: 0.26, b: 0.21 },
  { r: 1.0, g: 0.6, b: 0.0 },
  { r: 1.0, g: 0.84, b: 0.0 },
  { r: 0.3, g: 0.75, b: 0.35 },
  { r: 0.13, g: 0.59, b: 0.95 },
  { r: 0.61, g: 0.25, b: 0.79 }
] as const

/** Decorative ground, far below the kill plane so nobody ever lands on it. */
export const GROUND_Y = 0
export const ARENA_RADIUS = 26
