import * as THREE from 'three'
import { Sky } from 'three/examples/jsm/objects/Sky.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { MeshBVH } from 'three-mesh-bvh'
import * as T from './textures.js'
import { buildSite, START, toWorld, SITE_ROT } from './site510.js'
import { icon } from './icons.js'
import './visit.css'

const params = new URLSearchParams(location.search)
const $ = (s) => document.querySelector(s)
const clamp = THREE.MathUtils.clamp

// ------------------------------------------------------------------ renderer / scene
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: params.has('shot') })
const PR = Math.min(devicePixelRatio, 1.5)
renderer.setPixelRatio(PR)
renderer.setSize(innerWidth, innerHeight)
// Khronos PBR Neutral keeps the wall paint and sky colours true (ACES/AgX wash the yellow out)
renderer.toneMapping = { agx: THREE.AgXToneMapping, aces: THREE.ACESFilmicToneMapping }[params.get('tm')] ?? THREE.NeutralToneMapping
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFShadowMap
$('#app').appendChild(renderer.domElement)

const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(68, innerWidth / innerHeight, 0.1, 2600)
scene.fog = new THREE.FogExp2(0xb9cbd9, 0.0013)

// ------------------------------------------------------------------ materials
const mat = (o) => {
  const { tex, rep = 1, noShadow, ...rest } = o
  if (tex) { tex.repeat.set(...(Array.isArray(rep) ? rep : [rep, rep])); rest.map = tex }
  const m = new THREE.MeshStandardMaterial({ roughness: 0.9, ...rest })
  if (noShadow) m.userData.noShadow = true
  return m
}
// foliage: alpha-to-coverage gives soft, anti-aliased leaf edges (needs the MSAA target below)
const leaf = (tex, o = {}) => {
  tex.generateMipmaps = false; tex.minFilter = THREE.LinearFilter // mipmapped alpha thins leaves into haze
  const m = mat({ tex, alphaTest: 0.4, alphaToCoverage: true, side: THREE.DoubleSide, roughness: 0.97, ...o }); m.userData.foliage = true; return m }
