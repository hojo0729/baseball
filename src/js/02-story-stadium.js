/* Story environments. Only scenery/materials/lights change; the field and all
   gameplay dimensions stay fixed. Static batches are built lazily and reused. */
const STADIUM_LOOKS = {
  standard: { name: 'ナイター球場', type: '', sky: '#050b13', horizon: '#0b1626', grass: '#ffffff', dirt: '#ffffff', fence: '#ffffff', trim: '#f4c95a', eye: 30, stands: true, towers: true, stars: true, sun: '#fff1d6', ambient: '#a9bde0', ground: '#1c2a20', fill: '#c9dbff', rim: '#ffe7b0', lights: [1.55, .6, .5, .45] },
  park: { name: '約束のグラウンド', type: 'park', sky: '#557e9b', horizon: '#e7b584', grass: '#67935a', dirt: '#b18b62', fence: '#456755', trim: '#d8b87c', eye: 8, sun: '#ffdbab', ambient: '#d3dbe1', ground: '#667044', fill: '#b9d6e4', rim: '#ffd6a2', lights: [1.8, 1.05, .45, .55] },
  tiger: { name: 'タイガーズ球場', type: 'tiger', sky: '#5e97bc', horizon: '#dce1cc', grass: '#78994e', dirt: '#bd895b', fence: '#523c2d', trim: '#edb652', eye: 10, stands: true, sun: '#fff1ce', ambient: '#cde1ec', ground: '#787249', fill: '#b8d8ef', rim: '#ffc479', lights: [1.8, 1.1, .4, .45] },
  forest: { name: '森の球場', type: 'forest', sky: '#7594a2', horizon: '#bbcfb4', grass: '#4c7959', dirt: '#a28762', fence: '#304d3d', trim: '#b6aa77', eye: 11, sun: '#e0e7c0', ambient: '#b2caca', ground: '#46583d', fill: '#a8c9db', rim: '#d5db9d', lights: [1.6, .95, .5, .5] },
  lab: { name: '研究施設', type: 'lab', sky: '#152b37', horizon: '#405a62', grass: '#3e6265', dirt: '#758486', fence: '#253b45', trim: '#77cfc8', eye: 18, accent: '#6dc9c3', grid: true, sun: '#c9e4df', ambient: '#90b9c6', ground: '#273c43', fill: '#a0cad8', rim: '#71d4c9', lights: [1.7, .8, .6, .65] },
  archive: { name: '記録保管施設', type: 'lab', sky: '#202534', horizon: '#4e5665', grass: '#485c66', dirt: '#7d818a', fence: '#303845', trim: '#b9afd5', eye: 18, accent: '#a69bc8', grid: true, sun: '#ded9ee', ambient: '#a9afc9', ground: '#343b4b', fill: '#acb9db', rim: '#b4a4dd', lights: [1.7, .8, .6, .65] },
  ai: { name: '保護と制御の中枢', type: 'lab', sky: '#112c33', horizon: '#38666a', grass: '#3c6266', dirt: '#718787', fence: '#1e3e43', trim: '#9cdbcc', eye: 18, accent: '#91d5bd', grid: true, sun: '#d1eee1', ambient: '#9ac6ca', ground: '#2b4646', fill: '#a1cbdf', rim: '#8be1be', lights: [1.7, .85, .55, .7] },
  invasion: { name: '巨大船の影', type: 'invasion', sky: '#102435', horizon: '#6c7e87', grass: '#426758', dirt: '#8d8474', fence: '#263f43', trim: '#80b8c1', eye: 12, accent: '#81d6d5', sun: '#d7e8ed', ambient: '#a2bdcf', ground: '#344e4b', fill: '#90b7d7', rim: '#8ed1d1', lights: [1.6, .85, .6, .65] },
  trial: { name: '最終適応試験場', type: 'trial', sky: '#102630', horizon: '#355865', grass: '#365963', dirt: '#6d8083', fence: '#203742', trim: '#68cbd0', eye: 18, accent: '#65d5d3', grid: true, sun: '#cae4e8', ambient: '#92bacb', ground: '#253e45', fill: '#87b9d9', rim: '#74dcd2', lights: [1.7, .8, .65, .7] },
  awakened: { name: '野性解放の試験場', type: 'trial', sky: '#30273d', horizon: '#a47b6e', grass: '#5e6262', dirt: '#9c8973', fence: '#3c3c47', trim: '#f4ba72', eye: 18, accent: '#ffb35d', grid: true, sun: '#ffdfbd', ambient: '#b5bbd4', ground: '#514e43', fill: '#a1c1de', rim: '#ffb469', lights: [1.8, .9, .6, .8] },
  final: { name: '地球代表の決戦場', type: 'final', sky: '#101a37', horizon: '#686885', grass: '#416c62', dirt: '#9c8874', fence: '#24374d', trim: '#d8bd79', eye: 30, stands: true, towers: true, stars: true, accent: '#93c7e0', sun: '#fff0cf', ambient: '#abb6d9', ground: '#30444a', fill: '#93b9e3', rim: '#ffd192', lights: [1.8, .8, .65, .7] },
  morning: { name: 'いつもの朝の球場', type: 'park', sky: '#6da6c7', horizon: '#e7e5be', grass: '#70a268', dirt: '#b7996a', fence: '#4b725c', trim: '#e1c88d', eye: 8, sun: '#fff3ca', ambient: '#d1e6ec', ground: '#718251', fill: '#bfdef0', rim: '#ffe4b2', lights: [1.75, 1.15, .4, .5] }
};
const stadiumGroups = new Map();
let stadiumId = '', stadiumLook = STADIUM_LOOKS.standard, stadiumGroup = null;
const stadiumLighting = () => stadiumLook.lights;
const STADIUM_GEO = {
  box: new THREE.BoxGeometry(1, 1, 1), cylinder: new THREE.CylinderGeometry(.5, .5, 1, 8),
  cone: new THREE.ConeGeometry(1, 1, 7), sphere: new THREE.SphereGeometry(1, 16, 8),
  ring: new THREE.TorusGeometry(1, .025, 6, 48), arch: new THREE.TorusGeometry(1, .025, 6, 48, Math.PI)
};
const storyGrassTex = canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#777777'; g.fillRect(0, 0, w, h); g.fillStyle = '#626262'; g.fillRect(0, 0, w/2, h);
  speckle(g, w, h, 2200, ['#555555', '#858585'], 2);
}, [36, 36]);
const storyDirtTex = canvasTex(128, 128, (g, w, h) => {
  g.fillStyle = '#929292'; g.fillRect(0, 0, w, h); speckle(g, w, h, 1400, ['#777777', '#a2a2a2'], 1.4);
}, [10, 10]);
const storyGridTex = canvasTex(128, 128, (g, w, h) => {
  g.fillStyle = '#666666'; g.fillRect(0, 0, w, h); g.strokeStyle = '#858585'; g.lineWidth = 1;
  g.strokeRect(.5, .5, w-1, h-1); g.strokeStyle = '#727272'; g.beginPath(); g.moveTo(w/2, 0); g.lineTo(w/2, h); g.moveTo(0, h/2); g.lineTo(w, h/2); g.stroke();
}, [36, 36]);
const storyInnerGrass = storyGrassTex.clone(), storyInnerDirt = storyDirtTex.clone(), storyInnerGrid = storyGridTex.clone();
[storyInnerGrass, storyInnerDirt, storyInnerGrid].forEach(t => { t.repeat.set(2, 2); t.needsUpdate = true; });
const stadiumSkyTex = canvasTex(8, 128, g => { g.fillStyle = '#547688'; g.fillRect(0, 0, 8, 128); });
const stadiumSky = new THREE.Mesh(new THREE.SphereGeometry(550, 24, 12), new THREE.MeshBasicMaterial({ map: stadiumSkyTex, side: THREE.BackSide, depthWrite: false, fog: false }));
stadiumSky.renderOrder = -10; stadiumSky.visible = false; scene.add(stadiumSky);

