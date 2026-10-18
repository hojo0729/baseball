
/* ===== online 1-on-1 over Supabase Realtime =====
   The pitcher sends only what was thrown (type, speed, target). The batter's device plays the pitch, judges contact,
   and sends the contact result plus a random seed. Both devices run resolveCore() under that seed, so every random
   outcome (double plays, errors, where the ball lands) comes out the same and the game state stays identical. */
const SB_URL = 'https://qxtqaqcbhsekictbrdau.supabase.co';
const SB_KEY = 'sb_publishable_4TJm2e-nlqVN-yFZ_LvZhw_BzoXYkyD';
const PAGES_URL = 'https://saboten-apps.github.io/baseball/';
let online = false;
const onl = { sb: null, ch: null, code: '', side: 'home', me: Math.random().toString(36).slice(2, 10), started: false,
  score: { home: 0, away: 0 }, queued: null, waitRes: null, half: 1, joinTimer: 0, goneTimer: 0,
  pn: 0, oppSign: null, seed: 0, queuedPick: null, queuedSub: [] };   // pn: pitches thrown so far (same on both devices); oppSign: the batter's sign as the pitcher's device knows it

/* run fn with Math.random replaced by a seeded generator (mulberry32) */
function withSeed(seed, fn) {
  const R = Math.random;
  let a = seed >>> 0;
  Math.random = () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  try { return fn(); } finally { Math.random = R; }
}

const battingSide = () => (G.inning % 2 === 1 ? 'away' : 'home');   // top half: guest (pandas) bat, bottom: host (shibas)
const twoTeam = () => online || !!match || !!(story && story.inn);
function scoreBook() { return online ? onl.score : match ? match.score : (story && story.score ? story.score : { home: 0, away: 0 }); }
function onlineScore() {
  const b = scoreBook(), s = { home: b.home, away: b.away };
  if (G) s[battingSide()] += G.runs;                                // runs of the half in progress (banked at each change)
  return s;
}
function inningLabel() { const h = G.inning; return (h > (G.maxHalf || 6) ? '延長' : '') + Math.ceil(h / 2) + '回' + (h % 2 ? '表' : '裏'); }
function teamName(side) { return side === 'home' ? 'しばいぬズ' : 'パンダーズ'; }

