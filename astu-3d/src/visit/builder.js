// Geometry builder: accumulates many small parts per material and merges them into a few
// meshes (one draw call per material). All solids use world-unit UVs (1 uv = 1 m), so the
// textures tile at real-world scale. A separate collider list feeds the walk physics.
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

// materials whose texture is a vertical "band": v runs 0..1 from the bottom to the top edge of
// each wall piece (weathering streaks hang from the top edge, wherever that edge is)
const BAND_KEYS = new Set(['parapet'])

export class Builder {
  constructor() {
    this.parts = new Map() // material key -> geometries
    this.colliders = []
    this.stack = [new THREE.Matrix4()]
  }
  get m() { return this.stack[this.stack.length - 1] }
  push(mat) { this.stack.push(this.m.clone().multiply(mat)) }
  pop() { this.stack.pop() }
  // run fn inside a local frame translated to (x, y, z) and rotated `ry` radians about Y
  frame(x, y, z, ry, fn) {
    this.push(new THREE.Matrix4().makeRotationY(ry).setPosition(x, y, z))
    fn(); this.pop()
  }

  add(key, geo, { collide = false, visible = true } = {}) {
    let g = geo.index ? geo.toNonIndexed() : geo
    if (BAND_KEYS.has(key)) bandUV(g)
    else if (!g.attributes.uv) planarUV(g)
    g.applyMatrix4(this.m)
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k)
    g.clearGroups()
    if (visible) {
      if (!this.parts.has(key)) this.parts.set(key, [])
      this.parts.get(key).push(g)
    }
    if (collide) this.colliders.push(g)
    return g
  }
  // invisible collision-only geometry (ramps under stairs etc.)
  collider(geo) { this.add(null, geo, { collide: true, visible: false }) }

  build(materials, { shadows = true } = {}) {
    const group = new THREE.Group()
    for (const [key, list] of this.parts) {
      const mat = materials[key]
      if (!mat) { console.warn('no material', key); continue }
      const mesh = new THREE.Mesh(mergeGeometries(list), mat)
      mesh.castShadow = shadows && !mat.userData.noShadow
      mesh.receiveShadow = true
      mesh.name = key
      group.add(mesh)
    }
    return group
  }
  colliderGeometry() {
    const list = this.colliders.map((g) => {
      const c = new THREE.BufferGeometry()
      c.setAttribute('position', g.attributes.position.clone())
      return c
    })
    return mergeGeometries(list)
  }
}

// --------------------------------------------------------------------------- primitives
// Vertical prism: plan polygon `pts` = [[x, z], ...] extruded from y0 to y1.
export function prism(pts, y0, y1, holes = []) {
  const shape = new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, -z)))
  for (const h of holes) shape.holes.push(new THREE.Path(h.map(([x, z]) => new THREE.Vector2(x, -z))))
  const g = new THREE.ExtrudeGeometry(shape, { depth: y1 - y0, bevelEnabled: false, curveSegments: 1 })
  g.rotateX(-Math.PI / 2)
  g.translate(0, y0, 0)
  return fixUV(g)
}

// ExtrudeGeometry's side UVs use the extrude axis for v; after rotation that is height. Good.
// Its cap UVs are plan x/-z. Both already in metres; nothing to fix, but keep the hook.
function fixUV(g) { return g }

export function box(x0, y0, z0, x1, y1, z1) {
  return prism([[x0, z0], [x1, z0], [x1, z1], [x0, z1]], y0, y1)
}

// Prism extruded along X: profile = [[z, y], ...] in the Z-Y plane, from x0 to x1.
export function prismX(profile, x0, x1) {
  const shape = new THREE.Shape(profile.map(([z, y]) => new THREE.Vector2(-z, y)))
  const g = new THREE.ExtrudeGeometry(shape, { depth: x1 - x0, bevelEnabled: false, curveSegments: 1 })
  g.rotateY(Math.PI / 2)
  g.translate(x0, 0, 0)
  return g
}

// Wall of thickness t following a plan polyline (miter joints), from y0 to y1.
export function wallPath(path, t, y0, y1, closed = false) {
  const n = path.length
  const L = [], R = []
  for (let i = 0; i < n; i++) {
    const p = path[i]
    const prev = path[closed ? (i - 1 + n) % n : Math.max(0, i - 1)]
    const next = path[closed ? (i + 1) % n : Math.min(n - 1, i + 1)]
    let d1 = norm2(sub2(p, prev)), d2 = norm2(sub2(next, p))
    if (!closed && i === 0) d1 = d2
    if (!closed && i === n - 1) d2 = d1
    const n1 = [-d1[1], d1[0]], n2 = [-d2[1], d2[0]]
    let m = norm2([n1[0] + n2[0], n1[1] + n2[1]])
    const k = Math.max(0.3, m[0] * n1[0] + m[1] * n1[1])
    m = [(m[0] * t) / 2 / k, (m[1] * t) / 2 / k]
    L.push([p[0] + m[0], p[1] + m[1]]); R.push([p[0] - m[0], p[1] - m[1]])
  }
  if (closed) return prism(L, y0, y1, [R])
  return prism(L.concat(R.reverse()), y0, y1)
}

