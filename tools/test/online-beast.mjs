import assert from 'node:assert/strict';
import { launchBrowser, attachErrors } from './lib.mjs';

const { b, url } = await launchBrowser();
try {
  const ctx = await b.newContext({ viewport: { width: 320, height: 568 } });
  await ctx.addInitScript(() => {
    localStorage.setItem('yakyu-bgm', '0');
    localStorage.setItem('yakyu-opts', JSON.stringify({ dice: false, hap: false }));
  });
  const A = await ctx.newPage(), B = await ctx.newPage(), errors = [];
  for (const p of [A, B]) { attachErrors(p, errors); await p.goto(url); await p.waitForFunction(() => window.__dbg); await p.evaluate(() => { window.__dbg.optOff(); window.__dbg.freezePitches(); }); }
  async function join() {
    await A.click('#go3'); await A.click('#goBtn');
    const code = (await A.textContent('#ot')).replace(/\D/g, '');
    await B.click('#go3'); await B.click('#go2'); await B.fill('#codeIn', code); await B.click('#goBtn');
    for (const p of [A, B]) await p.waitForFunction(() => window.__dbg.online);
    await A.waitForFunction(() => window.__dbg.phase === 'ready');
    await B.waitForFunction(() => window.__dbg.phase === 'wait');
  }
  const state = p => p.evaluate(() => {
    const d = window.__dbg, g = d.G;
    return { inning: g.inning, pa: g.pa, outs: g.outs, b: g.b, s: g.s, runs: g.runs, bases: g.bases, score: d.score(), beast: d.onlineBeast().active };
  });
  async function finish(pitcher, batter, pa) {
    const immediate = await batter.evaluate(() => {
      const d = window.__dbg; if (d.phase === 'deliver') d.ff();
      // This test needs a guaranteed out: ordinary fly balls can become random errors.
      d.hit({ kind: 'play', q: .5, dir: 0, ev: 90, launch: 65, dist: 20, res: 'ポップフライ', bases: 0 });
      return { giant: d.beastView().giant, inning: d.G.inning };
    });
    if (pa === 3) { assert.equal(immediate.inning, 2); assert.equal(immediate.giant, false, 'Keep the old batting team through the third-out animation'); }
    for (const p of [pitcher, batter]) await p.waitForFunction(n => window.__dbg.G.pa === n, pa);
    for (const p of [pitcher, batter]) await p.evaluate(() => { if (window.__dbg.phase === 'result') window.__dbg.ff(); });
    assert.deepEqual(await state(A), await state(B), 'SAME: both teams and result state');
  }
  async function debugPitch(pitcher, batter) {
    await pitcher.waitForFunction(() => window.__dbg.phase === 'ready');
    await batter.waitForFunction(() => window.__dbg.phase === 'wait');
    await pitcher.evaluate(() => { window.__dbg.throwP('str', 140, .2, .1); window.__dbg.ff(); });
    await batter.waitForFunction(() => ['deliver', 'fly'].includes(window.__dbg.phase));
    await batter.evaluate(() => { if (window.__dbg.phase === 'deliver') window.__dbg.ff(); });
  }
  await A.keyboard.type('BEAST'); // Disabled outside an online game.
  await join(); console.log('✓ two online peers joined');
  assert.deepEqual(await A.evaluate(() => window.__dbg.onlineBeast().active), { home: false, away: false });
  await A.click('#menuBtn');
  await A.evaluate(() => { for(let i=0;i<5;i++) document.querySelector('#ot').click(); });
  assert.equal(await A.textContent('#ot'), '隠しコマンド');
  console.log('✓ mobile secret field');
  await A.fill('#beast-code', 'wrong'); await A.click('#goBtn');
  assert.equal(await A.evaluate(() => window.__dbg.onlineBeast().wanted.home), false);
  await A.fill('#beast-code', 'beast');
  const rect = await A.locator('#beast-code').boundingBox();
  assert.ok(rect.x >= 0 && rect.x + rect.width <= 320, 'Mobile command field must fit');
  await A.screenshot({ path: 'tools/test/online-beast-command.png' });
  await A.click('#goBtn'); await A.click('#goBtn');
  await B.waitForFunction(() => window.__dbg.onlineBeast().wanted.home);
  assert.equal(await A.evaluate(() => window.__dbg.onlineBeast().active.home), false, 'Request waits for the next pitch');
  await A.evaluate(() => { window.__dbg.G.skill.vn = 0; });
  // Exercise the real pointer input path, not only the debug pitch helper.
  await A.evaluate(() => {
    const cv = document.querySelector('#cv'), r = cv.getBoundingClientRect();
    const x = r.left + r.width/2, y = r.top + r.height*.7;
    for (const [type, py] of [['pointerdown', y], ['pointermove', y-70], ['pointerup', y-70]])
      cv.dispatchEvent(new PointerEvent(type, { clientX: x, clientY: py, pointerId: 1, bubbles: true }));
    window.__dbg.ff();
  });
  await B.waitForFunction(() => ['deliver', 'fly'].includes(window.__dbg.phase));
  await B.evaluate(() => { if (window.__dbg.phase === 'deliver') window.__dbg.ff(); });
  for (const p of [A, B]) {
    await p.waitForFunction(() => window.__dbg.beastView().pitcher);
    assert.equal(await p.evaluate(() => window.__dbg.beastView().speed), 200);
    assert.equal(await p.evaluate(() => window.__dbg.beastView().vanish), true);
    assert.equal(await p.evaluate(() => window.__dbg.beastView().batter), false);
  }
  assert.equal(await A.evaluate(() => window.__dbg.G.skill.vn), 0, 'Infinite magic consumes no charge');
  await finish(A, B, 1); console.log('✓ real 200 km/h pitch and shared beast state');
  for (const pa of [2, 3]) {
    await A.locator('[data-k="vn"]').click();
    await debugPitch(A, B);
    for (const p of [A, B]) assert.equal(await p.evaluate(() => window.__dbg.beastView().vanish), pa === 3);
    assert.equal(await A.evaluate(() => window.__dbg.G.skill.vn), 0);
    await finish(A, B, pa);
  }
  for (const p of [A, B]) {
    await p.waitForFunction(() => window.__dbg.beastView().batter && window.__dbg.beastView().batScale > 2);
    assert.equal(await p.evaluate(() => window.__dbg.beastView().giant), true);
    assert.equal(await p.evaluate(() => window.__dbg.beastView().pitcher), false);
  }
  console.log('✓ inning switch and remote giant bat');
  await debugPitch(B, A);
  assert.equal(await A.evaluate(() => window.__dbg.beastView().speed), 140);
  const quality = await A.evaluate(() => {
    const d = window.__dbg, boosted = d.contact(.11, .5, 0, 140, false, false).q;
    return { boosted };
  });
  assert.ok(quality.boosted > .4, 'Beast batting improves contact tolerance');
  await B.keyboard.type('BEAST');
  await A.waitForFunction(() => window.__dbg.onlineBeast().wanted.away);
  assert.equal(await B.evaluate(() => window.__dbg.onlineBeast().active.away), false, 'Mid-pitch command must not change the current pitch');
  assert.equal(await A.evaluate(() => window.__dbg.beastView().speed), 140);
  await finish(B, A, 4);
  await debugPitch(B, A);
  for (const p of [A, B]) {
    await p.waitForFunction(() => window.__dbg.beastView().pitcher && window.__dbg.beastView().batter);
    assert.equal(await p.evaluate(() => window.__dbg.beastView().speed), 200);
    assert.equal(await p.evaluate(() => window.__dbg.beastView().vanish), true);
  }
  await B.keyboard.type('BEAST');
  await finish(B, A, 5);
  await B.click('#menuBtn'); await B.click('#go2'); await B.click('#go2');
  await A.waitForFunction(() => !window.__dbg.online);
  await A.click('#goBtn');
  for (const p of [A, B]) assert.deepEqual(await p.evaluate(() => window.__dbg.onlineBeast().active), { home: false, away: false });
  await join();
  for (const p of [A, B]) {
    assert.deepEqual(await p.evaluate(() => window.__dbg.onlineBeast().wanted), { home: false, away: false });
    await p.waitForFunction(() => !window.__dbg.beastView().pitcher && !window.__dbg.beastView().batter);
  }
  assert.deepEqual(errors, []);
  console.log('SAME online beast: mobile command, invalid input, real 200 km/h pitch, infinite magic, both views, inning switch, giant bat, keyboard command mid-pitch, both teams, duplicate command, disconnect and fresh match');
  console.log(JSON.stringify(errors));
} finally { await b.close(); }