/* ---- lobby ---- */
function showOnlineMenu() {
  leaveRoom(); idle(); story = null;
  if (!window.supabase || !window.supabase.createClient) {
    overlay({ title: 'オンライン対戦', text: 'この画面ではオンライン対戦が使えません。ブラウザで ' + PAGES_URL + ' を開いてください。', b1: ['メニューへ', showMenu] });
    return;
  }
  overlay({ title: 'オンライン対戦', text: '友達と1対1、3回まで。部屋を作った人がしばいぬズ（後攻）、入った人がパンダーズ（先攻）。',
    b1: ['部屋を作る', hostRoom], b2: ['部屋に入る', askCode], b3: ['もどる', showMenu] });
}
function askCode() {
  overlay({ title: '部屋番号を入力', text: '相手から聞いた4桁の番号', input: true, b2: ['もどる', showOnlineMenu],
    b1: ['入る', () => {
      const c = ($('#codeIn').value || '').replace(/\D/g, '');
      if (c.length === 4) joinRoom(c); else $('#od').textContent = '4桁の数字を入れてください';
    }] });
}
function sbClient() {
  if (!onl.sb) onl.sb = window.supabase.createClient(SB_URL, SB_KEY, { realtime: { params: { eventsPerSecond: 20 } } });
  return onl.sb;
}
function openChannel(code, onReady) {
  onl.code = code;
  const ch = sbClient().channel('yakyu-' + code, { config: { broadcast: { self: false }, presence: { key: onl.me } } });
  onl.ch = ch;
  ch.on('broadcast', { event: 'msg' }, ({ payload }) => onMsg(payload));
  ch.on('presence', { event: 'sync' }, onPresence);
  ch.subscribe(status => {
    if (onl.ch !== ch) return;
    if (status === 'SUBSCRIBED') { ch.track({ side: onl.side }); if (onReady) onReady(); }
    else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
      overlay({ title: '接続できません', text: '通信状態を確認して、もう一度試してください。', b1: ['もどる', showOnlineMenu] });
    }
  });
}
function send(type, data) {
  if (onl.ch) onl.ch.send({ type: 'broadcast', event: 'msg', payload: Object.assign({ type, from: onl.me }, data || {}) });
}
function leaveRoom() {
  clearTimeout(onl.joinTimer); clearTimeout(onl.goneTimer);
  if (onl.ch) {
    const ch = onl.ch; onl.ch = null;
    try { ch.send({ type: 'broadcast', event: 'msg', payload: { type: 'bye', from: onl.me } }); } catch (e) {}
    try { onl.sb.removeChannel(ch); } catch (e) {}
  }
  online = false; onl.started = false; onl.queued = null; onl.waitRes = null; onl.queuedPick = null; onl.queuedSub = [];
}
function hostRoom() {
  onl.side = 'home';
  const code = String(1000 + Math.floor(Math.random() * 9000));
  overlay({ title: '部屋番号 ' + code, text: 'この番号か招待リンクを相手に送ってください。相手が入ると試合が始まります。', b1: ['招待リンクを送る', () => shareRoom(code)], b2: ['やめる', showOnlineMenu] });
  openChannel(code);
}
function joinRoom(code) {
  onl.side = 'away';
  overlay({ title: '接続中…', text: '部屋 ' + code + ' に入っています', b1: ['やめる', showOnlineMenu] });
  openChannel(code, () => {
    send('hello');
    clearTimeout(onl.joinTimer);
    onl.joinTimer = setTimeout(() => {
      if (!onl.started) overlay({ title: '部屋が見つかりません', text: '番号を確かめてください。相手が部屋を作ってから入ってください。', b1: ['もどる', showOnlineMenu] });
    }, 8000);
  });
}
function others() {
  if (!onl.ch) return [];
  return Object.keys(onl.ch.presenceState()).filter(k => k !== onl.me);
}
function opponentLeft() {
  if (!onl.started) return;
  leaveRoom(); idle();
  overlay({ title: '相手が退出しました', text: '試合は中断されました。', b1: ['メニューへ', showMenu] });
}
function onPresence() {
  const n = others().length;
  // a phone that briefly switches apps drops out of presence; give it a moment to come back before calling the game
  if (onl.started) {
    clearTimeout(onl.goneTimer);
    if (n === 0) onl.goneTimer = setTimeout(() => { if (online && others().length === 0) opponentLeft(); }, 15000);
    return;
  }
  if (!onl.started && onl.side === 'home' && n >= 1) hostStart();
}
function onSubMsg(m) {
  if (!online) return;
  if (phase !== 'wait' && phase !== 'ready') { onl.queuedSub.push(m); return; }
  if (m.type === 'relief') relieve(teamsNow().fld);
  else if (m.type === 'closer') { const t = teamsNow().fld; relieve(t, ROSTER[t].closer, true); }
  else if (m.type === 'ph') { pinchHit(m.t, m.slot); refreshShown(); }
}
function onMsg(m) {
  if (!m || m.from === onl.me) return;
  if (m.type === 'hello') { if (onl.side === 'home' && !onl.started) hostStart(); }
  else if (m.type === 'start') { if (onl.side === 'away' && !onl.started) { clearTimeout(onl.joinTimer); onl.seed = m.seed >>> 0; onl.opts = m.opts || null; beginOnline(); } }
  else if (m.type === 'pitch') onPitchMsg(m);
  else if (m.type === 'result') onResultMsg(m);
  else if (m.type === 'bye') opponentLeft();
  else if (m.type === 'relief' || m.type === 'closer' || m.type === 'ph') onSubMsg(m);
  else if (m.type === 'pick') onPickMsg(m);
  else if (m.type === 'time') { onl.oppTime = !!m.on; if (mode === 'pit') setHint(m.on ? '相手がタイムをとりました' : 'プレイ再開'); }
  else if (m.type === 'sign') { if (mode === 'pit' && m.n === onl.pn) onl.oppSign = m.s || null; }   // a sign sent after this pitch was thrown is dropped
}

