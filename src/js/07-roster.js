
/* ===== rosters: batting orders and pitching staffs =====
   Ratings are 1-5 (shown as E-A). Batters: m = contact (ミート), p = power (パワー).
   Pitchers: v = velocity, c = control, b = break, s = stamina (pitch budget, roughly 1.6 per pitch).
   Optional last field: 'L' = left-handed, 'S' = switch hitter (bats from the side opposite the pitcher). Default right.
   run: 走力 (1-5) per batting slot / arm: the catcher's arm / closer: index of the 守護神 in pit / ph: the bench's 代打の切り札 [name, m, p, flags, run].
   A '*' in it marks a superstar (ratings can go past A to 6-7 = S); stars are two-way and also sit at the end of the bullpen. */
/* every pitcher's pitch repertoire (pt). Stars throw everything. */
const ALL_PITCHES = ['str', 'gou', 'cut', 'sli', 'cur', 'frk', 'snk', 'sht', 'two', 'chg', 'knk'];
const ROSTER = {
  home: { name: 'しばいぬズ', run: [5, 4, 4, 2, 3, 3, 2, 4, 3], arm: 4, closer: 2, ph: ['ゲンキ', 4, 5, '', 2],
    bat: [['マメ', 5, 1, 'L'], ['ハチ', 4, 2, 'S'], ['ソウタ', 5, 7, 'L*'], ['ゴン', 3, 5, 'L'], ['チャチャ', 3, 4], ['キナコ', 3, 3], ['ムギ', 2, 3], ['ポチ', 3, 2], ['ソラ', 2, 2]],
    pit: [['シバタ', 3, 4, 3, 80, '', ['str','two','cur','chg']], ['ハル', 4, 3, 3, 45, 'L', ['str','cut','sli','frk']], ['リキ', 5, 3, 4, 35, '', ['str','gou','frk','snk']], ['ソウタ', 6, 3, 4, 40, '*', ALL_PITCHES]] },
  away: { name: 'パンダーズ', run: [4, 3, 3, 2, 2, 4, 3, 2, 3], arm: 3, closer: 2, ph: ['パンチョ', 3, 5, 'L', 2],
    bat: [['ササ', 3, 2, 'L'], ['シャオ', 3, 2], ['リンリン', 2, 4, 'S'], ['ダイパン', 4, 7, 'R*'], ['ユウユウ', 2, 4], ['モモ', 3, 2, 'L'], ['タンタン', 2, 3], ['ランラン', 2, 2], ['コウ', 1, 2]],
    pit: [['パンパン', 2, 3, 2, 80, '', ['str','cur','sli','chg']], ['メイメイ', 3, 3, 3, 45, 'L', ['str','cut','sht','snk']], ['ホアホア', 3, 4, 3, 35, '', ['str','frk','two','knk']], ['ダイパン', 6, 2, 3, 40, '*', ALL_PITCHES]] },
  neko: { name: 'ニャンキーズ', run: [5, 5, 4, 3, 3, 4, 3, 5, 4], arm: 2, closer: 2, ph: ['ボス', 5, 5, 'L', 3],
    bat: [['タマ', 5, 2, 'L'], ['シロ', 5, 1, 'L'], ['ミケ', 5, 6, 'S*'], ['クロ', 4, 4], ['トラ', 4, 3], ['サバ', 4, 2, 'L'], ['ハナ', 3, 3], ['チビ', 4, 1], ['ノラ', 3, 2]],
    pit: [['ニャン太', 3, 3, 4, 80, 'L', ['str','cut','sli','cur']], ['キジ', 3, 4, 3, 45, '', ['str','chg','sht','two']], ['ルナ', 4, 3, 4, 35, '', ['str','sli','snk','frk','knk']]] },
  usagi: { name: 'ラビッツ', run: [5, 5, 4, 4, 3, 4, 3, 5, 4], arm: 3, closer: 2, ph: ['ジャンプ', 4, 4, 'S', 5],
    bat: [['ピョン', 4, 2, 'S'], ['モカ', 4, 2], ['ラビ', 3, 3, 'L'], ['ミミ', 3, 4], ['ココア', 3, 3], ['ユキ', 3, 2], ['シロップ', 2, 3], ['ネザー', 3, 1], ['ホップ', 2, 2]],
    pit: [['ウサミ', 3, 4, 5, 80, '', ['str','chg','two','cur']], ['ムーン', 3, 3, 4, 45, 'L', ['str','cut','sht']], ['ラパン', 3, 4, 5, 35, '', ['str','frk','sli','chg','snk']]] },
  kuma: { name: 'ヒグマーズ', run: [3, 3, 2, 1, 1, 2, 2, 2, 3], arm: 5, closer: 2, ph: ['キンタロウ', 3, 6, '', 1],
    bat: [['コグマ', 3, 3], ['ツキノワ', 3, 4, 'L'], ['グリズ', 4, 7, 'S*'], ['ベア', 3, 5], ['ヒグ太', 2, 5], ['クマ吉', 3, 4], ['マロン', 2, 4], ['ハニー', 3, 3], ['ドングリ', 2, 3]],
    pit: [['ヒグマ', 5, 3, 3, 90, '', ['str','gou','sht','snk']], ['シロクマ', 4, 3, 3, 45, 'L', ['str','cut','sli','cur']], ['ポーラ', 4, 4, 4, 35, '', ['str','frk','knk','chg']]] }
};
/* どうぶつ固有スキル：チーム（どうぶつ）ごとの特性。ストーリーでは使わない */
const TRAIT = {
  home: { n: '忠犬ガッツ', d: '2ストライクからでも粘れる' },
  away: { n: '笹パワー', d: '打球が強い（+8km/h）' },
  neko: { n: '猫の身のこなし', d: '盗塁が決まりやすく、ファインプレーも出やすい' },
  usagi: { n: 'ぴょんぴょん', d: '内野ゴロがときどき内野安打になる' },
  kuma: { n: '重い剛腕', d: '投げる球が重く、打たれても打球が弱い' }
};
function trT(which) { return G && !story ? teamsNow()[which] : null; }
const GRADE = ['', 'E', 'D', 'C', 'B', 'A', 'S', 'S'];
const handOf = x => (x || 'R').replace('*', '') || 'R', isStar = x => /\*/.test(x || '');

