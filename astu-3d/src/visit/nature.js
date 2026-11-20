// Vegetation + street furniture built into the shared Builder.
// Canopies are clouds of alpha-tested leaf cards whose normals point away from the crown
// centre, which gives soft, volumetric shading at very low cost.
import * as THREE from 'three'
import { box, quad, prism, arcPts, hexa } from './builder.js'

const UP = new THREE.Vector3(0, 1, 0)

export function rng(seed) {
  let s = seed >>> 0
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)
}

// cylinder from point a to point b (tapered), uv scaled to metres
function limb(B, key, a, b, r0, r1, seg = 7) {
  const dir = new THREE.Vector3().subVectors(b, a), L = dir.length()
  const g = new THREE.CylinderGeometry(r1, r0, L, seg, 1, true)
  const uv = g.attributes.uv
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * Math.max(1, r0 * 8), uv.getY(i) * L * 0.5)
  g.translate(0, L / 2, 0)
  const q = new THREE.Quaternion().setFromUnitVectors(UP, dir.normalize())
  g.applyMatrix4(new THREE.Matrix4().compose(a, q, new THREE.Vector3(1, 1, 1)))
  B.add(key, g)
}

// one leaf card, normals bent outward from `centre`
function card(B, key, p, size, r, centre) {
  const g = quad(size, size)
  const m = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(r() * Math.PI, r() * Math.PI * 2, r() * Math.PI))
  g.applyMatrix4(m)
  g.translate(p.x, p.y, p.z)
  const n = g.attributes.normal, pos = g.attributes.position
  for (let i = 0; i < n.count; i++) {
    const v = new THREE.Vector3(pos.getX(i) - centre.x, (pos.getY(i) - centre.y) * 1.4 + 0.4, pos.getZ(i) - centre.z).normalize()
    n.setXYZ(i, v.x, v.y, v.z)
  }
  B.add(key, g)
}

// broadleaf tree. kind: 'round' | 'umbrella' (acacia) | 'tulip' (red flowers) | 'jacaranda'
export function tree(B, x, z, { h = 7, crown = 3.5, kind = 'round', seed = 1 } = {}) {
  const r = rng(seed * 7919 + 13)
  if (kind === 'bare') return bareTree(B, x, z, h, crown, seed)
  const key = kind === 'tulip' ? 'leafRed' : kind === 'jacaranda' ? 'leafPurple' : kind === 'umbrella' ? 'leafDry' : 'leaf'
  const trunkH = kind === 'umbrella' ? h * 0.62 : h * 0.45
  const base = new THREE.Vector3(x, 0, z)
  const lean = new THREE.Vector3((r() - 0.5) * 0.6, trunkH, (r() - 0.5) * 0.6)
  const top = base.clone().add(lean)
  const rt = 0.12 + crown * 0.035
  limb(B, 'bark', base, top, rt, rt * 0.7)
  B.collider(box(x - rt, 0, z - rt, x + rt, 2.2, z + rt))
  const flat = kind === 'umbrella' ? 0.32 : kind === 'tulip' ? 0.75 : 0.62
  const cy = kind === 'umbrella' ? h - crown * flat * 0.6 : trunkH + crown * flat * 0.9
  const centre = new THREE.Vector3(x + lean.x, cy, z + lean.z)
  // branches
  const nb = 4 + Math.floor(r() * 3)
  for (let i = 0; i < nb; i++) {
    const a = (i / nb) * Math.PI * 2 + r()
    const end = centre.clone().add(new THREE.Vector3(Math.cos(a) * crown * 0.6, (r() - 0.2) * crown * flat * 0.6, Math.sin(a) * crown * 0.6))
    limb(B, 'bark', top, end, rt * 0.6, rt * 0.2, 5)
  }
  // foliage clusters on an ellipsoid shell
  const n = Math.round(crown * crown * (kind === 'umbrella' ? 4.2 : 5.6))
  for (let i = 0; i < n; i++) {
    const u = r() * 2 - 1, th = r() * Math.PI * 2, s = Math.sqrt(1 - u * u), rr = 0.55 + 0.45 * Math.cbrt(r())
    const p = new THREE.Vector3(centre.x + Math.cos(th) * s * crown * rr, centre.y + u * crown * flat * rr, centre.z + Math.sin(th) * s * crown * rr)
    const sz = (kind === 'umbrella' ? 1.8 : 2.1) + r() * 1.1
    card(B, key, p, sz, r, centre)
    if (r() < 0.5) card(B, key, p, sz * 0.8, r, centre)
  }
}

