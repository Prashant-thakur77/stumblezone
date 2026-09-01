// Prints the real bounding box of a GLB, from its accessor min/max with node scale applied.
//
// The catalog's listed sizes are not reliable - the balloon cluster lists as 17m and renders at
// 44m - so every model is measured before it is placed. Usage: node tools/measure-glb.mjs a.glb b.glb

import { readFileSync } from 'node:fs'

for (const path of process.argv.slice(2)) {
  const buf = readFileSync(path)
  if (buf.toString('latin1', 0, 4) !== 'glTF') {
    console.log(`${path}: NOT A GLB (magic ${JSON.stringify(buf.toString('latin1', 0, 4))})`)
    continue
  }
  const jsonLen = buf.readUInt32LE(12)
  const gltf = JSON.parse(buf.toString('utf8', 20, 20 + jsonLen))
  const min = [Infinity, Infinity, Infinity]
  const max = [-Infinity, -Infinity, -Infinity]
  const walk = (nodeIndex, scale) => {
    const node = gltf.nodes[nodeIndex]
    const s = node.scale ? node.scale.map((v, i) => v * scale[i]) : scale
    const t = node.translation ?? [0, 0, 0]
    if (node.mesh !== undefined) {
      for (const prim of gltf.meshes[node.mesh].primitives) {
        const acc = gltf.accessors[prim.attributes.POSITION]
        if (!acc?.min) continue
        for (let i = 0; i < 3; i++) {
          min[i] = Math.min(min[i], acc.min[i] * s[i] + t[i], acc.max[i] * s[i] + t[i])
          max[i] = Math.max(max[i], acc.min[i] * s[i] + t[i], acc.max[i] * s[i] + t[i])
        }
      }
    }
    for (const c of node.children ?? []) walk(c, s)
  }
  const scene = gltf.scenes?.[gltf.scene ?? 0]
  for (const n of scene?.nodes ?? gltf.nodes.map((_, i) => i)) walk(n, [1, 1, 1])
  const size = max.map((v, i) => v - min[i])
  const anims = (gltf.animations ?? []).map((a) => a.name).join(', ')
  console.log(
    `${path}\n  size ${size.map((v) => v.toFixed(2)).join(' x ')}  min ${min.map((v) => v.toFixed(2)).join(', ')}  max ${max.map((v) => v.toFixed(2)).join(', ')}` +
      `\n  tris ~${(gltf.accessors ?? []).filter((a) => a.type === 'SCALAR').reduce((n, a) => n + a.count, 0) / 3 | 0}  anims: ${anims || '-'}`
  )
}
