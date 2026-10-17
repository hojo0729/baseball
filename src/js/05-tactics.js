
/* ===== strategy and running game: steal, double steal, hit-and-run, bunt, squeeze, pickoffs ===== */
const BASE_PT = { 1: V(19.4, 1.2, -19.4), 2: V(0, 1.2, -38.8), 3: V(-19.4, 1.2, -19.4) };
const throwMesh = new THREE.Mesh(new THREE.SphereGeometry(BALL_R * 2.2, 12, 8), mat('#ffffff', { roughness: 0.5 }));
throwMesh.visible = false; scene.add(throwMesh);
let sign = null;               // batting sign chosen before the pitch: steal | run | bunt | squeeze
let curBunt = false;           // the batter is squared to bunt on this pitch
let steal = null, stealAnim = null, cpuStealPlan = false, cpuBuntPlan = false, pickoff = null;
const runSign = () => sign === 'steal' || sign === 'run' || sign === 'squeeze';
const SIGN_HINT = {
  steal: '盗塁のサイン。投球と同時に走者が走る',
  run: 'エンドラン。走者が走るので必ず打とう（ゴロでもゲッツーにならない）',
  bunt: 'バント。ボールが通る位置をタップしてバットを当てる',
  squeeze: 'スクイズ。3塁走者が突っ込む。必ずバットに当てよう'
};

/* bases (0 = first, 1 = second) whose runners would run, lead runner first. No steals of home. */
function stealers() {
  if (!G) return [];
  const B = G.bases, r = [];
  if (B[1] && !B[2]) r.push(1);
  if (B[0] && (!B[1] || r.includes(1))) r.push(0);
  return r;
}
/* a runner is put out without ending the plate appearance */
function runnerOut(i) {
  G.bases[i] = 0; G.outs++;
  if (G.outs >= 3) { G.b = 0; G.s = 0; return true; }
  return false;
}
/* at the release: apply the sign (user) or the CPU's plan; returns a short message for the hint line */
function startSigns(now, sg) {
  steal = null; curBunt = false;
  let s = null;
  // online: the sign travels inside the pitch message, so both devices start the same play
  if (online) { s = sg || null; sign = null; onl.oppSign = null; }
  else if (mode === 'bat') { s = sign; sign = null; }
  else { s = cpuStealPlan ? 'steal' : cpuBuntPlan ? 'bunt' : null; cpuStealPlan = cpuBuntPlan = false; }
  if (!s) return '';
  let msg = '';
  if (s === 'bunt' || s === 'squeeze') { curBunt = true; msg = mode === 'pit' ? 'バントの構え！' : ''; }
  if (s === 'steal' || s === 'run') {
    const run = stealers();
    if (run.length) {
      steal = { run, lead: run[0], t0: now, runEnd: now + 3.4, hitRun: s === 'run' };
      msg = s === 'run' ? 'エンドラン！' : run.length > 1 ? 'ダブルスチール！' : (mode === 'pit' ? '走った！速い球で刺そう' : '盗塁！');
    }
  }
  if (s === 'squeeze' && G.bases[2]) { steal = { run: [2], lead: 2, t0: now, runEnd: now + 3.0, squeeze: true }; msg = 'スクイズ！'; }
  return msg ? '　' + msg : '';
}
/* called when the pitch reaches the catcher; returns the outcome or null */
function settleSteal(c, now) {
  const s = steal; steal = null;
  if (!s) return null;
  if (c.kind !== 'take' && c.kind !== 'miss') return null;      // ball in play or foul: the play takes over
  if (s.squeeze) {                                             // missed squeeze: runner hung out at the plate
    const safe = Math.random() < 0.1;
    s.throw = null; s.arrive = now + 0.5; s.runEnd = now + 0.4;
    stealAnim = s; G.bases[2] = 0;
    let ended = false;
    if (safe) G.runs++; else { G.outs++; if (G.outs >= 3) { G.b = 0; G.s = 0; ended = true; } }
    let label = safe ? 'ホームイン！ 1点' : 'スクイズ失敗';
    if (ended) label = endInning(label);
    return { label, safe, ended, arrive: s.arrive };
  }
  let p = 0.62 + (128 - ball.speed) / 100 * 0.7 + TYPES[ball.key].hard * 0.08 - (s.run.length > 1 ? 0.05 : 0) - (s.hitRun ? 0.08 : 0);
  p = clamp(p, 0.3, 0.9);
  const safe = Math.random() < p, tgt = s.lead + 2;              // first -> 2B, second -> 3B
  const from = V(0, 1.2, 0.8), to = BASE_PT[tgt], t0 = now + 0.15, dur = from.distanceTo(to) / 33;
  s.throw = { from, to, t0, dur };
  s.arrive = t0 + dur; s.runEnd = s.arrive + (safe ? -0.25 : 0.35);
  stealAnim = s;
  const nb = G.bases.slice();
  s.run.forEach(i => { nb[i] = 0; if (i !== s.lead || safe) nb[i + 1] = 1; });
  G.bases = nb;
  let ended = false;
  if (!safe) { G.outs++; if (G.outs >= 3) { G.b = 0; G.s = 0; ended = true; } }
  let label = safe ? (s.run.length > 1 ? 'ダブルスチール成功！' : '盗塁成功！') : '盗塁失敗';
  if (ended) label = endInning(label);
  return { label, safe, ended, arrive: s.arrive };
}

