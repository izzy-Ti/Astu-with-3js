// Procedural canvas textures for the 3D visit scenes (no external image downloads).
// Colours sampled by eye from photos/buildings/001.
import * as THREE from 'three'

function rng(seed) {
  let s = seed >>> 0
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)
}

function canvas(w, h = w) {
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  return [c, c.getContext('2d')]
}

// per-pixel value noise added on top of whatever is drawn
function grain(g, w, h, amt, r, mono = true) {
  const d = g.getImageData(0, 0, w, h), p = d.data
  for (let i = 0; i < p.length; i += 4) {
    const n = (r() - 0.5) * amt
    p[i] += n; p[i + 1] += mono ? n : (r() - 0.5) * amt; p[i + 2] += mono ? n : (r() - 0.5) * amt
  }
  g.putImageData(d, 0, 0)
}

// soft blotches, wrapped so the texture tiles seamlessly
function blotches(g, w, h, n, r, colors, rmin, rmax, alpha) {
  for (let i = 0; i < n; i++) {
    const x = r() * w, y = r() * h, rad = rmin + r() * (rmax - rmin)
    const col = colors[Math.floor(r() * colors.length)]
    for (const ox of [-w, 0, w]) for (const oy of [-h, 0, h]) {
      const cx = x + ox, cy = y + oy
      if (cx + rad < 0 || cx - rad > w || cy + rad < 0 || cy - rad > h) continue
      const gr = g.createRadialGradient(cx, cy, 0, cx, cy, rad)
      gr.addColorStop(0, `rgba(${col},${alpha})`); gr.addColorStop(1, `rgba(${col},0)`)
      g.fillStyle = gr; g.fillRect(cx - rad, cy - rad, rad * 2, rad * 2)
    }
  }
}

function tex(c, { repeat = true, srgb = true, aniso = 8 } = {}) {
  const t = new THREE.CanvasTexture(c)
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping
  if (srgb) t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = aniso
  return t
}

// cream painted render with grime streaks running down from ledges
export function renderTex(base = '#f0d38f', seed = 1) {
  const S = 512, [c, g] = canvas(S), r = rng(seed)
  g.fillStyle = base; g.fillRect(0, 0, S, S)
  blotches(g, S, S, 70, r, ['255,250,225', '160,140,95', '120,110,80'], 20, 110, 0.13)
  // vertical rain streaks
  for (let i = 0; i < 90; i++) {
    const x = r() * S, len = 40 + r() * 260, y = r() * S, wdt = 1 + r() * 5
    const gr = g.createLinearGradient(0, y, 0, y + len)
    gr.addColorStop(0, `rgba(70,65,50,${0.05 + r() * 0.1})`); gr.addColorStop(1, 'rgba(70,65,50,0)')
    g.fillStyle = gr
    for (const oy of [-S, 0]) g.fillRect(x, y + oy, wdt, len)
  }
  grain(g, S, S, 16, r)
  return tex(c)
}

// raw weathered concrete for parapets, slabs and stairs (grey-beige with dark mould patches)
export function concreteTex(seed = 2) {
  const S = 512, [c, g] = canvas(S), r = rng(seed)
  g.fillStyle = '#d9c9a2'; g.fillRect(0, 0, S, S)
  blotches(g, S, S, 60, r, ['235,228,205', '150,145,125', '95,95,85'], 15, 90, 0.18)
  blotches(g, S, S, 18, r, ['70,66,55'], 8, 36, 0.12) // mould
  // horizontal formwork lines
  g.strokeStyle = 'rgba(80,75,60,0.08)'; g.lineWidth = 2
  for (let y = 0; y < S; y += 64) { g.beginPath(); g.moveTo(0, y + 0.5); g.lineTo(S, y + 0.5); g.stroke() }
  grain(g, S, S, 22, r)
  return tex(c)
}

