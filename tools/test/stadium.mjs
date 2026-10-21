import assert from 'node:assert/strict';
import { openGame } from './lib.mjs';

const { b, p, errs } = await openGame({ width: 390, height: 844 });
try {
  await p.waitForFunction(() => window.__dbg);
  await p.evaluate(() => { window.__dbg.optOff(); localStorage.setItem('yakyu-bgm', '0'); });
  const ids = ['park', 'tiger', 'lab', 'forest', 'archive', 'invasion', 'ai', 'trial', 'final', 'morning'];
  const geometryCounts = [];
  for (let round = 0; round < 2; round++) {
    for (let i = 0; i < ids.length; i++) {
      await p.evaluate(i => { window.__dbg.showStage(i); window.__dbg.stadiumShot(false); }, i);
      await p.waitForFunction(id => window.__dbg.stadium().id === id, ids[i]);
      await p.waitForTimeout(70);
      assert.equal(await p.locator('#overlay').isVisible(), false, 'Capture the playable 3D field, not the dialogue illustration');
      const env = await p.evaluate(() => window.__dbg.stadium());
      assert.equal(env.visible, 1);
      assert.ok(env.batches <= 18, 'Keep active scenery within a small draw-call budget');
      assert.equal(env.fence, 74.4); assert.equal(env.distance, 122);
      assert.deepEqual(env.center, [0, 0, -47.6]); assert.deepEqual(env.mound, [0, .125, -18.44]);
      if (round === 0 && [0, 1, 3, 5, 7, 8].includes(i)) {
        await p.screenshot({ path: `tools/test/stadium-${ids[i]}-390.png` });
        await p.evaluate(() => window.__dbg.stadiumShot(true));
        await p.waitForTimeout(70);
        await p.screenshot({ path: `tools/test/stadium-${ids[i]}-wide.png` });
      }
    }
    geometryCounts.push(await p.evaluate(() => window.__dbg.stadium().geometries));
  }
  assert.equal(geometryCounts[1], geometryCounts[0], 'Replaying chapters must reuse geometry');
  await p.evaluate(() => { window.__dbg.showStage(7); window.__dbg.session.beastUsed = true; window.__dbg.stadiumShot(false); });
  await p.waitForFunction(() => window.__dbg.stadium().id === 'awakened');
  await p.screenshot({ path: 'tools/test/stadium-awakened-390.png' });
  assert.equal(await p.evaluate(() => window.__dbg.stadium().type), 'trial');
  for (const [width, height] of [[320, 568], [1280, 800]]) {
    await p.setViewportSize({ width, height });
    for (const i of [0, 5, 7, 8]) {
      await p.evaluate(i => { window.__dbg.showStage(i); window.__dbg.stadiumShot(false); }, i);
      await p.waitForTimeout(70);
      await p.screenshot({ path: `tools/test/stadium-${ids[i]}-${width}.png` });
    }
  }
  await p.evaluate(() => { window.__hold = null; window.__dbg.gopit(); });
  await p.waitForFunction(() => window.__dbg.stadium().id === 'standard');
  const normal = await p.evaluate(() => window.__dbg.stadium());
  assert.equal(normal.visible, 0); assert.equal(normal.sky, '050b13'); assert.equal(normal.grassMap, true);
  assert.equal(normal.stands, true); assert.equal(normal.towers, 12); assert.equal(normal.stars, true);
  assert.equal(normal.groups, 7);
  assert.deepEqual(errs, []);
  console.log('✓ all chapter stadiums, unchanged dimensions, bounded batches, cached geometry, awakening palette, three screen sizes and normal-stadium restore');
} finally { await b.close(); }
