
/* ===== 実況: 画面下のテロップ + スマホの読み上げ =====
   セリフは配列に集めてあるだけ。あとで録音/AI音声ファイルに差し替えるときは say() の中で Audio を鳴らせばよい。
   乱数は専用の簡易生成器を使う（Math.random を使うと、オンラインで withSeed 中に呼ばれたとき両端末の結果がずれる）。 */
const cmt = { mode: Number((() => { try { return localStorage.getItem('yakyu-cmt'); } catch (e) { return null; } })() ?? 2),
  s: 12345, last: {}, bat: '', pit: '', timer: 0, voice: null, n: 0 };   // mode 0:切 1:字だけ 2:字+声
const CMT_LABEL = ['実況 切', '実況 字', '実況 声'];

const LINES = {
  play: ['プレイボール！', 'さあ、試合開始です！', 'ナイターの幕が上がりました！'],
  first: ['ピッチャー、振りかぶって…第一球、投げた！', 'バッターを迎えます。投げた！', 'サインにうなずいて…投げました！'],
  pitch: ['投げた！', 'さあ、どうだ！', 'バッター、見ています！'],
  gou: ['出た！剛速球！', 'うなりをあげるストレート！', '速い！これは速い！'],
  chg: ['ゆるい球！タイミングを外した！', 'ふわっと来た！'],
  strike: ['ストライク！', '見逃しストライク！', 'いいコース！', 'ズバッと決まった！'],
  ball: ['ボール。', 'ボール！見極めました。', 'わずかに外れました。'],
  miss: ['空振り！', 'バットが空を切る！', '振った！当たらない！'],
  K: ['三振！バットが止まりません！', '空振り三振！気持ちよく仕留めた！', '三振！見事なピッチング！'],
  KL: ['見逃し三振！手が出ません！', '見逃し三振！際どいところに決まった！'],
  walk: ['フォアボール。粘って出塁です。', '四球。制球が乱れました。'],
  foul: ['ファウル！', '打った、ファウル！', 'ファウルボール！粘ります！'],
  hit: ['打った！', 'カキーン！', '捉えた！'],
  hitBig: ['完璧な当たり！', 'いい打球だ！ぐんぐん伸びる！', 'これは大きい！'],
  single: ['ヒット！きれいに運びました！', 'ヒットです！', '外野の間を抜けた！'],
  double: ['ツーベース！ぐんぐん伸びてフェンス際！', '長打！二塁へ到達！'],
  hr: ['入った！ホームラン！', 'ホームラン！豪快な一発！', '行ったー！特大のホームランです！'],
  hr2: ['入ったー！2ランホームラン！'],
  hr3: ['入ったー！3ランホームラン！'],
  hr4: ['満塁ホームラン！グランドスラム！'],
  gout: ['ゴロです。一塁へ送ってアウト。', '内野ゴロ、アウト。', 'しっかり処理しました。'],
  fout: ['フライ！捕りました、アウト。', '打ち上げた！野手が捕って、アウト。', 'ライナー！捕られました！'],
  dp: ['ゲッツー！助かりました！', '二つ取った！ダブルプレー！', 'ゲッツー！ピンチを切り抜けた！'],
  err: ['エラー！ボールがこぼれた！', 'ああっと、エラーです！'],
  steal: ['スタートを切った！盗塁成功！', '盗塁セーフ！いい走りです！'],
  stealX: ['盗塁失敗！タッチアウト！', '刺した！ナイスなスローイング！'],
  pick: ['牽制アウト！', '走者、戻れない！'],
  bunt: ['バント成功。しっかり送りました。', '送りバント。手堅く決めた！'],
  squeeze: ['スクイズ成功！1点をもぎ取った！', '三塁走者が突っ込んだ！スクイズ決まった！'],
  sac: ['犠牲フライ！三塁走者がタッチアップ！', 'タッチアップ！1点追加！'],
  change: ['スリーアウト、チェンジです。', 'ここでチェンジ。', '攻守交代です。'],
  relief: ['ピッチャー交代です。', 'ここでマウンドを譲ります。'],
  big: ['巨大バット登場！当たる範囲が大きいぞ！', '来ました、巨大バット！'],
  magic: ['魔球モード発動！打てるのか！', '魔球です！']
};