// coursed limestone ashlar of the end walls: pale cream blocks, thin recessed joints, light
// tooling marks (photo 145649). One tile = 2.4 m x 2.4 m -> blocks ~0.6 x 0.3 m.
export function stoneTex(seed = 3) {
  const W = 512, H = 512, [c, g] = canvas(W, H), r = rng(seed)
  g.fillStyle = '#9c8c72'; g.fillRect(0, 0, W, H)
  const rowH = 64, bw = 128
  for (let row = 0; row < H / rowH; row++) {
    const off = row % 2 ? bw / 2 : 0
    for (let x = -bw; x < W + bw; x += bw) {
      const x0 = x + off + 2, y0 = row * rowH + 2, w = bw - 4, h = rowH - 4
      const t = 0.93 + r() * 0.12, warm = (r() - 0.5) * 10
      g.fillStyle = `rgb(${[204 * t + warm, 186 * t, 152 * t - warm].map(Math.round)})`
      g.fillRect(x0, y0, w, h)
      g.fillStyle = 'rgba(255,250,235,0.35)'; g.fillRect(x0, y0, w, 2)           // lit top arris
      g.fillStyle = 'rgba(60,45,30,0.22)'; g.fillRect(x0, y0 + h - 3, w, 3)       // shaded bottom arris
      for (let k = 0; k < 26; k++) {                                              // pick marks
        g.fillStyle = `rgba(${r() < 0.5 ? '255,246,225' : '95,78,58'},${0.08 + r() * 0.12})`
        g.fillRect(x0 + r() * w, y0 + r() * h, 1 + r() * 5, 1 + r() * 2)
      }
    }
  }
  blotches(g, W, H, 30, r, ['120,105,85', '240,230,205'], 30, 110, 0.08)
  grain(g, W, H, 14, r)
  return tex(c)
}

// stone flag paving of the walkways: warm grey-beige slabs in running bond, dirt in the joints,
// worn and stained (photos 145640-145649). One tile = 3 m.
export function pavingTex(seed = 4) {
  const S = 512, [c, g] = canvas(S), r = rng(seed)
  g.fillStyle = '#5b5346'; g.fillRect(0, 0, S, S)
  const rows = 6, rh = S / rows
  for (let j = 0; j < rows; j++) {
    let x = -(r() * 60)
    const x00 = x
    while (x < S + x00) {
      const w = Math.min(70 + r() * 70, S + x00 - x), t = 0.86 + r() * 0.2
      g.fillStyle = `rgb(${[176 * t, 163 * t, 140 * t].map(Math.round)})`
      for (const ox of [0, S]) g.fillRect(x + ox + 2, j * rh + 2, w - 4, rh - 4)
      if (r() < 0.2) { // crack
        g.strokeStyle = 'rgba(60,50,40,0.45)'; g.lineWidth = 1.2; g.beginPath()
        let cx = x + r() * w, cy = j * rh + 3; g.moveTo(cx, cy)
        for (let k = 0; k < 6; k++) { cx += (r() - 0.5) * 22; cy += rh / 7; g.lineTo(cx, cy) }
        g.stroke()
      }
      x += w
    }
  }
  blotches(g, S, S, 70, r, ['95,82,62', '215,203,178', '125,108,80', '70,66,58'], 12, 80, 0.15)
  for (let i = 0; i < 500; i++) { g.fillStyle = `rgba(70,58,40,${0.15 + r() * 0.25})`; g.fillRect(r() * S, r() * S, 1 + r() * 2, 1 + r() * 2) }
  grain(g, S, S, 20, r)
  return tex(c)
}

// dusty Adama ground: reddish-brown dirt with leaf litter and dry grass tufts
export function dirtTex(seed = 5) {
  const S = 1024, [c, g] = canvas(S), r = rng(seed)
  g.fillStyle = '#9c8565'; g.fillRect(0, 0, S, S)
  blotches(g, S, S, 140, r, ['175,150,110', '120,100,70', '110,105,70', '150,120,85'], 30, 160, 0.25)
  blotches(g, S, S, 60, r, ['120,125,70', '95,105,55'], 20, 80, 0.22) // sparse dry grass
  for (let i = 0; i < 2600; i++) { // leaves, pebbles
    const x = r() * S, y = r() * S
    g.fillStyle = r() < 0.5 ? `rgba(80,60,35,${0.2 + r() * 0.3})` : `rgba(210,195,160,${0.2 + r() * 0.3})`
    g.beginPath(); g.ellipse(x, y, 1 + r() * 3, 0.8 + r() * 1.8, r() * 3, 0, 7); g.fill()
  }
  for (let i = 0; i < 900; i++) { // grass blades
    const x = r() * S, y = r() * S
    g.strokeStyle = `rgba(${90 + r() * 60},${100 + r() * 50},50,0.45)`; g.lineWidth = 1
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 6, y - 4 - r() * 8); g.stroke()
  }
  grain(g, S, S, 26, r)
  return tex(c)
}

