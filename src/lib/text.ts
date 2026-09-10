// Packing a " · "-separated readout into a few lines that fit a card.
//
// The results card grew a subtitle by accretion - time, best, bonuses, rival, session, tomorrow -
// and a single Label cannot wrap it: the SDK draws one line and lets it run off both edges of the
// plate, which is exactly what the phone recording showed. Splitting at the separators keeps each
// fact whole, and a hard line cap means a long night's summary never covers the arena.

export const SEP = '  ·  '

export function packLines(text: string, maxChars: number, maxLines: number, sep = SEP): string[] {
  const segments = text.split(sep).map((s) => s.trim()).filter((s) => s.length > 0)
  const lines: string[] = []
  let current = ''
  for (const seg of segments) {
    if (current === '') {
      current = seg
    } else if (current.length + sep.length + seg.length <= maxChars) {
      current += sep + seg
    } else {
      lines.push(current)
      current = seg
    }
  }
  if (current !== '') lines.push(current)
  return lines.slice(0, maxLines)
}
