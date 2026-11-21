// ASTU sports complex — traced from photos/top_satelite/stadium.png (1918 x 1296).
// Real names come from the map pins on that image. Geometry is defined in stadium.png pixels and
// mapped into full.jpg map units. Pitch measured on the image: 630 x 400 px = 105 x 68 m
// -> 0.1667 m per image px.

const S = 0.12, OX = 659.2, OY = 398.1 // stadium.png px -> full.jpg px
export const SPORTS_MPU = 0.1667 / S    // ≈ 1.39 m per map unit (stadium-derived scale)

const P = ([x, y]) => [+(OX + x * S).toFixed(2), +(OY + y * S).toFixed(2)]
const Ps = (pts) => pts.map(P)
export const SPORTS_REGION = [P([150, 0]), P([1918, 1296])].flat() // x0,y0,x1,y1

// ---------------------------------------------------------------- shape helpers (image px)
function racetrack(cx, cy, half, R, n = 28) {
  const pts = []
  for (let i = 0; i <= n; i++) { const t = Math.PI + (i / n) * Math.PI; pts.push([cx + R * Math.cos(t), cy - half + R * Math.sin(t)]) }
  for (let i = 0; i <= n; i++) { const t = (i / n) * Math.PI; pts.push([cx + R * Math.cos(t), cy + half + R * Math.sin(t)]) }
  return pts
}
function rrect(x0, y0, x1, y1, r, n = 5) {
  const c = [[x1 - r, y0 + r, -90], [x1 - r, y1 - r, 0], [x0 + r, y1 - r, 90], [x0 + r, y0 + r, 180]]
  const pts = []
  for (const [cx, cy, a0] of c) for (let i = 0; i <= n; i++) {
    const a = ((a0 + (i / n) * 90) * Math.PI) / 180
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)])
  }
  return pts
}
const rect = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]
function arc(cx, cy, r, a0, a1, n = 20) {
  return Array.from({ length: n + 1 }, (_, i) => {
    const a = ((a0 + ((a1 - a0) * i) / n) * Math.PI) / 180
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)]
  })
}
const lerp = (a, b, t) => a + (b - a) * t

const areas = [], decor = [], stands = [], buildings = [], roads = [], labels = []
const A = (kind, pts, name) => areas.push({ kind, poly: Ps(pts), name })
// decor: stroke/fill primitives in map units
const line = (pts, o = {}) => decor.push({ pts: Ps(pts), closed: false, width: 0.14, stroke: 'rgba(255,255,255,0.92)', ...o })
const loop = (pts, o = {}) => decor.push({ pts: Ps(pts), closed: true, width: 0.14, stroke: 'rgba(255,255,255,0.92)', ...o })
const fill = (pts, color) => decor.push({ pts: Ps(pts), closed: true, fill: color })

// ====================================================================== ASTU STADIUM
const CX = 1290, CY = 635, HALF = 250
A('concrete', racetrack(CX, CY, HALF, 448), 'Stadium concourse')
roads.push({ kind: 'lane', name: 'Stadium ring road', pts: Ps(racetrack(CX, CY, HALF, 472).concat([racetrack(CX, CY, HALF, 472)[0]])) })
roads.push({ kind: 'lane', name: 'Stadium access road', pts: Ps([[822, 400], [818, 160], [770, 60], [700, -20]]) })

