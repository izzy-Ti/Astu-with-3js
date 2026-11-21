// ASTU campus layout data.
//
// All final coordinates are in "map units" = pixels of photos/top_satelite/full.jpg (925 x 1255).
// Each zone was traced on its zoomed image (photos/top_satelite/<n>.jpg) in that image's own
// pixel space, then mapped into full.jpg space with a per-zone affine transform (TF below).
// The same data will drive the 3D build (x -> X, y -> Z, floors -> height).

import detected from './detected.json' with { type: 'json' }
import { SPORTS, SPORTS_REGION } from './stadium.js'

export const MAP = { width: 925, height: 1255 }

// zone -> [offsetX, offsetY, scaleX, scaleY]  (zoomed-image px -> full.jpg px)
// Calibrated against shared landmarks (roads, stadium, red-roof dorms, the blue triangle hall).
const TF = {
  1: [14, 712, 0.282, 0.295],
  2: [295, 836, 0.278, 0.29],
  3: [543, 843, 0.333, 0.33],
  4: [535, 318, 0.424, 0.4375],
  5: [47, 384, 0.433, 0.434],
  6: [181, 13, 0.565, 0.55],
}

const toFull = (z, [x, y]) => {
  const [ox, oy, sx, sy] = TF[z]
  return [+(ox + x * sx).toFixed(1), +(oy + y * sy).toFixed(1)]
}
const mapPts = (z, pts) => (z ? pts.map((p) => toFull(z, p)) : pts)

function rectPts(cx, cy, w, h, deg = 0) {
  const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a)
  return [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]].map(([x, y]) => [
    cx + x * c - y * s,
    cy + x * s + y * c,
  ])
}
function ellipsePts(cx, cy, rx, ry, n = 40) {
  return Array.from({ length: n }, (_, i) => {
    const t = (i / n) * Math.PI * 2
    return [cx + Math.cos(t) * rx, cy + Math.sin(t) * ry]
  })
}
function triPts(cx, cy, r, deg = 0) {
  return [0, 1, 2].map((i) => {
    const t = ((deg - 90 + i * 120) * Math.PI) / 180
    return [cx + Math.cos(t) * r, cy + Math.sin(t) * r]
  })
}

// ---------------------------------------------------------------------------------------------
// Building categories. Function is inferred from roof shape/size on the satellite image —
// names/uses will be corrected once real building info + photos are provided.
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
    poly: [[285,150],[655,140],[668,8],[880,70],[905,150],[910,335],[640,338],[540,390],[190,400],[215,340],[250,260]] },
  { id: 5, name: 'Zone 5 · West-central (dorm grid, academic core)', color: '#e0a458',
    poly: [[190,400],[540,390],[546,840],[270,826],[270,716],[85,714],[110,650],[140,560],[165,470]] },
  { id: 4, name: 'Zone 4 · East-central (stadium, triangle clusters)', color: '#5fa8d3',
    poly: [[540,390],[640,338],[910,335],[915,860],[546,842]] },
  { id: 1, name: 'Zone 1 · South-west (dorms, farm plots, west gate)', color: '#c879ff',
    poly: [[85,714],[270,716],[270,826],[385,835],[380,860],[345,960],[290,1045],[200,1010],[10,940],[40,820]] },
  { id: 2, name: 'Zone 2 · South (pond, orchard, open land)', color: '#f25f5c',
    poly: [[385,835],[546,842],[555,1165],[470,1110],[290,1045],[345,960],[380,860]] },
  { id: 3, name: 'Zone 3 · South-east (main gate, new compound)', color: '#ffe066',
    poly: [[546,842],[915,860],[905,1000],[870,1170],[850,1240],[760,1210],[640,1185],[555,1165]] },
]

