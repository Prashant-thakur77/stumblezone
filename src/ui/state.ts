// Shared HUD state. Rounds and the scheduler write it; the UI reads it every frame.
// Keeping it in one tiny module avoids every round importing the UI and vice versa.

export type HudState = {
  roundName: string
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
}

export const hud: HudState = {
  roundName: '',
  banner: '',
  subtitle: '',
  countdown: 0,
  lives: 3,
  out: false,
  alive: 1,
  resultDetail: '',
  roundClock: 0,
  showLine: ''
}

export function setBanner(banner: string, subtitle = ''): void {
  hud.banner = banner
  hud.subtitle = subtitle
}
