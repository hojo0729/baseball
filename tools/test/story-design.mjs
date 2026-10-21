import assert from 'node:assert/strict';
import { openGame } from './lib.mjs';

async function chapter(p, idx) {
  await p.evaluate(i => window.__dbg.showStage(i), idx);
  await p.click('#go2'); // Skip dialogue, keeping the story checkpoint.
  await p.click('#goBtn');
}
for (const [width, height] of [[320, 568], [390, 844], [1280, 800]]) {
  const { b, p, errs } = await openGame({ width, height });
  try {
    await p.waitForFunction(() => window.__dbg);
    await p.evaluate(() => window.__dbg.optOff());
    for (const idx of [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]) {
      await p.evaluate(i => window.__dbg.showStage(i), idx);
      await p.waitForFunction(() => { const i = document.querySelector('#story-art img'); return i && i.complete && i.naturalWidth > 0; });
      await p.locator('#story-art img').evaluate(im => im.decode());
      await p.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const layout = await p.evaluate(() => {
        const rect = s => { const r = document.querySelector(s).getBoundingClientRect(); return { top: r.top, bottom: r.bottom, right: r.right, left: r.left }; };
        return { art: rect('#story-art'), text: rect('#od'), button: rect('#goBtn'), page: rect('#overlay'), scroll: document.querySelector('#overlay').scrollWidth, width: document.querySelector('#overlay').clientWidth };
      });
      assert.ok(layout.art.bottom <= layout.text.top, 'Art must not overlap dialogue');
      assert.ok(layout.text.bottom <= layout.button.top, 'Dialogue must not overlap controls');
      assert.ok(layout.button.bottom <= layout.page.bottom, `Continue must be visible in chapter ${idx + 1}`);
      assert.ok(layout.scroll <= layout.width + 1, 'No sideways scrolling');
      if ([0, 3, 4, 7, 8, 9].includes(idx)) await p.screenshot({ path: `tools/test/story-design-${idx}-${width}.png` });
    }
    // A real pause in the previous game must not delay the next chapter's first pitch.
    await chapter(p, 0);
    await p.click('#menuBtn');
    await p.waitForFunction(() => window.__dbg.clock().pausedAt > 0);
    await p.waitForTimeout(1200);
    await chapter(p, 0);
    const clock = await p.evaluate(() => window.__dbg.clock());
    assert.equal(clock.timeOut, false);
    assert.ok(clock.nextAt - clock.now <= 1.9, 'New chapter uses a fresh pitching deadline');
    await p.waitForFunction(() => window.__dbg.phase === 'fly' || window.__dbg.G.b + window.__dbg.G.s > 0, null, { timeout: 8000 });
    assert.equal(await p.evaluate(() => window.__dbg.clock().timeOut), false);
    assert.deepEqual(errs, []);
    console.log(`✓ illustrated layout and automatic first pitch ${width}×${height}`);
  } finally { await b.close(); }
}

const { b, p, errs } = await openGame();
try {
  await p.waitForFunction(() => window.__dbg);
  await p.evaluate(() => window.__dbg.optOff());
  await chapter(p, 8);
  await p.evaluate(() => { const d = window.__dbg; d.session.eventDone = true; d.story.score = { home: 10, away: 0 }; d.storyAfterResult(); });
  assert.equal(await p.evaluate(() => window.__dbg.G.over), false, '10-run lead without beast mode does not trigger mercy');
  await p.evaluate(() => { const d = window.__dbg; d.story.score.home = 9; d.useBeast(); d.storyAfterResult(); });
  assert.equal(await p.evaluate(() => window.__dbg.G.over), false, 'Nine-run lead continues');
  await p.evaluate(() => { const d = window.__dbg; d.story.score.home = 10; d.storyAfterResult(); });
  assert.equal(await p.evaluate(() => window.__dbg.G.over && window.__dbg.session.mercy), true, 'Ten-run lead ends the game');
  assert.match(await p.textContent('#od'), /コールドゲーム/);
  await chapter(p, 8);
  await p.evaluate(() => { const d = window.__dbg; d.session.eventDone = true; d.useBeast(); d.story.score = { home: 0, away: 10 }; d.storyAfterResult(); });
  assert.equal(await p.evaluate(() => window.__dbg.G.over && window.__dbg.session.mercy), true, 'Ten-run deficit also ends the game');
  assert.deepEqual(errs, []);
  console.log('✓ beast mercy rule: inactive/9-run/10-run win/10-run loss');
} finally { await b.close(); }