// terraces: 13 steps rising from the track-side parapet (1.2 m) to the back wall (9 m)
{
  const N = 13, R0 = 302, R1 = 398
  const rings = [], heights = []
  for (let i = 0; i <= N; i++) {
    rings.push(Ps(racetrack(CX, CY, HALF, lerp(R0, R1, i / N), 32)))
    heights.push(lerp(1.2, 9, i / N))
  }
  stands.push({ name: 'Stadium stands', rings, heights, tread: '#b7b3aa', riser: '#8f8b83', wall: '#a39e94', aisles: 22, gates: [8, 24, 41, 57] })
}
A('track', racetrack(CX, CY, HALF, 302), 'Running track')
A('dirt', racetrack(CX, CY, HALF, 246), 'Infield')
A('grass', racetrack(CX, CY, HALF, 226), 'ASTU Stadium pitch')
// lanes (1.22 m = 7.3 px)
for (let i = 0; i <= 7; i++) loop(racetrack(CX, CY, HALF, 248 + i * 7.3, 32), { width: 0.1, stroke: 'rgba(255,245,235,0.42)' })
// start/finish line + staggered starts on the home straight
line([[CX + 248, CY + 40], [CX + 299, CY + 40]], { width: 0.18, stroke: 'rgba(255,255,255,0.8)' })
for (let i = 0; i < 7; i++) line([[CX - 248 - i * 7.3, CY - 120 - i * 14], [CX - 255.3 - i * 7.3, CY - 120 - i * 14]], { width: 0.12, stroke: 'rgba(255,255,255,0.6)' })

// football pitch markings (105 x 68 m)
{
  const x0 = 1100, x1 = 1500, y0 = 322, y1 = 952, mx = (x0 + x1) / 2, my = (y0 + y1) / 2
  loop(rect(x0, y0, x1, y1))
  line([[x0, my], [x1, my]])
  loop(arc(mx, my, 55, 0, 360, 40))
  fill(arc(mx, my, 2.2, 0, 360, 10), '#fff')
  for (const [gy, dir] of [[y0, 1], [y1, -1]]) {
    loop(rect(mx - 121, Math.min(gy, gy + dir * 99), mx + 121, Math.max(gy, gy + dir * 99)))   // penalty area
    loop(rect(mx - 55, Math.min(gy, gy + dir * 33), mx + 55, Math.max(gy, gy + dir * 33)))     // goal area
    fill(arc(mx, gy + dir * 66, 2, 0, 360, 8), '#fff')                                         // penalty spot
    line(dir > 0 ? arc(mx, gy + 66, 55, 37, 143) : arc(mx, gy - 66, 55, 217, 323))             // penalty arc
    // goal frame + net
    const gy2 = gy - dir * 12
    fill(rect(mx - 22, Math.min(gy, gy2), mx + 22, Math.max(gy, gy2)), 'rgba(255,255,255,0.25)')
    loop(rect(mx - 22, Math.min(gy, gy2), mx + 22, Math.max(gy, gy2)), { width: 0.18 })
  }
  for (const [cx, cy, a] of [[x0, y0, 0], [x1, y0, 90], [x1, y1, 180], [x0, y1, 270]]) line(arc(cx, cy, 6, a, a + 90, 6))
}

// ASTU Gym — blue-roof hall built against the west stands
buildings.push({ type: 'gym', name: 'ASTU Gym', floors: 3, poly: Ps(rect(858, 405, 982, 910)) })
buildings.push({ type: 'staff', name: 'Stadium kiosk', floors: 1, poly: Ps(rect(803, 98, 858, 155)) })
for (const [x, y] of [[1655, 360], [1668, 605], [1800, 548], [1802, 702]]) buildings.push({ type: 'staff', floors: 1, poly: Ps(rect(x - 14, y - 12, x + 14, y + 12)) })