const materials = {
  // building fabric (colours matched to photos/buildings/001 + 002)
  wall: mat({ tex: T.renderTex('#e2bb4f', 1), rep: 1 / 5 }),          // yellow gallery walls + pilasters
  render: mat({ tex: T.renderTex('#dcc898', 4), rep: 1 / 5 }),        // beige end / back walls
  trim: mat({ tex: T.renderTex('#f1ead8', 7), rep: 1 / 5 }),          // white-painted beams + soffits
  parapet: mat({ tex: T.parapetTex(), rep: [1, 1], roughness: 1 }),   // roughcast bands (band UVs)
  concrete: mat({ tex: T.concreteTex(), rep: 1 / 4, roughness: 0.95 }),
  stairs: mat({ tex: T.concreteTex(8), rep: 1 / 3, color: 0xe6e0d2 }),
  curb: mat({ tex: T.concreteTex(11), rep: 1 / 2, color: 0xb9b3a4, roughness: 1 }),
  dado: mat({ tex: T.concreteTex(13), rep: 1 / 3, color: 0x6a7076, roughness: 0.85 }),
  stone: mat({ tex: T.stoneTex(), rep: 1 / 2.4 }),
  roof: mat({ tex: T.roofTex(), rep: 1 / 2.5, roughness: 0.5, metalness: 0.5 }),
  window: mat({ tex: T.windowTex(), roughness: 0.25, metalness: 0.35, noShadow: true }),
  door: mat({ tex: T.doorTex(), roughness: 0.7, noShadow: true }),
  panel: mat({ color: 0xb8683c, roughness: 0.8, noShadow: true }),
  poster: mat({ tex: T.posterTex(), roughness: 0.45, noShadow: true }),
  plate: mat({ tex: T.plateTex(), roughness: 0.4, noShadow: true }),
  fixture: mat({ color: 0xdedbd0, roughness: 0.5, noShadow: true }),
  fixtureSlot: mat({ color: 0x8f9290, emissive: 0xfff6e0, emissiveIntensity: 0, noShadow: true }),
  ceramic: mat({ color: 0xf2f2ee, roughness: 0.25 }),
  // ground
  dirt: mat({ tex: T.dirtTex(), rep: 1 / 9 }),
  grass: mat({ tex: T.grassTex(), rep: 1 / 2.5, color: 0xc4b48c }),
  paving: mat({ tex: T.pavingTex(), rep: 1 / 3, roughness: 0.95, color: 0xcbc8c0 }),
  road: mat({ tex: T.concreteTex(5), rep: 1 / 6, color: 0x8d8984, roughness: 0.97 }),
  // vegetation
  bark: mat({ tex: T.barkTex(), rep: 1 }),
  palmBark: mat({ tex: T.palmBarkTex(), rep: 1 }),
  leaf: leaf(T.leafTex('green', 12)),
  leafDry: leaf(T.leafTex('dry', 14)),
  leafRed: leaf(T.leafTex('red', 15)),
  leafPurple: leaf(purpleLeaf()),
  frond: leaf(T.frondTex()),
  needle: leaf(T.frondTex(), { color: 0x6f8f60 }),
  // furniture
  metal: mat({ color: 0x7f9482, roughness: 0.55, metalness: 0.35 }),
  post: mat({ color: 0x4d5852, roughness: 0.6, metalness: 0.4 }),
  globe: mat({ color: 0xf6f1e4, emissive: 0xffe9c0, emissiveIntensity: 0.05, roughness: 0.25, noShadow: true }),
  board: mat({ tex: T.boardTex(), roughness: 0.6 }),
  roofGreen: mat({ color: 0x4d7356, roughness: 0.5, metalness: 0.5, side: THREE.DoubleSide }),
  tent: mat({ color: 0xdcc594, roughness: 0.85, side: THREE.DoubleSide }),
  chair: mat({ color: 0x2f8a5c, roughness: 0.6 }),
  wood: mat({ color: 0x8a6a46, roughness: 0.9 }),
  kiosk: mat({ color: 0x8fd0c4, roughness: 0.8 }),
}
function purpleLeaf() { // jacaranda: recolour most leaflets of the green clump to lilac blossom
  const t = T.leafTex('green', 16), c = t.image, g = c.getContext('2d')
  const d = g.getImageData(0, 0, c.width, c.height), p = d.data
  for (let i = 0; i < p.length; i += 4) {
    if (!p[i + 3] || p[i] > p[i + 1]) continue // keep twigs brown
    if (((i * 2654435761) >>> 0) % 100 < 78) { const l = p[i + 1]; p[i] = l * 1.45 + 40; p[i + 1] = l * 0.85 + 10; p[i + 2] = l * 1.9 + 50 }
  }
  g.putImageData(d, 0, 0); t.needsUpdate = true
  return t
}
const maxAniso = renderer.capabilities.getMaxAnisotropy()
for (const m of Object.values(materials)) if (m.map) m.map.anisotropy = maxAniso

// ------------------------------------------------------------------ build the site
const { builder, places } = buildSite()
const site = builder.build(materials)
scene.add(site)
const colliderGeo = builder.colliderGeometry()
colliderGeo.boundsTree = new MeshBVH(colliderGeo)
const noAO = site.children.filter((m) => m.material.userData.foliage) // leaf cards must not occlude as solid quads

// ------------------------------------------------------------------ sky, clouds, far hills
const sky = new Sky()
sky.scale.setScalar(4800)
scene.add(sky)
const su = sky.material.uniforms
su.turbidity.value = 2.2; su.rayleigh.value = 1.15; su.mieCoefficient.value = 0.0035; su.mieDirectionalG.value = 0.82

const cloudMat = new THREE.MeshBasicMaterial({ map: T.cloudTex(), transparent: true, depthWrite: false, fog: false, side: THREE.BackSide })
const clouds = new THREE.Mesh(new THREE.SphereGeometry(2300, 48, 16, 0, Math.PI * 2, 0, Math.PI / 2), cloudMat)
clouds.renderOrder = 1; clouds.position.y = -40
scene.add(clouds)