function stadiumBuilder(root) {
  const pools = new Map(), dummy = new THREE.Object3D();
  root.userData.glows = [];
  const add = (shape, color, x, y, z, sx, sy, sz, rotation = 0, glow = false) => {
    const id = shape + color + glow;
    if (!pools.has(id)) pools.set(id, { shape, color, glow, matrices: [] });
    dummy.position.set(x, y, z); dummy.scale.set(sx, sy, sz); dummy.rotation.set(0, rotation, 0); dummy.updateMatrix();
    pools.get(id).matrices.push(dummy.matrix.clone());
  };
  const finish = () => {
    for (const p of pools.values()) {
      const material = p.glow ? new THREE.MeshBasicMaterial({ color: p.color }) : mat(p.color, { roughness: .9 });
      if (!p.glow) material.color.convertSRGBToLinear();
      const mesh = new THREE.InstancedMesh(STADIUM_GEO[p.shape], material, p.matrices.length);
      p.matrices.forEach((m, i) => mesh.setMatrixAt(i, m)); mesh.instanceMatrix.needsUpdate = true;
      mesh.frustumCulled = false; root.add(mesh);
      if (p.glow) root.userData.glows.push(material);
    }
  };
  return { add, finish };
}
function makeStadiumGroup(type) {
  const root = new THREE.Group(); root.name = 'story-stadium-' + type;
  const { add, finish } = stadiumBuilder(root);
  const park = () => {
    [-1, 1].forEach(s => {
      for (let i = 0; i < 6; i++) {
        const x = s*(40 + i*18), z = -160 + i*13, h = 22 + (i%3)*5;
        add('cylinder', '#62503b', x, h/2, z, 2.5, h, 2.5);
        add('sphere', i%2 ? '#496b4d' : '#627a51', x, h+7, z, 12, 12, 10);
      }
      const x = s*73, z = -131;
      add('box', '#8d7453', x, 4, z, 21, 1, 10);
      for (const dx of [-9, 9]) add('box', '#71583d', x+dx, 3.5, z, 1, 7, 1);
      add('box', '#4a6657', x, 8, z, 25, 1.5, 14);
      add('box', '#9f835d', x, 1.5, z, 18, .6, 2);
    });
    add('sphere', '#6e846c', -95, 2, -236, 150, 47, 65);
    add('sphere', '#81917a', 110, 0, -254, 160, 55, 60);
  };
  if (type === 'park' || type === 'invasion') park();
  if (type === 'tiger') {
    [-1, 1].forEach(s => {
      add('sphere', '#997f5b', s*115, 4, -183, 58, 32, 35);
      add('box', '#553f2a', s*58, 17, -151, 10, 34, 8);
      add('box', '#d79a3f', s*58, 34, -151, 17, 3, 11);
      for (let i = 0; i < 4; i++) add('box', '#edb34b', s*58, 8+i*7, -146.8, 11, 2, .5);
      for (let i = 0; i < 5; i++) {
        const x = s*(42+i*17), z = -149+i*8;
        add('cylinder', '#494235', x, 23, z, .7, 46, .7);
        add('box', i%2 ? '#352f27' : '#d49b42', x+s*4, 41, z, 8, 5, .4);
      }
    });
    add('box', '#d9a54e', 0, 36, -154, 125, 3, 7);
  }
  if (type === 'forest') {
    for (const s of [-1, 1]) for (let i = 0; i < 11; i++) {
      const x = s*(28+i*13), z = -174+i*9, h = 37+(i%4)*9;
      add('cylinder', '#534d3b', x, h/2, z, 2, h, 2);
      add('cone', i%2 ? '#2c5145' : '#3d6350', x, h*.7, z, 12, h, 12);
      add('cone', '#50715a', x, h*.95, z, 8, h*.65, 8);
    }
    add('cone', '#71877b', -65, 16, -280, 160, 140, 75);
    add('cone', '#82958b', 110, 12, -300, 180, 160, 85);
    for (const s of [-1, 1]) {
      add('box', '#645e45', s*68, 4, -137, 21, 8, 8);
      add('box', '#4b6755', s*68, 9, -137, 25, 2, 12);
    }
  }
  const ship = (x, y, z, scale) => {
    add('sphere', '#293c4c', x, y, z, 90*scale, 9*scale, 46*scale);
    add('sphere', '#50616d', x, y+5*scale, z, 48*scale, 14*scale, 25*scale);
    add('sphere', '#1d2f3a', x, y-5*scale, z, 66*scale, 5*scale, 33*scale);
    for (let i = 0; i < 9; i++) add('sphere', '#81d6d5', x+(i-4)*15*scale, y-7*scale, z+25*scale, 2.3*scale, .65*scale, .8*scale, 0, true);
  };
  if (type === 'invasion') ship(0, 57, -164, 1.2);
  if (type === 'lab' || type === 'trial') {
    [-1, 1].forEach(s => {
      add('box', '#344954', s*85, 20, -153, 30, 40, 26);
      add('box', '#233641', s*56, 26, -143, 10, 52, 12);
      add('box', '#6ed4d1', s*56, 27, -136.8, 2, 45, .4, 0, true);
      for (let i = 0; i < 3; i++) add('box', '#6ed4d1', s*85, 12+i*10, -139.8, 24, 1.4, .4, 0, true);
    });
    add('box', '#405660', 0, 52, -143, 122, 5, 15);
    add('box', '#6ed4d1', 0, 49, -135, 106, .8, .5, 0, true);
    if (type === 'trial') add('ring', '#6ed4d1', 0, 43, -181, 49, 29, 1, 0, true);
  }
  if (type === 'final') {
    add('arch', '#a0bed0', 0, 29, -205, 108, 92, 2);
    add('arch', '#9dcce5', 0, 29, -204, 100, 85, 1, 0, true);
    [-1, 1].forEach(s => {
      for (let i = 0; i < 3; i++) {
        const x = s*(68+i*20), z = -174+i*12;
        add('cylinder', '#596a76', x, 31, z, 1.5, 62, 1.5);
        add('box', s<0 ? '#b98646' : '#517c9e', x+s*5, 52, z, 10, 15, .7);
        add('box', '#d7c492', x+s*5, 50, z+.4, 1.2, 14, .3);
      }
    });
    ship(-120, 86, -262, .6);
  }
  finish();
  const signTex = canvasTex(512, 64, g => { g.fillStyle = '#172a2d'; g.fillRect(0, 0, 512, 64); });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(36, 4.5), new THREE.MeshBasicMaterial({ map: signTex }));
  const signHeight = type === 'final' ? 39 : ['trial', 'lab'].includes(type) ? 26 : 14;
  sign.position.set(0, signHeight, type === 'final' ? -184 : ['trial', 'lab'].includes(type) ? -145 : -126);
  root.add(sign); root.userData.sign = signTex;
  scene.add(root); return root;
}
function syncStadium() {
  let id = story && !online && !match ? story.stadium || 'park' : 'standard';
  if (id === 'trial' && storySession && storySession.beastUsed) id = 'awakened';
  if (id === stadiumId) return;
  stadiumId = id; stadiumLook = STADIUM_LOOKS[id] || STADIUM_LOOKS.standard;
  const look = stadiumLook, original = id === 'standard';
  if (stadiumGroup) stadiumGroup.visible = false;
  stadiumGroup = null;
  if (!original) {
    if (!stadiumGroups.has(look.type)) stadiumGroups.set(look.type, makeStadiumGroup(look.type));
    stadiumGroup = stadiumGroups.get(look.type); stadiumGroup.visible = true;
    stadiumGroup.userData.glows.forEach(m => m.color.set(look.accent || look.trim));
    const texture = stadiumGroup.userData.sign, g = texture.image.getContext('2d');
    g.fillStyle = look.fence; g.fillRect(0, 0, 512, 64); g.strokeStyle = look.trim; g.lineWidth = 3; g.strokeRect(3, 3, 506, 58);
    g.fillStyle = '#f1eee2'; g.font = '500 34px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(look.name, 256, 33); texture.needsUpdate = true;
  }
  stadiumSky.visible = !original; scene.background.set(look.sky); scene.fog.color.set(look.horizon);
  scene.fog.near = original ? 160 : 220; scene.fog.far = original ? 440 : 650;
  if (!original) {
    const g = stadiumSkyTex.image.getContext('2d'), gradient = g.createLinearGradient(0, 0, 0, 128);
    gradient.addColorStop(0, look.sky); gradient.addColorStop(.48, look.horizon); gradient.addColorStop(1, look.horizon);
    g.fillStyle = gradient; g.fillRect(0, 0, 8, 128); stadiumSkyTex.needsUpdate = true;
  }
  const maps = original ? [grassTex, igrassTex, dirtTex, dirtTexS] : [look.grid ? storyGridTex : storyGrassTex, look.grid ? storyInnerGrid : storyInnerGrass, storyDirtTex, storyInnerDirt];
  [GRASS, IGRASS, DIRT, DIRTS].forEach((m, i) => {
    if (m.map !== maps[i]) { m.map = maps[i]; m.needsUpdate = true; }
    m.color.set(i<2 ? look.grass : look.dirt);
    if (!original) m.color.convertSRGBToLinear();
  });
  fence.material.color.set(look.fence); fence.material.map = original ? adTex : null;
  fence.material.emissiveMap = original ? adTex : null; fence.material.emissiveIntensity = original ? .3 : 0; fence.material.needsUpdate = true;
  fenceTop.material.color.set(look.trim); bEye.material.color.set(original ? '#0b1914' : look.fence);
  if (!original) [fence.material, fenceTop.material, bEye.material].forEach(m => m.color.convertSRGBToLinear());
  bEye.scale.y = look.eye/30; bEye.position.y = 3.2+look.eye/2;
  stands.visible = !!look.stands; stands.material.color.set(original ? '#ffffff' : look.fence);
  stadiumTowers.forEach(o => { o.visible = !!look.towers; }); stadiumStars.visible = !!look.stars;
  key.color.set(look.sun); hemi.color.set(look.ambient); hemi.groundColor.set(look.ground); fill.color.set(look.fill); rim.color.set(look.rim);
  key.position.set(id === 'morning' ? -35 : 18, id === 'morning' ? 65 : 40, 26);
  key.intensity = look.lights[0]; hemi.intensity = look.lights[1]; fill.intensity = look.lights[2]; rim.intensity = look.lights[3];
}
