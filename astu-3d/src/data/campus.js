// ASTU campus layout data.
//
// All coordinates are in "map units" = pixels of photos/top_satelite/full.jpg (925 x 1255).
// Scale: METERS_PER_UNIT = 1.35.
// Georeferenced & aligned to satellite imagery (~8.5635° N, 39.2919° E) and anchored
// to the 3 locked 3D buildings in src/visit/site510.js.

import detected from './detected.json'
import { SPORTS, SPORTS_REGION } from './stadium.js'

export const MAP = { width: 925, height: 1255 }
export const METERS_PER_UNIT = 1.35
export const ROAD_WIDTH = { main: 9, road: 5.5, lane: 3.4, path: 2.2 }

// Unified 1:1 map coordinates for all zones
const TF = {
  1: [0, 0, 1, 1],
  2: [0, 0, 1, 1],
  3: [0, 0, 1, 1],
  4: [0, 0, 1, 1],
  5: [0, 0, 1, 1],
  6: [0, 0, 1, 1],
}

const toFull = (z, [x, y]) => [+(x).toFixed(1), +(y).toFixed(1)]
const mapPts = (z, pts) => pts

function rectPts(cx, cy, w, h, deg = 0) {
  const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a)
  return [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]].map(([x, y]) => [
    +(cx + x * c - y * s).toFixed(1),
    +(cy + x * s + y * c).toFixed(1),
  ])
}
function ellipsePts(cx, cy, rx, ry, n = 40) {
  return Array.from({ length: n }, (_, i) => {
    const t = (i / n) * Math.PI * 2
    return [+(cx + Math.cos(t) * rx).toFixed(1), +(cy + Math.sin(t) * ry).toFixed(1)]
  })
}
function triPts(cx, cy, r, deg = 0) {
  return [0, 1, 2].map((i) => {
    const t = ((deg - 90 + i * 120) * Math.PI) / 180
    return [+(cx + Math.cos(t) * r).toFixed(1), +(cy + Math.sin(t) * r).toFixed(1)]
  })
}

// ---------------------------------------------------------------------------------------------
export const BUILDING_TYPES = {
  dorm:       { label: 'Dormitory (courtyard block)', color: '#d4dade', courtyard: true, floors: 4 },
  dormRed:    { label: 'Dormitory (red roof)',        color: '#c56e57', courtyard: true, floors: 4 },
  block:      { label: 'Residential / office block',  color: '#c9d1d7', floors: 3 },
  academic:   { label: 'Academic / lecture building', color: '#aebfcd', floors: 3 },
  academicC:  { label: 'Academic (courtyard)',        color: '#b7c6d2', courtyard: true, floors: 3 },
  hall:       { label: 'Large hall / workshop',       color: '#9fb0bd', floors: 2 },
  tri:        { label: 'Triangle-plan cluster',       color: '#d7dce0', courtyard: true, floors: 2 },
  modern:     { label: 'Modern complex (dark roof)',  color: '#4b5560', floors: 5 },
  glass:      { label: 'Blue-roof hall',              color: '#2e4f86', floors: 3 },
  grandstand: { label: 'Stadium grandstand',          color: '#3a63b8', floors: 2 },
  gym:        { label: 'Sports hall / gym',           color: '#3d66b8', floors: 3 },
  staff:      { label: 'Small building / service',    color: '#d8cfbf', floors: 1 },
}