// ====================================================================== KT TENNIS COURT (clay, sunken with terraces)
A('concrete', rrect(372, 236, 646, 604, 28), 'Tennis terraces')
{
  const N = 7, inner = [430, 300, 578, 555], outer = [378, 242, 640, 598]
  const rings = [], heights = []
  for (let i = 0; i <= N; i++) {
    const t = i / N
    rings.push(Ps(rrect(lerp(inner[0], outer[0], t), lerp(inner[1], outer[1], t), lerp(inner[2], outer[2], t), lerp(inner[3], outer[3], t), lerp(4, 26, t))))
    heights.push(lerp(0.6, 4.2, t))
  }
  stands.push({ name: 'KT Tennis terraces', rings, heights, tread: '#bdb8ad', riser: '#958f84', wall: '#a8a296', aisles: 4 })
}
A('clay', rect(430, 300, 578, 555), 'KT Tennis Court')
{
  const cx = 504, cy = 428, hw = 33, hs = 24.5, hl = 71.5, sv = 38
  loop(rect(cx - hw, cy - hl, cx + hw, cy + hl))
  line([[cx - hs, cy - hl], [cx - hs, cy + hl]]); line([[cx + hs, cy - hl], [cx + hs, cy + hl]])
  line([[cx - hs, cy - sv], [cx + hs, cy - sv]]); line([[cx - hs, cy + sv], [cx + hs, cy + sv]])
  line([[cx, cy - sv], [cx, cy + sv]])
  line([[cx, cy - hl], [cx, cy - hl + 3]]); line([[cx, cy + hl], [cx, cy + hl - 3]])
  line([[cx - hw - 6, cy], [cx + hw + 6, cy]], { width: 0.28, stroke: 'rgba(30,30,30,0.85)' }) // net
}
buildings.push({ type: 'hall', name: 'Yegna Gym', floors: 1, poly: Ps(rect(634, 395, 664, 588)) })

// ====================================================================== ASTU BASKETBALL COURT (two sunken courts)
for (const [x0, x1, sx0, sx1] of [[204, 446, 245, 421], [428, 666, 452, 628]]) {
  A('concrete', rrect(x0 - 2, 698, x1 + 2, 1066, 14), 'Basketball terraces')
  const N = 6, inner = [sx0, 742, sx1, 1010], outer = [x0, 702, x1, 1062]
  const rings = [], heights = []
  for (let i = 0; i <= N; i++) {
    const t = i / N
    rings.push(Ps(rrect(lerp(inner[0], outer[0], t), lerp(inner[1], outer[1], t), lerp(inner[2], outer[2], t), lerp(inner[3], outer[3], t), lerp(3, 12, t))))
    heights.push(lerp(0.5, 3.6, t))
  }
  stands.push({ name: 'Basketball terraces', rings, heights, tread: '#c2beb4', riser: '#9a958a', wall: '#aaa499', aisles: 2 })
  A('hardcourt', rect(sx0, 742, sx1, 1010), 'ASTU Basketball Court')
  // markings (28 x 15 m)
  const cx = (sx0 + sx1) / 2, cy = 876, hw = 45, hl = 84
  loop(rect(cx - hw, cy - hl, cx + hw, cy + hl))
  line([[cx - hw, cy], [cx + hw, cy]])
  loop(arc(cx, cy, 11, 0, 360, 24))
  for (const dir of [-1, 1]) {
    const by = cy + dir * hl
    const key = rect(cx - 14.5, Math.min(by, by - dir * 35), cx + 14.5, Math.max(by, by - dir * 35))
    fill(key, 'rgba(62,110,190,0.75)'); loop(key)
    line(dir < 0 ? arc(cx, by + 35, 11, 0, 180, 12) : arc(cx, by - 35, 11, 180, 360, 12))
    const bx = by - dir * 9
    line(dir < 0 ? arc(cx, bx, 40, 15, 165, 24) : arc(cx, bx, 40, 195, 345, 24))
    fill(arc(cx, bx, 2, 0, 360, 8), '#e2702e') // hoop
  }
  fill(arc(cx, cy, 10.5, 0, 360, 24), 'rgba(80,170,110,0.45)')
}

// ====================================================================== surroundings
A('concrete', rect(640, 120, 790, 1296), 'West plaza')
A('brick', rect(205, 636, 790, 698), 'Brick walkway')
A('brick', rect(650, 230, 700, 640), 'Brick walkway')
A('brick', rect(430, 600, 590, 640), 'Tennis entrance')

labels.push({ text: 'ASTU Stadium', kind: 'sport', at: P([CX, CY]), lift: 0 })
labels.push({ text: 'KT Tennis Court', kind: 'sport', at: P([504, 230]) })
labels.push({ text: 'ASTU Basketball Court', kind: 'sport', at: P([436, 1090]) })

export const SPORTS = { areas, decor, stands, buildings, roads, labels }
