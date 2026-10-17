(() => {
'use strict';
const $ = s => document.querySelector(s);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = (a, b) => a + Math.random() * (b - a);
const lerp = (a, b, t) => a + (b - a) * t;
const ease = t => t * t * (3 - 2 * t);
const easeOut = t => 1 - (1 - t) * (1 - t);
const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
const now_ = () => performance.now() / 1000;
const D2R = Math.PI / 180;

if (!window.THREE) {
  $('#ot').textContent = '読み込みエラー';
  $('#od').textContent = '3D描画ライブラリを読み込めませんでした。通信状態を確認して再読み込みしてください。';
  $('#goBtn').hidden = true;
  return;
}
const V = (x, y, z) => new THREE.Vector3(x, y, z);
function rotY(v, a) { const c = Math.cos(a), s = Math.sin(a); return V(v.x * c + v.z * s, v.y, -v.x * s + v.z * c); }

/* world in meters: home plate front edge at z=0, pitcher toward -z, camera behind home at +z, x to the camera's right */
const RUBBER_Z = -18.44, MOUND_Y = 0.25, X0 = -0.8;   // X0: right-handed batter's stance line
const ZW = 0.34, ZY0 = 0.78, ZH = 0.34;               // strike zone half width, center height, half height (game-sized, larger than real)
const SLOW = 2.3;          // game time runs slower than real life so the ball is hittable
const SWING_LEAD = 0.1;    // tap -> bat reaches the ball
const DELIVER = 0.7;       // user's pitching motion length
const zoneToWorld = (tx, ty) => V(tx * ZW, ZY0 - ty * ZH, 0);

/* ---- sound ---- */
let ac = null;
function audioInit() {
  if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ac = null; } }
  if (ac && ac.state === 'suspended') ac.resume().catch(() => {});
  bgmStartIfOn();
}

/* ---- 応援のリズム：録音ではなく、その場で鳴らす（外部ファイルなし） ----
   4つ打ちのドラム、手拍子、ブラス風の応援フレーズ（2小節のループ）。音量は効果音より低い。 */
