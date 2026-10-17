
/* ===== renderer, camera, stadium ===== */
let cv = $('#cv');
let renderer = null;
const DEV_DPR = window.devicePixelRatio || 1;
const MOBILE = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (window.matchMedia && matchMedia('(pointer: coarse)').matches);
let LITE = false;
try { LITE = localStorage.getItem('yakyu-lite') === '1'; } catch (e) {}
// try progressively simpler GL settings; a failed attempt can poison a canvas, so each try gets a fresh one
[{ antialias: !MOBILE && DEV_DPR < 2, powerPreference: 'high-performance' }, { antialias: false }, { antialias: false, precision: 'mediump', depth: true, stencil: false }].some(opts => {
  try { renderer = new THREE.WebGLRenderer(Object.assign({ canvas: cv }, opts)); } catch (e) { renderer = null; }
  if (renderer) return true;
  const c = document.createElement('canvas'); c.id = 'cv'; cv.replaceWith(c); cv = c;
  return false;
});
if (!renderer) {
  $('#ot').textContent = '3D描画を開始できません';
  $('#od').textContent = 'この画面で3D描画が一時的に使えない状態です。アプリを完全に終了してから開き直すか、Chromeで開いてください。';
  $('#goBtn').hidden = true;
  return;
}
renderer.setPixelRatio(Math.min(DEV_DPR, MOBILE ? 1.25 : 1.5));
cv.addEventListener('webglcontextlost', e => {
  e.preventDefault();
  $('#ot').textContent = '描画が止まりました';
  $('#od').textContent = '端末の描画メモリが足りなくなったようです。再読み込みすると軽い設定で始まります。';
  $('#goBtn').textContent = '再読み込み';
  $('#goBtn').onclick = () => { try { localStorage.setItem('yakyu-lite', '1'); } catch (err) {} location.reload(); };
  $('#overlay').hidden = false;
});
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
if (LITE) renderer.setPixelRatio(1);
// phones start without real-time shadows: that is the most GPU-hungry part of the scene
const SHADOWS = !LITE && !MOBILE;
renderer.shadowMap.enabled = SHADOWS;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color('#050b13');
scene.fog = new THREE.Fog('#0b1626', 160, 440);
const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1200);
const CAM_HOME = V(0, 1.45, 3.4);
let W = 1, H = 1, homeFov = 45, homePitch = -0.09, camFov = 45;
const camPos = CAM_HOME.clone(), camLook = V(0, 1, -10);

function homeLook() { return V(0, CAM_HOME.y + Math.sin(homePitch) * 10, CAM_HOME.z - Math.cos(homePitch) * 10); }
function resize() {
  const r = $('#stage').getBoundingClientRect();
  W = Math.max(1, r.width); H = Math.max(1, r.height);
  renderer.setSize(W, H, false);
  const asp = W / H;
  camera.aspect = asp;
  // keep about 1m either side of the plate in view so the batter stays on screen in portrait
  homeFov = clamp(2 * Math.atan(0.25 / asp) / D2R, 40, 62);
  const half = homeFov / 2 * D2R;
  homePitch = Math.atan2(ZY0 - CAM_HOME.y, CAM_HOME.z) + Math.atan(0.22 * Math.tan(half));
  if (!play) { camFov = homeFov; camPos.copy(CAM_HOME); camLook.copy(homeLook()); }
  camera.fov = camFov; camera.updateProjectionMatrix();
}

