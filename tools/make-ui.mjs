// Writes the HUD's plate shapes as white RGBA PNGs that the UI tints at runtime.
//
// Why textures: the mobile client ignores `borderRadius`, so a "rounded pill" drawn from layout
// props comes out as a hard rectangle on the very device this scene is built for. A stretched
// white shape with a colour tint looks the same on every client. Run: node tools/make-ui.mjs
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'

const crc32 = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return (buf) => {
    let c = 0xffffffff
    for (const b of buf) c = t[(c ^ b) & 0xff] ^ (c >>> 8)
    return (c ^ 0xffffffff) >>> 0
  }
})()

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const td = Buffer.concat([Buffer.from(type, 'latin1'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(td))
  return Buffer.concat([len, td, crc])
}

function png(w, h, alphaAt) {
  const raw = Buffer.alloc((w * 4 + 1) * h)
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0
    for (let x = 0; x < w; x++) {
      const o = y * (w * 4 + 1) + 1 + x * 4
      raw[o] = raw[o + 1] = raw[o + 2] = 255
      raw[o + 3] = Math.round(255 * alphaAt(x + 0.5, y + 0.5))
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0)
  ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0))
  ])
}

/** 1 inside a rounded rectangle, with a 1.5px anti-aliased edge. */
function roundedRect(w, h, r) {
  return (x, y) => {
    const dx = Math.max(r - x, x - (w - r), 0)
    const dy = Math.max(r - y, y - (h - r), 0)
    const d = Math.hypot(dx, dy) - r
    return Math.min(1, Math.max(0, 0.5 - d / 1.5))
  }
}

mkdirSync('images/ui', { recursive: true })
writeFileSync('images/ui/pill.png', png(512, 128, roundedRect(512, 128, 64)))
writeFileSync('images/ui/card.png', png(512, 256, roundedRect(512, 256, 48)))
writeFileSync('images/ui/dot.png', png(64, 64, roundedRect(64, 64, 32)))
console.log('wrote images/ui/{pill,card,dot}.png')