export const BOUNDARY = [
  [285,150],[655,140],[668,6],[780,32],[880,72],[902,150],[906,330],[912,600],[916,860],[905,1000],
  [886,1100],[868,1180],[850,1242],[760,1212],[640,1186],[562,1166],[470,1112],[380,1072],[290,1042],
  [200,1010],[100,972],[8,940],[18,880],[42,818],[80,720],[110,650],[140,560],[165,470],[190,400],
  [215,340],[250,260],
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
  const hole = t.courtyard ? rectPts(cx, cy, w * 0.5, h * 0.36, ang) : null
  buildings.push({
    id: `Z${z}-${String(n).padStart(3, '0')}`,
    zone: z, type, name, floors: t.floors,
    poly: mapPts(z, outer), hole: hole && mapPts(z, hole),
  })
}
// mark the last building as having a walkable 3D scene (visit.html?site=...)
function V(site) { buildings[buildings.length - 1].visit = site }
function Bpoly(z, pts, type, name, holePts, forceZone) {
  const zn = forceZone || z || 5
  const n = (counters[zn] = (counters[zn] || 0) + 1)
  buildings.push({
    id: `Z${zn}-${String(n).padStart(3, '0')}`,
    zone: zn, type, name, floors: BUILDING_TYPES[type].floors,
    poly: mapPts(z, pts), hole: holePts ? mapPts(z, holePts) : null,
  })
}
function Tri(z, cx, cy, r, ang = 0, name) {
  Bpoly(z, triPts(cx, cy, r, ang), 'tri', name, triPts(cx, cy, r * 0.42, ang))
}
function A(z, kind, shape, name, extra = {}) {
  let pts = shape
  if (shape.ellipse) pts = ellipsePts(...shape.ellipse)
  if (shape.rect) pts = rectPts(...shape.rect)
  areas.push({ kind, name, poly: mapPts(z, pts), ...extra })
}
function R(z, kind, pts, name, extra = {}) {
  roads.push({ kind, name, pts: mapPts(z, pts), ...extra })
}
function L(z, text, at, kind = 'landmark') {
  labels.push({ text, kind, at: z ? toFull(z, at) : at })
}

// ===================================== CAMPUS-WIDE ROADS (full.jpg px) ======================
R(0, 'main', [[538,388],[541,600],[545,842],[550,1000],[553,1150]], 'Central Avenue')
R(0, 'road', [[215,397],[538,390]], 'North Road')
R(0, 'road', [[538,390],[543,370],[633,321],[706,260],[746,189],[774,95],[783,66]], 'North-East Diagonal')
R(0, 'road', [[85,718],[540,716],[905,712]], 'Middle Ring Road')
R(0, 'road', [[40,826],[545,842],[910,858]], 'South Ring Road')
R(0, 'road', [[275,398],[275,832]], 'West Spine')
R(0, 'road', [[633,321],[640,335],[908,328]], 'Zone 4 North Road')

