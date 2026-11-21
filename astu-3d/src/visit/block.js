// Parametric ASTU gallery block, modelled on photos/buildings/001 + 002.
//
// Two styles seen on site:
//  - 'bracket' (School of Electrical Eng. pair): galleries cantilevered on tapered brackets,
//    thick solid parapet bands, stone end walls with D-shaped round balconies on every floor,
//    and the signature stair: two flights side by side INSIDE the last bays of the gallery
//    (outer lane runs out toward the end, inner lane comes back), with stacked semicircular
//    half-landings projecting past the end wall and a square pier under the lowest one.
//  - 'column' (Block 510 / LAB 5 U-block): square posts at the gallery edge, lower parapets,
//    plain gable ends; same stair layout but with square box half-landings.
//
// Local frame: x along the block 0..len, body z in [-D, 0], gallery z in [0, G] (faces +z), y up.
// Ends: 'round' | 'plain' | 'open' | 'stair' | 'stairSquare' (start = x 0, end = x len).
import * as THREE from 'three'
import { box, prism, prismX, wallPath, hexa, quad, arcPts } from './builder.js'

const isStair = (e) => e === 'stair' || e === 'stairSquare'
const FLAND = 3.6 // front stair: floor landing width along the façade

export function galleryBlock(B, o) {
  const {
    len = 44, D = 8.5, G = 2.6, F = 4, FH = 3.4, P = 0.45, bay = 3.7,
    start = 'round', end = 'stair', stone = [], style = 'bracket',
    gaps = [0.3, 0.7], posters = true, gable = [true, true], roof = true, trim = [0, 0],
    front = [], // front-standing stair towers: [{ x: centre of the corridor connection, dir: -1|1, sign: 'B 508' }]
  } = o
  const lvl = (k) => P + k * FH
  const yT = lvl(F)
  const RUN = 3.3
  const nb = Math.max(2, Math.round(len / bay)), bw = len / nb
  const sz0 = isStair(start) ? RUN : 0, sz1 = isStair(end) ? len - RUN : len // gallery floor extent
  const col = style === 'column'
  const parH = col ? 1.0 : 1.05

  // ---------------------------------------------------------------- body + roof
  B.add('render', box(0, 0, -D, len, yT, 0), { collide: true })
  B.add('concrete', box(-0.12, 0, -D - 0.12, len + 0.12, 0.3, 0))
  B.add('wall', box(0, P, 0, len, yT - 0.1, 0.02)) // gallery wall: strong yellow paint
  B.add('dado', box(0, P, 0.02, len, P + 1.05, 0.045)) // dark grey band along the ground floor
  B.add('dado', box(0, 0.3, -D - 0.03, len, 1.3, -D))

  const rise = 1.0, zr = (G - D) / 2, zA = -D - 0.4, zB = G + 0.4, roofY = yT + 0.45
  ;[[-0.25, 0.3], [len - 0.3, len + 0.25]].forEach(([xa, xb], i) => {
    if (!gable[i]) return
    B.add('render', prismX([[zA, yT], [zB, yT], [zB, roofY], [zr, roofY + rise], [zA, roofY]], xa, xb), { collide: true })
    B.add('parapet', prismX([[zA - 0.15, yT + 0.3], [zB + 0.15, yT + 0.3], [zB + 0.15, yT + 0.62],
      [zr, yT + 0.62 + rise], [zA - 0.15, yT + 0.62]], xa - 0.12, xb + 0.12))
  })
  if (roof) {
    const sl = (z0, y0, z1, y1) => B.add('roof', hexa(
      [[0.3, y0, z0], [len - 0.3, y0, z0], [len - 0.3, y1, z1], [0.3, y1, z1]],
      [[0.3, y0 + 0.06, z0], [len - 0.3, y0 + 0.06, z0], [len - 0.3, y1 + 0.06, z1], [0.3, y1 + 0.06, z1]]))
    sl(zA, roofY, zr, roofY + rise); sl(zr, roofY + rise, zB, roofY)
  }
  B.add('render', box(0, yT, zA, len, roofY + 0.05, zA + 0.25))
  B.add('render', box(0, yT - 0.1, -D - 0.2, len, roofY, 0))
  for (const e of stone) {
    const x = e === 'start' ? -0.14 : len
    B.add('stone', box(x, 0, -D - 0.14, x + 0.14, yT + 0.1, 0.02))
  }

  // ---------------------------------------------------------------- façades
  const put = (key, geo, cx, cy, z, back) => B.frame(cx, cy, z, back ? Math.PI : 0, () => B.add(key, geo))
  const hash = (a, b) => { const n = Math.sin(a * 127.1 + b * 311.7 + len * 17.3) * 43758.5453; return n - Math.floor(n) }
  // window ribbon: n units from the 4-unit atlas, starting at a random unit
  const win = (ww, h, cx, cy, z, back, a, b) => {
    const n = Math.max(1, Math.round(ww / 1.7))
    put('window', quad(ww, h, n / 4, 1, Math.floor(hash(a, b) * 4) / 4), cx, cy, z, back)
  }
  for (let k = 0; k < F; k++) {
    const y = lvl(k)
    for (let i = 0; i < nb; i++) {
      const x0 = i * bw, xc = x0 + bw / 2
      // gallery side: clerestory ribbon tucked under the beams, tall doors with glazed transoms
      const isBehindStair = front.some((f) => Math.abs(xc - f.x) < 2.2)
      const door = !isBehindStair && (i % 3 === 1 || (k === 0 && i % 4 === 3))
      if (door) {
        const dw = 1.32, dh = 2.85, dx = x0 + 0.85
        // 3D door frame
        B.add('concrete', box(dx - 0.04, y, 0.01, dx, y + dh, 0.065)) // left jamb
        B.add('concrete', box(dx + dw, y, 0.01, dx + dw + 0.04, y + dh, 0.065)) // right jamb
        B.add('concrete', box(dx - 0.04, y + dh - 0.05, 0.01, dx + dw + 0.04, y + dh, 0.065)) // top header
        B.add('concrete', box(dx, y + 2.10 - 0.03, 0.01, dx + dw, y + 2.10 + 0.03, 0.055)) // transom rail
        // recessed door leaf
        put('door', quad(dw, 2.10), dx + dw / 2, y + 1.05, 0.04)
        // 3D metal door handle
        B.add('doorHandle', box(dx + dw - 0.18, y + 0.96, 0.041, dx + dw - 0.14, y + 1.10, 0.046)) // escutcheon
        B.add('doorHandle', box(dx + dw - 0.28, y + 1.02, 0.046, dx + dw - 0.16, y + 1.05, 0.07)) // lever handle
        // transom window
        put('window', quad(dw, dh - 2.15), dx + dw / 2, y + 2.10 + (dh - 2.10) / 2, 0.04)
        // room plate
        put('plate', quad(0.28, 0.18), dx + dw + 0.22, y + 1.78, 0.052)
        // red fire/sand bucket on ground floor
        if (k === 0) {
          B.add('bucketRed', new THREE.CylinderGeometry(0.11, 0.08, 0.25, 8).translate(dx - 0.20, y + 0.125, 0.20))
        }
        const ww = bw - 2.0
        win(ww, 0.85, x0 + 1.75 + ww / 2, y + 2.42, 0.05, false, i, k)
        // window sill
        B.add('curb', box(x0 + 1.75, y + 1.96, 0.01, x0 + 1.75 + ww, y + 2.02, 0.065))
        if (k === 0 && posters && i % 2 === 1 && ww > 1.5) put('poster', quad(1.9, 1.33), x0 + 1.75 + ww / 2, y + 1.22, 0.06)
      } else {
        const ww = bw - 0.5
        win(ww, 0.85, xc, y + 2.42, 0.05, false, i, k)
        // window sill
        B.add('curb', box(xc - ww / 2, y + 1.96, 0.01, xc + ww / 2, y + 2.02, 0.065))
        if (col) {
          // Block 510 window security iron bars (photos 145622, 145624)
          for (let bx = xc - ww / 2 + 0.12; bx < xc + ww / 2 - 0.05; bx += 0.18) {
            B.add('post', box(bx - 0.012, y + 2.0, 0.045, bx + 0.012, y + 2.85, 0.065))
          }
        }
        // some upper-floor bays have a terracotta board panel under the window (photo 113643)
        if (k > 0 && hash(i + 9, k) < 0.14) put('panel', quad(ww * 0.62, 0.42), xc - ww * 0.12, y + 1.76, 0.05)
      }
      // back side: classroom windows
      const wb = bw - 0.8
      win(wb, 1.3, xc, y + 1.85, -D - 0.03, true, i + 40, k)
      B.add('curb', box(xc - wb / 2, y + 1.15, -D - 0.08, xc + wb / 2, y + 1.22, -D))
    }
  }
  // wall pilasters (both styles) and edge posts (column style)
  for (let i = 0; i <= nb; i++) {
    const x = Math.min(len - 0.2, Math.max(0.2, i * bw))
    B.add('wall', box(x - 0.2, P, 0, x + 0.2, yT - 0.1, 0.22))
    B.add('dado', box(x - 0.21, P, 0, x + 0.21, P + 1.05, 0.235))
    if (col && x > sz0 + 0.3 && x < sz1 - 0.3) B.add('render', box(x - 0.2, 0, G - 0.4, x + 0.2, yT, G), { collide: true })
  }
  if (col) for (const x of [sz0 + 0.2, sz1 - 0.2]) B.add('render', box(x - 0.2, 0, G - 0.4, x + 0.2, yT, G), { collide: true })

  // ---------------------------------------------------------------- galleries
  for (let k = 1; k <= F; k++) {
    const y = lvl(k), top = k === F ? y + 0.3 : y + parH
    const xa = k === F ? 0 : sz0, xb = k === F ? len : sz1
    B.add('concrete', box(xa, y - 0.25, 0, xb, y, G), { collide: true })
    // corridor tiled floor surface
    B.add('corridorTile', box(xa, y - 0.02, 0.02, xb, y, G - 0.18))
    const pa = Math.max(xa, trim[0]), pb = Math.min(xb, len - trim[1])
    // parapet segments, opened where a front stair landing joins the corridor
    let segs = [[pa, pb]]
    if (k < F) for (const f of front) {
      const o0 = f.x - FLAND / 2, o1 = f.x + FLAND / 2
      segs = segs.flatMap(([a, b]) => (o1 <= a || o0 >= b ? [[a, b]] : [[a, o0], [o1, b]].filter(([u, v]) => v - u > 0.05)))
    }
    for (const [a, b] of segs) {
      B.add('parapet', box(a, y - (col ? 0.3 : 0.45), G - 0.18, b, top, G), { collide: true })
      B.add('parapet', box(a, top - 0.08, G - 0.24, b, top, G + 0.05)) // capping lip
    }
    B.add('trim', box(xa, y - 0.27, 0, xb, y - 0.25, G - 0.18)) // white-painted soffit
    for (let i = 0; i < nb; i++) { // surface-mounted strip-light boxes under each bay
      const xc = (i + 0.5) * bw
      if (xc < xa + 0.8 || xc > xb - 0.8) continue
      B.add('fixture', box(xc - 0.6, y - 0.32, G * 0.45 - 0.09, xc + 0.6, y - 0.27, G * 0.45 + 0.09))
      B.add('fixtureSlot', box(xc - 0.52, y - 0.325, G * 0.45 - 0.035, xc + 0.52, y - 0.32, G * 0.45 + 0.035))
    }
    if (!col) for (let i = 0; i <= nb; i++) { // white tapered cantilever beams
      const x = Math.min(len - 0.3, Math.max(0.3, i * bw)), yb = y - 0.27
      if (x < xa || x > xb) continue
      B.add('trim', hexa(
        [[x - 0.17, yb - 0.5, 0], [x + 0.17, yb - 0.5, 0], [x + 0.17, yb - 0.16, G - 0.2], [x - 0.17, yb - 0.16, G - 0.2]],
        [[x - 0.17, yb, 0], [x + 0.17, yb, 0], [x + 0.17, yb, G - 0.2], [x - 0.17, yb, G - 0.2]]))
    }
  }

  // ---------------------------------------------------------------- ground floor walkway
  B.add('concrete', box(0, 0, 0, len, P, G), { collide: true })
  B.add('corridorTile', box(0, P - 0.02, 0.02, len, P, G - 0.18))
  {
    const gx = gaps.map((g) => g * len)
    let x = Math.max(sz0, trim[0])
    for (const g of gx.concat([sz1])) {
      const xe = g === sz1 ? Math.min(sz1, len - trim[1]) : g - 1.1
      if (xe > x + 0.1) B.add('parapet', box(x, P, G - 0.18, xe, P + 0.9, G), { collide: true })
      if (g !== sz1) {
        B.add('stairs', box(g - 1.1, 0, G, g + 1.1, P * 0.5, G + 0.35))
        B.collider(hexa(
          [[g - 1.1, 0, G + 1.0], [g + 1.1, 0, G + 1.0], [g + 1.1, 0, G - 0.2], [g - 1.1, 0, G - 0.2]],
          [[g - 1.1, 0.02, G + 1.0], [g + 1.1, 0.02, G + 1.0], [g + 1.1, P, G - 0.2], [g - 1.1, P, G - 0.2]]))
        x = g + 1.1
      }
    }
  }

  // ---------------------------------------------------------------- ends
  const sinks = []
  for (const f of front) { frontStair(B, { ...f, F, FH, P, G, lvl }); sinks.push(f.x - 2.2) }
  for (const [which, kind] of [['start', start], ['end', end]]) {
    const x0 = which === 'start' ? 0 : len, out = which === 'start' ? -1 : 1
    if (kind === 'round') roundEnd(B, { x0, out, F, lvl, G })
    else if (kind === 'plain') {
      for (let k = 1; k < F; k++) {
        const y = lvl(k)
        B.add('parapet', box(Math.min(x0, x0 - out * 0.18), y - 0.3, 0, Math.max(x0, x0 - out * 0.18), y + parH, G), { collide: true })
      }
    } else if (isStair(kind)) {
      stair(B, { x0, out, F, FH, P, G, RUN, square: kind === 'stairSquare', lvl })
      sinks.push(x0 - out * (RUN + 1.2))
    }
  }
  // twin pedestal wash-basins on the ground-floor walkway next to the stair (photo 145456)
  for (const sx of sinks) for (const dx of [-0.35, 0.35]) {
    B.add('ceramic', new THREE.CylinderGeometry(0.08, 0.12, 0.75, 10).translate(sx + dx, P + 0.375, 0.35))
    B.add('ceramic', box(sx + dx - 0.25, P + 0.75, 0.05, sx + dx + 0.25, P + 0.9, 0.5))
  }
  return { yTop: roofY + rise, levels: Array.from({ length: F }, (_, k) => lvl(k)) }
}

