
/* ===== 実況: 画面下のテロップ + スマホの読み上げ =====
   セリフは配列に集めてあるだけ。あとで録音/AI音声ファイルに差し替えるときは say() の中で Audio を鳴らせばよい。
   乱数は専用の簡易生成器を使う（Math.random を使うと、オンラインで withSeed 中に呼ばれたとき両端末の結果がずれる）。 */
const cmt = { mode: Number((() => { try { return localStorage.getItem('yakyu-cmt'); } catch (e) { return null; } })() ?? 2),
  s: 12345, last: {}, bat: '', pit: '', timer: 0, voice: null, n: 0 };   // mode 0:切 1:字だけ 2:字+声
const CMT_LABEL = ['実況 切', '実況 字', '実況 声'];
function cmtUnlock() { if (cmt.mode === 2) cmtPreload(); }   // first tap: start loading the recordings

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
  fout: ['フライ！捕りました、アウト。', '打ち上げた！野手が捕って、アウト。'],
  lout: ['ライナー！捕られました！'],
  pout: ['内野フライ！捕りました、アウト。', '高く上がった！しっかり捕ってアウト。'],
  force: ['フォースプレー！アウトです！', 'いい判断！しっかり送球してアウト。', 'そっちを選びました！アウト！'],
  allsafe: ['間に合わなかった！オールセーフ！', 'セーフ！ランナーが溜まります。'],
  hbp: ['デッドボール！当たってしまいました！', 'ああっ、デッドボール！大丈夫でしょうか。'],
  brawl: ['乱闘です！ベンチから選手が飛び出した！', '二つ目のデッドボール！乱闘になりました！'],
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
  magic: ['ラッキーボール発動！打たれにくいぞ！', 'ラッキーボールです！'],
  star: ['スーパースター登場！球場がわいています！', '来ました！二刀流のスーパースター！'],
  starP: ['二刀流スターがマウンドへ！', 'スター登板です！'],
  lefty: ['サウスポーの登場です！', '左腕がマウンドに上がります！'],
  crit: ['会心の一振り！', '会心の当たりだ！'],
  vanish: ['出た！消える魔球！', 'ボールが消えた！'],
  super: ['すごい！スーパープレー！', 'なんという守備だ！飛びつきました！'],
  extra: ['延長戦に突入です！', '決着は延長へ！'],
  dice: ['さあ、運命のサイコロです！', 'サイコロ！何が出るか！'],
  dice1: ['大凶です！いきなり2アウト！'],
  dice2: ['凶です…1アウトからのスタート。'],
  dice3: ['パワーもミートも大幅アップ！一発あるか！'],
  dice4: ['ノーアウト一・二塁のチャンス！'],
  dice5: ['ノーアウト満塁！大チャンスです！'],
  dice6: ['満塁で打者も絶好調！大当たりだ！']
};

function cmtRand() { cmt.s = (cmt.s * 1664525 + 1013904223) >>> 0; return cmt.s / 4294967296; }
function cmtLine(key) {
  const a = LINES[key]; if (!a) return null;
  let i = Math.floor(cmtRand() * a.length);
  if (a.length > 1 && cmt.last[key] === i) i = (i + 1) % a.length;     // don't repeat the same line twice in a row
  cmt.last[key] = i;
  return { text: a[i], id: key + '_' + (i + 1) };                        // id = voice file name: audio/<id>.mp3
}

function showCmtText(text) {
  const el = $('#cmt');
  el.textContent = text; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  clearTimeout(cmt.timer); cmt.timer = setTimeout(() => el.classList.remove('show'), 3800);
}
/* 録音ファイル docs/audio/<id>.mp3 があればそれを再生する（無ければ字幕だけ）。
   id は LINES の key_番号（例 hr_2）。ファイル一覧は tools/export-voice-script.mjs で出せる。 */
const VOICE_IDS = /*VOICE_IDS*/[];   // filled in by build.mjs from the files in docs/audio
function cmtPreload() {
  if (cmt.pre) return; cmt.pre = {};
  VOICE_IDS.forEach(id => {
    const a = new Audio('audio/' + id + '.mp3'); a.preload = 'auto';
    a.addEventListener('error', () => { cmt.pre[id] = null; });
    cmt.pre[id] = a;
  });
}
function cmtPlayFile(id) {                       // true if a recording is being played
  const a = cmt.pre && cmt.pre[id]; if (!a || a.error) return false;
  try { a.currentTime = 0; const p = a.play(); if (p && p.catch) p.catch(() => { cmt.pre[id] = null; }); cmt.cur = a; return true; }
  catch (e) { return false; }
}
function cmtBusy() { const a = cmt.cur; return !!(a && !a.paused && !a.ended); }
function cmtStop() { if (cmt.cur) { try { cmt.cur.pause(); } catch (e) {} cmt.cur = null; } }
/* L: {text, id} from cmtLine(). extra: count / score text shown on the ticker only.
   prio 2: cut in; prio 1: only if nothing is being said. Lines with no recording stay silent (ticker only). */