/* which roster bats and which fields right now */
function teamsNow() {
  if (match && G) { const bat = battingSide() === match.side ? match.mine : match.opp; return { bat, fld: bat === match.mine ? match.opp : match.mine }; }
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
  const t = teamsNow().bat, s = teamState(t), slot = s.order % 9, sub = !!(s.sub && s.sub[slot]), b = sub ? ROSTER[t].ph : ROSTER[t].bat[slot];
  const hand = handOf(b[3]), side = hand === 'S' ? (pitcherHand() === 'L' ? 'R' : 'L') : hand;
  const bn0 = G && G.bonus && G.bonus.pa === G.pa && G.bonus.inn === G.inning ? G.bonus : { m: 0, p: 0 };   // サイコロのボーナス（その回の最初の打席だけ）
  const bn = { m: bn0.m + (hapOn('wave') ? 1 : 0), p: bn0.p };                                              // ウェーブ：その回の攻撃側ミート+1
  return { slot: slot + 1, name: b[0], m: clamp(b[1] + bn.m, 1, 6), p: clamp(b[2] + bn.p, 1, 6), sp: sub ? b[4] : (ROSTER[t].run[slot] || 3), hand, side, star: isStar(b[3]), ph: sub };
}
function curPitcher() {
  const t = teamsNow().fld, s = teamState(t), p = ROSTER[t].pit[s.pit];
  // tired below 40% of stamina: up to -8 km/h and wilder
  const fatigue = clamp(1 - s.sta / (p[4] * 0.4), 0, 1);
  return { team: t, name: p[0], v: p[1], c: p[2], b: p[3], max: p[4], pt: p[6] || ['str'], hand: handOf(p[5]), star: isStar(p[5]), sta: s.sta, fatigue, next: ROSTER[t].pit[s.pit + 1] };
}
/* handedness on the field right now (safe before a game exists) */
function pitcherHand() { if (!G) return 'R'; const t = teamsNow().fld; return handOf(ROSTER[t].pit[teamState(t).pit][5]); }
const lefty = () => pitcherHand() === 'L';
const leftBat = () => !!G && curBatter().side === 'L';
const HAND_JA = { R: '右', L: '左', S: '両' };
function nextBatter() { const s = teamState(teamsNow().bat); s.order++; }
function spendStamina(speed, key) {
  const s = teamState(teamsNow().fld);
  s.sta = Math.max(0, s.sta - (1.4 + Math.max(0, speed - 125) / 25 + (key === 'gou' ? 0.8 : 0)) * (match ? 0.7 : 1));   // a 9-inning game needs longer outings
}
function relieve(t, to, closer) {
  const s = teamState(t), idx = to === undefined ? s.pit + 1 : to;
  if (!ROSTER[t].pit[idx] || idx <= s.pit) return false;
  s.pit = idx; s.sta = ROSTER[t].pit[s.pit][4];
  if (closer) s.closerUsed = true;
  const p = ROSTER[t].pit[s.pit];
  showBanner(closer ? '守護神 登場！' : isStar(p[5]) ? '二刀流スター登板！' : 'ピッチャー交代', p[0] + (handOf(p[5]) === 'L' ? '（サウスポー）' : '') + '　球速' + GRADE[p[1]] + ' 制球' + GRADE[p[2]] + ' 変化' + GRADE[p[3]], 'n');
  sfx.cheer(closer ? 0.9 : 0.3);
  pitchIcons();
  updateGoal();
  return true;
}
/* CPU managers go to the bullpen when the pitcher is spent */
function cpuRelief() {
  if (online || mode !== 'bat') return;
  const P = curPitcher(), t = P.team, s = teamState(t), ci = ROSTER[t].closer;
  // CPU match: the CPU manager sends in its 守護神 to close out a 1-3 run lead in the 9th or later
  if (match && G.inning >= 17 && ci !== undefined && s.pit < ci && !s.closerUsed) {
    const sc = onlineScore(), me = sc[match.side === 'home' ? 'away' : 'home'], you = sc[match.side];
    if (me > you && me - you <= 3) { relieve(t, ci, true); return; }
  }
  if (P.next && P.sta < P.max * 0.25) relieve(t);
}
/* 守護神: jump straight to the closer, any time, once per game */
function closerOption() {
  if (mode !== 'pit' || phase !== 'ready' || !G) return null;
  const t = teamsNow().fld, s = teamState(t), ci = ROSTER[t].closer;
  return ci !== undefined && s.pit < ci && !s.closerUsed ? ['closer', '守護神 ' + ROSTER[t].pit[ci][0]] : null;
}
function userCloser() {
  if (!closerOption()) return;
  const t = teamsNow().fld;
  if (relieve(t, ROSTER[t].closer, true) && online) send('closer');
}
/* 代打の切り札: the bench ace bats in this slot from now on, any time before a pitch, once per game */
function phOption() {
  if (mode !== 'bat' || phase !== 'wait' || !G) return null;
  const t = teamsNow().bat, s = teamState(t), B = curBatter();
  return ROSTER[t].ph && !s.phUsed && !B.ph ? ['ph', '代打 ' + ROSTER[t].ph[0]] : null;
}
function pinchHit(t, slot) {
  const s = teamState(t); if (s.phUsed) return false;
  s.phUsed = true; s.sub = s.sub || {}; s.sub[slot] = true;
  const p = ROSTER[t].ph;
  showBanner('代打の切り札！', p[0] + '　ミート' + GRADE[p[1]] + ' パワー' + GRADE[p[2]] + ' 走力' + GRADE[p[4]], mode === 'bat' ? 'g' : 'b');
  sfx.cheer(0.9); updateGoal();
  return true;
}
function userPinch() {
  if (!phOption()) return;
  const t = teamsNow().bat, slot = teamState(t).order % 9;
  if (pinchHit(t, slot) && online) send('ph', { t, slot });
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
  return B.slot + '番 ' + (B.ph ? '代打 ' : '') + nm(B, B.name) + '（' + bh + '）　ミ' + GRADE[B.m] + ' パ' + GRADE[B.p] + ' 走' + GRADE[B.sp] + '<br>'
    + '投手 ' + nm(P, P.name) + '（' + HAND_JA[P.hand] + '投）　<span class="' + (P.fatigue > 0 ? 'tired' : '') + '">' + staminaBar(P) + '</span>';
}
