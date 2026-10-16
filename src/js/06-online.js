
/* ===== online 1-on-1 over Supabase Realtime =====
   The pitcher sends only what was thrown (type, speed, target). The batter's device plays the pitch, judges contact,
   and sends the contact result plus a random seed. Both devices run resolveCore() under that seed, so every random
   outcome (double plays, errors, where the ball lands) comes out the same and the game state stays identical. */
const SB_URL = 'https://qxtqaqcbhsekictbrdau.supabase.co';
const SB_KEY = 'sb_publishable_4TJm2e-nlqVN-yFZ_LvZhw_BzoXYkyD';
const PAGES_URL = 'https://saboten-apps.github.io/baseball/';
let online = false;
const onl = { sb: null, ch: null, code: '', side: 'home', me: Math.random().toString(36).slice(2, 10), started: false,
  score: { home: 0, away: 0 }, queued: null, waitRes: null, half: 1, joinTimer: 0 };

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
function onlineScore() {
  const s = { home: onl.score.home, away: onl.score.away };
  if (G) s[battingSide()] += G.runs;                                // runs of the half in progress (banked at each change)
  return s;
}
function inningLabel() { const h = Math.min(G.inning, 6); return Math.ceil(h / 2) + '回' + (h % 2 ? '表' : '裏'); }
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
  clearTimeout(onl.joinTimer);
  if (onl.ch) {
    const ch = onl.ch; onl.ch = null;
    try { ch.send({ type: 'broadcast', event: 'msg', payload: { type: 'bye', from: onl.me } }); } catch (e) {}
    try { onl.sb.removeChannel(ch); } catch (e) {}
  }
  online = false; onl.started = false; onl.queued = null; onl.waitRes = null;
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
  if (onl.started && n === 0) { opponentLeft(); return; }
  if (!onl.started && onl.side === 'home' && n >= 1) { send('start'); beginOnline(); }
}
function onMsg(m) {
  if (!m || m.from === onl.me) return;
  if (m.type === 'hello') { if (onl.side === 'home' && !onl.started) { send('start'); beginOnline(); } }
  else if (m.type === 'start') { if (onl.side === 'away' && !onl.started) { clearTimeout(onl.joinTimer); beginOnline(); } }
  else if (m.type === 'pitch') onPitchMsg(m);
  else if (m.type === 'result') onResultMsg(m);
  else if (m.type === 'bye') opponentLeft();
  else if (m.type === 'relief') relieve(teamsNow().fld);
}

/* ---- game flow ---- */
function beginOnline() {
  onl.started = true; online = true; story = null;
  onl.score = { home: 0, away: 0 }; onl.queued = null; onl.waitRes = null;
  sign = null; cpuStealPlan = false; cpuBuntPlan = false;
  newGame(); G.maxHalf = 6;
  $('.seg').hidden = true; $('#menuBtn').hidden = false;
  $('#overlay').hidden = true;
  applyRole();
  showBanner('プレイボール', 'あなたは ' + teamName(onl.side) + (onl.side === 'home' ? '（後攻）' : '（先攻）'), 'g');
}
function roleHint() {
  return mode === 'bat' ? '相手の投球を待っています。来たら、ボールが通る位置をタップ' : 'あなたの投球。弾く向きで球種、離した位置でコース';
}
function applyRole() {
  mode = battingSide() === onl.side ? 'bat' : 'pit';
  $('#mBat').classList.toggle('on', mode === 'bat'); $('#mPit').classList.toggle('on', mode === 'pit');
  $('#pitches').hidden = mode !== 'pit';
  onl.half = G.inning;
  setTeams(); resize();
  phase = mode === 'bat' ? 'wait' : 'ready'; nextAt = Infinity;      // nothing automatic: the other player pitches
  hud(); setHint(roleHint());
  takeQueuedPitch();
}
function takeQueuedPitch() {
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
  if (G.inning === 6 && sc.home > sc.away) G.over = true;            // walk-off in the bottom of the 3rd
  if (G.over) { showOnlineOver(); return; }
  if (G.inning !== onl.half) { applyRole(); showBanner('チェンジ', inningLabel() + '　' + (mode === 'bat' ? '攻撃' : '守備'), 'n'); return; }
  phase = mode === 'bat' ? 'wait' : 'ready'; nextAt = Infinity;
  hud(); setHint(roleHint());
  if (mode === 'bat') announceChance();
  takeQueuedPitch();
}
function showOnlineOver() {
  const sc = onlineScore(), mine = sc[onl.side], theirs = sc[onl.side === 'home' ? 'away' : 'home'];
  leaveRoom(); idle();
  overlay({ title: mine > theirs ? '勝ち！' : mine < theirs ? '負け…' : '引き分け',
    text: 'しばいぬズ ' + sc.home + ' - ' + sc.away + ' パンダーズ', b1: ['メニューへ', showMenu] });
}

/* ---- sharing: send the game link, or an invite link that opens straight into a room ---- */
function inviteUrl(code) { return PAGES_URL + '?room=' + code; }
async function shareLink(text, url) {
  try { if (navigator.share) { await navigator.share({ title: 'ナイター対決', text, url }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
  let copied = false;
  try { await navigator.clipboard.writeText(text + '\n' + url); copied = true; } catch (e) {}
  $('#od').textContent = copied ? 'リンクをコピーしました。LINE などに貼って送ってください。' : url;
}
function shareGame() { shareLink('どうぶつたちの野球ゲーム「ナイター対決」で遊ぼう！', PAGES_URL); }
function shareRoom(code) { shareLink('ナイター対決で対戦しよう！リンクを開くと部屋に入れます（部屋番号 ' + code + '）', inviteUrl(code)); }
/* opened from an invite link (?room=1234): go straight into that room */
function inviteBoot() {
  let code = '';
  try { code = new URLSearchParams(location.search).get('room') || ''; } catch (e) {}
  if (!/^\d{4}$/.test(code)) return;
  try { history.replaceState(null, '', location.pathname); } catch (e) {}
  if (window.supabase && window.supabase.createClient) joinRoom(code);
}