const BGM_BPM = 122, BGM_BEAT = 60 / BGM_BPM, BGM_VOL = 0.09;
const BGM_MEL = [[0, 72, 0.5], [0.5, 72, 0.5], [1, 72, 1], [2, 76, 1], [3, 79, 1], [4, 79, 0.5], [4.5, 77, 0.5], [5, 76, 1], [6, 74, 1], [7, 72, 1]];
const BGM_BASS = [36, 36, 36, 36, 43, 43, 43, 43];
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
let bgmOn = false, bgmBuf = null, bgmGain = null, bgmNext = 0, bgmBeat = 0;
function bgmWanted() { try { return localStorage.getItem('yakyu-bgm') !== '0'; } catch (e) { return true; } }
function bgmInit() {
  if (bgmGain || !ac) return;
  bgmGain = ac.createGain(); bgmGain.gain.value = BGM_VOL; bgmGain.connect(ac.destination);
  // a fixed noise buffer from a small generator, so nothing here touches Math.random (which the online seed uses)
  const n = ac.sampleRate, b = ac.createBuffer(1, n, ac.sampleRate), ch = b.getChannelData(0);
  let s = 12345; for (let i = 0; i < n; i++) { s = (s * 1103515245 + 12345) & 0x7fffffff; ch[i] = s / 0x7fffffff * 2 - 1; }
  bgmBuf = b;
}
function bgmNoiseAt(t, d, vol, fc) {
  const src = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
  src.buffer = bgmBuf; f.type = 'bandpass'; f.frequency.value = fc; f.Q.value = 1.2;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  src.connect(f); f.connect(g); g.connect(bgmGain); src.start(t, Math.random() * 0.5); src.stop(t + d + 0.02);
}
function bgmKick(t) {
  const o = ac.createOscillator(), g = ac.createGain();
  o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
  g.gain.setValueAtTime(0.9, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
  o.connect(g); g.connect(bgmGain); o.start(t); o.stop(t + 0.2);
}
function bgmBrass(f, t, d, vol) {
  const o = ac.createOscillator(), o2 = ac.createOscillator(), fl = ac.createBiquadFilter(), g = ac.createGain();
  o.type = 'sawtooth'; o2.type = 'square'; o.frequency.value = f; o2.frequency.value = f * 1.004;
  fl.type = 'lowpass'; fl.frequency.setValueAtTime(900, t); fl.frequency.exponentialRampToValueAtTime(2200, t + 0.05);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.03);
  g.gain.exponentialRampToValueAtTime(vol * 0.7, t + d * 0.8); g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.05);
  o.connect(fl); o2.connect(fl); fl.connect(g); g.connect(bgmGain);
  o.start(t); o2.start(t); o.stop(t + d + 0.1); o2.stop(t + d + 0.1);
}
function bgmBeatAt(n, t) {
  const k = n % 8, q = n % 4;
  if (q === 0 || q === 2) bgmKick(t);
  if (q === 1 || q === 3) { bgmNoiseAt(t, 0.16, 0.55, 1500); bgmNoiseAt(t + 0.012, 0.1, 0.3, 2600); }   // 手拍子
  bgmNoiseAt(t + BGM_BEAT / 2, 0.04, 0.12, 7000);                                                     // ハイハット（裏拍）
  bgmBrass(mtof(BGM_BASS[k]), t, BGM_BEAT * 0.9, 0.12);
  BGM_MEL.forEach(([s, m, len]) => { if (Math.floor(s) === k) bgmBrass(mtof(m), t + (s - k) * BGM_BEAT, len * BGM_BEAT * 0.9, 0.2); });
}
function bgmTick() {
  if (!bgmOn || !ac || !bgmGain) return;
  if (bgmNext < ac.currentTime) bgmNext = ac.currentTime + 0.1;
  while (bgmNext < ac.currentTime + 0.3) { bgmBeatAt(bgmBeat, bgmNext); bgmBeat++; bgmNext += BGM_BEAT; }
}
function bgmStartIfOn() {
  if (!ac || !bgmWanted()) return;
  bgmInit();
  if (!bgmOn) { bgmOn = true; bgmNext = 0; }
}
setInterval(bgmTick, 90);
function burst(f, d, vol, type) {
  if (!ac) return;
  try {
    const t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(f, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(40, f * 0.4), t + d);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + d);
    o.connect(g); g.connect(ac.destination);
    o.start(t); o.stop(t + d);
  } catch (e) {}
}
function noise(d, vol, fc, rise) {
  if (!ac) return;
  try {
    const n = Math.floor(ac.sampleRate * d), b = ac.createBuffer(1, n, ac.sampleRate), ch = b.getChannelData(0);
    for (let i = 0; i < n; i++) ch[i] = Math.random() * 2 - 1;
    const s = ac.createBufferSource(); s.buffer = b;
    const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = fc; f.Q.value = 0.8;
    const g = ac.createGain(), t = ac.currentTime;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + d * (rise || 0.08));
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    s.connect(f); f.connect(g); g.connect(ac.destination); s.start(t);
  } catch (e) {}
}
const sfx = {
  crack() { burst(1400, 0.09, 0.16, 'square'); burst(180, 0.14, 0.2, 'triangle'); noise(0.08, 0.25, 2500, 0.05); },
  pop() { burst(240, 0.09, 0.2, 'triangle'); noise(0.07, 0.3, 900, 0.05); },
  swish() { noise(0.16, 0.14, 1800, 0.5); },
  cheer(k) { noise(0.9 + k * 0.7, 0.05 + k * 0.05, 700, 0.35); }
};

/* ---- pitch types. brk: zone units the ball breaks late (A = where it seems to head). gf: gravity drop factor ---- */
const TYPES = {
  str: { name: 'ストレート',     short: 'ストレート', ico: '↑',  min: 128, max: 152, n: 3,   brk: [0, 0.05],     gf: 0.45, hard: 0,    w: 26, ax: [1, 0, 0],    rps: 40 },
  two: { name: 'ツーシーム',     short: 'ツーシーム', ico: '↖',  min: 125, max: 147, n: 3,   brk: [0.32, -0.05], gf: 0.7,  hard: 0.1,  w: 8,  ax: [1, 0.5, 0],  rps: 35 },
  cut: { name: 'カットボール',   short: 'カット',     ico: '↗',  min: 127, max: 145, n: 5,   brk: [-0.4, 0.05],  gf: 0.6,  hard: 0.3,  w: 8,  ax: [1, -0.6, 0], rps: 40 },
  sli: { name: 'スライダー',     short: 'スライダー', ico: '→', min: 112, max: 131, n: 4,   brk: [-0.95, 0.1],  gf: 0.8,  hard: 0.5,  w: 14, ax: [0.3, 1, 0],  rps: 45 },
  cur: { name: 'カーブ',         short: 'カーブ',     ico: '↘', min: 92,  max: 114, n: 3.2, brk: [-0.3, -1.15], gf: 1.0,  hard: 0.5,  w: 10, ax: [1, 0.3, 0],  rps: -40 },
  frk: { name: 'フォーク',       short: 'フォーク',   ico: '↓',  min: 122, max: 140, n: 5,   brk: [0, -0.95],    gf: 0.9,  hard: 0.6,  w: 8,  ax: [1, 0, 0],    rps: 6 },
  chg: { name: 'チェンジアップ', short: 'チェンジ',   ico: '↑ゆっくり',  min: 104, max: 124, n: 3,   brk: [0.15, -0.4],  gf: 0.85, hard: 0.45, w: 9,  ax: [1, 0.5, 0],  rps: 20 },
  sht: { name: 'シュート',       short: 'シュート',   ico: '←', min: 122, max: 140, n: 4,   brk: [0.85, 0.08],  gf: 0.7,  hard: 0.35, w: 6,  ax: [0.3, -1, 0], rps: -35 },
  snk: { name: 'シンカー',       short: 'シンカー',   ico: '↙',  min: 120, max: 138, n: 4,   brk: [0.55, -0.65], gf: 0.9,  hard: 0.4,  w: 6,  ax: [0.6, -1, 0], rps: -30 },
  gou: { name: '剛速球',         short: '剛速球',     ico: '↑速く', min: 155, max: 168, n: 3, brk: [0, 0.12], gf: 0.25, hard: 0.3, w: 2,  ax: [1, 0, 0],    rps: 55 },
  knk: { name: 'ナックル',       short: 'ナックル',   ico: 'ジグザグ', min: 78,  max: 104, n: 3,   brk: [0, -0.2],     gf: 0.9,  hard: 1,    w: 3,  ax: [1, 0, 0],    rps: 1, wob: 0.34 }
};