// Arbitrary hexahedron from 8 corners: bottom quad b0..b3 and top quad t0..t3 (same winding).
// Used for sloped stair parapets, tapered brackets and ramps.
export function hexa(b, t) {
  const V = (p) => new THREE.Vector3(...p)
  const faces = [
    [b[0], b[3], b[2], b[1]], [t[0], t[1], t[2], t[3]],
    [b[0], b[1], t[1], t[0]], [b[1], b[2], t[2], t[1]], [b[2], b[3], t[3], t[2]], [b[3], b[0], t[0], t[3]],
  ]
  const pos = []
  for (const [a, bb, c, d] of faces) pos.push(...a, ...bb, ...c, ...a, ...c, ...d)
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  // ensure outward normals regardless of input winding
  g.computeVertexNormals()
  const ctr = new THREE.Vector3(); [...b, ...t].forEach((p) => ctr.add(V(p))); ctr.multiplyScalar(1 / 8)
  const P = g.attributes.position, N = g.attributes.normal
  for (let i = 0; i < P.count; i += 3) {
    const a = new THREE.Vector3().fromBufferAttribute(P, i)
    const n = new THREE.Vector3().fromBufferAttribute(N, i)
    if (n.dot(a.clone().sub(ctr)) < 0) { // flip triangle
      const tmp = new THREE.Vector3().fromBufferAttribute(P, i + 1)
      const c = new THREE.Vector3().fromBufferAttribute(P, i + 2)
      P.setXYZ(i + 1, c.x, c.y, c.z); P.setXYZ(i + 2, tmp.x, tmp.y, tmp.z)
    }
  }
  g.computeVertexNormals()
  planarUV(g)
  return g
}

// Vertical quad (decals: windows, doors, boards) facing +z in local space, u repeats `ru` times.
export function quad(w, h, ru = 1, rv = 1, u0 = 0) {
  const g = new THREE.PlaneGeometry(w, h).toNonIndexed()
  const uv = g.attributes.uv
  for (let i = 0; i < uv.count; i++) uv.setXY(i, u0 + uv.getX(i) * ru, uv.getY(i) * rv)
  return g
}

// Per-triangle planar projection, world units.
export function planarUV(g) {
  const P = g.attributes.position
  if (!g.attributes.normal) g.computeVertexNormals()
  const uv = new Float32Array(P.count * 2)
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), n = new THREE.Vector3()
  for (let i = 0; i < P.count; i += 3) {
    a.fromBufferAttribute(P, i); b.fromBufferAttribute(P, i + 1); c.fromBufferAttribute(P, i + 2)
    n.subVectors(c, b).cross(a.clone().sub(b)).normalize()
    const ax = Math.abs(n.x), ay = Math.abs(n.y), az = Math.abs(n.z)
    for (let k = 0; k < 3; k++) {
      const v = [a, b, c][k]
      let u, w
      if (ay >= ax && ay >= az) { u = v.x; w = v.z } else if (ax >= az) { u = v.z; w = v.y } else { u = v.x; w = v.y }
      uv[(i + k) * 2] = u; uv[(i + k) * 2 + 1] = w
    }
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
  return g
}

// plan-shape helpers ----------------------------------------------------------------
export const sub2 = (a, b) => [a[0] - b[0], a[1] - b[1]]
export const norm2 = (v) => { const l = Math.hypot(v[0], v[1]) || 1; return [v[0] / l, v[1] / l] }
export function arcPts(cx, cz, r, a0, a1, n = 12) {
  return Array.from({ length: n + 1 }, (_, i) => {
    const a = a0 + ((a1 - a0) * i) / n
    return [cx + r * Math.cos(a), cz + r * Math.sin(a)]
  })
}
export function rectPts(x0, z0, x1, z1) { return [[x0, z0], [x1, z0], [x1, z1], [x0, z1]] }

// Band UVs for vertical-sided solids (boxes, extruded wall paths, sloped parapets):
// every (x, z) column of the solid has a bottom and a top vertex -> v = 0 at the bottom, 1 at
// the top, so the texture's top-edge staining follows sloped tops too. u = metres / rep.
export function bandUV(g, rep = 3) {
  const P = g.attributes.position
  const lo = new Map(), hi = new Map()
  const key = (i) => Math.round(P.getX(i) * 200) + '_' + Math.round(P.getZ(i) * 200)
  for (let i = 0; i < P.count; i++) {
    const k = key(i), y = P.getY(i)
    if (!lo.has(k) || y < lo.get(k)) lo.set(k, y)
    if (!hi.has(k) || y > hi.get(k)) hi.set(k, y)
  }
  const uv = new Float32Array(P.count * 2)
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), n = new THREE.Vector3()
  for (let i = 0; i < P.count; i += 3) {
    a.fromBufferAttribute(P, i); b.fromBufferAttribute(P, i + 1); c.fromBufferAttribute(P, i + 2)
    n.subVectors(c, b).cross(a.clone().sub(b)).normalize()
    const flat = Math.abs(n.y) > 0.6
    const l = Math.hypot(n.x, n.z) || 1, tx = -n.z / l, tz = n.x / l
    for (let k = 0; k < 3; k++) {
      const v = [a, b, c][k], id = key(i + k)
      if (flat) { // tops: the weathered upper part of the band; undersides: the clean lower part
        const w = Math.abs((((v.z * 0.37 + v.x * 0.05) % 2) + 2) % 2 - 1)
        uv[(i + k) * 2] = (v.x + v.z * 3) / rep; uv[(i + k) * 2 + 1] = n.y > 0 ? 0.6 + 0.3 * w : 0.2
      }
      else {
        const y0 = lo.get(id), y1 = hi.get(id)
        uv[(i + k) * 2] = (v.x * tx + v.z * tz) / rep
        uv[(i + k) * 2 + 1] = y1 - y0 < 1e-4 ? 0.5 : Math.min(0.99, Math.max(0.01, (v.y - y0) / (y1 - y0)))
      }
    }
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
  return g
}