export const ZONES = [
  { id: 6, name: 'Zone 6 · North (forest, quarry, north dorms)', color: '#7fb069',
    poly: [[263,153],[657,144],[670,8],[880,74],[906,153],[911,332],[640,335],[532,388],[191,400],[216,341],[250,262]] },
  { id: 5, name: 'Zone 5 · West-central (dorm grid, academic core)', color: '#e0a458',
    poly: [[191,400],[532,388],[540,842],[275,835],[275,716],[80,721],[111,651],[142,560],[165,470]] },
  { id: 4, name: 'Zone 4 · East-central (stadium, sports complex, classrooms)', color: '#5fa8d3',
    poly: [[532,388],[640,335],[911,332],[920,850],[540,842]] },
  { id: 1, name: 'Zone 1 · South-west (dorms, farm plots, west gate)', color: '#c879ff',
    poly: [[80,721],[275,716],[275,835],[385,840],[365,960],[290,1041],[200,1011],[10,941],[43,818]] },
  { id: 2, name: 'Zone 2 · South (pond, orchard, open land)', color: '#f25f5c',
    poly: [[385,840],[540,842],[552,1155],[471,1111],[290,1041],[365,960],[385,840]] },
  { id: 3, name: 'Zone 3 · South-east (main gate, walled compound)', color: '#ffe066',
    poly: [[540,842],[920,850],[906,1001],[850,1242],[758,1211],[640,1185],[552,1155]] },
]

export const BOUNDARY = [
  [263.3, 152.8], [656.9, 144.0], [670.1, 8.4], [880.0, 74.0], [906.3, 152.8], [911.2, 332.0],
  [917.3, 603.2], [920.0, 861.1], [906.3, 1001.0], [850.0, 1242.0], [758.1, 1211.0], [640.0, 1185.0],
  [560.0, 1168.0], [471.0, 1111.0], [381.0, 1072.0], [290.0, 1041.0], [200.0, 1011.0], [102.0, 971.0],
  [10.0, 941.0], [19.0, 880.0], [43.0, 818.0], [80.0, 721.0], [111.0, 651.0], [142.0, 560.0],
  [165.0, 470.0], [191.0, 400.0], [216.0, 341.0], [250.0, 262.0], [263.3, 152.8]
]

// ---------------------------------------------------------------------------------------------
const buildings = []
const areas = []
const roads = []
const labels = []
const counters = {}

function B(z, cx, cy, w, h, type = 'block', ang = 0, name) {
  const t = BUILDING_TYPES[type]
  const n = (counters[z] = (counters[z] || 0) + 1)
  const outer = rectPts(cx, cy, w, h, ang)
  const hole = t.courtyard ? rectPts(cx, cy, w * 0.45, h * 0.38, ang) : null
  buildings.push({
    id: `Z${z}-${String(n).padStart(3, '0')}`,
    zone: z, type, name, floors: t.floors,
    poly: outer, hole: hole || null,
  })
}
function V(site) { buildings[buildings.length - 1].visit = site }
function Bpoly(z, pts, type, name, holePts) {
  const n = (counters[z] = (counters[z] || 0) + 1)
  buildings.push({
    id: `Z${z}-${String(n).padStart(3, '0')}`,
    zone: z, type, name, floors: BUILDING_TYPES[type].floors,
    poly: pts, hole: holePts || null,
  })
}
function Tri(z, cx, cy, r, ang = 0, name) {
  Bpoly(z, triPts(cx, cy, r, ang), 'tri', name, triPts(cx, cy, r * 0.42, ang))
}
function A(z, kind, shape, name, extra = {}) {
  let pts = shape
  if (shape.ellipse) pts = ellipsePts(...shape.ellipse)
  if (shape.rect) pts = rectPts(...shape.rect)
  areas.push({ kind, name, poly: pts, ...extra })
}
function R(z, kind, pts, name, extra = {}) {
  roads.push({ kind, name, pts, ...extra })
}
function L(z, text, at, kind = 'landmark') {
  labels.push({ text, kind, at })
}