/* ---- game state ---- */
let mode = 'bat', ptype = 'str', story = null;
let G = null;
let phase = 'idle';            // idle | wait | deliver | fly | result
let ball = null, swing = null, play = null, batAnim = null, pending = null, flick = null, aim = null;
let nextAt = 0, deliverStart = 0, shakeUntil = 0, shakeAmp = 0, pendBanner = null;
let critArm = false, vanishArm = false;   // 会心の一振り / 消える魔球：次の一球で使うと決めた状態

function newGame() { G = { inning: 1, outs: 0, b: 0, s: 0, runs: 0, bases: [0, 0, 0], hits: 0, hr: 0, so: 0, over: false, pa: 0, lastAnn: -1, skill: { crit: 2, vn: 2 }, diceInn: -1 }; critArm = vanishArm = false; hud(); }

/* ---- サイコロ：奇数の回の攻撃側が振る。出た目でボーナス（両端末とも同じ目になる） ---- */
const DICE_FX = {
  1: () => 'はずれ…',
  2: () => { G.bonus = { inn: G.inning, pa: G.pa, m: 1, p: 0 }; return '次の打者　ミート+1'; },
  3: () => { G.bonus = { inn: G.inning, pa: G.pa, m: 0, p: 1 }; return '次の打者　パワー+1'; },
  4: () => { if (G.bases[0]) { G.runs += 1; return '1点ボーナス'; } G.bases[0] = 1; return 'ランナーが1塁に！'; },
  5: () => { G.runs += 1; return '1点ボーナス！'; },
  6: () => { G.runs += 2; return '2点ボーナス！！'; }
};
function rollDie() {
  if (!online) return Math.floor(Math.random() * 6) + 1;
  return withSeed(((onl.seed || 0) + G.inning * 7919) >>> 0, () => Math.floor(Math.random() * 6) + 1);
}
/* applies this inning's dice once (odd innings only). returns { v, text } or null */
function applyInningDice() {
  if (!G || G.diceInn === G.inning) return null;
  G.diceInn = G.inning;
  if (G.inning % 2 !== 1) return null;
  const v = rollDie(), text = DICE_FX[v]();
  hud();
  return { v, text };
}
let diceTimer = 0;
function showDiceBanner(d) {
  clearInterval(diceTimer);
  showBanner('サイコロ！', '', 'g');
  let n = 0;
  diceTimer = setInterval(() => {
    n++;
    if (n < 7) { $('#bt').textContent = 'サイコロ… ' + (1 + Math.floor(Math.random() * 6)); return; }   // display only
    clearInterval(diceTimer);
    $('#bt').textContent = '出た目 ' + d.v + '！';
    $('#bs').textContent = d.text;
    say(cmtLine('dice' + d.v), 2);
  }, 90);
}