// ===================================== ZONE 5 =================================================
{
  const z = 5
  // West dormitory grid (courtyard blocks)
  ;[[375,92],[475,128],[345,160],[445,197],[318,228],[420,262],[290,297],[385,335],[290,370],
    [470,372],[380,405],[290,440],[470,445],[470,635],[470,728]].forEach(([x,y]) => B(z, x, y, 75, 45, 'dorm'))
  // West bar blocks
  ;[[285,505],[470,508],[285,557],[470,563],[375,587],[285,622],[375,652],[195,648],[195,703],
    [375,705],[280,735]].forEach(([x,y]) => B(z, x, y, 70, 22, 'block'))
  ;[[195,518],[200,588],[225,412],[510,232],[140,672]].forEach(([x,y]) => B(z, x, y, 40, 18, 'staff'))

  // North-east row of small buildings
  ;[585,625,690,725,760].forEach((x) => B(z, x, 52, 32, 14, 'staff'))
  ;[595,630,665,705,745,785,825,860].forEach((x) => B(z, x, 100 - (x - 595) * 0.083, 32, 14, 'staff'))
  // Academic lecture cluster
  ;[[600,205,60,45],[668,180,55,40],[735,155,55,42],[670,248,55,42],[738,225,55,42],[805,200,55,40],
    [870,177,55,38],[937,152,55,40]].forEach(([x,y,w,h]) => B(z, x, y, w, h, 'academic'))
  B(z, 1025, 150, 60, 85, 'hall', 0, 'Large lecture hall')
  B(z, 1085, 120, 55, 70, 'hall')
  B(z, 1020, 315, 70, 45, 'hall')
  B(z, 1060, 72, 30, 15, 'staff')
  // Centre
  B(z, 650, 400, 45, 20); B(z, 710, 467, 55, 25); B(z, 770, 468, 45, 25)

  // =======================================================================
  // 3 LOCKED 3D BUILDINGS (exact coordinates & geometry from site510.js)
  // =======================================================================
  // 1) EE North Block (4 floors, L=44m, D=11.1m, rotated 15 deg)
  Bpoly(0, [[421.6, 557.0], [453.1, 548.5], [455.2, 556.5], [423.7, 564.9]], 'academic', 'School of Electrical Eng. · north wing', null, 5); V('b510'); buildings[buildings.length - 1].keep = true
  // 2) EE South Block (4 floors, L=44m, D=11.1m, rotated 15 deg)
  Bpoly(0, [[426.0, 573.5], [457.5, 565.1], [459.6, 573.0], [428.1, 581.5]], 'academic', 'School of Electrical Eng. · south wing', null, 5); V('b510'); buildings[buildings.length - 1].keep = true
  // 3) Block 510 / LAB 5 · U-Block (3 floors, open courtyard facing east)
  Bpoly(0, [[377.1, 571.4], [405.0, 563.9], [406.4, 568.9], [383.5, 575.0], [386.1, 584.9], [409.0, 578.8], [410.4, 583.8], [382.4, 591.2]], 'academic', 'Block 510 (Python Lab) · LAB 5', null, 5); V('b510'); buildings[buildings.length - 1].keep = true

  // EE Walkway & Outdoor Café Terrace
  A(0, 'paved', [[417.8, 568.4], [457.9, 557.7], [460.2, 566.2], [420.1, 576.9]], 'Electrical Eng. walkway')
  A(0, 'paved', [[463.1, 562.9], [479.9, 558.4], [482.7, 569.0], [465.9, 573.5]], 'Café terrace')

  B(z, 970, 470, 55, 15); B(z, 1040, 375, 45, 18, 'staff')
  // ASTU Postgraduate Library & Liberal Library
  B(z, 1060, 505, 55, 40, 'modern', 0, 'ASTU Postgraduate Library')
  B(z, 1095, 440, 40, 40, 'glass', 0, 'Liberal Library')
  A(z, 'water', { rect: [1105, 500, 28, 34] }, 'Swimming pool')

  B(z, 595, 528, 65, 30, 'academic', 0, 'Block 511 (B511)'); B(z, 710, 538, 55, 45, 'academic'); B(z, 825, 520, 55, 45, 'academic')
  B(z, 910, 497, 55, 15); B(z, 970, 522, 55, 15)
  B(z, 635, 583, 25, 40, 'staff'); B(z, 575, 630, 35, 40, 'staff'); B(z, 632, 685, 25, 40, 'staff')
  B(z, 710, 630, 55, 45, 'academic'); B(z, 590, 735, 65, 30, 'academic'); B(z, 715, 705, 25, 20, 'staff')
  ;[572, 625, 683, 742].forEach((y) => { B(z, 815, y, 55, 30, 'academic'); B(z, 912, y, 55, 30, 'academic') })

  // 5 Engineering Workshops
  B(z, 1035, 572, 125, 30, 'hall', 0, 'Engineering Workshop 1')
  B(z, 1015, 625, 110, 35, 'hall', 0, 'Engineering Workshop 2')
  B(z, 1018, 685, 115, 45, 'hall', 0, 'Engineering Workshop 3')
  B(z, 1040, 745, 125, 45, 'hall', 0, 'Engineering Workshop 4')
  B(z, 1040, 805, 120, 35, 'hall', 0, 'Engineering Workshop 5')

  // South-east block (Courtyard dormitories & Administration)
  B(z, 570, 820, 40, 30, 'staff'); B(z, 630, 820, 40, 30, 'staff')
  ;[[735,835],[840,835],[735,922],[840,925],[730,1008],[840,1012]].forEach(([x,y]) => B(z, x, y, 80, 50, 'dorm'))
  B(z, 920, 1015, 40, 40, 'modern')
  B(z, 1050, 950, 45, 60, 'academic', 0, 'Central Administration')
  A(z, 'park', { ellipse: [1050, 950, 70, 75] }, 'Round plaza')
  B(z, 1090, 850, 25, 25, 'staff')

  // Zone 5 Roads & Detailed Footpaths
  R(z, 'road', [[540,290],[1140,280]], 'Academic Road')
  R(z, 'road', [[680,775],[680,1040]], 'South Academic Access')
  R(z, 'lane', [[275, 480], [350, 450], [420, 420], [540, 410]], 'Academic North Curve')
  A(z, 'park', { ellipse: [740, 310, 28, 28] }, 'Academic plaza')
  R(z, 'lane', ellipsePts(740, 310, 32, 32, 24))

  // Interconnecting paths in West Dorms (connecting all 15 blocks)
  R(z, 'path', [[290, 80], [290, 740]])
  R(z, 'path', [[380, 80], [380, 740]])
  R(z, 'path', [[470, 80], [470, 740]])
  R(z, 'path', [[260, 220], [500, 220]])
  R(z, 'path', [[260, 350], [500, 350]])
  R(z, 'path', [[260, 480], [500, 480]])
  R(z, 'path', [[260, 600], [500, 600]])

  // Paths in Academic Core & Workshops
  R(0, 'path', [[405, 575], [418, 573]]) // Block 510 to EE walkway
  R(0, 'path', [[460, 565], [495, 550], [538, 550]]) // EE to Postgraduate Library
  R(0, 'path', [[495, 550], [505, 595]]) // Library to Liberal library
  R(0, 'path', [[320, 540], [377, 575]]) // B511 to Block 510
  R(z, 'path', [[600,140],[640,270],[900,250],[960,200]])
  R(z, 'path', [[560,360],[940,350],[1000,270]])
  R(z, 'path', [[815, 550], [815, 780]])
  R(z, 'path', [[912, 550], [912, 780]])
  R(z, 'path', [[750, 600], [1050, 600]])
  R(z, 'path', [[750, 660], [1050, 660]])
  R(z, 'path', [[750, 720], [1050, 720]])
  R(z, 'path', [[750, 780], [1050, 780]])
  R(z, 'path', [[680, 880], [900, 880]])
  R(z, 'path', [[680, 960], [900, 960]])

  L(0, 'Block 510 (Python Lab)', [395, 560], 'academic')
  L(0, 'LAB 5', [385, 595], 'academic')
  L(0, 'School of Electrical Eng.', [440, 545], 'academic')
  L(0, 'Block 511 (B511)', [305, 525], 'academic')
  L(0, 'Block 514', [240, 520], 'academic')
  L(0, 'Libos Dormitory', [200, 590], 'dorm')
  L(0, 'Astu Boys Dorm B507', [230, 420], 'dorm')
  L(0, 'ASTU Postgraduate Library', [495, 530], 'library')
  L(0, 'Liberal Library', [505, 600], 'library')
  L(0, 'Academic Core', [400, 470], 'academic')
  L(0, 'Dorm grid (west)', [180, 500], 'dorm')
  L(0, 'Engineering Workshops', [480, 700], 'workshop')
  L(0, 'Swimming Pool', [520, 598], 'sport')
  L(0, 'Central Administration', [500, 795], 'admin')
}