// ===================================== CAMPUS-WIDE ROADS (map units) ==========================
R(0, 'main', [[532,388],[534,480],[536,565],[538,715],[540,842],[544,980],[548,1120],[552,1150]], 'Central Avenue')
R(0, 'road', [[215,392],[320,392],[420,390],[532,388]], 'North Road')
R(0, 'road', [[532,388],[540,370],[630,320],[706,260],[746,189],[774,95],[783,66]], 'North-East Diagonal')
R(0, 'road', [[80,721],[275,716],[420,716],[538,715],[680,715],[915,712]], 'Middle Ring Road')
R(0, 'road', [[43,825],[275,835],[385,840],[540,842],[710,844],[918,850]], 'South Ring Road')
R(0, 'road', [[275,392],[275,550],[275,716],[275,835]], 'West Spine')
R(0, 'road', [[630,320],[640,335],[910,332]], 'Zone 4 North Road')
R(0, 'main', [[43,818],[150,822],[275,835]], 'West Gate Avenue')

// Academic concourses & pedestrian connectors
R(0, 'path', [[360,532],[425,517],[480,502],[534,490]], 'Academic North Walkway')
R(0, 'path', [[360,608],[425,592],[480,577],[536,565]], 'Academic South Walkway')
R(0, 'path', [[370,568],[420,558],[460,550],[534,535]], 'Central Academic Concourse')
R(0, 'path', [[440,580],[445,650],[448,715]], 'Library-Admin Concourse')
R(0, 'path', [[536,565],[600,550],[640,520],[680,480]], 'East Campus Path')

// ===================================== ZONE 5 · ACADEMIC CORE & WEST DORMS ====================
{
  const z = 5

  // -------------------------------------------------------------
  // THE 3 LOCKED 3D BUILDINGS (exact site510.js geometry & angle)
  // -------------------------------------------------------------
  // 1) School of Electrical Engineering · north block (4 floors)
  Bpoly(z, [[421.6, 557.0], [453.1, 548.5], [455.2, 556.5], [423.7, 564.9]], 'academic', 'School of Electrical Eng. · north block'); V('b510')
  // 2) School of Electrical Engineering · south block (4 floors)
  Bpoly(z, [[426.0, 573.5], [457.5, 565.1], [459.6, 573.0], [428.1, 581.5]], 'academic', 'School of Electrical Eng. · south block'); V('b510')
  // 3) Block 510 / LAB 5 · U-block (3 floors, open courtyard facing east)
  Bpoly(z, [[377.1, 571.4], [405.0, 563.9], [406.4, 568.9], [383.5, 575.0], [386.1, 584.9], [409.0, 578.8], [410.4, 583.8], [382.4, 591.2]], 'academic', 'Block 510 (Python Lab) · LAB 5'); V('b510')

  // Walkway between EE blocks & Outdoor Café
  A(z, 'paved', [[417.8, 568.4], [457.9, 557.7], [460.2, 566.2], [420.1, 576.9]], 'Electrical Eng. walkway')
  A(z, 'paved', [[463.1, 562.9], [479.9, 558.4], [482.7, 569.0], [465.9, 573.5]], 'Café (tent canopies)')

  // -------------------------------------------------------------
  // Academic Core buildings (aligned to satellite imagery)
  // -------------------------------------------------------------
  // Context north blocks
  B(z, 424.6, 517.5, 30, 8, 'academic', -15, 'Academic Building (North)')
  B(z, 461.5, 507.6, 23, 8, 'academic', -15, 'Academic Building (North-East)')
  B(z, 375.2, 530.7, 26, 8, 'academic', -15, 'Academic Building (North-West)')
  // Context south blocks
  B(z, 454.7, 603.4, 23, 8, 'academic', -15, 'Academic Building (South)')
  B(z, 486.8, 594.8, 23, 8, 'academic', -15, 'Academic Building (South-East)')
  B(z, 415.3, 613.9, 27, 8, 'academic', -15, 'Academic Building (South-West)')
  // East laboratories
  B(z, 510.0, 545.0, 24, 8, 'academic', 75, 'Laboratories')
  // Central Library & Administration
  B(z, 465.0, 465.0, 45, 30, 'hall', 0, 'Central Library')
  B(z, 490.0, 410.0, 40, 25, 'modern', 0, 'Administration Building')
  B(z, 395.0, 465.0, 32, 22, 'academic', 0, 'Lecture Theatres A/B')
  B(z, 350.0, 480.0, 35, 20, 'hall', 0, 'Engineering Workshops')

  // South-east academic hub & Round Plaza building
  B(z, 480.0, 760.0, 35, 45, 'academic', 0, 'Round-plaza building')
  A(z, 'park', { ellipse: [480.0, 760.0, 50, 50] }, 'Round plaza')

  // -------------------------------------------------------------
  // West Dormitory Grid (15 courtyard blocks + bar blocks)
  // -------------------------------------------------------------
  // Courtyard blocks (32 x 19 map units ≈ 43 x 26 m)
  ;[
    [205, 415], [260, 415], [315, 415],
    [205, 465], [260, 465], [315, 465],
    [205, 515], [260, 515], [315, 515],
    [205, 565], [260, 565], [315, 565],
    [205, 615], [260, 615], [315, 615],
  ].forEach(([x, y]) => B(z, x, y, 32, 19, 'dorm'))

  // West bar blocks & cafeterias
  ;[
    [165, 440], [165, 490], [165, 540], [165, 590], [165, 640],
    [205, 665], [260, 665], [315, 665]
  ].forEach(([x, y]) => B(z, x, y, 28, 10, 'block'))

  // Service & staff kiosks
  ;[[150, 400], [150, 670], [350, 415], [350, 615], [245, 368]].forEach(([x, y]) => B(z, x, y, 16, 8, 'staff'))

  L(z, 'Academic Core', [440.6, 565.0])
  L(z, 'West Dorms', [260, 515])
  L(z, 'Central Library', [465, 465])
}

