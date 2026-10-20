/* Head shapes adapted from the user-supplied baseball_chibi_characters.html.
   The game's joint rig, handedness and bat grip remain the animation source.
   Facial expressions share one texture per species, including lightweight fielders. */
function buildMascotHead(f, add, o) {
  const h = f.head = new THREE.Group(); f.g.add(h);
  h.scale.setScalar(HEAD_K);
  const ball = (role, x, y, z, sx, sy, sz, parent = h) => {
    const m = add(SPH, role, parent, sx, sy, sz); m.position.set(x, y, z); return m;
  };
  const head = ball('HEAD', 0, 0, 0.015, 0.42, 0.40, 0.35);
  f.lineH = ball('LINE', 0, 0, 0, 1, 1, 1, head); f.lineH.visible = false;
  f.muz = ball('MUZ', 0, -0.12, 0.30, 0.25, 0.14, 0.07);
  f.nose = ball('NOSE', 0, -0.07, 0.38, 0.045, 0.035, 0.025);
  f.face = ball('FACE', 0, 0, 0.015, 0.425, 0.405, 0.355);
  f.face.geometry = FACEG;
  f.cheeks = [];
  f.patch = [-1, 1].map(s => ball('PATCH', s * 0.17, 0.04, 0.275, 0.115, 0.15, 0.055));
  f.coneEar = [-1, 1].map(s => {
    const e = add(EARG, 'EARC', h, 0.14, 0.36, 0.14); e.position.set(s * 0.29, 0.33, 0.015);
    const inner = ball('EARIN', 0, 0, 0.65, 0.40, 0.30, 0.18, e);
    return e;
  });
  f.roundEar = [-1, 1].map(s => {
    const e = ball('EARC', s * 0.30, 0.29, 0.02, 0.14, 0.15, 0.11);
    ball('EARIN', 0, 0, 0.75, 0.48, 0.48, 0.20, e); return e;
  });
  f.longEar = [-1, 1].map(s => {
    const e = new THREE.Group(); h.add(e); e.position.set(s * 0.17, 0.25, 0);
    ball('EARC', 0, 0.20, 0, 0.09, 0.29, 0.08, e);
    ball('EARIN', 0, 0.20, 0.065, 0.045, 0.23, 0.025, e); return e;
  });
  f.hair = [ball('HAIR', 0, 0.19, -0.04, 0.39, 0.25, 0.34),
    ball('HAIR', -0.13, 0.19, 0.28, 0.18, 0.12, 0.09), ball('HAIR', 0.11, 0.20, 0.28, 0.16, 0.11, 0.09)];
  f.antennae = [-1, 1].map(s => {
    const g = new THREE.Group(); h.add(g); g.position.set(s * 0.17, 0.32, 0);
    const stem = add(cylGeo(0.022, 0.022), 'HEAD', g); stem.scale.y = 0.20; stem.position.y = 0.10;
    ball('ACCENT', s * 0.025, 0.22, 0, 0.045, 0.045, 0.045, g); return g;
  });
  f.scarf = add(new THREE.TorusGeometry(0.25, 0.055, 5, 12), 'SCARF', h);
  f.scarf.position.set(0, -0.37, 0.03); f.scarf.rotation.x = Math.PI / 2;
  f.knot = ball('SCARF', 0.19, -0.51, 0.24, 0.06, 0.18, 0.04);
  f.knot.rotation.z = -0.2;
  f.bow = new THREE.Group(); h.add(f.bow); f.bow.position.set(-0.26, 0.29, 0.14);
  [-1, 1].forEach(s => ball('BOW', s * 0.075, 0, 0, 0.10, 0.065, 0.035, f.bow));
  ball('ACCENT', 0, 0, 0.025, 0.035, 0.035, 0.02, f.bow);
  f.cap = add(o.helmet ? HELG : CAPG, 'CAP', h, 0.30, 0.25, 0.28);
  f.cap.position.set(0, 0.22, -0.025);
  f.brim = add(BRIM, 'CAP', h, 0.22, 0.025, 0.18); f.brim.position.set(0, 0.24, 0.20);
  f.mouths = [-1, 1].map(s => {
    const m = add(MOUTHG, 'MOUTH', h, 1.5); m.position.set(s * 0.025, -0.14, 0.377); m.rotation.z = Math.PI; return m;
  });
  f.mouthO = ball('MOUTHO', 0, -0.15, 0.38, 0.04, 0.035, 0.018);
  f.tooth = ball('TOOTH', 0, -0.15, 0.375, 0.018, 0.023, 0.01);
}