/* ---- materials & textures ---- */
const mat = (color, o) => new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.85, metalness: 0 }, o || {}));
function canvasTex(w, h, draw, rep) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.encoding = THREE.sRGBEncoding;
  t.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); }
  return t;
}
function speckle(g, w, h, n, cols, size) {
  for (let i = 0; i < n; i++) {
    g.fillStyle = cols[i % cols.length]; g.globalAlpha = 0.25 + Math.random() * 0.35;
    const s = size * (0.5 + Math.random());
    g.fillRect(Math.random() * w, Math.random() * h, s, s);
  }
  g.globalAlpha = 1;
}
const grassDraw = (g, w, h) => {
  g.fillStyle = '#2c6338'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#367343'; g.fillRect(0, 0, w / 2, h);
  speckle(g, w, h, 5000, ['#235230', '#43824d', '#2a5d35'], 2);
};
const grassTex = canvasTex(256, 256, grassDraw, [36, 36]);
grassTex.center.set(0.5, 0.5); grassTex.rotation = Math.PI / 4;
const igrassTex = canvasTex(256, 256, grassDraw, [2, 2]);
const dirtDraw = (g, w, h) => { g.fillStyle = '#8a5b3b'; g.fillRect(0, 0, w, h); speckle(g, w, h, 6000, ['#6c4428', '#a06d48', '#7b4f32', '#b17d56'], 2); };
const dirtTex = canvasTex(256, 256, dirtDraw, [10, 10]);
const dirtTexS = canvasTex(256, 256, dirtDraw, [2, 2]);
// ground layers are drawn on top of each other; polygon offset keeps them from flickering at a distance
const layer = n => ({ polygonOffset: true, polygonOffsetFactor: -n, polygonOffsetUnits: -n * 4 });
const GRASS = mat('#ffffff', { map: grassTex }), IGRASS = mat('#ffffff', Object.assign({ map: igrassTex }, layer(2)));
const DIRT = mat('#ffffff', Object.assign({ map: dirtTex }, layer(1))), DIRTS = mat('#ffffff', Object.assign({ map: dirtTexS }, layer(3)));
const WHITE = mat('#f2f0e6', Object.assign({ roughness: 0.6 }, layer(4)));

function flat(geo, m, x, y, z) { geo.rotateX(-Math.PI / 2); const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.receiveShadow = true; scene.add(o); return o; }
function strip(x1, z1, x2, z2, w, y) {
  const dx = x2 - x1, dz = z2 - z1, L = Math.hypot(dx, dz);
  const o = flat(new THREE.PlaneGeometry(1, 1), WHITE, (x1 + x2) / 2, y || 0.04, (z1 + z2) / 2);
  o.scale.set(L, 1, w); o.rotation.y = Math.atan2(-dz, dx);
  return o;
}

/* ---- field ---- */
flat(new THREE.PlaneGeometry(700, 700), GRASS, 0, 0, -60);
flat(new THREE.CircleGeometry(29, 80), DIRT, 0, 0.01, RUBBER_Z);
const ig = flat(new THREE.PlaneGeometry(25.6, 25.6), IGRASS, 0, 0.02, -19.4);
ig.rotation.y = Math.PI / 4;
flat(new THREE.CircleGeometry(4, 48), DIRTS, 0, 0.03, 0.2);
[[19.4, -19.4], [0, -38.8], [-19.4, -19.4]].forEach(b => flat(new THREE.CircleGeometry(2.8, 32), DIRTS, b[0], 0.03, b[1]));
const mound = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 2.74, MOUND_Y, 48), DIRTS);
mound.position.set(0, MOUND_Y / 2, RUBBER_Z); mound.receiveShadow = true; scene.add(mound);
const rubber = new THREE.Mesh(new THREE.BoxGeometry(0.61, 0.04, 0.15), WHITE);
rubber.position.set(0, MOUND_Y + 0.01, RUBBER_Z); scene.add(rubber);
const plateShape = new THREE.Shape([[-0.216, 0], [0.216, 0], [0.216, -0.216], [0, -0.432], [-0.216, -0.216]].map(p => new THREE.Vector2(p[0], p[1])));
flat(new THREE.ShapeGeometry(plateShape), WHITE, 0, 0.045, 0);
[[19.4, -19.4], [0, -38.8], [-19.4, -19.4]].forEach(b => {
  const o = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.08, 0.38), WHITE);
  o.position.set(b[0], 0.04, b[1]); o.rotation.y = Math.PI / 4; o.castShadow = true; scene.add(o);
});
strip(0.216, 0, 72, -72, 0.08); strip(-0.216, 0, -72, -72, 0.08);
[-1, 1].forEach(s => {
  const xi = 0.366 * s, xo = 1.586 * s, z0 = -0.7, z1 = 1.13;
  strip(xi, z0, xo, z0, 0.06); strip(xi, z1, xo, z1, 0.06);
  strip(xi, z0, xi, z1, 0.06); strip(xo, z0, xo, z1, 0.06);
});