// ===================================== ZONE 4 · STADIUM & SPORTS & CLASSROOMS =================
{
  const z = 4

  // Sawtooth / ridge classroom clusters (replaces rough equilateral triangles)
  Bpoly(z, [[605, 435], [630, 435], [640, 455], [620, 470], [595, 470], [590, 450]], 'tri', 'Classroom Cluster A')
  Bpoly(z, [[645, 455], [670, 455], [680, 475], [660, 490], [635, 490], [630, 470]], 'tri', 'Classroom Cluster B')
  Bpoly(z, [[575, 465], [600, 465], [610, 485], [590, 500], [565, 500], [560, 480]], 'tri', 'Classroom Cluster C')
  Bpoly(z, [[615, 485], [640, 485], [650, 505], [630, 520], [605, 520], [600, 500]], 'tri', 'Classroom Cluster D')

  // Additional lecture halls & labs
  B(z, 590, 535, 45, 25, 'academicC', 0, 'Zone 4 Lecture Hall')
  ;[[660, 360, 35, 18], [710, 360, 35, 18], [660, 570, 40, 20], [710, 570, 40, 20]]
    .forEach(([x, y, w, h]) => B(z, x, y, w, h, 'academic'))

  // East staff housing
  ;[[720, 620], [750, 650], [720, 680], [750, 710], [780, 740]].forEach(([x, y]) => B(z, x, y, 20, 10, 'block'))

  L(z, 'Classroom Clusters', [615, 475])
}

// ===================================== ZONE 1 · SOUTH-WEST DORMS & FARM =======================
{
  const z = 1

  // Southwest courtyard & red-roof dorms
  ;[
    [205, 755, 'dorm'], [260, 755, 'dorm'], [315, 755, 'dormRed'],
    [205, 805, 'dorm'], [260, 805, 'dormRed'], [315, 805, 'dorm'],
  ].forEach(([x, y, t]) => B(z, x, y, 34, 18, t))

  // Demonstration farm plots
  A(z, 'farm', [[150, 850], [330, 850], [320, 970], [140, 950]], 'Demonstration farm plots', { grid: [4, 4] })
  A(z, 'farm', [[50, 840], [130, 840], [120, 930], [40, 930]], 'Agricultural plot', { grid: [2, 3] })

  // Farm sheds
  ;[[210, 835], [270, 835], [130, 850]].forEach(([x, y]) => B(z, x, y, 22, 10, 'staff'))

  L(z, 'West Gate', [43, 818], 'gate')
  L(z, 'Farm Plots', [230, 910], 'nature')
}

