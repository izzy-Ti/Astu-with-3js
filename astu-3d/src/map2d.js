// Canvas 2.5D renderer for the ASTU campus plan.
// Map units = full.jpg pixels. Buildings are extruded with an oblique projection (roof shifted up
// by height * tilt), lit by a movable sun, and cast shadows.
import { ROAD_WIDTH, METERS_PER_UNIT } from './data/campus.js'

const TAU = Math.PI * 2
const FLOOR = 3.2 / METERS_PER_UNIT // map units per storey

// ------------------------------------------------------------------ small helpers
const lerp = (a, b, t) => a + (b - a) * t
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
function hexToRgb(h) {
  const n = parseInt(h.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
const rgb = ([r, g, b], a = 1) => `rgba(${r | 0},${g | 0},${b | 0},${a})`
const shade = (c, f) => [clamp(c[0] * f, 0, 255), clamp(c[1] * f, 0, 255), clamp(c[2] * f, 0, 255)]
const mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]

function signedArea(p) {
  let a = 0
  for (let i = 0; i < p.length; i++) {
    const [x1, y1] = p[i], [x2, y2] = p[(i + 1) % p.length]
    a += x1 * y2 - x2 * y1
  }
  return a / 2
}
function pip([x, y], poly) {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}
function centroid(p) {
  let x = 0, y = 0
  for (const q of p) { x += q[0]; y += q[1] }
  return [x / p.length, y / p.length]
}
function bbox(p) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
  for (const [x, y] of p) { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y }
  return [x0, y0, x1, y1]
}
function tracePoly(g, p, dx = 0, dy = 0) {
  g.moveTo(p[0][0] + dx, p[0][1] + dy)
  for (let i = 1; i < p.length; i++) g.lineTo(p[i][0] + dx, p[i][1] + dy)
  g.closePath()
}
function traceLine(g, p) {
  g.moveTo(p[0][0], p[0][1])
  for (let i = 1; i < p.length; i++) g.lineTo(p[i][0], p[i][1])
}
const scalePoly = (p, c, f) => p.map(([x, y]) => [c[0] + (x - c[0]) * f, c[1] + (y - c[1]) * f])

