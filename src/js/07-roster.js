
/* ===== rosters: batting orders and pitching staffs =====
   Ratings are 1-5 (shown as E-A). Batters: m = contact (ミート), p = power (パワー).
   Pitchers: v = velocity, c = control, b = break, s = stamina (pitch budget, roughly 1.6 per pitch).
   Optional last field: 'L' = left-handed, 'S' = switch hitter (bats from the side opposite the pitcher). Default right.
   A '*' in it marks a superstar (ratings can go past A to 6-7 = S); stars are two-way and also sit at the end of the bullpen. */
const ROSTER = {
  home: { name: 'しばいぬズ',
    bat: [['マメ', 5, 1, 'L'], ['ハチ', 4, 2, 'S'], ['ソウタ', 5, 7, 'L*'], ['ゴン', 3, 5, 'L'], ['チャチャ', 3, 4], ['キナコ', 3, 3], ['ムギ', 2, 3], ['ポチ', 3, 2], ['ソラ', 2, 2]],
    pit: [['シバタ', 3, 4, 3, 80], ['ハル', 4, 3, 3, 45, 'L'], ['リキ', 5, 3, 4, 35], ['ソウタ', 6, 3, 4, 40, '*']] },
  away: { name: 'パンダーズ',
    bat: [['ササ', 3, 2, 'L'], ['シャオ', 3, 2], ['リンリン', 2, 4, 'S'], ['ダイパン', 4, 7, 'R*'], ['ユウユウ', 2, 4], ['モモ', 3, 2, 'L'], ['タンタン', 2, 3], ['ランラン', 2, 2], ['コウ', 1, 2]],
    pit: [['パンパン', 2, 3, 2, 80], ['メイメイ', 3, 3, 3, 45, 'L'], ['ホアホア', 3, 4, 3, 35], ['ダイパン', 6, 2, 3, 40, '*']] },
  neko: { name: 'ニャンキーズ',
    bat: [['タマ', 5, 2, 'L'], ['シロ', 5, 1, 'L'], ['ミケ', 5, 6, 'S*'], ['クロ', 4, 4], ['トラ', 4, 3], ['サバ', 4, 2, 'L'], ['ハナ', 3, 3], ['チビ', 4, 1], ['ノラ', 3, 2]],
    pit: [['ニャン太', 3, 3, 4, 80, 'L'], ['キジ', 3, 4, 3, 45], ['ルナ', 4, 3, 4, 35]] },
  usagi: { name: 'ラビッツ',
    bat: [['ピョン', 4, 2, 'S'], ['モカ', 4, 2], ['ラビ', 3, 3, 'L'], ['ミミ', 3, 4], ['ココア', 3, 3], ['ユキ', 3, 2], ['シロップ', 2, 3], ['ネザー', 3, 1], ['ホップ', 2, 2]],
    pit: [['ウサミ', 3, 4, 5, 80], ['ムーン', 3, 3, 4, 45, 'L'], ['ラパン', 3, 4, 5, 35]] },
  kuma: { name: 'ヒグマーズ',
    bat: [['コグマ', 3, 3], ['ツキノワ', 3, 4, 'L'], ['グリズ', 4, 7, 'S*'], ['ベア', 3, 5], ['ヒグ太', 2, 5], ['クマ吉', 3, 4], ['マロン', 2, 4], ['ハニー', 3, 3], ['ドングリ', 2, 3]],
    pit: [['ヒグマ', 5, 3, 3, 90], ['シロクマ', 4, 3, 3, 45, 'L'], ['ポーラ', 4, 4, 4, 35]] }
};
const GRADE = ['', 'E', 'D', 'C', 'B', 'A', 'S', 'S'];
const handOf = x => (x || 'R').replace('*', '') || 'R', isStar = x => /\*/.test(x || '');