// ===================================== ZONE 4 =================================================
{
  const z = 4
  ;[[355,62,60,25,0],[285,105,60,25,0],[190,142,55,25,0],[255,158,55,25,0],[130,180,55,25,0],
    [230,225,60,25,0],[300,258,60,25,25],[445,85,60,25,0],[510,128,65,25,0]]
    .forEach(([x,y,w,h,a]) => B(z, x, y, w, h, 'block', a))
  B(z, 100, 268, 30, 25, 'staff')

  // Realistic sawtooth / ridge classroom clusters
  Bpoly(z, rectPts(180, 300, 75, 45, 0), 'tri', 'Classroom Cluster A', rectPts(180, 300, 35, 18, 0))
  Bpoly(z, rectPts(75, 365, 75, 45, 0), 'tri', 'Classroom Cluster B', rectPts(75, 365, 35, 18, 0))
  Bpoly(z, rectPts(270, 345, 70, 42, 0), 'tri', 'Classroom Cluster C', rectPts(270, 345, 32, 16, 0))
  Bpoly(z, rectPts(262, 465, 70, 42, 0), 'tri', 'Classroom Cluster D', rectPts(262, 465, 32, 16, 0))

  // ASTU Female Library & Students Lounge & Amphitheatre
  B(z, 90, 430, 65, 45, 'academic', 0, 'ASTU Female Library')
  B(z, 90, 370, 50, 30, 'academic', 0, 'Students Lounge')
  A(z, 'concrete', { ellipse: [90, 495, 38, 28] }, 'Amphitheatre bowl')
  Bpoly(z, rectPts(90, 480, 40, 16, 0), 'academic', 'ASTU Amphitheatre Stage')

  ;[[165,605,80,25],[165,640,80,20],[240,600,50,25],[240,640,50,20],[315,605,60,25],[165,672,80,20],
    [240,685,60,35],[180,702,60,20],[310,712,35,30]].forEach(([x,y,w,h]) => B(z, x, y, w, h, 'academic'))
  B(z, 110, 690, 25, 25, 'staff'); B(z, 210, 760, 80, 40, 'academicC')
  B(z, 450, 835, 85, 50, 'academicC', 0, 'Courtyard building (green court)')

  // Stadium concourse & features
  A(z, 'paved', { ellipse: [715, 335, 122, 188] }, 'Stadium stands')
  A(z, 'track', { ellipse: [715, 335, 102, 165] }, 'Running track')
  A(z, 'pitch', { ellipse: [715, 335, 72, 122] }, 'Football pitch')
  B(z, 607, 340, 40, 145, 'grandstand', 0, 'Main grandstand')
  A(z, 'arena', { rect: [493, 270, 70, 70] }, 'Dirt court')
  A(z, 'court', { rect: [445, 402, 62, 85] }, 'Sports court A')
  A(z, 'court', { rect: [505, 402, 55, 85] }, 'Sports court B')
  A(z, 'paved', [[600, 40], [780, 40], [780, 140], [600, 140]], 'Stadium Parking')
  R(z, 'lane', [[610, 90], [770, 90]])
  R(z, 'path', ellipsePts(715, 335, 140, 205, 40).concat([ellipsePts(715, 335, 140, 205, 40)[0]]))

  // Scattered staff housing (east)
  ;[[600,585,20,40,0],[600,645,55,20,0],[660,645,40,18,0],[560,690,25,40,0],
    [665,735,45,18,-45],[570,760,30,30,0],[550,810,30,25,0],[595,830,45,18,40],[650,835,45,18,40],
    [680,815,45,18,40]].forEach(([x,y,w,h,a]) => B(z, x, y, w, h, 'block', a))
  A(z, 'water', { rect: [815, 692, 30, 20] }, 'Pool')
  B(z, 795, 742, 40, 30, 'staff'); B(z, 825, 790, 40, 30, 'staff'); B(z, 830, 855, 40, 30, 'staff')

  // South strip
  B(z, 330, 975, 65, 30, 'academic'); B(z, 430, 965, 85, 35, 'academic'); B(z, 430, 940, 30, 15, 'staff')
  B(z, 265, 1035, 40, 30); B(z, 325, 1035, 40, 30); B(z, 390, 1035, 55, 25); B(z, 475, 1035, 55, 25, 'academic')
  B(z, 565, 1027, 55, 25, 'hall')
  B(z, 375, 1095, 30, 40, 'staff'); B(z, 480, 1095, 20, 20, 'staff'); B(z, 475, 1160, 30, 40, 'staff')
  B(z, 300, 1105, 70, 30, 'dormRed'); B(z, 300, 1160, 70, 30, 'dormRed'); B(z, 385, 1162, 70, 30, 'dormRed')
  B(z, 118, 1135, 90, 80, 'academicC', 0, 'Central courtyard building')

  R(z, 'road', [[400,15],[380,900]], 'Zone 4 Middle Road')
  R(z, 'road', [[520,900],[525,1220]])
  R(z, 'road', [[735,520],[735,1220]])
  R(z, 'road', [[230,900],[235,1220]])

  // Zone 4 Extensive Footpaths
  R(z, 'path', [[20, 350], [180, 300], [270, 345], [380, 340]])
  R(z, 'path', [[20, 465], [100, 465], [180, 480], [262, 465], [380, 460]])
  R(z, 'path', [[380, 340], [445, 402], [600, 340]])
  R(z, 'path', [[380, 460], [505, 402], [600, 400]])
  R(z, 'path', [[400,540],[530,540],[590,520]])
  R(z, 'path', [[550, 640], [700, 640]])
  R(z, 'path', [[550, 740], [700, 740]])
  R(z, 'path', [[550, 830], [700, 830]])
  R(z, 'path', [[630, 600], [630, 860]])

  L(0, 'ASTU Stadium', [715, 475], 'sport')
  L(0, 'ASTU Gym', [685, 470], 'sport')
  L(0, 'KT Tennis Court', [705, 440], 'sport')
  L(0, 'Basketball Courts', [720, 445], 'sport')
  L(0, 'ASTU Female Library', [575, 505], 'library')
  L(0, 'ASTU Amphitheatre', [575, 535], 'landmark')
  L(0, 'Students Lounge', [570, 460], 'landmark')
  L(0, 'Classroom Clusters', [630, 470], 'academic')
}

