
/* ===== 実況: 画面下のテロップ + スマホの読み上げ =====
   セリフは配列に集めてあるだけ。あとで録音/AI音声ファイルに差し替えるときは say() の中で Audio を鳴らせばよい。
   乱数は専用の簡易生成器を使う（Math.random を使うと、オンラインで withSeed 中に呼ばれたとき両端末の結果がずれる）。 */
const cmt = { mode: Number((() => { try { return localStorage.getItem('yakyu-cmt'); } catch (e) { return null; } })() ?? 2),
  s: 12345, last: {}, bat: '', pit: '', timer: 0, voice: null, n: 0 };   // mode 0:切 1:字だけ 2:字+声
const CMT_LABEL = ['実況 切', '実況 字', '実況 声'];

const LINES = {
  play: ['プレイボール！', 'さあ、試合開始です！', 'ナイターの幕が上がりました！'],
  first: ['{p}、振りかぶって…第一球！', '{b}を迎えます。{p}、投げた！', '{p}、サインにうなずいて…投げました！'],
  pitch: ['{p}、第{n}球！', '{k}です！', '{p}、投げた！', '{b}、見ています！'],
  gou: ['出た！剛速球！{v}キロ！', 'うなりをあげるストレート！', '速い！{v}キロ！'],
  chg: ['ゆるい球！タイミングを外した！', '{k}！ふわっと来た！'],
  strike: ['ストライク！', '見逃しストライク！', 'いいコース！', 'ズバッと決まった！'],
  ball: ['ボール。', 'ボール！見極めました。', 'わずかに外れました。'],
  miss: ['空振り！', 'バットが空を切る！', '振った！当たらない！'],
  K: ['三振！{b}、バットが止まりません！', '空振り三振！{p}、気持ちよく仕留めた！', '三振！見事なピッチング！'],
  KL: ['見逃し三振！手が出ません！', '見逃し三振！際どいところに決まった！'],
  walk: ['フォアボール。{b}、粘って出塁です。', '四球。{p}、制球が乱れました。'],
  foul: ['ファウル！', '打った、ファウル！', 'ファウルボール！粘ります！'],
  hit: ['打った！', 'カキーン！', '捉えた！'],
  hitBig: ['完璧な当たり！', 'いい打球だ！ぐんぐん伸びる！', 'これは大きい！'],
  single: ['ヒット！{b}、きれいに運びました！', 'ヒットです！', '外野の間を抜けた！'],
  double: ['ツーベース！ぐんぐん伸びてフェンス際！', '長打！二塁へ到達！'],
  hr: ['入った！ホームラン！', 'ホームラン！{b}、豪快な一発！', '行ったー！特大のホームランです！'],
  gout: ['ゴロです。一塁へ送ってアウト。', '内野ゴロ、アウト。', 'しっかり処理しました。'],
  fout: ['フライ！捕りました、アウト。', '打ち上げた！野手が捕って、アウト。', 'ライナー！捕られました！'],
  dp: ['ゲッツー！{p}、助かりました！', '二つ取った！ダブルプレー！', 'ゲッツー！ピンチを切り抜けた！'],
  err: ['エラー！ボールがこぼれた！', 'ああっと、エラーです！'],
  steal: ['スタートを切った！盗塁成功！', '盗塁セーフ！いい走りです！'],
  stealX: ['盗塁失敗！タッチアウト！', '刺した！ナイスなスローイング！'],
  pick: ['牽制アウト！', '走者、戻れない！'],
  bunt: ['バント成功。しっかり送りました。', '送りバント。手堅く決めた！'],
  squeeze: ['スクイズ成功！1点をもぎ取った！', '三塁走者が突っ込んだ！スクイズ決まった！'],
  sac: ['犠牲フライ！三塁走者がタッチアップ！', 'タッチアップ！1点追加！'],
  change: ['スリーアウト、チェンジです。', 'ここでチェンジ。', '攻守交代です。'],
  relief: ['ピッチャー交代です。', 'ここでマウンドを譲ります。{p}が上がります。'],
  big: ['巨大バット登場！当たる範囲が大きいぞ！', '来ました、巨大バット！'],
  magic: ['魔球モード発動！打てるのか！', '魔球です！']
};