// D-shaped balconies stacked at a gallery end (every floor + ground curb + roof cap)
function roundEnd(B, { x0, out, F, lvl, G }) {
  const R = G / 2 + 0.2, cz = G / 2
  const half = (r) => arcPts(x0, cz, r, -Math.PI / 2, Math.PI / 2, 18).map(([x, z]) => [x0 + out * (x - x0), z])
  for (let k = 0; k <= F; k++) {
    const y = lvl(k)
    const disc = half(R)
    if (k === 0) {
      B.add('concrete', prism(disc, 0, y), { collide: true })
      B.add('parapet', wallPath(half(R - 0.09), 0.18, y, y + 0.9), { collide: true })
      continue
    }
    B.add('concrete', prism(disc, y - 0.25, y), { collide: true })
    const top = k === F ? y + 0.3 : y + 1.05
    B.add('parapet', wallPath(half(R - 0.09), 0.18, y - 0.5, top), { collide: true })
    B.add('parapet', wallPath(half(R - 0.06), 0.26, top - 0.08, top))
  }
}

// Switchback stair inside the gallery's end bays; half-landings project beyond the end.
function stair(B, { x0, out, F, FH, P, G, RUN, square, lvl }) {
  const inw = -out, X = (d) => x0 + inw * d // d = distance inward from the end wall
  const half = G / 2
  const zO0 = half + 0.08, zO1 = G - 0.18, zI0 = 0.02, zI1 = half - 0.08
  const nSteps = 10, T = 0.2

  const flight = (yA, yB, z0, z1, xa, xb) => {
    const rise = (yB - yA) / nSteps, run = (xb - xa) / nSteps
    for (let i = 0; i < nSteps; i++) {
      const x1 = xa + run * i, x2 = xa + run * (i + 1)
      B.add('stairs', box(Math.min(x1, x2), yA + rise * i - 0.02, z0, Math.max(x1, x2), yA + rise * (i + 1), z1))
    }
    B.add('concrete', hexa(
      [[xa, yA - T - 0.05, z0], [xb, yB - T - rise, z0], [xb, yB - T - rise, z1], [xa, yA - T - 0.05, z1]],
      [[xa, yA - 0.05, z0], [xb, yB - rise, z0], [xb, yB - rise, z1], [xa, yA - 0.05, z1]]))
    B.collider(hexa(
      [[xa, yA - 0.2, z0], [xb, yB - 0.2, z0], [xb, yB - 0.2, z1], [xa, yA - 0.2, z1]],
      [[xa, yA, z0], [xb, yB, z0], [xb, yB, z1], [xa, yA, z1]]))
  }
  const sloped = (xa, xb, yA, yB, z0, z1, h, down) => B.add('parapet', hexa(
    [[xa, yA - down, z0], [xb, yB - down, z0], [xb, yB - down, z1], [xa, yA - down, z1]],
    [[xa, yA + h, z0], [xb, yB + h, z0], [xb, yB + h, z1], [xa, yA + h, z1]]), { collide: true })

  const R = half + 0.12
  const halfDisc = (r) => arcPts(x0, half, r, -Math.PI / 2, Math.PI / 2, 18).map(([x, z]) => [x0 + out * (x - x0), z])
  for (let k = 0; k < F - 1; k++) {
    const y = lvl(k), ym = y + FH / 2, y2 = lvl(k + 1)
    // A: outer lane, from the gallery out toward the end
    flight(y, ym, zO0, zO1, X(RUN), X(0))
    sloped(X(RUN), X(0), y, ym, G - 0.18, G, 1.05, k === 0 ? ym + 0.2 : 0.5) // ground flight: solid wall to the ground
    sloped(X(RUN), X(0), y, ym, half, half + 0.08, 1.0, 0.3)
    // half landing
    if (square) {
      const xa = Math.min(x0, X(-1.4)), xb = Math.max(x0, X(-1.4))
      B.add('concrete', box(xa, ym - 0.3, -0.1, xb, ym, G + 0.1), { collide: true })
      B.add('parapet', box(Math.min(X(-1.4), X(-1.22)), ym - 0.45, -0.1, Math.max(X(-1.4), X(-1.22)), ym + 1.0, G + 0.1), { collide: true })
      B.add('parapet', box(xa, ym - 0.45, G - 0.08, xb, ym + 1.0, G + 0.1), { collide: true })
      B.add('parapet', box(xa, ym - 0.45, -0.1, xb, ym + 1.0, 0.08), { collide: true })
    } else {
      B.add('concrete', prism(halfDisc(R), ym - 0.35, ym), { collide: true })
      B.add('parapet', wallPath(halfDisc(R + 0.02), 0.2, ym - 0.6, ym + 1.05), { collide: true })
      B.add('parapet', wallPath(halfDisc(R + 0.05), 0.28, ym + 0.97, ym + 1.05))
    }
    if (k === 0) { // pier under the lowest half landing
      B.add('render', box(Math.min(X(-0.55), X(-1.15)), 0, half - 0.35, Math.max(X(-0.55), X(-1.15)), ym - 0.35, half + 0.35), { collide: true })
    }
    // B: inner lane, back along the wall up to the next gallery
    flight(ym, y2, zI0, zI1, X(0), X(RUN))
    sloped(X(0), X(RUN), ym, y2, half - 0.08, half, 1.0, 0.3)
  }
  // top floor: close the void over the last outer flight
  const yt = lvl(F - 1)
  B.add('parapet', box(Math.min(X(RUN), X(RUN + 0.18)), yt - 0.3, half, Math.max(X(RUN), X(RUN + 0.18)), yt + 1.05, G), { collide: true })
}