function dots(id, n, on) {
  const el = $(id);
  if (el.children.length !== n) el.innerHTML = '<i></i>'.repeat(n);
  [...el.children].forEach((c, i) => c.classList.toggle('on', i < on));
}
function hud() {
  pitchIcons();
  $('#inn').textContent = Math.min(G.inning, 3) + '回';
  dots('#db', 3, G.b); dots('#ds', 2, G.s); dots('#do', 2, G.outs);
  G.bases.forEach((v, i) => $('#b' + (i + 1)).classList.toggle('on', !!v));
  $('#runs').textContent = G.runs;
  $('#slab').textContent = mode === 'bat' ? '得点' : '失点';
  if (online) {
    const sc = onlineScore();
    $('#inn').textContent = inningLabel(); $('#slab').textContent = 'しば - パン'; $('#runs').textContent = sc.home + '-' + sc.away;
  }
  updateRunners();
  updateGoal();
}
function setHint(t) { $('#hint').textContent = t; }
function showBanner(t, s, tone) {
  const b = $('#banner');
  b.className = tone;
  $('#bt').textContent = t; $('#bs').textContent = s || '';
  void b.offsetWidth;
  b.classList.add('show');
  commentBanner(t, s);
}
function hideBanner() { $('#banner').className = ''; }
function queueBanner(at, t, sub, tn, cheer) { pendBanner = { at, t, sub, tn, cheer }; }
function flushBanner() {
  if (!pendBanner) return;
  const p = pendBanner; pendBanner = null;
  stealAnim = null;
  hud(); showBanner(p.t, p.sub, p.tn);
  if (p.cheer) sfx.cheer(p.cheer);
}

/* ---- count / base logic ---- */
function endPA() { G.b = 0; G.s = 0; G.pa++; nextBatter(); }
function endInning(label) {
  if (online) { onl.score[battingSide()] += G.runs; G.runs = 0; }   // bank this half's runs for the batting team
  G.outs = 0; G.bases = [0, 0, 0]; G.inning++;
  if (G.inning > (G.maxHalf || 3)) G.over = !online || onl.score.home !== onl.score.away;   // online: extra innings until one side pulls ahead
  if (online && G.inning >= 6 && G.inning % 2 === 0 && onl.score.home > onl.score.away) G.over = true;   // home leads going into a bottom half
  return label + ' / チェンジ';
}
function out(label) {
  endPA(); G.outs++;
  return G.outs >= 3 ? endInning(label) : label;
}
/* ground ball with a runner on first: runner forced at second, batter out at first */
function doublePlay() {
  const B = G.bases.slice();
  endPA(); G.outs += 2;
  if (G.outs >= 3) return endInning('ゲッツー');
  const sc = B[2] ? 1 : 0;
  G.bases = [0, 0, B[1] ? 1 : 0]; G.runs += sc;
  return 'ゲッツー' + (sc ? ' ' + sc + '点' : '');
}
/* ground out: batter out at first, forced runners move up one base */
function groundOut(label) {
  const B = G.bases.slice();
  const res = out(label);
  if (G.outs === 0) return res;              // that out ended the inning
  let sc = 0; const nb = [0, B[1], B[2]];
  if (B[0]) { if (B[1]) { if (B[2]) sc++; nb[2] = 1; } nb[1] = 1; }
  G.bases = nb; G.runs += sc;
  return res + (B[0] ? ' 進塁' : '') + (sc ? ' ' + sc + '点' : '');
}
/* deep fly with a runner on third and fewer than two outs: runner tags up and scores */
function sacFly() {
  const res = out('犠牲フライ');
  if (G.outs === 0) return res;
  G.bases[2] = 0; G.runs++;
  return res + ' 1点';
}
function strike() { G.s++; if (G.s >= 3) { G.so++; return out('三振'); } return null; }
function ballCount() { G.b++; return G.b >= 4 ? walk() : null; }
function walk() {
  endPA();
  const B = G.bases;
  if (B[0]) { if (B[1]) { if (B[2]) G.runs++; B[2] = 1; } B[1] = 1; }
  B[0] = 1;
  return 'フォアボール';
}
function advance(n, label) {
  endPA();
  const nb = [0, 0, 0]; let sc = 0;
  for (let i = 2; i >= 0; i--) if (G.bases[i]) { const p = i + 1 + n; if (p >= 4) sc++; else nb[p - 1] = 1; }
  if (n >= 4) sc++; else nb[n - 1] = 1;
  G.runs += sc; G.bases = nb; G.hits++;
  if (n === 4) G.hr++;
  return label + (sc ? ' ' + sc + '点' : '');
}

