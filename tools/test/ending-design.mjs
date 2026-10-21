import assert from 'node:assert/strict';
import { openGame } from './lib.mjs';

for (const [width, height] of [[320, 568], [390, 844], [1280, 800]]) {
  const { b, p, errs } = await openGame({ width, height });
  try {
    await p.waitForFunction(() => window.__dbg);
    await p.evaluate(() => { window.__dbg.optOff(); window.__dbg.showStage(9); });
    await p.click('#go2'); // Finish the picnic dialogue, entering the real-world coda.
    async function shot(name) {
      const im = p.locator('#story-art img');
      await im.evaluate(i => i.decode());
      await p.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
      assert.match(await im.getAttribute('src'), new RegExp(`ending-${name}\\.webp$`));
      const layout = await p.evaluate(() => {
        const rect = s => document.querySelector(s).getBoundingClientRect().toJSON();
        return { art: rect('#story-art'), text: rect('#od'), button: rect('#goBtn'), overlay: rect('#overlay') };
      });
      assert.ok(layout.art.bottom <= layout.text.top, 'Ending artwork stays above narration');
      assert.ok(layout.text.bottom <= layout.button.top, 'Ending narration stays above controls');
      assert.ok(layout.button.bottom <= layout.overlay.bottom, 'Continue remains visible');
      await p.screenshot({ path: `tools/test/ending-design-${name}-${width}.png` });
    }
    await shot('street');
    const balloonY = () => p.locator('.ending-balloon').evaluate(el => el.getBoundingClientRect().top);
    const startY = await balloonY();
    await p.click('#goBtn');
    await p.locator('.ending-balloon').evaluate(el => {
      const animation = el.getAnimations()[0];
      if (!animation) throw new Error('Released balloon must move');
      if (animation.effect.getTiming().iterations !== 1) throw new Error('Balloon must not loop');
      animation.finish();
    });
    assert.ok(await balloonY() < startY - 20, 'Balloon rises away from the child');
    await p.screenshot({ path: `tools/test/ending-design-release-${width}.png` });
    await p.click('#goBtn');
    assert.equal(await p.evaluate(() => window.__dbg.ending), 'jump');
    await shot('jump');
    await p.click('#goBtn'); await shot('hand');
    assert.equal(await p.locator('.ending-balloon-layer').count(), 0, 'No animated balloon remains over hand close-up');
    await p.click('#goBtn');
    assert.equal(await p.locator('#story-final .question').isHidden(), true);
    assert.equal(await p.evaluate(() => window.__dbg.audioState().silent), true);
    // A replay also honors reduced motion and starts with the balloon held again.
    await p.emulateMedia({ reducedMotion: 'reduce' });
    await p.evaluate(() => window.__dbg.showStage(9)); await p.click('#go2');
    assert.equal(await p.locator('#story-art.released').count(), 0);
    await p.click('#goBtn');
    assert.equal(await p.locator('.ending-balloon').evaluate(el => el.getAnimations().length), 0);
    await p.evaluate(() => window.__dbg.showStage(0));
    assert.equal(await p.locator('#story-art.cinematic').count(), 0);
    assert.deepEqual(errs, []);
    console.log(`✓ ending cuts, one-way balloon, controls, silence and reduced motion ${width}×${height}`);
  } finally { await b.close(); }
}