/* ---- strike zone frame ---- */
const zoneLines = [];
(() => {
  const x0 = -ZW, x1 = ZW, y0 = ZY0 - ZH, y1 = ZY0 + ZH, z = 0.002;
  const outer = [x0, y0, z, x1, y0, z, x1, y0, z, x1, y1, z, x1, y1, z, x0, y1, z, x0, y1, z, x0, y0, z];
  const inner = [];
  for (let i = 1; i < 3; i++) {
    const x = x0 + (x1 - x0) * i / 3, y = y0 + (y1 - y0) * i / 3;
    inner.push(x, y0, z, x, y1, z, x0, y, z, x1, y, z);
  }
  const mk = (arr, op) => {
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
    const l = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: '#eef0e4', transparent: true, opacity: op, depthWrite: false, fog: false }));
    scene.add(l); return l;
  };
  zoneLines.push(mk(outer, 0.5), mk(inner, 0.16));
})();

/* ---- fence, track, poles, stands ---- */
const FC = V(0, 0, -47.6), FR = 74.4, TH0 = 108 * D2R, THL = 144 * D2R;
function fenceDist(hx, hz) { // distance from home to the fence along a horizontal direction
  const b = hx * FC.x + hz * FC.z, c = FC.lengthSq() - FR * FR;
  return b + Math.sqrt(b * b - c);
}
const adTex = canvasTex(1024, 32, (g, w, h) => {
  const cols = ['#123d31', '#1b2b44', '#3d2a1d', '#24391b', '#33233c', '#14324a'];
  for (let i = 0; i < 16; i++) {
    const x = i * w / 16;
    g.fillStyle = cols[i % cols.length]; g.fillRect(x, 0, w / 16, h);
    g.fillStyle = 'rgba(244,201,90,.55)'; g.fillRect(x + 9, h * 0.44, w / 16 - 18, h * 0.14);
    g.fillStyle = 'rgba(238,240,228,.35)'; g.fillRect(x + 15, h * 0.22, w / 16 * 0.35, h * 0.1);
  }
  g.fillStyle = '#0a1712'; g.fillRect(0, h - 3, w, 3);
});
const fence = new THREE.Mesh(new THREE.CylinderGeometry(FR, FR, 3.2, 60, 1, true, TH0, THL),
  mat('#ffffff', { map: adTex, side: THREE.DoubleSide, emissive: '#ffffff', emissiveMap: adTex, emissiveIntensity: 0.3 }));
fence.position.set(FC.x, 1.6, FC.z); scene.add(fence);
const fenceTop = new THREE.Mesh(new THREE.CylinderGeometry(FR + 0.03, FR + 0.03, 0.14, 120, 1, true, TH0, THL), new THREE.MeshBasicMaterial({ color: '#f4c95a', side: THREE.DoubleSide }));
fenceTop.position.set(FC.x, 3.25, FC.z); scene.add(fenceTop);
flat(new THREE.RingGeometry(FR - 4.5, FR, 120, 1, 18 * D2R, 144 * D2R), DIRT, FC.x, 0.012, FC.z);
flat(new THREE.RingGeometry(FR, FR + 5, 120, 1, -20 * D2R, 220 * D2R), mat('#1a2420'), FC.x, 0.015, FC.z);
[1, -1].forEach(s => {
  const p = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 24, 10), new THREE.MeshBasicMaterial({ color: '#f4c95a' }));
  p.position.set(FC.x + Math.sin(TH0) * FR * s, 12, FC.z + Math.cos(TH0) * FR); scene.add(p);
});
const CROWD = ['#c9c2b0', '#3c5a8a', '#8a3b32', '#d9c27a', '#e8e4da', '#2f6b4f', '#5a4a6a', '#b46a3c', '#202830', '#7a8a9a', '#c8452c'];
const crowdTex = canvasTex(1024, 256, (g, w, h) => {
  g.fillStyle = '#121a20'; g.fillRect(0, 0, w, h);
  const rows = 20;
  for (let r = 0; r < rows; r++) {
    const y = r * h / rows;
    g.fillStyle = r % 2 ? '#0f161b' : '#172027'; g.fillRect(0, y, w, h / rows);
    for (let i = 0; i < 200; i++) {
      if (Math.random() < 0.12) continue;
      const x = (i + (r % 2) * 0.5) * w / 200 + Math.random();
      g.fillStyle = CROWD[(Math.random() * CROWD.length) | 0];
      g.fillRect(x, y + h / rows * 0.3, 3, 4);
    }
  }
}, [3, 1]);
const stands = new THREE.Mesh(new THREE.CylinderGeometry(FR + 52, FR + 5, 30, 64, 1, true, 68 * D2R, 224 * D2R),
  mat('#ffffff', { map: crowdTex, side: THREE.DoubleSide, emissive: '#ffffff', emissiveMap: crowdTex, emissiveIntensity: 0.35 }));