// two rings of hazy hills hide the edge of the ground plane (Adama sits in the Rift Valley)
const hillMats = []
function hillRing(radius, base, amp, seed, shade) {
  const N = 220, pos = [], idx = []
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * Math.PI * 2
    const h = base + amp * (0.5 + 0.5 * Math.sin(a * 3 + seed)) * (0.6 + 0.4 * Math.sin(a * 7.3 + seed * 2)) + amp * 0.25 * Math.sin(a * 17 + seed * 5) + amp * 0.1 * Math.sin(a * 41 + seed)
    pos.push(Math.cos(a) * radius, -6, Math.sin(a) * radius, Math.cos(a) * radius, Math.max(4, h), Math.sin(a) * radius)
    if (i < N) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx)
  const m = new THREE.MeshBasicMaterial({ fog: false, side: THREE.DoubleSide })
  m.userData.shade = shade; hillMats.push(m)
  const mesh = new THREE.Mesh(g, m); mesh.renderOrder = 2
  scene.add(mesh)
  return mesh
}
const hills = [hillRing(1700, 20, 95, 1.3, 0.97), hillRing(1250, 8, 42, 4.1, 0.88)]
const skyOnly = [sky, clouds, ...hills]

// ------------------------------------------------------------------ lights
const sun = new THREE.DirectionalLight(0xfff0dc, 3.2)
sun.castShadow = true
sun.shadow.mapSize.set(4096, 4096)
const SC = sun.shadow.camera
const SH = 75 // half-size of the shadow box around the viewer (m)
SC.left = -SH; SC.right = SH; SC.top = SH; SC.bottom = -SH; SC.near = 1; SC.far = 420
sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.035
scene.add(sun, sun.target)
const hemi = new THREE.HemisphereLight(0xcfe0f5, 0x9c8562, 0.6)
scene.add(hemi)

const pmrem = new THREE.PMREMGenerator(renderer)
const envScene = new THREE.Scene()
const envSky = new Sky(); envSky.scale.setScalar(1000); envScene.add(envSky)
let envRT = null
const sunDir = new THREE.Vector3()
const fmtTime = (h) => `${String(Math.floor(h)).padStart(2, '0')}:${String(Math.floor((h % 1) * 60)).padStart(2, '0')}`

// hour 6..18.5 (Adama, ~8.5°N): the sun rises in the east and passes high to the south
function setTime(hour) {
  const t = (hour - 6) / 12
  const elev = Math.max(0.025, Math.sin(t * Math.PI)) * 76 // degrees; never fully below the horizon
  const az = 90 + t * 180 // east -> south -> west (compass degrees)
  const phi = THREE.MathUtils.degToRad(90 - elev), theta = THREE.MathUtils.degToRad(az)
  sunDir.set(Math.sin(phi) * Math.sin(theta), Math.cos(phi), -Math.sin(phi) * Math.cos(theta)) // x east, z south
  su.sunPosition.value.copy(sunDir)
  envSky.material.uniforms.sunPosition.value.copy(sunDir)
  for (const k of ['turbidity', 'rayleigh', 'mieCoefficient', 'mieDirectionalG']) envSky.material.uniforms[k].value = su[k].value

  const day = clamp(elev / 22, 0, 1) // 0 at the horizon, 1 once the sun is well up
  const dusk = 1 - clamp(elev / 9, 0, 1)
  sun.intensity = 0.05 + 4.2 * day
  sun.color.setHSL(0.085, 0.8 - day * 0.45, 0.62 + day * 0.31)
  hemi.intensity = 0.44 + 0.3 * dusk // twilight leans on a cool sky fill
  hemi.color.setHSL(0.61, 0.45 + 0.25 * dusk, 0.88 - 0.2 * dusk)
  renderer.toneMappingExposure = (0.9 + 0.25 * dusk) * +(params.get('exp') ?? 1)
  scene.fog.color.setHSL(0.58 + dusk * 0.08, 0.3 - dusk * 0.1, 0.3 + 0.46 * day)
  cloudMat.color.setHSL(0.08, dusk * 0.7, 0.5).multiplyScalar(1.1 + 2.3 * day)
  for (const m of hillMats) m.color.copy(scene.fog.color).multiplyScalar(m.userData.shade * (0.45 + 0.55 * day)).lerp(new THREE.Color(0x5f7a66), 0.1 * day)
  // lamps and corridor strip lights come on at dusk
  materials.globe.emissiveIntensity = 0.05 + dusk * 5
  materials.fixtureSlot.emissiveIntensity = dusk * 4
  lampLight.intensity = dusk * 0.35

  if (envRT) envRT.dispose()
  envRT = pmrem.fromScene(envScene)
  scene.environment = envRT.texture
  scene.environmentIntensity = +(params.get('env') ?? 0.16) * (1 - 0.7 * dusk)
  $('#timev').textContent = fmtTime(hour)
  $('#time').style.setProperty('--p', `${((hour - 6.3) / 12) * 100}%`)
}
// a soft warm fill standing in for all the globe lamps at night
const lampLight = new THREE.HemisphereLight(0xffd9a0, 0x6a5a40, 0)
scene.add(lampLight)