export function grassTex(seed = 6) {
  const S = 512, [c, g] = canvas(S), r = rng(seed)
  g.fillStyle = '#4c5a2c'; g.fillRect(0, 0, S, S)
  blotches(g, S, S, 60, r, ['95,120,50', '60,75,30', '120,110,70'], 15, 70, 0.3)
  for (let i = 0; i < 9000; i++) {
    const x = r() * S, y = r() * S, l = 3 + r() * 7
    g.strokeStyle = `rgba(${50 + r() * 70},${80 + r() * 70},${25 + r() * 30},0.7)`; g.lineWidth = 1
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 4, y - l); g.stroke()
  }
  grain(g, S, S, 18, r, false)
  return tex(c)
}

// corrugated metal roof sheets
export function roofTex(seed = 7) {
  const S = 256, [c, g] = canvas(S), r = rng(seed)
  for (let x = 0; x < S; x++) {
    const v = 150 + 30 * Math.sin((x / S) * Math.PI * 2 * 16)
    g.fillStyle = `rgb(${v},${v + 2},${v + 4})`; g.fillRect(x, 0, 1, S)
  }
  blotches(g, S, S, 30, r, ['120,90,60', '200,200,200'], 10, 60, 0.18) // rust + bleaching
  grain(g, S, S, 12, r)
  return tex(c)
}

// Clerestory window ribbon (photos 113643, 145547): olive-green steel frames, three panes per
// unit, dark interiors behind glass louvres. The atlas holds 4 different units side by side;
// each facade bay starts at a random unit so no two bays look the same.
export function windowTex() {
  const U = 256, W = U * 4, H = 128, [c, g] = canvas(W, H), r = rng(31)
  const frame = '#6c7a48'
  for (let u = 0; u < 4; u++) {
    const X = u * U
    g.fillStyle = frame; g.fillRect(X, 0, U, H)
    for (let pIdx = 0; pIdx < 3; pIdx++) {
      const x = X + 5 + pIdx * ((U - 10) / 3) + 2, w = (U - 10) / 3 - 4, y = 6, h = H - 12
      const gr = g.createLinearGradient(0, y, 0, y + h)
      gr.addColorStop(0, '#39464a'); gr.addColorStop(0.55, '#1c2224'); gr.addColorStop(1, '#262c2c')
      g.fillStyle = gr; g.fillRect(x, y, w, h)
      const kind = r()
      if (kind < 0.45) { // glass louvre blades catching the sky
        for (let yy = y + 5; yy < y + h - 4; yy += 11) {
          g.fillStyle = `rgba(190,205,205,${0.16 + r() * 0.2})`; g.fillRect(x, yy, w, 3)
          g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(x, yy + 3, w, 2)
        }
      } else if (kind < 0.6) { // extractor fan in a board
        g.fillStyle = '#b9ae90'; g.fillRect(x, y, w, h)
        g.fillStyle = '#3a3a36'; g.beginPath(); g.arc(x + w / 2, y + h / 2, h * 0.3, 0, 7); g.fill()
        g.fillStyle = '#c9c2ac'; g.beginPath(); g.arc(x + w / 2, y + h / 2, h * 0.1, 0, 7); g.fill()
      } else if (kind < 0.78) { // pale curtain behind the glass
        const cg = g.createLinearGradient(x, 0, x + w, 0)
        for (let k = 0; k <= 6; k++) cg.addColorStop(k / 6, k % 2 ? 'rgba(205,196,170,0.85)' : 'rgba(170,160,135,0.85)')
        g.fillStyle = cg; g.fillRect(x, y, w, h)
      } else { // plain reflective glass
        const sg = g.createLinearGradient(x, y, x + w, y + h)
        sg.addColorStop(0, 'rgba(150,180,200,0.35)'); sg.addColorStop(0.5, 'rgba(150,180,200,0.05)'); sg.addColorStop(1, 'rgba(150,180,200,0.2)')
        g.fillStyle = sg; g.fillRect(x, y, w, h)
      }
      g.fillStyle = frame; g.fillRect(x, y + h * 0.5 - 1.5, w, 3) // transom bar
    }
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(X, 0, U, 3) // shadow from the beam above
  }
  grain(g, W, H, 10, r)
  return tex(c, { repeat: true })
}