stands.position.set(FC.x, 3.2 + 15, FC.z); scene.add(stands);
// batter's eye: a plain dark screen behind center field so the pitch stands out against it instead of the crowd
const bEye = new THREE.Mesh(new THREE.CylinderGeometry(FR + 51.4, FR + 4.4, 30, 8, 1, true, 166 * D2R, 28 * D2R),
  new THREE.MeshBasicMaterial({ color: '#0b1914', side: THREE.DoubleSide }));
bEye.position.copy(stands.position); scene.add(bEye);

/* ---- lights ---- */
const hemi = new THREE.HemisphereLight('#a9bde0', '#1c2a20', 0.6); scene.add(hemi);
const key = new THREE.DirectionalLight('#fff1d6', 1.55);
key.position.set(18, 40, 26); key.target.position.set(0, 0, -9);
key.castShadow = SHADOWS; key.shadow.mapSize.set(1024, 1024);
Object.assign(key.shadow.camera, { left: -16, right: 16, top: 22, bottom: -22, near: 5, far: 130 });
key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02;
scene.add(key, key.target);
const fill = new THREE.DirectionalLight('#c9dbff', 0.5); fill.position.set(-30, 30, -60); scene.add(fill);
const rim = new THREE.DirectionalLight('#ffe7b0', 0.45); rim.position.set(25, 25, -80); scene.add(rim);
const glowTex = canvasTex(128, 128, (g) => {
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,246,214,1)'); gr.addColorStop(0.2, 'rgba(255,236,180,.5)'); gr.addColorStop(1, 'rgba(255,236,180,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
});
const towerSp = [];
[96, 138, 222, 264].forEach(deg => {
  const a = deg * D2R, r = FR + 58, x = FC.x + Math.sin(a) * r, z = FC.z + Math.cos(a) * r;
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.9, 48, 8), mat('#1a1f24'));
  pole.position.set(x, 24, z); scene.add(pole);
  const panel = new THREE.Mesh(new THREE.BoxGeometry(12, 6, 0.6), new THREE.MeshBasicMaterial({ color: '#fff6d6' }));
  panel.position.set(x, 50, z); panel.lookAt(0, 0, -20); scene.add(panel);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false }));
  sp.scale.set(80, 80, 1); sp.position.set(x, 50, z); scene.add(sp); towerSp.push(sp);
});
(() => {
  const n = 500, p = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, e = 0.12 + Math.random() * 1.2, r = 600;
    p[i * 3] = Math.cos(a) * Math.cos(e) * r; p[i * 3 + 1] = Math.sin(e) * r; p[i * 3 + 2] = Math.sin(a) * Math.cos(e) * r;
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: '#cfd8e6', size: 1.4, sizeAttenuation: false, transparent: true, opacity: 0.6, fog: false })));
})();

