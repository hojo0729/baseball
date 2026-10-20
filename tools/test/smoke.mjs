import { launchBrowser, attachErrors } from './lib.mjs';
import { runStory } from './story.mjs';

const FLYOUT = { kind: 'play', q: 0.5, dir: 0, ev: 110, launch: 32, dist: 65, res: 'フライアウト', bases: 0 };
const SINGLE = { kind: 'play', q: 0.75, dir: -15, ev: 130, launch: 14, dist: 55, res: 'ヒット', bases: 1 };
const HOMERUN = { kind: 'play', q: 0.95, dir: 0, ev: 170, launch: 30, dist: 125, res: 'ホームラン', bases: 4 };

let failed = false;
function ok(msg) { console.log(`✓ ${msg}`); }
function ng(msg, detail) {
  failed = true;
  console.error(`✗ ${msg}${detail ? ': ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : ''}`);
}

function validateState(st, errs, contextLabel) {
  if (errs.length > 0) {
    ng(`実行時エラー検知 (${contextLabel})`, errs.slice());
    throw new Error('Runtime error detected');
  }
  if (!st) return;
  const intRange = (v, min, max) => Number.isInteger(v) && v >= min && v <= max;
  const validBases = Array.isArray(st.bases) && st.bases.length === 3 && st.bases.every(x => intRange(x, 0, 5));
  const validRuns = Number.isInteger(st.runs) && Number.isInteger(st.sb.home) && Number.isInteger(st.sb.away);
  if (
    !intRange(st.outs, 0, 2) ||
    !intRange(st.b, 0, 3) ||
    !intRange(st.s, 0, 2) ||
    !validBases ||
    !(Number.isInteger(st.inning) && st.inning >= 1) ||
    !validRuns
  ) {
    ng(`状態の整合チェック失敗 (${contextLabel})`, st);
    throw new Error('Invariant violation');
  }
}

async function checkInvariants(p, errs, contextLabel) {
  const st = await p.evaluate(() => {
    if (typeof window.__dbg === 'undefined' || !window.__dbg.G) return null;
    const G = window.__dbg.G, sb = window.__dbg.score();
    return { outs: G.outs, b: G.b, s: G.s, bases: G.bases, inning: G.inning, runs: G.runs, sb };
  });
  validateState(st, errs, contextLabel);
}

async function playPA(p, errs, hitObj, label) {
  const st = await p.evaluate(c => {
    const d = window.__dbg;
    if (d.mode === 'pit') {
      d.pitch();
      d.ff();
    } else {
      d.ff();
    }
    d.hit(c);
    d.ff();
    const G = d.G, sb = d.score();
    return { outs: G.outs, b: G.b, s: G.s, bases: G.bases, inning: G.inning, runs: G.runs, sb, over: G.over };
  }, hitObj);
  validateState(st, errs, label);
  return st;
}

