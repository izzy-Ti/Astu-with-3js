// debug: list collider triangles near a site-frame point
import * as THREE from 'three'
import { buildSite, toWorld } from '../src/visit/site510.js'
const [sx, y, sz, rad = 0.5] = process.argv.slice(2).map(Number)
const { builder } = buildSite()
const g = builder.colliderGeometry(), P = g.attributes.position
const w = toWorld(sx, sz); w.y = y
const box = new THREE.Box3().setFromCenterAndSize(w, new THREE.Vector3(rad * 2, rad * 2, rad * 2))
const tri = new THREE.Triangle(), a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3()
let n = 0
for (let i = 0; i < P.count; i += 3) {
  a.fromBufferAttribute(P, i); b.fromBufferAttribute(P, i + 1); c.fromBufferAttribute(P, i + 2)
  tri.set(a, b, c)
  if (box.intersectsTriangle(tri)) {
    const nn = new THREE.Vector3(); tri.getNormal(nn)
    if (n++ < 30) console.log(i / 3, [a, b, c].map((v) => v.toArray().map((x) => x.toFixed(2)).join(',')).join(' | '), 'n=', nn.toArray().map((x) => x.toFixed(2)).join(','))
  }
}
console.log('total', n)
