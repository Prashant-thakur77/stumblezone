// Shared HUD state. Rounds and the scheduler write it; the UI reads it every frame.
// Keeping it in one tiny module avoids every round importing the UI and vice versa.

/** Which layout the centre of the screen is in. The scheduler sets it; the HUD only reads it. */
export type HudPhase = 'card' | 'countdown' | 'play' | 'results'

export type HudState = {
  phase: HudPhase
  roundName: string
  /** The category tag over the name on the intro card: "ROUND 2  ·  SURVIVAL" or "FINAL ROUND". */
  roundTag: string
  /** True during the show's final act: the card goes gold. */
  finale: boolean
  /** Big centre-screen line: the instruction that matters right now. */
  banner: string
  /** Smaller line under the banner. */
  subtitle: string
  /** Seconds remaining in the current phase, already rounded for display. */
  countdown: number
  lives: number
  out: boolean
  alive: number
  /** Result-phase detail line: crowns won, or the solo time and personal best. */
  resultDetail: string
  /** Seconds left in the round. Zero outside the play phase, when it is hidden. */
  roundClock: number
  /** Your standing in the current show, e.g. "SHOW 3rd of 7". Empty before you score. */
  showLine: string
  /** The corner feed: who fell, who finished, who is cheering. Newest first, at most three. */
  toasts: string[]
  /** How hot the crowd is, 0 to 1. Spectators drive it by cheering. */
  hype: number
  /** Who is still standing, by name: "IN: you, Alice, Bob +2". */
  fieldLine: string
  /** Today's challenge, or "DAILY: DONE" once it is cleared. */
  daily: string
  /** True during a Golden Show: every crown counts double and the card goes gold. */
  golden: boolean
}

export const hud: HudState = {
  phase: 'card',
  roundName: '',
  roundTag: '',
  finale: false,
  banner: '',
  subtitle: '',
  countdown: 0,
  lives: 3,
  out: false,
  alive: 1,
  resultDetail: '',
  roundClock: 0,
  showLine: '',
  toasts: [],
  hype: 0,
  fieldLine: '',
  daily: '',
  golden: false
}

export function setBanner(banner: string, subtitle = ''): void {
  hud.banner = banner
  hud.subtitle = subtitle
}
