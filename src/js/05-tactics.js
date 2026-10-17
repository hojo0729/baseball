
/* ===== strategy and running game: steal, double steal, hit-and-run, bunt, squeeze, pickoffs ===== */
const BASE_PT = { 1: V(19.4, 1.2, -19.4), 2: V(0, 1.2, -38.8), 3: V(-19.4, 1.2, -19.4) };
const throwMesh = new THREE.Mesh(new THREE.SphereGeometry(BALL_R * 2.2, 12, 8), mat('#ffffff', { roughness: 0.5 }));
throwMesh.visible = false; scene.add(throwMesh);
let sign = null;               // batting sign chosen before the pitch: steal | run | bunt | squeeze
let curBunt = false;           // the batter is squared to bunt on this pitch
let steal = null, stealAnim = null, cpuStealPlan = false, cpuBuntPlan = false, pickoff = null;
let stealJump = 0, stealMsg = '', timeOut = false;   // 盗塁のスタートの良し悪し / 打者のタイム
/* 盗塁（CPUが投げるとき）：投手のモーションに合わせて押す。動く前は早すぎて牽制される。足を上げた瞬間が一番いい */
function stealPress(now) {
  if (sign === 'steal' || timeOut) { if (timeOut) setHint('タイム中は走れません'); return; }
  const st = stealers(); if (!st.length) return;
  const k = pitcherK(now), sp = G.bases[st[0]] || 3;
  if (k <= 0.03) {
    sign = null; stealJump = 0; stealMsg = '';
    showBanner('スタートが早い！', '牽制球', 'n');
    startPickoff(now, Math.random() < 0.6 - (sp - 3) * 0.08);
    return;
  }
  sign = 'steal';
  stealJump = clamp(0.12 - Math.max(0, k - 0.25) * 0.6, -0.3, 0.12);
  stealMsg = k <= 0.3 ? '好スタート！' : k <= 0.55 ? 'まずまずのスタート' : 'スタートが遅れた…';
}
function toggleTime() {
  if (online) {
    if (!timeOut && !(onl.timeLeft > 0)) { setHint('タイムはもう使えません（1試合3回）'); return; }
    timeOut = !timeOut; if (timeOut) onl.timeLeft--;
    send('time', { on: timeOut });
  } else {
    timeOut = !timeOut;
    if (!timeOut) nextAt = Math.max(nextAt, now_() + 1.2);
  }
}
const runSign = () => sign === 'steal' || sign === 'run' || sign === 'squeeze';
const SIGN_HINT = {
  steal: '盗塁のサイン。投球と同時に走者が走る（相手に見える）',
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
/* how often a CPU runner goes: fast runners steal more */
function cpuStealChance() { const st = stealers(); return st.length ? 0.06 + (G.bases[st[0]] || 3) * 0.055 + (trT('bat') === 'neko' ? 0.04 : 0) : 0; }
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
  const jump = stealJump; stealJump = 0; stealMsg = '';
  if (!s) return '';
  let msg = '';
  if (s === 'bunt' || s === 'squeeze') { curBunt = true; msg = mode === 'pit' ? 'バントの構え！' : ''; }
  if (s === 'steal' || s === 'run') {
    const run = stealers();
    if (run.length) {
      steal = { run, lead: run[0], t0: now, runEnd: now + 3.4, hitRun: s === 'run', jump: s === 'steal' && !online && mode === 'bat' ? jump : 0 };
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
    const safe = Math.random() < 0.05 + ((G.bases[2] || 3) - 3) * 0.03;   // a fast runner sometimes beats the tag
    s.throw = null; s.arrive = now + 0.5; s.runEnd = now + 0.4;
    stealAnim = s; G.bases[2] = 0;
    let ended = false;
    if (safe) G.runs++; else { G.outs++; if (G.outs >= 3) { G.b = 0; G.s = 0; ended = true; } }
    let label = safe ? 'ホームイン！ 1点' : 'スクイズ失敗';
    if (ended) label = endInning(label);
    return { label, safe, ended, arrive: s.arrive };
  }
  // 盗塁の成否: 球の速さと変化（捕りにくさ）、走者の足、キャッチャーの肩、コース（低めは送球が遅れる）
  const rs = G.bases[s.lead] || 3, arm = ROSTER[teamsNow().fld].arm || 3, ly = ball.T[1];
  let p = 0.62 + (128 - ball.speed) / 100 * 0.7 + TYPES[ball.key].hard * 0.08
    + (rs - 3) * 0.08 - (arm - 3) * 0.06 + (ly > 0.6 ? 0.04 : ly < -0.6 ? -0.03 : 0)
    - (s.run.length > 1 ? 0.05 : 0) - (s.hitRun ? 0.08 : 0) + (trT('bat') === 'neko' ? 0.1 : 0) + (s.jump || 0);
  p = clamp(p, 0.15, 0.95);
  const safe = Math.random() < p, tgt = s.lead + 2;              // first -> 2B, second -> 3B
  const from = V(0, 1.2, 0.8), to = BASE_PT[tgt], t0 = now + 0.15, dur = from.distanceTo(to) / 33;
  s.throw = { from, to, t0, dur };
  s.arrive = t0 + dur; s.runEnd = s.arrive + (safe ? -0.25 : 0.35);
  sfx.slide(s.arrive - now - 0.45);
  stealAnim = s;
  const nb = G.bases.slice(), B0 = G.bases.slice();
  s.run.forEach(i => { nb[i] = 0; if (i !== s.lead || safe) nb[i + 1] = B0[i] || 3; });
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
  const bsp = curBatter().sp;
  if (c.popup) return { t: out('バント失敗（小フライ）'), good: false };
  if (squeeze) {
    if (Math.random() < 0.06) { const t = advance(1, 'スクイズ成功！ 内野安打'); G.hits--; return { t, good: true }; }
    endPA(); G.outs++;
    G.bases = [0, B[0], B[1]]; G.runs++;
    return { t: 'スクイズ成功！ 1点', good: true, thr: [1] };
  }
  const r = Math.random();
  if (!(B[0] || B[1] || B[2])) {
    if (r < 0.08) return { t: advance(1, 'バントヒット'), good: true };
    return { t: out('バントアウト'), good: false, thr: [1] };
  }
  if (r < 0.04) return { t: advance(1, 'バントヒット'), good: true };
  const chain = B[0] ? (B[1] ? (B[2] ? 2 : 1) : 0) : -1;       // highest base in the forced chain
  if (r < 0.27 && chain >= 0) {                                 // lead forced runner is cut down
    endPA(); G.outs++;
    if (G.outs >= 3) return { t: endInning('バント失敗（封殺）'), good: false, thr: chain < 2 ? [chain + 2] : null };
    const nb = [bsp, 0, 0];
    for (let i = 0; i < 3; i++) { if (!B[i] || i === chain) continue; if (i < chain) nb[i + 1] = B[i]; else nb[i] = B[i]; }
    G.bases = nb;
    return { t: 'バント失敗（封殺）', good: false, thr: chain < 2 ? [chain + 2] : null };
  }
  endPA(); G.outs++;
  if (G.outs >= 3) return { t: endInning('送りバント'), good: false, thr: [1] };
  const sc = B[1] && B[2] ? 1 : 0;
  G.bases = [0, B[0], B[1] || B[2] || 0]; G.runs += sc;
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
  startPickoff(now, runSign() && Math.random() < 0.3);   // 走る指示を出していないときは刺されない
  return true;
}
function userPickoff() {
  if (mode !== 'pit' || phase !== 'ready' || !(G.bases[0] || G.bases[1])) return;
  if (online) {   // the pitcher's device decides and tells the batter's device
    const planned = onl.oppSign === 'steal' || onl.oppSign === 'run', out = planned && Math.random() < 0.4;   // 走る気配がないときは刺せない
    startPickoff(now_(), out); send('pick', { out }); return;
  }
  const planned = cpuStealPlan;
  startPickoff(now_(), planned && Math.random() < 0.4);
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
  if (play && play.pend) return play.pend.opts.map(x => ['thr' + x.b, x.name + '\n' + x.sub + ' ' + (x.p >= 0.7 ? '◎' : x.p >= 0.5 ? '○' : '△')]);   // スロー中：送球先
  const o = [];
  if (mode === 'bat') {
    if (phase === 'wait') {
      const st = stealers().length;
      if (st) o.push(['steal', (st > 1 ? 'ダブルスチール' : '盗塁') + ' 走' + GRADE[G.bases[stealers()[0]] || 3]], ['run', 'エンドラン']);
      o.push(['bunt', 'バント']);
      if (G.bases[2] && G.outs < 2) o.push(['squeeze', 'スクイズ']);
      if (timeOut || (pitcherK(now_()) <= 0 && (!online || onl.timeLeft > 0))) o.push(['time', timeOut ? 'プレイ再開' : 'タイム']);
    }
    if ((phase === 'wait' || (phase === 'fly' && ball && !ball.done && !swing)) && G.skill.crit > 0) o.push(['crit', '会心の一振り ' + G.skill.crit]);
    const ph = phOption(); if (ph) o.push(ph);
    return o;
  }
  if (phase === 'ready') {
    if (G.bases[0] || G.bases[1]) o.push(['pick', '牽制する']);
    if (G.skill.vn > 0) o.push(['vn', '消える魔球 ' + G.skill.vn]);
    const cl = closerOption(); if (cl) o.push(cl);
    const rl = reliefOption(); if (rl) o.push(rl);
  }
  return o;
}
function refreshAct() {
  // The row keeps its height even when empty (and while the ball is in flight), so the stadium view never resizes mid-pitch.
  const o = actOptions(), el = $('#acts'), none = false;
  const key = o.map(x => x.join(':')).join() + '|' + sign + '|' + critArm + vanishArm + stealMsg + timeOut;
  if (el.dataset.k === key) return;
  el.dataset.k = key; el.innerHTML = ''; el.hidden = none; el.classList.toggle('idle', !o.length);
  o.forEach(([k, label]) => {
    const b = document.createElement('button');
    b.className = 'chip' + (/^(crit|vn|closer|ph)$/.test(k) ? ' sp' : '') + (armed(k) ? ' on' : ''); b.dataset.k = k; b.textContent = label;
    el.appendChild(b);
  });
  if (mode === 'bat' && phase === 'wait') setHint(timeOut ? 'タイム中。作戦をゆっくり選んで「プレイ再開」' : stealMsg ? '盗塁：' + stealMsg
    : sign ? 'サイン：' + SIGN_HINT[sign] : stealers().length && !online ? '盗塁は投手が足を上げた瞬間に押すと好スタート（早すぎると牽制）' : '投手が投げたら、ボールが通る位置をタップして打つ');
}
$('#acts').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  audioInit();
  const k = b.dataset.k;
  if (/^thr\d$/.test(k)) pickThrow(+k[3], false);
  else if (k === 'pick') userPickoff();
  else if (k === 'relief') userRelief();
  else if (k === 'closer') userCloser();
  else if (k === 'ph') userPinch();
  else if (k === 'crit') critArm = !critArm;
  else if (k === 'vn') vanishArm = !vanishArm;
  else if (k === 'time') { if (mode === 'bat' && phase === 'wait') toggleTime(); }
  else if (k === 'steal' && !online && mode === 'bat' && phase === 'wait') stealPress(now_());
  else if (mode === 'bat' && phase === 'wait') { sign = sign === k ? null : k; if (online) send('sign', { s: sign, n: onl.pn }); }
});

