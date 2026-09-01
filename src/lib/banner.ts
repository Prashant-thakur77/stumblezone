// What the big centre-screen line should say.
//
// Pure, and separated out because getting it wrong is a bug players notice immediately: a round
// telling an eliminated player "SURVIVED" reads as the game not knowing what happened to them.
// Rounds write whatever suits their own state machine; this has the final word.

export type BannerInput = {
  /** Whether the local player is out of this round. */
  out: boolean
  /** Whether the local player only joined partway through and is sitting the round out. */
  spectatingOnly: boolean
  banner: string
  subtitle: string
}

export type BannerOutput = { banner: string; subtitle: string }

export function resolveBanner(input: BannerInput): BannerOutput {
  if (input.spectatingOnly) {
    return { banner: '', subtitle: 'Watching - you are in for the next round' }
  }
  if (input.out) {
    // Never echo a round's progress text at someone who is no longer in it.
    return { banner: '', subtitle: 'Eliminated - cheer them on!' }
  }
  return { banner: input.banner, subtitle: input.subtitle }
}

/**
 * The category tag over the round name on the intro card: Fall Guys labels every round RACE /
 * SURVIVAL / FINAL, and the final gets a gold card. Every Stumblezone round is a survival round,
 * so the tag carries the act number instead - the thing a player actually wants to know.
 */
export function roundTag(index: number, finale: boolean): string {
  if (finale) return 'FINAL ROUND'
  return 'ROUND ' + (index + 1) + '  ·  SURVIVAL'
}
