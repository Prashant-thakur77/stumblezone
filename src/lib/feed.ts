// A short, self-expiring list of one-line events for the corner of the HUD.
//
// Names are what make a party game social. "3 IN" is a number; "Alice is OUT" is a story you were
// part of. Nothing here touches the SDK, so the expiry rules are unit-tested against a clock we
// control rather than against a running scene.

export const FEED_TTL_MS = 4000
export const FEED_MAX = 3

export class Feed {
  private items: { text: string; at: number }[] = []

  push(text: string, nowMs: number): void {
    const last = this.items[this.items.length - 1]
    // A repeat of the line already on screen is noise - the bus echoes and rounds fire in bursts.
    if (last && last.text === text && nowMs - last.at < FEED_TTL_MS) return
    this.items.push({ text, at: nowMs })
    if (this.items.length > FEED_MAX * 2) this.items.splice(0, this.items.length - FEED_MAX * 2)
  }

  /** Newest first, at most FEED_MAX, nothing older than the TTL. */
  visible(nowMs: number): string[] {
    return this.items
      .filter((i) => nowMs - i.at < FEED_TTL_MS)
      .slice(-FEED_MAX)
      .reverse()
      .map((i) => i.text)
  }
}