// Canary date palm (big, thick trunk) or small pygmy palm in planters
export function palm(B, x, z, { h = 4, fronds = 26, flen = 3.4, seed = 1, trunkR = 0.38 } = {}) {
  const r = rng(seed * 104729 + 7)
  const base = new THREE.Vector3(x, 0, z)
  const top = new THREE.Vector3(x + (r() - 0.5) * 0.4, h, z + (r() - 0.5) * 0.4)
  limb(B, 'palmBark', base, top, trunkR * 1.15, trunkR, 10)
  B.collider(box(x - trunkR, 0, z - trunkR, x + trunkR, 2.2, z + trunkR))
  // leaf-base "pineapple" knob
  const knob = new THREE.SphereGeometry(trunkR * 1.35, 10, 8)
  knob.scale(1, 0.9, 1); knob.translate(top.x, top.y, top.z)
  B.add('palmBark', knob)
  for (let i = 0; i < fronds; i++) {
    const az = (i / fronds) * Math.PI * 2 + r() * 0.3
    const tier = i % 3
    const elev = 0.85 - tier * 0.45 + (r() - 0.5) * 0.25 // radians above horizontal
    const L = flen * (0.8 + r() * 0.3), W = L * 0.32
    const g = new THREE.PlaneGeometry(L, W, 10, 1).toNonIndexed()
    const pos = g.attributes.position
    for (let k = 0; k < pos.count; k++) {
      const px = pos.getX(k) + L / 2, t = px / L
      const along = px * Math.cos(elev), up = px * Math.sin(elev) - t * t * L * 0.55 // droop
      const across = pos.getY(k)
      pos.setXYZ(k, along, up + Math.abs(across) * 0.35, across) // V-shaped cross-section
    }
    g.computeVertexNormals()
    const n = g.attributes.normal
    for (let k = 0; k < n.count; k++) { const v = new THREE.Vector3(n.getX(k), Math.abs(n.getY(k)) + 0.6, n.getZ(k)).normalize(); n.setXYZ(k, v.x, v.y, v.z) }
    g.rotateY(-az)
    g.translate(top.x, top.y + 0.2, top.z)
    B.add('frond', g)
  }
}

// Norfolk-pine / grevillea-like conifer seen in the courtyard photos
export function conifer(B, x, z, { h = 5, seed = 1 } = {}) {
  const r = rng(seed * 31 + 3)
  limb(B, 'bark', new THREE.Vector3(x, 0, z), new THREE.Vector3(x, h, z), 0.1, 0.03, 6)
  const tiers = Math.round(h * 2.2)
  for (let t = 0; t < tiers; t++) {
    const y = 0.8 + (t / tiers) * (h - 0.8), spread = (1 - t / tiers) * 1.1 + 0.25
    const nArm = 5
    for (let i = 0; i < nArm; i++) {
      const az = (i / nArm) * Math.PI * 2 + t * 0.7 + r() * 0.3
      const g = new THREE.PlaneGeometry(spread * 1.4, 0.45, 4, 1).toNonIndexed()
      g.translate(spread * 0.7, 0, 0)
      g.rotateX(-Math.PI / 2 + 0.25)
      const pos = g.attributes.position
      for (let k = 0; k < pos.count; k++) pos.setY(k, pos.getY(k) - (pos.getX(k) / spread) ** 2 * 0.25)
      g.computeVertexNormals()
      g.rotateY(-az); g.translate(x, y, z)
      B.add('needle', g)
    }
  }
}