// ------------------------------------------------------------------ post-processing (MSAA + ambient occlusion)
const size = () => [Math.floor(innerWidth * PR), Math.floor(innerHeight * PR)]
const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(...size(), { samples: 4, type: THREE.HalfFloatType }))
composer.addPass(new RenderPass(scene, camera))
const gtao = new GTAOPass(scene, camera, innerWidth, innerHeight)
gtao.updateGtaoMaterial({ radius: 0.55, distanceExponent: 1.4, thickness: 1.2, scale: 1.1, samples: 16 })
gtao.blendIntensity = 0.9
{ // keep foliage and the sky out of the occlusion pass
  const hide = gtao._overrideVisibility.bind(gtao), show = gtao._restoreVisibility.bind(gtao)
  gtao._overrideVisibility = () => { hide(); for (const m of noAO) m.visible = false; for (const m of skyOnly) m.visible = false }
  gtao._restoreVisibility = () => { show(); for (const m of noAO) m.visible = true; for (const m of skyOnly) m.visible = true }
}
composer.addPass(gtao)
composer.addPass(new OutputPass())
let hq = params.get('q') !== 'low'

// ------------------------------------------------------------------ player (capsule vs BVH)
const player = { pos: new THREE.Vector3(), vel: new THREE.Vector3(), move: new THREE.Vector3(), onGround: false, radius: 0.35, seg: 1.0, bob: 0 }
const EYE = 0.28 // eye above the capsule's top sphere centre -> eye height ≈ 1.63 m
const look = new PointerLockControls(camera, renderer.domElement)
const orbit = new OrbitControls(camera, renderer.domElement)
orbit.enableDamping = true; orbit.dampingFactor = 0.08
orbit.maxPolarAngle = Math.PI * 0.49; orbit.minDistance = 6; orbit.maxDistance = 280
orbit.autoRotateSpeed = 0.35
orbit.enabled = false
orbit.addEventListener('start', () => { orbit.autoRotate = false })
let mode = 'orbit'

function placePlayer(x, y, z, yaw) {
  const w = toWorld(x, z)
  player.pos.set(w.x, y + player.radius + player.seg, w.z)
  player.vel.set(0, 0, 0); player.move.set(0, 0, 0)
  camera.position.copy(player.pos).y += EYE
  if (yaw != null) camera.rotation.set(0, yaw + SITE_ROT, 0, 'YXZ')
}

const keys = {}
addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLInputElement) return
  keys[e.code] = true
  if (e.code === 'Space' && mode === 'walk' && player.onGround) player.vel.y = 6.5
  if (e.code === 'KeyO') setMode(mode === 'orbit' ? 'walk' : 'orbit')
  if (e.code === 'KeyQ') setHQ(!hq)
  if (e.code === 'KeyH') document.body.classList.toggle('noui')
  if (e.code === 'KeyF') toggleFullscreen()
  if (e.code === 'KeyM') location.href = './'
})
addEventListener('keyup', (e) => { keys[e.code] = false })
addEventListener('blur', () => { for (const k in keys) keys[k] = false })

