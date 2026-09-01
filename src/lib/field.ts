// Who is still in, and who you were closest to.
//
// "3 IN" tells you the size of the field; "IN: you, Alice, Bob" tells you who you are racing. And
// a result is far more personal as a comparison to one named player than as a number of seconds -
// "You outlasted Alice by 4s" is the line people repeat to each other afterwards.

export function fieldLine(names: string[], max = 3): string {
  if (names.length === 0) return ''
  const shown = names.slice(0, max).join(', ')
  const rest = names.length - max
  return 'IN: ' + shown + (rest > 0 ? ' +' + rest : '')
}

/** `outMs` null means they survived the round. */
export type Out = { name: string; outMs: number | null }

export function rivalry(me: Out, others: Out[]): string {
  if (others.length === 0) return ''
  const at = (o: Out) => (o.outMs === null ? Infinity : o.outMs)
  const mine = at(me)
  // The rival worth naming is the nearest one on the clock, not the best or the worst player.
  const beaten = others.filter((o) => at(o) < mine).sort((a, b) => at(b) - at(a))[0]
  if (beaten) {
    if (mine === Infinity) return 'You outlasted ' + beaten.name
    return 'You outlasted ' + beaten.name + ' by ' + Math.round((mine - at(beaten)) / 1000) + 's'
  }
  const beater = others.filter((o) => at(o) > mine).sort((a, b) => at(a) - at(b))[0]
  if (!beater || mine === Infinity) return ''
  const by = at(beater) === Infinity ? '' : ' by ' + Math.round((at(beater) - mine) / 1000) + 's'
  return beater.name + ' outlasted you' + by
}