/* ===== 送球先の選択：ゴロでランナーがいるとき、守備側(自分)がスローモーションで投げ先を選ぶ =====
   ランナー1塁(→2塁フォース/ゲッツー)、3塁(→本塁タッチ)、満塁(→本塁フォース)など。◎○△は成功しやすさ。
   時間切れ（ボールが野手に届くまで）だと、いちばん確実な塁へ「迷った」分だけ不利に投げる。 */
function thrWanted(c, p, B0, sg) {
  return !online && mode === 'pit' && !sg && p.grounder && !c.bunt && c.kind === 'play' && c.bases <= 1 && !!(B0[0] || B0[2]);
}
function thrOptions(B0, c) {
  const bsp = curBatter().sp, hitG = c.res === 'ゴロヒット';
  const slow = clamp((128 - c.ev) / 120, 0, 0.35);                  // ぼてぼて（打球が遅い）ほど処理が遅れて不利
  const hit = hitG ? 0.6 : 1;
  const forced = [!!B0[0], !!(B0[0] && B0[1]), !!(B0[0] && B0[1] && B0[2])];
  const o = [{ b: 1, p: hitG ? 0.05 : clamp(0.92 - 0.08 * (bsp - 3) - slow, 0.25, 0.97), name: '1塁', sub: '打者' }];
  for (let i = 0; i < 3; i++) if (forced[i]) o.push({ b: i + 2, i, force: true, p: clamp(0.9 - 0.02 * i - 0.06 * (B0[i] - 3) - slow * 0.6, 0.2, 0.95) * hit, name: i === 2 ? '本塁' : (i + 2) + '塁', sub: 'フォース' });
  if (B0[2] && !forced[2]) o.push({ b: 4, i: 2, tag: true, p: clamp(0.55 - 0.09 * (B0[2] - 3) - slow * 0.5, 0.12, 0.8) * hit, name: '本塁', sub: 'タッチ' });
  return o;
}
function thrStart(c, p, B0, now) {
  const opts = thrOptions(B0, c).sort((a, b) => b.b - a.b);
  const Tn = p.T, Ts = clamp(Tn * 2.8, 3.2, 6);
  p.sp = null; p.endY = BALL_R;
  p.pend = { c, B0, opts, Tn, Ts, sub: '' };
  p.T = Ts;                                                       // 打球がゆっくり転がる＝スローモーション
  setHint('スロー！ どこに投げる？');
}
function stepThrowPick(now) {
  const p = play, pe = p.pend, left = (0.92 - (now - p.start) / p.T) * p.T;
  if (left > 0) { setHint('スロー！ どこに投げる？ あと ' + left.toFixed(1) + '秒'); return; }
  let best = pe.opts[0];
  pe.opts.forEach(o => { if (o.p > best.p) best = o; });
  pickThrow(best.b, true);
}
function pickThrow(b, late) {
  const p = play; if (!p || !p.pend) return;
  const pe = p.pend, now = now_(), opt = pe.opts.find(o => o.b === b) || pe.opts[pe.opts.length - 1];
  p.pend = null;
  const r = thrResolve(pe, opt, late);
  const u0 = clamp((now - p.start) / p.T, 0, 1);
  p.T = pe.Tn; p.start = now - u0 * pe.Tn;                         // 同じ位置から通常速度に戻す
  addThrows(p, r.thr);
  p.run = pe.B0;
  const delay = (1 - u0) * pe.Tn + p.throwEnd;
  queueBanner(now + delay, r.t, pe.sub, r.good ? 'b' : 'g', r.cheer);
  nextAt = now + Math.max(1.8, delay + 1.7);
  setHint('');
}
function thrResolve(pe, opt, late) {
  const B = pe.B0.slice(), c = pe.c, bsp = curBatter().sp;
  const ok = Math.random() < opt.p * (late ? 0.8 : 1);
  const thr = [opt.b];
  if (opt.b === 1) {                                              // 一塁：打者を刺す。ランナーは従来どおり進む
    if (ok) return { t: groundOut('ゴロアウト'), thr, good: false, cheer: 0 };
    return { t: advance(1, 'ゴロヒット'), thr, good: true, cheer: 0 };
  }
  const forced = [!!B[0], !!(B[0] && B[1]), !!(B[0] && B[1] && B[2])];
  const outIdx = ok ? opt.i : -1;
  endPA();
  const nb = [0, 0, 0]; let sc = 0;
  for (let i = 0; i < 3; i++) if (B[i] && !forced[i] && i !== outIdx) {
    if ((opt.tag || opt.b !== 4) && i === 2) sc++;                // タッチ失敗または他塁へ送球：三塁ランナーが生還
    else nb[i] = B[i];
  }
  for (let i = 0; i < 3; i++) if (forced[i] && i !== outIdx) { if (i === 2) sc++; else nb[i + 1] = B[i]; }
  nb[0] = bsp;
  const nm = opt.name;
  let label, cheer = 0, good = !ok;
  if (ok) {
    G.outs++;
    if (G.outs >= 3) return { t: endInning(nm + (opt.tag ? 'でタッチアウト' : 'でフォースアウト')), thr, good: false, cheer: 0.6 };
    label = nm + (opt.tag ? 'でタッチアウト' : 'でフォースアウト'); cheer = 0.3;
    if (opt.force && Math.random() < clamp(pe.opts[pe.opts.length - 1].p * 0.6, 0.1, 0.7)) {   // 一塁へ転送してゲッツー
      thr.push(1); G.outs++; nb[0] = 0; cheer = 0.8;
      if (G.outs >= 3) return { t: endInning('ゲッツー'), thr, good: false, cheer };
      label = 'ゲッツー';
    }
  } else label = opt.tag ? 'ホームでセーフ' : 'オールセーフ';
  G.bases = nb; G.runs += sc;
  return { t: label + (sc ? ' ' + sc + '点' : ''), thr, good, cheer };
}