/* ---- bunts ---- */
function buntContact(d, vy) {
  const q = 1 - Math.min(1, d / 0.9);
  if (q < 0.15) return { kind: 'miss', q };
  if (Math.abs(vy) > 0.45 && Math.random() < 0.5) return { kind: 'play', bunt: true, popup: true, q, dir: rnd(-20, 20), ev: 45, launch: 70, dist: rnd(6, 14), bases: 0, res: 'バント失敗' };
  if (Math.random() < 0.12 + 0.18 * (1 - q)) return { kind: 'foul', bunt: true, q, dir: (Math.random() < 0.5 ? -1 : 1) * rnd(50, 75), ev: 40, launch: 2, dist: rnd(5, 15) };
  return { kind: 'play', bunt: true, q, dir: rnd(-35, 35), ev: 40 + 20 * q, launch: 0, dist: rnd(9, 17), bases: 0, res: 'バント' };
}
/* returns { t: result text, good: good for the batting side, thr: bases the defense throws to } */
function buntResult(c, B, squeeze) {
  if (c.popup) return { t: out('バント失敗（小フライ）'), good: false };
  if (squeeze) {
    if (Math.random() < 0.15) { const t = advance(1, 'スクイズ成功！ 内野安打'); G.hits--; return { t, good: true }; }
    endPA(); G.outs++;
    G.bases = [0, B[0], B[1]]; G.runs++;
    return { t: 'スクイズ成功！ 1点', good: true, thr: [1] };
  }
  const r = Math.random();
  if (!(B[0] || B[1] || B[2])) {
    if (r < 0.3) return { t: advance(1, 'バントヒット'), good: true };
    return { t: out('バントアウト'), good: false, thr: [1] };
  }
  if (r < 0.12) return { t: advance(1, 'バントヒット'), good: true };
  const chain = B[0] ? (B[1] ? (B[2] ? 2 : 1) : 0) : -1;       // highest base in the forced chain
  if (r < 0.27 && chain >= 0) {                                 // lead forced runner is cut down
    endPA(); G.outs++;
    if (G.outs >= 3) return { t: endInning('バント失敗（封殺）'), good: false, thr: chain < 2 ? [chain + 2] : null };
    const nb = [1, 0, 0];
    for (let i = 0; i < 3; i++) { if (!B[i] || i === chain) continue; if (i < chain) nb[i + 1] = 1; else nb[i] = 1; }
    G.bases = nb;
    return { t: 'バント失敗（封殺）', good: false, thr: chain < 2 ? [chain + 2] : null };
  }
  endPA(); G.outs++;
  if (G.outs >= 3) return { t: endInning('送りバント'), good: false, thr: [1] };
  const sc = B[1] && B[2] ? 1 : 0;
  G.bases = [0, B[0], B[1] || B[2] ? 1 : 0]; G.runs += sc;
  return { t: '送りバント成功' + (sc ? ' 1点' : ''), good: true, thr: [1] };
}
function isBunting() {
  if (mode === 'bat' && phase === 'wait') return sign === 'bunt' || sign === 'squeeze';
  return curBunt && (phase === 'fly' || phase === 'result');
}
function buntGrip() {
  let C = V(0, ZY0 + 0.05, 0.05);
  if (mode === 'bat' && swing && swing.bunt) C = swing.C.clone();
  else if (mode === 'pit' && ball && ball.cpu && ball.cpu.buntC) C = ball.cpu.buntC.clone();
  if (shownLeft) C.x = -C.x;                                    // planned in right-handed space; batterJ mirrors it back
  const dir = V(1, 0.1, -0.08).normalize();
  const G0 = C.addScaledVector(dir, -0.42); G0.z = 0.05;
  return { G: G0, dir };
}

