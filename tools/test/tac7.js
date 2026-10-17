const { launchBrowser, attachErrors } = require('./lib.mjs');
(async () => {
  const { b, url } = await launchBrowser();
  const ctx = await b.newContext({ viewport: { width: 380, height: 760 } });
  await ctx.addInitScript(() => { localStorage.setItem('yakyu-opts', JSON.stringify({ dice: false, hap: false })); });
  const A = await ctx.newPage(), B = await ctx.newPage();
  const errs = []; [A, B].forEach((p, i) => attachErrors(p, errs, 'P' + i + ' '));
  await A.goto(url); await B.goto(url); await A.waitForTimeout(1500);
  await A.click('#go3'); await A.click('#goBtn'); await A.waitForTimeout(300);
  const code = (await A.textContent('#ot')).replace(/\D/g, '');
  await B.click('#go3'); await B.click('#go2'); await B.fill('#codeIn', code); await B.click('#goBtn');
  await A.waitForFunction(() => window.__dbg.online); await B.waitForFunction(() => window.__dbg.online);
  const st = p => p.evaluate(() => { const d = window.__dbg, G = d.G; return { inn: G.inning, b: G.b, s: G.s, o: G.outs, bases: G.bases.join(''), runs: G.runs, pa: G.pa }; });
  const log = [];
  const waitPhase = (p, ph) => p.waitForFunction(x => window.__dbg.phase === x, ph, { timeout: 30000 });
  async function pitch(hitC, signK, label) {
    await waitPhase(A, 'ready'); await waitPhase(B, 'wait');
    if (signK) { await B.waitForTimeout(200); const chips = await B.$$eval('#acts button', x => x.map(b => b.dataset.k)); log.push('chips ' + chips); await B.click('#acts button[data-k="' + signK + '"]'); await A.waitForTimeout(400); log.push('A sig ' + JSON.stringify(await A.evaluate(() => __dbg.sig()))); }
    await A.evaluate(() => window.__dbg.throwP('str', 140, 0.2, 0.1));
    await waitPhase(B, 'fly');
    if (hitC) await B.evaluate(c => window.__dbg.hit(c), hitC);
    log.push(label + ' A ' + JSON.stringify(await A.evaluate(() => __dbg.sig())) + ' B ' + JSON.stringify(await B.evaluate(() => __dbg.sig())));
    await waitPhase(B, 'result'); await waitPhase(A, 'result'); await B.waitForTimeout(7000);
    const a = await st(A), bb = await st(B);
    log.push((JSON.stringify(a) === JSON.stringify(bb) ? 'SAME ' : 'DIFF ') + label + ' ' + JSON.stringify(a) + ' / ' + JSON.stringify(bb) + ' banner:' + await A.textContent('#bt'));
  }
  await pitch({ kind: 'play', q: 0.7, dir: -20, ev: 130, launch: 14, dist: 60, res: 'ヒット', bases: 1 }, null, 'single');
  await pitch(null, 'steal', 'steal');
  await pitch({ kind: 'play', bunt: true, q: 0.8, dir: 10, ev: 50, launch: 0, dist: 12, bases: 0, res: 'バント' }, 'bunt', 'bunt');
  // menu during online: should not leave
  await A.click('#menuBtn'); await A.waitForTimeout(300);
  log.push('menu overlay: ' + await A.textContent('#ot') + ' online=' + await A.evaluate(() => __dbg.online));
  await A.click('#goBtn'); await A.waitForTimeout(200);
  log.push('overlay hidden ' + await A.$eval('#overlay', e => e.hidden));
  console.log(log.join('\n')); console.log(JSON.stringify(errs));
  await b.close();
})();