function say(L, prio, extra) {
  if (!L || cmt.mode === 0) return;
  showCmtText(L.text + (extra || ''));
  if (cmt.mode !== 2) return;
  if (cmtBusy()) { if ((prio || 1) < 2) return; cmtStop(); }
  cmtPlayFile(L.id);
}
function setCmtMode(m) {
  cmt.mode = m; try { localStorage.setItem('yakyu-cmt', String(m)); } catch (e) {}
  $('#cmtBtn').textContent = CMT_LABEL[m];
  if (m !== 2) cmtStop();
  if (m === 0) $('#cmt').classList.remove('show');
  else { if (m === 2) cmtPreload(); say({ text: m === 2 ? '実況、声でお伝えします！' : '実況、文字でお伝えします。', id: 'x' }, 2); }
}

/* ---- hooks ---- */
function commentPitch(o) {                       // called from launchBall
  const B = curBatter(), P = curPitcher(); cmt.bat = B.name; cmt.pit = P.name;
  if (cmt.mode === 0) return;
  if (o.vn) say(cmtLine('vanish'), 2);
  else if (o.key === 'gou') say(cmtLine('gou'), 2);
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
  else if (/スーパースター登場/.test(t)) key = 'star';
  else if (/二刀流スター登板/.test(t)) key = 'starP';
  else if (/サイコロ/.test(t)) key = 'dice';
  else if (/ホームラン/.test(t)) key = pts >= 2 ? 'hr' + pts : 'hr';
  else if (/見逃し三振/.test(t)) key = 'KL';
  else if (/三振/.test(t)) key = 'K';
  else if (/乱闘/.test(t)) key = 'brawl';
  else if (/デッドボール/.test(t)) key = 'hbp';
  else if (/ゲッツー/.test(t)) key = 'dp';
  else if (/フォースアウト|タッチアウト/.test(t)) key = 'force';
  else if (/オールセーフ|ホームでセーフ/.test(t)) key = 'allsafe';
  else if (/スクイズ成功/.test(t)) key = 'squeeze';
  else if (/犠牲フライ/.test(t)) key = 'sac';
  else if (/送りバント成功/.test(t)) key = 'bunt';
  else if (/牽制アウト/.test(t)) key = 'pick';
  else if (/盗塁/.test(t)) key = /アウト|失敗/.test(t) ? 'stealX' : 'steal';
  else if (/エラー/.test(t)) key = 'err';
  else if (/ツーベース/.test(t)) key = 'double';
  else if (/ヒット/.test(t)) key = 'single';
  else if (/内野フライ|ポップ/.test(t)) key = 'pout';
  else if (/ライナー/.test(t)) key = 'lout';
  else if (/ゴロ/.test(t)) key = 'gout';
  else if (/アウト/.test(t)) key = 'fout';
  else if (/フォアボール|四球|ボール4/.test(t)) key = 'walk';
  else if (/ファウル/.test(t)) key = 'foul';
  else if (/空振り/.test(t)) key = 'miss';
  else if (/見逃しストライク/.test(t)) key = 'strike';
  else if (/^ボール/.test(t)) key = 'ball';
  else if (/^チェンジ/.test(t)) key = 'change';
  else if (/ピッチャー交代/.test(t)) key = 'relief';
  else if (/巨大バット/.test(t)) key = 'big';
  else if (/ラッキーボール/.test(t)) key = 'magic';
  if (key === 'relief' && /サウスポー/.test(s || '')) key = 'lefty';
  if (key === 'change' && twoTeam() && G.inning === (G.maxHalf || 6) + 1) key = 'extra';
  if (/^会心/.test(s || '') && !/^hr/.test(key)) key = 'crit';
  if (/^スーパープレー/.test(s || '') && !/^hr/.test(key) && key !== 'crit') key = 'super';
  if (!key || !LINES[key]) return;
  if (pts && !/^hr/.test(key)) extra = ' ' + pts + '点が入りました！';
  if (/ピッチャー交代/.test(t) && s) extra = ' ' + s.split('（')[0];
  if (/チェンジ/.test(t) && key !== 'change') extra += ' ' + cmtLine('change').text;
  if (key === 'strike' || key === 'ball' || key === 'miss' || key === 'foul') extra = ' ' + G.b + 'ボール' + G.s + 'ストライク';
  say(cmtLine(key), key === 'ball' || key === 'strike' || key === 'miss' || key === 'foul' ? 1 : 2, extra);
}