const tmpBox = new THREE.Box3(), tmpSeg = new THREE.Line3(), v1 = new THREE.Vector3(), v2 = new THREE.Vector3()
const fwd = new THREE.Vector3(), right = new THREE.Vector3(), want = new THREE.Vector3()
function stepPlayer(dt) {
  player.vel.y += player.onGround ? 0 : dt * -22
  player.pos.addScaledVector(player.vel, dt)
  // input, eased so starts and stops are not abrupt
  const speed = keys.ShiftLeft || keys.ShiftRight ? 7.5 : 3.6
  camera.getWorldDirection(fwd); fwd.y = 0; fwd.normalize()
  right.crossVectors(fwd, camera.up)
  want.set(0, 0, 0)
  if (keys.KeyW || keys.ArrowUp) want.add(fwd)
  if (keys.KeyS || keys.ArrowDown) want.sub(fwd)
  if (keys.KeyD || keys.ArrowRight) want.add(right)
  if (keys.KeyA || keys.ArrowLeft) want.sub(right)
  if (want.lengthSq()) want.normalize().multiplyScalar(speed)
  player.move.lerp(want, 1 - Math.exp(-14 * dt))
  player.pos.addScaledVector(player.move, dt)

  // collide the capsule with the world
  tmpSeg.start.copy(player.pos); tmpSeg.end.copy(player.pos).y -= player.seg
  tmpBox.makeEmpty(); tmpBox.expandByPoint(tmpSeg.start); tmpBox.expandByPoint(tmpSeg.end)
  tmpBox.min.addScalar(-player.radius); tmpBox.max.addScalar(player.radius)
  colliderGeo.boundsTree.shapecast({
    intersectsBounds: (b) => b.intersectsBox(tmpBox),
    intersectsTriangle: (tri) => {
      const d = tri.closestPointToSegment(tmpSeg, v1, v2)
      if (d < player.radius) {
        const depth = player.radius - d, dir = v2.sub(v1).normalize()
        tmpSeg.start.addScaledVector(dir, depth); tmpSeg.end.addScaledVector(dir, depth)
      }
    },
  })
  const delta = v1.subVectors(tmpSeg.start, player.pos)
  player.onGround = delta.y > Math.abs(dt * player.vel.y * 0.25)
  const off = Math.max(0, delta.length() - 1e-5)
  delta.normalize().multiplyScalar(off)
  player.pos.add(delta)
  if (!player.onGround) { delta.normalize(); player.vel.addScaledVector(delta, -delta.dot(player.vel)) } else player.vel.set(0, 0, 0)
  if (player.pos.y < -20) placePlayer(START.x, 0, START.z, START.yaw)
  // gentle head bob while walking
  const sp = player.move.length()
  if (player.onGround && sp > 0.5) player.bob += dt * sp * 1.9
  camera.position.copy(player.pos)
  camera.position.y += EYE + Math.sin(player.bob * 2) * 0.022 * Math.min(1, sp / 3.6)
}

function setMode(m, lock = true) {
  mode = m
  if (m === 'walk') {
    orbit.enabled = false; orbit.autoRotate = false
    camera.position.copy(player.pos).y += EYE
    if (lock) look.lock()
  } else {
    if (look.isLocked) look.unlock()
    orbit.enabled = true
    const p = toWorld(-4, 0)
    orbit.target.set(p.x, 5, p.z)
    if (camera.position.distanceTo(orbit.target) < 20 || camera.position.y < 8) camera.position.set(p.x - 58, 34, p.z + 62)
  }
  document.body.dataset.mode = m
}
look.addEventListener('unlock', () => { if (mode === 'walk') $('#pause').classList.remove('hidden') })
look.addEventListener('lock', () => $('#pause').classList.add('hidden'))

function setHQ(on) {
  hq = on
  $('#bHQ').classList.toggle('on', hq)
  toast(hq ? 'High quality: soft shadows + ambient occlusion' : 'Fast mode: effects off')
}
function toggleFullscreen() { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen() }

