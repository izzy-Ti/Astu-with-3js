if (import.meta.env.DEV) window.addEventListener('error', (e) => { const d = document.createElement('pre'); d.id = 'err'; d.style.cssText = 'position:fixed;top:0;left:330px;z-index:99;background:#400;color:#fff;padding:8px;font-size:12px;white-space:pre-wrap;max-width:60%'; d.textContent = (e.error && e.error.stack) || e.message; document.body.appendChild(d) })
import './style.css'
import { campus, METERS_PER_UNIT } from './data/campus.js'
import { createMap } from './map2d.js'

const T = campus.types
const count = (fn) => campus.buildings.filter(fn).length
const zonesSorted = campus.zones.slice().sort((a, b) => a.id - b.id)

const app = document.querySelector('#app')
app.innerHTML = `
  <aside class="panel">
    <header>
      <div class="brand"><span class="logo">A</span>
        <div><h1>ASTU Campus</h1><p class="sub">Adama Science &amp; Technology University</p></div>
      </div>
      <div class="stats">
        <div><b>${campus.buildings.length}</b><span>buildings</span></div>
        <div><b>${(campus.trees.length / 1000).toFixed(1)}k</b><span>trees</span></div>
        <div><b>≈${((campus.map.width * METERS_PER_UNIT) / 1000).toFixed(1)}×${((campus.map.height * METERS_PER_UNIT) / 1000).toFixed(1)}</b><span>km extent</span></div>
      </div>
      <a class="visit3d" href="./visit.html?site=b510"><b>NEW · 3D walk</b><span>Block 510 cluster, academic core →</span></a>
      <div class="search">
        <input id="q" placeholder="Search building, ID or type…" autocomplete="off"/>
        <ul id="results"></ul>
      </div>
    </header>

    <section>
      <h2>View</h2>
      <label class="slider">Building height (2.5D) <span id="tiltv">85%</span>
        <input type="range" id="tilt" min="0" max="150" value="85"/></label>
      <label class="slider">Sun direction <span id="sunv">NW</span>
        <input type="range" id="sun" min="0" max="359" value="315"/></label>
      <label class="slider">Satellite overlay <span id="satv">0%</span>
        <input type="range" id="sat" min="0" max="100" value="0"/></label>
      <div class="layers">
        ${['buildings', 'trees', 'roads', 'areas', 'shadows', 'labels', 'zones']
          .map((l) => `<label class="chip"><input type="checkbox" data-layer="${l}" ${l === 'zones' ? '' : 'checked'}/><span>${l}</span></label>`)
          .join('')}
      </div>
    </section>

    <section>
      <h2>Zones</h2>
      <div class="zones">
        <button data-zone="all" class="active"><i class="all"></i>Whole campus<small>${campus.buildings.length}</small></button>
        ${zonesSorted.map((z) => `<button data-zone="${z.id}" title="${z.name}"><i style="background:${z.color}"></i>
            <span><b>${z.id}</b> ${z.name.split('·')[1].split('(')[0].trim()}<em>${z.name.split('(')[1]?.replace(')', '') || ''}</em></span>
            <small>${count((b) => b.zone === z.id)}</small></button>`).join('')}
      </div>
    </section>

    <section>
      <h2>Building types <small>click to highlight</small></h2>
      <ul class="legend">
        ${Object.entries(T).map(([k, t]) => {
          const n = count((b) => b.type === k)
          return n ? `<li data-type="${k}"><i style="background:${t.color}"></i>${t.label}<small>${n}</small></li>` : ''
        }).join('')}
      </ul>
    </section>

    <footer>
      <span>Scroll zoom · drag pan · double-click zoom</span>
      <span id="coords">–</span>
    </footer>
  </aside>

  <main class="stage">
    <div class="toolbar">
      <button id="zin" title="Zoom in">+</button>
      <button id="zout" title="Zoom out">−</button>
      <button id="home" title="Reset view">⤢</button>
    </div>
    <div class="compass" title="North">
      <svg viewBox="0 0 40 40"><path d="M20 4 L26 22 L20 19 L14 22Z" fill="#f0b429"/><path d="M20 36 L14 18 L20 21 L26 18Z" fill="#5d6670"/></svg>
      <span>N</span>
    </div>
    <div id="card" class="card hidden"></div>
    <div id="tip" class="tip"></div>
  </main>
`

const $ = (s) => document.querySelector(s)
const stage = $('.stage'), tip = $('#tip'), card = $('#card')

const map = createMap(stage, campus, {
  onPointer: (x, y) => ($('#coords').textContent = `${x.toFixed(0)}, ${y.toFixed(0)}`),
  onHover(b, ev) {
    if (!b) return (tip.style.display = 'none')
    const r = stage.getBoundingClientRect()
    tip.style.display = 'block'
    tip.style.left = `${ev.clientX - r.left + 16}px`
    tip.style.top = `${ev.clientY - r.top + 16}px`
    tip.innerHTML = `<i style="background:${T[b.type].color}"></i><b>${b.name || T[b.type].label}</b><span>${b.id}</span>`
  },
  onSelect: showCard,
  onReady() {
    const v = new URLSearchParams(location.search).get('view') // e.g. ?view=400,600,4
    if (v) { const [x, y, k] = v.split(',').map(Number); map.setView(x, y, k) }
  },
})