// classroom door (photos 113643, 145547): tall yellow frame, two worn brown timber leaves, glazed
// transom with a taped notice. 1.3 m x 2.85 m.
export function doorTex() {
  const W = 152, H = 334, [c, g] = canvas(W, H), r = rng(9)
  g.fillStyle = '#d9b651'; g.fillRect(0, 0, W, H) // frame, same yellow as the wall
  // transom
  g.fillStyle = '#6c7a48'; g.fillRect(6, 6, W - 12, 78)
  for (const [x, w] of [[10, 64], [78, 64]]) {
    const gr = g.createLinearGradient(0, 10, 0, 80); gr.addColorStop(0, '#3a474b'); gr.addColorStop(1, '#1d2325')
    g.fillStyle = gr; g.fillRect(x, 10, w, 70)
  }
  g.fillStyle = '#e9e7dc'; g.fillRect(52, 26, 44, 30)
  g.fillStyle = 'rgba(30,30,30,0.7)'; for (let y = 32; y < 52; y += 6) g.fillRect(57, y, 34, 2)
  // leaves
  const leaf = (x0, w) => {
    const t = 0.9 + r() * 0.2
    g.fillStyle = `rgb(${[122 * t, 92 * t, 50 * t].map(Math.round)})`; g.fillRect(x0, 88, w, H - 88)
    for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '50,32,12' : '190,160,105'},${r() * 0.2})`; g.fillRect(x0 + r() * w, 88 + r() * 200, 1 + r() * 2, 10 + r() * 60) }
    g.strokeStyle = 'rgba(40,26,10,0.5)'; g.lineWidth = 2; g.strokeRect(x0 + 5, 96, w - 10, 96); g.strokeRect(x0 + 5, 200, w - 10, 122)
    g.strokeStyle = 'rgba(40,26,10,0.25)'; g.beginPath(); g.moveTo(x0 + 5, 96); g.lineTo(x0 + w - 5, 192); g.moveTo(x0 + w - 5, 96); g.lineTo(x0 + 5, 192); g.stroke()
  }
  leaf(8, 66); leaf(78, 66)
  g.fillStyle = '#1b1b1b'; g.fillRect(74, 88, 4, H - 88)
  g.fillStyle = '#b9b3a2'; g.fillRect(66, 204, 5, 14); g.fillRect(81, 204, 5, 14)
  const dg = g.createLinearGradient(0, H - 50, 0, H); dg.addColorStop(0, 'rgba(30,25,20,0)'); dg.addColorStop(1, 'rgba(30,25,20,0.6)')
  g.fillStyle = dg; g.fillRect(8, H - 50, W - 16, 50) // kicked, dirty bottom
  return tex(c, { repeat: false })
}

// ASTU notice poster: white board, blue header with logo, dark text panel (photos 145543, 145520)
export function posterTex() {
  const W = 320, H = 224, [c, g] = canvas(W, H)
  g.fillStyle = '#2d5fa8'; g.fillRect(0, 0, W, H)
  g.fillStyle = '#f4f4f0'; g.fillRect(6, 6, W - 12, H - 12)
  g.fillStyle = '#1f4f96'; g.fillRect(6, 6, W - 12, 34)
  g.fillStyle = '#e8b84a'; g.beginPath(); g.arc(24, 23, 11, 0, 7); g.fill()
  g.fillStyle = '#fff'; g.font = 'bold 13px Arial'; g.fillText('Adama Science and Technology University', 42, 20)
  g.font = '10px Arial'; g.fillText('College of Electrical Engineering and Computing', 42, 34)
  g.fillStyle = '#1d2733'; g.fillRect(130, 50, W - 142, 120)
  g.fillStyle = 'rgba(220,230,240,0.75)'; for (let y = 60; y < 162; y += 9) g.fillRect(140, y, 60 + ((y * 37) % 90), 3)
  g.fillStyle = 'rgba(40,40,40,0.6)'; for (let y = 56; y < 190; y += 8) g.fillRect(16, y, 100, 2)
  g.fillStyle = '#3a9a5a'; g.fillRect(130, 178, W - 142, 30)
  return tex(c, { repeat: false })
}

// small blue room-number plate
export function plateTex() {
  const [c, g] = canvas(64, 48)
  g.fillStyle = '#1c4fa0'; g.fillRect(0, 0, 64, 48)
  g.strokeStyle = '#fff'; g.lineWidth = 2; g.strokeRect(3, 3, 58, 42)
  g.fillStyle = '#fff'; g.font = 'bold 15px Arial'; g.textAlign = 'center'; g.fillText('5' + (10 + Math.floor(Math.random() * 9)), 32, 22)
  g.font = '10px Arial'; g.fillText('ROOM', 32, 38)
  return tex(c, { repeat: false })
}

// Roughcast parapet band (band UVs: v = 0 bottom .. 1 top of each wall piece). Beige-grey
// pebble-dash, black algae along the top edge with runs hanging down, dust along the bottom.
export function parapetTex(seed = 21) {
  const W = 1024, H = 256, [c, g] = canvas(W, H), r = rng(seed)
  g.fillStyle = '#c4b38b'; g.fillRect(0, 0, W, H)
  blotches(g, W, H, 90, r, ['226,214,184', '160,148,120', '128,120,100'], 20, 90, 0.14)
  // top-edge staining
  const tg = g.createLinearGradient(0, 0, 0, H * 0.5)
  tg.addColorStop(0, 'rgba(52,50,44,0.78)'); tg.addColorStop(0.12, 'rgba(70,66,56,0.5)'); tg.addColorStop(0.45, 'rgba(90,84,70,0.16)'); tg.addColorStop(1, 'rgba(90,84,70,0)')
  g.fillStyle = tg; g.fillRect(0, 0, W, H * 0.5)
  for (let i = 0; i < 46; i++) { // runs
    const x = r() * W, len = 30 + r() * 170, w = 6 + r() * 26
    const gr = g.createLinearGradient(0, 0, 0, len)
    gr.addColorStop(0, `rgba(48,46,40,${0.12 + r() * 0.2})`); gr.addColorStop(1, 'rgba(48,46,40,0)')
    g.fillStyle = gr; for (const ox of [-W, 0]) g.fillRect(x + ox, 0, w, len)
  }
  const bg = g.createLinearGradient(0, H * 0.82, 0, H); bg.addColorStop(0, 'rgba(110,96,70,0)'); bg.addColorStop(1, 'rgba(110,96,70,0.35)')
  g.fillStyle = bg; g.fillRect(0, H * 0.82, W, H * 0.18)
  // pebble-dash speckle
  for (let i = 0; i < 16000; i++) {
    g.fillStyle = r() < 0.5 ? `rgba(255,250,232,${0.1 + r() * 0.16})` : `rgba(60,52,40,${0.08 + r() * 0.16})`
    g.fillRect(r() * W, r() * H, 1 + r() * 1.5, 1 + r() * 1.5)
  }
  const t = tex(c)
  t.wrapT = THREE.ClampToEdgeWrapping
  return t
}

export function barkTex(seed = 10) {
  const W = 128, H = 256, [c, g] = canvas(W, H), r = rng(seed)
  g.fillStyle = '#6a5a49'; g.fillRect(0, 0, W, H)
  for (let i = 0; i < 160; i++) {
    g.strokeStyle = `rgba(${r() < 0.5 ? '40,30,22' : '150,135,115'},${0.2 + r() * 0.3})`
    g.lineWidth = 1 + r() * 3
    const x = r() * W; g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + 8, H / 3, x - 8, (2 * H) / 3, x + (r() - 0.5) * 10, H); g.stroke()
  }
  grain(g, W, H, 20, r)
  return tex(c)
}

export function palmBarkTex() {
  const W = 128, H = 128, [c, g] = canvas(W, H), r = rng(11)
  g.fillStyle = '#7b6a52'; g.fillRect(0, 0, W, H)
  // diamond leaf-base pattern of a Canary date palm trunk
  for (let y = -16; y < H + 16; y += 16) for (let x = -16; x < W + 16; x += 32) {
    const ox = (y / 16) % 2 ? 16 : 0
    { const f = 0.75 + r() * 0.4; g.fillStyle = `rgb(${[120, 100, 75].map((v) => Math.round(v * f))})` }
    g.beginPath(); g.moveTo(x + ox, y - 8); g.lineTo(x + ox + 15, y); g.lineTo(x + ox, y + 8); g.lineTo(x + ox - 15, y); g.closePath(); g.fill()
    g.strokeStyle = 'rgba(40,30,20,0.6)'; g.lineWidth = 1.5; g.stroke()
  }
  grain(g, W, H, 20, r)
  return tex(c)
}

// foliage clump with alpha: hundreds of small leaflets on fine twigs, lighter toward the top so
// the cards read as lit sprays rather than flat blobs
export function leafTex(hue = 'green', seed = 12) {
  const S = 512, [c, g] = canvas(S), r = rng(seed)
  const pal = hue === 'red'
    ? [[46, 86, 38], [60, 104, 44], [36, 70, 32]]
    : hue === 'dry'
      ? [[104, 116, 58], [128, 130, 70], [84, 98, 48], [150, 140, 86]]
      : [[44, 84, 36], [58, 100, 42], [34, 68, 30], [80, 118, 50]]
  g.strokeStyle = 'rgba(70,56,40,0.9)'; g.lineWidth = 2
  const tips = []
  for (let i = 0; i < 16; i++) { // twigs radiating from the centre
    const a = r() * Math.PI * 2, L = S * (0.22 + r() * 0.22)
    const ex = S / 2 + Math.cos(a) * L, ey = S / 2 + Math.sin(a) * L
    g.beginPath(); g.moveTo(S / 2, S / 2); g.quadraticCurveTo(S / 2 + Math.cos(a + 0.4) * L * 0.5, S / 2 + Math.sin(a + 0.4) * L * 0.5, ex, ey); g.stroke()
    for (let k = 0; k < 5; k++) tips.push([S / 2 + (ex - S / 2) * (0.35 + k * 0.16), S / 2 + (ey - S / 2) * (0.35 + k * 0.16)])
  }
  for (let i = 0; i < 2600; i++) {
    const t = tips[Math.floor(r() * tips.length)], d = r() * 50, a = r() * Math.PI * 2
    const x = t[0] + Math.cos(a) * d, y = t[1] + Math.sin(a) * d
    if (Math.hypot(x - S / 2, y - S / 2) > S * 0.47) continue
    let col = pal[Math.floor(r() * pal.length)]
    if (hue === 'red' && r() < 0.045) col = r() < 0.5 ? [214, 62, 28] : [238, 96, 38]
    const sh = (0.7 + r() * 0.5) * (1.12 - 0.3 * (y / S))
    g.fillStyle = `rgb(${col.map((v) => Math.min(255, Math.round(v * sh)))})`
    g.save(); g.translate(x, y); g.rotate(r() * Math.PI * 2)
    const L = 7 + r() * 7
    g.beginPath(); g.moveTo(-L, 0); g.quadraticCurveTo(0, -L * 0.55, L, 0); g.quadraticCurveTo(0, L * 0.55, -L, 0); g.fill()
    g.restore()
  }
  return tex(c, { repeat: false })
}

// palm frond: central rachis with leaflets (u along frond, v across)
export function frondTex() {
  const W = 512, H = 128, [c, g] = canvas(W, H), r = rng(13)
  g.strokeStyle = '#7d7a3e'; g.lineWidth = 4
  g.beginPath(); g.moveTo(0, H / 2); g.lineTo(W, H / 2); g.stroke()
  for (let x = 12; x < W - 6; x += 4.5) {
    const t = x / W, len = (H / 2 - 4) * Math.sin(Math.PI * Math.min(1, t * 1.15)) * (0.85 + r() * 0.15)
    for (const s of [-1, 1]) {
      g.strokeStyle = `rgb(${[50, 86, 36].map((v) => Math.round(v * (0.8 + r() * 0.4)))})`
      g.lineWidth = 3.6
      g.beginPath(); g.moveTo(x, H / 2); g.quadraticCurveTo(x + 10, H / 2 + s * len * 0.5, x + 18, H / 2 + s * len); g.stroke()
    }
  }
  return tex(c, { repeat: false })
}

export function boardTex() {
  const W = 256, H = 160, [c, g] = canvas(W, H)
  g.fillStyle = '#2f5d3c'; g.fillRect(0, 0, W, H)
  g.fillStyle = '#ece8dc'; g.fillRect(10, 10, W - 20, H - 20)
  const cols = ['#c0392b', '#2e86c1', '#27ae60', '#e67e22']
  for (let i = 0; i < 6; i++) {
    g.fillStyle = cols[i % 4]; g.fillRect(20 + (i % 3) * 76, 20 + Math.floor(i / 3) * 64, 66, 10)
    g.fillStyle = 'rgba(40,40,40,0.55)'
    for (let y = 36; y < 72; y += 6) g.fillRect(20 + (i % 3) * 76, y + Math.floor(i / 3) * 64, 60, 2)
  }
  return tex(c, { repeat: false })
}

// --------------------------------------------------------------------------- sky
// tileable (in x) value noise for the cloud dome
function fbm(px, py, period, r0) {
  let v = 0, amp = 0.5, f = 1
  for (let o = 0; o < 5; o++) {
    const x = px * f, y = py * f, P = period * f
    const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi
    const h = (a, b) => { const n = Math.sin((((a % P) + P) % P) * 127.1 + b * 311.7 + o * 74.7 + r0) * 43758.5453; return n - Math.floor(n) }
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy)
    const a = h(xi, yi), b = h(xi + 1, yi), c2 = h(xi, yi + 1), d = h(xi + 1, yi + 1)
    v += amp * (a + (b - a) * sx + (c2 - a) * sy + (a - b - c2 + d) * sx * sy)
    amp *= 0.5; f *= 2
  }
  return v
}

// fair-weather cumulus for a hemisphere dome (u = azimuth, v = 0 horizon .. 1 zenith)
export function cloudTex(seed = 5) {
  const W = 1024, H = 256, [c, g] = canvas(W, H)
  const img = g.createImageData(W, H), p = img.data
  for (let y = 0; y < H; y++) {
    const elev = 1 - y / H // 1 = zenith (canvas top)
    const sy = 2.2 / (elev + 0.18) // perspective: clouds bunch up toward the horizon
    for (let x = 0; x < W; x++) {
      const n = fbm((x / W) * 6, sy * 1.05, 6, seed)
      const n2 = fbm((x / W) * 6 + 0.1, sy * 1.05 + 0.25, 6, seed) // offset copy = underside shading
      let d = Math.min(1, Math.max(0, (n - 0.5) / 0.2))
      d = d * d * (3 - 2 * d)
      const fade = Math.min(1, elev / 0.07) * Math.min(1, (1 - elev) / 0.25 + 0.15)
      const shade = 0.74 + 0.26 * Math.min(1, Math.max(0, (n - n2) * 5 + 0.6))
      const i = (y * W + x) * 4
      p[i] = 255 * shade; p[i + 1] = 255 * shade; p[i + 2] = 255 * Math.min(1, shade + 0.03); p[i + 3] = 255 * d * fade * 0.96
    }
  }
  g.putImageData(img, 0, 0)
  const t = new THREE.CanvasTexture(c)
  t.wrapS = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace
  return t
}
