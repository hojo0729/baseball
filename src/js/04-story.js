
/* ===== story mode: どうぶつリーグ ===== */
const STAGES = [
  { short: '第1話', title: '第1話 開幕戦', opp: 'away', team: 'パンダーズ', mode: 'bat', runs: 1,
    pitcher: { speed: -10, mix: { str: 30, two: 8, cur: 14, chg: 12 } },
    intro: [['コタロウ（柴犬）', 'どうぶつリーグ開幕！ ぼくら しばいぬズの初戦だ！'],
      ['パン太監督（パンダ）', 'ふぉっふぉっ。うちの のんびり投手から 1点でも取れるかのう？'],
      ['コタロウ（柴犬）', '3回までに1点。3打席に1回は 巨大バットも使えるぞ！']],
    win: [['パン太監督（パンダ）', 'やるのう…。次はネコたちが 黙っておらんぞ。'], ['コタロウ（柴犬）', 'よーし、この調子でいこう！']],
    lose: [['パン太監督（パンダ）', 'まだまだじゃのう。'], ['コタロウ（柴犬）', 'くっ…もう一回！']] },
  { short: '第2話', title: '第2話 ネコの猛打', opp: 'neko', team: 'ニャンキーズ', mode: 'pit', max: 1, batSkill: 0.85,
    intro: [['ミケ（ネコ）', 'ニャハハ！ ぼくらニャンキーズは 打ちまくるよ！'],
      ['コタロウ（柴犬）', '今日はぼくがマウンドだ。3回を1失点以内に抑える！'],
      ['コタロウ（柴犬）', '弾く向きで球種が変わる。3人に1人は 魔球も投げられるぞ。']],
    win: [['ミケ（ネコ）', 'ニャ…ニャんで打てないの…'], ['コタロウ（柴犬）', 'ナイスピッチング！ 次はうさぎチームだ。']],
    lose: [['ミケ（ネコ）', 'ニャハハ！ 打ち放題だニャ！'], ['コタロウ（柴犬）', '配球を変えて、もう一回！']] },
  { short: '第3話', title: '第3話 逆転のうさぎ戦', opp: 'usagi', team: 'ラビッツ', mode: 'bat', runs: 3, oppRuns: 2,
    pitcher: { speed: 0, mix: { str: 14, sli: 14, cur: 12, frk: 12, snk: 8, chg: 8, knk: 6 } },
    intro: [['ウサミ（うさぎ）', 'ぴょん。もう2点 取っちゃった。わたしの変化球は ぴょんぴょん曲がるよ。'],
      ['コタロウ（柴犬）', '3回までに3点取れば 逆転だ。変化球を よく見ていこう！']],
    win: [['ウサミ（うさぎ）', 'ぴょ…逆転されちゃった…'], ['コタロウ（柴犬）', '逆転勝ち！ いよいよ決勝だ！']],
    lose: [['ウサミ（うさぎ）', 'ぴょーん、わたしの勝ち〜'], ['コタロウ（柴犬）', '曲がる方向を 読んでいこう…！']] },
  { short: '最終話', title: '最終話 剛腕ヒグマ', opp: 'kuma', team: 'ヒグマーズ', mode: 'bat', runs: 2,
    pitcher: { speed: 3, mix: { gou: 24, str: 10, frk: 10, sli: 8 } },
    intro: [['ヒグマ（くま）', '…オレの剛速球は 160キロを超える。'],
      ['コタロウ（柴犬）', 'は、速い…！ でも 巨大バットなら 当てられるはず！'],
      ['ヒグマ（くま）', '…2点。取れるものなら 取ってみろ。']],
    win: [['ヒグマ（くま）', '…見事だ。優勝は おまえたちのものだ。'], ['コタロウ（柴犬）', 'やったー！ しばいぬズ 優勝だ！']],
    lose: [['ヒグマ（くま）', '…出直してこい。'], ['コタロウ（柴犬）', 'まだ終わらない…！ もう一度！']] }
];
let ovAction = null, ovAction2 = null, ovAction3 = null, ovAction4 = null;
function loadProgress() { try { return Math.max(0, parseInt(localStorage.getItem('yakyu-progress') || '0', 10) || 0); } catch (e) { return 0; } }
function saveProgress(n) { try { localStorage.setItem('yakyu-progress', String(n)); } catch (e) {} }

/* every third plate appearance: giant bat (batting) or magic pitch (pitching) */
function giantActive() { return mode === 'bat' && !!G && G.pa % 3 === 2; }
function magicActive() { return mode === 'pit' && !!G && G.pa % 3 === 2; }