/* ---- pickoffs ---- */
function startPickoff(now, isOut) {
  const base = G.bases[0] ? 1 : 2;
  const from = squashJ(pitcherJ(0), MOUND_Y).hR.clone(), to = BASE_PT[base];
  pickoff = { base, from, to, t0: now + 0.2, dur: from.distanceTo(to) / 26, out: isOut, done: false };
  phase = 'pick'; setHint('牽制！');
}
function tryCpuPickoff(now) {
  if (online || mode !== 'bat' || !(G.bases[0] || G.bases[1])) return false;
  if (G.pickPa !== G.pa) { G.pickPa = G.pa; G.pickN = 0; }
  if (G.pickN >= 2 || Math.random() > (runSign() ? 0.3 : 0.15)) return false;
  G.pickN++;
  startPickoff(now, Math.random() < (sign === 'steal' || sign === 'run' ? 0.3 : 0.05));
  return true;
}
function userPickoff() {
  if (mode !== 'pit' || phase !== 'ready' || !(G.bases[0] || G.bases[1])) return;
  if (online) {   // the pitcher's device decides and tells the batter's device
    const planned = onl.oppSign === 'steal' || onl.oppSign === 'run', out = Math.random() < (planned ? 0.4 : 0.07);
    startPickoff(now_(), out); send('pick', { out }); return;
  }
  const planned = cpuStealPlan;
  startPickoff(now_(), Math.random() < (planned ? 0.4 : 0.07));
  if (planned && Math.random() < 0.5) cpuStealPlan = false;     // the runner gets scared off
}
function stepPickoff(now) {
  const pk = pickoff;
  if (!pk || pk.done || now < pk.t0 + pk.dur + 0.1) return;
  pk.done = true; sfx.pop();
  const good = mode === 'pit';                                  // a pickoff out is good news for the pitcher
  if (pk.out) {
    const ended = runnerOut(pk.base - 1);
    queueBanner(now, ended ? endInning('牽制アウト！') : '牽制アウト！', '', good ? 'g' : 'b', good ? 0.6 : 0);
    sign = null; cpuStealPlan = false;
  } else showBanner('牽制', 'セーフ', 'n');
  phase = 'result'; nextAt = now + 1.4;
}

