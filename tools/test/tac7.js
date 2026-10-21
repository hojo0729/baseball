const { launchBrowser, attachErrors } = require('./lib.mjs');
const assert = require('node:assert/strict');
(async () => {
  const { b, url } = await launchBrowser();
  try {
  const ctx = await b.newContext({ viewport: { width: 380, height: 760 } });
  await ctx.addInitScript(() => { localStorage.setItem('yakyu-opts', JSON.stringify({ dice: false, hap: false })); localStorage.setItem('yakyu-bgm', '0'); });
  const A = await ctx.newPage(), B = await ctx.newPage();
  const errs = []; [A, B].forEach((p, i) => attachErrors(p, errs, 'P' + i + ' '));
  // Synchronization test: skip software WebGL drawing, retain real pitch timing.
  for (const p of [A, B]) { await p.goto(url); await p.waitForFunction(() => window.__dbg); await p.evaluate(() => { window.__dbg.optOff(); window.__dbg.noDraw(); }); }
  await A.click('#go3'); await A.click('#goBtn'); await A.waitForTimeout(300);
  const code = (await A.textContent('#ot')).replace(/\D/g, '');
  await B.click('#go3'); await B.click('#go2'); await B.fill('#codeIn', code); await B.click('#goBtn');
  for (const p of [A, B]) await p.waitForFunction(() => window.__dbg.online).catch(async error => {
    console.error('Lobby timeout', await Promise.all([A, B].map(p => p.evaluate(() => ({ title: document.querySelector('#ot').textContent, lobby: window.__dbg.lobby() }))))); throw error;
  });
  const st = p => p.evaluate(() => { const d = window.__dbg, G = d.G; return { inn: G.inning, b: G.b, s: G.s, o: G.outs, bases: G.bases.join(''), runs: G.runs, pa: G.pa }; });
  const log = [];
  const waitPhase = (p, ph) => p.waitForFunction(x => window.__dbg.phase === x, ph, { timeout: 30000 });
  async function pitch(hitC, signK, label, seed = null) {
    await waitPhase(A, 'ready'); await waitPhase(B, 'wait');
    if (signK) { await B.waitForTimeout(200); const chips = await B.$$eval('#acts button', x => x.map(b => b.dataset.k)); log.push('chips ' + chips); await B.click('#acts button[data-k="' + signK + '"]'); await A.waitForTimeout(400); log.push('A sig ' + JSON.stringify(await A.evaluate(() => __dbg.sig()))); }
    await A.evaluate(() => window.__dbg.throwP('str', 140, 0.2, 0.1));
    await waitPhase(B, 'fly');
    if (hitC) await B.evaluate(({c,seed}) => window.__dbg.hit(c, seed === null ? undefined : () => seed/4294967296), {c:hitC,seed});
    log.push(label + ' A ' + JSON.stringify(await A.evaluate(() => __dbg.sig())) + ' B ' + JSON.stringify(await B.evaluate(() => __dbg.sig())));
    await waitPhase(B, 'result'); await waitPhase(A, 'result'); await B.waitForTimeout(7000);
    const a = await st(A), bb = await st(B);
    log.push((JSON.stringify(a) === JSON.stringify(bb) ? 'SAME ' : 'DIFF ') + label + ' ' + JSON.stringify(a) + ' / ' + JSON.stringify(bb) + ' banner:' + await A.textContent('#bt'));
  }
  await pitch({ kind: 'play', q: 0.7, dir: -20, ev: 130, launch: 14, dist: 60, res: 'ヒット', bases: 1 }, null, 'single');
  await pitch(null, 'steal', 'steal');
  await pitch({ kind: 'play', bunt: true, q: 0.8, dir: 10, ev: 50, launch: 0, dist: 12, bases: 0, res: 'バント' }, 'bunt', 'bunt');
  // A shared seed upgrades this deep gap double on both peers. A runner on
  // third scores and the batter ends at third, with no accidental home run.
  for (const p of [A, B]) await p.evaluate(() => { __dbg.G.bases=[0,0,3]; __dbg.G.runs=0; });
  await pitch({ kind:'play', q:.9, dir:20, ev:150, launch:25, dist:95, res:'ツーベース', bases:2 }, null, 'deep-gap', 7);
  assert.deepEqual(await st(A), await st(B));
  assert.equal((await st(A)).runs, 1);
  assert.match((await st(A)).bases, /^00[1-5]$/);
  // menu during online: should not leave
  await A.click('#menuBtn'); await A.waitForTimeout(300);
  log.push('menu overlay: ' + await A.textContent('#ot') + ' online=' + await A.evaluate(() => __dbg.online));
  await A.click('#goBtn'); await A.waitForTimeout(200);
  log.push('overlay hidden ' + await A.$eval('#overlay', e => e.hidden));
  console.log(log.join('\n')); console.log(JSON.stringify(errs));
  } finally { await b.close(); }
})();
