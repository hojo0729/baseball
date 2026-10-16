

/* ===== players: chibi animals (home = shiba inu, away = panda) posed from the same joints ===== */
const _Y = V(0, 1, 0), _d = V();
const GRAD = (() => {
  const t = new THREE.DataTexture(new Uint8Array([90, 90, 90, 255, 170, 170, 170, 255, 255, 255, 255, 255]), 3, 1, THREE.RGBAFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t;
})();
// the stadium key light is strong; darken toon base colors so fur keeps its saturation after tone mapping
const toon = c => new THREE.MeshToonMaterial({ color: new THREE.Color(c).multiplyScalar(0.55), gradientMap: GRAD });
const SPECIES = {
  shiba: { HEAD: '#d4762c', MUZ: '#fbf3e6', EARC: '#d4762c', EARIN: '#f2c2ae', LIMB: '#d4762c', PAW: '#fbf3e6', TAIL: '#d4762c', PATCH: '#d4762c', ear: 'cone', earS: [0.075, 0.16], tail: 'curl', hl: 0.011 },
  panda: { HEAD: '#f7f5ef', MUZ: '#ffffff', EARC: '#26282e', EARIN: '#26282e', LIMB: '#26282e', PAW: '#26282e', TAIL: '#f7f5ef', PATCH: '#26282e', ear: 'round', tail: 'ball', hl: 0.014 }
,
  neko: { HEAD: '#a3a8b0', MUZ: '#f6f3ec', EARC: '#a3a8b0', EARIN: '#f2b6bf', LIMB: '#a3a8b0', PAW: '#f6f3ec', TAIL: '#a3a8b0', PATCH: '#a3a8b0', ear: 'cone', earS: [0.066, 0.12], tail: 'ball', hl: 0.012 },
  usagi: { HEAD: '#f5f1ea', MUZ: '#ffffff', EARC: '#f5f1ea', EARIN: '#f4b8c4', LIMB: '#f5f1ea', PAW: '#ffffff', TAIL: '#ffffff', PATCH: '#f5f1ea', ear: 'long', tail: 'ball', hl: 0.013 },
  kuma: { HEAD: '#7b4d2a', MUZ: '#d8b083', EARC: '#7b4d2a', EARIN: '#d8b083', LIMB: '#7b4d2a', PAW: '#5d3a20', TAIL: '#7b4d2a', PATCH: '#7b4d2a', ear: 'round', tail: 'ball', hl: 0.011 }
};
const UNIFORM = {
  home: { species: 'shiba', JERSEY: '#f3eee2', PANTS: '#ebe6da', CAP: '#c8361f', SOCK: '#c8361f' },
  away: { species: 'panda', JERSEY: '#24467d', PANTS: '#dde2ea', CAP: '#162845', SOCK: '#162845' },
  neko: { species: 'neko', JERSEY: '#5a3f86', PANTS: '#e4e0ea', CAP: '#2e1f4a', SOCK: '#2e1f4a' },
  usagi: { species: 'usagi', JERSEY: '#2c7a58', PANTS: '#e2ebe5', CAP: '#18432f', SOCK: '#18432f' },
  kuma: { species: 'kuma', JERSEY: '#2a2b30', PANTS: '#d9d6cc', CAP: '#18191c', SOCK: '#c9a227' }
};
const MATS = {};
for (const team in UNIFORM) {
  const U = UNIFORM[team], S = SPECIES[U.species], m = {};
  ['HEAD', 'MUZ', 'EARC', 'EARIN', 'LIMB', 'PAW', 'TAIL', 'PATCH'].forEach(r => { m[r] = toon(S[r]); });
  ['JERSEY', 'PANTS', 'CAP', 'SOCK'].forEach(r => { m[r] = toon(U[r]); });
  MATS[team] = m;
}
const COMMON = {
  EYE: toon('#1b1a1f'), NOSE: toon('#2a1d19'), SHOE: toon('#1e2026'), GLOVE: toon('#8a5428'),
  HL: new THREE.MeshBasicMaterial({ color: '#ffffff' }),
  BLUSH: new THREE.MeshBasicMaterial({ color: '#ff8a8a', transparent: true, opacity: 0.45, depthWrite: false })
};
const geoCache = {};
const cylGeo = (a, b) => geoCache[a + '_' + b] || (geoCache[a + '_' + b] = new THREE.CylinderGeometry(b, a, 1, 8));
const SPH = new THREE.SphereGeometry(1, 14, 10), SPL = new THREE.SphereGeometry(1, 8, 6);
const CAPG = new THREE.SphereGeometry(1, 14, 6, 0, Math.PI * 2, 0, Math.PI * 0.5);
const HELG = new THREE.SphereGeometry(1, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.58);
const BRIM = new THREE.CylinderGeometry(1, 1, 1, 12, 1, false, -Math.PI / 2, Math.PI);
const EARG = new THREE.ConeGeometry(1, 1, 8);
const CURL = new THREE.TorusGeometry(0.055, 0.03, 6, 10, Math.PI * 1.6);

function makeFig(o) {
  const g = new THREE.Group(); scene.add(g);
  const parts = [];
  const add = (geo, role, parent, sx, sy, sz) => {
    if (geo === SPH && (o.lite || ['EYE', 'NOSE', 'HL', 'BLUSH', 'PAW', 'LIMB', 'PANTS', 'TAIL', 'GLOVE'].includes(role))) geo = SPL;
    const m = new THREE.Mesh(geo, COMMON.EYE); m.castShadow = !!o.shadow && SHADOWS && role !== 'HL' && role !== 'BLUSH';
    m.userData.role = role; (parent || g).add(m); parts.push(m);
    if (sx !== undefined) m.scale.set(sx, sy === undefined ? sx : sy, sz === undefined ? sx : sz);
    return m;
  };
  const f = { g, parts, helmet: !!o.helmet };
  f.body = add(SPH, 'JERSEY');
  f.belt = add(cylGeo(0.2, 0.2), 'CAP');
  const h = f.head = new THREE.Group(); g.add(h);
  add(SPH, 'HEAD', h, 0.25, 0.225, 0.23);
  add(SPH, 'MUZ', h, 0.115, 0.085, 0.09).position.set(0, -0.065, 0.165);
  if (!o.lite) add(SPH, 'NOSE', h, 0.032, 0.024, 0.024).position.set(0, -0.035, 0.252);
  f.patch = [-1, 1].map(s => { const m = add(SPH, 'PATCH', h, 0.056, 0.072, 0.03); m.position.set(0.085 * s, 0.0, 0.19); m.rotation.z = 0.5 * s; return m; });
  [-1, 1].forEach(s => {
    add(SPH, 'EYE', h, 0.03, 0.038, 0.02).position.set(0.085 * s, 0.01, 0.205);
    f.hl = f.hl || [];
    if (o.lite) return;
    const hl = add(SPH, 'HL', h, 0.011); hl.position.set(0.085 * s + 0.01, 0.025, 0.222); f.hl.push(hl);
    const b = add(SPH, 'BLUSH', h, 0.042, 0.026, 0.012); b.position.set(0.145 * s, -0.055, 0.165); b.rotation.y = 0.55 * s;
  });
  f.coneEar = [-1, 1].map(s => {
    const e = add(EARG, 'EARC', h, 0.075, 0.16, 0.05); e.position.set(0.13 * s, 0.2, -0.01); e.rotation.z = -0.35 * s;
    if (!o.lite) { const i = add(EARG, 'EARIN', e, 0.6, 0.6, 0.6); i.position.set(0, -0.08, 0.5); }
    return e;
  });
  f.roundEar = [-1, 1].map(s => { const e = add(SPH, 'EARC', h, 0.075, 0.075, 0.045); e.position.set(0.165 * s, 0.17, -0.02); return e; });
  f.longEar = [-1, 1].map(s => {
    const e = add(SPH, 'EARC', h, 0.05, 0.17, 0.035); e.position.set(0.075 * s, 0.33, -0.02); e.rotation.z = -0.18 * s;
    if (!o.lite) { const i = add(SPH, 'EARIN', e, 0.6, 0.75, 0.6); i.position.set(0, 0, 0.55); }
    return e;
  });
  if (o.helmet) { add(HELG, 'CAP', h, 0.255).position.y = 0.02; }
  else add(CAPG, 'CAP', h, 0.245).position.y = 0.04;
  const brim = add(BRIM, 'CAP', h, 0.15, 0.014, 0.15); brim.position.set(0, 0.05, 0.19);
  f.ua = [add(cylGeo(0.07, 0.062), 'JERSEY'), add(cylGeo(0.07, 0.062), 'JERSEY')];
  f.fa = [add(cylGeo(0.058, 0.05), 'LIMB'), add(cylGeo(0.058, 0.05), 'LIMB')];
  f.ej = o.lite ? null : [add(SPH, 'LIMB'), add(SPH, 'LIMB')];
  f.paw = [add(SPH, 'PAW'), add(SPH, 'PAW')];
  f.th = [add(cylGeo(0.095, 0.08), 'PANTS'), add(cylGeo(0.095, 0.08), 'PANTS')];
  f.sh = [add(cylGeo(0.075, 0.065), 'SOCK'), add(cylGeo(0.075, 0.065), 'SOCK')];
  f.kj = o.lite ? null : [add(SPH, 'PANTS'), add(SPH, 'PANTS')];
  f.shoe = [add(SPH, 'SHOE'), add(SPH, 'SHOE')];
  f.curl = add(CURL, 'TAIL'); f.ball = add(SPH, 'TAIL');
  if (o.glove) f.mitt = add(SPH, 'GLOVE');
  setTeam(f, o.team);
  return f;
}
function setTeam(f, team) {
  const M = MATS[team], S = SPECIES[UNIFORM[team].species];
  f.team = team;
  f.parts.forEach(m => { const r = m.userData.role; m.material = M[r] || COMMON[r]; });
  f.coneEar.forEach(e => { e.visible = S.ear === 'cone'; if (S.earS) e.scale.set(S.earS[0], S.earS[1], 0.05); });
  f.longEar.forEach(e => { e.visible = S.ear === 'long'; });
  f.roundEar.forEach(e => { e.visible = S.ear === 'round'; });
  f.patch.forEach(p => { p.visible = UNIFORM[team].species === 'panda'; });
  f.hl.forEach(h => h.scale.setScalar(S.hl));
  f.curl.visible = S.tail === 'curl'; f.ball.visible = S.tail === 'ball';
}

/* chibi proportions: squash the human joint heights toward the ground; the batter keeps hands on the bat */
const SQ = 0.72;
function squashJ(J, base, keepHands) {
  const o = {};
  for (const k in J) {
    const p = J[k].clone();
    if (!(keepHands && (k === 'hL' || k === 'hR'))) p.y = base + (p.y - base) * SQ;
    o[k] = p;
  }
  const up = o.head.clone().sub(o.neck).normalize();
  o.head = o.neck.clone().addScaledVector(up, 0.22);
  return o;
}
function seg(m, a, b) {
  _d.subVectors(b, a); const L = _d.length() || 1e-4;
  m.position.addVectors(a, b).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(_Y, _d.multiplyScalar(1 / L));
  m.scale.set(1, L, 1);
}
function dot(m, p, r) { m.position.copy(p); m.scale.setScalar(r); }
const _a = V(), _b = V();
function poseFig(f, J, yaw, headYaw) {
  _d.subVectors(J.neck, J.pelvis); const L = _d.length() || 1e-4;
  f.body.position.addVectors(J.pelvis, J.neck).multiplyScalar(0.5);
  f.body.quaternion.setFromUnitVectors(_Y, _d.multiplyScalar(1 / L));
  f.body.scale.set(0.2, L * 0.72, 0.19);
  _a.copy(J.pelvis).addScaledVector(_d, L * 0.02);
  f.belt.position.copy(_a); f.belt.quaternion.copy(f.body.quaternion); f.belt.scale.set(0.98, 0.035, 0.94);
  f.head.position.copy(J.head); f.head.rotation.set(0, headYaw, 0);
  seg(f.ua[0], J.sL, J.eL); seg(f.fa[0], J.eL, J.hL);
  seg(f.ua[1], J.sR, J.eR); seg(f.fa[1], J.eR, J.hR);
  if (f.ej) { dot(f.ej[0], J.eL, 0.058); dot(f.ej[1], J.eR, 0.058); }
  dot(f.paw[0], J.hL, 0.068); dot(f.paw[1], J.hR, 0.068);
  [[J.hipL, J.kL, J.fL, 0], [J.hipR, J.kR, J.fR, 1]].forEach(([hp, kn, ft, i]) => {
    seg(f.th[i], hp, kn);
    _a.copy(ft); _a.y += 0.07; seg(f.sh[i], kn, _a);
    if (f.kj) dot(f.kj[i], kn, 0.08);
    f.shoe[i].position.set(ft.x + Math.sin(yaw) * 0.03, ft.y + 0.055, ft.z + Math.cos(yaw) * 0.03);
    f.shoe[i].scale.set(0.085, 0.065, 0.125); f.shoe[i].rotation.set(0, yaw, 0);
  });
  _b.set(-Math.sin(yaw), 0, -Math.cos(yaw));
  _a.copy(J.pelvis).addScaledVector(_b, 0.2); _a.y += 0.06;
  f.curl.position.copy(_a); f.curl.rotation.set(0, yaw + Math.PI / 2, 0);
  f.ball.position.copy(_a); f.ball.scale.setScalar(0.06);
  if (f.mitt) { f.mitt.position.copy(J.hL); f.mitt.scale.set(0.1, 0.115, 0.065); f.mitt.rotation.set(0, headYaw, 0); }
}

/* ---- right-handed batter ---- */
/* left-handed hitters: everything is planned in right-handed space and mirrored (x -> -x) at the end */
const mirX = v => V(-v.x, v.y, v.z);
function mirrorJ(J) { const o = {}; for (const k in J) o[k] = mirX(J[k]); return o; }
function makeSwingPlan(C) {
  if (leftBat()) C = mirX(C);
  const hy = clamp(C.y + 0.12, 0.8, 1.3), dy = C.y - hy, hl = Math.sqrt(Math.max(0.05, 0.62 * 0.62 - dy * dy));
  const Gc = V(clamp(C.x - hl, X0 + 0.12, X0 + 0.62), hy, 0.02);
  const dc = C.clone().sub(Gc); dc.z = 0; dc.normalize();
  return [
    { t: 0, G: V(X0 + 0.24, 1.0, 0.26), d: V(0.12, 0.85, 0.5).normalize(), th: -0.2 },
    { t: 0.05, G: V(X0 + 0.24, hy + 0.12, 0.14), d: V(0.15, 0.2, 1).normalize(), th: 0.3 },
    { t: SWING_LEAD, G: Gc, d: dc, th: 0.95 },
    { t: 0.17, G: V(X0 + 0.38, hy + 0.1, -0.24), d: V(0, 0.15, -1).normalize(), th: 1.45 },
    { t: 0.34, G: V(X0 + 0.2, 1.12, -0.12), d: V(-0.7, 0.4, 0.55).normalize(), th: 1.8 }
  ];
}
function slerpVec(a, b, u) {
  const c = clamp(a.dot(b), -1, 1), om = Math.acos(c);
  if (om < 1e-3) return a.clone().lerp(b, u).normalize();
  const s = Math.sin(om);
  return a.clone().multiplyScalar(Math.sin((1 - u) * om) / s).add(b.clone().multiplyScalar(Math.sin(u * om) / s)).normalize();
}
function swingAt(tau, plan) {
  if (tau >= plan[plan.length - 1].t) { const k = plan[plan.length - 1]; return { G: k.G.clone(), dir: k.d.clone(), th: k.th }; }
  let i = 0; while (plan[i + 1].t <= tau) i++;
  const a = plan[i], b = plan[i + 1];
  let u = (tau - a.t) / (b.t - a.t);
  if (i === plan.length - 2) u = easeOut(u);
  return { G: a.G.clone().lerp(b.G, u), dir: slerpVec(a.d, b.d, u), th: lerp(a.th, b.th, u) };
}
function batterJ(now, k) {
  const step = clamp((k - 0.45) / 0.45, 0, 1), lift = Math.sin(step * Math.PI) * 0.07;
  let G, dir, th;
  const sw = batAnim && now >= batAnim.t0 ? now - batAnim.t0 : -1;
  if (sw < 0) {
    const w = Math.sin(now * 3) * 0.03 * (1 - step);
    G = V(X0 + 0.24, 1.0 + w * 0.3, 0.26); dir = V(0.12 + w, 0.85, 0.5).normalize(); th = -0.2 - step * 0.08;
  } else ({ G, dir, th } = swingAt(sw, batAnim.plan));
  if (isBunting()) { ({ G, dir } = buntGrip()); th = 0.9; }      // squared around to bunt
  const P = V(X0, 0.95 - 0.03 * step, 0.06);
  const hipF = P.clone().add(rotY(V(0, -0.04, -0.12), th * 0.6)), hipB = P.clone().add(rotY(V(0, -0.04, 0.12), th * 0.6));
  const fF = V(X0 + 0.02, lift, -0.36 - 0.1 * step), fB = V(X0 - 0.04, 0, 0.46);
  const kF = hipF.clone().lerp(fF, 0.5).add(V(0.1, 0.03, 0)), kB = hipB.clone().lerp(fB, 0.5).add(V(0.11, 0, 0));
  if (sw > 0) kB.add(V(0.03, -0.04, -0.12 * clamp(sw / 0.2, 0, 1)));
  const N = P.clone().add(V(0.08, 0.46, -0.02));
  const sF = N.clone().add(rotY(V(0, -0.03, -0.19), th)), sB = N.clone().add(rotY(V(0, -0.03, 0.19), th));
  const head = N.clone().add(V(0.03, 0.15, -0.03));
  const hF = G.clone().addScaledVector(dir, 0.04), hB = G.clone().addScaledVector(dir, 0.12);
  const eF = sF.clone().lerp(hF, 0.5).add(V(0.02, -0.12, -0.04)), eB = sB.clone().lerp(hB, 0.5).add(V(0, -0.13, 0.06));
  const J = { pelvis: P, neck: N, head, sL: sF, sR: sB, eL: eF, eR: eB, hL: hF, hR: hB, hipL: hipF, hipR: hipB, kL: kF, kR: kB, fL: fF, fR: fB };
  return leftBat() ? { J: mirrorJ(J), G: mirX(G), dir: mirX(dir) } : { J, G, dir };
}

/* ---- pitcher (built right-handed, mirrored for a lefty). k: 0 set, 0-0.35 leg lift, 0.35-1 stride and arm, 1 release, 1-1.35 follow-through ---- */
function pitcherJ(k) { const J = pitcherJR(k); return lefty() ? mirrorJ(J) : J; }
function pitcherJR(k) {
  const M = MOUND_Y, Z0 = RUBBER_Z;
  const lift = k < 0.35 ? ease(k / 0.35) : k < 0.55 ? 1 : 1 - ease(clamp((k - 0.55) / 0.25, 0, 1));
  const s = ease(clamp((k - 0.5) / 0.5, 0, 1));
  const fe = easeOut(clamp((k - 1) / 0.35, 0, 1));
  const th = k < 0.4 ? -1.2 * ease(k / 0.4) : k < 1 ? -1.2 + 1.65 * ease(clamp((k - 0.6) / 0.4, 0, 1)) : 0.45 + 0.35 * fe;
  const P = V(0.02, M + 0.98 - 0.14 * s + 0.03 * lift, Z0 + 0.15 + 0.75 * s + 0.25 * fe);
  const fR = V(-0.12, M + 0.12 * Math.sin(fe * Math.PI), Z0 + 0.05 + 0.55 * fe);
  const fL = V(0.08, M + 0.42 * lift, Z0 + 0.05 + 0.05 * lift).lerp(V(0.14, M - 0.06, Z0 + 1.55), s);
  const hipL = P.clone().add(rotY(V(0.12, -0.05, 0), th * 0.5)), hipR = P.clone().add(rotY(V(-0.12, -0.05, 0), th * 0.5));
  const kL = hipL.clone().lerp(fL, 0.5).add(V(0.02, 0.05 * lift, 0.12 + 0.2 * lift)), kR = hipR.clone().lerp(fR, 0.5).add(V(-0.02, 0, 0.1));
  const N = P.clone().add(V(0, 0.47 - 0.05 * (s + fe), -0.05 * lift + 0.2 * s + 0.15 * fe));
  const sR = N.clone().add(rotY(V(-0.19, -0.03, 0), th)), sL = N.clone().add(rotY(V(0.19, -0.03, 0), th));
  const C0 = N.clone().add(V(0.02, -0.2, 0.2));
  const arm = phi => { const r = phi * D2R; return sR.clone().add(V(-0.05, Math.cos(r) * 0.62, -Math.sin(r) * 0.62)); };
  let hR;
  if (k < 0.35) hR = C0.clone();
  else if (k < 0.75) { const u = (k - 0.35) / 0.4; hR = C0.clone().lerp(arm(180 - 150 * ease(u)), clamp(u / 0.25, 0, 1)); }
  else if (k <= 1) hR = arm(30 - 55 * ((k - 0.75) / 0.25));
  else hR = arm(-25 - 125 * fe);
  const gOut = sL.clone().add(V(0.05, 0.05, 0.45)), gIn = N.clone().add(V(0.12, -0.25, 0.12));
  let hL;
  if (k < 0.35) hL = C0.clone().add(V(0.07, 0, 0));
  else if (k < 0.85) hL = C0.clone().add(V(0.07, 0, 0)).lerp(gOut, ease(clamp((k - 0.35) / 0.3, 0, 1)));
  else hL = gOut.lerp(gIn, ease(clamp((k - 0.85) / 0.3, 0, 1)));
  const eR = sR.clone().lerp(hR, 0.5).add(V(-0.1, -0.03, 0)), eL = sL.clone().lerp(hL, 0.5).add(V(0.1, -0.06, 0));
  const head = N.clone().add(V(0, 0.15, 0.03));
  return { pelvis: P, neck: N, head, sL, sR, eL, eR, hL, hR, hipL, hipR, kL, kR, fL, fR };
}

/* ---- fielders and runners ---- */
function fielderJ(x, z, yaw, ph, mv, ready, reach) {
  const o = V(x, 0, z), R = v => o.clone().add(rotY(v, yaw)), D = v => rotY(v, yaw);
  const sw = Math.sin(ph) * mv, bob = Math.abs(Math.sin(ph)) * 0.05 * mv;
  const cr = ready * 0.14 * (1 - mv);
  const P = R(V(0, 0.95 - cr + bob, 0));
  const hipL = R(V(0.11, 0.9 - cr + bob, 0)), hipR = R(V(-0.11, 0.9 - cr + bob, 0));
  const sp = 0.13 + 0.14 * ready * (1 - mv);
  const fL = R(V(sp, Math.max(0, sw) * 0.14, sw * 0.4)), fR = R(V(-sp, Math.max(0, -sw) * 0.14, -sw * 0.4));
  const kL = hipL.clone().lerp(fL, 0.5).add(D(V(0.02, 0, 0.1 + cr * 0.8))), kR = hipR.clone().lerp(fR, 0.5).add(D(V(-0.02, 0, 0.1 + cr * 0.8)));
  const N = P.clone().add(D(V(0, 0.47 - cr * 0.4, 0.06 + cr * 0.9 + 0.1 * mv)));
  const sL = N.clone().add(D(V(0.19, -0.03, 0))), sR = N.clone().add(D(V(-0.19, -0.03, 0)));
  let hL, hR;
  if (mv > 0.1) { hL = sL.clone().add(D(V(0.04, -0.4, -sw * 0.35 + 0.08))); hR = sR.clone().add(D(V(-0.04, -0.4, sw * 0.35 + 0.08))); }
  else { hL = sL.clone().add(D(V(0.02, -0.4, 0.2 + cr))); hR = sR.clone().add(D(V(-0.02, -0.4, 0.2 + cr))); }
  if (reach) hL.lerp(N.clone().add(D(V(0.12, 0.42, 0.25))), reach);
  const eL = sL.clone().lerp(hL, 0.5).add(D(V(0.07, 0, -0.05))), eR = sR.clone().lerp(hR, 0.5).add(D(V(-0.07, 0, -0.05)));
  const head = N.clone().add(D(V(0, 0.15, 0.03)));
  return { pelvis: P, neck: N, head, sL, sR, eL, eR, hL, hR, hipL, hipR, kL, kR, fL, fR };
}

const pitcherF = makeFig({ team: 'away', glove: true, shadow: true });
const batterF = makeFig({ team: 'home', helmet: true, shadow: true });
const FPOS = [[22, -24], [10, -37], [-10, -37], [-21, -24], [-45, -85], [0, -95], [45, -85]];
const fielderF = FPOS.map(() => makeFig({ team: 'away', glove: true, lite: true }));
const RUNPOS = [[19.4 - 1.8, -19.4 - 1.8], [0 - 1.8, -38.8 + 1.8], [-19.4 + 1.5, -19.4 + 1.5]];
const runnerF = RUNPOS.map(() => makeFig({ team: 'home', helmet: true, lite: true }));
function updateRunners() {
  runnerF.forEach((f, i) => {
    f.g.visible = !!(G && G.bases[i]);
    const [x, z] = RUNPOS[i], yaw = Math.atan2(-x, -z);
    poseFig(f, squashJ(fielderJ(x, z, yaw, 0, 0, 1, 0), 0), yaw, yaw);
  });
}
function setTeams() {
  const { bat, fld } = teamsNow();
  setTeam(batterF, bat); runnerF.forEach(f => setTeam(f, bat));
  setTeam(pitcherF, fld); fielderF.forEach(f => setTeam(f, fld));
}

/* ---- bat ---- */
const batG = new THREE.Group(); scene.add(batG);
const WOOD = mat('#c99a5c', { roughness: 0.42 });
const batBody = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.0135, 0.84, 18).translate(0, 0.43, 0), WOOD);
const batCap = new THREE.Mesh(new THREE.SphereGeometry(0.034, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, 0.85, 0), WOOD);
const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.022, 0.02, 14), mat('#2a1c12'));
const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.0158, 0.0142, 0.26, 14).translate(0, 0.15, 0), mat('#23242a', { roughness: 0.9 }));
[batBody, batCap, grip].forEach(m => { m.castShadow = SHADOWS; });
batG.add(batBody, batCap, knob, grip);