/* which roster bats and which fields right now */
function teamsNow() {
  if (online && G) { const bat = battingSide() === 'home' ? 'home' : 'away'; return { bat, fld: bat === 'home' ? 'away' : 'home' }; }
  const opp = story ? story.opp : 'away';
  return mode === 'bat' ? { bat: 'home', fld: opp } : { bat: opp, fld: 'home' };
}
function teamState(t) {
  if (!G.teams) G.teams = {};
  if (!G.teams[t]) G.teams[t] = { order: 0, pit: 0, sta: ROSTER[t].pit[0][4] };
  return G.teams[t];
}
function curBatter() {
  const t = teamsNow().bat, s = teamState(t), b = ROSTER[t].bat[s.order % 9];
  const hand = handOf(b[3]), side = hand === 'S' ? (pitcherHand() === 'L' ? 'R' : 'L') : hand;
  return { slot: s.order % 9 + 1, name: b[0], m: b[1], p: b[2], hand, side, star: isStar(b[3]) };
}
function curPitcher() {
  const t = teamsNow().fld, s = teamState(t), p = ROSTER[t].pit[s.pit];
  // tired below 40% of stamina: up to -8 km/h and wilder
  const fatigue = clamp(1 - s.sta / (p[4] * 0.4), 0, 1);
  return { team: t, name: p[0], v: p[1], c: p[2], b: p[3], max: p[4], hand: handOf(p[5]), star: isStar(p[5]), sta: s.sta, fatigue, next: ROSTER[t].pit[s.pit + 1] };
}
/* handedness on the field right now (safe before a game exists) */
function pitcherHand() { if (!G) return 'R'; const t = teamsNow().fld; return handOf(ROSTER[t].pit[teamState(t).pit][5]); }
const lefty = () => pitcherHand() === 'L';
const leftBat = () => !!G && curBatter().side === 'L';
const HAND_JA = { R: '右', L: '左', S: '両' };
function nextBatter() { const s = teamState(teamsNow().bat); s.order++; }
function spendStamina(speed, key) {
  const s = teamState(teamsNow().fld);
  s.sta = Math.max(0, s.sta - (1.4 + Math.max(0, speed - 125) / 25 + (key === 'gou' ? 0.8 : 0)));
}
function relieve(t) {
  const s = teamState(t);
  if (!ROSTER[t].pit[s.pit + 1]) return false;
  s.pit++; s.sta = ROSTER[t].pit[s.pit][4];
  const p = ROSTER[t].pit[s.pit];
  showBanner(isStar(p[5]) ? '二刀流スター登板！' : 'ピッチャー交代', p[0] + (handOf(p[5]) === 'L' ? '（サウスポー）' : '') + '　球速' + GRADE[p[1]] + ' 制球' + GRADE[p[2]] + ' 変化' + GRADE[p[3]], 'n');
  pitchIcons();
  sfx.cheer(0.3);
  updateGoal();
  return true;
}
/* CPU managers go to the bullpen when the pitcher is spent */
function cpuRelief() {
  if (online || mode !== 'bat') return;
  const P = curPitcher();
  if (P.next && P.sta < P.max * 0.25) relieve(P.team);
}
function userRelief() {
  if (mode !== 'pit' || phase !== 'ready') return;
  const t = teamsNow().fld;
  if (relieve(t) && online) send('relief');
}
/* a superstar walks up: big entrance banner (once per plate appearance) */
function starCheck() {
  if (!G || phase === 'idle') return false;
  const B = curBatter();
  if (!B.star || G.lastAnn === G.pa) return false;
  G.lastAnn = G.pa;
  showBanner('スーパースター登場！', B.slot + '番 ' + B.name + '　ミート' + GRADE[B.m] + ' パワー' + GRADE[B.p], mode === 'bat' ? 'g' : 'b');
  sfx.cheer(1.4);
  if (mode === 'pit') setHint('一発がある強打者。際どいコースで勝負しよう');
  return true;
}
function staminaBar(P) {
  const n = Math.round(P.sta / P.max * 5);
  return '■'.repeat(n) + '□'.repeat(5 - n);
}
/* two info lines for the top-left box */
function rosterLines() {
  if (!G) return '';
  const B = curBatter(), P = curPitcher();
  const bh = B.hand === 'S' ? '両打・' + HAND_JA[B.side] + '打席' : HAND_JA[B.side] + '打';
  const nm = (X, n) => X.star ? '<span class="star">★' + n + '</span>' : n;
  return B.slot + '番 ' + nm(B, B.name) + '（' + bh + '）　ミート' + GRADE[B.m] + ' パワー' + GRADE[B.p] + '<br>'
    + '投手 ' + nm(P, P.name) + '（' + HAND_JA[P.hand] + '投）　<span class="' + (P.fatigue > 0 ? 'tired' : '') + '">' + staminaBar(P) + '</span>';
}
