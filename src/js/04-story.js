
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
  { short: '第4話', title: '第4話 剛腕ヒグマ', opp: 'kuma', team: 'ヒグマーズ', mode: 'bat', runs: 2,
    pitcher: { speed: 3, mix: { gou: 24, str: 10, frk: 10, sli: 8 } },
    intro: [['ヒグマ（くま）', '…オレの剛速球は 160キロを超える。'],
      ['コタロウ（柴犬）', 'は、速い…！ でも 巨大バットなら 当てられるはず！'],
      ['ヒグマ（くま）', '…2点。取れるものなら 取ってみろ。']],
    win: [['ヒグマ（くま）', '…見事だ。どうぶつリーグ優勝は おまえたちのものだ。'],
      ['コタロウ（柴犬）', 'やったー！ しばいぬズ 優勝だ！'],
      ['エリート幹部（人間）', '…フッ、ずいぶんと楽しそうだな、家畜どもが。']],
    lose: [['ヒグマ（くま）', '…出直してこい。'], ['コタロウ（柴犬）', 'まだ終わらない…！ もう一度！']] },
  { short: '第5話', title: '最終話 審判の日 人間たちの野球', opp: 'human', team: 'ヒューマンズ', mode: 'bat', inn: 5, maxInn: 7,
    pitcher: { speed: 4, mix: { str: 20, sli: 16, frk: 14, gou: 12, cut: 10 } },
    intro: [
      ['エリート幹部（人間）', '…フッ、ずいぶんと楽しそうだな、動物どもが。'],
      ['コタロウ（柴犬）', 'だ、誰だ！？ 人間がどうしてスタジアムに…？'],
      ['エリート幹部（人間）', 'お前たちがなぜ動物の姿をしているか、本当に知らないのか？'],
      ['ヒグマ（くま）', '…思い出したぞ！ オレたちはかつて、野球の審判に負けて動物にされた人間だった！'],
      ['パン太（パンダ）', 'なんじゃと…！？ わしらは…人間じゃったのか…！'],
      ['エリート幹部（人間）', 'このリーグは敗残者の隔離施設。だが、我ら人間に5回で勝てば…全員『人間』に戻してやろう。'],
      ['ミケ（ネコ）', '負けたら…一生この毛皮のままニャの…！？'],
      ['コタロウ（柴犬）', 'みんな！ 人間の姿と自由を取り戻すために…オールスターで絶対に勝つぞ！']
    ],
    win: [
      ['エリート幹部（人間）', 'バカな…動物どもに…我々人間が敗れるなど…！'],
      ['コタロウ（柴犬）', '勝った…勝ったぞ！ あれ…体が光って…毛皮が…！？'],
      ['ミケ（ネコ）', '手が…人間の手になってるニャ…ううん、なってるよ！'],
      ['ヒグマ（くま）', '戻れたんだ…オレたちは、人間だ！'],
      ['コタロウ（柴犬）', 'ありがとう、みんな！ ぼくたちの本当の自由だ！']
    ],
    lose: [
      ['エリート幹部（人間）', '所詮は動物。永遠にその毛皮の中で暮らすがいい。'],
      ['コタロウ（柴犬）', 'くっ…ここで諦めるわけにはいかない…もう一度だ！']
    ] }
];
let ovAction = null, ovAction2 = null, ovAction3 = null, ovAction4 = null, ovAction5 = null, ovAction6 = null;
function loadProgress() { try { return Math.max(0, parseInt(localStorage.getItem('yakyu-progress') || '0', 10) || 0); } catch (e) { return 0; } }
function saveProgress(n) { try { localStorage.setItem('yakyu-progress', String(n)); } catch (e) {} }

/* every third plate appearance: giant bat (batting) or magic pitch (pitching) */
/* automatic helpers (giant bat / lucky ball) are for story and practice only, not for the head-to-head games */
const helpersOn = () => !online && !match && !(story && story.inn);
function giantActive() { return helpersOn() && mode === 'bat' && !!G && G.pa % 3 === 2; }
function magicActive() { return helpersOn() && mode === 'pit' && !!G && G.pa % 3 === 2; }