// value noise
function hash(x, y) {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295
}
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf)
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1)
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v
}
function fbm(x, y, o = 4) {
  let s = 0, amp = 0.5, f = 1, n = 0
  for (let i = 0; i < o; i++) { s += vnoise(x * f, y * f) * amp; n += amp; amp *= 0.5; f *= 2 }
  return s / n
}
function rand(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ------------------------------------------------------------------ styles
const WALL = {
  dorm: '#ece6d9', dormRed: '#efe2cf', block: '#e7e2d7', academic: '#e3e6e8', academicC: '#e3e6e8',
  hall: '#d9dcdd', tri: '#ece6d9', modern: '#59636d', glass: '#3c5a8e', grandstand: '#8a96a3', staff: '#e8dfcf', gym: '#7f8b97',
}
const AREA = {
  water: '#3b88a8', pond: '#3f8a62', farm: '#7d6643', field: '#bea36d', sand: '#d6c39a', park: '#6f8d4a',
  track: '#a9553b', pitch: '#5b9a45', court: '#4e7f6c', arena: '#b8743f', paved: '#9c9fa2', gravel: '#aca597',
  concrete: '#aaa79f', clay: '#b4673e', hardcourt: '#aeb3b0', dirt: '#97784d', grass: '#5a8d41', brick: '#b28a73',
}

// ------------------------------------------------------------------ sprites
function treeSprite(base, seed, purple = false) {
  const S = 64, c = document.createElement('canvas')
  c.width = c.height = S
  const g = c.getContext('2d'), r = rand(seed), col = hexToRgb(base)
  const blobs = [[32, 32, 22]]
  for (let i = 0; i < 7; i++) {
    const a = r() * TAU, d = 9 + r() * 6
    blobs.push([32 + Math.cos(a) * d, 32 + Math.sin(a) * d, 9 + r() * 5])
  }
  // dark rim
  for (const [x, y, rr] of blobs) {
    g.beginPath(); g.arc(x, y, rr + 1.5, 0, TAU); g.fillStyle = rgb(shade(col, 0.55)); g.fill()
  }
  for (const [x, y, rr] of blobs) {
    const gr = g.createRadialGradient(x - rr * 0.4, y - rr * 0.45, rr * 0.1, x, y, rr)
    gr.addColorStop(0, rgb(shade(col, purple ? 1.35 : 1.45)))
    gr.addColorStop(0.55, rgb(col))
    gr.addColorStop(1, rgb(shade(col, 0.72)))
    g.beginPath(); g.arc(x, y, rr, 0, TAU); g.fillStyle = gr; g.fill()
  }
  // leaf speckle
  for (let i = 0; i < 70; i++) {
    const a = r() * TAU, d = r() * 24
    g.fillStyle = rgb(shade(col, 0.7 + r() * 0.8), 0.5)
    g.beginPath(); g.arc(32 + Math.cos(a) * d, 32 + Math.sin(a) * d, 0.8 + r() * 1.6, 0, TAU); g.fill()
  }
  return c
}
function grainPattern(g) {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const x = c.getContext('2d'), img = x.createImageData(128, 128), r = rand(99)
  for (let i = 0; i < img.data.length; i += 4) {
    const v = r()
    const dark = v < 0.5
    img.data[i] = img.data[i + 1] = img.data[i + 2] = dark ? 40 : 255
    img.data[i + 3] = (Math.abs(v - 0.5) * 2) ** 3 * 70
  }
  x.putImageData(img, 0, 0)
  return g.createPattern(c, 'repeat')
}

// ------------------------------------------------------------------ main
export function createMap(container, campus, cb = {}) {
  const W = campus.map.width, H = campus.map.height
  const canvas = document.createElement('canvas')
  canvas.className = 'map'
  container.appendChild(canvas)
  const ctx = canvas.getContext('2d')
  const shadowCanvas = document.createElement('canvas')
  const sctx = shadowCanvas.getContext('2d')
  const mini = document.createElement('canvas')
  mini.className = 'minimap'
  container.appendChild(mini)

  const state = {
    cx: W / 2, cy: H / 2, scale: 1,
    layers: { zones: false, areas: true, roads: true, trees: true, buildings: true, labels: true, shadows: true },
    sat: 0, tilt: 0.85, sunAz: 315, shadowLen: 0.9,
    hover: null, selected: null, filterType: null, activeZone: null,
  }
  let cw = 0, ch = 0, dpr = 1

  // ---------- prepare buildings
  const blds = campus.buildings.map((b) => {
    const poly = signedArea(b.poly) < 0 ? b.poly.slice().reverse() : b.poly.slice()
    const type = campus.types[b.type]
    const roof = b.roofColor ? mix(hexToRgb(type.color), hexToRgb(b.roofColor), 0.55) : hexToRgb(type.color)
    const edges = poly.map((a, i) => {
      const c = poly[(i + 1) % poly.length]
      const dx = c[0] - a[0], dy = c[1] - a[1], len = Math.hypot(dx, dy) || 1
      return { a, b: c, n: [dy / len, -dx / len], len, my: (a[1] + c[1]) / 2 }
    }).sort((e1, e2) => e1.my - e2.my)
    let facets = null
    if (poly.length === 4 && !b.hole && !type.flat) {
      const [p0, p1, p2, p3] = poly
      const right = Math.abs(((p1[0] - p0[0]) * (p2[0] - p1[0]) + (p1[1] - p0[1]) * (p2[1] - p1[1])) /
        (Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) * Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) || 1)) < 0.2
      if (right) facets = hipRoof(poly)
    }
    const bb = bbox(poly)
    return { ...b, poly, roof, wall: hexToRgb(WALL[b.type] || '#e5e0d5'), edges, facets, bb, c: centroid(poly), key: bb[3] }
  })
  const byId = new Map(blds.map((b) => [b.id, b]))

  function hipRoof([p0, p1, p2, p3]) {
    let a = [p0, p1, p2, p3]
    if (Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) < Math.hypot(p2[0] - p1[0], p2[1] - p1[1])) a = [p1, p2, p3, p0]
    const [q0, q1, q2, q3] = a
    const L = Math.hypot(q1[0] - q0[0], q1[1] - q0[1]), Wd = Math.hypot(q2[0] - q1[0], q2[1] - q1[1])
    const u = [(q1[0] - q0[0]) / L, (q1[1] - q0[1]) / L]
    const inset = Math.min(Wd / 2, L / 2)
    const m0 = [(q0[0] + q3[0]) / 2, (q0[1] + q3[1]) / 2], m1 = [(q1[0] + q2[0]) / 2, (q1[1] + q2[1]) / 2]
    const r0 = [m0[0] + u[0] * inset, m0[1] + u[1] * inset], r1 = [m1[0] - u[0] * inset, m1[1] - u[1] * inset]
    const ctr = centroid(a)
    const f = (pts) => {
      const mid = centroid(pts.slice(0, 2)), d = [mid[0] - ctr[0], mid[1] - ctr[1]], l = Math.hypot(...d) || 1
      return { pts, n: [d[0] / l, d[1] / l] }
    }
    return [f([q0, q1, r1, r0]), f([q1, q2, r1]), f([q2, q3, r0, r1]), f([q3, q0, r0])]
  }

  // ---------- trees (sorted with buildings for depth)
  const SPRITES = {
    g: [treeSprite('#4c6a30', 1), treeSprite('#5b7a37', 2), treeSprite('#3f5b2a', 3), treeSprite('#66803c', 4)],
    p: [treeSprite('#7a5d93', 5, true), treeSprite('#6c5487', 6, true)],
  }
  const trees = campus.trees.map((t, i) => ({ ...t, sprite: SPRITES[t.kind === 'p' ? 'p' : 'g'][i % (t.kind === 'p' ? 2 : 4)], key: t.y }))
  const drawList = [...trees.map((t) => ({ t })), ...blds.map((b) => ({ b }))].sort(
    (A, B) => (A.t ? A.t.key : A.b.key) - (B.t ? B.t.key : B.b.key),
  )

  // ---------- terrain texture (static)
  const terrain = buildTerrain()
  function buildTerrain() {
    const R = 0.5, tw = Math.ceil(W * R), th = Math.ceil(H * R)
    // tree density field
    const cell = 6, gw = Math.ceil(W / cell), gh = Math.ceil(H / cell)
    let dens = new Float32Array(gw * gh)
    for (const t of campus.trees) dens[((t.y / cell) | 0) * gw + ((t.x / cell) | 0)] += 1
    for (let pass = 0; pass < 3; pass++) {
      const nd = new Float32Array(gw * gh)
      for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) {
        let s = 0, n = 0
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx, yy = y + dy
          if (xx >= 0 && yy >= 0 && xx < gw && yy < gh) { s += dens[yy * gw + xx]; n++ }
        }
        nd[y * gw + x] = s / n
      }
      dens = nd
    }
    const c = document.createElement('canvas')
    c.width = tw; c.height = th
    const g = c.getContext('2d'), img = g.createImageData(tw, th)
    const dry = [184, 160, 112], soil = [160, 131, 90], grass = [138, 136, 84], forest = [98, 100, 64]
    for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) {
      const mx = x / R, my = y / R
      const n1 = fbm(mx / 70, my / 70), n2 = fbm(mx / 16 + 50, my / 16 + 20, 3), n3 = vnoise(mx / 2.2, my / 2.2)
      let col = mix(dry, soil, clamp((n1 - 0.35) * 2, 0, 1))
      col = mix(col, grass, clamp((n2 - 0.45) * 1.6, 0, 0.55))
      const d = clamp(dens[((my / cell) | 0) * gw + ((mx / cell) | 0)] / 2.2, 0, 1)
      col = mix(col, forest, d * 0.75)
      col = shade(col, 0.93 + n3 * 0.14)
      const i = (y * tw + x) * 4
      img.data[i] = col[0]; img.data[i + 1] = col[1]; img.data[i + 2] = col[2]; img.data[i + 3] = 255
    }
    g.putImageData(img, 0, 0)
    return c
  }
  const grain = grainPattern(ctx)
  const sat = new Image()
  sat.src = new URL('../photos/top_satelite/full.jpg', import.meta.url).href
  sat.onload = () => request()

  // ================================================================== drawing
  const sun = () => {
    const a = (state.sunAz * Math.PI) / 180
    return [Math.sin(a), -Math.cos(a)] // unit vector pointing towards the sun (x east, y south)
  }

  function drawGround(g, s) {
    g.save()
    g.beginPath(); tracePoly(g, campus.boundary); g.clip()
    g.imageSmoothingEnabled = true
    g.drawImage(terrain, 0, 0, W, H)
    if (s > 0.6) {
      grain.setTransform(new DOMMatrix().scale(0.22))
      g.fillStyle = grain
      g.fillRect(0, 0, W, H)
    }
    g.restore()
  }

  function drawAreas(g, s) {
    const r = rand(5)
    for (const a of campus.areas) {
      const base = hexToRgb(AREA[a.kind] || AREA.field)
      const c = a.c || (a.c = centroid(a.poly))
      const bb = a.bb || (a.bb = bbox(a.poly))
      g.save()
      g.beginPath(); tracePoly(g, a.poly); g.clip()
      g.fillStyle = rgb(base); g.fillRect(bb[0], bb[1], bb[2] - bb[0], bb[3] - bb[1])
      if (a.kind === 'water' || a.kind === 'pond') {
        const gr = g.createRadialGradient(c[0], c[1], 0, c[0], c[1], Math.max(bb[2] - bb[0], bb[3] - bb[1]) * 0.6)
        gr.addColorStop(0, rgb(shade(base, 1.25))); gr.addColorStop(1, rgb(shade(base, 0.8)))
        g.fillStyle = gr; g.fill()
        g.strokeStyle = 'rgba(255,255,255,0.18)'; g.lineWidth = 0.4
        for (let y = bb[1] + 2; y < bb[3]; y += 3.2) { g.beginPath(); g.moveTo(bb[0], y); g.lineTo(bb[2], y + 1); g.stroke() }
      } else if (a.kind === 'farm') {
        const [p0, p1] = a.poly, ang = Math.atan2(p1[1] - p0[1], p1[0] - p0[0])
        g.translate(c[0], c[1]); g.rotate(ang)
        const R2 = Math.hypot(bb[2] - bb[0], bb[3] - bb[1])
        for (let y = -R2; y < R2; y += 1.4) {
          g.fillStyle = r() < 0.5 ? 'rgba(70,90,40,0.35)' : 'rgba(60,40,20,0.3)'
          g.fillRect(-R2, y, R2 * 2, 0.7)
        }
      } else if (a.kind === 'track' || a.kind === 'clay' || a.kind === 'dirt') {
        // worn, dusty surface: soft blotches + grain
        const rr = rand(Math.round(c[0] * 7 + c[1]))
        const span = Math.max(bb[2] - bb[0], bb[3] - bb[1])
        for (let i = 0; i < 26; i++) {
          const x = lerp(bb[0], bb[2], rr()), y = lerp(bb[1], bb[3], rr()), rad = span * (0.05 + rr() * 0.12)
          const gr = g.createRadialGradient(x, y, 0, x, y, rad)
          const col = rr() < 0.5 ? [205, 170, 120] : [90, 60, 35]
          gr.addColorStop(0, rgb(col, 0.22)); gr.addColorStop(1, rgb(col, 0))
          g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2)
        }
        g.fillStyle = grain; grain.setTransform(new DOMMatrix().scale(0.12)); g.fillRect(bb[0], bb[1], bb[2] - bb[0], bb[3] - bb[1])
      } else if (a.kind === 'grass') {
        // mowing stripes + worn patches
        const band = 5.5 / METERS_PER_UNIT
        for (let i = 0, y = bb[1]; y < bb[3]; y += band, i++) {
          g.fillStyle = i % 2 ? 'rgba(255,255,230,0.07)' : 'rgba(0,30,0,0.06)'
          g.fillRect(bb[0], y, bb[2] - bb[0], band)
        }
        const rr = rand(77), span = Math.max(bb[2] - bb[0], bb[3] - bb[1])
        for (let i = 0; i < 34; i++) {
          const x = lerp(bb[0], bb[2], rr()), y = lerp(bb[1], bb[3], rr()), rad = span * (0.03 + rr() * 0.09)
          const gr = g.createRadialGradient(x, y, 0, x, y, rad)
          const col = rr() < 0.55 ? [40, 60, 30] : [170, 160, 90]
          gr.addColorStop(0, rgb(col, 0.28)); gr.addColorStop(1, rgb(col, 0))
          g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2)
        }
        g.fillStyle = grain; grain.setTransform(new DOMMatrix().scale(0.1)); g.fillRect(bb[0], bb[1], bb[2] - bb[0], bb[3] - bb[1])
      } else if (a.kind === 'hardcourt') {
        const gr = g.createLinearGradient(bb[0], bb[1], bb[2], bb[3])
        gr.addColorStop(0, 'rgba(255,255,255,0.1)'); gr.addColorStop(1, 'rgba(0,0,0,0.08)')
        g.fillStyle = gr; g.fillRect(bb[0], bb[1], bb[2] - bb[0], bb[3] - bb[1])
        g.fillStyle = grain; grain.setTransform(new DOMMatrix().scale(0.1)); g.fillRect(bb[0], bb[1], bb[2] - bb[0], bb[3] - bb[1])
      } else if (a.kind === 'concrete' || a.kind === 'brick') {
        g.fillStyle = grain; grain.setTransform(new DOMMatrix().scale(0.15)); g.fillRect(bb[0], bb[1], bb[2] - bb[0], bb[3] - bb[1])
        if (s > 2.5) {
          const step = a.kind === 'brick' ? 0.5 : 2.2
          g.strokeStyle = a.kind === 'brick' ? 'rgba(90,50,35,0.18)' : 'rgba(0,0,0,0.07)'; g.lineWidth = 0.06
          g.beginPath()
          for (let x = Math.floor(bb[0]); x < bb[2]; x += step) { g.moveTo(x, bb[1]); g.lineTo(x, bb[3]) }
          for (let y = Math.floor(bb[1]); y < bb[3]; y += step * (a.kind === 'brick' ? 2 : 1)) { g.moveTo(bb[0], y); g.lineTo(bb[2], y) }
          g.stroke()
        }
      } else if (a.kind === 'pitch') {
        const pw = 68 / METERS_PER_UNIT, ph = 105 / METERS_PER_UNIT
        for (let i = 0, y = c[1] - ph / 2 - 10; y < c[1] + ph / 2 + 10; y += ph / 12, i++) {
          g.fillStyle = i % 2 ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)'
          g.fillRect(bb[0], y, bb[2] - bb[0], ph / 12)
        }
        g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 0.35
        g.strokeRect(c[0] - pw / 2, c[1] - ph / 2, pw, ph)
        g.beginPath(); g.moveTo(c[0] - pw / 2, c[1]); g.lineTo(c[0] + pw / 2, c[1]); g.stroke()
        g.beginPath(); g.arc(c[0], c[1], 9.15 / METERS_PER_UNIT, 0, TAU); g.stroke()
        const bw = 40.3 / METERS_PER_UNIT, bh = 16.5 / METERS_PER_UNIT
        g.strokeRect(c[0] - bw / 2, c[1] - ph / 2, bw, bh)
        g.strokeRect(c[0] - bw / 2, c[1] + ph / 2 - bh, bw, bh)
      } else if (a.kind === 'court') {
        g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 0.3
        const ins = scalePoly(a.poly, c, 0.8)
        g.beginPath(); tracePoly(g, ins); g.stroke()
        g.beginPath(); g.moveTo(...centroid([ins[0], ins[3]])); g.lineTo(...centroid([ins[1], ins[2]])); g.stroke()
      } else if (a.kind === 'paved' && /stands/i.test(a.name || '')) {
        g.strokeStyle = 'rgba(40,44,50,0.45)'; g.lineWidth = 0.25
        for (let f = 0.99; f > 0.8; f -= 0.022) { g.beginPath(); tracePoly(g, scalePoly(a.poly, c, f)); g.stroke() }
      } else if (a.kind === 'paved' && s > 2) {
        g.strokeStyle = 'rgba(0,0,0,0.06)'; g.lineWidth = 0.15
        for (let x = Math.floor(bb[0]); x < bb[2]; x += 2) { g.beginPath(); g.moveTo(x, bb[1]); g.lineTo(x, bb[3]); g.stroke() }
      } else if (a.kind === 'park' || a.kind === 'field' || a.kind === 'sand' || a.kind === 'gravel') {
        g.fillStyle = grain
        grain.setTransform(new DOMMatrix().scale(0.3))
        g.fillRect(bb[0], bb[1], bb[2] - bb[0], bb[3] - bb[1])
      }
      g.restore()
      if (a.grid) drawGrid(g, a)
      g.beginPath(); tracePoly(g, a.poly)
      g.strokeStyle = a.kind === 'water' || a.kind === 'pond' ? 'rgba(230,240,235,0.55)' : rgb(shade(base, 0.75), 0.8)
      g.lineWidth = a.kind === 'water' || a.kind === 'pond' ? 0.8 : a.kind === 'grass' || a.kind === 'concrete' ? 0.2 : 0.5
      g.stroke()
    }
    drawDecor(g, s)
  }

  // painted lines / markings (pitch, lanes, courts)
  function drawDecor(g, s) {
    g.lineCap = 'round'; g.lineJoin = 'round'
    for (const d of campus.decor || []) {
      g.beginPath(); (d.closed ? tracePoly : traceLine)(g, d.pts)
      if (d.fill) { g.fillStyle = d.fill; g.fill() }
      if (d.stroke) {
        g.strokeStyle = d.stroke; g.lineWidth = Math.max(d.width, 0.7 / s)
        g.globalAlpha = s < 1.5 ? 0.6 : 1
        g.stroke(); g.globalAlpha = 1
      }
    }
  }

  // ------------------------------------------------------------------ stepped terraces (stadium, courts)
  const standsPrep = (campus.stands || []).map((st) => {
    const rings = st.rings.map((r) => (signedArea(r) < 0 ? r.slice().reverse() : r))
    const hu = st.heights.map((h) => h / METERS_PER_UNIT)
    const normals = rings.map((r) => r.map((a, i) => {
      const b = r[(i + 1) % r.length], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1
      return [dy / l, -dx / l]
    }))
    return { ...st, rings, hu, normals, tread: hexToRgb(st.tread), riser: hexToRgb(st.riser), wall: hexToRgb(st.wall), bb: bbox(rings[rings.length - 1]) }
  })
  // vertical faces along a ring between heights h0..h1; facing +1 = outward faces, -1 = inward faces
  function wallQuads(g, ring, nrm, h0, h1, facing, color, sv) {
    for (let i = 0; i < ring.length; i++) {
      const n = [nrm[i][0] * facing, nrm[i][1] * facing]
      if (n[1] <= 0.02) continue
      const a = ring[i], b = ring[(i + 1) % ring.length]
      const lit = 0.6 + 0.4 * Math.max(0, n[0] * sv[0] + n[1] * sv[1])
      g.beginPath()
      g.moveTo(a[0], a[1] - h0); g.lineTo(b[0], b[1] - h0); g.lineTo(b[0], b[1] - h1); g.lineTo(a[0], a[1] - h1); g.closePath()
      g.fillStyle = rgb(shade(color, lit)); g.fill()
      g.strokeStyle = rgb(shade(color, lit)); g.lineWidth = 0.05; g.stroke()
    }
  }
  function drawStands(g, s, view) {
    const t = state.tilt, sv = sun()
    for (const st of standsPrep) {
      if (!inView(st.bb, view, 20)) continue
      const R = st.rings, hu = st.hu.map((h) => h * t), N = R.length - 1
      wallQuads(g, R[0], st.normals[0], 0, hu[0], -1, st.wall, sv) // front parapet
      for (let i = 0; i < N; i++) {
        g.beginPath(); tracePoly(g, R[i + 1], 0, -hu[i]); tracePoly(g, R[i], 0, -hu[i])
        g.fillStyle = rgb(shade(st.tread, i % 2 ? 1.04 : 0.97)); g.fill('evenodd')
        wallQuads(g, R[i + 1], st.normals[i + 1], hu[i], hu[i + 1], -1, st.riser, sv)
      }
      const capIn = R[N], capOut = scalePoly(R[N], centroid(R[N]), 1.006)
      g.beginPath(); tracePoly(g, capOut, 0, -hu[N]); tracePoly(g, capIn, 0, -hu[N])
      g.fillStyle = rgb(shade(st.wall, 1.15)); g.fill('evenodd')
      if (s > 1.2 && st.aisles) {
        g.strokeStyle = 'rgba(235,230,220,0.85)'; g.lineWidth = Math.max(0.35, 0.8 / s)
        const n = R[0].length
        g.beginPath()
        for (let k = 0; k < st.aisles; k++) {
          const idx = Math.round(((k + 0.5) * n) / st.aisles) % n
          for (let i = 0; i <= N; i++) {
            const p = R[i][idx], h = hu[Math.max(0, i - 1)]
            if (i) g.lineTo(p[0], p[1] - h); else g.moveTo(p[0], p[1] - hu[0])
          }
        }
        g.stroke()
      }
      wallQuads(g, R[N], st.normals[N], 0, hu[N], 1, st.wall, sv) // back wall
      // entrance tunnels: covered ramps cutting through the terraces (orange roofs)
      for (const idx of st.gates || []) {
        const n = R[0].length, i0 = (idx - 1 + n) % n, i1 = (idx + 1) % n
        const a0 = R[0][i0], a1 = R[0][i1], b0 = R[N][i0], b1 = R[N][i1]
        g.beginPath()
        g.moveTo(a0[0], a0[1] - hu[0]); g.lineTo(a1[0], a1[1] - hu[0])
        g.lineTo(b1[0], b1[1] - hu[N] - 0.4); g.lineTo(b0[0], b0[1] - hu[N] - 0.4); g.closePath()
        const gr = g.createLinearGradient(a0[0], a0[1] - hu[0], b0[0], b0[1] - hu[N])
        gr.addColorStop(0, '#b0663f'); gr.addColorStop(1, '#d9925c')
        g.fillStyle = gr; g.fill()
        g.strokeStyle = 'rgba(70,40,25,0.7)'; g.lineWidth = 0.15; g.stroke()
        g.beginPath(); g.moveTo(a0[0], a0[1] - hu[0]); g.lineTo(a1[0], a1[1] - hu[0])
        g.strokeStyle = '#2b2522'; g.lineWidth = 0.6; g.stroke() // tunnel mouth
      }
    }
  }
  function drawGrid(g, a) {
    const [cols, rows] = a.grid, [p0, p1, p2, p3] = a.poly
    const bl = (u, v) => [
      (1 - u) * (1 - v) * p0[0] + u * (1 - v) * p1[0] + u * v * p2[0] + (1 - u) * v * p3[0],
      (1 - u) * (1 - v) * p0[1] + u * (1 - v) * p1[1] + u * v * p2[1] + (1 - u) * v * p3[1],
    ]
    const r = rand(cols * 31 + rows)
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
      g.beginPath()
      tracePoly(g, [bl(i / cols, j / rows), bl((i + 1) / cols, j / rows), bl((i + 1) / cols, (j + 1) / rows), bl(i / cols, (j + 1) / rows)])
      g.fillStyle = r() < 0.5 ? 'rgba(90,120,50,0.35)' : 'rgba(150,110,60,0.25)'
      g.fill()
    }
    g.strokeStyle = '#5b4a2f'; g.lineWidth = 1.1; g.beginPath()
    for (let i = 1; i < cols; i++) traceLine(g, [bl(i / cols, 0), bl(i / cols, 1)])
    for (let j = 1; j < rows; j++) traceLine(g, [bl(0, j / rows), bl(1, j / rows)])
    g.stroke()
  }

  function drawRoads(g, s) {
    g.lineCap = 'round'; g.lineJoin = 'round'
    const pass = (kinds, widthAdd, color, dash) => {
      g.strokeStyle = color; g.setLineDash(dash || [])
      for (const r of campus.roads) {
        if (!kinds.includes(r.kind)) continue
        g.lineWidth = ROAD_WIDTH[r.kind] + widthAdd
        g.beginPath(); traceLine(g, r.pts); g.stroke()
      }
    }
    pass(['path'], 0.9, 'rgba(120,98,62,0.6)')
    pass(['path'], 0, '#d3bf93')
    pass(['main', 'road'], 3.2, 'rgba(214,205,186,0.95)') // sidewalk / verge
    pass(['main', 'road', 'lane'], 1.2, '#3e3c39')         // curb
    pass(['lane'], 0, '#6f706f')
    pass(['road'], 0, '#7d7d7b')
    pass(['main'], 0, '#5e5f61')
    if (s > 0.9) {
      g.lineWidth = 0.35
      pass(['main'], -ROAD_WIDTH.main + 0.35, '#e6c35c', [3, 2.6])
      pass(['road'], -ROAD_WIDTH.road + 0.25, 'rgba(255,255,255,0.7)', [2.2, 2.6])
    }
    g.setLineDash([])
  }

  function drawShadows(g, s, view) {
    const sv = sun(), k = state.shadowLen
    const sx = -sv[0] * k, sy = -sv[1] * k
    g.fillStyle = '#000'
    if (state.layers.buildings) for (const b of blds) {
      if (!inView(b.bb, view, 30)) continue
      const h = b.floors * FLOOR, ox = sx * h, oy = sy * h
      g.beginPath()
      tracePoly(g, b.poly); tracePoly(g, b.poly, ox, oy)
      for (const e of b.edges) {
        g.moveTo(e.a[0], e.a[1]); g.lineTo(e.b[0], e.b[1]); g.lineTo(e.b[0] + ox, e.b[1] + oy); g.lineTo(e.a[0] + ox, e.a[1] + oy); g.closePath()
      }
      g.fill('nonzero')
    }
    if (state.layers.buildings) for (const st of standsPrep) {
      if (!inView(st.bb, view, 40)) continue
      const ring = st.rings[st.rings.length - 1], h = st.hu[st.hu.length - 1], ox = sx * h, oy = sy * h
      g.beginPath(); tracePoly(g, ring, ox, oy)
      for (let i = 0; i < ring.length; i++) {
        const a = ring[i], b = ring[(i + 1) % ring.length]
        g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(b[0] + ox, b[1] + oy); g.lineTo(a[0] + ox, a[1] + oy); g.closePath()
      }
      g.fill('nonzero')
    }
    if (state.layers.trees) {
      g.beginPath()
      for (const t of trees) {
        if (t.x < view[0] - 10 || t.x > view[2] + 10 || t.y < view[1] - 10 || t.y > view[3] + 10) continue
        const th = t.r * 1.7
        const x = t.x + sx * th, y = t.y + sy * th
        g.moveTo(x + t.r, y); g.ellipse(x, y, t.r * 0.95, t.r * 0.85, 0, 0, TAU)
      }
      g.fill()
    }
  }

  function drawBuilding(g, b, s) {
    const h = b.floors * FLOOR * state.tilt
    const sv = sun()
    const dim = state.filterType && b.type !== state.filterType
    g.globalAlpha = dim ? 0.18 : 1
    // walls (south-facing in this oblique view)
    if (h > 0.05) {
      for (const e of b.edges) {
        if (e.n[1] <= 0.01) continue
        const lit = 0.62 + 0.38 * Math.max(0, e.n[0] * sv[0] + e.n[1] * sv[1])
        g.beginPath()
        g.moveTo(e.a[0], e.a[1]); g.lineTo(e.b[0], e.b[1]); g.lineTo(e.b[0], e.b[1] - h); g.lineTo(e.a[0], e.a[1] - h); g.closePath()
        g.fillStyle = rgb(shade(b.wall, lit)); g.fill()
        // windows per floor
        if (s * FLOOR * state.tilt > 5 && e.len > 3) {
          const fh = FLOOR * state.tilt
          g.strokeStyle = b.type === 'modern' || b.type === 'glass' ? 'rgba(150,200,240,0.55)' : 'rgba(55,70,85,0.6)'
          g.lineWidth = fh * 0.38
          g.setLineDash([1.1, 0.9])
          for (let f = 0; f < b.floors; f++) {
            const y = -(f + 0.55) * fh
            g.beginPath(); g.moveTo(e.a[0] + (e.b[0] - e.a[0]) * 0.04, e.a[1] + (e.b[1] - e.a[1]) * 0.04 + y)
            g.lineTo(e.b[0] - (e.b[0] - e.a[0]) * 0.04, e.b[1] - (e.b[1] - e.a[1]) * 0.04 + y); g.stroke()
          }
          g.setLineDash([])
        }
        g.strokeStyle = rgb(shade(b.wall, 0.5), 0.5); g.lineWidth = 0.15; g.stroke()
      }
    }
    // courtyard
    if (b.hole) {
      g.save()
      g.beginPath(); tracePoly(g, b.hole, 0, -h); g.clip()
      g.fillStyle = rgb(shade(b.wall, 0.78)); g.fill()
      g.beginPath(); tracePoly(g, b.hole); g.fillStyle = '#56604a'; g.fill()
      g.restore()
    }
    // roof
    if (b.facets) {
      for (const f of b.facets) {
        const lit = 0.84 + 0.3 * (f.n[0] * sv[0] + f.n[1] * sv[1])
        g.beginPath(); tracePoly(g, f.pts, 0, -h)
        g.fillStyle = rgb(shade(b.roof, lit)); g.fill()
        g.strokeStyle = rgb(shade(b.roof, lit * 0.92)); g.lineWidth = 0.12; g.stroke()
      }
      // corrugation lines when close
      if (s > 4) {
        g.save(); g.beginPath(); tracePoly(g, b.poly, 0, -h); g.clip()
        g.strokeStyle = 'rgba(0,0,0,0.06)'; g.lineWidth = 0.1
        const [x0, y0, x1, y1] = b.bb
        for (let x = x0; x < x1; x += 0.7) { g.beginPath(); g.moveTo(x, y0 - h); g.lineTo(x, y1 - h); g.stroke() }
        g.restore()
      }
    } else {
      g.beginPath(); tracePoly(g, b.poly, 0, -h)
      if (b.hole) tracePoly(g, b.hole, 0, -h)
      const [x0, y0, x1, y1] = b.bb
      const gr = g.createLinearGradient(x0 + sv[0] * 5, y0 - h + sv[1] * 5, x1, y1 - h)
      gr.addColorStop(0, rgb(shade(b.roof, 1.1))); gr.addColorStop(1, rgb(shade(b.roof, 0.9)))
      g.fillStyle = gr; g.fill('evenodd')
      // parapet highlight
      g.save(); g.clip('evenodd')
      g.strokeStyle = rgb(shade(b.roof, 1.25), 0.8); g.lineWidth = 0.9; g.stroke()
      g.restore()
    }
    g.beginPath(); tracePoly(g, b.poly, 0, -h)
    g.strokeStyle = rgb(shade(b.roof, 0.55), 0.9); g.lineWidth = Math.max(0.12, 0.6 / s); g.stroke()
    g.globalAlpha = 1
  }

  function outline(g, b, color, w) {
    const h = b.floors * FLOOR * state.tilt
    g.beginPath(); tracePoly(g, b.poly, 0, -h)
    for (const e of b.edges) if (e.n[1] > 0.01) { g.moveTo(e.a[0], e.a[1]); g.lineTo(e.b[0], e.b[1]) }
    g.strokeStyle = color; g.lineWidth = w; g.lineJoin = 'round'; g.stroke()
  }

  function drawZones(g, s) {
    for (const z of campus.zones) {
      const active = state.activeZone === z.id
      g.beginPath(); tracePoly(g, z.poly)
      g.fillStyle = z.color + (active ? '40' : '1c'); g.fill()
      g.setLineDash([6 / s * 2, 4 / s * 2]); g.lineWidth = (active ? 3 : 1.6) / s * 1.4
      g.strokeStyle = z.color; g.stroke(); g.setLineDash([])
    }
  }

  const inView = (bb, v, pad = 0) => bb[2] > v[0] - pad && bb[0] < v[2] + pad && bb[3] > v[1] - pad && bb[1] < v[3] + pad

  function render() {
    raf = 0
    const s = state.scale
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    // backdrop
    const bg = ctx.createRadialGradient(cw * dpr / 2, ch * dpr * 0.4, 0, cw * dpr / 2, ch * dpr / 2, Math.max(cw, ch) * dpr)
    bg.addColorStop(0, '#2a3138'); bg.addColorStop(1, '#101317')
    ctx.fillStyle = bg; ctx.fillRect(0, 0, canvas.width, canvas.height)

    const T = [dpr * s, 0, 0, dpr * s, dpr * (cw / 2 - state.cx * s), dpr * (ch / 2 - state.cy * s)]
    ctx.setTransform(...T)
    const view = [state.cx - cw / 2 / s, state.cy - ch / 2 / s, state.cx + cw / 2 / s, state.cy + ch / 2 / s]

    // campus edge glow
    ctx.save()
    ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 30 * dpr
    ctx.beginPath(); tracePoly(ctx, campus.boundary); ctx.fillStyle = '#a99266'; ctx.fill()
    ctx.restore()

    drawGround(ctx, s)
    ctx.save()
    ctx.beginPath(); tracePoly(ctx, campus.boundary); ctx.clip()
    if (state.layers.areas) drawAreas(ctx, s)
    if (state.layers.roads) drawRoads(ctx, s)

    // shadows into offscreen, composited with alpha
    if (state.layers.shadows && (state.layers.buildings || state.layers.trees)) {
      sctx.setTransform(1, 0, 0, 1, 0, 0)
      sctx.clearRect(0, 0, shadowCanvas.width, shadowCanvas.height)
      sctx.setTransform(...T)
      drawShadows(sctx, s, view)
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.globalAlpha = 0.32; ctx.drawImage(shadowCanvas, 0, 0); ctx.restore()
    }
    ctx.restore()

    if (state.layers.buildings) drawStands(ctx, s, view)

    // depth-sorted trees + buildings
    const tiltH = 6 * FLOOR * state.tilt
    for (const it of drawList) {
      if (it.t) {
        if (!state.layers.trees) continue
        const t = it.t
        if (t.x < view[0] - 8 || t.x > view[2] + 8 || t.y < view[1] - 8 || t.y > view[3] + 8 + tiltH) continue
        const lift = t.r * 1.7 * state.tilt * 0.55
        const r = t.r * 1.12
        ctx.drawImage(t.sprite, t.x - r, t.y - r - lift, r * 2, r * 2)
      } else {
        if (!state.layers.buildings) continue
        if (!inView(it.b.bb, view, 4 + tiltH)) continue
        drawBuilding(ctx, it.b, s)
      }
    }

    if (state.layers.zones) drawZones(ctx, s)

    if (state.sat > 0 && sat.complete) {
      ctx.save(); ctx.globalAlpha = state.sat
      ctx.beginPath(); tracePoly(ctx, campus.boundary); ctx.clip()
      ctx.drawImage(sat, 0, 0, W, H); ctx.restore()
    }

    const hv = state.hover && byId.get(state.hover)
    if (hv && state.layers.buildings) outline(ctx, hv, 'rgba(255,255,255,0.95)', 1.4 / s * 1.2)
    const sel = state.selected && byId.get(state.selected)
    if (sel && state.layers.buildings) {
      outline(ctx, sel, 'rgba(0,0,0,0.5)', 5 / s)
      outline(ctx, sel, '#f0b429', 2.6 / s)
    }

    // ---- screen-space overlays
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    if (state.layers.labels) drawLabels(ctx, s)
    drawScaleBar(ctx, s)
    drawMinimap()
  }

  const toScreen = (x, y) => [(x - state.cx) * state.scale + cw / 2, (y - state.cy) * state.scale + ch / 2]

  function pill(g, text, x, y, opt = {}) {
    g.font = `${opt.bold ? 700 : 600} ${opt.size || 12}px system-ui, Segoe UI, sans-serif`
    const w = g.measureText(text).width + (opt.dot ? 22 : 14), h = (opt.size || 12) + 10
    g.fillStyle = opt.bg || 'rgba(18,21,25,0.82)'
    g.beginPath(); g.roundRect(x - w / 2, y - h / 2, w, h, h / 2); g.fill()
    g.strokeStyle = 'rgba(255,255,255,0.12)'; g.lineWidth = 1; g.stroke()
    if (opt.dot) { g.fillStyle = opt.dot; g.beginPath(); g.arc(x - w / 2 + 10, y, 3.5, 0, TAU); g.fill() }
    g.fillStyle = opt.color || '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'
    g.fillText(text, x + (opt.dot ? 4 : 0), y + 0.5)
  }

  const LABEL_DOT = { landmark: '#f0b429', gate: '#ff6b6b', sport: '#5fa8d3', nature: '#7fb069' }
  function drawLabels(g, s) {
    if (s < 1.6) {
      for (const z of campus.zones) {
        const c = z.labelAt || (z.labelAt = centroid(z.poly))
        const [x, y] = toScreen(c[0], c[1] - 25)
        g.font = '800 34px system-ui, Segoe UI, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'
        g.fillStyle = 'rgba(255,255,255,0.22)'; g.fillText(String(z.id), x, y)
      }
    }
    const placed = []
    const tryPlace = (x, y, w, h) => {
      const r = [x - w / 2, y - h / 2, x + w / 2, y + h / 2]
      if (placed.some((p) => r[0] < p[2] && r[2] > p[0] && r[1] < p[3] && r[3] > p[1])) return false
      placed.push(r); return true
    }
    for (const l of campus.labels) {
      const [x, y] = toScreen(l.at[0], l.at[1] - (l.lift || 0) * state.tilt)
      if (x < -50 || y < -20 || x > cw + 50 || y > ch + 20) continue
      if (!tryPlace(x, y, l.text.length * 7.5 + 26, 24)) continue
      pill(g, l.text, x, y, { dot: LABEL_DOT[l.kind] || LABEL_DOT.landmark })
    }
    if (s >= 2.6 && state.layers.buildings) {
      for (const b of blds) {
        if (!b.name) continue
        const h = b.floors * FLOOR * state.tilt
        const [x, y] = toScreen(b.c[0], b.c[1] - h)
        if (x < 0 || y < 0 || x > cw || y > ch) continue
        if (!tryPlace(x, y, b.name.length * 6.5 + 16, 20)) continue
        pill(g, b.name, x, y, { size: 11, bg: 'rgba(255,255,255,0.9)', color: '#1d2126' })
      }
    }
  }

  function drawScaleBar(g, s) {
    const target = 110 / s * METERS_PER_UNIT
    const p = 10 ** Math.floor(Math.log10(target))
    const m = [1, 2, 5, 10].map((k) => k * p).filter((v) => v <= target).pop()
    const px = (m / METERS_PER_UNIT) * s
    const x = 24, y = ch - 200
    g.fillStyle = 'rgba(18,21,25,0.8)'
    g.beginPath(); g.roundRect(x - 8, y - 20, px + 16, 32, 6); g.fill()
    g.fillStyle = '#fff'; g.fillRect(x, y, px, 3)
    g.fillRect(x, y - 4, 1.5, 7); g.fillRect(x + px - 1.5, y - 4, 1.5, 7)
    g.font = '600 11px system-ui, Segoe UI, sans-serif'; g.textAlign = 'left'; g.textBaseline = 'bottom'
    g.fillText(`≈ ${m >= 1000 ? m / 1000 + ' km' : m + ' m'}`, x, y - 4)
  }

  // ---------- minimap
  const MW = 120, MH = Math.round((MW * H) / W)
  let miniBase = null
  function buildMini() {
    const c = document.createElement('canvas'), k = 2
    c.width = MW * k; c.height = MH * k
    const g = c.getContext('2d'), sc = (MW * k) / W
    g.setTransform(sc, 0, 0, sc, 0, 0)
    g.beginPath(); tracePoly(g, campus.boundary); g.fillStyle = '#a99266'; g.fill()
    g.save(); g.clip(); g.drawImage(terrain, 0, 0, W, H); drawAreas(g, 0.5); g.restore()
    g.lineCap = 'round'
    for (const r of campus.roads) {
      if (r.kind === 'path') continue
      g.strokeStyle = '#e8e2d4'; g.lineWidth = ROAD_WIDTH[r.kind] * 1.2
      g.beginPath(); traceLine(g, r.pts); g.stroke()
    }
    for (const b of blds) { g.beginPath(); tracePoly(g, b.poly); g.fillStyle = rgb(b.roof); g.fill() }
    miniBase = c
  }
  function drawMinimap() {
    if (!miniBase) buildMini()
    const k = dpr
    mini.width = MW * k; mini.height = MH * k
    const g = mini.getContext('2d')
    g.setTransform(k, 0, 0, k, 0, 0)
    g.drawImage(miniBase, 0, 0, MW, MH)
    const sc = MW / W
    const vx = (state.cx - cw / 2 / state.scale) * sc, vy = (state.cy - ch / 2 / state.scale) * sc
    const vw = (cw / state.scale) * sc, vh = (ch / state.scale) * sc
    g.fillStyle = 'rgba(240,180,41,0.12)'; g.fillRect(vx, vy, vw, vh)
    g.strokeStyle = '#f0b429'; g.lineWidth = 1.5; g.strokeRect(vx, vy, vw, vh)
  }
  mini.addEventListener('pointerdown', (ev) => {
    const r = mini.getBoundingClientRect()
    const go = (e) => { state.cx = ((e.clientX - r.left) / MW) * W; state.cy = ((e.clientY - r.top) / MH) * H; request() }
    go(ev)
    const mv = (e) => go(e), up = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up) }
    addEventListener('pointermove', mv); addEventListener('pointerup', up)
    ev.stopPropagation()
  })

  // ================================================================== interaction
  let raf = 0
  const request = () => { if (!raf) raf = requestAnimationFrame(render) }
  const minScale = () => Math.min(cw / (W + 80), ch / (H + 80)) * 0.7
  const MAX_SCALE = 14

  function resize() {
    const r = container.getBoundingClientRect()
    cw = r.width; ch = r.height; dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = shadowCanvas.width = Math.round(cw * dpr)
    canvas.height = shadowCanvas.height = Math.round(ch * dpr)
    request()
  }
  const fitScale = () => Math.min(cw / (W + 80), ch / (H + 80))
  new ResizeObserver(() => { const first = !cw; resize(); if (first) { reset(false); cb.onReady?.() } }).observe(container)

  const toMap = (sx, sy) => [(sx - cw / 2) / state.scale + state.cx, (sy - ch / 2) / state.scale + state.cy]
  function zoomAt(sx, sy, f) {
    const [mx, my] = toMap(sx, sy)
    state.scale = clamp(state.scale * f, minScale(), MAX_SCALE)
    state.cx = mx - (sx - cw / 2) / state.scale
    state.cy = my - (sy - ch / 2) / state.scale
    request()
  }

  let anim = null
  function flyTo(cx, cy, scale, ms = 650) {
    const from = { cx: state.cx, cy: state.cy, scale: state.scale }, t0 = performance.now()
    scale = clamp(scale, minScale(), MAX_SCALE)
    cancelAnimationFrame(anim)
    const step = (t) => {
      const k = clamp((t - t0) / ms, 0, 1), e = k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2
      // interpolate zoom in log space
      state.scale = Math.exp(lerp(Math.log(from.scale), Math.log(scale), e))
      state.cx = lerp(from.cx, cx, e); state.cy = lerp(from.cy, cy, e)
      render()
      if (k < 1) anim = requestAnimationFrame(step)
    }
    anim = requestAnimationFrame(step)
  }
  function fitTo(poly, margin = 30, ms) {
    const [x0, y0, x1, y1] = bbox(poly)
    const sc = Math.min(cw / (x1 - x0 + margin * 2), ch / (y1 - y0 + margin * 2))
    flyTo((x0 + x1) / 2, (y0 + y1) / 2, sc, ms)
  }
  function reset(animate = true) {
    const sc = fitScale()
    if (animate) flyTo(W / 2, H / 2, sc)
    else { state.scale = sc; state.cx = W / 2; state.cy = H / 2; request() }
  }

  function pick(sx, sy) {
    if (!state.layers.buildings) return null
    const p = toMap(sx, sy)
    for (let i = drawList.length - 1; i >= 0; i--) {
      const b = drawList[i].b
      if (!b) continue
      const h = b.floors * FLOOR * state.tilt
      if (p[0] < b.bb[0] - 1 || p[0] > b.bb[2] + 1 || p[1] < b.bb[1] - h - 1 || p[1] > b.bb[3] + 1) continue
      if (pip([p[0], p[1] + h], b.poly) || pip(p, b.poly)) return b
      // inside the extruded sweep (walls)
      for (let k = 0; k <= 4; k++) if (pip([p[0], p[1] + (h * k) / 4], b.poly)) return b
    }
    return null
  }

  canvas.addEventListener('wheel', (ev) => {
    ev.preventDefault()
    const r = canvas.getBoundingClientRect()
    cancelAnimationFrame(anim)
    zoomAt(ev.clientX - r.left, ev.clientY - r.top, Math.exp(-ev.deltaY * (ev.ctrlKey ? 0.01 : 0.0018)))
  }, { passive: false })

  const pointers = new Map()
  let drag = null, pinch = null
  canvas.addEventListener('pointerdown', (ev) => {
    canvas.setPointerCapture(ev.pointerId)
    pointers.set(ev.pointerId, [ev.clientX, ev.clientY])
    cancelAnimationFrame(anim)
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()]
      pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), scale: state.scale }
      drag = null
    } else drag = { x: ev.clientX, y: ev.clientY, cx: state.cx, cy: state.cy, moved: false }
  })
  canvas.addEventListener('pointermove', (ev) => {
    const r = canvas.getBoundingClientRect()
    const sx = ev.clientX - r.left, sy = ev.clientY - r.top
    if (pointers.has(ev.pointerId)) pointers.set(ev.pointerId, [ev.clientX, ev.clientY])
    const [mx, my] = toMap(sx, sy)
    cb.onPointer?.(mx, my)
    if (pinch && pointers.size === 2) {
      const [a, b] = [...pointers.values()]
      const d = Math.hypot(a[0] - b[0], a[1] - b[1])
      const midx = (a[0] + b[0]) / 2 - r.left, midy = (a[1] + b[1]) / 2 - r.top
      zoomAt(midx, midy, (pinch.scale * (d / pinch.d)) / state.scale)
      return
    }
    if (drag) {
      const dx = ev.clientX - drag.x, dy = ev.clientY - drag.y
      if (!drag.moved && Math.abs(dx) + Math.abs(dy) > 4) { drag.moved = true; canvas.classList.add('grabbing') }
      if (drag.moved) {
        state.cx = drag.cx - dx / state.scale; state.cy = drag.cy - dy / state.scale
        if (state.hover) { state.hover = null; cb.onHover?.(null) }
        request(); return
      }
    }
    const b = pick(sx, sy)
    const id = b ? b.id : null
    if (id !== state.hover) { state.hover = id; request() }
    cb.onHover?.(b, ev)
    canvas.style.cursor = b ? 'pointer' : ''
  })
  const end = (ev) => {
    pointers.delete(ev.pointerId)
    if (pointers.size < 2) pinch = null
    if (drag && !drag.moved && ev.type === 'pointerup') {
      const r = canvas.getBoundingClientRect()
      const b = pick(ev.clientX - r.left, ev.clientY - r.top)
      select(b ? b.id : null)
    }
    drag = null; canvas.classList.remove('grabbing')
  }
  canvas.addEventListener('pointerup', end)
  canvas.addEventListener('pointercancel', end)
  canvas.addEventListener('pointerleave', () => { if (state.hover) { state.hover = null; request() } cb.onHover?.(null) })
  canvas.addEventListener('dblclick', (ev) => {
    const r = canvas.getBoundingClientRect()
    const [mx, my] = toMap(ev.clientX - r.left, ev.clientY - r.top)
    flyTo(mx, my, state.scale * 2, 400)
  })

  function select(id) {
    state.selected = id
    request()
    cb.onSelect?.(id ? byId.get(id) : null)
  }

  return {
    setLayer(name, on) { state.layers[name] = on; request() },
    setSatellite(v) { state.sat = v; request() },
    setTilt(v) { state.tilt = v; request() },
    setSun(az) { state.sunAz = az; request() },
    zoom(f) { flyTo(state.cx, state.cy, state.scale * f, 300) },
    reset,
    setView(cx, cy, scale) { cancelAnimationFrame(anim); state.cx = cx; state.cy = cy; state.scale = scale; request() },
    fitTo,
    select,
    focusBuilding(id) {
      const b = byId.get(id)
      if (!b) return
      fitTo(b.poly, 60)
      select(id)
    },
    highlightZone(id) { state.activeZone = id; request() },
    filterType(type) { state.filterType = type; request() },
  }
}