// ------------------------------------------------------------------ HUD
const TP = {
  court: { label: 'Walkway', sub: 'West entrance', icon: 'path', go: () => placePlayer(START.x, 0.1, START.z, START.yaw) },
  stair: { label: 'Stair tower', sub: 'North block', icon: 'stairs', go: () => placePlayer(15, 0.1, 0.6, 0.95) },
  gal: { label: 'Top corridor', sub: '3rd floor', icon: 'layers', go: () => placePlayer(-10, 0.45 + 3 * 3.4 + 0.05, -7, -Math.PI / 2) },
  cafe: { label: 'Café', sub: 'East side', icon: 'coffee', go: () => placePlayer(27.5, 0.1, 0.4, -2.3) },
  b510: { label: 'Block 510', sub: 'Inner court', icon: 'building', go: () => placePlayer(-46.5, 0.1, 0, Math.PI / 2) },
  stone: { label: 'Stone ends', sub: 'Round balconies', icon: 'wall', go: () => placePlayer(-37, 0.1, 5.5, -1.78) },
}
$('#hud').innerHTML = `
  <header>
    <a class="ib" href="./" title="Back to the 2D map (M)" aria-label="Back to the 2D map">${icon('back')}</a>
    <div class="tt"><b>Electrical Engineering blocks</b><span>ASTU academic core · 3D walk-through</span></div>
  </header>
  <div class="seg" role="tablist">
    <button id="bWalk" role="tab">${icon('walk')}<span>Walk</span></button>
    <button id="bOrbit" role="tab">${icon('orbit')}<span>Fly around</span></button>
  </div>
  <section>
    <h4><span>Time of day</span><output id="timev"></output></h4>
    <div class="time">${icon('sunrise')}<input id="time" type="range" min="6.3" max="18.3" step="0.05" value="${params.get('t') ?? 15.5}" aria-label="Time of day">${icon('moon')}</div>
  </section>
  <section>
    <h4><span>Go to</span></h4>
    <div class="places">${Object.entries(TP).map(([k, p]) => `<button data-tp="${k}">${icon(p.icon)}<span><b>${p.label}</b><i>${p.sub}</i></span></button>`).join('')}</div>
  </section>
  <footer>
    <button id="bHQ" class="tg ${hq ? 'on' : ''}" title="Toggle shadows and ambient occlusion (Q)">${icon('sparkle')}<span>High quality</span></button>
    <button id="bFS" class="ib" title="Fullscreen (F)" aria-label="Fullscreen">${icon('expand')}</button>
    <button id="bHide" class="ib" title="Hide the interface (H)" aria-label="Hide the interface">${icon('eyeoff')}</button>
  </footer>`
$('#where').innerHTML = `${icon('pin')}<span id="wname"></span><i id="wfloor"></i>`
$('#mini').innerHTML = `<img id="mapimg" alt=""><div id="me">${icon('arrow')}</div><span class="n">N</span><span class="sc"><i></i>50 m</span>`
$('#bWalk').onclick = () => setMode('walk')
$('#bOrbit').onclick = () => setMode('orbit')
$('#bHQ').onclick = () => setHQ(!hq)
$('#bFS').onclick = toggleFullscreen
$('#bHide').onclick = () => { document.body.classList.add('noui'); toast('Press H to show the interface again') }
$('#resume').onclick = () => setMode('walk')
$('#toOrbit').onclick = () => { $('#pause').classList.add('hidden'); setMode('orbit') }
const timeEl = $('#time')
timeEl.oninput = () => setTime(+timeEl.value)
document.querySelectorAll('[data-tp]').forEach((b) => (b.onclick = () => { TP[b.dataset.tp].go(); setMode('walk') }))

let toastT
function toast(msg) { const el = $('#toast'); el.textContent = msg; el.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), 2200) }

const FLOORS = ['Ground floor', '1st floor', '2nd floor', '3rd floor', 'Roof']
function whereAmI() {
  const c = Math.cos(SITE_ROT), s = Math.sin(SITE_ROT)
  const p = mode === 'walk' ? player.pos : orbit.target
  const x = p.x * c - p.z * s, z = p.x * s + p.z * c // world -> site
  let best = null, bd = 1e9
  for (const pl of places) { const d = Math.hypot(pl.x - x, pl.z - z); if (d < pl.r && d < bd) { bd = d; best = pl } }
  $('#wname').textContent = best ? best.name : 'Academic core'
  const fl = mode === 'walk' ? clamp(Math.round((player.pos.y - 1.35 - 0.45) / 3.4), 0, 4) : -1
  const el = $('#wfloor'); el.textContent = fl >= 0 ? FLOORS[fl] : 'Aerial view'
}