function cmtRand() { cmt.s = (cmt.s * 1664525 + 1013904223) >>> 0; return cmt.s / 4294967296; }
function cmtLine(key) {
  const a = LINES[key]; if (!a) return null;
  let i = Math.floor(cmtRand() * a.length);
  if (a.length > 1 && cmt.last[key] === i) i = (i + 1) % a.length;     // don't repeat the same line twice in a row
  cmt.last[key] = i;
  return { text: a[i], id: key + '_' + (i + 1) };                        // id = voice file name: audio/<id>.mp3
}

function cmtVoice() {
  if (cmt.voice || !window.speechSynthesis) return cmt.voice;
  const vs = speechSynthesis.getVoices();
  cmt.voice = vs.find(v => /^ja/i.test(v.lang) && /google|neural|natural|premium|enhanced/i.test(v.name))
    || vs.find(v => /^ja/i.test(v.lang)) || null;
  return cmt.voice;
}
/* Android Chrome stays silent unless speak() was first called from a tap, and drops speak() right after cancel().
   So: unlock on the first touch, wait a beat after cancel, and report errors in the ticker instead of failing quietly. */
function cmtUnlock() {
  if (cmt.unlocked || !window.speechSynthesis) return;
  cmt.unlocked = true; if (cmt.mode === 2) cmtPreload();
  try { const u = new SpeechSynthesisUtterance('。'); u.lang = 'ja-JP'; u.volume = 0; speechSynthesis.speak(u); } catch (e) {}
}
function cmtSpeak(text) {
  const u = new SpeechSynthesisUtterance(text.replace(/[！!]+/g, '！'));
  u.lang = 'ja-JP'; u.rate = 1.15; u.pitch = 1.1; u.volume = 1;
  const v = cmtVoice(); if (v) u.voice = v;
  u.onerror = e => { if (e.error && e.error !== 'canceled' && e.error !== 'interrupted') showCmtText('音声エラー: ' + e.error + '（スマホの設定で日本語の読み上げ音声を確認）'); };
  cmt.u = u;                                    // keep a reference: Chrome can garbage-collect a playing utterance and stop it
  speechSynthesis.speak(u);
}
function showCmtText(text) {
  const el = $('#cmt');
  el.textContent = text; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  clearTimeout(cmt.timer); cmt.timer = setTimeout(() => el.classList.remove('show'), 3800);
}
/* 録音ファイル docs/audio/<id>.mp3 があればそれを再生し、無ければスマホの読み上げにする。
   id は LINES の key_番号（例 hr_2）。ファイル一覧は tools/export-voice-script.mjs で出せる。 */
function cmtAllIds() { const r = []; for (const k in LINES) LINES[k].forEach((t, i) => r.push(k + '_' + (i + 1))); return r; }
function cmtPreload() {
  if (cmt.pre) return; cmt.pre = {};
  cmtAllIds().forEach(id => {
    const a = new Audio('audio/' + id + '.mp3'); a.preload = 'auto';
    a.addEventListener('error', () => { cmt.pre[id] = null; });
    cmt.pre[id] = a;
  });
}
function cmtPlayFile(id) {                       // true if a recording is being played
  const a = cmt.pre && cmt.pre[id]; if (!a || a.error) return false;
  try { a.currentTime = 0; const p = a.play(); if (p && p.catch) p.catch(() => { cmt.pre[id] = null; cmtSpeak(cmt.fallback); }); cmt.cur = a; return true; }
  catch (e) { return false; }
}
function cmtBusy() {
  const a = cmt.cur; if (a && !a.paused && !a.ended) return true;
  return !!(window.speechSynthesis && (speechSynthesis.speaking || speechSynthesis.pending) && Date.now() - (cmt.at || 0) < 6000);
}
function cmtStop() {
  if (cmt.cur) { try { cmt.cur.pause(); } catch (e) {} cmt.cur = null; }
  if (window.speechSynthesis) { try { speechSynthesis.cancel(); } catch (e) {} }
}
/* L: {text, id} from cmtLine(). extra: count / score text shown on the ticker (and read out by the fallback voice).
   prio 2: cut in and speak; prio 1: only if nothing is being said */
