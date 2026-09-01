import { Vector3 } from '@dcl/sdk/math'

// The contract all four rounds implement. The scheduler knows nothing else about them.

export type Round = {
  name: string

  /** One line shown during the intro, so a first-timer knows what to do before it starts. */
  hint: string

  /**
   * Where players are placed when the round begins.
   *
   * Rounds are not walked to. The lobby and the arena are deliberately separate spaces and the
   * scheduler teleports everyone in at the start of play - that way nobody arrives late, nobody
   * gets stuck on scenery, and the round always starts with the whole field on the mark.
   */
  spawn(): Vector3

  /** Called once at scene start. Creates every entity the round will ever need. */
  build(): void

  /** Called at the start of the round's intro phase. Resets state for the new slot. */
  start(seed: number): void

  /** Called every frame while the round is the active one. `elapsed` is seconds into the slot. */
  tick(dt: number, elapsed: number, playing: boolean): void

  /** Called when the slot ends. Hides the round's geometry. */
  stop(): void

  /**
   * Height of the lowest surface you can stand on. Only a round with a stack of decks needs to
   * say; anything else is the arena deck. Below this, with air underneath, the fall sound plays.
   */
  floorY?: number
}