// ===================================== ZONE 1 =================================================
{
  const z = 1
  ;[[555,95,'dorm'],[690,95,'dorm'],[620,165,'dorm'],[810,145,'dormRed'],[475,210,'dormRed'],
    [745,215,'dorm'],[545,285,'dorm'],[675,290,'dorm'],[805,290,'dorm']]
    .forEach(([x,y,t]) => B(z, x, y, 100, 45, t))
  ;[527,633,740,845].forEach((x, i) => B(z, x, 365 + i * 2, 70, 40, 'block'))
  B(z, 145, 462, 40, 25, 'staff'); B(z, 190, 470, 20, 25, 'staff'); B(z, 165, 512, 40, 15, 'staff')
  B(z, 1025, 585, 70, 30, 'block'); B(z, 1105, 610, 25, 25, 'staff')
  B(z, 890, 692, 120, 22, 'hall', 20, 'Long shed 1'); B(z, 865, 748, 110, 18, 'hall', 20, 'Long shed 2')

  A(z, 'farm', [[760,770],[1030,820],[985,1050],[715,1000]], 'Demonstration farm plots', { grid: [4, 4] })
  A(z, 'farm', [[60,535],[300,560],[295,800],[30,770]], 'Farm field', { grid: [2, 3] })
  A(z, 'paved', { ellipse: [470, 920, 35, 35] }, 'West Gate Plaza')
  B(z, 470, 920, 16, 12, 'staff', 0, 'West Gate Security Post')

  R(z, 'road', [[385,20],[385,405]])
  R(z, 'main', [[690,425],[640,560],[470,900]], 'West Gate Avenue')
  R(z, 'path', [[860,440],[700,1000]])
  R(z, 'path', [[400,30],[230,120],[200,300],[380,330]])
  R(z, 'path', [[450, 150], [850, 150]])
  R(z, 'path', [[450, 230], [850, 230]])
  R(z, 'path', [[450, 310], [850, 310]])
  R(z, 'path', [[580, 80], [580, 380]])
  R(z, 'path', [[720, 80], [720, 380]])

  L(0, 'West Gate', [145, 980], 'gate')
  L(0, 'Agricultural Farm', [260, 960], 'nature')
  L(0, 'South-West Dorms', [190, 740], 'dorm')
}