/* the host picks the shared seed (used for the inning dice) and starts */
function hostStart() { onl.seed = (Math.random() * 4294967296) >>> 0; onl.opts = Object.assign({}, OPT); send('start', { seed: onl.seed, opts: onl.opts }); beginOnline(); }
/* a pickoff thrown by the pitcher: the batter's device runs the same play */
function onPickMsg(m) {
  if (!online) return;
  if (mode === 'bat' && phase === 'wait') { if (m.out) sign = null; startPickoff(now_(), m.out, m.base); }
  else onl.queuedPick = m;
}

/* ---- game flow ---- */
function beginOnline() {
  onl.started = true; online = true; story = null; match = null;
  onl.timeLeft = 3; onl.oppTime = false; timeOut = false;
  onl.score = { home: 0, away: 0 }; onl.queued = null; onl.waitRes = null; onl.pn = 0; onl.oppSign = null; onl.queuedPick = null; onl.queuedSub = [];
  sign = null; cpuStealPlan = false; cpuBuntPlan = false;
  newGame(); G.maxHalf = 6;
  $('.seg').hidden = true; $('#menuBtn').hidden = false;
  $('#overlay').hidden = true;
  applyRole();
  showBanner('プレイボール', 'あなたは ' + teamName(onl.side) + (onl.side === 'home' ? '（後攻）' : '（先攻）'), 'g');
  const dd = applyInningDice(); if (dd) setTimeout(() => showDiceBanner(dd), 1900);
}
function roleHint() {
  return mode === 'bat' ? '相手の投球を待っています。来たら、ボールが通る位置をタップ' : 'あなたの投球。弾く向きで球種、離した位置でコース';
}
function applyRole() {
  mode = battingSide() === onl.side ? 'bat' : 'pit';
  $('#mBat').classList.toggle('on', mode === 'bat'); $('#mPit').classList.toggle('on', mode === 'pit');
  $('#pitches').hidden = mode !== 'pit';
  onl.half = G.inning; sign = null; onl.oppSign = null;
  setTeams(); resize();
  phase = mode === 'bat' ? 'wait' : 'ready'; nextAt = Infinity;      // nothing automatic: the other player pitches
  hud(); setHint(roleHint());
  takeQueuedPitch();
}
function takeQueuedPitch() {
  while ((phase === 'wait' || phase === 'ready') && onl.queuedSub.length) onSubMsg(onl.queuedSub.shift());
  if (mode === 'bat' && phase === 'wait' && onl.queuedPick) { const q = onl.queuedPick; onl.queuedPick = null; onPickMsg(q); return; }
  if (mode === 'bat' && phase === 'wait' && onl.queued) { const q = onl.queued; onl.queued = null; onPitchMsg(q); }
}
/* batter: a pitch arrived from the other device */
function onPitchMsg(m) {
  if (!online) return;
  if (mode !== 'bat' || phase !== 'wait') { onl.queued = m; return; }   // still showing the last play, or switching sides
  pending = m.p; phase = 'deliver'; deliverStart = now_();
  setHint('');
}
/* pitcher: the batter's device judged the pitch */
function onResultMsg(m) {
  if (!online) return;
  if (mode !== 'pit' || phase !== 'fly' || !ball) { onl.waitRes = m; return; }
  applyRemoteResult(m);
}
function applyRemoteResult(m) {
  const C = m.C ? V(m.C[0], m.C[1], m.C[2]) : ball.tgt.clone();
  if (m.swung) batAnim = { t0: now_() - SWING_LEAD, plan: makeSwingPlan(C) };
  if (m.c.bunt) curBunt = true;
  withSeed(m.seed, () => resolveCore(m.c, C));
}
/* pitcher side while the ball is in the air: wait for the batter's verdict */
function stepFlyOnline(now) {
  if (onl.waitRes) { const m = onl.waitRes; onl.waitRes = null; applyRemoteResult(m); return; }
  if (now > ball.start + ball.dur + 10) setHint('相手の応答を待っています…');
}
function onlineAfterResult() {
  clearPlay();
  const sc = onlineScore();
  if (G.inning >= 6 && G.inning % 2 === 0 && sc.home > sc.away) G.over = true;   // walk-off in any bottom half from the 3rd on
  if (G.over) { showOnlineOver(); return; }
  if (G.inning !== onl.half) {
    if (timeOut) { timeOut = false; send('time', { on: false }); }
    onl.oppTime = false;
    applyRole();
    const dd = applyInningDice();
    const B = curBatter(), lead = B.star ? '　先頭はスーパースター ' + B.name : '';
    if (B.star) G.lastAnn = G.pa;
    showBanner('チェンジ', inningLabel() + '　' + (mode === 'bat' ? '攻撃' : '守備') + lead, 'n');
    if (dd) setTimeout(() => showDiceBanner(dd), 1600);
    return;
  }
  phase = mode === 'bat' ? 'wait' : 'ready'; nextAt = Infinity;
  hud(); setHint(roleHint());
  announceChance();
  takeQueuedPitch();
}
/* the menu button during an online game: the match keeps running underneath, and leaving takes a second tap */
function onlinePause() {
  overlay({ title: 'オンライン対戦中', text: '試合は続いています。部屋番号 ' + onl.code + '　' + inningLabel() + '　しばいぬズ ' + onlineScore().home + ' - ' + onlineScore().away + ' パンダーズ',
    b1: ['試合にもどる', () => { $('#overlay').hidden = true; }], b2: ['試合をやめる', () => overlay({
      title: '試合をやめますか？', text: '相手との接続が切れて、試合は終わりになります。',
      b1: ['続ける', () => { $('#overlay').hidden = true; }], b2: ['やめる', showMenu] })] });
}
function showOnlineOver() {
  const sc = onlineScore(), mine = sc[onl.side], theirs = sc[onl.side === 'home' ? 'away' : 'home'];
  leaveRoom(); idle();
  if (mine > theirs) celebrate(now_() + 0.2, 6);
  overlay({ clear: mine > theirs, title: mine > theirs ? '勝ち！' : mine < theirs ? '負け…' : '引き分け',
    text: 'しばいぬズ ' + sc.home + ' - ' + sc.away + ' パンダーズ', b1: ['メニューへ', showMenu] });
}

/* ---- sharing: send the game link, or an invite link that opens straight into a room ---- */
function inviteUrl(code) { return PAGES_URL + '?room=' + code; }
async function shareLink(text, url) {
  try { if (navigator.share) { await navigator.share({ title: 'どうぶつリーグ', text, url }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
  let copied = false;
  try { await navigator.clipboard.writeText(text + '\n' + url); copied = true; } catch (e) {}
  $('#od').textContent = copied ? 'リンクをコピーしました。LINE などに貼って送ってください。' : url;
}
function shareGame() { shareLink('どうぶつたちの野球ゲーム「どうぶつリーグ」で遊ぼう！', PAGES_URL); }
function shareRoom(code) { shareLink('どうぶつリーグで対戦しよう！リンクを開くと部屋に入れます（部屋番号 ' + code + '）', inviteUrl(code)); }
/* opened from an invite link (?room=1234): go straight into that room */
function inviteBoot() {
  let code = '';
  try { code = new URLSearchParams(location.search).get('room') || ''; } catch (e) {}
  if (!/^\d{4}$/.test(code)) return;
  try { history.replaceState(null, '', location.pathname); } catch (e) {}
  if (window.supabase && window.supabase.createClient) joinRoom(code);
}