function footprint(b) {
  let a = 0
  const p = b.poly
  for (let i = 0; i < p.length; i++) { const [x1, y1] = p[i], [x2, y2] = p[(i + 1) % p.length]; a += x1 * y2 - x2 * y1 }
  let area = Math.abs(a / 2)
  if (b.hole) {
    let h = 0
    for (let i = 0; i < b.hole.length; i++) { const [x1, y1] = b.hole[i], [x2, y2] = b.hole[(i + 1) % b.hole.length]; h += x1 * y2 - x2 * y1 }
    area -= Math.abs(h / 2)
  }
  return area * METERS_PER_UNIT ** 2
}

function showCard(b) {
  if (!b) return card.classList.add('hidden')
  const t = T[b.type]
  const z = campus.zones.find((z) => z.id === b.zone)
  const fp = footprint(b)
  card.innerHTML = `
    <div class="card-top" style="--c:${t.color}">
      <button class="x" title="Close">×</button>
      <span class="tag">${b.id}</span>
      <h3>${b.name || t.label}</h3>
      <p>${b.name ? t.label + ' · ' : ''}Zone ${b.zone} — ${z.name.split('·')[1].split('(')[0].trim()}</p>
    </div>
    <div class="card-grid">
      <div><b>${b.floors}</b><span>floors (est.)</span></div>
      <div><b>≈${Math.round(fp / 10) * 10}</b><span>m² footprint</span></div>
      <div><b>≈${Math.round(fp * b.floors / 50) * 50}</b><span>m² floor area</span></div>
      <div><b>${b.hole ? 'Yes' : 'No'}</b><span>courtyard</span></div>
    </div>
    ${b.visit ? `<a class="visit-btn" href="./visit.html?site=${b.visit}">🚶 Walk around in 3D</a>` : ''}
    <p class="note">${b.source === 'detected' ? 'Footprint auto-detected from satellite roof.' : 'Footprint hand-traced.'}
      Name &amp; photos pending.</p>`
  card.classList.remove('hidden')
  card.querySelector('.x').onclick = () => map.select(null)
}

// ---- view controls
const bindSlider = (id, fmt, fn) => {
  const el = $(`#${id}`)
  const upd = () => { $(`#${id}v`).textContent = fmt(+el.value); fn(+el.value) }
  el.addEventListener('input', upd)
  return { el, upd }
}
const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
bindSlider('tilt', (v) => `${v}%`, (v) => map.setTilt(v / 100))
bindSlider('sun', (v) => COMPASS[Math.round(v / 45) % 8], (v) => map.setSun(v))
const sat = bindSlider('sat', (v) => `${v}%`, (v) => map.setSatellite(v / 100))
const satParam = new URLSearchParams(location.search).get('sat')
if (satParam) { sat.el.value = satParam; sat.upd() }

document.querySelectorAll('[data-layer]').forEach((cb) => {
  map.setLayer(cb.dataset.layer, cb.checked)
  cb.addEventListener('change', () => map.setLayer(cb.dataset.layer, cb.checked))
})

// ---- zones
const zoneCb = $('[data-layer="zones"]')
document.querySelectorAll('[data-zone]').forEach((btn) =>
  btn.addEventListener('click', () => {
    document.querySelectorAll('.zones button').forEach((b) => b.classList.toggle('active', b === btn))
    if (btn.dataset.zone === 'all') { map.highlightZone(null); return map.reset() }
    const z = campus.zones.find((z) => z.id === +btn.dataset.zone)
    if (!zoneCb.checked) { zoneCb.checked = true; map.setLayer('zones', true) }
    map.highlightZone(z.id)
    map.fitTo(z.poly)
  }),
)

// ---- legend filter
let activeType = null
document.querySelectorAll('.legend li').forEach((li) =>
  li.addEventListener('click', () => {
    activeType = activeType === li.dataset.type ? null : li.dataset.type
    document.querySelectorAll('.legend li').forEach((x) => x.classList.toggle('active', x.dataset.type === activeType))
    map.filterType(activeType)
  }),
)

// ---- search
const q = $('#q'), results = $('#results')
q.addEventListener('input', () => {
  const s = q.value.trim().toLowerCase()
  if (!s) return (results.innerHTML = '')
  const hits = campus.buildings
    .filter((b) => b.id.toLowerCase().includes(s) || (b.name || '').toLowerCase().includes(s) || T[b.type].label.toLowerCase().includes(s))
    .slice(0, 8)
  results.innerHTML = hits.length
    ? hits.map((b) => `<li data-id="${b.id}"><i style="background:${T[b.type].color}"></i>${b.name || T[b.type].label}<small>${b.id}</small></li>`).join('')
    : '<li class="none">No match</li>'
  results.querySelectorAll('[data-id]').forEach((li) => li.addEventListener('click', () => {
    map.focusBuilding(li.dataset.id); results.innerHTML = ''; q.value = ''
  }))
})
q.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') results.querySelector('[data-id]')?.click()
  if (e.key === 'Escape') { q.value = ''; results.innerHTML = '' }
})

$('#zin').onclick = () => map.zoom(1.5)
$('#zout').onclick = () => map.zoom(1 / 1.5)
$('#home').onclick = () => map.reset()
addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return
  if (e.key === '+' || e.key === '=') map.zoom(1.5)
  if (e.key === '-') map.zoom(1 / 1.5)
  if (e.key === '0') map.reset()
  if (e.key === 'Escape') map.select(null)
})
