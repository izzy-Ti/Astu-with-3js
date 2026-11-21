// Block 510 / LAB 5 / School of Electrical Engineering cluster (academic core).
// Layout from photos/buildings/001/ref3.png (Google Maps) and the ground photos in 001 + 002:
//  - Main pair (Electrical Eng.): two 4-storey bracket-gallery slabs facing each other across a
//    planted walkway. West ends: ashlar stone walls with stacked D-balconies. East ends: the
//    switchback stairs (flights inside the gallery end bays, round half-landings outside).
//    East of the stairs: twin Canary palms, an old dead tree, an outdoor café under tent canopies.
//  - Block 510 / LAB 5: a 3-storey U-block (column galleries round a narrow paved court, open to
//    the east, plain gable ends, square stair landings) across a dirt yard to the west.
// Site frame: x along the blocks (ENE), z across (SSE).
import * as THREE from 'three'
import { Builder, box, prism, rectPts, hexa } from './builder.js'
import { galleryBlock } from './block.js'
import { tree, palm, conifer, shrub, lamp, noticeBoard, planter, roundPlanter, tent, cafeTable, fence, rng } from './nature.js'

export const SITE_ROT = (15 * Math.PI) / 180 // blocks run ~15° north of east

export function buildSite() {
  const B = new Builder()
  const globes = []
  const places = []
  const keepOut = []
  const ko = (x0, z0, x1, z1) => keepOut.push([Math.min(x0, x1), Math.min(z0, z1), Math.max(x0, x1), Math.max(z0, z1)])

  B.add('dirt', box(-1600, -0.2, -1600, 1600, 0, 1600), { collide: true })

  B.frame(0, 0, 0, SITE_ROT, () => {
    // ---------------------------------------------------------------- roads & paths
    B.add('road', prism(rectPts(-170, -38, 170, -31), 0, 0.03), { collide: true }); ko(-170, -39, 170, -30)
    B.add('road', prism(rectPts(-170, 33, 170, 40), 0, 0.03), { collide: true }); ko(-170, 32, 170, 41)
    B.add('road', prism(rectPts(72, -170, 80, 170), 0, 0.035), { collide: true }); ko(71, -170, 81, 170)

    // ================================================== MAIN PAIR · School of Electrical Eng.
    const L = 44, D = 8.5, G = 2.6, W = 6 // W = half-gap between gallery edges
    // North block (Block 508): front stair at x = 10.8 (world X: -11.2 .. -4.8, closer to 510), projecting South into walkway
    B.frame(-L / 2, 0, -W - G, 0, () => galleryBlock(B, { len: L, D, G, start: 'round', end: 'round', stone: ['start'], front: [{ x: 10.8, dx: 1, sign: 'B 508' }] }))
    // South block (Block 509): front stair at x = 33.2 (world X: -11.2 .. -4.8, closer to 510), projecting North into walkway
    B.frame(L / 2, 0, W + G, Math.PI, () => galleryBlock(B, { len: L, D, G, start: 'round', end: 'round', stone: ['end'], front: [{ x: 33.2, dx: -1, sign: 'B 509' }] }))
    ko(-L / 2 - 3, -W - G - D - 2, L / 2 + 3, W + G + D + 2)
    places.push({ name: 'School of Electrical Engineering · Block 508 (north block)', x: 0, z: -W - G - D / 2, r: 30 })
    places.push({ name: 'School of Electrical Engineering · Block 509 (south block)', x: 0, z: W + G + D / 2, r: 30 })
    places.push({ name: 'Electrical Eng. walkway', x: 0, z: 0, r: 24 })

    // walkway: central paving + paved margins along the low walls, long raised planters between
    B.add('paving', prism(rectPts(-30, -W, 26, W), 0, 0.05), { collide: true })
    // front stair towers stand at world X = -11.2 .. -4.8 on both sides (bays 3-4 from west stone ends):
    // planter beds leave a wide generous clear plaza around X = -13.5 .. -4.0
    const side = {
      [-1]: { beds: [[-21.0, -13.5], [-4.0, 6.5], [8.5, 18.0]], palms: [-18, -1.0, 4.5, 11.5, 15.5], trees: [-16, 2.0, 14] },
      [1]: { beds: [[-21.0, -13.5], [-4.0, 6.5], [8.5, 18.0]], palms: [-18, -1.0, 5.0, 11.5, 15.5], trees: [-16, 2.0, 13.8] },
    }
    for (const s of [-1, 1]) {
      const cfg = side[s], zz = s * 3.3
      for (const [x0, x1] of cfg.beds) planter(B, x0, s * 1.9, x1, s * 4.7, 0.32)
      cfg.palms.forEach((x, i) => palm(B, x, zz + (i % 2 ? 0.5 : -0.4) * s, { h: 0.5 + (i % 3) * 0.4, fronds: 13, flen: 1.4, trunkR: 0.11, seed: 30 + i + s * 10 }))
      cfg.trees.forEach((x, i) => tree(B, x, zz, { h: 6 + (i % 2), crown: 1.8, kind: i % 2 ? 'round' : 'tulip', seed: 70 + i + s * 5 }))
      shrub(B, s * 9, zz, { s: 0.9, seed: 3 + s })
      lamp(B, -10.0, s * 1.6, globes) // tall lamp at the stair foot (photo 145543, fix.jpg)
      lamp(B, 7.5, s * 1.6, globes) // walkway lamp
    }
    // west entrance: big Canary palm, lamp, cluster of green notice-board stands (145634-145638)
    B.add('paving', prism(rectPts(-34, -2.2, -30, 2.2), 0, 0.05), { collide: true })
    roundPlanter(B, -27.5, 3.8, 1.5); palm(B, -27.5, 3.8, { h: 3.4, seed: 41, flen: 3.6 })
    lamp(B, -26.5, -3.0, globes); lamp(B, -24, 3.0, globes)
    noticeBoard(B, -29.5, -4.2, 0.3); noticeBoard(B, -27.6, -4.6, 0.1); noticeBoard(B, -31.3, -3.6, 0.5)
    // twin Canary palms beside the south block's stair end (145520-145548)
    palm(B, 24.6, 4.4, { h: 3.6, seed: 43, flen: 3.8, fronds: 34 }); palm(B, 25.6, 5.8, { h: 3.0, seed: 44, flen: 3.4 })
    palm(B, 25.2, -4.6, { h: 2.6, seed: 45 })
    tree(B, 24.8, 11.2, { h: 6, crown: 2.6, kind: 'bare', seed: 9 }) // old dead tree by the round corner
    tree(B, 24.5, -12.5, { h: 7, crown: 3.2, kind: 'jacaranda', seed: 12 })

    // ------------------------------------------------ outdoor café east of the stairs
    B.add('paving', prism(rectPts(26, -2, 72, 2), 0, 0.04), { collide: true }); ko(26, -3, 72, 3)
    B.add('paving', prism(rectPts(30, 3.5, 48, 15), 0, 0.35), { collide: true }) // raised terrace
    B.add('stairs', box(30, 0, 2.9, 48, 0.18, 3.5))
    B.collider(prism(rectPts(30, 2.6, 48, 3.5), 0, 0.2))
    ko(29, 2, 50, 17)
    ;[[33.5, 7], [39, 7], [44.5, 7], [36, 12.2], [42, 12.2]].forEach(([x, z], i) => {
      tent(B, x, z, 4.2)
      B.frame(0, 0.35, 0, 0, () => cafeTable(B, x, z, i + 1))
    })
    B.add('kiosk', box(44, 0.35, 12.5, 48, 2.9, 15), { collide: true })
    B.add('roof', box(43.6, 2.9, 12.1, 48.4, 3.05, 15.4))
    places.push({ name: 'Café (tent canopies)', x: 39, z: 9, r: 10 })
    fence(B, [[23.5, 2.6], [29.5, 2.6]]); fence(B, [[26, -2.6], [60, -2.6]]); fence(B, [[48.5, 2.6], [60, 2.6]])

    // ================================================== BLOCK 510 / LAB 5 · U-block
    const UL = 32, UD = 7, UG = 2.4, UW = 4.5, UX = -78, UF = 3 // wings run UX..UX+UL
    const uz = UW + UG + UD // outer face of the wings
    B.frame(UX, 0, -UW - UG, 0, () => galleryBlock(B, { len: UL, D: UD, G: UG, F: UF, style: 'column', start: 'open', end: 'plain', gable: [false, true], trim: [UG, 0], gaps: [0.45], posters: false }))
    B.frame(UX + UL, 0, UW + UG, Math.PI, () => galleryBlock(B, { len: UL, D: UD, G: UG, F: UF, style: 'column', start: 'plain', end: 'open', gable: [true, false], trim: [0, UG], gaps: [0.55], posters: false }))
    // cross wing closing the west side of the court (gallery faces east)
    B.frame(UX, 0, UW + UG, Math.PI / 2, () => galleryBlock(B, { len: 2 * (UW + UG), D: UD, G: UG, F: UF, style: 'column', start: 'open', end: 'open', gable: [false, false], roof: false, trim: [UG, UG], gaps: [0.5], posters: false }))
    for (const s of [-1, 1]) { // corner masses where the wings meet the cross wing
      const z0 = s * (UW + UG), z1 = s * uz
      B.add('render', box(UX - UD, 0, Math.min(z0, z1), UX, 0.45 + UF * 3.4 + 0.45, Math.max(z0, z1)), { collide: true })
    }
    B.add('roof', box(UX - UD - 0.4, 0.45 + UF * 3.4 + 0.45, -uz - 0.4, UX + 0.2, 0.45 + UF * 3.4 + 0.6, uz + 0.4))

    // Courtyard central paving and side drainage gutters (photo 145622)
    B.add('paving', prism(rectPts(UX, -UW + 0.4, UX + UL + 2, UW - 0.4), 0, 0.05), { collide: true })
    // Sunken drainage troughs along both sides
    B.add('curb', box(UX, 0, -UW - 0.35, UX + UL + 1.5, 0.02, -UW + 0.35))
    B.add('curb', box(UX, 0, UW - 0.35, UX + UL + 1.5, 0.02, UW + 0.35))
    // Elevated wing walkway slabs
    B.add('corridorTile', box(UX, 0.02, -UW - UG, UX + UL, 0.08, -UW - 0.35), { collide: true })
    B.add('corridorTile', box(UX, 0.02, UW + 0.35, UX + UL, 0.08, UW + UG), { collide: true })
    // Access bridges across the gutters
    for (const bx of [UX + 6, UX + 14, UX + 22]) {
      B.add('curb', box(bx - 0.8, 0.05, -UW - 0.4, bx + 0.8, 0.08, -UW + 0.4), { collide: true })
      B.add('curb', box(bx - 0.8, 0.05, UW - 0.4, bx + 0.8, 0.08, UW + 0.4), { collide: true })
    }

    // Central open staircase at the west cross-wing (photo 145622)
    {
      const sx0 = UX + 0.2, sx1 = UX + 3.2, sz0 = -1.6, sz1 = 1.6
      for (let k = 0; k < UF - 1; k++) {
        const y0 = 0.45 + k * 3.4, ym = y0 + 1.7, y1 = 0.45 + (k + 1) * 3.4
        // Landing at halfway height
        B.add('concrete', box(sx0, ym - 0.25, sz0, sx0 + 1.2, ym, sz1), { collide: true })
        B.add('corridorTile', box(sx0, ym - 0.02, sz0, sx0 + 1.2, ym, sz1))
        B.add('parapet', box(sx0 - 0.15, ym - 0.3, sz0, sx0, ym + 1.0, sz1), { collide: true })
        // Flight 1: from y0 up to ym (north lane)
        const nSt = 9, run = 2.0 / nSt, rse = 1.7 / nSt
        for (let i = 0; i < nSt; i++) {
          B.add('stairs', box(sx0 + 1.2 + run * i, y0 + rse * i, -1.5, sx0 + 1.2 + run * (i + 1), y0 + rse * (i + 1), -0.1))
        }
        B.collider(hexa([[sx0 + 1.2, y0, -1.5], [sx1, ym, -1.5], [sx1, ym, -0.1], [sx0 + 1.2, y0, -0.1]],
          [[sx0 + 1.2, y0 + 0.02, -1.5], [sx1, ym + 0.02, -1.5], [sx1, ym + 0.02, -0.1], [sx0 + 1.2, y0 + 0.02, -0.1]]))
        // Flight 2: from ym up to y1 (south lane)
        for (let i = 0; i < nSt; i++) {
          B.add('stairs', box(sx1 - run * (i + 1), ym + rse * i, 0.1, sx1 - run * i, ym + rse * (i + 1), 1.5))
        }
        B.collider(hexa([[sx1, ym, 0.1], [sx0 + 1.2, y1, 0.1], [sx0 + 1.2, y1, 1.5], [sx1, ym, 1.5]],
          [[sx1, ym + 0.02, 0.1], [sx0 + 1.2, y1 + 0.02, 0.1], [sx0 + 1.2, y1 + 0.02, 1.5], [sx1, ym + 0.02, 1.5]]))
        // Central handrail divider
        B.add('metal', box(sx0 + 1.1, y0, -0.05, sx1, y1 + 1.0, 0.05))
      }
    }

    lamp(B, UX + UL - 1.5, -UW + 0.8, globes); lamp(B, UX + 12, UW - 0.8, globes)
    // Trees inside and around Block 510 court (photos 145622, 145624)
    tree(B, UX + UL - 1.5, -UW + 1.5, { h: 7, crown: 3.2, kind: 'round', seed: 81 })
    tree(B, UX + UL + 3.5, -UW - 1.5, { h: 7.5, crown: 3.5, kind: 'round', seed: 83 })
    conifer(B, UX + UL + 4.5, UW + 1.2, { h: 5.5, seed: 82 })
    ko(UX - UD - 3, -uz - 3, UX + UL + 6, uz + 3)
    places.push({ name: 'Block 510 · Python Lab (north wing)', x: UX + UL / 2, z: -UW - UG - UD / 2, r: 18 })
    places.push({ name: 'LAB 5 (south wing)', x: UX + UL / 2, z: UW + UG + UD / 2, r: 18 })
    places.push({ name: 'Block 510 court', x: UX + UL / 2, z: 0, r: 16 })

    // dirt yard between the U-block and the stone ends: big bushes + acacias (145630-145638)
    shrub(B, -40, -14, { s: 4.5, seed: 91 }); shrub(B, -36, -17, { s: 3.5, seed: 92 }); shrub(B, -41, 15, { s: 3.8, seed: 93 })
    tree(B, -38, 19, { h: 9, crown: 6, kind: 'umbrella', seed: 94 })
    tree(B, -43, -22, { h: 8, crown: 5.5, kind: 'umbrella', seed: 95 })
    ko(-44, -6, -24, 6) // keep the yard path clear

    // --------------------------------------------- context buildings (simpler)
    const ctx = [
      [-25, -60, 40, 0, 3], [25, -62, 30, 0, 2], [-90, -55, 34, 0, 3],
      [-10, 55, 30, Math.PI, 2], [32, 55, 30, Math.PI, 2], [-62, 57, 36, Math.PI, 3],
      [100, -20, 30, -Math.PI / 2, 3], [100, 30, 30, -Math.PI / 2, 2],
    ]
    ctx.forEach(([x, z, len, ry, F], i) => {
      B.frame(x, 0, z, ry, () => galleryBlock(B, { len, D: 8, G: 2.4, F, start: i % 2 ? 'round' : 'plain', end: i % 3 ? 'stair' : 'round', stone: i % 3 === 0 ? ['start'] : [] }))
      const c = Math.cos(ry), s = Math.sin(ry)
      const pts = [[-3, -9], [len + 3, -9], [len + 3, 4], [-3, 4]].map(([a, b]) => [x + a * c + b * s, z - a * s + b * c])
      ko(Math.min(...pts.map((p) => p[0])) - 1, Math.min(...pts.map((p) => p[1])) - 1, Math.max(...pts.map((p) => p[0])) + 1, Math.max(...pts.map((p) => p[1])) + 1)
    })

    // ------------------------------------------------------------- scattered trees
    const r = rng(2024)
    let placed = 0
    for (let tries = 0; placed < 260 && tries < 8000; tries++) {
      const x = -160 + r() * 320, z = -115 + r() * 230
      if (keepOut.some(([a, b, c, d]) => x > a - 1 && x < c + 1 && z > b - 1 && z < d + 1)) continue
      const roll = r()
      const kind = roll < 0.3 ? 'umbrella' : roll < 0.42 ? 'jacaranda' : roll < 0.5 ? 'tulip' : 'round'
      if (roll > 0.94) palm(B, x, z, { h: 3 + r() * 3, seed: placed })
      else if (roll > 0.88) conifer(B, x, z, { h: 5 + r() * 4, seed: placed })
      else tree(B, x, z, { h: 6 + r() * 6, crown: 2.5 + r() * 3, kind, seed: placed + 100 })
      placed++
    }
  })

  return { builder: B, globes, places }
}

// west entrance of the walkway looking east (like photo 145640)
export const START = { x: -35, z: -0.6, yaw: -Math.PI / 2 }

export function toWorld(x, z) {
  const c = Math.cos(SITE_ROT), s = Math.sin(SITE_ROT)
  return new THREE.Vector3(x * c + z * s, 0, -x * s + z * c)
}
