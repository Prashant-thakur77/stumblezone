// What the host says. A pure rotation over lines that depend on the moment: the schedule, the
// daily, the errand you are on, the hat you could unlock next - with the errand line favoured
// while errands remain, and never the same line twice in a row.

export type TipState = {
  nextRound: string
  /** The next round's mid-round rule change, if it has one. */
  twist?: string
  inSeconds: number
  daily: string
  errand: string | null
  nextHat: string | null
  crowns: number
}

export function tipLines(s: TipState): string[] {
  const m = Math.floor(s.inSeconds / 60)
  const sec = s.inSeconds % 60
  const lines = [
    s.nextRound + ' in ' + m + ':' + String(sec).padStart(2, '0') + '. ' + (s.twist ? s.twist + '.' : 'Be in the arena for the whistle.'),
    'Today: ' + s.daily + '. Three crowns.',
    'Fall, and cheer from the ledge. Five cheers in ten seconds and the crowd goes wild.',
    'Four acts make a show. The champion takes the podium.',
    s.crowns > 0 ? 'You have ' + s.crowns + ' crowns. The board is behind me.' : 'Qualify once and you have a crown.'
  ]
  if (s.errand) lines.unshift('Errand: ' + s.errand + '.')
  if (s.nextHat) lines.push('Next hat: ' + s.nextHat + '.')
  return lines
}

/** The index of the line to show at tick `i`. The errand line comes round every other tick. */
export function tipAt(s: TipState, i: number): string {
  const lines = tipLines(s)
  if (lines.length === 1) return lines[0]
  if (s.errand && i % 2 === 0) return lines[0]
  const rest = s.errand ? lines.slice(1) : lines
  const idx = s.errand ? Math.floor(i / 2) % rest.length : i % rest.length
  return rest[idx]
}
