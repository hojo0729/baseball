import assert from 'node:assert/strict';

// Exercise actual CPU swings and results: center, corner, and far outside the zone.
export async function playAwakeningOpening(p) {
  const pitches = [['str', 150, 0, 0], ['cur', 95, -.95, .95], ['chg', 80, 2, -2]];
  for (let i = 0; i < pitches.length; i++) {
    assert.equal(await p.evaluate(() => window.__dbg.mode), 'pit');
    await p.evaluate(args => { const d = window.__dbg; d.throwP(...args); d.ff(); }, pitches[i]);
    await p.waitForFunction(n => window.__dbg.G.hr === n, i + 1);
    assert.equal(await p.evaluate(() => window.__dbg.G.runs), i + 1);
    assert.equal(await p.evaluate(() => window.__dbg.G.outs), 0);
    await p.evaluate(() => window.__dbg.ff());
    assert.equal(await p.evaluate(() => window.__dbg.session.eventDone), i === 2);
    assert.equal(await p.locator('#overlay').isHidden(), i < 2);
  }
}
