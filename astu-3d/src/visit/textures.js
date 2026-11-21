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
// worn and stained (photos 145640-145649, floor_510_full.jpg). One tile = 3 m.
export function pavingTex(seed = 4) {
  const S = 512, [c, g] = canvas(S), r = rng(seed)
  g.fillStyle = '#443f36'; g.fillRect(0, 0, S, S) // deep recessed joint gap
  const rows = 4, rh = S / rows, cols = 4, cw = S / cols // large square paving flags matching photos
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const x = i * cw, y = j * rh
      const t = 0.88 + r() * 0.22, warm = (r() - 0.5) * 8
      g.fillStyle = `rgb(${[186 * t + warm, 174 * t, 152 * t - warm].map(Math.round)})`
      g.fillRect(x + 3, y + 3, cw - 6, rh - 6)
      // chamfered bevel highlights
      g.fillStyle = 'rgba(255,250,235,0.32)'; g.fillRect(x + 3, y + 3, cw - 6, 2.5); g.fillRect(x + 3, y + 3, 2.5, rh - 6)
      g.fillStyle = 'rgba(35,30,24,0.35)'; g.fillRect(x + 3, y + rh - 5.5, cw - 6, 2.5); g.fillRect(x + cw - 5.5, y + 3, 2.5, rh - 6)
      // surface mottling & stone texture
      for (let k = 0; k < 18; k++) {
        g.fillStyle = `rgba(${r() < 0.5 ? '245,238,220' : '90,80,68'},${0.06 + r() * 0.12})`
        g.fillRect(x + 4 + r() * (cw - 12), y + 4 + r() * (rh - 12), 2 + r() * 8, 1 + r() * 4)
      }
      if (r() < 0.2) { // fine hairline weather crack
        g.strokeStyle = 'rgba(55,45,35,0.45)'; g.lineWidth = 1; g.beginPath()
        let cx = x + 8 + r() * (cw - 16), cy = y + 4; g.moveTo(cx, cy)
        for (let k = 0; k < 6; k++) { cx += (r() - 0.5) * 16; cy += rh / 7; g.lineTo(cx, cy) }
        g.stroke()
      }
    }
  }
  blotches(g, S, S, 50, r, ['95,82,62', '220,210,185', '125,108,80', '65,60,52'], 16, 90, 0.14)
  grain(g, S, S, 18, r)
  return tex(c)
}

