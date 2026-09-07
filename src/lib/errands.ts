// Six errands a visit. Each pays once; all six pay a bonus and the VILLAGER title.

export type ErrandId = 'climb' | 'lap' | 'stars3' | 'dance' | 'hat' | 'drop'

export const ERRAND_CROWNS = 1
export const ERRANDS_BONUS = 5

export const ERRANDS: { id: ErrandId; text: string }[] = [
  { id: 'hat', text: 'wear a hat from the market' },
  { id: 'dance', text: 'dance on the Disco Deck' },
  { id: 'climb', text: 'climb the Stumble Tower' },
  { id: 'stars3', text: 'find three stars' },
  { id: 'lap', text: 'run a Speed Lap' },
  { id: 'drop', text: 'do the Big Drop from the Sky Box' }
]

export class Errands {
  private finished = new Set<ErrandId>()

  /** True the first time an errand is completed, false on every repeat. */
  done(id: ErrandId): boolean {
    if (this.finished.has(id)) return false
    this.finished.add(id)
    return true
  }

  count(): number {
    return this.finished.size
  }

  complete(): boolean {
    return this.finished.size >= ERRANDS.length
  }

  /** The first errand not yet done, in the listed order - easiest first. */
  next(): { id: ErrandId; text: string } | null {
    return ERRANDS.find((e) => !this.finished.has(e.id)) ?? null
  }
}
