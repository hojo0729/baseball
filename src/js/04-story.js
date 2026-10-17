
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
      ['コタロウ（柴犬）', '弾く向きで球種が変わる。3人に1人は ラッキーボールで打たれにくくなるぞ。']],
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
/* automatic helpers (giant bat / lucky ball) are for story and practice only, not for the head-to-head games */
const helpersOn = () => !online && !match;
function giantActive() { return helpersOn() && mode === 'bat' && !!G && G.pa % 3 === 2; }
function magicActive() { return helpersOn() && mode === 'pit' && !!G && G.pa % 3 === 2; }

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
  if (match) { el.innerHTML = 'CPU対戦 vs ' + ROSTER[match.opp].name + '（' + DIFF[diffLv].name + '）・' + (mode === 'bat' ? '攻撃中' : '守備中') + '<br>' + rosterLines(); return; }
  let s = '';
  if (story) s += story.short + '　' + (story.mode === 'pit' ? story.max + '失点以内（いま' + G.runs + '失点）' : '目標 ' + story.runs + '点（いま' + G.runs + '点）') + '<br>';
  const n = 2 - G.pa % 3;
  if (mode === 'bat') s += n === 0 ? '<span class="hot">巨大バット発動中！</span>' : '巨大バットまで あと' + n + '打席';
  else s += n === 0 ? '<span class="hot">ラッキーボール発動中！</span>' : 'ラッキーボールまで あと' + n + '人';
  el.innerHTML = s + '<br>' + rosterLines();
}
function announceChance() {
  if (!G || G.lastAnn === G.pa || starCheck()) return;
  if (giantActive()) { G.lastAnn = G.pa; showBanner('巨大バット！', '当たる範囲が大きくなる', 'g'); }
  else if (magicActive()) { G.lastAnn = G.pa; showBanner('ラッキーボール！', 'この打者には打たれにくい', 'g'); }
}