// gallery corridor & stair landing floor tile: light terrazzo/concrete square tiles with joint grid
// matching photos 145456, 145543 and walk_full_res.jpg
export function corridorTileTex(seed = 18) {
  const S = 512, [c, g] = canvas(S), r = rng(seed)
  g.fillStyle = '#524b42'; g.fillRect(0, 0, S, S) // dark grout joints
  const tiles = 8, ts = S / tiles
  for (let y = 0; y < tiles; y++) {
    for (let x = 0; x < tiles; x++) {
      const x0 = x * ts + 2.5, y0 = y * ts + 2.5, tw = ts - 5, th = ts - 5
      const t = 0.93 + r() * 0.14, warm = (r() - 0.5) * 6
      g.fillStyle = `rgb(${[205 * t + warm, 196 * t, 178 * t - warm].map(Math.round)})`
      g.fillRect(x0, y0, tw, th)
      // terrazzo chips: cream, dark grey and ochre
      for (let k = 0; k < 36; k++) {
        const chipCol = r() < 0.35 ? 'rgba(65,60,52,0.42)' : r() < 0.72 ? 'rgba(255,255,248,0.55)' : 'rgba(175,145,105,0.35)'
        g.fillStyle = chipCol
        g.fillRect(x0 + 2 + r() * (tw - 5), y0 + 2 + r() * (th - 5), 1 + r() * 2.5, 1 + r() * 2)
      }
      // light edge bevels
      g.fillStyle = 'rgba(255,252,242,0.35)'; g.fillRect(x0, y0, tw, 1.8); g.fillRect(x0, y0, 1.8, th)
      g.fillStyle = 'rgba(38,32,25,0.28)'; g.fillRect(x0, y0 + th - 1.8, tw, 1.8); g.fillRect(x0 + tw - 1.8, y0, 1.8, th)
    }
  }
  blotches(g, S, S, 35, r, ['145,135,118', '235,228,212'], 24, 100, 0.09)
  grain(g, S, S, 12, r)
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

// classroom door (photos 113643, 145547, door_full_res.jpg): tall concrete frame,
// unequal double wooden leaves with authentic diagonal chevron panel battens, glazed
// transom with horizontal louvres and taped notice. 1.3 m x 2.85 m.
export function doorTex(seed = 9) {
  const W = 256, H = 512, [c, g] = canvas(W, H), r = rng(seed)
  g.fillStyle = '#d9b651'; g.fillRect(0, 0, W, H) // concrete frame, same warm yellow as gallery wall
  // frame inner shadow / reveal
  g.fillStyle = 'rgba(35,28,15,0.45)'; g.fillRect(10, 10, W - 20, H - 10)

  // transom (y: 12..124): split into unequal panes matching the door leaves below
  g.fillStyle = '#4f5c35'; g.fillRect(12, 12, W - 24, 112)
  const tw1 = Math.round((W - 32) * 0.60), tw2 = (W - 32) - tw1
  const panes = [[14, tw1 - 2], [14 + tw1 + 2, tw2]]
  for (let i = 0; i < 2; i++) {
    const [tx, tw] = panes[i]
    const gr = g.createLinearGradient(0, 14, 0, 122); gr.addColorStop(0, '#354345'); gr.addColorStop(0.6, '#182022'); gr.addColorStop(1, '#232a2c')
    g.fillStyle = gr; g.fillRect(tx, 14, tw, 108)
    // horizontal glass louver slats catching ambient sky reflection
    for (let ly = 22; ly < 120; ly += 15) {
      g.fillStyle = 'rgba(215,230,235,0.32)'; g.fillRect(tx + 2, ly, tw - 4, 3.5)
      g.fillStyle = 'rgba(8,12,16,0.55)'; g.fillRect(tx + 2, ly + 3.5, tw - 4, 2.5)
    }
  }
  // taped white paper exam notice in wide transom pane (photo door_full_res.jpg)
  const nx = 42, ny = 36, nw = 56, nh = 46
  g.fillStyle = '#f0ede4'; g.fillRect(nx, ny, nw, nh)
  // scotch tape at corners
  g.fillStyle = 'rgba(230,230,210,0.55)'
  g.fillRect(nx - 4, ny - 3, 12, 6); g.fillRect(nx + nw - 8, ny - 3, 12, 6)
  g.fillRect(nx - 4, ny + nh - 3, 12, 6); g.fillRect(nx + nw - 8, ny + nh - 3, 12, 6)
  // printed text lines
  g.fillStyle = 'rgba(30,30,30,0.72)'
  for (let y = ny + 8; y < ny + nh - 4; y += 6) g.fillRect(nx + 6, y, nw - 12 - ((y * 19) % 14), 2)

  // concrete transom rail (y: 124..134)
  g.fillStyle = '#cca745'; g.fillRect(10, 124, W - 20, 10)
  g.fillStyle = 'rgba(30,22,10,0.35)'; g.fillRect(10, 132, W - 20, 2)

  // wooden door leaves (y: 134..512): unequal pair (wide leaf on left, narrow on right)
  const lw1 = tw1, lw2 = tw2
  const drawChevronLeaf = (x0, w, isLeft) => {
    const t = 0.94 + r() * 0.14
    // base timber color: rich golden-amber teak
    g.fillStyle = `rgb(${[144 * t, 104 * t, 56 * t].map(Math.round)})`
    g.fillRect(x0, 134, w, H - 134)
    // realistic fine wood grain
    for (let k = 0; k < 55; k++) {
      g.fillStyle = `rgba(${r() < 0.5 ? '45,28,10' : '205,160,95'},${0.07 + r() * 0.13})`
      g.fillRect(x0 + r() * w, 134 + r() * 340, 1 + r() * 1.8, 25 + r() * 90)
    }
    // outer stiles and rails
    const stw = 11, topRy = 146, midRy = 310, botRy = 475
    // panel regions: upper panel (146..310), lower panel (326..475)
    for (const [py0, py1, diagDir] of [[topRy, midRy, isLeft ? 1 : -1], [midRy + 16, botRy, isLeft ? -1 : 1]]) {
      const pw = w - stw * 2, ph = py1 - py0, px0 = x0 + stw
      // recessed dark panel backing
      g.fillStyle = 'rgba(25,16,8,0.52)'; g.fillRect(px0, py0, pw, ph)
      g.fillStyle = `rgb(${[112 * t, 78 * t, 40 * t].map(Math.round)})`
      g.fillRect(px0 + 2, py0 + 2, pw - 4, ph - 4)

      // authentic diagonal chevron / batten brace across the panel (photo door_full_res.jpg)
      const bw = 16 // batten width
      g.save()
      g.beginPath()
      g.rect(px0 + 2, py0 + 2, pw - 4, ph - 4)
      g.clip()
      // diagonal batten strip
      g.fillStyle = `rgb(${[140 * t, 100 * t, 54 * t].map(Math.round)})`
      g.beginPath()
      if (diagDir > 0) {
        g.moveTo(px0, py1); g.lineTo(px0 + bw, py1); g.lineTo(px0 + pw, py0 + bw); g.lineTo(px0 + pw, py0); g.lineTo(px0 + pw - bw, py0); g.lineTo(px0, py1 - bw); g.closePath()
      } else {
        g.moveTo(px0, py0); g.lineTo(px0 + bw, py0); g.lineTo(px0 + pw, py1 - bw); g.lineTo(px0 + pw, py1); g.lineTo(px0 + pw - bw, py1); g.lineTo(px0, py0 + bw); g.closePath()
      }
      g.fill()
      // batten arris highlight and shadow bevels
      g.strokeStyle = 'rgba(240,205,150,0.35)'; g.lineWidth = 1.5; g.stroke()
      g.strokeStyle = 'rgba(20,12,5,0.45)'; g.lineWidth = 1.5
      g.beginPath()
      if (diagDir > 0) { g.moveTo(px0, py1); g.lineTo(px0 + pw, py0 + bw) }
      else { g.moveTo(px0, py0 + bw); g.lineTo(px0 + pw, py1) }
      g.stroke()
      g.restore()

      // recessed panel perimeter bevels
      g.fillStyle = 'rgba(240,200,140,0.28)'; g.fillRect(px0 + 2, py0 + 2, pw - 4, 2); g.fillRect(px0 + 2, py0 + 2, 2, ph - 4)
      g.fillStyle = 'rgba(20,12,5,0.42)'; g.fillRect(px0 + 2, py1 - 3, pw - 4, 2); g.fillRect(px0 + pw - 3, py0 + 2, 2, ph - 4)
    }

    // middle lock rail
    g.fillStyle = `rgb(${[146 * t, 106 * t, 58 * t].map(Math.round)})`
    g.fillRect(x0 + stw, midRy, w - stw * 2, 16)
    g.fillStyle = 'rgba(245,210,155,0.3)'; g.fillRect(x0 + stw, midRy, w - stw * 2, 1.5)
    g.fillStyle = 'rgba(20,12,5,0.35)'; g.fillRect(x0 + stw, midRy + 14.5, w - stw * 2, 1.5)
  }

  drawChevronLeaf(14, lw1 - 2, true)
  drawChevronLeaf(14 + lw1 + 2, lw2, false)

  // meeting stile center seam with dark shadow
  g.fillStyle = '#140f0a'; g.fillRect(14 + lw1 - 2, 134, 4, H - 134)
  g.fillStyle = 'rgba(210,175,115,0.35)'; g.fillRect(14 + lw1 + 1, 134, 1.5, H - 134)

  // brass/silver door handle & escutcheon on main leaf
  const hx = 14 + lw1 - 18
  g.fillStyle = '#b8b2a0'; g.fillRect(hx, 304, 10, 36) // escutcheon plate
  g.fillStyle = 'rgba(255,255,245,0.45)'; g.fillRect(hx + 1, 305, 8, 2)
  g.fillStyle = 'rgba(25,22,18,0.5)'; g.fillRect(hx + 1, 338, 8, 2)
  g.fillStyle = '#3a3630'; g.fillRect(hx + 3, 324, 4, 7) // keyhole
  g.fillStyle = '#dcd6c8'; g.fillRect(hx - 14, 312, 18, 6) // lever handle
  g.fillStyle = 'rgba(255,255,255,0.6)'; g.fillRect(hx - 14, 312, 18, 2)

  // scuffing and kickplate weathering along bottom
  const dg = g.createLinearGradient(0, H - 70, 0, H); dg.addColorStop(0, 'rgba(25,18,12,0)'); dg.addColorStop(1, 'rgba(20,15,10,0.75)')
  g.fillStyle = dg; g.fillRect(14, H - 70, W - 28, 70)
  grain(g, W, H, 10, r)
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
export function plateTex(num = '509', sub = 'ROOM') {
  const [c, g] = canvas(128, 96)
  g.fillStyle = '#144688'; g.fillRect(0, 0, 128, 96)
  g.strokeStyle = '#f4f6fa'; g.lineWidth = 4; g.strokeRect(6, 6, 116, 84)
  g.fillStyle = '#fff'; g.font = 'bold 32px Arial'; g.textAlign = 'center'
  g.fillText(String(num), 64, 46)
  g.font = 'bold 16px Arial'
  g.fillText(sub, 64, 76)
  return tex(c, { repeat: false })
}

// prominent vertical building code plaque mounted on stair tower pillars (photo 145543)
export function towerSignTex(name = 'B 509') {
  const [c, g] = canvas(128, 256)
  g.fillStyle = '#0f3875'; g.fillRect(0, 0, 128, 256)
  g.strokeStyle = '#ffffff'; g.lineWidth = 5; g.strokeRect(6, 6, 116, 244)
  g.fillStyle = '#ffffff'; g.textAlign = 'center'
  g.font = 'bold 36px Arial'; g.fillText(name.slice(0, 1), 64, 55)
  g.font = 'bold 44px Arial'; g.fillText(name.slice(2), 64, 120)
  g.fillStyle = '#d8bb50'; g.fillRect(20, 145, 88, 5)
  g.fillStyle = '#e8edf6'; g.font = 'bold 16px Arial'; g.fillText('ASTU', 64, 185)
  g.font = '12px Arial'; g.fillText('CEEC', 64, 215)
  return tex(c, { repeat: false })
}

// window with vertical security iron bars (for Block 510, photos 145622, 145624)
export function windowGrilleTex() {
  const U = 256, W = U * 4, H = 128, [c, g] = canvas(W, H), r = rng(45)
  const frame = '#5c6840'
  for (let u = 0; u < 4; u++) {
    const X = u * U
    g.fillStyle = frame; g.fillRect(X, 0, U, H)
    const x0 = X + 6, w = U - 12, y0 = 6, h = H - 12
    const gr = g.createLinearGradient(0, y0, 0, y0 + h)
    gr.addColorStop(0, '#283236'); gr.addColorStop(1, '#151c1e')
    g.fillStyle = gr; g.fillRect(x0, y0, w, h)
    // vertical security iron bars
    for (let bx = x0 + 10; bx < x0 + w - 6; bx += 14) {
      g.fillStyle = '#222628'; g.fillRect(bx, y0, 3.5, h)
      g.fillStyle = 'rgba(255,255,255,0.22)'; g.fillRect(bx, y0, 1, h)
    }
    // horizontal tie bars
    for (const hy of [y0 + h * 0.3, y0 + h * 0.7]) {
      g.fillStyle = '#1a1e20'; g.fillRect(x0, hy, w, 3.5)
    }
  }
  grain(g, W, H, 10, r)
  return tex(c, { repeat: true })
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
