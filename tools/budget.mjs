// Asset budget check.
//
// A Decentraland scene has a hard per-parcel limit on downloadable content, and a phone on mobile
// data has a much softer one that matters more: anything the scene ships is time a first-time
// visitor spends looking at a loading screen. This prints where the weight is and fails the build
// if any single file or the whole scene crosses the line. Run: node tools/budget.mjs
import { readdirSync, statSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const PARCELS = JSON.parse(readFileSync('scene.json', 'utf8')).scene.parcels.length
// The platform's own rule is 15MB per parcel; a single file over 5MB is almost always a mistake.
const TOTAL_LIMIT_MB = 15 * PARCELS
const FILE_LIMIT_MB = 5

function walk(dir) {
  let files = []
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    const s = statSync(p)
    if (s.isDirectory()) files = files.concat(walk(p))
    else files.push({ path: p, mb: s.size / 1e6 })
  }
  return files
}

const roots = ['assets', 'images'].filter((d) => {
  try {
    return statSync(d).isDirectory()
  } catch {
    return false
  }
})

const files = roots.flatMap(walk)
const byFolder = new Map()
for (const f of files) {
  const key = f.path.split('/').slice(0, 2).join('/')
  const acc = byFolder.get(key) ?? { mb: 0, count: 0 }
  acc.mb += f.mb
  acc.count += 1
  byFolder.set(key, acc)
}

const total = files.reduce((a, f) => a + f.mb, 0)
console.log('Stumblezone asset budget  (' + PARCELS + ' parcels, limit ' + TOTAL_LIMIT_MB + ' MB)\n')
for (const [folder, acc] of [...byFolder].sort((a, b) => b[1].mb - a[1].mb)) {
  console.log('  ' + folder.padEnd(24) + acc.mb.toFixed(2).padStart(8) + ' MB   ' + acc.count + ' files')
}
console.log('  ' + 'TOTAL'.padEnd(24) + total.toFixed(2).padStart(8) + ' MB')

const heaviest = [...files].sort((a, b) => b.mb - a.mb).slice(0, 5)
console.log('\nHeaviest files:')
for (const f of heaviest) console.log('  ' + f.mb.toFixed(2).padStart(8) + ' MB   ' + f.path)

const oversize = files.filter((f) => f.mb > FILE_LIMIT_MB)
let failed = false
for (const f of oversize) {
  console.error('\nFAIL: ' + f.path + ' is ' + f.mb.toFixed(2) + ' MB, over the ' + FILE_LIMIT_MB + ' MB per-file limit')
  failed = true
}
if (total > TOTAL_LIMIT_MB) {
  console.error('\nFAIL: ' + total.toFixed(2) + ' MB total, over the ' + TOTAL_LIMIT_MB + ' MB scene limit')
  failed = true
}
if (!failed) console.log('\nOK - ' + ((total / TOTAL_LIMIT_MB) * 100).toFixed(1) + '% of the scene budget used.')
process.exit(failed ? 1 : 0)
