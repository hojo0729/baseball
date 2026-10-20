import assert from 'node:assert/strict';
import { openGame } from './lib.mjs';
const { b, p, errs } = await openGame();
try {
  await p.waitForFunction(() => window.__dbg);
  await p.evaluate(() => { window.__dbg.optOff(); window.__dbg.showStage(8); });
  for (let i = 0; i < 20 && await p.evaluate(() => document.querySelector('#overlay').classList.contains('dlg')); i++) await p.click('#goBtn');
  await p.click('#goBtn');
  await p.locator('[data-k="beast"]').click();
  await p.waitForFunction(() => window.__dbg.beastView().pitcher);
  await p.evaluate(() => window.__dbg.pk(.2, true));
  await p.waitForTimeout(150);
  await p.screenshot({ path: 'tools/test/beast-pitcher.png' });
  await p.evaluate(() => { window.__cam = null; window.__pk = null; });
  await p.evaluate(() => { window.__dbg.G.skill.vn = 0; });
  for (let i = 0; i < 3; i++) {
    const result = await p.evaluate(() => {
      const cv = document.querySelector('#cv'), r = cv.getBoundingClientRect();
      const x = r.left + r.width / 2, y = r.top + r.height * .7;
      for (const [type, cy] of [['pointerdown', y], ['pointermove', y - 80], ['pointerup', y - 80]]) cv.dispatchEvent(new PointerEvent(type, { clientX: x, clientY: cy, bubbles: true, pointerId: 1 }));
      window.__dbg.ff(); return window.__dbg.beastView();
    });
    assert.equal(result.speed, 200);
    assert.equal(result.vanish, true);
    assert.equal(result.armed, true);
    assert.equal(await p.evaluate(() => window.__dbg.G.skill.vn), 0);
    // Finish the plate appearance and resume through the one-time final-match dialogue.
    await p.evaluate(() => { window.__dbg.hit({ kind: 'play', q: .5, dir: 0, ev: 110, launch: 32, dist: 65, res: 'フライアウト', bases: 0 }); window.__dbg.ff(); });
    for (let n = 0; n < 10 && await p.evaluate(() => !document.querySelector('#overlay').hidden && document.querySelector('#overlay').classList.contains('dlg')); n++) await p.click('#goBtn');
  }
  assert.equal(await p.evaluate(() => window.__dbg.mode), 'bat');
  await p.waitForFunction(() => window.__dbg.beastView().batter && window.__dbg.beastView().batScale > 2);
  assert.equal(await p.evaluate(() => window.__dbg.beastView().giant), true);
  await p.screenshot({ path: 'tools/test/beast-batter.png' });
  await p.evaluate(() => window.__dbg.gopit());
  await p.waitForFunction(() => !window.__dbg.beastView().pitcher && !window.__dbg.beastView().batter);
  assert.equal(await p.evaluate(() => window.__dbg.beastActive()), false);
  assert.deepEqual(errs, []);
  console.log('✓ beast: transformed models, repeated 200 km/h vanishing pitches at zero charges, persistent giant bat, practice reset');
} finally { await b.close(); }