// ===================================== ZONE 2 =================================================
{
  const z = 2
  A(z, 'pond', [[100,610],[140,540],[290,480],[302,520],[240,580],[225,630],[320,700],[310,735],[200,705],[110,665]], 'Natural Pond')
  A(z, 'sand', { ellipse: [585, 190, 85, 110] }, 'Dirt track field')
  R(z, 'path', ellipsePts(585, 190, 100, 125, 36).concat([ellipsePts(585, 190, 100, 125, 36)[0]]), 'Dirt loop')
  A(z, 'farm', [[690,90],[840,80],[845,670],[690,670]], 'Orchard', { grid: [2, 8] })
  A(z, 'sand', [[600,720],[770,720],[780,920],[600,900]], 'Open sand lot')
  A(z, 'farm', [[420,825],[520,840],[510,890],[415,875]], 'Plots', { grid: [4, 1] })
  A(z, 'park', [[790,720],[870,720],[880,960],[800,950]], 'Botanical Garden')
  B(z, 680, 945, 40, 25, 'staff'); B(z, 720, 995, 35, 20, 'staff')

  R(z, 'road', [[325,15],[320,500],[350,650],[400,700],[880,700]])
  R(z, 'path', [[775,80],[770,650]])
  R(z, 'path', [[330,260],[480,230]])
  R(z, 'path', [[110, 675], [190, 715], [300, 745], [330, 705], [250, 635], [250, 585], [310, 525], [300, 475], [140, 530]], 'Lakeside Walking Trail')
  R(z, 'path', [[800, 740], [850, 780], [820, 840], [860, 900], [820, 940]], 'Botanical Garden Trail')

  L(0, 'Natural Pond', [350, 1060], 'nature')
  L(0, 'Orchard & Botanical Garden', [520, 1080], 'nature')
  L(0, 'Dirt Training Track', [455, 890], 'sport')
}

// ===================================== ZONE 3 =================================================
{
  const z = 3
  Bpoly(z, [[72,300],[115,300],[215,472],[72,452]], 'glass', 'Blue triangular exhibition hall')
  B(z, 155, 288, 150, 22, 'block')
  A(z, 'park', [[40,30],[270,30],[270,230],[40,230]], 'Formal garden')
  A(z, 'water', { rect: [145, 248, 30, 15] }, 'Reflection pool')

  A(z, 'paved', [[710,58],[1118,58],[1118,545],[710,545]], 'Walled compound')
  A(z, 'park', [[870,300],[975,300],[975,392],[870,392]], 'Compound formal garden')
  A(z, 'water', { ellipse: [912, 340, 18, 18, 20] }, 'Central fountain')
  B(z, 840, 200, 145, 165, 'modern', 0, 'Compound main complex')
  B(z, 855, 410, 140, 160, 'modern', 0, 'Compound south block')
  B(z, 968, 152, 55, 55, 'modern'); B(z, 1052, 150, 55, 55, 'modern'); B(z, 1052, 228, 55, 55, 'modern')
  B(z, 1040, 312, 80, 70, 'academic'); B(z, 1032, 442, 80, 80, 'academic')

  B(z, 565, 428, 45, 50, 'hall'); B(z, 620, 300, 15, 30, 'staff'); B(z, 568, 82, 25, 15, 'staff')
  B(z, 380, 925, 60, 40, 'staff')
  B(z, 915, 545, 18, 12, 'staff', 0, 'Compound Gatehouse')

  A(z, 'field', [[150,615],[330,615],[345,1010],[150,990]], 'Dry field')
  A(z, 'field', [[360,615],[710,610],[715,990],[355,1000]], 'Dry field')
  A(z, 'field', [[730,610],[1030,605],[980,960],[740,990]], 'Dry field')
  A(z, 'park', [[40,620],[150,620],[150,850],[40,850]], 'Gate garden')
  A(z, 'paved', { ellipse: [85, 915, 40, 40, 24] }, 'Gate roundabout')
  A(z, 'park', { ellipse: [85, 915, 22, 22, 24] }, 'Gate garden island')
  B(z, 85, 950, 16, 12, 'staff', 0, 'Main Gate Security Post')

  R(z, 'road', [[40,598],[1000,592]], 'South Road')
  R(z, 'road', [[720,520],[1110,520]])
  R(z, 'road', [[740, 80], [1090, 80], [1090, 520], [740, 520], [740, 80]], 'Compound Perimeter Drive')
  R(z, 'road', [[930,60],[930,290]])
  R(z, 'road', [[960,545],[960,592]])
  R(z, 'road', [[285,30],[285,598]])
  R(z, 'path', [[600,40],[620,598]])
  R(z, 'path', [[40, 130], [270, 130]])
  R(z, 'path', [[155, 30], [155, 230]])
  R(z, 'path', [[912, 300], [912, 380]])
  R(z, 'path', [[870, 340], [955, 340]])
  R(z, 'path', [[880, 310], [944, 370]])
  R(z, 'path', [[880, 370], [944, 310]])
  R(z, 'path', [[350,1060],[600,980],[940,930]], 'Ravine track')

  L(0, 'Main Gate', [570, 1145], 'gate')
  L(0, 'Research & Innovation Compound', [850, 940], 'landmark')
  L(0, 'Blue Triangular Hall', [590, 970], 'landmark')
  L(0, 'Formal Garden', [590, 890], 'nature')
}

