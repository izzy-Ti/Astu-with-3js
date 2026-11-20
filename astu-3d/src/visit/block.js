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
const FLAND = 1.5 // front stair: floor landing width along the façade

export function galleryBlock(B, o) {
  const {
    len = 44, D = 8.5, G = 2.6, F = 4, FH = 3.4, P = 0.45, bay = 3.7,
    start = 'round', end = 'stair', stone = [], style = 'bracket',
    gaps = [0.3, 0.7], posters = true, gable = [true, true], roof = true, trim = [0, 0],
    front = [], // front-standing stair towers: [{ x: centre of the corridor connection, dir: -1|1 }]
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
        put('door', quad(1.3, 2.85), x0 + 0.9, y + 1.425, 0.05)
        put('plate', quad(0.24, 0.17), x0 + 1.78, y + 1.78, 0.055)
        const ww = bw - 2.0
        win(ww, 0.85, x0 + 1.75 + ww / 2, y + 2.42, 0.05, false, i, k)
        if (k === 0 && posters && i % 2 === 1 && ww > 1.5) put('poster', quad(1.9, 1.33), x0 + 1.75 + ww / 2, y + 1.22, 0.06)
      } else {
        const ww = bw - 0.5
        win(ww, 0.85, xc, y + 2.42, 0.05, false, i, k)
        // some upper-floor bays have a terracotta board panel under the window (photo 113643)
        if (k > 0 && hash(i + 9, k) < 0.14) put('panel', quad(ww * 0.62, 0.42), xc - ww * 0.12, y + 1.76, 0.05)
      }
      // back side: classroom windows
      const wb = bw - 0.8
      win(wb, 1.3, xc, y + 1.85, -D - 0.03, true, i + 40, k)
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
  for (const f of front) { frontStair(B, { ...f, F, FH, P, G, lvl }); sinks.push(f.x - f.dir * 1.8) }
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

// Stair tower standing in FRONT of the gallery (stare.png, photos 145456 / 145430 / 145543):
// a floor landing joins each corridor through an opening in its parapet; flight A (inner lane,
// against the corridor) climbs sideways along the façade to a semicircular half-landing that
// bulges out at the far side; flight B (outer lane) climbs back to the next floor's landing.
function frontStair(B, { x, dir = -1, F, FH, P, G, lvl }) {
  const RUN = 3.8, LW = 1.3 // flight run along the façade, lane width
  const zi0 = G + 0.04, zi1 = G + LW, zo0 = G + LW + 0.12, zo1 = G + 2 * LW + 0.12, zOut = zo1 + 0.18
  const xa = x + dir * FLAND / 2 // edge of the floor landing where the flights start
  const xl = xa + dir * RUN // far end of the flights (half-landing side)
  const L0 = Math.min(x - FLAND / 2, x + FLAND / 2), L1 = Math.max(x - FLAND / 2, x + FLAND / 2)
  const xBack = x - dir * FLAND / 2 // landing edge away from the flights
  const nSteps = 11, T = 0.2
  const zc = (zi0 + zo1) / 2, R = (zo1 - zi0) / 2 + 0.06
  const RB = R + 0.35 // the round landing bulges wider than the flights (photos 145456, 145543)

  const flight = (yA, yB, z0, z1, x0, x1) => {
    const rise = (yB - yA) / nSteps, run = (x1 - x0) / nSteps
    for (let i = 0; i < nSteps; i++) {
      const u = x0 + run * i, v = x0 + run * (i + 1)
      B.add('stairs', box(Math.min(u, v), yA + rise * i - 0.02, z0, Math.max(u, v), yA + rise * (i + 1), z1))
    }
    B.add('concrete', hexa(
      [[x0, yA - T - 0.05, z0], [x1, yB - T - rise, z0], [x1, yB - T - rise, z1], [x0, yA - T - 0.05, z1]],
      [[x0, yA - 0.05, z0], [x1, yB - rise, z0], [x1, yB - rise, z1], [x0, yA - 0.05, z1]]))
    B.collider(hexa(
      [[x0, yA - 0.2, z0], [x1, yB - 0.2, z0], [x1, yB - 0.2, z1], [x0, yA - 0.2, z1]],
      [[x0, yA, z0], [x1, yB, z0], [x1, yB, z1], [x0, yA, z1]]))
  }
  const sloped = (x0, x1, yA, yB, z0, z1, h, down) => B.add('parapet', hexa(
    [[x0, yA - down, z0], [x1, yB - down, z0], [x1, yB - down, z1], [x0, yA - down, z1]],
    [[x0, yA + h, z0], [x1, yB + h, z0], [x1, yB + h, z1], [x0, yA + h, z1]]), { collide: true })
  const semi = (r) => arcPts(xl, zc, r, -Math.PI / 2, Math.PI / 2, 24).map(([px, pz]) => [xl + dir * (px - xl), pz])
  const xb0 = Math.min(xBack, xBack - dir * 0.18), xb1 = Math.max(xBack, xBack - dir * 0.18)

  for (let k = 0; k < F; k++) {
    const y = lvl(k), ym = y + FH / 2, y2 = lvl(k + 1)
    // floor landing in front of the corridor opening
    B.add('concrete', box(L0, k === 0 ? 0 : y - 0.3, G - 0.2, L1, y, zo1), { collide: true })
    if (k > 0) B.add('parapet', box(L0, y - 0.45, zo1, L1, y + 1.05, zOut), { collide: true }) // outer edge
    if (k > 0) B.add('parapet', box(xb0, y - 0.45, G, xb1, y + 1.05, zOut), { collide: true }) // side
    if (k === F - 1) { // top: inner lane has no flight above -> close it
      const c0 = Math.min(xa, xa + dir * 0.18), c1 = Math.max(xa, xa + dir * 0.18)
      B.add('parapet', box(c0, y - 0.45, G, c1, y + 1.05, zo0), { collide: true })
      break
    }
    // flight A (inner lane) toward the half-landing
    flight(y, ym, zi0, zi1, xa, xl)
    sloped(xa, xl, y, ym, G - 0.02, zi0 + 0.06, 1.0, 0.3) // against the corridor
    sloped(xa, xl, y, ym, zi1, zi1 + 0.06, 1.0, 0.3)      // divider
    // semicircular half-landing (+ pier under the lowest one)
    B.add('concrete', prism(semi(RB), ym - 0.4, ym), { collide: true })
    B.add('parapet', wallPath(semi(RB + 0.03), 0.2, ym - 0.75, ym + 1.05), { collide: true })
    B.add('parapet', wallPath(semi(RB + 0.06), 0.3, ym + 0.97, ym + 1.07))
    B.add('trim', prism(semi(RB - 0.25), ym - 0.42, ym - 0.4)) // white-painted soffit
    if (k === 0) B.add('render', box(Math.min(xl + dir * 0.5, xl + dir * 1.1), 0, zc - 0.35, Math.max(xl + dir * 0.5, xl + dir * 1.1), ym - 0.35, zc + 0.35), { collide: true })
    // flight B (outer lane) back to the next floor landing
    flight(ym, y2, zo0, zo1, xl, xa)
    sloped(xl, xa, ym, y2, zo1, zOut, 1.05, k === 0 ? ym + 0.2 : 0.5) // outer face: solid down to the ground on the first run
    sloped(xl, xa, ym, y2, zo0 - 0.06, zo0, 1.0, 0.3)
  }
  // ground: steps up from the walkway onto the first landing
  B.add('stairs', box(L0, 0, zOut, L1, P * 0.5, zOut + 0.35))
  B.collider(hexa([[L0, 0, zOut + 0.9], [L1, 0, zOut + 0.9], [L1, 0, zo1 - 0.1], [L0, 0, zo1 - 0.1]],
    [[L0, 0.02, zOut + 0.9], [L1, 0.02, zOut + 0.9], [L1, P, zo1 - 0.1], [L0, P, zo1 - 0.1]]))
}
