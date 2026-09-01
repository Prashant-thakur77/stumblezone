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