function goalLong(st) {
  if (st.mode === 'pit') return st.team + '打線を、3回1失点以内に抑えよう。'.replace('1', st.max);
  return st.oppRuns ? st.team + 'に' + st.oppRuns + '点リードされている。3回までに' + st.runs + '点取って逆転しよう。'
    : st.team + 'から、3回までに' + st.runs + '点取ろう。';
}
function updateGoal() {
  const el = $('#goal');
  if (!G || phase === 'idle') { el.innerHTML = ''; return; }
  if (online) {
    el.innerHTML = 'オンライン 部屋' + onl.code + '<br>' + teamName(onl.side) + '・' + (mode === 'bat' ? '攻撃中' : '守備中')
      + (mode === 'bat' && giantActive() ? '　<span class="hot">巨大バット！</span>' : '') + '<br>' + rosterLines();
    return;
  }
  let s = '';
  if (story) s += story.short + '　' + (story.mode === 'pit' ? story.max + '失点以内（いま' + G.runs + '失点）' : '目標 ' + story.runs + '点（いま' + G.runs + '点）') + '<br>';
  const n = 2 - G.pa % 3;
  if (mode === 'bat') s += n === 0 ? '<span class="hot">巨大バット発動中！</span>' : '巨大バットまで あと' + n + '打席';
  else s += n === 0 ? '<span class="hot">魔球モード発動中！</span>' : '魔球まで あと' + n + '人';
  el.innerHTML = s + '<br>' + rosterLines();
}
function announceChance() {
  if (!G || G.lastAnn === G.pa) return;
  if (giantActive()) { G.lastAnn = G.pa; showBanner('巨大バット！', '当たる範囲が大きくなる', 'g'); }
  else if (magicActive()) { G.lastAnn = G.pa; showBanner('魔球モード！', 'この打者には打たれにくい', 'g'); }
}

/* ---- overlay helpers ---- */
function overlay(o) {
  $('#ospk').textContent = o.spk || '';
  $('#ot').textContent = o.title || ''; $('#ot').hidden = !o.title;
  $('#od').textContent = o.text || '';
  $('#overlay').classList.toggle('dlg', !!o.dlg);
  const g1 = $('#goBtn'), g2 = $('#go2');
  g1.hidden = !o.b1; g2.hidden = !o.b2;
  if (o.b1) { g1.textContent = o.b1[0]; ovAction = o.b1[1]; }
  if (o.b2) { g2.textContent = o.b2[0]; ovAction2 = o.b2[1]; }
  const g3 = $('#go3'); g3.hidden = !o.b3;
  if (o.b3) { g3.textContent = o.b3[0]; ovAction3 = o.b3[1]; }
  const g4 = $('#go4'); g4.hidden = !o.b4;
  if (o.b4) { g4.textContent = o.b4[0]; ovAction4 = o.b4[1]; }
  const ci = $('#codeIn'); ci.hidden = !o.input;
  if (o.input) { ci.value = ''; setTimeout(() => { try { ci.focus(); } catch (e) {} }, 60); }
  $('#overlay').hidden = false;
}
function dialog(lines, done) {
  let i = 0;
  const step = () => {
    if (i >= lines.length) { done(); return; }
    const [spk, text] = lines[i++];
    overlay({ spk, text, dlg: true, b1: ['▶ つぎへ', step], b2: ['スキップ', done] });
  };
  step();
}
function idle() { clearPlay(); phase = 'idle'; pendBanner = null; sign = null; cpuStealPlan = false; cpuBuntPlan = false; setHint(''); updateGoal(); }

/* ---- menu / free play / story flow ---- */
function showMenu() {
  if (onl.ch || online) leaveRoom();
  story = null; idle();
  $('.seg').hidden = true; $('#menuBtn').hidden = true;
  const done = loadProgress();
  overlay({
    title: 'どうぶつリーグ',
    text: done >= STAGES.length ? '全話クリア済み。ストーリーは第1話から遊び直せます。' : 'しばいぬズを優勝に導こう。ストーリーは ' + STAGES[done].short + ' から。',
    b1: ['ストーリー', startStory], b2: ['フリー対戦', startFree], b3: ['オンライン対戦', showOnlineMenu], b4: ['友達に送る', shareGame]
  });
}
function startFree() {
  story = null;
  $('.seg').hidden = false; $('#menuBtn').hidden = false;
  setMode(mode);
}
function startStory() {
  let i = loadProgress(); if (i >= STAGES.length) i = 0;
  showStage(i);
}
function showStage(i) {
  story = STAGES[i];
  mode = story.mode;
  $('#mBat').classList.toggle('on', mode === 'bat'); $('#mPit').classList.toggle('on', mode === 'pit');
  $('.seg').hidden = true; $('#menuBtn').hidden = false;
  $('#pitches').hidden = mode !== 'pit';
  setTeams(); newGame(); idle(); resize();
  dialog(story.intro, () => overlay({ title: story.title, text: goalLong(story), b1: ['プレイボール', startGame], b2: ['メニュー', showMenu] }));
}
function storyCheck() {
  if (story.mode === 'bat') { if (G.runs >= story.runs) return 'clear'; if (G.over) return 'fail'; }
  else { if (G.runs > story.max) return 'fail'; if (G.over) return 'clear'; }
  return null;
}
function storyEnd(win) {
  idle();
  const st = story, i = STAGES.indexOf(st);
  dialog(win ? st.win : st.lose, () => {
    if (!win) { overlay({ title: '敗北…', text: goalLong(st), b1: ['もう一度', startGame], b2: ['メニュー', showMenu] }); return; }
    saveProgress(Math.max(loadProgress(), i + 1));
    if (i + 1 >= STAGES.length) overlay({ title: '優勝！', text: 'しばいぬズ、どうぶつリーグ制覇。おめでとう！', b1: ['メニューへ', showMenu] });
    else overlay({ title: 'ステージクリア', text: st.title + ' クリア！', b1: ['次の話へ', () => showStage(i + 1)], b2: ['メニュー', showMenu] });
  });
}