// ===================================== ZONE 2 · SOUTH POND & ORCHARD ==========================
{
  const z = 2

  // Accurate shoreline of the natural pond
  A(z, 'pond', [
    [360, 960], [390, 950], [420, 970], [435, 1010], [425, 1050],
    [395, 1075], [365, 1070], [345, 1040], [340, 990]
  ], 'Pond')

  // Oval dirt running loop & infield
  A(z, 'sand', { ellipse: [480, 990, 45, 60] }, 'Dirt track field')
  R(z, 'path', ellipsePts(480, 990, 55, 70, 36).concat([ellipsePts(480, 990, 55, 70, 36)[0]]), 'Dirt loop')

  // Orchard & research plots
  A(z, 'farm', [[450, 880], [530, 880], [525, 960], [445, 960]], 'Orchard', { grid: [2, 6] })

  L(z, 'Pond', [385, 1010], 'nature')
  L(z, 'Dirt Track Loop', [480, 990], 'sport')
}

// ===================================== ZONE 3 · MAIN GATE & WALLED COMPOUND ===================
{
  const z = 3

  // Main Gate Roundabout
  A(z, 'paved', { ellipse: [552, 1150, 18, 18] }, 'Main Gate Roundabout')
  A(z, 'park', { ellipse: [552, 1150, 8, 8] }, 'Gate Island')

  // Walled compound (accurate boundary & orientation)
  A(z, 'paved', [[775, 862], [915, 862], [915, 1020], [775, 1020]], 'Walled compound')
  B(z, 825, 910, 55, 60, 'modern', 0, 'Compound main block')
  B(z, 830, 975, 55, 55, 'modern', 0, 'Compound south block')
  ;[[885, 890, 25, 25], [885, 930, 25, 25], [885, 970, 25, 25]].forEach(([x, y, w, h]) => B(z, x, y, w, h, 'academic'))
  A(z, 'water', { ellipse: [855, 942, 8, 8] }, 'Fountain')

  // Blue triangular hall near gate
  Bpoly(z, [[565, 870], [605, 870], [620, 910], [575, 910]], 'glass', 'Blue exhibition hall')

  L(z, 'Main Gate', [552, 1150], 'gate')
  L(z, 'Walled Compound', [845, 940])
}

// ===================================== ZONE 6 · NORTH DORMS & FOREST ==========================
{
  const z = 6

  // North courtyard dorms
  ;[
    [810, 160], [810, 205], [810, 250],
    [850, 140], [850, 185], [850, 230], [850, 275]
  ].forEach(([x, y]) => B(z, x, y, 32, 18, 'dorm'))

  // North academic block (angled at 45°)
  B(z, 350, 270, 50, 15, 'academic', 45, 'North academic block')

  // Water tanks & quarry
  A(z, 'water', { ellipse: [550, 230, 8, 8] }, 'Water reservoir')
  A(z, 'water', { ellipse: [565, 245, 7, 7] }, 'Water reservoir')
  A(z, 'gravel', { ellipse: [680, 220, 35, 25] }, 'Quarry / gravel pit')

  L(z, 'North Dorms', [830, 210])
  L(z, 'North Forest', [500, 200], 'nature')
  L(z, 'Quarry', [680, 220])
}