function say(L, prio, extra) {
  if (!L || cmt.mode === 0) return;
  const text = L.text + (extra || '');
  showCmtText(text);
  if (cmt.mode !== 2) return;
  try {
    const busy = cmtBusy();
    if (busy && (prio || 1) < 2) return;
    if (busy) cmtStop();
    cmt.at = Date.now(); cmt.fallback = text;
    const go = () => { if (!cmtPlayFile(L.id)) cmtSpeak(text); };
    if (busy) { clearTimeout(cmt.wait); cmt.wait = setTimeout(go, 80); } else go();
    if (window.speechSynthesis && speechSynthesis.paused) speechSynthesis.resume();
  } catch (e) {}
}
function setCmtMode(m) {
  cmt.mode = m; try { localStorage.setItem('yakyu-cmt', String(m)); } catch (e) {}
  $('#cmtBtn').textContent = CMT_LABEL[m];
  if (m !== 2) cmtStop();
  if (m === 0) $('#cmt').classList.remove('show');
  else { cmtUnlock(); if (m === 2) cmtPreload(); say({ text: m === 2 ? '実況、声でお伝えします！' : '実況、文字でお伝えします。', id: 'x' }, 2); }
}

/* ---- hooks ---- */
function commentPitch(o) {                       // called from launchBall
  const B = curBatter(), P = curPitcher(); cmt.bat = B.name; cmt.pit = P.name;
  if (cmt.mode === 0) return;
  if (o.key === 'gou') say(cmtLine('gou'), 2);
  else if (o.key === 'chg' && cmtRand() < 0.6) say(cmtLine('chg'), 1);
  else if (G.b + G.s === 0) say(cmtLine('first'), 1);
  else if (cmtRand() < 0.3) say(cmtLine('pitch'), 1);
}
function commentContact(c) {                     // called at the moment of contact in resolveCore
  if (cmt.mode === 0 || c.kind === 'foul') return;
  say(cmtLine(c.bases === 4 || c.q <= 0.8 ? 'hit' : 'hitBig'), 2);
}
function commentBanner(t, s) {                   // called from showBanner (the result text on screen)
  if (cmt.mode === 0) return;
  const pts = Number((t.match(/(\d)点/) || [])[1] || 0);
  let key = null, extra = '';
  if (/プレイボール/.test(t)) key = 'play';
  else if (/ホームラン/.test(t)) key = pts >= 2 ? 'hr' + pts : 'hr';
  else if (/見逃し三振/.test(t)) key = 'KL';
  else if (/三振/.test(t)) key = 'K';
  else if (/ゲッツー/.test(t)) key = 'dp';
  else if (/スクイズ成功/.test(t)) key = 'squeeze';
  else if (/犠牲フライ/.test(t)) key = 'sac';
  else if (/送りバント成功/.test(t)) key = 'bunt';
  else if (/牽制アウト/.test(t)) key = 'pick';
  else if (/盗塁/.test(t)) key = /アウト|失敗/.test(t) ? 'stealX' : 'steal';
  else if (/エラー/.test(t)) key = 'err';
  else if (/ツーベース/.test(t)) key = 'double';
  else if (/ヒット/.test(t)) key = 'single';
  else if (/ゴロアウト|内野フライ|ポップ/.test(t)) key = 'gout';
  else if (/アウト/.test(t)) key = 'fout';
  else if (/フォアボール|四球|ボール4/.test(t)) key = 'walk';
  else if (/ファウル/.test(t)) key = 'foul';
  else if (/空振り/.test(t)) key = 'miss';
  else if (/見逃しストライク/.test(t)) key = 'strike';
  else if (/^ボール/.test(t)) key = 'ball';
  else if (/^チェンジ/.test(t)) key = 'change';
  else if (/ピッチャー交代/.test(t)) key = 'relief';
  else if (/巨大バット/.test(t)) key = 'big';
  else if (/魔球/.test(t)) key = 'magic';
  if (!key || !LINES[key]) return;
  if (pts && !/^hr/.test(key)) extra = ' ' + pts + '点が入りました！';
  if (/ピッチャー交代/.test(t) && s) extra = ' ' + s.split('（')[0];
  if (/チェンジ/.test(t) && key !== 'change') extra += ' ' + cmtLine('change').text;
  if (key === 'strike' || key === 'ball' || key === 'miss' || key === 'foul') extra = ' ' + G.b + 'ボール' + G.s + 'ストライク';
  say(cmtLine(key), key === 'ball' || key === 'strike' || key === 'miss' || key === 'foul' ? 1 : 2, extra);
}