export function shrub(B, x, z, { s = 1, seed = 1, key = 'leaf' } = {}) {
  const r = rng(seed * 17 + 5), c = new THREE.Vector3(x, 0.45 * s, z)
  for (let i = 0; i < 7; i++) card(B, key, c.clone().add(new THREE.Vector3((r() - 0.5) * s, r() * 0.5 * s, (r() - 0.5) * s)), 0.9 * s, r, c)
}

// concrete lamp post with a white globe (as in the courtyard photos)
export function lamp(B, x, z, globes, { sign = false, ry = 0 } = {}) {
  B.add('post', new THREE.CylinderGeometry(0.045, 0.06, 3.3, 10).translate(x, 1.65, z))
  B.add('post', new THREE.CylinderGeometry(0.1, 0.13, 0.35, 10).translate(x, 0.175, z))
  B.add('post', new THREE.CylinderGeometry(0.11, 0.05, 0.12, 10).translate(x, 3.33, z)) // cup under the globe
  B.add('globe', new THREE.SphereGeometry(0.2, 18, 12).translate(x, 3.56, z))
  if (sign) B.frame(x, 2.55, z, ry, () => { // small blue room sign clamped to the post (photo 145543)
    B.frame(0.16, 0, 0.012, 0, () => B.add('plate', quad(0.26, 0.2)))
    B.frame(0.16, 0, -0.012, Math.PI, () => B.add('plate', quad(0.26, 0.2)))
    B.add('post', box(0.03, -0.11, -0.01, 0.3, 0.11, 0.01))
  })
  globes.push(new THREE.Vector3(x, 3.56, z))
}

// green notice-board kiosk with a little pitched roof
export function noticeBoard(B, x, z, ry = 0) {
  B.frame(x, 0, z, ry, () => {
    B.add('metal', box(-0.85, 0, -0.04, -0.75, 2.3, 0.04)); B.add('metal', box(0.75, 0, -0.04, 0.85, 2.3, 0.04))
    B.add('metal', box(-0.8, 0.9, -0.03, 0.8, 2.0, 0.03))
    B.frame(0, 1.45, 0.035, 0, () => B.add('board', quad(1.5, 1.0)))
    B.frame(0, 1.45, -0.035, Math.PI, () => B.add('board', quad(1.5, 1.0)))
    // pitched sheet roof
    const roof = (s) => {
      const g = new THREE.PlaneGeometry(2.0, 0.55).toNonIndexed()
      g.rotateX(-Math.PI / 2 + s * 0.45); g.translate(0, 2.42, s * 0.24)
      B.add('roofGreen', g)
    }
    roof(1); roof(-1)
  })
  B.collider(box(x - 0.9, 0, z - 0.3, x + 0.9, 2.3, z + 0.3))
}

// raised planter: concrete curb + soil/grass top
export function planter(B, xa, za, xb, zb, h = 0.35) {
  const x0 = Math.min(xa, xb), x1 = Math.max(xa, xb), z0 = Math.min(za, zb), z1 = Math.max(za, zb)
  const t = 0.16
  B.add('curb', box(x0, 0, z0, x1, h, z0 + t), { collide: true })
  B.add('curb', box(x0, 0, z1 - t, x1, h, z1), { collide: true })
  B.add('curb', box(x0, 0, z0 + t, x0 + t, h, z1 - t), { collide: true })
  B.add('curb', box(x1 - t, 0, z0 + t, x1, h, z1 - t), { collide: true })
  B.add('grass', box(x0 + t, 0, z0 + t, x1 - t, h - 0.07, z1 - t))
}

export function roundPlanter(B, x, z, rad, h = 0.4) {
  const ring = arcPts(x, z, rad, 0, Math.PI * 2, 28).slice(0, -1)
  const inner = arcPts(x, z, rad - 0.15, 0, Math.PI * 2, 28).slice(0, -1).reverse()
  B.add('curb', prism(ring, 0, h, [inner]), { collide: true })
  B.add('grass', prism(inner, 0, h - 0.08))
}