/* ---- contact model: timing (dt, seconds) and position (d, zone units) decide quality ---- */
function contact(dt, d, vy, speed, boost, crit) {
  if (crit) dt *= 0.65;                                   // 会心の一振り：ミートの時間の幅が広がる
  const BT = curBatter(), bm = (0.7 + 0.1 * BT.m) * (BT.side === pitcherHand() ? 0.94 : 1.04);   // platoon edge vs opposite-handed pitchers
  dt /= bm; d /= bm;
  const qt = 1 - Math.pow(Math.min(1, Math.abs(dt) / 0.15), 1.5);
  const qd = 1 - Math.min(1, d / 0.8);
  const q = Math.sqrt(Math.max(0, qt) * Math.max(0, qd));
  if (q < 0.18) return { kind: 'miss', q };
  let dir = clamp(dt / 0.12 * 38 + gauss() * 6, -75, 75);
  if (BT.side === 'L') dir = -dir;                         // a left-handed hitter pulls to right field
  const launch = 12 + vy * 40 + gauss() * 3;
  const ev = 70 + 100 * q + (speed - 110) * 0.25 + (boost ? 18 : 0) + (crit ? 30 : 0) + (BT.p - 3) * 9;
  if (q < 0.32 || Math.abs(dir) > 45) {
    if (Math.abs(dir) <= 45) dir = (dir < 0 ? -1 : 1) * rnd(50, 80);
    return { kind: 'foul', q, dir, ev, launch, dist: rnd(25, 70) };
  }
  const v = ev / 3.6, th = launch * Math.PI / 180;
  const dist = launch < 5 ? 22 + q * 55 : 0.62 * v * v / 9.8 * Math.sin(2 * Math.min(th, 1.5));
  const r = Math.random();
  let res, bases = 0;
  if (launch < 5) { if (r < 0.12 + 0.55 * q) { res = 'ゴロヒット'; bases = 1; } else res = 'ゴロアウト'; }
  else if (launch < 20) {
    if (r < 0.35 + 0.6 * q) { if (q > 0.8 && Math.random() < 0.4) { res = 'ツーベース'; bases = 2; } else { res = 'ヒット'; bases = 1; } }
    else res = 'ライナーアウト';
  }
  else if (launch < 50) {
    if (dist >= 100) { res = 'ホームラン'; bases = 4; }
    else if (dist >= 75) { if (r < 0.45) { res = 'ツーベース'; bases = 2; } else res = 'フライアウト'; }
    else if (dist >= 40) { if (r < 0.28) { res = 'ヒット'; bases = 1; } else res = 'フライアウト'; }
    else res = '内野フライ';
  }
  else res = 'ポップフライ';
  return { kind: 'play', q, dir, ev, launch, dist, res, bases };
}