// ===================================== ZONE 6 =================================================
{
  const z = 6
  B(z, 295, 465, 110, 28, 'academic', 45, 'North Academic Block')
  B(z, 325, 400, 40, 45, 'academic'); B(z, 345, 455, 45, 40, 'academic'); B(z, 372, 485, 35, 30, 'academic')
  B(z, 300, 425, 30, 20, 'staff')
  B(z, 240, 310, 12, 50, 'staff'); B(z, 225, 350, 12, 30, 'staff'); B(z, 245, 560, 30, 10, 'staff')
  A(z, 'track', { ellipse: [130, 635, 75, 35] }, 'Small track')
  A(z, 'sand', { ellipse: [130, 635, 58, 24] }, 'Track infield')
  B(z, 245, 662, 45, 30, 'block'); B(z, 295, 658, 45, 30, 'block'); B(z, 350, 655, 45, 30, 'block')

  // 7 North Courtyard Dorms in 2 columns
  ;[395,450,505].forEach((y) => B(z, 1115, y, 62, 34, 'dorm'))
  ;[370,425,482,538].forEach((y) => B(z, 1190, y, 62, 34, 'dorm'))
  B(z, 1095, 355, 15, 15, 'staff'); B(z, 1200, 572, 15, 12, 'staff')

  A(z, 'concrete', { ellipse: [605, 380, 16, 16, 16] }, 'Water reservoir tank 1')
  A(z, 'concrete', { ellipse: [525, 515, 14, 14, 16] }, 'Water reservoir tank 2')
  A(z, 'water', { ellipse: [540, 535, 10, 10, 16] }, 'Water tank')
  A(z, 'gravel', { ellipse: [800, 440, 75, 50] }, 'Quarry & gravel pit')
  A(z, 'gravel', { ellipse: [890, 120, 40, 45] }, 'Construction yard')
  B(z, 1005, 128, 35, 18, 'staff'); B(z, 1070, 110, 45, 12, 'staff')

  R(z, 'road', [[180, 680], [220, 600], [260, 500], [380, 380], [520, 260], [700, 220], [850, 220]], 'Hillside Mountain Road')
  R(z, 'road', [[395,670],[470,520],[550,365],[700,338]], 'Forest loop road')
  R(z, 'road', [[850,330],[1230,325]], 'North-East road')
  R(z, 'lane', [[1000, 330], [1220, 330], [1220, 640], [1000, 640], [1000, 330]], 'North Dorms Access Loop')
  R(z, 'path', [[1105, 330], [1105, 640]], 'North Dorms Central Walkway')
  R(z, 'path', [[190,255],[840,255]], 'Boundary track')
  R(z, 'path', [[220,600],[400,600]])
  R(z, 'path', [[960,180],[1100,160],[1180,250]])

  L(0, 'North Dormitories', [800, 245], 'dorm')
  L(0, 'North Academic Block', [345, 270], 'academic')
  L(0, 'Water Reservoirs', [420, 220], 'utility')
  L(0, 'Quarry', [560, 85], 'nature')
  L(0, 'Forest Reserve', [475, 190], 'nature')
}

// ---------------------------------------------------------------------------------------------
// Trees: deterministic scatter, density per zone, avoiding buildings / areas / roads.
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

export const ROAD_WIDTH = { main: 9, road: 5.5, lane: 3.4, path: 2.2 }
// Scale: the football pitch in stadium.png measures 630 x 400 px = 105 x 68 m, and stadium.png maps
// onto full.jpg at ~0.12 -> ~1.35-1.39 m per map unit.
export const METERS_PER_UNIT = 1.35

// ---------------------------------------------------------------------------------------------
// Merge auto-detected roofs (tools/detect.py) with the hand-traced layer above.
//  - special hand-traced buildings (dark/blue roofs the detector can't see) are always kept
//  - a detected roof takes type + name from the hand-traced building it overlaps
//  - hand-traced buildings with no detected roof nearby are kept as a fallback
// ---- detailed sports complex (stadium.js) replaces the rough zone-4 trace in its region
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

