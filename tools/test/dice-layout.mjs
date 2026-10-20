import assert from 'node:assert/strict';
import { openGame } from './lib.mjs';

for (const [width, height] of [[320, 568], [390, 844], [1280, 800]]) {
  const { b, p, errs } = await openGame({ width, height });
  try {
    await p.waitForFunction(() => window.__dbg);
    await p.evaluate(() => { window.__dbg.optOff(); window.__dbg.gopit(); window.__dbg.dice(6); });
    await p.waitForFunction(() => document.querySelector('.dice-result b')?.textContent === '出た目 6！');
    await p.evaluate(() => { document.querySelector('.dice-result span').textContent = '満塁＋次の打者 大幅パワーアップ！！！大当たり'; });
    const layout = await p.evaluate(() => {
      const rect = s => { const r = document.querySelector(s).getBoundingClientRect(); return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, height: r.height }; };
      return { stage: rect('#stage'), panel: rect('.dice-panel'), cube: rect('.dice-wrap'), text: rect('.dice-result'), menu: rect('#menuBtn'), viewport: innerHeight };
    });
    assert.ok(layout.panel.top >= layout.stage.bottom, 'Dice must be outside the playing field');
    assert.ok(layout.cube.right <= layout.text.left, 'Dice and result must not overlap');
    assert.ok(layout.menu.bottom <= layout.viewport, 'Controls must remain on screen');
    assert.ok(layout.stage.height > 100, 'Playing field must remain usable');
    await p.screenshot({ path: `tools/test/dice-${width}.png` });
    await p.waitForFunction(() => !document.querySelector('.dice-panel').classList.contains('on'));
    assert.deepEqual(errs, []);
    console.log(`✓ dice layout ${width}×${height}`);
  } finally { await b.close(); }
}