function goalLong(st) {
  if (st.inn) return st.team + 'との審判の5回勝負。勝って人間の姿と自由を取り戻そう！（同点なら7回まで延長）';
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
  if (story) {
    if (story.inn) {
      s += story.short + ' vs ' + ROSTER[story.opp].name + '（5回戦・延長7回まで）　' + (mode === 'bat' ? '攻撃中' : '守備中') + '<br>';
      el.innerHTML = s + rosterLines();
      return;
    }
    s += story.short + '　' + (story.mode === 'pit' ? story.max + '失点以内（いま' + G.runs + '失点）' : '目標 ' + story.runs + '点（いま' + G.runs + '点）') + '<br>';
  }
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
const ICON_URL = {};
function teamIcon(team) {
  if (ICON_URL[team]) return ICON_URL[team];
  const sp = UNIFORM[team].species, S = SPECIES[sp], cv = document.createElement('canvas');
  cv.width = cv.height = 72;
  const g = cv.getContext('2d');
  g.lineJoin = 'round'; g.lineCap = 'round'; g.strokeStyle = '#2b1d16'; g.lineWidth = 2.4;
  if (sp === 'human') {
    g.fillStyle = S.HEAD; g.beginPath(); g.ellipse(36, 42, 20, 18, 0, 0, 7); g.fill(); g.stroke();
    g.fillStyle = '#1c1b18'; g.beginPath(); g.ellipse(36, 26, 20, 10, 0, Math.PI, Math.PI * 2); g.fill();
    [-1, 1].forEach(s => {
      g.fillStyle = '#1b1a1f'; g.beginPath(); g.ellipse(36 + s * 9, 41, 3.2, 3.5, 0, 0, 7); g.fill();
      g.fillStyle = '#ffffff'; g.beginPath(); g.arc(36 + s * 9 - 1, 39.5, 1.3, 0, 7); g.fill();
      g.strokeStyle = '#221915'; g.lineWidth = 1.8; g.beginPath();
      g.moveTo(36 + s * 4.5, 36); g.lineTo(36 + s * 13, 35.5); g.stroke();
    });
    g.strokeStyle = '#6a4232'; g.lineWidth = 1.6; g.beginPath();
    g.moveTo(33, 49); g.lineTo(39, 49); g.stroke();
    return (ICON_URL[team] = cv.toDataURL());
  }
  [-1, 1].forEach(s => {
    g.save(); g.translate(36 + s * (S.ear === 'long' ? 11 : 17), S.ear === 'long' ? 17 : 22);
    if (S.ear === 'cone') {
      g.rotate(s * 0.32);
      g.fillStyle = S.EARC; g.beginPath(); g.moveTo(-9, 10); g.lineTo(0, -12); g.lineTo(9, 10); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = S.EARIN; g.beginPath(); g.moveTo(-5, 7); g.lineTo(0, -6); g.lineTo(5, 7); g.closePath(); g.fill();
    } else if (S.ear === 'long') {
      g.rotate(s * 0.14);
      g.fillStyle = S.EARC; g.beginPath(); g.ellipse(0, 0, 6.2, 15, 0, 0, 7); g.fill(); g.stroke();
      g.fillStyle = S.EARIN; g.beginPath(); g.ellipse(0, 1, 3.4, 10.5, 0, 0, 7); g.fill();
    } else {
      g.fillStyle = S.EARC; g.beginPath(); g.arc(0, 0, 9.5, 0, 7); g.fill(); g.stroke();
      g.fillStyle = S.EARIN; g.beginPath(); g.arc(0, 0, 5.2, 0, 7); g.fill();
    }
    g.restore();
  });
  g.fillStyle = S.HEAD; g.beginPath(); g.ellipse(36, 43, 21, 18.5, 0, 0, 7); g.fill(); g.stroke();
  if (sp === 'shiba') {
    g.fillStyle = S.MUZ;
    g.beginPath(); g.ellipse(25, 48, 8.5, 7, -0.2, 0, 7); g.ellipse(47, 48, 8.5, 7, 0.2, 0, 7); g.fill();
    g.beginPath(); g.ellipse(27, 33.5, 3.2, 1.9, -0.15, 0, 7); g.ellipse(45, 33.5, 3.2, 1.9, 0.15, 0, 7); g.fill();
  }
  if (sp === 'panda') {
    g.fillStyle = S.PATCH;
    [-1, 1].forEach(s => { g.beginPath(); g.ellipse(36 + s * 9.5, 41.5, 6, 7.5, s * 0.35, 0, 7); g.fill(); });
  }
  if (sp === 'neko') {
    g.fillStyle = '#8c5220';
    [-5, 0, 5].forEach((dx, i) => { g.beginPath(); g.ellipse(36 + dx, 28.5 + (i === 1 ? 1 : 0), 1.4, 4, 0, 0, 7); g.fill(); });
  }
  g.fillStyle = S.MUZ; g.beginPath(); g.ellipse(36, 47.5, sp === 'kuma' ? 9.5 : 8, 6.2, 0, 0, 7); g.fill();
  g.fillStyle = 'rgba(255,110,125,0.5)';
  [-1, 1].forEach(s => { g.beginPath(); g.ellipse(36 + s * 14.5, 46.5, 3.8, 2.3, 0, 0, 7); g.fill(); });
  if (sp === 'kuma') {
    g.strokeStyle = '#3a2010'; g.lineWidth = 2.8;
    [-1, 1].forEach(s => { g.beginPath(); g.moveTo(36 + s * 5.5, 34.5); g.lineTo(36 + s * 13.5, 33); g.stroke(); });
  }
  if (sp === 'neko') {
    g.strokeStyle = '#5a3b22'; g.lineWidth = 1.6;
    [-1, 1].forEach(s => {
      g.beginPath(); g.moveTo(36 + s * 13, 45); g.lineTo(36 + s * 20, 44);
      g.moveTo(36 + s * 13, 48); g.lineTo(36 + s * 20, 48.5); g.stroke();
    });
  }
  [-1, 1].forEach(s => {
    g.fillStyle = '#1b1a1f'; g.beginPath(); g.ellipse(36 + s * 9.5, 41, 3.3, 3.8, 0, 0, 7); g.fill();
    g.fillStyle = '#ffffff'; g.beginPath(); g.arc(36 + s * 9.5 - 1.1, 39.5, 1.35, 0, 7); g.fill();
  });
  if (sp === 'usagi') {
    g.fillStyle = '#ffffff'; g.fillRect(34.3, 49.2, 3.4, 3.2);
  }
  g.strokeStyle = '#2b1d16'; g.lineWidth = 1.8;
  g.beginPath(); g.arc(33.4, 48.2, 2.6, 0.1, Math.PI - 0.1); g.stroke();
  g.beginPath(); g.arc(38.6, 48.2, 2.6, 0.1, Math.PI - 0.1); g.stroke();
  g.fillStyle = S.NOSE; g.beginPath(); g.ellipse(36, 45, 3.1, 2.2, 0, 0, 7); g.fill();
  return (ICON_URL[team] = cv.toDataURL());
}
function spkTeam(spk) {
  if (!spk) return null;
  if (spk.includes('人')) return 'human';
  if (spk.includes('柴')) return 'home';
  if (spk.includes('パンダ')) return 'away';
  if (spk.includes('ネコ')) return 'neko';
  if (spk.includes('うさぎ')) return 'usagi';
  if (spk.includes('くま')) return 'kuma';
  return null;
}
function overlay(o) {
  const spkEl = $('#ospk'), st = spkTeam(o.spk);
  spkEl.textContent = '';
  if (o.spk) {
    if (st) { const im = new Image(); im.className = 'av'; im.src = teamIcon(st); spkEl.appendChild(im); spkEl.style.background = TEAM_COL[st][0]; }
    else spkEl.style.background = '';
    spkEl.appendChild(document.createTextNode(o.spk));
  }
  $('#ot').textContent = o.title || ''; $('#ot').hidden = !o.title;
  $('#od').textContent = o.text || '';
  $('#overlay').classList.toggle('dlg', !!o.dlg);
  $('#overlay').classList.toggle('logo', !!o.logo);
  $('#overlay').classList.toggle('clear', !!o.clear);
  $('#overlay').classList.toggle('cred', !!o.cred);
  $('#goBtn').classList.toggle('plain', !!o.plain);
  const bd = $('#obadge'); bd.hidden = !o.logo;
  if (o.logo && !bd.childElementCount) TEAM_ORDER.forEach(t => {          // 5チームのどうぶつ顔バッジ
    const i = document.createElement('i'); i.style.background = TEAM_COL[t][0];
    const im = new Image(); im.src = teamIcon(t); im.alt = TEAM_COL[t][1]; i.appendChild(im);
    bd.appendChild(i);
  });
  /* label 'name\nsmall text' -> two lines. optional 3rd item: team key for a color stripe & animal icon */
  const setB = (el, b) => {
    el.hidden = !b; if (!b) return;
    const [main, sub] = b[0].split('\n');
    el.textContent = '';
    if (b[2]) { const im = new Image(); im.className = 'av'; im.src = teamIcon(b[2]); el.appendChild(im); }
    const wrap = document.createElement('span'); wrap.textContent = main;
    if (sub) { const s = document.createElement('small'); s.textContent = sub; wrap.appendChild(s); }
    el.appendChild(wrap);
    el.style.setProperty('--tc', b[2] ? TEAM_COL[b[2]][0] : 'transparent');
    el.classList.toggle('team', !!b[2]);
  };
  setB($('#goBtn'), o.b1); if (o.b1) ovAction = o.b1[1];
  setB($('#go2'), o.b2); if (o.b2) ovAction2 = o.b2[1];
  setB($('#go3'), o.b3); if (o.b3) ovAction3 = o.b3[1];
  setB($('#go4'), o.b4); if (o.b4) ovAction4 = o.b4[1];
  setB($('#go5'), o.b5); if (o.b5) ovAction5 = o.b5[1];
  setB($('#go6'), o.b6); if (o.b6) ovAction6 = o.b6[1];
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
function idle() { clearPlay(); brawl = null; hbpUntil = 0; phase = 'idle'; pendBanner = null; sign = null; timeOut = false; stealJump = 0; stealMsg = ''; cpuStealPlan = false; cpuBuntPlan = false; setHint(''); updateGoal(); }

/* ---- menu / free play / story flow ---- */
function showMenu() {
  if (onl.ch || online) leaveRoom();
  story = null; match = null; idle();
  $('.seg').hidden = true; $('#menuBtn').hidden = true;
  const done = loadProgress();
  overlay({
    title: 'どうぶつリーグ', logo: true,
    text: done >= STAGES.length ? '全話クリア済み。ストーリーは第1話から遊び直せます。' : 'しばいぬズを優勝に導こう。ストーリーは ' + STAGES[done].short + ' から。',
    b1: ['ストーリー', startStory], b2: ['CPU対戦', showCpuMenu], b3: ['オンライン対戦', showOnlineMenu], b4: ['友達に送る', shareGame], b5: ['遊び方', () => showGuide(0)], b6: ['設定', showSettings]
  });
}
const GUIDE = [
  ['遊び方 ① 打つ・走る',
    '・ボールがミットに届く直前に、通る位置をタップしてスイング\n' +
    '・ボールの下を叩くとフライ、上を叩くとゴロになります\n' +
    '・走者がいるときは下のボタンで盗塁・エンドラン・バント・スクイズのサインを出せます\n' +
    '・盗塁（CPU戦）は投手が足を上げた瞬間に押すと好スタート（早すぎると牽制されます）'],
  ['遊び方 ② 投げる・守る',
    '・弾く向きで球種が変わります（↑ストレート、→スライダー、↓フォーク、ジグザグでナックルなど）\n' +
    '・指を離した位置がコース、弾く速さが球速です（↑を遅く弾くとチェンジ、特に速く弾くと剛速球）\n' +
    '・走者がいるときのゴロ（CPU戦）はスローになり、投げる塁を選べます（◎○△は成功率の目安）'],
  ['遊び方 ③ 技・ギミック',
    '・「会心の一振り」はミート幅と飛距離アップ、「消える魔球」は球が途中で消えます\n' +
    '・「代打の切り札」「守護神」は1試合に1回ずつ、ここぞの場面で使えます\n' +
    '・奇数回のサイコロ、回の頭のハプニング、どうぶつ固有スキルは「設定」でオン・オフできます']
];
function showGuide(i, back) {
  i = i || 0; back = back || showMenu;
  const [title, text] = GUIDE[i];
  overlay({ title, plain: true, cred: true, text,
    b1: i + 1 < GUIDE.length ? ['つぎへ ▶', () => showGuide(i + 1, back)] : ['もどる', back],
    b2: i > 0 ? ['◀ まえへ', () => showGuide(i - 1, back)] : ['もどる', back],
    b3: i > 0 && i + 1 < GUIDE.length ? ['もどる', back] : null });
}
/* 設定：ギミックのオン・オフ（この端末に保存。オンラインは部屋を作った人の設定で遊ぶ） */
function showSettings() {
  const row = (k, name, sub) => [name + '：' + (OPT[k] ? 'オン' : 'オフ') + '\n' + sub, () => { OPT[k] = !OPT[k]; saveOpt(); showSettings(); }];
  overlay({ title: '設定', plain: true, text: '次の試合から反映されます。オンライン対戦は部屋を作った人の設定になります。',
    b1: row('dice', 'サイコロ', '奇数の回に攻撃側が振る'), b2: row('hap', 'ハプニング', '風・雨・ウェーブ・照明トラブル'),
    b3: row('trait', 'どうぶつ固有スキル', 'チームごとの特性'), b4: row('skill', '技', '会心の一振り・消える魔球'), b5: ['クレジット', showCredits], b6: ['もどる', showMenu] });
}
/* クレジット（素材の出どころ。README と同じ内容） */
function showCredits() {
  overlay({ title: 'クレジット', plain: true, cred: true,
    text: '・投球・打撃フォーム：CMU Graphics Lab Motion Capture Database（mocap.cs.cmu.edu）のデータをもとにしています。The database was created with funding from NSF EIA-0196217.\n・効果音の一部：効果音ラボ（soundeffect-lab.info）\n・実況の声：Gemini TTS／曲：Lyria で生成\n・3D 描画：Three.js（MIT License）',
    b1: ['もどる', showSettings] });
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
const TEAM_COL = { home: ['#d0452a', '柴'], away: ['#2f5aa0', 'パ'], neko: ['#7a56b5', '猫'], usagi: ['#2f9a6c', '兎'], kuma: ['#b8901f', '熊'], human: ['#1e2530', '人'] };
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
  newGame(); G.maxHalf = 18; G.skill = opt('skill') ? { crit: 3, vn: 3 } : { crit: 0, vn: 0 };
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
/* the menu button during an offline game: the game stops while the sheet is open */
function matchPause() {
  const info = story ? story.short + '　' + $('#inn').textContent : twoTeam() ? inningLabel() : $('#inn').textContent;
  overlay({ title: '試合中', text: info + '　' + $('#slab').textContent + '　' + $('#runs').textContent,
    b1: ['試合にもどる', () => { $('#overlay').hidden = true; }], b2: ['遊び方', () => showGuide(0, matchPause)], b3: ['試合をやめる', showMenu] });
}
function startStory() {
  let i = loadProgress(); if (i >= STAGES.length) i = 0;
  showStage(i);
}
function showStage(i) {
  match = null;
  story = STAGES[i];
  if (story.inn) {
    story.score = { home: 0, away: 0 };
    story.half = 0;
    mode = 'bat';
  } else {
    mode = story.mode;
  }
  $('#mBat').classList.toggle('on', mode === 'bat'); $('#mPit').classList.toggle('on', mode === 'pit');
  $('.seg').hidden = true; $('#menuBtn').hidden = false;
  $('#pitches').hidden = mode !== 'pit';
  setTeams(); newGame();
  if (story.inn) G.maxHalf = story.inn * 2;
  idle(); resize();
  dialog(story.intro, () => overlay({ title: story.title, text: goalLong(story), b1: ['プレイボール', startGame], b2: ['メニュー', showMenu] }));
}
function storyAfterResult() {
  const sb = onlineScore();
  if (G.inning >= G.maxHalf && G.inning % 2 === 0 && sb.home > sb.away) G.over = true;   // サヨナラ
  if (story.maxInn && G.inning > story.maxInn * 2) G.over = true;
  if (G.over) { storyEnd(sb.home > sb.away); return; }
  clearPlay();
  let wait = rnd(1.6, 2.2);
  if (G.inning !== story.half) {                     // チェンジ：攻守交代
    story.half = G.inning;
    mode = battingSide() === 'home' ? 'bat' : 'pit';
    $('#mBat').classList.toggle('on', mode === 'bat'); $('#mPit').classList.toggle('on', mode === 'pit');
    $('#pitches').hidden = mode !== 'pit';
    setTeams(); resize(); hud();
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
  setHint(mode === 'bat' ? '投手が投げたら、ボールが通る位置をタップして打つ' : '弾く向きで球種が決まる。指を離した位置がコース、弾く速さが球速');
}
function storyCheck() {
  if (story.inn) {
    if (G.over) {
      const sb = onlineScore();
      return sb.home > sb.away ? 'clear' : 'fail';
    }
    return null;
  }
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
    if (i + 1 >= STAGES.length) {
      celebrate(now_() + 0.2, 7);
      overlay({ clear: true, title: '完全勝利！', text: '人間チームに勝利し、全員が人間の姿と自由を取り戻した！\n真・どうぶつリーグ 完結。おめでとう！', b1: ['メニューへ', showMenu] });
    } else {
      overlay({ title: 'ステージクリア', text: st.title + ' クリア！', b1: ['次の話へ', () => showStage(i + 1)], b2: ['メニュー', showMenu] });
    }
  });
}

/* メニューなどの画面が開いている間は、試合用の表示（実況ボタン・選手情報・下の操作）を隠す */
new MutationObserver(() => $('#app').classList.toggle('ov', !$('#overlay').hidden && !$('#overlay').classList.contains('dlg')))
  .observe($('#overlay'), { attributes: true, attributeFilter: ['hidden', 'class'] });