/* ---- 演出：花火・観客のウェーブ・照明の明滅（すべて軽い：Points 1個とメッシュ1枚） ---- */
const waveTex = canvasTex(512, 8, (g, w, h) => {
  const gr = g.createLinearGradient(0, 0, w, 0);
  gr.addColorStop(0, 'rgba(255,240,200,0)'); gr.addColorStop(0.44, 'rgba(255,240,200,0)'); gr.addColorStop(0.5, 'rgba(255,240,200,1)');
  gr.addColorStop(0.56, 'rgba(255,240,200,0)'); gr.addColorStop(1, 'rgba(255,240,200,0)');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
});
waveTex.wrapS = THREE.RepeatWrapping; waveTex.repeat.set(1.5, 1);
const waveMat = new THREE.MeshBasicMaterial({ map: waveTex, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
const waveMesh = new THREE.Group();   // two pieces: leaves the batter's eye (166°-194°) dark so pitches stay easy to see
[[68, 98], [194, 98]].forEach(([a, l]) => waveMesh.add(new THREE.Mesh(new THREE.CylinderGeometry(FR + 51.6, FR + 4.6, 29, 32, 1, true, a * D2R, l * D2R), waveMat)));
waveMesh.position.copy(stands.position); waveMesh.visible = false; scene.add(waveMesh);
let waveUntil = 0;
function crowdWave(sec) { waveUntil = Math.max(waveUntil, now_() + sec); }

const FW_N = 480, fwPos = new Float32Array(FW_N * 3), fwCol = new Float32Array(FW_N * 3), fwVel = new Float32Array(FW_N * 3), fwBase = new Float32Array(FW_N * 3), fwT = new Float32Array(FW_N).fill(-1);
const fwGeo = new THREE.BufferGeometry();
fwGeo.setAttribute('position', new THREE.BufferAttribute(fwPos, 3)); fwGeo.setAttribute('color', new THREE.BufferAttribute(fwCol, 3));
const fwPts = new THREE.Points(fwGeo, new THREE.PointsMaterial({ size: 1.3, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
fwPts.frustumCulled = false; fwPts.visible = false; scene.add(fwPts);
const FW_COL = [[1, .8, .3], [1, .35, .3], [.4, .8, 1], [.6, 1, .5], [1, .5, .9], [1, 1, .9]];
let fwNext = 0, fwQueue = [], flashUntil = 0;
function fwBurst(at) {
  const c = FW_COL[(Math.random() * FW_COL.length) | 0], cx = rnd(-24, 24), cy = rnd(16, 26), cz = rnd(-112, -100), sp = rnd(38, 48);   // 観客席の前（打者目線の画面に入る高さ）
  for (let k = 0; k < 90; k++) {
    const i = fwNext; fwNext = (fwNext + 1) % FW_N;
    const u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, r = Math.sqrt(1 - u * u), v = sp * (0.75 + Math.random() * 0.25);
    fwVel.set([Math.cos(a) * r * v, u * v, Math.sin(a) * r * v], i * 3);
    fwPos.set([cx, cy, cz], i * 3); fwBase.set(c, i * 3); fwT[i] = at;
  }
}
/* ホームラン・勝利：at（秒）から n 発の花火、観客のウェーブ、照明のフラッシュ */
function celebrate(at, n) {
  for (let i = 0; i < n; i++) fwQueue.push(at + i * 0.45 + Math.random() * 0.2);
  waveUntil = Math.max(waveUntil, at + 5); flashUntil = Math.max(flashUntil, at + 1.6);
}
let lightK = 1, darkCss = false;
function updateShow(now, dt) {
  fwQueue = fwQueue.filter(t => { if (now >= t) { fwBurst(t); sfx.pop && sfx.pop(); return false; } return true; });
  let live = 0;
  for (let i = 0; i < FW_N; i++) {
    const t0 = fwT[i]; if (t0 < 0) continue;
    const age = now - t0;
    if (age < 0) { fwCol[i * 3] = fwCol[i * 3 + 1] = fwCol[i * 3 + 2] = 0; live++; continue; }
    if (age > 2.4) { fwT[i] = -1; fwCol[i * 3] = fwCol[i * 3 + 1] = fwCol[i * 3 + 2] = 0; continue; }
    live++;
    const drag = Math.exp(-1.6 * age), b = i * 3;
    const f = Math.max(0, 1 - age / 2.4) * (age < 0.08 ? 1.6 : 1);
    fwCol[b] = fwBase[b] * f; fwCol[b + 1] = fwBase[b + 1] * f; fwCol[b + 2] = fwBase[b + 2] * f;
    fwPos[b] += fwVel[b] * drag * dt; fwPos[b + 1] += (fwVel[b + 1] * drag - 4.5 * age) * dt; fwPos[b + 2] += fwVel[b + 2] * drag * dt;
  }
  fwPts.visible = live > 0;
  if (live) { fwGeo.attributes.position.needsUpdate = true; fwGeo.attributes.color.needsUpdate = true; }
  // crowd wave: a bright band sweeping around the stands
  const wv = now < waveUntil;
  waveMesh.visible = wv || waveMat.opacity > 0.01;
  waveMat.opacity += ((wv ? 0.8 : 0) - waveMat.opacity) * Math.min(1, dt * 4);
  if (waveMesh.visible) waveTex.offset.x = (waveTex.offset.x - dt * 0.35) % 1;
  // lights: flash on a celebration, dim during the lights-out happening
  const dark = darkActive();
  if (dark !== darkCss) { darkCss = dark; $('#stage').classList.toggle('dark', dark); }
  const target = dark ? 0.32 : 1;
  lightK += (target - lightK) * Math.min(1, dt * (dark ? 6 : 2.5));
  const fl = now < flashUntil ? 0.5 + 0.5 * Math.abs(Math.sin(now * 14)) : 1;
  key.intensity = 1.55 * lightK; hemi.intensity = 0.6 * (0.45 + 0.55 * lightK); fill.intensity = 0.5 * lightK; rim.intensity = 0.45 * lightK;
  towerSp.forEach(s => { s.material.opacity = (dark ? 0.08 : 1) * fl; });
}
function darkActive() {
  if (!G || !G.hap || G.hap.t !== 'dark' || G.hap.inn !== G.inning) return false;
  return G.hap.left > 0 || !!(ball && ball.dk);
}

/* ---- ball, trails, markers ---- */
const ballTex = canvasTex(256, 128, (g, w, h) => {
  g.fillStyle = '#f4f1e6'; g.fillRect(0, 0, w, h);
  const yAt = x => h / 2 + Math.sin(x / w * Math.PI * 4) * h * 0.28;
  g.strokeStyle = '#c8372d'; g.lineWidth = 2.5; g.beginPath();
  for (let x = 0; x <= w; x += 2) { const y = yAt(x); x ? g.lineTo(x, y) : g.moveTo(x, y); }
  g.stroke(); g.lineWidth = 1.4;
  for (let x = 0; x < w; x += 5) { const y = yAt(x); g.beginPath(); g.moveTo(x - 2, y - 4); g.lineTo(x + 2, y + 4); g.stroke(); }
});
const BALL_R = 0.037 * 1.35;
const ballMesh = new THREE.Mesh(new THREE.SphereGeometry(BALL_R, 16, 12), mat('#ffffff', { map: ballTex, roughness: 0.5 }));
ballMesh.castShadow = SHADOWS; scene.add(ballMesh);
// soft halo so the ball reads against the field and the stands on a small screen
const ballGlowTex = canvasTex(64, 64, (g, w, h) => {
  const r = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
  r.addColorStop(0, 'rgba(255,255,240,1)'); r.addColorStop(0.35, 'rgba(255,250,220,.45)'); r.addColorStop(1, 'rgba(255,250,220,0)');
  g.fillStyle = r; g.fillRect(0, 0, w, h);
});
const ballGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: ballGlowTex, color: '#ffffff', transparent: true, opacity: 0.75, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
ballGlow.scale.setScalar(BALL_R * 6); ballMesh.add(ballGlow);
const trailPts = [];
const trail = [];
const trailGeo = new THREE.SphereGeometry(BALL_R, 10, 6);
for (let i = 0; i < 14; i++) {
  const m = new THREE.Mesh(trailGeo, new THREE.MeshBasicMaterial({ color: '#eef0e4', transparent: true, opacity: 0, depthWrite: false }));
  m.visible = false; scene.add(m); trail.push(m);
}
// the path of the last pitch, shown after a take or a miss so the break of a fork or a slider can be seen
let pathMesh = null;
const pathMat = new THREE.MeshBasicMaterial({ color: '#f4c95a', transparent: true, opacity: 0.7, depthWrite: false, fog: false });
function showPitchPath(pts) {
  hidePitchPath();
  pathMesh = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.013, 5, false), pathMat);
  pathMesh.renderOrder = 4; scene.add(pathMesh);
}
function hidePitchPath() {
  if (!pathMesh) return;
  scene.remove(pathMesh); pathMesh.geometry.dispose(); pathMesh = null;
}
const HT_N = 64;
const htGeo = new THREE.BufferGeometry(); htGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(HT_N * 3), 3));
const htLine = new THREE.Line(htGeo, new THREE.LineBasicMaterial({ color: '#f4c95a', transparent: true, opacity: 0.75, fog: false }));
htLine.frustumCulled = false; htLine.visible = false; scene.add(htLine);
const ringGeo = new THREE.RingGeometry(0.8, 1, 48), discGeo = new THREE.CircleGeometry(0.8, 32);
function marker(color, opacity, disc) {
  const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide, fog: false }));
  m.userData.op = opacity; m.visible = false; m.renderOrder = 5;
  if (disc) m.add(new THREE.Mesh(discGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: disc, depthWrite: false, side: THREE.DoubleSide, fog: false })));
  scene.add(m); return m;
}
const tapRing = marker('#eef0e4', 0.95), flashRing = marker('#f4c95a', 1), ghostRing = marker('#f4c95a', 0.95, 0.3);
const aimRing = marker('#f4c95a', 0.95, 0.18), landRing = marker('#f4c95a', 0.9);
landRing.rotation.x = -Math.PI / 2;
let fxTap = -9, fxFlash = -9, ghostOn = false;