// Stair tower standing in FRONT of the gallery (stare.png, photos 145456, 145430, 145543):
// The signature curved semicircular half-landing drum projects OUTWARD in FRONT (+z) facing the walkway.
// Flights connect the corridor opening to the curved front landing; central spine bears the building sign.
function frontStair(B, { x, dir = -1, sign = 'B 508', F, FH, P, G, lvl }) {
  const xc = x
  const zc = G + 1.55 // center of curved landing drum along Z (in front of corridor)
  const R = 1.55 // radius of curved landing drum projecting forward
  const nSteps = 10, T = 0.22
  const flightW = 1.30 // lane width
  const x0 = xc - flightW - 0.25, x1 = xc + flightW + 0.25

  // Semicircular landing disc in plan (curving toward +z into the walkway)
  const semiPts = arcPts(xc, zc, R, 0, Math.PI, 24)
  const drumDisc = semiPts.concat([[xc - R, zc], [xc + R, zc]])

  // Ground flight steps up from the walkway (+Z) onto the ground landing:
  B.add('stairs', box(xc - 1.1, 0, zc + R, xc + 1.1, P * 0.5, zc + R + 0.35))
  B.collider(hexa(
    [[xc - 1.1, 0, zc + R + 0.9], [xc + 1.1, 0, zc + R + 0.9], [xc + 1.1, 0, zc + R], [xc - 1.1, 0, zc + R]],
    [[xc - 1.1, 0.02, zc + R + 0.9], [xc + 1.1, 0.02, zc + R + 0.9], [xc + 1.1, P, zc + R], [xc - 1.1, P, zc + R]]
  ))

  // Under lowest drum (ground level): massive vertical concrete support pier (photo 145456)
  B.add('render', box(xc - 0.45, 0, zc - 0.2, xc + 0.45, lvl(0) + FH / 2 - 0.35, zc + 0.45), { collide: true })

  // Stair tower vertical sign plaque (photo 145543): blue enamel plaque with "B 508" or "B 509"
  const signKey = sign.includes('508') ? 'towerSign508' : sign.includes('509') ? 'towerSign509' : 'towerSign510'
  B.frame(xc, lvl(0) + FH / 2 + 0.4, zc + R + 0.03, 0, () => B.add(signKey, quad(0.52, 0.95)))

  for (let k = 0; k < F; k++) {
    const y = lvl(k), ym = y + FH / 2, y2 = lvl(k + 1)

    // 1. Floor landing extending out from corridor opening (from z = G - 0.2 to z = G + 0.55)
    B.add('concrete', box(x0, k === 0 ? 0 : y - 0.28, G - 0.2, x1, y, G + 0.55), { collide: true })
    B.add('corridorTile', box(x0, y - 0.02, G - 0.15, x1, y, G + 0.55))
    // Side parapets closing the floor landing sides
    if (k > 0) {
      B.add('parapet', box(x0 - 0.18, y - 0.45, G, x0, y + 1.05, G + 0.55), { collide: true })
      B.add('parapet', box(x1, y - 0.45, G, x1 + 0.18, y + 1.05, G + 0.55), { collide: true })
    }

    if (k === F - 1) {
      // Top floor: close outer edge with parapet
      B.add('parapet', box(x0, y - 0.45, G + 0.40, x1, y + 1.05, G + 0.55), { collide: true })
      break
    }

    // 2. The Curved Half-Landing Drum at height ym (projecting forward to +Z)
    B.add('concrete', prism(drumDisc, ym - 0.35, ym), { collide: true })
    B.add('corridorTile', prism(drumDisc, ym - 0.02, ym))
    // Tall curved parapet wall on the front (+z) of the drum
    B.add('parapet', wallPath(arcPts(xc, zc, R - 0.08, 0, Math.PI, 24), 0.22, ym - 0.6, ym + 1.05), { collide: true })
    B.add('parapet', wallPath(arcPts(xc, zc, R - 0.05, 0, Math.PI, 24), 0.30, ym + 0.98, ym + 1.07))
    // White-painted fascia/trim along the curved underside
    B.add('trim', prism(semiPts.concat([[xc - R, zc], [xc + R, zc]]), ym - 0.42, ym - 0.35))

    // 3. Central structural spine/wall between the two flights
    B.add('render', box(xc - 0.12, ym - 0.35, G + 0.45, xc + 0.12, y2 + 1.0, zc), { collide: true })

    // 4. Flight A (right lane, x in [xc + 0.12, xc + 0.12 + flightW]):
    // Runs from z = G + 0.45 to z = zc, climbing from y to ym
    const xa0 = xc + 0.12, xa1 = xa0 + flightW
    const za0 = G + 0.45, za1 = zc
    const riseA = (ym - y) / nSteps, runA = (za1 - za0) / nSteps
    for (let i = 0; i < nSteps; i++) {
      const zStep0 = za0 + runA * i, zStep1 = za0 + runA * (i + 1)
      const yStep0 = y + riseA * i, yStep1 = y + riseA * (i + 1)
      B.add('stairs', box(xa0, yStep0 - 0.02, zStep0, xa1, yStep1, zStep1))
      B.add('corridorTile', box(xa0 + 0.02, yStep1 - 0.02, zStep0, xa1 - 0.02, yStep1, zStep1))
    }
    // Under-flight concrete soffit slab
    B.add('concrete', hexa(
      [[xa0, y - T - 0.05, za0], [xa1, y - T - 0.05, za0], [xa1, ym - T - riseA, za1], [xa0, ym - T - riseA, za1]],
      [[xa0, y - 0.05, za0], [xa1, y - 0.05, za0], [xa1, ym - riseA, za1], [xa0, ym - riseA, za1]]
    ))
    B.collider(hexa(
      [[xa0, y - 0.2, za0], [xa1, y - 0.2, za0], [xa1, ym - 0.2, za1], [xa0, ym - 0.2, za1]],
      [[xa0, y, za0], [xa1, y, za0], [xa1, ym, za1], [xa0, ym, za1]]
    ))
    // Outer sloping parapet on Flight A
    B.add('parapet', hexa(
      [[xa1, y - 0.45, za0], [xa1 + 0.18, y - 0.45, za0], [xa1 + 0.18, ym - 0.45, za1], [xa1, ym - 0.45, za1]],
      [[xa1, y + 1.05, za0], [xa1 + 0.18, y + 1.05, za0], [xa1 + 0.18, ym + 1.05, za1], [xa1, ym + 1.05, za1]]
    ), { collide: true })

    // 5. Flight B (left lane, x in [xc - 0.12 - flightW, xc - 0.12]):
    // Runs from z = zc back to z = G + 0.45, climbing from ym to y2
    const xb0 = xc - 0.12 - flightW, xb1 = xc - 0.12
    const zb0 = zc, zb1 = G + 0.45
    const riseB = (y2 - ym) / nSteps, runB = (zb1 - zb0) / nSteps
    for (let i = 0; i < nSteps; i++) {
      const zStep0 = zb0 + runB * i, zStep1 = zb0 + runB * (i + 1)
      const yStep0 = ym + riseB * i, yStep1 = ym + riseB * (i + 1)
      B.add('stairs', box(xb0, yStep0 - 0.02, Math.min(zStep0, zStep1), xb1, yStep1, Math.max(zStep0, zStep1)))
      B.add('corridorTile', box(xb0 + 0.02, yStep1 - 0.02, Math.min(zStep0, zStep1), xb1 - 0.02, yStep1, Math.max(zStep0, zStep1)))
    }
    // Under-flight concrete soffit slab
    B.add('concrete', hexa(
      [[xb0, ym - T - 0.05, zb0], [xb1, ym - T - 0.05, zb0], [xb1, y2 - T - riseB, zb1], [xb0, y2 - T - riseB, zb1]],
      [[xb0, ym - 0.05, zb0], [xb1, ym - 0.05, zb0], [xb1, y2 - riseB, zb1], [xb0, y2 - riseB, zb1]]
    ))
    B.collider(hexa(
      [[xb0, ym - 0.2, zb0], [xb1, ym - 0.2, zb0], [xb1, y2 - 0.2, zb1], [xb0, y2 - 0.2, zb1]],
      [[xb0, ym, zb0], [xb1, ym, zb0], [xb1, y2, zb1], [xb0, y2, zb1]]
    ))
    // Outer sloping parapet on Flight B
    B.add('parapet', hexa(
      [[xb0 - 0.18, ym - 0.45, zb0], [xb0, ym - 0.45, zb0], [xb0, y2 - 0.45, zb1], [xb0 - 0.18, y2 - 0.45, zb1]],
      [[xb0 - 0.18, ym + 1.05, zb0], [xb0, ym + 1.05, zb0], [xb0, y2 + 1.05, zb1], [xb0 - 0.18, y2 + 1.05, zb1]]
    ), { collide: true })
  }
}
