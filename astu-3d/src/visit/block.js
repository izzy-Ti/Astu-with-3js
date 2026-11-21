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
      const door = i % 3 === 1 || (k === 0 && i % 4 === 3)
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
      const xl = f.xl !== undefined ? f.xl : f.x
      const dx = f.dx !== undefined ? f.dx : 1
      const o0 = Math.min(xl, xl - dx * 1.8) - 0.15, o1 = Math.max(xl, xl - dx * 1.8) + 0.15
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
  for (const f of front) {
    frontStair(B, { ...f, F, FH, P, G, lvl })
    const xl = f.xl !== undefined ? f.xl : f.x
    const dx = f.dx !== undefined ? f.dx : 1
    // Sinks position next to stair (feat1_base.jpg)
    sinks.push(xl - dx * 2.0)

    // Classroom timber door with chevron battens next to stair
    const doorX = xl - dx * 0.85
    B.frame(doorX, P + 1.05, 0.02, 0, () => B.add('door', quad(1.0, 2.1)))
    B.frame(doorX, P + 2.45, 0.02, 0, () => B.add('window', quad(1.0, 0.6)))
    B.frame(doorX, P + 2.82, 0.025, 0, () => B.add('plate', quad(0.35, 0.22)))

    // CEEC informational poster board mounted on wall (photo feat1_base.jpg)
    const px = xl - dx * 4.2
    B.frame(px, P + 1.25, 0.025, 0, () => B.add('poster', quad(1.9, 1.33)))

    // Raised concrete inspection manhole cover in front of washbasins
    const mx = xl - dx * 2.0, mz = G + 0.85
    B.add('concrete', box(mx - 0.45, 0, mz - 0.45, mx + 0.45, 0.18, mz + 0.45), { collide: true })
    B.add('fixtureSlot', box(mx - 0.38, 0.175, mz - 0.38, mx + 0.38, 0.185, mz + 0.38))
  }
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
  // twin pedestal ceramic wash-basins on the ground floor next to stair (photos 145456, fix.jpg)
  for (const sx of sinks) for (const dx of [-0.35, 0.35]) {
    const bx = sx + dx
    B.add('ceramic', new THREE.CylinderGeometry(0.07, 0.11, 0.76, 12).translate(bx, P + 0.38, 0.38))
    B.add('ceramic', box(bx - 0.26, P + 0.74, 0.06, bx + 0.26, P + 0.88, 0.52))
    B.add('metal', new THREE.CylinderGeometry(0.015, 0.015, 0.14, 8).translate(bx, P + 0.94, 0.15))
    B.add('fixtureSlot', box(bx - 0.03, P + 0.87, 0.28, bx + 0.03, P + 0.875, 0.34))
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

// Stair tower standing in FRONT of the gallery, strictly and faithfully matching fix.jpg (20261109_145502.jpg):
// Architectural anatomy:
//  - Two flights side by side along X:
//      * Flight 1 (inner): climbs along X from corridor landing (xl) to curved drum (xd) at half-floor height
//      * Flight 2 (outer): climbs along X from curved drum (xd) to upper corridor landing (xl) at next floor height
//  - Cantilevered curved drums on every floor projecting forward (+Z) into the walkway:
//      * Pure front-curving semicircular balcony (radius R)
//      * Solid roughcast parapet wall (1.05m high) with coping arris
//      * White plastered cantilever soffit slab with tapered structural support bracket
//      * Drainage pipe hole stub protruding from the curved wall
//      * Vertical blue enamel sign plaque ('B 508' / 'B 509') on second drum
//  - Outer inclined solid roughcast parapet wall on Flight 2:
//      * Closes off the steps from the walkway side (no naked floating steps!)
//      * Connects smoothly from drum parapet up to corridor parapet with S-curve transition
//  - Center divider balustrade between inner and outer flights with wood handrail
//  - Ground level:
//      * Massive vertical concrete blade pier under Drum 1 with dark grey painted dado
//      * Stepped concrete plinth and entrance steps
//      * Fully open ground-floor corridor passageway behind the stair
//  - Undersides: white plastered soffits with surface-mounted industrial fluorescent tube strip lights
//  - Roof canopy: cantilevered curved slab capping the stair tower with rectangular skylight hatch
//  - BVH collision ramps spanning all flights and landings for butter-smooth player climbing
function frontStair(B, { xl, xd, dx = 1, sign = 'B 508', F, FH, P, G, lvl }) {
  if (xl === undefined || xd === undefined) {
    const x0 = xl !== undefined ? xl : xd
    xl = x0
    xd = x0 + dx * 4.8
  }
  const Lf = Math.abs(xd - xl)
  const xMin = Math.min(xl, xd), xMax = Math.max(xl, xd)
  const R = 1.85 // drum radius
  const cz = G + 0.45
  const zApex = cz + R // furthest forward projection into walkway
  const zOuter = zApex // outer edge of outer flight matches drum apex
  const zMid = G + 1.05 // divider between inner and outer lanes
  const zInnerA = G - 0.15, zInnerB = zMid - 0.08
  const zOuterA = zMid + 0.08, zOuterB = zOuter - 0.20
  const nSteps = 11, T = 0.24

  // Drum arc points:
  // Center is at (xd, cz). Radius R = 1.85.
  // Apex is at (xd, cz + R) = (xd, zOuter).
  // The arc curves in front direction (+Z) and wraps around the outside cheek:
  const nArc = 20
  const drumArc = []
  if (dx > 0) {
    // Flight is to the left (xl < xd). Drum is to the right (xd).
    for (let i = 0; i <= nArc; i++) {
      const th = Math.PI / 2 - (i / nArc) * (Math.PI / 2 + 0.35)
      drumArc.push([xd + R * Math.cos(th), cz + R * Math.sin(th)])
    }
  } else {
    // Flight is to the right (xl > xd). Drum is to the left (xd).
    for (let i = 0; i <= nArc; i++) {
      const th = Math.PI / 2 + (i / nArc) * (Math.PI / 2 + 0.35)
      drumArc.push([xd + R * Math.cos(th), cz + R * Math.sin(th)])
    }
  }
  // Full drum floor polygon
  const drumFloorPts = [
    [xd, G],
    [xd, zOuter],
    ...drumArc,
    [dx > 0 ? xd + R : xd - R, G],
  ]

  // Under lowest drum (ground level): massive vertical concrete blade pier (feat1_base.jpg)
  const pierW = 0.40, pierZ0 = G + 0.35, pierZ1 = G + 1.65
  const pierYTop = lvl(0) + FH / 2 - 0.30
  B.add('render', box(xd - pierW / 2, 0, pierZ0, xd + pierW / 2, pierYTop, pierZ1), { collide: true })
  B.add('dado', box(xd - pierW / 2 - 0.01, 0, pierZ0 - 0.01, xd + pierW / 2 + 0.01, P + 0.70, pierZ1 + 0.01))
  B.add('trim', box(xd - pierW / 2 - 0.04, pierYTop - 0.06, pierZ0 - 0.04, xd + pierW / 2 + 0.04, pierYTop, pierZ1 + 0.04))

  // Ground level stepped concrete plinth under the drum and stair entrance
  const plinthPts1 = drumArc.map(([px, pz]) => [px + (dx > 0 ? 0.35 : -0.35), pz + 0.35])
  plinthPts1.unshift([xl, zOuter + 0.35])
  plinthPts1.unshift([xl - (dx > 0 ? 1.2 : -1.2), zOuter + 0.35])
  plinthPts1.push([dx > 0 ? xd + R + 0.45 : xd - R - 0.45, G])
  B.add('concrete', prism(plinthPts1, 0, 0.16), { collide: true })

  const plinthPts2 = drumArc.map(([px, pz]) => [px + (dx > 0 ? 0.15 : -0.15), pz + 0.15])
  plinthPts2.unshift([xl, zOuter + 0.15])
  plinthPts2.unshift([xl - (dx > 0 ? 0.8 : -0.8), zOuter + 0.15])
  plinthPts2.push([dx > 0 ? xd + R + 0.20 : xd - R - 0.20, G])
  B.add('concrete', prism(plinthPts2, 0.16, P), { collide: true })

  // Ground entrance floor & steps into corridor
  B.add('corridorTile', box(xMin - 0.8, P - 0.02, G - 0.15, xMax + 0.8, P, zOuter))
  B.add('stairs', box(xl - (dx > 0 ? 1.4 : -0.4), 0, zOuter - 0.2, xl + (dx > 0 ? 0.4 : 1.4), P * 0.5, zOuter + 0.35))
  B.collider(hexa(
    [[xl - 1.2, 0, zOuter + 0.8], [xl + 1.2, 0, zOuter + 0.8], [xl + 1.2, 0, zOuter], [xl - 1.2, 0, zOuter]],
    [[xl - 1.2, 0.02, zOuter + 0.8], [xl + 1.2, 0.02, zOuter + 0.8], [xl + 1.2, P, zOuter], [xl - 1.2, P, zOuter]]
  ))

  // Red fire bucket sitting on ground landing
  B.add('bucketRed', new THREE.CylinderGeometry(0.12, 0.09, 0.28, 8).translate(xl - (dx > 0 ? 0.6 : -0.6), P + 0.14, G + 0.45))

  for (let k = 0; k < F; k++) {
    const y = lvl(k), ym = y + FH / 2, y2 = lvl(k + 1)

    // --------------------------------------------------------
    // 1. CORRIDOR FLOOR LANDING AT xl
    // --------------------------------------------------------
    const lW = 1.8 // landing width along X
    const lx0 = dx > 0 ? xl - lW : xl, lx1 = dx > 0 ? xl : xl + lW
    // Landing slab
    B.add('concrete', box(lx0, k === 0 ? 0 : y - 0.28, G - 0.20, lx1, y, zOuter), { collide: true })
    B.add('corridorTile', box(lx0 + 0.02, y - 0.02, G - 0.18, lx1 - 0.02, y, zOuter - 0.18))
    // Landing ceiling soffit & strip light fixture
    if (k > 0) {
      B.add('trim', box(lx0, y - 0.30, G - 0.18, lx1, y - 0.28, zOuter - 0.18))
      const lMidX = (lx0 + lx1) / 2
      B.add('fixture', box(lMidX - 0.5, y - 0.34, (zOuterA + zOuterB) / 2 - 0.09, lMidX + 0.5, y - 0.29, (zOuterA + zOuterB) / 2 + 0.09))
      B.add('fixtureSlot', box(lMidX - 0.42, y - 0.345, (zOuterA + zOuterB) / 2 - 0.035, lMidX + 0.42, y - 0.34, (zOuterA + zOuterB) / 2 + 0.035))
    }
    // Landing outer cheek parapet (on the far side opposite the flights)
    if (k > 0) {
      const farX0 = dx > 0 ? lx0 : lx1 - 0.20, farX1 = dx > 0 ? lx0 + 0.20 : lx1
      B.add('parapet', box(farX0, y - 0.45, G, farX1, y + 1.05, zOuter), { collide: true })
      B.add('parapet', box(farX0 - 0.04, y + 0.97, G, farX1 + 0.04, y + 1.05, zOuter + 0.05))
    }

    if (k === F - 1) {
      // Top floor: close outer edge with parapet
      B.add('parapet', box(xMin, y - 0.45, zOuter - 0.20, xMax, y + 1.05, zOuter), { collide: true })
      B.add('parapet', box(xMin - 0.05, y + 0.97, zOuter - 0.25, xMax + 0.05, y + 1.05, zOuter + 0.05))
      break
    }

    // --------------------------------------------------------
    // 2. CANTILEVERED CURVED DRUM LANDING AT ym (Photos fix.jpg, feat2, feat4)
    // --------------------------------------------------------
    // Semicircular landing floor slab & tile
    B.add('concrete', prism(drumFloorPts, ym - 0.28, ym), { collide: true })
    B.add('corridorTile', prism(drumFloorPts, ym - 0.02, ym))
    // White plastered cantilever soffit with chamfer
    B.add('trim', prism(drumFloorPts, ym - 0.35, ym - 0.28))
    // Structural cantilever support bracket under drum (photo feat4_upper_drums.jpg)
    const brkX0 = xd - 0.20, brkX1 = xd + 0.20
    B.add('trim', hexa(
      [[brkX0, ym - 0.85, G], [brkX1, ym - 0.85, G], [brkX1, ym - 0.35, cz + R * 0.7], [brkX0, ym - 0.35, cz + R * 0.7]],
      [[brkX0, ym - 0.35, G], [brkX1, ym - 0.35, G], [brkX1, ym - 0.35, cz + R * 0.7], [brkX0, ym - 0.35, cz + R * 0.7]]
    ))

    // Solid roughcast curved parapet wall along drumArc:
    B.add('parapet', wallPath(drumArc, 0.22, ym - 0.50, ym + 1.05), { collide: true })
    // Smooth capping arris on top of drum parapet
    B.add('parapet', wallPath(drumArc, 0.30, ym + 0.97, ym + 1.06))
    // Drainage pipe stub protruding from curved wall (photo feat2_drum1.jpg)
    const spoutTh = dx > 0 ? Math.PI / 2 - 0.3 : Math.PI / 2 + 0.3
    const spoutX = xd + (R + 0.05) * Math.cos(spoutTh), spoutZ = cz + (R + 0.05) * Math.sin(spoutTh)
    B.add('metal', new THREE.CylinderGeometry(0.025, 0.025, 0.20, 8).rotateX(Math.PI / 2).translate(spoutX, ym + 0.35, spoutZ))

    // Vertical blue enamel building sign plaque on Drum 2 (Level 2, photo feat4_upper_drums.jpg)
    if (k === 1) {
      const signKey = sign.includes('508') ? 'towerSign508' : sign.includes('509') ? 'towerSign509' : 'towerSign510'
      const signTh = dx > 0 ? Math.PI / 2 - 0.15 : Math.PI / 2 + 0.15
      const signPx = xd + (R + 0.16) * Math.cos(signTh), signPz = cz + (R + 0.16) * Math.sin(signTh)
      B.frame(signPx, ym + 0.45, signPz, dx > 0 ? -0.15 : 0.15, () => B.add(signKey, quad(0.60, 1.15)))
    }

    // --------------------------------------------------------
    // 3. FLIGHT 1 (INNER FLIGHT, climbing along X from xl to xd):
    // --------------------------------------------------------
    const rise1 = (ym - y) / nSteps, run1 = (xd - xl) / nSteps
    for (let i = 0; i < nSteps; i++) {
      const sX0 = xl + run1 * i, sX1 = xl + run1 * (i + 1)
      const sY0 = y + rise1 * i, sY1 = y + rise1 * (i + 1)
      B.add('stairs', box(Math.min(sX0, sX1), sY0 - 0.02, zInnerA, Math.max(sX0, sX1), sY1, zInnerB))
      B.add('corridorTile', box(Math.min(sX0, sX1) + 0.01, sY1 - 0.02, zInnerA + 0.02, Math.max(sX0, sX1) - 0.01, sY1, zInnerB - 0.02))
    }
    // Inclined plastered soffit slab under Flight 1:
    B.add('trim', hexa(
      [[xl, y - T - 0.06, zInnerA], [xl, y - T - 0.06, zInnerB], [xd, ym - T - rise1, zInnerB], [xd, ym - T - rise1, zInnerA]],
      [[xl, y - 0.06, zInnerA], [xl, y - 0.06, zInnerB], [xd, ym - rise1, zInnerB], [xd, ym - rise1, zInnerA]]
    ))
    // BVH collision ramp for Flight 1:
    B.collider(hexa(
      [[xl, y - 0.20, zInnerA], [xl, y - 0.20, zInnerB], [xd, ym - 0.20, zInnerB], [xd, ym - 0.20, zInnerA]],
      [[xl, y, zInnerA], [xl, y, zInnerB], [xd, ym, zInnerB], [xd, ym, zInnerA]]
    ))
    // Industrial fluorescent strip light fixture on angled soffit of Flight 1 (photo feat3_flight1.jpg)
    const midX1 = (xl + xd) / 2, midY1 = (y + ym) / 2 - T - 0.12, midZ1 = (zInnerA + zInnerB) / 2
    B.add('fixture', box(midX1 - 0.55, midY1 - 0.04, midZ1 - 0.09, midX1 + 0.55, midY1 + 0.04, midZ1 + 0.09))
    B.add('fixtureSlot', box(midX1 - 0.46, midY1 - 0.05, midZ1 - 0.035, midX1 + 0.46, midY1 - 0.035, midZ1 + 0.035))

    // Center divider balustrade wall between Flight 1 and Flight 2:
    B.add('parapet', hexa(
      [[xl, y - 0.15, zInnerB], [xl, y - 0.15, zOuterA], [xd, ym - 0.15, zOuterA], [xd, ym - 0.15, zInnerB]],
      [[xl, y + 0.90, zInnerB], [xl, y + 0.90, zOuterA], [xd, ym + 0.90, zOuterA], [xd, ym + 0.90, zInnerB]]
    ), { collide: true })
    // Handrail on divider
    B.add('wood', hexa(
      [[xl, y + 0.88, zInnerB - 0.02], [xl, y + 0.88, zOuterA + 0.02], [xd, ym + 0.88, zOuterA + 0.02], [xd, ym + 0.88, zInnerB - 0.02]],
      [[xl, y + 0.95, zInnerB - 0.02], [xl, y + 0.95, zOuterA + 0.02], [xd, ym + 0.95, zOuterA + 0.02], [xd, ym + 0.95, zInnerB - 0.02]]
    ))

    // --------------------------------------------------------
    // 4. FLIGHT 2 (OUTER FLIGHT, climbing along X from xd to xl):
    // --------------------------------------------------------
    const rise2 = (y2 - ym) / nSteps, run2 = (xl - xd) / nSteps
    for (let i = 0; i < nSteps; i++) {
      const sX0 = xd + run2 * i, sX1 = xd + run2 * (i + 1)
      const sY0 = ym + rise2 * i, sY1 = ym + rise2 * (i + 1)
      B.add('stairs', box(Math.min(sX0, sX1), sY0 - 0.02, zOuterA, Math.max(sX0, sX1), sY1, zOuterB))
      B.add('corridorTile', box(Math.min(sX0, sX1) + 0.01, sY1 - 0.02, zOuterA + 0.02, Math.max(sX0, sX1) - 0.01, sY1, zOuterB - 0.02))
    }
    // Inclined plastered soffit slab under Flight 2:
    B.add('trim', hexa(
      [[xd, ym - T - 0.06, zOuterA], [xd, ym - T - 0.06, zOuterB], [xl, y2 - T - rise2, zOuterB], [xl, y2 - T - rise2, zOuterA]],
      [[xd, ym - 0.06, zOuterA], [xd, ym - 0.06, zOuterB], [xl, y2 - rise2, zOuterB], [xl, y2 - rise2, zOuterA]]
    ))
    // BVH collision ramp for Flight 2:
    B.collider(hexa(
      [[xd, ym - 0.20, zOuterA], [xd, ym - 0.20, zOuterB], [xl, y2 - 0.20, zOuterB], [xl, y2 - 0.20, zOuterA]],
      [[xd, ym, zOuterA], [xd, ym, zOuterB], [xl, y2, zOuterB], [xl, y2, zOuterA]]
    ))
    // Industrial fluorescent strip light fixture on angled soffit of Flight 2
    const midX2 = (xd + xl) / 2, midY2 = (ym + y2) / 2 - T - 0.12, midZ2 = (zOuterA + zOuterB) / 2
    B.add('fixture', box(midX2 - 0.55, midY2 - 0.04, midZ2 - 0.09, midX2 + 0.55, midY2 + 0.04, midZ2 + 0.09))
    B.add('fixtureSlot', box(midX2 - 0.46, midY2 - 0.05, midZ2 - 0.035, midX2 + 0.46, midY2 - 0.035, midZ2 + 0.035))

    // --------------------------------------------------------
    // 5. SOLID INCLINED PARAPET ON FLIGHT 2 FACING WALKWAY (Photos fix.jpg, feat1, feat3)
    // --------------------------------------------------------
    // Hides the steps completely from the walkway!
    // Connects seamlessly from the drum apex (xd, ym) up to the corridor landing (xl, y2):
    const pZ0 = zOuter - 0.22, pZ1 = zOuter
    B.add('parapet', hexa(
      [[xd, ym - 0.50, pZ0], [xd, ym - 0.50, pZ1], [xl, y2 - 0.50, pZ1], [xl, y2 - 0.50, pZ0]],
      [[xd, ym + 1.05, pZ0], [xd, ym + 1.05, pZ1], [xl, y2 + 1.05, pZ1], [xl, y2 + 1.05, pZ0]]
    ), { collide: true })
    // Smooth capping arris along inclined parapet top:
    B.add('parapet', hexa(
      [[xd, ym + 0.97, pZ0 - 0.04], [xd, ym + 0.97, pZ1 + 0.04], [xl, y2 + 0.97, pZ1 + 0.04], [xl, y2 + 0.97, pZ0 - 0.04]],
      [[xd, ym + 1.06, pZ0 - 0.04], [xd, ym + 1.06, pZ1 + 0.04], [xl, y2 + 1.06, pZ1 + 0.04], [xl, y2 + 1.06, pZ0 - 0.04]]
    ))

    // --------------------------------------------------------
    // 6. S-CURVE TRANSITION PARAPET AT CORRIDOR JUNCTION (Photo feat3_flight1.jpg)
    // --------------------------------------------------------
    const sPts = [
      [xl, zOuter],
      [xl, G],
      [dx > 0 ? xl - 0.20 : xl + 0.20, G],
      [dx > 0 ? xl - 0.20 : xl + 0.20, zOuter],
    ]
    B.add('parapet', prism(sPts, y2 - 0.50, y2 + 1.05), { collide: true })
    B.add('parapet', prism(sPts, y2 + 0.97, y2 + 1.06))
  }

  // --------------------------------------------------------
  // 7. ROOF CANOPY AT TOP OF STAIR TOWER (Photo feat4_upper_drums.jpg)
  // --------------------------------------------------------
  const yRoof = lvl(F)
  B.add('concrete', prism(drumFloorPts, yRoof, yRoof + 0.25), { collide: true })
  B.add('trim', prism(drumFloorPts, yRoof - 0.08, yRoof)) // white painted soffit
  // Curved roof parapet rim
  B.add('parapet', wallPath(drumArc, 0.22, yRoof, yRoof + 0.40))
  // Skylight opening / vent hatch in roof canopy
  const hx = xd + (dx > 0 ? 0.3 : -0.3), hz = cz + 0.8
  B.add('fixtureSlot', box(hx - 0.40, yRoof + 0.24, hz - 0.30, hx + 0.40, yRoof + 0.26, hz + 0.30))
}