/* ---- pitch flight ---- */
function launchBall(o) {
  const T = TYPES[o.key], PT = curPitcher(), BRK = 0.55 + 0.15 * PT.b, hs = PT.hand === 'L' ? -1 : 1;   // a lefty's breaks are mirrored
  spendStamina(o.speed, o.key);
  commentPitch(o);
  const P0 = squashJ(pitcherJ(1), MOUND_Y).hR;
  const v = o.speed / 3.6, real = Math.abs(P0.z) / v;
  ball = {
    key: o.key, speed: o.speed, vn: !!o.vn, T: [o.tx, o.ty], P0,
    tgt: zoneToWorld(o.tx, o.ty), app: zoneToWorld(o.tx + T.brk[0] * BRK * hs, o.ty + T.brk[1] * BRK),
    n: T.n, gf: T.gf, real, dur: real * SLOW, start: now_(), done: false,
    wob: T.wob || 0, ph: rnd(0, 6.28), ph2: rnd(0, 6.28),
    axis: V(T.ax[0], T.ax[1] * hs, T.ax[2] * hs).normalize(), rps: T.rps
  };
  swing = null; play = null; batAnim = null; phase = 'fly';
  if (online) onl.pn++;
  trailPts.length = 0;
  hideBanner();
  $('#spd').textContent = Math.round(o.speed) + ' km/h';
  const hot = o.key === 'gou', magic = magicActive();
  $('#spd').classList.toggle('hot', hot);
  ballMesh.material.emissive.set(hot ? '#ff4a10' : magic ? '#7a3cff' : '#34342e');
  ballGlow.material.color.set(hot ? '#ff8a3c' : magic ? '#b48cff' : '#ffffff');
  pathMat.color.set(hot ? '#ff8a3c' : magic ? '#b48cff' : '#f4c95a');
  trail.forEach(m => m.material.color.set(hot ? '#ff8a3c' : magic ? '#b48cff' : '#eef0e4'));
  const sm = startSigns(ball.start, o.sg);
  if (mode === 'pit' && !online) cpuBat();
  setHint((ball.vn ? '消える魔球！ ' : '') + (mode === 'bat' ? (curBunt ? 'バント：ボールが通る位置をタップしてバットを合わせる' : 'ボールが通る位置をタップ') : '') + sm);
}
function basePos(t, out) {
  const b = ball, s = t + 0.08 * t * (1 - t), q = Math.pow(Math.max(0, t), b.n);
  out.set(
    lerp(b.P0.x, b.app.x, s) + (b.tgt.x - b.app.x) * q,
    lerp(b.P0.y, b.app.y, s) + (b.tgt.y - b.app.y) * q + 0.5 * 9.8 * b.gf * b.real * b.real * s * (1 - s),
    lerp(b.P0.z, 0, s));
  if (b.wob) {
    const w = b.wob * Math.sin(Math.PI * t);
    out.x += w * ZW * Math.sin(t * 17 + b.ph) * 0.8;
    out.y += w * ZH * Math.sin(t * 13 + b.ph2) * 0.6;
  }
  return out;
}
const _bp = V();
function ballPosAt(t, out) {
  if (t <= 1) return basePos(t, out);
  basePos(1, out); basePos(0.98, _bp);
  const k = (t - 1) / 0.02;
  return out.set(out.x + (out.x - _bp.x) * k, out.y + (out.y - _bp.y) * k, out.z + (out.z - _bp.z) * k);
}
function cpuPitch() {
  const P0 = curPitcher(), mix = story && story.pitcher ? story.pitcher.mix : null, wOf = k => (mix ? (mix[k] || 0) : TYPES[k].w) * (P0.pt.includes(k) ? 1 : 0);   // only the pitcher's own pitches
  let tot = 0; for (const k in TYPES) tot += wOf(k);
  let r = Math.random() * tot, key = 'str';
  for (const k in TYPES) { r -= wOf(k); if (r <= 0 && wOf(k) > 0) { key = k; break; } }
  const T = TYPES[key];
  let tx, ty;
  if (Math.random() < 0.68) { tx = rnd(-0.9, 0.9); ty = rnd(-0.9, 0.9); }
  else { tx = rnd(-1.5, 1.5); ty = rnd(-1.4, 1.5); }
  const bonus = story && story.pitcher ? story.pitcher.speed : 0;
  const P = curPitcher(), wild = 0.06 + (3 - P.c) * 0.05 + P.fatigue * 0.3;
  tx += gauss() * Math.max(0, wild); ty += gauss() * Math.max(0, wild);
  launchBall({ key, speed: clamp(rnd(T.min, T.max) + bonus + (P.v - 3) * 4 - P.fatigue * 8, 70, 170), tx, ty });
}
function cpuBat() {
  const T = ball.T, o = Math.max(Math.abs(T[0]), Math.abs(T[1])), inz = o <= 1.05;
  const ty = TYPES[ball.key];
  let p = inz ? 0.85 : 0.22;
  if (G.s === 2) p = inz ? 0.97 : 0.5;
  if (o > 1.5) p = 0.05;
  const tsd = (0.045 + Math.max(0, ball.speed - 110) / 40 * 0.03 + ty.hard * 0.03) * (ball.vn ? 1.6 : 1);   // 消える魔球：見えない間は合わせにくい
  const BT = curBatter();
  const k = {
    swing: Math.random() < p, dt: gauss() * tsd,
    d: (Math.abs(gauss()) * (0.30 + ty.hard * 0.18) + Math.max(0, o - 1) * 0.5) * (story && story.batSkill || 1) * (1.3 - 0.1 * BT.m) + (magicActive() ? 0.35 : 0),
    vy: 0.1 + gauss() * 0.35
  };
  ball.cpu = k;
  if (curBunt) {
    k.swing = Math.random() < (o <= 1.25 ? 0.9 : 0.15); k.dt = 0;
    k.d = Math.abs(gauss()) * 0.3 * (story && story.batSkill || 1) + Math.max(0, o - 1) * 0.4 + (magicActive() ? 0.3 : 0);
    k.buntC = zoneToWorld(T[0] + gauss() * 0.1, T[1]);
    return;
  }
  if (k.swing) {
    const C = zoneToWorld(T[0] + gauss() * 0.2, T[1] + k.vy * 0.3);
    batAnim = { t0: ball.start + ball.dur + k.dt - SWING_LEAD, plan: makeSwingPlan(C) };
  }
}