/* ---- overlay helpers ---- */
function overlay(o) {
  $('#ospk').textContent = o.spk || '';
  $('#ot').textContent = o.title || ''; $('#ot').hidden = !o.title;
  $('#od').textContent = o.text || '';
  $('#overlay').classList.toggle('dlg', !!o.dlg);
  $('#overlay').classList.toggle('logo', !!o.logo);
  $('#overlay').classList.toggle('clear', !!o.clear);
  const bd = $('#obadge'); bd.hidden = !o.logo;
  if (o.logo && !bd.childElementCount) TEAM_ORDER.forEach(t => {          // 5チームのバッジ
    const i = document.createElement('i'); i.textContent = TEAM_COL[t][1]; i.style.background = TEAM_COL[t][0]; bd.appendChild(i);
  });
  /* label 'name\nsmall text' -> two lines. optional 3rd item: team key for a color stripe */
  const setB = (el, b) => {
    el.hidden = !b; if (!b) return;
    const [main, sub] = b[0].split('\n');
    el.textContent = main;
    if (sub) { const s = document.createElement('small'); s.textContent = sub; el.appendChild(s); }
    el.style.setProperty('--tc', b[2] ? TEAM_COL[b[2]][0] : 'transparent');
    el.classList.toggle('team', !!b[2]);
  };
  setB($('#goBtn'), o.b1); if (o.b1) ovAction = o.b1[1];
  setB($('#go2'), o.b2); if (o.b2) ovAction2 = o.b2[1];
  setB($('#go3'), o.b3); if (o.b3) ovAction3 = o.b3[1];
  setB($('#go4'), o.b4); if (o.b4) ovAction4 = o.b4[1];
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
  story = null; match = null; idle();
  $('.seg').hidden = true; $('#menuBtn').hidden = true;
  const done = loadProgress();
  overlay({
    title: 'どうぶつリーグ', logo: true,
    text: done >= STAGES.length ? '全話クリア済み。ストーリーは第1話から遊び直せます。' : 'しばいぬズを優勝に導こう。ストーリーは ' + STAGES[done].short + ' から。',
    b1: ['ストーリー', startStory], b2: ['CPU対戦', showCpuMenu], b3: ['オンライン対戦', showOnlineMenu], b4: ['友達に送る', shareGame]
  });
}
function startFree() {
  story = null; match = null;
  $('.seg').hidden = false; $('#menuBtn').hidden = false;
  setMode(mode);
}
/* ---- CPU対戦：9回の試合（先攻・後攻を交代しながら）。相手チームはランダム ---- */
let match = null;   // { side: 'home'|'away'（自分が後攻か先攻か）, mine: 自分のロスター, opp: 相手のロスター, score, half }
function showCpuMenu() {
  overlay({ title: 'CPU対戦', text: '9回までの試合。表と裏で、打つのと投げるのを交代します。同点なら12回まで延長。（いまのCPU：' + DIFF[diffLv].name + '）',
    b1: ['先攻で試合', () => pickTeam('away')], b2: ['後攻で試合', () => pickTeam('home')],
    b3: ['練習（打つだけ／投げるだけ）', startFree], b4: ['もどる', showMenu] });
}
/* 自分のチームを選ぶ（相手はほかの4チームからランダム）→ CPUの強さ → 試合開始 */
const TEAM_ORDER = ['home', 'away', 'neko', 'usagi', 'kuma'];
const TEAM_COL = { home: ['#d0452a', '柴'], away: ['#2f5aa0', 'パ'], neko: ['#7a56b5', '猫'], usagi: ['#2f9a6c', '兎'], kuma: ['#b8901f', '熊'] };
function pickTeam(side, page) {
  const go = t => () => chooseDiff(() => startMatch(side, t));
  const ts = page ? TEAM_ORDER.slice(3) : TEAM_ORDER.slice(0, 3), o = { title: 'チームをえらぶ',
    text: '相手はほかのチームからランダム。チームごとに固有スキルがあります。' };
  ts.forEach((t, i) => { o['b' + (i + 1)] = [ROSTER[t].name + '\n' + TRAIT[t].n + '：' + TRAIT[t].d, go(t), t]; });
  if (page) o.b3 = ['◀ もどる', () => pickTeam(side, 0)]; else o.b4 = ['ほかのチーム ▶', () => pickTeam(side, 1)];
  overlay(o);
}
/* CPUの強さを選んでから始める（選んだ強さは次回も使う。練習モードにも効く） */
function chooseDiff(go) {
  const pick = i => () => { setDiff(i); go(); };
  overlay({ title: 'CPUの強さ', text: 'よわい：初めての人や子ども向け　ふつう：これまでと同じ　つよい：際どい球と鋭いスイング　鬼：ほぼプロ',
    b1: ['よわい', pick(0)], b2: ['ふつう', pick(1)], b3: ['つよい', pick(2)], b4: ['鬼', pick(3)] });
}
function matchRole() {
  match.half = G.inning;
  mode = battingSide() === match.side ? 'bat' : 'pit';
  $('#mBat').classList.toggle('on', mode === 'bat'); $('#mPit').classList.toggle('on', mode === 'pit');
  $('#pitches').hidden = mode !== 'pit';
  setTeams(); resize(); hud();
}
function matchHint() { return mode === 'bat' ? '投手が投げたら、ボールが通る位置をタップして打つ' : '弾く向きで球種が決まる。指を離した位置がコース、弾く速さが球速'; }
function startMatch(side, mine) {
  audioInit(); story = null; mine = mine || 'home';
  const opps = TEAM_ORDER.filter(t => t !== mine);
  match = { side, mine, opp: opps[Math.floor(Math.random() * opps.length)], score: { home: 0, away: 0 }, half: 0 };
  newGame(); G.maxHalf = 18; G.skill = { crit: 3, vn: 3 };
  $('.seg').hidden = true; $('#menuBtn').hidden = false; $('#overlay').hidden = true;
  matchRole();
  showBanner('プレイボール', ROSTER[mine].name + '（' + (side === 'away' ? '先攻' : '後攻') + '） 対 ' + ROSTER[match.opp].name, 'g');
  const dd = applyInningDice(); if (dd) setTimeout(() => showDiceBanner(dd), 1900);
  phase = mode === 'bat' ? 'wait' : 'ready'; nextAt = now_() + (dd ? 5.5 : 2.4);
  setHint(matchHint()); updateGoal();
}
function matchAfterResult() {
  const sb = onlineScore();
  if (G.inning >= G.maxHalf && G.inning % 2 === 0 && sb.home > sb.away) G.over = true;   // サヨナラ
  if (G.over) { showMatchOver(); return; }
  clearPlay();
  let wait = rnd(1.6, 2.2);
  if (G.inning !== match.half) {                     // チェンジ：攻守交代
    matchRole();
    const dd = applyInningDice();
    showBanner('チェンジ', inningLabel() + '　' + (mode === 'bat' ? '攻撃' : '守備'), 'n');
    if (dd) { setTimeout(() => showDiceBanner(dd), 1600); wait += 3.5; } else wait += 0.8;
  }
  phase = mode === 'bat' ? 'wait' : 'ready';
  nextAt = now_() + wait;
  if (mode === 'bat' && stealers().length) nextAt += 1.2;
  cpuStealPlan = mode === 'pit' && stealers().length > 0 && Math.random() < cpuStealChance();
  cpuBuntPlan = mode === 'pit' && !cpuStealPlan && (G.bases[0] || G.bases[1]) && G.outs === 0 && Math.random() < 0.3;
  cpuRelief();
  updateGoal(); announceChance();
  setHint(matchHint());
}
function showMatchOver() {
  const sb = onlineScore(), me = sb[match.side], cpu = sb[match.side === 'home' ? 'away' : 'home'], opp = ROSTER[match.opp].name;
  const inn = Math.ceil(Math.min(G.inning, 24) / 2);
  idle();
  if (me > cpu) celebrate(now_() + 0.2, 6);
  overlay({ clear: me > cpu, title: me > cpu ? '勝ち！' : me < cpu ? '負け…' : '引き分け', text: ROSTER[match.mine].name + ' ' + me + ' - ' + cpu + ' ' + opp + (inn > 9 ? '（延長' + inn + '回）' : ''),
    b1: ['もう一度', showCpuMenu], b2: ['メニュー', showMenu] });
}
/* the menu button during a CPU match: the game stops while the sheet is open */
function matchPause() {
  overlay({ title: '試合中', text: inningLabel() + '　' + $('#slab').textContent + '　' + $('#runs').textContent,
    b1: ['試合にもどる', () => { $('#overlay').hidden = true; }], b2: ['試合をやめる', showMenu] });
}
function startStory() {
  let i = loadProgress(); if (i >= STAGES.length) i = 0;
  showStage(i);
}
function showStage(i) {
  match = null;
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

/* メニューなどの画面が開いている間は、試合用の表示（実況ボタン・選手情報・下の操作）を隠す */
new MutationObserver(() => $('#app').classList.toggle('ov', !$('#overlay').hidden && !$('#overlay').classList.contains('dlg')))
  .observe($('#overlay'), { attributes: true, attributeFilter: ['hidden', 'class'] });