function cmtRand() { cmt.s = (cmt.s * 1664525 + 1013904223) >>> 0; return cmt.s / 4294967296; }
function cmtLine(key, vars) {
  const a = LINES[key]; if (!a) return '';
  let i = Math.floor(cmtRand() * a.length);
  if (a.length > 1 && cmt.last[key] === i) i = (i + 1) % a.length;     // don't repeat the same line twice in a row
  cmt.last[key] = i;
  return a[i].replace(/\{(\w)\}/g, (m, k) => (vars && vars[k] != null ? vars[k] : ''));
}
function cmtVars(extra) { return Object.assign({ b: cmt.bat, p: cmt.pit }, extra || {}); }

function cmtVoice() {
  if (cmt.voice || !window.speechSynthesis) return cmt.voice;
  const vs = speechSynthesis.getVoices();
  cmt.voice = vs.find(v => /^ja/i.test(v.lang) && /google|neural|natural|premium|enhanced/i.test(v.name))
    || vs.find(v => /^ja/i.test(v.lang)) || null;
  return cmt.voice;
}
/* prio 2: cut in and speak; prio 1: only if nothing is being said */
function say(text, prio) {
  if (!text || cmt.mode === 0) return;
  const el = $('#cmt');
  el.textContent = text; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  clearTimeout(cmt.timer); cmt.timer = setTimeout(() => el.classList.remove('show'), 3800);
  if (cmt.mode !== 2 || !window.speechSynthesis) return;
  try {
    if (speechSynthesis.speaking) { if ((prio || 1) < 2) return; speechSynthesis.cancel(); }
    const u = new SpeechSynthesisUtterance(text.replace(/[！!]+/g, '！'));
    u.lang = 'ja-JP'; u.rate = 1.15; u.pitch = 1.1; u.volume = 1;
    const v = cmtVoice(); if (v) u.voice = v;
    speechSynthesis.speak(u);
  } catch (e) {}
}
function setCmtMode(m) {
  cmt.mode = m; try { localStorage.setItem('yakyu-cmt', String(m)); } catch (e) {}
  $('#cmtBtn').textContent = CMT_LABEL[m];
  if (m !== 2 && window.speechSynthesis) { try { speechSynthesis.cancel(); } catch (e) {} }
  if (m === 0) $('#cmt').classList.remove('show');
  else say(m === 2 ? '実況、声でお伝えします！' : '実況、文字でお伝えします。', 2);
}

/* ---- hooks ---- */
function commentPitch(o) {                       // called from launchBall
  const B = curBatter(), P = curPitcher(); cmt.bat = B.name; cmt.pit = P.name; cmt.n++;
  if (cmt.mode === 0) return;
  const v = cmtVars({ k: TYPES[o.key].name, v: Math.round(o.speed), n: G.b + G.s + 1 });
  if (o.key === 'gou') say(cmtLine('gou', v), 2);
  else if (o.key === 'chg' && cmtRand() < 0.6) say(cmtLine('chg', v), 1);
  else if (G.b + G.s === 0) say(cmtLine('first', v), 1);
  else if (cmtRand() < 0.3) say(cmtLine('pitch', v), 1);
}
function commentContact(c) {                     // called at the moment of contact in resolveCore
  if (cmt.mode === 0 || c.kind === 'foul') return;
  if (c.bases === 4) say(cmtLine('hit', cmtVars()) , 2);
  else say(cmtLine(c.q > 0.8 ? 'hitBig' : 'hit', cmtVars()), 2);
}
function commentBanner(t, s) {                   // called from showBanner (the result text on screen)
  if (cmt.mode === 0) return;
  const v = cmtVars(), pts = (t.match(/(\d)点/) || [])[1];
  let key = null, tail = '';
  if (/プレイボール/.test(t)) key = 'play';
  else if (/ホームラン/.test(t)) key = 'hr';
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
  if (!key) return;
  if (pts && key !== 'hr') tail = pts + '点が入りました！';
  if (pts && key === 'hr' && pts !== '1') tail = pts + 'ランホームラン！';
  if (key === 'relief') v.p = (/^ピッチャー交代/.test(t) && s ? s.split('（')[0] : cmt.pit);
  // add the count after balls and strikes, and a note when the third out ends the half-inning
  let line = cmtLine(key, v) + tail;
  if (/チェンジ/.test(t) && key !== 'change') line += ' ' + cmtLine('change', v);
  if (key === 'strike' || key === 'ball' || key === 'miss' || key === 'foul') line += ' ' + G.b + 'ボール' + G.s + 'ストライク';
  say(line, key === 'ball' || key === 'strike' || key === 'miss' || key === 'foul' ? 1 : 2);
}
