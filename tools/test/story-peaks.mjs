import assert from 'node:assert/strict';
import { openGame } from './lib.mjs';

for (const [width, height] of [[320, 568], [390, 844], [1280, 800]]) {
  const { b, p, errs } = await openGame({ width, height });
  try {
    await p.waitForFunction(() => window.__dbg);
    await p.evaluate(() => window.__dbg.optOff());
    const words = await p.locator('#ot .title-word').allTextContents();
    assert.deepEqual(words, ['どうぶつ', 'ベースボール']);
    const title = await p.locator('#ot .title-word').evaluateAll(nodes => nodes.map(n => {
      const range = document.createRange(); range.selectNodeContents(n);
      return { lines: range.getClientRects().length, width: n.scrollWidth, available: n.clientWidth };
    }));
    assert.ok(title.every(t => t.lines === 1 && t.width <= t.available + 1), 'Brand words must never break internally');
    assert.equal(await p.locator('#go6').evaluate(n => n.getBoundingClientRect().bottom <= document.querySelector('#overlay').getBoundingClientRect().bottom), true, 'All main menu controls fit');
    await p.screenshot({ path: `tools/test/typography-title-${width}.png` });
    await p.locator('#go2').click();
    assert.equal(await p.locator('#ot').textContent(), 'CPU対戦');
    assert.equal(await p.locator('#ot').evaluate(n => n.scrollWidth <= n.clientWidth), true);
    await p.locator('#go4').click();

    async function art(name) {
      await p.locator('#story-art img').evaluate(i => i.decode());
      await p.evaluate(() => {
        for (const a of document.querySelector('#story-art').getAnimations({ subtree: true })) a.finish();
      });
      const layout = await p.evaluate(() => {
        const r = s => document.querySelector(s).getBoundingClientRect().toJSON();
        return { art: r('#story-art'), text: r('#od'), button: r('#goBtn'), page: r('#overlay') };
      });
      assert.ok(layout.art.bottom <= layout.text.top && layout.text.bottom <= layout.button.top, 'Art, text and controls stay separate');
      assert.ok(layout.button.bottom <= layout.page.bottom, 'Story control fits in viewport');
      await p.screenshot({ path: `tools/test/peak-${name}-${width}.png` });
    }
    await p.evaluate(() => window.__dbg.showStage(5));
    await art('invasion');
    const arrival = new Set();
    for (let n = 0; n < 15 && await p.locator('#overlay').evaluate(el => el.classList.contains('dlg')); n++) {
      const scene = await p.locator('#overlay').getAttribute('data-scene');
      if (scene === 'ultimatum' && !arrival.has(scene)) await art('ultimatum');
      arrival.add(scene);
      await p.locator('#goBtn').click();
    }
    assert.deepEqual([...arrival], ['invasion', 'ultimatum']);
    await p.locator('#goBtn').click();
    assert.equal(await p.locator('#overlay').isHidden(), true);
    assert.equal(await p.locator('#overlay.story-spotlight').count(), 0);

    await p.evaluate(() => window.__dbg.showStage(7));
    await p.locator('#go2').click(); await p.locator('#goBtn').click();
    // Finish a real plate appearance to reach the story's awakening checkpoint.
    await p.evaluate(() => {
      const d = window.__dbg; d.ff();
      d.hit({ kind: 'play', q: .5, dir: 0, ev: 110, launch: 32, dist: 65, res: 'フライアウト', bases: 0 }); d.ff();
    });
    const awakening = new Set();
    for (let n = 0; n < 15 && await p.locator('#overlay').evaluate(el => el.classList.contains('dlg')); n++) {
      const scene = await p.locator('#overlay').getAttribute('data-scene');
      if (!awakening.has(scene)) await art(scene);
      awakening.add(scene); await p.locator('#goBtn').click();
    }
    assert.deepEqual([...awakening], ['awakening-strain', 'awakening-roar', 'beast']);
    assert.equal(await p.locator('#ot').textContent(), 'ぼくが選ぶ');
    await p.locator('#goBtn').click();
    assert.equal(await p.evaluate(() => window.__dbg.beastActive()), true);
    assert.equal(await p.evaluate(() => window.__dbg.G.over), false);
    assert.equal(await p.locator('#overlay.story-spotlight').count(), 0);

    await p.emulateMedia({ reducedMotion: 'reduce' });
    await p.evaluate(() => window.__dbg.showStage(5));
    assert.equal(await p.locator('#story-art img').evaluate(n => n.getAnimations().length), 0);
    await p.locator('#go2').click(); await p.locator('#goBtn').click();
    assert.equal(await p.locator('#overlay').isHidden(), true, 'Skipping a peak returns to playable game');
    assert.deepEqual(errs, []);
    console.log(`✓ whole-word title, arrival, awakening, playable resume, skip and reduced motion ${width}×${height}`);
  } finally { await b.close(); }
}
