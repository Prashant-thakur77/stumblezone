// The contract all four rounds implement. The scheduler knows nothing else about them.

export type Round = {
  name: string

  /** Called once at scene start. Creates every entity the round will ever need. */
  build(): void

  /** Called at the start of the round's intro phase. Resets state for the new slot. */
  start(seed: number): void

  /** Called every frame while the round is the active one. `elapsed` is seconds into the slot. */
  tick(dt: number, elapsed: number, playing: boolean): void

  /** Called when the slot ends. Hides the round's geometry. */
  stop(): void
}