/* ---- per-frame: running runners, the throw ball, and the follow camera ---- */
function updateRunning(now) {
  camShot = null;
  const s = (steal && phase === 'fly') ? steal : (stealAnim && pendBanner ? stealAnim : null);
  let th = null;
  if (s) {
    s.run.forEach(i => {
      const f = runnerF[i], [sx, sz] = RUNPOS[i], [tx, tz] = NEXT_BASE[i];
      const k = clamp((now - s.t0) / (s.runEnd - s.t0), 0, 1);
      const x = lerp(sx, tx, k), z = lerp(sz, tz, k), yaw = Math.atan2(tx - sx, tz - sz);
      f.g.visible = true;
      poseFig(f, squashJ(fielderJ(x, z, yaw, now * 12 + i, k < 1 ? 1 : 0, 0, 0), 0), yaw, yaw);
    });
    th = s.throw;
  }
  if (!th && pickoff) th = pickoff;
  throwMesh.visible = false;
  if (th && now < th.t0 + th.dur + 0.8) {                       // hold one wide shot of the throw and the runners
    if (!th.shot) th.shot = frameShot([th.from, th.to].concat(s ? s.run.map(i => V(RUNPOS[i][0], 0.5, RUNPOS[i][1])) : []), th.t0 - 0.1);
    camShot = th.shot;
  }
  if (th && now >= th.t0) {
    const k = clamp((now - th.t0) / th.dur, 0, 1);
    throwMesh.position.lerpVectors(th.from, th.to, k); throwMesh.position.y += 2.5 * k * (1 - k);
    throwMesh.visible = true;
  }
}
/* footer strategy buttons */
function reliefOption() {
  if (mode !== 'pit' || phase !== 'ready') return null;
  const P = curPitcher();
  return P.next && P.sta < P.max * 0.7 ? ['relief', '投手交代 → ' + P.next[0]] : null;
}
function armed(k) { return sign === k || (k === 'crit' && critArm) || (k === 'vn' && vanishArm); }
function actOptions() {
  if (!G) return [];
  const o = [];
  if (mode === 'bat') {
    if (phase === 'wait') {
      const st = stealers().length;
      if (st) o.push(['steal', st > 1 ? 'ダブルスチール' : '盗塁'], ['run', 'エンドラン']);
      o.push(['bunt', 'バント']);
      if (G.bases[2] && G.outs < 2) o.push(['squeeze', 'スクイズ']);
    }
    if ((phase === 'wait' || (phase === 'fly' && ball && !ball.done && !swing)) && G.skill.crit > 0) o.push(['crit', '会心の一振り ' + G.skill.crit]);
    return o;
  }
  if (phase === 'ready') {
    if (G.bases[0] || G.bases[1]) o.push(['pick', '牽制する']);
    if (G.skill.vn > 0) o.push(['vn', '消える魔球 ' + G.skill.vn]);
    const rl = reliefOption(); if (rl) o.push(rl);
  }
  return o;
}
function refreshAct() {
  // The row keeps its height even when empty (and while the ball is in flight), so the stadium view never resizes mid-pitch.
  const o = actOptions(), el = $('#acts'), none = false;
  const key = o.map(x => x.join(':')).join() + '|' + sign + '|' + critArm + vanishArm;
  if (el.dataset.k === key) return;
  el.dataset.k = key; el.innerHTML = ''; el.hidden = none; el.classList.toggle('idle', !o.length);
  o.forEach(([k, label]) => {
    const b = document.createElement('button');
    b.className = 'chip' + (armed(k) ? ' on' : ''); b.dataset.k = k; b.textContent = label;
    el.appendChild(b);
  });
  if (mode === 'bat' && phase === 'wait') setHint(sign ? 'サイン：' + SIGN_HINT[sign] : '投手が投げたら、ボールが通る位置をタップして打つ');
}
$('#acts').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  audioInit();
  const k = b.dataset.k;
  if (k === 'pick') userPickoff();
  else if (k === 'relief') userRelief();
  else if (k === 'crit') critArm = !critArm;
  else if (k === 'vn') vanishArm = !vanishArm;
  else if (mode === 'bat' && phase === 'wait') { sign = sign === k ? null : k; if (online) send('sign', { s: sign, n: onl.pn }); }
});
