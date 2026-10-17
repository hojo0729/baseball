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
/* recorded cheer music (docs/bgm, made with Lyria): a crowd bed that always runs, plus a music loop that follows the game
   (your team batting / fielding / runners in scoring position), and a fanfare with a roar on home runs.
   Until the files load (or where they can't, like the in-Claude preview) the synth rhythm above plays instead. */
const BGM_FILES = { a: 'bgm/a_normal.mp3', b: 'bgm/b_normal.mp3', chance: 'bgm/c_chance.mp3', crowd: 'bgm/crowd.mp3', hr: 'bgm/hr.mp3' };
const bgmRec = {};
let bgmFileReq = false, fileOut = null, musicNow = null, crowdNow = null;
function bgmLoadFiles() {
  if (bgmFileReq || !ac || !window.fetch) return; bgmFileReq = true;
  Object.keys(BGM_FILES).forEach(k => fetch(BGM_FILES[k]).then(r => r.ok ? r.arrayBuffer() : Promise.reject(r.status))
    .then(a => new Promise((res, rej) => ac.decodeAudioData(a, res, rej))).then(b => { bgmRec[k] = b; }).catch(() => {}));
}
const fileReady = () => !!(bgmRec.a && bgmRec.crowd);
function loopSrc(buf, vol, fade) {
  const s = ac.createBufferSource(), g = ac.createGain(), t = ac.currentTime;
  s.buffer = buf; s.loop = true; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + fade);
  s.connect(g); g.connect(fileOut); s.start(t); return { s, g, vol };
}
function fadeStop(n, fade) {
  if (!n || !ac) return;
  const t = ac.currentTime;
  try { n.g.gain.cancelScheduledValues(t); n.g.gain.setValueAtTime(n.g.gain.value, t); n.g.gain.linearRampToValueAtTime(0, t + fade); n.s.stop(t + fade + 0.05); } catch (e) {}
}
function wantTheme() {
  if (!G || phase === 'idle') return 'a';
  if ((G.bases[1] || G.bases[2]) && bgmRec.chance) return 'chance';   // チャンステーマ
  return mode === 'bat' || !bgmRec.b ? 'a' : 'b';                      // 攻撃中は王道ブラス、守備中はマーチ
}
function bgmFileTick() {
  if (!fileOut) { fileOut = ac.createGain(); fileOut.gain.value = 0.42; fileOut.connect(ac.destination); }
  if (!crowdNow) crowdNow = loopSrc(bgmRec.crowd, 0.8, 1.5);           // 歓声は多め、ずっと流す
  const want = wantTheme();
  if (!musicNow || musicNow.name !== want) { fadeStop(musicNow, 1.2); musicNow = loopSrc(bgmRec[want], 0.55, 1.2); musicNow.name = want; }
}
function bgmFileStop() { fadeStop(musicNow, 0.6); fadeStop(crowdNow, 0.6); musicNow = crowdNow = null; }
function bgmHR() {
  if (!bgmOn || !ac || !fileOut || !bgmRec.hr) return;
  const t = ac.currentTime;
  if (musicNow) { const g = musicNow.g.gain; g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(0.1, t + 0.3); g.linearRampToValueAtTime(musicNow.vol, t + 8); }
  const s = ac.createBufferSource(); s.buffer = bgmRec.hr; s.connect(fileOut); s.start(t + 0.15);
}
function bgmTick() {
  if (!bgmOn || !ac || !bgmGain) return;
  if (fileReady()) { bgmFileTick(); return; }
  if (bgmNext < ac.currentTime) bgmNext = ac.currentTime + 0.1;
  while (bgmNext < ac.currentTime + 0.3) { bgmBeatAt(bgmBeat, bgmNext); bgmBeat++; bgmNext += BGM_BEAT; }
}
function bgmStartIfOn() {
  if (!ac || !bgmWanted()) return;
  bgmInit(); bgmLoadFiles();
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
/* the crack of a wooden bat, built from its parts (no recordings):
   a dull ball thump, a short splintery snap, a few ringing modes of the bat, and a slap-back echo off the stands.
   q = contact quality 0..1: on the sweet spot it rings bright and long; off it, a low short "bok". kind: 'play' | 'foul' | 'bunt'.
   Takes any AudioContext (also an OfflineAudioContext, for previews). */
let crackNoise = null;
function batSound(ctx, dest, t, q, kind) {
  try {
    q = clamp(q, 0, 1);
    const bunt = kind === 'bunt', tip = kind === 'foul' && q < 0.45;
    const sweet = bunt ? 0 : clamp((q - 0.55) / 0.4, 0, 1);       // 0 = off the sweet spot, 1 = dead center
    const vol = bunt ? 0.35 : tip ? 0.45 : 0.6 + 0.4 * q;
    const out = ctx.createGain(); out.gain.value = vol * 0.62;   // keeps the loudest crack below clipping
    // slap-back echo from the stands
    const dl = ctx.createDelay(1), fb = ctx.createGain(), lp = ctx.createBiquadFilter(), wet = ctx.createGain();
    dl.delayTime.value = 0.19; fb.gain.value = 0.34; lp.type = 'lowpass'; lp.frequency.value = 1800; wet.gain.value = bunt ? 0.08 : 0.22 + 0.15 * sweet;
    out.connect(dest); out.connect(dl); dl.connect(lp); lp.connect(fb); fb.connect(dl); lp.connect(wet); wet.connect(dest);
    // 1) ball thump
    const th = ctx.createOscillator(), tg = ctx.createGain();
    th.type = 'sine'; th.frequency.setValueAtTime(bunt ? 260 : 230, t); th.frequency.exponentialRampToValueAtTime(bunt ? 160 : 120, t + 0.05);
    tg.gain.setValueAtTime(bunt ? 0.6 : 0.8, t); tg.gain.exponentialRampToValueAtTime(0.001, t + (bunt ? 0.05 : 0.07));   // the weight of the ball
    th.connect(tg); tg.connect(out); th.start(t); th.stop(t + 0.1);
    // 2) splintery snap: a very short burst of bright noise
    if (!crackNoise || crackNoise.sampleRate !== ctx.sampleRate) {
      const n = Math.floor(ctx.sampleRate * 0.12), b = ctx.createBuffer(1, n, ctx.sampleRate), ch = b.getChannelData(0);
      let s = 987654321; for (let i = 0; i < n; i++) { s = (s * 1103515245 + 12345) & 0x7fffffff; ch[i] = (s / 0x7fffffff * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.012)); }
      crackNoise = b;
    }
    const ns = ctx.createBufferSource(), hp = ctx.createBiquadFilter(), ng = ctx.createGain();
    ns.buffer = crackNoise; hp.type = 'highpass'; hp.frequency.value = bunt ? 1200 : 1300;
    ng.gain.value = bunt ? 0.25 : 0.22 + 0.1 * sweet;              // a little snap only: too much of it sounds like clappers
    ns.connect(hp); hp.connect(ng); ng.connect(out); ns.start(t);
    // 3) the bat rings: a handful of modes, higher and longer on the sweet spot, lower and damped off it
    // kept low and short: long, pitched rings sound like a wood block rather than a bat
    const tune = bunt ? 0.95 : 0.85 + 0.1 * sweet, ring = bunt ? 0.3 : tip ? 0.32 : 0.35 + 0.15 * sweet;
    [[480, 0.11, 1], [1190, 0.085, 0.75], [2240, 0.06, 0.5], [3520, 0.035, 0.32]].forEach(([f, d, a]) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(f * tune * 1.02, t); o.frequency.exponentialRampToValueAtTime(f * tune, t + 0.03);
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(a * 0.32, t + 0.002); g.gain.exponentialRampToValueAtTime(0.0005, t + d * ring + 0.01);
      o.connect(g); g.connect(out); o.start(t); o.stop(t + d * ring + 0.05);
    });
    setTimeout(() => { try { out.disconnect(); fb.disconnect(); } catch (e) {} }, 2500);   // let the echo die, then free the nodes
  } catch (e) {}
}
const sfx = {
  crack(q, kind) { if (ac) batSound(ac, ac.destination, ac.currentTime, q === undefined ? 0.7 : q, kind || 'play'); },
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
  1: () => { G.outs = Math.max(G.outs, 2); return '大凶！ いきなり2アウト…'; },
  2: () => { G.outs = Math.max(G.outs, 1); return '凶… 1アウトから開始'; },
  3: () => { G.bonus = { inn: G.inning, pa: G.pa, m: 2, p: 2 }; return '次の打者　ミート+2 パワー+2'; },
  4: () => { G.bases[0] = G.bases[0] || 3; G.bases[1] = G.bases[1] || 3; return 'ノーアウト1・2塁のチャンス！'; },
  5: () => { G.runs += 2; return '2点ボーナス！！'; },
  6: () => { G.runs += 4; return '4点ボーナス！！！大当たり'; }
};
function rollDie() {
  if (!online) return Math.floor(Math.random() * 6) + 1;
  return withSeed(((onl.seed || 0) + G.inning * 7919) >>> 0, () => Math.floor(Math.random() * 6) + 1);
}
/* applies this inning's dice once (odd innings only). returns { v, text } or null */
function applyInningDice() {
  if (!G || G.diceInn === G.inning) return null;
  G.diceInn = G.inning;
  const inn = twoTeam() ? Math.ceil(G.inning / 2) : G.inning;   // 奇数の回（表も裏も、攻撃側が振る）
  if (inn % 2 !== 1) return null;
  const v = rollDie(), text = DICE_FX[v]();
  hud();
  return { v, text };
}
/* the die: a CSS 3D cube that tumbles in, bounces and lands on the rolled face (display only) */
const PIPS = { 1: [5], 2: [1, 9], 3: [1, 5, 9], 4: [1, 3, 7, 9], 5: [1, 3, 5, 7, 9], 6: [1, 3, 4, 6, 7, 9] };
const FACE_AT = { 1: 'rotateY(0deg)', 6: 'rotateY(180deg)', 3: 'rotateY(90deg)', 4: 'rotateY(-90deg)', 2: 'rotateX(90deg)', 5: 'rotateX(-90deg)' };
const FACE_UP = { 1: [0, 0], 6: [0, 180], 3: [0, -90], 4: [0, 90], 2: [-90, 0], 5: [90, 0] };   // cube rotation that brings a face to the front
let diceEl = null, diceHide = 0, diceRoll = 0;
function diceDom() {
  if (diceEl) return diceEl;
  const w = document.createElement('div'); w.className = 'dice-wrap';
  w.innerHTML = '<div class="dice-sh"></div><div class="dice-roll"><div class="dice-tilt"><div class="dice">' +
    [1, 2, 3, 4, 5, 6].map(n => '<div class="f" style="transform:' + FACE_AT[n] + ' translateZ(34px)">' +
      PIPS[n].map(c => '<i class="' + (n === 1 ? 'red' : '') + '" style="grid-area:' + Math.ceil(c / 3) + '/' + ((c - 1) % 3 + 1) + '"></i>').join('') + '</div>').join('') +
    '</div></div></div>';
  $('#stage').appendChild(w);
  return (diceEl = w);
}
function showDiceBanner(d) {
  const w = diceDom(), roll = w.querySelector('.dice-roll'), cube = w.querySelector('.dice'), sh = w.querySelector('.dice-sh');
  clearTimeout(diceHide); w.classList.add('on');
  const my = ++diceRoll;                                // a newer roll cancels this one's landing and hiding
  try { w.getAnimations({ subtree: true }).forEach(a => a.cancel()); } catch (e) {}   // drop the last roll's finished animations
  const [fx, fy] = FACE_UP[d.v], T = 1500;
  const rot = (x, y, z) => 'rotateX(' + x + 'deg) rotateY(' + y + 'deg) rotateZ(' + z + 'deg)';
  try {
    roll.animate([
      { transform: 'translate(-150px,-130px)', easing: 'cubic-bezier(.5,0,1,.6)' },
      { transform: 'translate(-70px,0)', offset: 0.38, easing: 'cubic-bezier(0,.5,.5,1)' },
      { transform: 'translate(-30px,-46px)', offset: 0.56, easing: 'cubic-bezier(.5,0,1,.6)' },
      { transform: 'translate(-8px,0)', offset: 0.74, easing: 'cubic-bezier(0,.5,.5,1)' },
      { transform: 'translate(-2px,-12px)', offset: 0.85, easing: 'cubic-bezier(.5,0,1,.6)' },
      { transform: 'translate(0,0)' }
    ], { duration: T, fill: 'forwards' });
    cube.animate([
      { transform: rot(fx + 40, fy - 30, 25) },
      { transform: rot(fx + 520, fy + 610, 200), offset: 0.38 },
      { transform: rot(fx + 690, fy + 790, 300), offset: 0.74 },
      { transform: rot(fx + 720, fy + 720, 360) }
    ], { duration: T, fill: 'forwards', easing: 'cubic-bezier(.2,.6,.3,1)' });
    sh.animate([{ transform: 'scale(.35)', opacity: 0.2 }, { transform: 'scale(1)', opacity: 0.6, offset: 0.38 }, { transform: 'scale(.7)', opacity: 0.4, offset: 0.56 },
      { transform: 'scale(1)', opacity: 0.6 }], { duration: T, fill: 'forwards' });
  } catch (e) {}
  sfx.pop(); setTimeout(() => sfx.pop(), T * 0.38); setTimeout(() => sfx.pop(), T * 0.74);
  say(cmtLine('dice'), 1);
  setTimeout(() => {                                   // landed: show what it means
    if (my !== diceRoll) return;
    showBanner('出た目 ' + d.v + '！', d.text, d.v === 1 ? 'n' : 'g');
    say(cmtLine('dice' + d.v), 2);
    if (d.v >= 5) sfx.cheer(1);
    diceHide = setTimeout(() => { if (my === diceRoll) w.classList.remove('on'); }, 1800);
  }, T + 80);
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
  if (twoTeam()) {
    const sc = onlineScore();
    $('#inn').textContent = inningLabel();
    if (online) { $('#slab').textContent = 'しば - パン'; $('#runs').textContent = sc.home + '-' + sc.away; }
    else { const os = match.side === 'home' ? 'away' : 'home'; $('#slab').textContent = 'しば - ' + ROSTER[match.opp].name.slice(0, 2); $('#runs').textContent = sc[match.side] + '-' + sc[os]; }
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
  const sb = scoreBook(), last = G.maxHalf || 3;
  if (twoTeam()) { sb[battingSide()] += G.runs; G.runs = 0; }   // bank this half's runs for the batting team
  G.outs = 0; G.bases = [0, 0, 0]; G.inning++;
  if (G.inning > last) G.over = !twoTeam() || sb.home !== sb.away;   // two-team games: extra innings until one side pulls ahead
  if (match && G.inning > 24) G.over = true;                          // CPU match: a tie after the 12th is a draw
  if (twoTeam() && G.inning >= last && G.inning % 2 === 0 && sb.home > sb.away) G.over = true;   // home leads going into the last bottom half
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
  G.bases = [0, 0, B[1] || 0]; G.runs += sc;
  return 'ゲッツー' + (sc ? ' ' + sc + '点' : '');
}
/* ground out: batter out at first, forced runners move up one base */
function groundOut(label) {
  const B = G.bases.slice();
  const res = out(label);
  if (G.outs === 0) return res;              // that out ended the inning
  let sc = 0; const nb = [0, B[1], B[2]];
  if (B[0]) { if (B[1]) { if (B[2]) sc++; nb[2] = B[1]; } nb[1] = B[0]; }
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
/* the bases hold each runner's 走力 (1-5), 0 = empty; a batter who reaches takes his own 走力 with him */
function walk() {
  const bsp = curBatter().sp;
  endPA();
  const B = G.bases;
  if (B[0]) { if (B[1]) { if (B[2]) G.runs++; B[2] = B[1]; } B[1] = B[0]; }
  B[0] = bsp;
  return 'フォアボール';
}
function advance(n, label) {
  const bsp = curBatter().sp;
  endPA();
  const nb = [0, 0, 0]; let sc = 0;
  for (let i = 2; i >= 0; i--) if (G.bases[i]) { const p = i + 1 + n; if (p >= 4) sc++; else nb[p - 1] = G.bases[i]; }
  if (n >= 4) sc++; else nb[n - 1] = bsp;
  G.runs += sc; G.bases = nb; G.hits++;
  if (n === 4) G.hr++;
  return label + (sc ? ' ' + sc + '点' : '');
}

/* ---- contact model: timing (dt, seconds) and position (d, zone units) decide quality ---- */
function contact(dt, d, vy, speed, boost, crit, evAdd) {
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
  const ev = 70 + 100 * q + (speed - 110) * 0.25 + (boost ? 18 : 0) + (crit ? 30 : 0) + (evAdd || 0) + (BT.p - 3) * 9;
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
/* CPUの強さ（CPU対戦と練習）。ストーリーは各話の調整をそのまま使う
   fool: 配球にだまされやすさ / bat: CPU打者のバットの芯のずれ / pow: CPU打者の打球の速さ(km/h) / tsd: タイミングのぶれ / chase: ボール球に手を出す率 / spd: CPU投手の球速 / wild: 制球の乱れ / zone: ストライクを投げる率 / edge: 際どいコースを狙う率 */
const DIFF = [
  { name: 'よわい', bat: 1.9, tsd: 1.7, chase: 1.6, pow: -10, fool: 1.3, spd: -8, wild: 0.1, zone: 0.82, edge: 0, center: 0.55 },
  { name: 'ふつう', bat: 1, tsd: 1, chase: 1, pow: 0, fool: 1, spd: 0, wild: 0, zone: 0.68, edge: 0, center: 0.9 },
  { name: 'つよい', bat: 0.78, tsd: 0.75, chase: 0.6, pow: 3, fool: 0.75, spd: 5, wild: -0.03, zone: 0.62, edge: 0.5, center: 0.9 },
  { name: '鬼', bat: 0.6, tsd: 0.55, chase: 0.4, pow: 6, fool: 0.55, spd: 9, wild: -0.05, zone: 0.58, edge: 0.75, center: 0.9 }
];
let diffLv = 1;
try { const v = Number(localStorage.getItem('yakyu-diff')); if (v >= 0 && v < DIFF.length) diffLv = v; } catch (e) {}
function setDiff(i) { diffLv = i; try { localStorage.setItem('yakyu-diff', String(i)); } catch (e) {} }
const cpuLv = () => story ? DIFF[1] : DIFF[diffLv];
function cpuPitch() {
  const LV = cpuLv();
  const P0 = curPitcher(), mix = story && story.pitcher ? story.pitcher.mix : null, wOf = k => (mix ? (mix[k] || 0) : TYPES[k].w) * (P0.pt.includes(k) ? 1 : 0);   // only the pitcher's own pitches
  let tot = 0; for (const k in TYPES) tot += wOf(k);
  let r = Math.random() * tot, key = 'str';
  for (const k in TYPES) { r -= wOf(k); if (r <= 0 && wOf(k) > 0) { key = k; break; } }
  const T = TYPES[key];
  let tx, ty;
  if (Math.random() < LV.zone) {
    if (Math.random() < LV.edge) { tx = (Math.random() < 0.5 ? -1 : 1) * rnd(0.5, 0.95); ty = rnd(-0.95, 0.95); }   // 際どいコース
    else { tx = rnd(-LV.center, LV.center); ty = rnd(-LV.center, LV.center); }
  }
  else { tx = rnd(-1.5, 1.5); ty = rnd(-1.4, 1.5); }
  const bonus = story && story.pitcher ? story.pitcher.speed : 0;
  const P = curPitcher(), wild = Math.max(0.02, 0.06 + (3 - P.c) * 0.05 + P.fatigue * 0.3 + LV.wild);
  tx += gauss() * Math.max(0, wild); ty += gauss() * Math.max(0, wild);
  launchBall({ key, speed: clamp(rnd(T.min, T.max) + bonus + LV.spd + (P.v - 3) * 4 - P.fatigue * 8, 70, 170), tx, ty });
}
/* 配球: the CPU hitter remembers the previous pitch of this plate appearance.
   緩急 (a big change of speed) throws off the timing, 出し入れ (a far-away spot) throws off the bat path,
   repeating the same pitch to the same spot lets the hitter time it (慣れ), and the corners of the zone are harder to square up than the middle.
   Returns multipliers for the timing spread (t) and the contact error (d), plus an added error (dAdd). */
function pitchCraft(LV) {
  const T = ball.T, prev = G.seq && G.seq.pa === G.pa ? G.seq : null, f = LV.fool;
  let t = 1, d = 1, dAdd = 0, same = 0;
  if (prev) {
    const dv = Math.abs(ball.speed - prev.speed), dist = Math.hypot(T[0] - prev.tx, T[1] - prev.ty);
    t *= 1 + Math.min(0.8, dv / 40) * f;                      // 緩急: 20 km/h の差でタイミングのぶれが約1.5倍
    dAdd += Math.min(0.22, dist * 0.1) * f;                   // 出し入れ: 前の球から遠いほど芯を外す
    if (prev.key === ball.key && dist < 0.5) same = prev.same + 1;
  }
  const learn = Math.min(0.45, same * 0.18) / Math.max(0.5, f);   // 慣れ: 同じ球を同じ所へ続けるほど合わせてくる（強い打者ほど早く）
  t *= 1 - Math.min(0.6, learn); d *= 1 - Math.min(0.6, learn);
  const o = Math.max(Math.abs(T[0]), Math.abs(T[1]));
  if (o <= 1) {
    if (o > 0.65) dAdd += (o - 0.65) * 0.8 * f;               // 四隅・際どいコースは芯で捉えにくい
    else if (o < 0.35) d *= 0.85;                             // ど真ん中は打ちやすい
  }
  G.seq = { pa: G.pa, speed: ball.speed, tx: T[0], ty: T[1], key: ball.key, same };
  return { t, d, dAdd };
}
function cpuBat() {
  const T = ball.T, o = Math.max(Math.abs(T[0]), Math.abs(T[1])), inz = o <= 1.05;
  const ty = TYPES[ball.key];
  const LV = cpuLv();
  let p = inz ? 0.85 : 0.22 * LV.chase;
  if (G.s === 2) p = inz ? 0.97 : Math.min(0.85, 0.5 * LV.chase);
  if (o > 1.5) p = 0.05;
  const sq = pitchCraft(LV);
  const tsd = (0.045 + Math.max(0, ball.speed - 110) / 40 * 0.03 + ty.hard * 0.03) * (ball.vn ? 2.8 : 1) * LV.tsd * sq.t;   // 消える魔球：見えない間は大きくタイミングがずれる
  const BT = curBatter();
  const k = {
    swing: Math.random() < p, dt: gauss() * tsd,
    d: (Math.abs(gauss()) * (0.30 + ty.hard * 0.18) + Math.max(0, o - 1) * 0.5) * (story && story.batSkill || 1) * LV.bat * (1.3 - 0.1 * BT.m) * sq.d + sq.dAdd + (ball.vn ? 0.3 : 0) + (magicActive() ? 0.35 : 0),
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
    sfx.crack(c.q === undefined ? 0.6 : c.q, c.bunt ? 'bunt' : c.kind);
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
        if (c.bases === 4) bgmHR();
        if (hr && c.bases === 1 && B0[0] && G.bases[1] && !G.bases[2]) { G.bases[2] = G.bases[1]; G.bases[1] = 0; t += '（エンドランで1塁から3塁へ）'; }
      }
      else {
        if (c.res !== 'ポップフライ' && Math.random() < (play.grounder ? 0.07 : 0.05)) {
          t = advance(1, 'エラー！'); G.hits--; play.err = true; play.caught = false; play.endY = BALL_R; play.fr = 1;
          play.roll = play.hd.clone().multiplyScalar(play.grounder ? 7 : 3); play.run = B0;
        }
        else if (play.grounder && B0[0] && o0 < 2 && !hr && Math.random() < 0.7) { t = doublePlay(); addThrows(play, [2, 1]); play.run = B0; cheer = mode === 'pit' ? 0.8 : 0; }
        else if (play.grounder) {
          t = groundOut(c.res); addThrows(play, [1]); play.run = B0;
          if (hr && B0[1] && !B0[0] && G.outs !== 0 && !G.bases[2]) { G.bases[2] = G.bases[1]; G.bases[1] = 0; t += ' 進塁'; }
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
      if (play.sp && (play.err || c.bunt || (play.throws && play.throws.length > 1) || play.tag)) { play.sp = null; if (play.caught) play.endY = 1.35; }   // ゲッツー・エラー・犠牲フライでは出さない
      sub = (c.q > 0.88 ? 'ジャストミート ' : '') + Math.round(c.ev) + 'km/h' + (play.grounder ? '' : ' ' + Math.round(play.dist) + 'm');
      if (play.sp) { sub = 'スーパープレー！ ' + sub; cheer = Math.max(cheer, 1.0); }
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
      if (k.swing) resolve(curBunt ? buntContact(k.d * 0.8, k.vy * 0.3) : contact(k.dt, k.d, k.vy, ball.speed, false, false, cpuLv().pow), ball.tgt);
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
  if (match) { matchAfterResult(); return; }
  if (story) { const r = storyCheck(); if (r) { storyEnd(r === 'clear'); return; } }
  if (G.over) { showOver(); return; }
  const dd = applyInningDice();
  clearPlay();
  if (dd) showDiceBanner(dd);
  phase = mode === 'bat' ? 'wait' : 'ready';
  nextAt = now_() + rnd(1.6, 2.2);
  if (mode === 'bat' && stealers().length) nextAt += 1.2;      // time to give a steal sign
  cpuStealPlan = mode === 'pit' && stealers().length > 0 && Math.random() < cpuStealChance();
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