(async () => {
  const t0 = Date.now();
  const { b, url } = await launchBrowser();
  try {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
    const p = await ctx.newPage();
    const errs = attachErrors(p);

    // 1. 起動
    await p.goto(url);
    await p.waitForTimeout(2500);
    const title = await p.textContent('#ot');
    if (errs.length === 0 && title === 'どうぶつベースボール') {
      ok('1. 起動（2.5秒待機・エラー0件・タイトル「どうぶつベースボール」）');
    } else {
      ng('1. 起動', { title, errs });
      throw new Error('Boot failed');
    }
    await checkInvariants(p, errs, '起動直後');
    const initSnap = await p.evaluate(() => window.__dbg.state());

    // テスト中のランダムダイス・ハプニングによるアウト・走者変動をオフにする
    await p.evaluate(() => window.__dbg.optOff());

    // 2. メニュー（ストーリー以外の全ボタン）
    // CPU対戦 -> もどる
    await p.click('#go2');
    if ((await p.textContent('#ot')) !== 'CPU対戦') throw new Error('CPU対戦画面が開かない');
    await p.click('#go4');
    if ((await p.textContent('#ot')) !== 'どうぶつベースボール') throw new Error('CPU対戦から戻れない');

    // オンライン対戦 -> もどる
    await p.click('#go3');
    if ((await p.textContent('#ot')) !== 'オンライン対戦') throw new Error('オンライン対戦画面が開かない');
    await p.click('#go3');
    if ((await p.textContent('#ot')) !== 'どうぶつベースボール') throw new Error('オンライン対戦から戻れない');

    // 友達に送る
    await p.click('#go4');
    await p.waitForTimeout(100);
    const shareText = await p.textContent('#od');
    if (!shareText) throw new Error('友達に送るのテキストが空');

    // 遊び方 ① -> ② -> ③ -> もどる
    await p.click('#go5');
    if (!(await p.textContent('#ot')).startsWith('遊び方 ①')) throw new Error('遊び方①が開かない');
    await p.click('#goBtn');
    if (!(await p.textContent('#ot')).startsWith('遊び方 ②')) throw new Error('遊び方②が開かない');
    await p.click('#goBtn');
    if (!(await p.textContent('#ot')).startsWith('遊び方 ③')) throw new Error('遊び方③が開かない');
    await p.click('#goBtn');
    if ((await p.textContent('#ot')) !== 'どうぶつベースボール') throw new Error('遊び方から戻れない');

    // 設定 -> クレジット -> 設定 -> もどる
    await p.click('#go6');
    if ((await p.textContent('#ot')) !== '設定') throw new Error('設定が開かない');
    await p.click('#go5');
    if ((await p.textContent('#ot')) !== 'クレジット') throw new Error('クレジットが開かない');
    await p.click('#goBtn');
    if ((await p.textContent('#ot')) !== '設定') throw new Error('クレジットから設定に戻れない');
    await p.click('#go6');
    if ((await p.textContent('#ot')) !== 'どうぶつベースボール') throw new Error('設定からメニューに戻れない');

    await checkInvariants(p, errs, 'メニュー巡回後');
    ok('2. メニュー（CPU対戦・オンライン対戦・友達に送る・遊び方・設定・クレジットの開閉）');

    await runStory(p, errs, { playPA, FLYOUT, HOMERUN });

    // 4. CPU対戦：開始して、1球投げて、攻守交代まで進むこと
    await p.click('#go2');   // CPU対戦
    await p.click('#goBtn'); // 先攻で試合
    await p.click('#goBtn'); // しばいぬズ
    await p.click('#go2');   // ふつう
    const cpuStart = await p.evaluate(() => ({ hasMatch: !!window.__dbg.m(), mode: window.__dbg.mode, maxHalf: window.__dbg.G.maxHalf, inn: window.__dbg.G.inning }));
    if (!cpuStart.hasMatch || cpuStart.mode !== 'bat' || cpuStart.maxHalf !== 18 || cpuStart.inn !== 1) {
      ng('4. CPU対戦 開始状態異常', cpuStart);
      throw new Error('CPU match start failed');
    }
    await playPA(p, errs, FLYOUT, 'CPU対戦 1アウト目');
    await playPA(p, errs, FLYOUT, 'CPU対戦 2アウト目');
    await playPA(p, errs, FLYOUT, 'CPU対戦 3アウト目（攻守交代）');
    const cpuChange = await p.evaluate(() => ({ inn: window.__dbg.G.inning, mode: window.__dbg.mode, outs: window.__dbg.G.outs }));
    if (cpuChange.inn !== 2 || cpuChange.mode !== 'pit' || cpuChange.outs !== 0) {
      ng('4. CPU対戦 攻守交代異常', cpuChange);
      throw new Error('CPU match changeover failed');
    }
    // 1回裏（守備）で実際に1球投げる
    await playPA(p, errs, FLYOUT, 'CPU対戦 1回裏1球');

    // 4b. 本塁クロスプレー回帰テスト（3塁走者タッチアップでのアウト数確認）
    // 状態：G.outs = 1, G.bases = [0, 0, 3], フライアウト (dist 60, res 'フライアウト')
    const TAGUP_FLY = { kind: 'play', q: 0.6, dir: 0, ev: 110, launch: 32, dist: 60, res: 'フライアウト', bases: 0 };
    // アウト側強制（Math.random = 0.999）: フライ＋本塁タッチアウトで計2アウト増え、チェンジになること
    const tagOutRes = await p.evaluate(c => {
      const d = window.__dbg;
      d.G.inning = 1;
      d.G.outs = 1;
      d.G.runs = 0;
      d.G.bases = [0, 0, 3];
      d.pitch();
      d.ff();
      d.hit(c, () => 0.999);
      d.ff();
      const G = d.G;
      return { inn: G.inning, outs: G.outs, runs: G.runs, bases: G.bases };
    }, TAGUP_FLY);
    if (!(tagOutRes.inn === 2 && tagOutRes.outs === 0 && tagOutRes.runs === 0 && tagOutRes.bases.every(x => x === 0))) {
      ng('4b. 本塁クロスプレー回帰テスト（アウト側）失敗', tagOutRes);
      throw new Error('Home plate tag out test failed');
    }

    // セーフ側強制（Math.random = 0）: 犠牲フライで1点入り、アウトはフライの1つだけ増えて計2アウトになること
    const tagSafeRes = await p.evaluate(c => {
      const d = window.__dbg;
      d.G.inning = 1;
      d.G.outs = 1;
      d.G.runs = 0;
      d.G.bases = [0, 0, 3];
      d.pitch();
      d.ff();
      // 1回目(makePlay superPlay): 0.5, 2回目(エラー判定): 0.5 (>=0.05), 3回目(本塁突入セーフ判定): 0 (<safeProb)
      let cnt = 0;
      d.hit(c, () => (cnt++ < 2 ? 0.5 : 0));
      d.ff();
      const G = d.G;
      return { inn: G.inning, outs: G.outs, runs: G.runs, bases: G.bases };
    }, TAGUP_FLY);
    if (!(tagSafeRes.inn === 1 && tagSafeRes.outs === 2 && tagSafeRes.runs === 1)) {
      ng('4b. 本塁クロスプレー回帰テスト（セーフ側）失敗', tagSafeRes);
      throw new Error('Home plate safe test failed');
    }

    await p.click('#menuBtn');
    await p.click('#go3'); // 試合をやめる
    ok('4. CPU対戦（開始・攻守交代・本塁クロスプレー判定・メニュー帰還）');

    // 5. 練習モード：開始して、1球打てること
    await p.click('#go2');   // CPU対戦
    await p.click('#go3');   // 練習（打つだけ／投げるだけ）
    await p.click('#goBtn'); // 試合開始
    await p.click('#mBat');  // 打つモードを選択
    await p.click('#goBtn'); // 試合開始（打つモード）
    await playPA(p, errs, SINGLE, '練習モード 1球ヒット');
    const pracState = await p.evaluate(() => ({ hits: window.__dbg.G.hits, b1: window.__dbg.G.bases[0] }));
    if (pracState.hits !== 1 || !(pracState.b1 >= 1 && pracState.b1 <= 5)) {
      ng('5. 練習モード ヒット判定異常', pracState);
      throw new Error('Practice hit failed');
    }
    await p.click('#menuBtn');
    await p.click('#go3'); // 試合をやめる
    ok('5. 練習モード（開始・1球打撃・メニュー帰還）');

    // 6. オンライン（モック）：2タブで部屋を作って入り、1球投げて、両端末の状態が同じ（SAME）であること
    await p.click('#go3');   // オンライン対戦
    await p.click('#goBtn'); // 部屋を作る
    await p.waitForFunction(() => {
      const el = document.querySelector('#ot');
      return el && /\d{4}/.test(el.textContent);
    });
    const code = (await p.textContent('#ot')).replace(/\D/g, '').slice(0, 4);

    const p2 = await ctx.newPage();
    attachErrors(p2, errs, 'P2 ');
    await p2.goto(url);
    await p2.waitForTimeout(300);
    await p2.evaluate(() => window.__dbg.optOff());

    await p2.click('#go3');  // オンライン対戦
    await p2.click('#go2');  // 部屋に入る
    await p2.fill('#codeIn', code);
    await p2.click('#goBtn'); // 入る

    // Two software-rendered tabs can briefly stall the headless event loop while
    // decoding story art; allow the same handshake budget as tac7.js.
    const wfOpts = { polling: 50, timeout: 30000 };
    await p.waitForFunction(() => window.__dbg && window.__dbg.online, null, wfOpts).catch(async error => {
      const info = page => page.evaluate(() => ({ title: document.querySelector('#ot').textContent, text: document.querySelector('#od').textContent, lobby: window.__dbg.lobby() }));
      console.error('Online lobby timeout', { host: await info(p), guest: await info(p2), errors: errs });
      throw error;
    });
    await p2.waitForFunction(() => window.__dbg && window.__dbg.online, null, wfOpts);
    await p.waitForFunction(() => window.__dbg.phase === 'ready', null, wfOpts);
    await p2.waitForFunction(() => window.__dbg.phase === 'wait', null, wfOpts);

    await p.evaluate(() => { window.__dbg.throwP('str', 140, 0, 0); window.__dbg.ff(); });
    await p2.waitForFunction(() => window.__dbg.phase === 'deliver' || window.__dbg.phase === 'fly', null, wfOpts);
    await p2.evaluate(c => { window.__dbg.ff(); window.__dbg.hit(c); }, SINGLE);
    // The result overlay is transient. Both plate-appearance counters advancing
    // proves the fixed hit was processed even if a slow tab has resumed waiting.
    await p.waitForFunction(() => window.__dbg.G.pa === 1, null, wfOpts);
    await p2.waitForFunction(() => window.__dbg.G.pa === 1, null, wfOpts);

    const snapOnline = page => page.evaluate(() => {
      const d = window.__dbg, G = d.G;
      return { inn: G.inning, b: G.b, s: G.s, o: G.outs, bases: G.bases.join(''), runs: G.runs, pa: G.pa, sb: d.score() };
    });
    const s1 = await snapOnline(p), s2 = await snapOnline(p2);
    if (JSON.stringify(s1) !== JSON.stringify(s2)) {
      ng('6. オンライン（モック）2タブ状態不一致 (DIFF)', { s1, s2 });
      throw new Error('Online state mismatch');
    }
    await checkInvariants(p, errs, 'オンライン1球後(Host)');
    await checkInvariants(p2, errs, 'オンライン1球後(Guest)');
    await p2.close();
    // ホスト側もメニューへ戻る（#menuBtn -> 試合をやめる -> やめる）
    await p.click('#menuBtn');
    await p.click('#go2');
    await p.click('#go2');
    ok(`6. オンライン（モック：部屋 ${code} 接続・1球同期 SAME）`);

    // 7. 状態の整合チェック（全工程完了確認）
    await checkInvariants(p, errs, '全工程終了時');
    ok('7. 状態の整合チェック（アウト・カウント・走者・イニング・得点の全ステップ監視）');

    // 8. リセット漏れ確認
    const endSnap = await p.evaluate(() => window.__dbg.state());
    if (JSON.stringify(initSnap) !== JSON.stringify(endSnap)) {
      ng('8. リセット漏れ検知（起動直後とメニュー帰還後の状態不一致）', { initSnap, endSnap });
      throw new Error('Reset leak detected');
    }
    ok('8. リセット漏れ確認（brawl・hbpUntil・play.pend・サイン・予定フラグ等の完全初期化）');

    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`=== smoke.mjs 全チェック完了 (${elapsed}s) ===`);
  } catch (e) {
    if (!failed) ng('テスト中断', e.stack || e.message);
    process.exitCode = 1;
  } finally {
    await b.close();
  }
})();