// gnarled, mostly dead tree (big stump near the stair-end corner, photos 145530-145536)
function bareTree(B, x, z, h, crown, seed) {
  const r = rng(seed * 7 + 1)
  const base = new THREE.Vector3(x, 0, z), top = new THREE.Vector3(x + 0.3, h * 0.35, z - 0.2)
  limb(B, 'bark', base, top, 0.5, 0.35, 9)
  B.collider(box(x - 0.5, 0, z - 0.5, x + 0.5, 2.2, z + 0.5))
  // a split-off broken limb lying sideways
  limb(B, 'bark', top, new THREE.Vector3(x + 2.2, 0.9, z + 0.8), 0.3, 0.18, 7)
  const ends = []
  for (let i = 0; i < 6; i++) {
    const a = r() * Math.PI * 2, e = new THREE.Vector3(x + Math.cos(a) * crown * 0.7, h * (0.6 + r() * 0.4), z + Math.sin(a) * crown * 0.7)
    limb(B, 'bark', top, e, 0.18, 0.05, 6); ends.push(e)
  }
  for (const e of ends) for (let i = 0; i < 3; i++) card(B, 'leafDry', e.clone().add(new THREE.Vector3((r() - 0.5) * 1.5, (r() - 0.3), (r() - 0.5) * 1.5)), 1.2, r, e)
}

// beige pyramid canopy tent (outdoor café)
export function tent(B, x, z, s = 4) {
  for (const [dx, dz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    B.add('metal', new THREE.CylinderGeometry(0.04, 0.04, 2.3, 6).translate(x + dx * s / 2, 1.15, z + dz * s / 2))
  }
  const roof = new THREE.ConeGeometry(s * 0.72, 1.3, 4, 1, true)
  roof.rotateY(Math.PI / 4); roof.translate(x, 2.3 + 0.65, z)
  B.add('tent', roof)
  // valance skirt
  const h = s / 2
  for (const [a, b] of [[[-h, -h], [h, -h]], [[h, -h], [h, h]], [[h, h], [-h, h]], [[-h, h], [-h, -h]]]) {
    const g = quad(s, 0.3)
    const ang = Math.atan2(b[1] - a[1], b[0] - a[0])
    g.rotateY(-ang)
    g.translate(x + (a[0] + b[0]) / 2, 2.15, z + (a[1] + b[1]) / 2)
    B.add('tent', g)
  }
}

export function cafeTable(B, x, z, seed = 1) {
  const r = rng(seed)
  B.add('metal', new THREE.CylinderGeometry(0.04, 0.04, 0.72, 6).translate(x, 0.36, z))
  B.add('chair', new THREE.CylinderGeometry(0.45, 0.45, 0.04, 16).translate(x, 0.74, z))
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + r() * 0.4, cx = x + Math.cos(a) * 0.75, cz = z + Math.sin(a) * 0.75
    B.frame(cx, 0, cz, -a + Math.PI / 2, () => {
      B.add('chair', box(-0.22, 0.42, -0.22, 0.22, 0.46, 0.22))
      B.add('chair', box(-0.22, 0.46, 0.18, 0.22, 0.9, 0.22))
      for (const [lx, lz] of [[-0.19, -0.19], [0.19, -0.19], [-0.19, 0.19], [0.19, 0.19]]) B.add('chair', box(lx - 0.02, 0, lz - 0.02, lx + 0.02, 0.42, lz + 0.02))
    })
  }
}

// low criss-cross wooden garden fence along a polyline (photos 145526-145536)
export function fence(B, pts, h = 0.55) {
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1], L = Math.hypot(bx - ax, bz - az)
    const ang = Math.atan2(bz - az, bx - ax)
    B.frame(ax, 0, az, -ang, () => {
      for (let t = 0; t <= L; t += 1.6) B.add('wood', box(t - 0.03, 0, -0.03, t + 0.03, h + 0.1, 0.03))
      B.add('wood', box(0, h - 0.04, -0.02, L, h, 0.02))
      for (let t = 0; t < L - 0.2; t += 0.22) {
        B.add('wood', hexa([[t, 0, -0.01], [t + 0.03, 0, -0.01], [t + 0.03, 0, 0.01], [t, 0, 0.01]],
          [[t + 0.2, h, -0.01], [t + 0.23, h, -0.01], [t + 0.23, h, 0.01], [t + 0.2, h, 0.01]]))
      }
    })
  }
}
