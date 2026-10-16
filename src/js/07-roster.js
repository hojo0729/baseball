
/* ===== rosters: batting orders and pitching staffs =====
   Ratings are 1-5 (shown as E-A). Batters: m = contact (ミート), p = power (パワー).
   Pitchers: v = velocity, c = control, b = break, s = stamina (pitch budget, roughly 1.6 per pitch). */
const ROSTER = {
  home: { name: 'しばいぬズ',
    bat: [['マメ', 5, 1], ['ハチ', 4, 2], ['コタロウ', 4, 4], ['ゴン', 3, 5], ['チャチャ', 3, 4], ['キナコ', 3, 3], ['ムギ', 2, 3], ['ポチ', 3, 2], ['ソラ', 2, 2]],
    pit: [['シバタ', 3, 4, 3, 80], ['ハル', 4, 3, 3, 45], ['リキ', 5, 3, 4, 35]] },
  away: { name: 'パンダーズ',
    bat: [['ササ', 3, 2], ['シャオ', 3, 2], ['リンリン', 2, 4], ['パン吉', 2, 5], ['ユウユウ', 2, 4], ['モモ', 3, 2], ['タンタン', 2, 3], ['ランラン', 2, 2], ['コウ', 1, 2]],
    pit: [['パンパン', 2, 3, 2, 80], ['メイメイ', 3, 3, 3, 45], ['ホアホア', 3, 4, 3, 35]] },
  neko: { name: 'ニャンキーズ',
    bat: [['タマ', 5, 2], ['シロ', 5, 1], ['ミケ', 5, 4], ['クロ', 4, 4], ['トラ', 4, 3], ['サバ', 4, 2], ['ハナ', 3, 3], ['チビ', 4, 1], ['ノラ', 3, 2]],
    pit: [['ニャン太', 3, 3, 4, 80], ['キジ', 3, 4, 3, 45], ['ルナ', 4, 3, 4, 35]] },
  usagi: { name: 'ラビッツ',
    bat: [['ピョン', 4, 2], ['モカ', 4, 2], ['ラビ', 3, 3], ['ミミ', 3, 4], ['ココア', 3, 3], ['ユキ', 3, 2], ['シロップ', 2, 3], ['ネザー', 3, 1], ['ホップ', 2, 2]],
    pit: [['ウサミ', 3, 4, 5, 80], ['ムーン', 3, 3, 4, 45], ['ラパン', 3, 4, 5, 35]] },
  kuma: { name: 'ヒグマーズ',
    bat: [['コグマ', 3, 3], ['ツキノワ', 3, 4], ['グリズ', 3, 5], ['ベア', 3, 5], ['ヒグ太', 2, 5], ['クマ吉', 3, 4], ['マロン', 2, 4], ['ハニー', 3, 3], ['ドングリ', 2, 3]],
    pit: [['ヒグマ', 5, 3, 3, 90], ['シロクマ', 4, 3, 3, 45], ['ポーラ', 4, 4, 4, 35]] }
};
const GRADE = ['', 'E', 'D', 'C', 'B', 'A'];

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
  return { slot: s.order % 9 + 1, name: b[0], m: b[1], p: b[2] };
}
function curPitcher() {
  const t = teamsNow().fld, s = teamState(t), p = ROSTER[t].pit[s.pit];
  // tired below 40% of stamina: up to -8 km/h and wilder
  const fatigue = clamp(1 - s.sta / (p[4] * 0.4), 0, 1);
  return { team: t, name: p[0], v: p[1], c: p[2], b: p[3], max: p[4], sta: s.sta, fatigue, next: ROSTER[t].pit[s.pit + 1] };
}
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
  showBanner('ピッチャー交代', p[0] + '（球速' + GRADE[p[1]] + ' 制球' + GRADE[p[2]] + ' 変化' + GRADE[p[3]] + '）', 'n');
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
function staminaBar(P) {
  const n = Math.round(P.sta / P.max * 5);
  return '■'.repeat(n) + '□'.repeat(5 - n);
}
/* two info lines for the top-left box */
function rosterLines() {
  if (!G) return '';
  const B = curBatter(), P = curPitcher();
  return B.slot + '番 ' + B.name + '　ミート' + GRADE[B.m] + ' パワー' + GRADE[B.p] + '<br>'
    + '投手 ' + P.name + '　<span class="' + (P.fatigue > 0 ? 'tired' : '') + '">' + staminaBar(P) + '</span>';
}