/* ---- resolve one pitch ---- */
/* online: the batter's device judges, sends the verdict with a seed, and both devices resolve it identically */
function resolve(c, C) {
  if (online && mode === 'bat') {
    const seed = (Math.random() * 4294967296) >>> 0;
    send('result', { c, C: C ? [C.x, C.y, C.z] : null, seed, swung: !!(swing && !swing.bunt) });
    return withSeed(seed, () => resolveCore(c, C));
  }
  return resolveCore(c, C);
}
function resolveCore(c, C) {
  const now = now_();
  phase = 'result'; ball.done = true;
  const inZone = Math.max(Math.abs(ball.T[0]), Math.abs(ball.T[1])) <= 1;
  const tone = g => (mode === 'bat' ? (g ? 'g' : 'b') : (g ? 'b' : 'g'));
  const info = TYPES[ball.key].name + ' ' + Math.round(ball.speed) + 'km/h';
  let t = '', sub = info, tn = 'n', delay = 0, cheer = 0;
  play = null;
  if (c.kind === 'take' || c.kind === 'miss') {
    sfx.pop();
    const st = settleSteal(c, now);
    if (st && st.ended) { t = st.label; tn = tone(false); sub = info; }
    else {
      if (c.kind === 'take') {
        if (inZone) { t = '見逃しストライク'; const e = strike(); if (e) { t = '見逃し三振' + e.slice(2); tn = tone(false); } }
        else { t = 'ボール'; const e = ballCount(); if (e) { t = e; tn = tone(true); } }
      } else { t = '空振り'; const e = strike(); if (e) { t = '空振り三振' + e.slice(2); tn = tone(false); } }
      if (st) { sub = t + '・' + info; t = st.label; tn = tone(st.safe); cheer = st.safe && mode === 'bat' ? 0.5 : 0; }
    }
    ghostOn = true; ghostRing.position.set(ball.tgt.x, ball.tgt.y, 0.005);
    const path = []; for (let i = 0; i <= 24; i++) path.push(basePos(i / 24, V()));
    showPitchPath(path);
    nextAt = now + 1.7;
    if (st) { delay = st.arrive - now + 0.05; nextAt = Math.max(nextAt, st.arrive + 1.5); }
  } else {
    sfx.crack();
    commentContact(c);
    const sg = steal, hr = sg && sg.hitRun ? sg : null;
    settleSteal(c, now);
    play = makePlay(c, ball.tgt.clone(), now);
    const B0 = G.bases.slice(), o0 = G.outs;
    if (c.kind === 'foul') {
      if (c.bunt && G.s === 2) { const e = strike(); t = 'スリーバント失敗' + e.slice(2); tn = tone(false); }   // two-strike foul bunt is a strikeout
      else { t = 'ファウル'; if (G.s < 2) G.s++; }
      delay = 0.3;
    }
    else {
      if (c.bunt) {
        const r = buntResult(c, B0, !!(sg && sg.squeeze));
        t = r.t; tn = tone(r.good); if (r.thr) addThrows(play, r.thr); if (!c.popup) play.run = B0;
      }
      else if (c.bases > 0) {
        t = advance(c.bases, c.res); tn = tone(true); cheer = c.bases === 4 ? 1.6 : c.bases === 2 ? 0.8 : 0.4; play.run = B0;
        if (hr && c.bases === 1 && B0[0] && G.bases[1] && !G.bases[2]) { G.bases[1] = 0; G.bases[2] = 1; t += '（エンドランで1塁から3塁へ）'; }
      }
      else {
        if (c.res !== 'ポップフライ' && Math.random() < (play.grounder ? 0.07 : 0.05)) {
          t = advance(1, 'エラー！'); G.hits--; play.err = true; play.caught = false; play.endY = BALL_R; play.fr = 1;
          play.roll = play.hd.clone().multiplyScalar(play.grounder ? 7 : 3); play.run = B0;
        }
        else if (play.grounder && B0[0] && o0 < 2 && !hr && Math.random() < 0.7) { t = doublePlay(); addThrows(play, [2, 1]); play.run = B0; cheer = mode === 'pit' ? 0.8 : 0; }
        else if (play.grounder) {
          t = groundOut(c.res); addThrows(play, [1]); play.run = B0;
          if (hr && B0[1] && !B0[0] && G.outs !== 0 && !G.bases[2]) { G.bases[1] = 0; G.bases[2] = 1; t += ' 進塁'; }
        }
        else if (B0[2] && o0 < 2 && c.res === 'フライアウト' && play.dist > 55) { t = sacFly(); play.run = [0, 0, 1]; play.tag = true; }
        else {
          t = out(c.res);
          if (hr && G.outs !== 0 && Math.random() < 0.4) {         // runner was off with the pitch and gets doubled off
            const ended = runnerOut(hr.run[0]); t += '・飛び出しでゲッツー'; if (ended) t = endInning(t);
          }
        }
        tn = tone(!!play.err);
      }
      sub = (c.q > 0.88 ? 'ジャストミート ' : '') + Math.round(c.ev) + 'km/h' + (play.grounder ? '' : ' ' + Math.round(play.dist) + 'm');
      if (c.crit) sub = '会心の一振り！ ' + sub;
      delay = play.throws ? play.T + play.throwEnd : Math.min(play.T, 2.4) * 0.9;
    }
    playShot(play, now);
    shakeUntil = now + (c.q > 0.6 ? 0.25 : 0.12); shakeAmp = c.q > 0.6 ? 0.03 : 0.012;
    fxFlash = now; flashRing.position.set(C.x, C.y, 0.02);
    nextAt = now + Math.max(2.4, play.T + (play.throwEnd || 0) + 1.7);
  }
  queueBanner(now + delay, t, sub, tn, cheer);
  setHint('');
}
function stepFly(now) {
  const arr = ball.start + ball.dur;
  if (mode === 'bat') {
    if (swing && swing.bunt) {                 // bunt: the bat is already out there, only placement matters
      if (now < arr) return;
      const late = swing.time > arr + 0.06, big = giantActive();
      const d = Math.hypot((swing.x - ball.T[0]) * 0.5, swing.y - ball.T[1]) * (big ? 0.6 : 1);
      resolve(late ? { kind: 'miss' } : buntContact(d, swing.y - ball.T[1]), swing.C);
      return;
    }
    if (swing && now >= Math.max(arr, swing.time + SWING_LEAD)) {
      const dt = swing.time + SWING_LEAD - arr;
      const big = giantActive();   // giant bat: much wider sweet spot and a more forgiving timing window
      const d = Math.hypot((swing.x - ball.T[0]) * 0.6, swing.y - ball.T[1]) * (big ? 0.45 : 1);
      const c = contact((big ? dt * 0.7 : dt) * (ball.vn ? 1.6 : 1), d, swing.y - ball.T[1], ball.speed, big, swing.crit);
      c.crit = !!swing.crit;
      resolve(c, swing.C);
    } else if (!swing && now >= arr + 0.2) resolve({ kind: 'take' });
  } else if (online) stepFlyOnline(now);
  else {
    const k = ball.cpu;
    if (now >= arr + 0.02 + (k.swing ? Math.max(0, k.dt) : 0)) {
      if (k.swing) resolve(curBunt ? buntContact(k.d * 0.8, k.vy * 0.3) : contact(k.dt, k.d, k.vy, ball.speed), ball.tgt);
      else resolve({ kind: 'take' });
    }
  }
}
function clearPlay() {
  play = null; ball = null; batAnim = null; swing = null; ghostOn = false; hidePitchPath();
  steal = null; stealAnim = null; pickoff = null; curBunt = false; throwMesh.visible = false;
  hideBanner(); $('#spd').textContent = '';
}
function afterResult() {
  flushBanner();
  if (online) { onlineAfterResult(); return; }
  if (story) { const r = storyCheck(); if (r) { storyEnd(r === 'clear'); return; } }
  if (G.over) { showOver(); return; }
  const dd = applyInningDice();
  clearPlay();
  if (dd) showDiceBanner(dd);
  phase = mode === 'bat' ? 'wait' : 'ready';
  nextAt = now_() + rnd(1.6, 2.2);
  if (mode === 'bat' && stealers().length) nextAt += 1.2;      // time to give a steal sign
  cpuStealPlan = mode === 'pit' && stealers().length > 0 && Math.random() < 0.25;
  cpuBuntPlan = mode === 'pit' && !cpuStealPlan && (G.bases[0] || G.bases[1]) && G.outs === 0 && Math.random() < 0.3;
  cpuRelief();
  updateGoal(); announceChance();
  setHint(mode === 'bat' ? '投手が投げたら、ボールが通る位置をタップして打つ' : '弾く向きで球種が決まる。指を離した位置がコース、弾く速さが球速');
}
function showOver() {
  idle();
  overlay({ title: '試合終了', text: mode === 'bat'
    ? '3イニングで ' + G.runs + '点 / 安打 ' + G.hits + ' / 本塁打 ' + G.hr
    : '3イニングで ' + G.runs + '失点 / 三振 ' + G.so, b1: ['もう一度', startGame], b2: ['メニュー', showMenu] });
}
function showStart() {
  idle();
  overlay({ title: 'プレイボール', b1: ['試合開始', startGame], b2: ['メニュー', showMenu], text: mode === 'bat'
    ? 'CPU投手のボールがミットに届く直前に、ボールが通る位置をタップしてスイング。3回まで。'
    : '指を弾く向きで球種が決まる（↑ストレート、→スライダー、↓フォークなど。下の一覧を参照）。指を離した位置がコース。速く弾くほど球速は上がるが、コントロールは乱れる。↑を特に速く弾くと剛速球。3回まで。' });
}
