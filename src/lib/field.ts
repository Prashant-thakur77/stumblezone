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

/** `outMs` null means they survived the round. `address` is optional so tests can stay terse. */
export type Out = { name: string; outMs: number | null; address?: string }

const at = (o: Out) => (o.outMs === null ? Infinity : o.outMs)

/**
 * The one rival worth naming: the nearest player you beat on the clock, else the nearest who beat
 * you. One rule, used by the results line, the GG button and the head-to-head record, so all three
 * always mean the same person.
 */
export function nearestRival(me: Out, others: Out[]): { rival: Out; beaten: boolean } | null {
  if (others.length === 0) return null
  const mine = at(me)
  const beaten = others.filter((o) => at(o) < mine).sort((a, b) => at(b) - at(a))[0]
  if (beaten) return { rival: beaten, beaten: true }
  const beater = others.filter((o) => at(o) > mine).sort((a, b) => at(a) - at(b))[0]
  if (beater) return { rival: beater, beaten: false }
  return null
}

export function rivalry(me: Out, others: Out[]): string {
  const r = nearestRival(me, others)
  if (!r) return ''
  const mine = at(me)
  if (r.beaten) {
    if (mine === Infinity) return 'You outlasted ' + r.rival.name
    return 'You outlasted ' + r.rival.name + ' by ' + Math.round((mine - at(r.rival)) / 1000) + 's'
  }
  if (mine === Infinity) return ''
  const by = at(r.rival) === Infinity ? '' : ' by ' + Math.round((at(r.rival) - mine) / 1000) + 's'
  return r.rival.name + ' outlasted you' + by
}