// ------------------------------------------------------------------ minimap: one top-down render of the real scene
const MAP = { half: 92, c: toWorld(-22, 0) }
function makeMinimap() {
  const S = 420
  const cam = new THREE.OrthographicCamera(-MAP.half, MAP.half, MAP.half, -MAP.half, 1, 600)
  cam.position.set(MAP.c.x, 300, MAP.c.z); cam.up.set(0, 0, -1); cam.lookAt(MAP.c.x, 0, MAP.c.z)
  const fog = scene.fog; scene.fog = null
  for (const k of ['left', 'bottom']) SC[k] = -120
  for (const k of ['right', 'top']) SC[k] = 120
  SC.updateProjectionMatrix()
  sun.target.position.set(MAP.c.x, 0, MAP.c.z); sun.position.copy(sun.target.position).addScaledVector(sunDir, 200)
  sun.target.updateMatrixWorld()
  renderer.setPixelRatio(1); renderer.setSize(S, S, false)
  renderer.render(scene, cam)
  $('#mapimg').src = renderer.domElement.toDataURL('image/jpeg', 0.92)
  renderer.setPixelRatio(PR); renderer.setSize(innerWidth, innerHeight)
  SC.left = -SH; SC.right = SH; SC.top = SH; SC.bottom = -SH; SC.updateProjectionMatrix()
  scene.fog = fog
}
const meEl = $('#me')
function updateMinimap() {
  const p = mode === 'walk' ? player.pos : camera.position
  const u = clamp((p.x - MAP.c.x + MAP.half) / (2 * MAP.half), 0.03, 0.97), v = clamp((p.z - MAP.c.z + MAP.half) / (2 * MAP.half), 0.03, 0.97)
  camera.getWorldDirection(fwd)
  meEl.style.transform = `translate(-50%, -50%) rotate(${Math.atan2(fwd.x, -fwd.z)}rad)`
  meEl.style.left = `${u * 100}%`; meEl.style.top = `${v * 100}%`
}

// ------------------------------------------------------------------ loop
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight); composer.setSize(innerWidth, innerHeight)
})

const timer = new THREE.Timer()
let frame = 0
function loop(ts) {
  timer.update(ts)
  const dt = Math.min(timer.getDelta(), 0.05)
  if (mode === 'walk') for (let i = 0; i < 5; i++) stepPlayer(dt / 5)
  else orbit.update()
  clouds.rotation.y += dt * 0.0012 // clouds drift slowly
  // the shadow box follows the viewer, snapped to shadow texels so edges do not shimmer
  const focus = mode === 'walk' ? player.pos : orbit.target
  const texel = (2 * SH) / 4096
  const fx = Math.round(focus.x / texel) * texel, fz = Math.round(focus.z / texel) * texel
  sun.target.position.set(fx, 0, fz)
  sun.position.set(fx + sunDir.x * 200, sunDir.y * 200, fz + sunDir.z * 200)
  renderer.shadowMap.enabled = hq
  if (hq) composer.render(); else renderer.render(scene, camera)
  updateMinimap()
  if (++frame % 12 === 0) whereAmI()
  requestAnimationFrame(loop)
}

placePlayer(START.x, 0.1, START.z, START.yaw)
setTime(13) // the minimap is always drawn in midday light
makeMinimap()
setTime(+timeEl.value)

// URL hooks: ?cam=x,y,z,tx,ty,tz  ?start=walk  ?tp=<place>  ?ui=0  ?t=<hour>  ?q=low
const v = params.get('cam')
if (v) {
  const n = v.split(',').map(Number)
  mode = 'orbit'; orbit.enabled = true; camera.position.set(n[0], n[1], n[2]); orbit.target.set(n[3], n[4], n[5]); document.body.dataset.mode = 'orbit'
} else if (params.get('start') === 'walk') setMode('walk', false)
else { setMode('orbit'); orbit.autoRotate = !params.has('shot') }
const tp = params.get('tp'); if (tp && TP[tp]) { TP[tp].go(); setMode('walk', false) }
if (params.get('ui') === '0') document.body.classList.add('noui')
whereAmI()
$('#loading').classList.add('done')
setTimeout(() => $('#loading').remove(), 600)
requestAnimationFrame(loop)