// ---------------------------------------------------------------------------------------------
// Detailed sports complex (stadium.js) integrates into Zone 4
{
  const [rx0, ry0, rx1, ry1] = SPORTS_REGION
  const inR = ([x, y]) => x > rx0 && x < rx1 && y > ry0 && y < ry1
  const cOf = (p) => p.reduce((a, q) => [a[0] + q[0] / p.length, a[1] + q[1] / p.length], [0, 0])
  const keep = (arr, test) => { const k = arr.filter((o) => !test(o)); arr.length = 0; arr.push(...k) }
  keep(buildings, (b) => inR(cOf(b.poly)))
  keep(areas, (a) => inR(cOf(a.poly)))
  keep(roads, (r) => r.pts.every(inR))
  keep(labels, (l) => inR(l.at))
  areas.push(...SPORTS.areas)
  roads.push(...SPORTS.roads)
  labels.push(...SPORTS.labels)
  for (const b of SPORTS.buildings) buildings.push({ zone: 4, hole: null, keep: true, ...b })
}

// ---------------------------------------------------------------------------------------------
// Tree filtering & procedural scatter
export function pointInPoly([x, y], poly) {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}
function bbox(poly) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
  for (const [x, y] of poly) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y) }
  return [x0, y0, x1, y1]
}
function distSeg([px, py], [ax, ay], [bx, by]) {
  const dx = bx - ax, dy = by - ay
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1)))
  return Math.hypot(px - ax - t * dx, py - ay - t * dy)
}
function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const inBB = ([x, y], bb, pad = 0) => x >= bb[0] - pad && x <= bb[2] + pad && y >= bb[1] - pad && y <= bb[3] + pad

const TREE_DENSITY = { 1: 0.35, 2: 0.3, 3: 0.12, 4: 0.9, 5: 0.5, 6: 0.8 }
function proceduralTrees() {
  const rand = rng(20261107), out = [], step = 7
  for (let y = 0; y < MAP.height; y += step) {
    for (let x = 0; x < MAP.width; x += step) {
      const p = [x + rand() * step, y + rand() * step]
      const zone = ZONES.find((zn) => pointInPoly(p, zn.poly))
      if (!zone || rand() > TREE_DENSITY[zone.id]) continue
      const kind = zone.id === 4 && rand() < 0.07 ? 'p' : 'g'
      out.push([+p[0].toFixed(1), +p[1].toFixed(1), +(1.5 + rand() * 2.1).toFixed(1), kind])
    }
  }
  return out
}
const NO_TREE = new Set(['water', 'pond', 'track', 'pitch', 'court', 'paved', 'arena', 'farm', 'sand', 'concrete', 'clay', 'hardcourt', 'dirt', 'grass', 'brick'])
function filterTrees() {
  const obstacles = [
    ...buildings.map((b) => ({ poly: b.poly, bb: bbox(b.poly), pad: 1.2 })),
    ...areas.filter((a) => NO_TREE.has(a.kind)).map((a) => ({ poly: a.poly, bb: bbox(a.poly), pad: 0.5 })),
  ]
  const roadSegs = roads.flatMap((r) => r.pts.slice(1).map((b, i) => [r.pts[i], b, ROAD_WIDTH[r.kind] / 2 + (r.kind === 'path' ? 0.8 : 2)]))
  return (detected.trees.length ? detected.trees : proceduralTrees())
    .filter(([x, y]) => pointInPoly([x, y], BOUNDARY))
    .filter(([x, y]) => !obstacles.some(({ poly, bb, pad }) => inBB([x, y], bb, pad) && (pointInPoly([x, y], poly) ||
      pointInPoly([x + pad, y], poly) || pointInPoly([x - pad, y], poly) || pointInPoly([x, y + pad], poly) || pointInPoly([x, y - pad], poly))))
    .filter(([x, y]) => !roadSegs.some(([a, b, w]) => distSeg([x, y], a, b) < w))
    .map(([x, y, r, kind]) => ({ x, y, r, kind }))
}

export const campus = {
  map: MAP,
  boundary: BOUNDARY,
  zones: ZONES,
  types: BUILDING_TYPES,
  buildings,
  areas,
  roads,
  labels,
  trees: filterTrees(),
  stands: SPORTS.stands,
  decor: SPORTS.decor,
}
