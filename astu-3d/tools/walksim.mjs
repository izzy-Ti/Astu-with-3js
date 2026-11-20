// headless walk simulation: same capsule controller as src/visit/main.js
// usage: node tools/walksim.mjs sx sy sz siteHeadingDeg seconds [turnAtSec:newHeading ...]
import * as THREE from 'three'
import { MeshBVH } from 'three-mesh-bvh'
import { buildSite, toWorld, SITE_ROT } from '../src/visit/site510.js'
const [sx, sy, sz, hd, secs, ...turns] = process.argv.slice(2)
const { builder } = buildSite()
const geo = builder.colliderGeometry(); geo.boundsTree = new MeshBVH(geo)
const pl = { pos: new THREE.Vector3(), vel: new THREE.Vector3(), onGround: false, radius: 0.35, seg: 1.0 }
const w = toWorld(+sx, +sz); pl.pos.set(w.x, +sy + 1.35, w.z)
let heading = +hd
const tmpBox = new THREE.Box3(), tmpSeg = new THREE.Line3(), v1 = new THREE.Vector3(), v2 = new THREE.Vector3()
function step(dt) {
  pl.vel.y += pl.onGround ? 0 : dt * -22
  pl.pos.addScaledVector(pl.vel, dt)
  const a = THREE.MathUtils.degToRad(heading) - SITE_ROT // site heading 0 = +x
  pl.pos.add(new THREE.Vector3(Math.cos(a), 0, Math.sin(a)).multiplyScalar(3.6 * dt))
  tmpSeg.start.copy(pl.pos); tmpSeg.end.copy(pl.pos).y -= pl.seg
  tmpBox.makeEmpty(); tmpBox.expandByPoint(tmpSeg.start); tmpBox.expandByPoint(tmpSeg.end)
  tmpBox.min.addScalar(-pl.radius); tmpBox.max.addScalar(pl.radius)
  geo.boundsTree.shapecast({
    intersectsBounds: (b) => b.intersectsBox(tmpBox),
    intersectsTriangle: (tri) => {
      const d = tri.closestPointToSegment(tmpSeg, v1, v2)
      if (d < pl.radius) { const dir = v2.sub(v1).normalize(); tmpSeg.start.addScaledVector(dir, pl.radius - d); tmpSeg.end.addScaledVector(dir, pl.radius - d) }
    },
  })
  const delta = v1.subVectors(tmpSeg.start, pl.pos)
  pl.onGround = delta.y > Math.abs(dt * pl.vel.y * 0.25)
  const off = Math.max(0, delta.length() - 1e-5); delta.normalize().multiplyScalar(off); pl.pos.add(delta)
  if (!pl.onGround) { delta.normalize(); pl.vel.addScaledVector(delta, -delta.dot(pl.vel)) } else pl.vel.set(0, 0, 0)
}
const c = Math.cos(SITE_ROT), s = Math.sin(SITE_ROT)
const tl = turns.map((t) => t.split(':').map(Number))
for (let f = 0; f <= secs * 60; f++) {
  const t = f / 60
  for (const [ts, h] of tl) if (Math.abs(t - ts) < 1e-6) heading = h
  for (let i = 0; i < 5; i++) step(1 / 300)
  if (f % 30 === 0) {
    const p = pl.pos
    console.log(t.toFixed(1).padStart(5), 'site', (p.x * c - p.z * s).toFixed(2), (p.x * s + p.z * c).toFixed(2), 'feet', (p.y - 1.35).toFixed(2), pl.onGround ? 'ground' : 'air')
  }
}