const SPECIAL = new Set(['modern', 'glass', 'grandstand', 'gym'])
const manual = buildings.splice(0, buildings.length).map((b) => ({ ...b, bb: bbox(b.poly), c: centroidOf(b.poly) }))
function centroidOf(p) {
  let x = 0, y = 0
  for (const q of p) { x += q[0]; y += q[1] }
  return [x / p.length, y / p.length]
}
function polyArea(p) {
  let a = 0
  for (let i = 0; i < p.length; i++) { const [x1, y1] = p[i], [x2, y2] = p[(i + 1) % p.length]; a += x1 * y2 - x2 * y1 }
  return Math.abs(a / 2)
}
const inBB = ([x, y], bb, pad = 0) => x >= bb[0] - pad && x <= bb[2] + pad && y >= bb[1] - pad && y <= bb[3] + pad

const specials = manual.filter((m) => SPECIAL.has(m.type) || m.keep || m.visit)
const ACADEMIC_ZONE = [[280, 400], [540, 400], [540, 720], [280, 720]] // zone 5 east half

const detectedB = []
for (const d of detected.buildings) {
  const bb = bbox(d.poly)
  if (specials.some((s) => inBB(d.center, s.bb, 2))) continue
  const area = polyArea(d.poly) - (d.hole ? polyArea(d.hole) : 0)
  const match = manual.find((m) => !SPECIAL.has(m.type) && !m.keep && !m.visit && (inBB(m.c, bb, 2) || inBB(d.center, m.bb, 2)))
  let type
  if (d.color === 'red') type = 'dormRed'
  else if (match && match.type !== 'tri') type = match.type
  else if (d.hole) type = pointInPoly(d.center, ACADEMIC_ZONE) ? 'academicC' : 'dorm'
  else if (area < 70) type = 'staff'
  else if (area > 1300) type = 'hall'
  else type = pointInPoly(d.center, ACADEMIC_ZONE) ? 'academic' : 'block'
  if (d.hole && (type === 'block' || type === 'staff')) type = 'dorm'
  if (match?.type === 'tri') type = 'tri'
  const t = BUILDING_TYPES[type]
  let floors = t.floors
  if (type === 'staff') floors = 1
  else if (area > 1500 && type !== 'hall') floors += 1

  if (match) {
    detectedB.push({
      zone: match.zone,
      type: match.type,
      name: match.name,
      visit: match.visit,
      floors: match.floors || floors,
      poly: match.poly,
      hole: match.hole,
      roofColor: d.roofColor,
      bb: match.bb,
      matched: match,
    })
  } else if (area >= 35 && area <= 3500) {
    detectedB.push({
      zone: d.zone,
      type,
      name: null,
      visit: null,
      floors,
      poly: d.poly,
      hole: d.hole,
      roofColor: d.roofColor,
      bb,
      matched: null,
    })
  }
}
const usedManual = new Set(detectedB.map((d) => d.matched).filter(Boolean))
const fallback = manual.filter((m) => !SPECIAL.has(m.type) && !m.keep && !m.visit && !usedManual.has(m))

const zoneCount = {}
for (const b of [...specials, ...detectedB, ...fallback].sort((a, b) => a.zone - b.zone || centroidOf(a.poly)[1] - centroidOf(b.poly)[1])) {
  const n = (zoneCount[b.zone] = (zoneCount[b.zone] || 0) + 1)
  buildings.push({
    id: `Z${b.zone}-${String(n).padStart(3, '0')}`,
    zone: b.zone, type: b.type, name: b.name, floors: b.floors,
    poly: b.poly, hole: b.hole || null, roofColor: b.roofColor || null,
    source: b.roofColor ? 'detected' : 'traced', visit: b.visit || null,
  })
}

// ---------------------------------------------------------------------------------------------
// Trees: canopy points detected on the satellite image, minus anything on roofs / roads / open
// surfaces.
// Fallback when detected.json has no trees yet: seeded scatter with per-zone density.
const TREE_DENSITY = { 1: 0.35, 2: 0.3, 3: 0.12, 4: 0.9, 5: 0.5, 6: 0.8 }
function proceduralTrees() {
  const rand = rng(20261107), out = [], step = 7
  for (let y = 0; y < MAP.height; y += step) {
    for (let x = 0; x < MAP.width; x += step) {
      const p = [x + rand() * step, y + rand() * step]
      const zone = ZONES.find((zn) => pointInPoly(p, zn.poly))
      if (!zone || rand() > TREE_DENSITY[zone.id]) continue
      const kind = zone.id === 4 && rand() < 0.07 ? 'p' : 'g' // jacarandas seen in zone 4
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
