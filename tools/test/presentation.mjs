// Real pointer clicks deliberately bypass lib.mjs's JS-click convenience wrapper.
import assert from 'node:assert/strict';
import { launchBrowser, attachErrors } from './lib.mjs';

const { b, url } = await launchBrowser();
try {
  for (const [width, height] of [[320, 568], [390, 844], [1280, 800]]) {
    const p = await b.newPage({ viewport: { width, height } });
    const errs = attachErrors(p);
    await p.goto(url); await p.waitForFunction(() => window.__dbg);
    await p.evaluate(() => window.__dbg.optOff());
    await p.locator('#goBtn').click(); await p.locator('#go3').click();
    await p.locator('#go3').click(); // turn the model
    await p.waitForTimeout(80);
    const overlap = await p.evaluate(() => document.querySelector('#ot').getBoundingClientRect().bottom > document.querySelector('#obtns').getBoundingClientRect().top);
    assert.equal(overlap, false, 'Gallery title must not overlap controls');
    if (width === 390) await p.screenshot({ path: '/tmp/baseball-gallery-pointer.png' });
    await p.locator('#go4').click();
    await p.evaluate(() => window.__dbg.showStage(2)); await p.locator('#go2').click();
    for (const id of ['#goBtn', '#go2', '#go3']) { await p.locator(id).click(); await p.locator('#goBtn').click(); }
    await p.locator('#go4').click();
    if (width === 320) await p.screenshot({ path: '/tmp/baseball-small-story.png' });
    await p.evaluate(() => window.__dbg.showStage(8)); await p.locator('#go2').click();
    await p.locator('#goBtn').click();
    assert.match(await p.locator('#goal').textContent(), /3回戦・延長5回/);
    await p.waitForTimeout(250);
    if (width === 390) await p.screenshot({ path: '/tmp/baseball-game-pointer.png' });
    await p.evaluate(() => window.__dbg.showStage(9)); await p.locator('#go2').click();
    await p.locator('#goBtn').click(); await p.locator('#goBtn').click();
    await p.waitForTimeout(40);
    assert.equal(await p.locator('.board').isVisible(), false, 'Cinematic must hide game HUD');
    assert.equal(await p.locator('#bgmBtn').isVisible(), false, 'Cinematic must hide sound controls');
    if (width === 390) await p.screenshot({ path: '/tmp/baseball-ending-pointer.png' });
    assert.deepEqual(errs, []);
    await p.close();
    console.log(`✓ 実ポインター操作・探索・章開始・終幕の画面 (${width}×${height})`);
  }
  // Cloud Chromium blocks file:// by administrator policy. Serve exactly one HTML
  // and reject every other HTTP request to verify embedded assets without bypassing that policy.
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  await p.unroute('**/*');
  const errs = attachErrors(p), external = [];
  const previewURL = new URL('/private-playtest.html', url).href;
  await p.route(/^https?:\/\//, route => { if (route.request().url() === previewURL) return route.continue(); external.push(route.request().url()); return route.abort(); });
  await p.goto(previewURL);
  await p.locator('#goBtn').click(); await p.locator('#goBtn').click();
  await p.waitForFunction(() => { const im = document.querySelector('#story-art img'); return im && im.complete && im.naturalWidth > 0 && im.src.startsWith('data:image/webp'); });
  await p.locator('#go2').click(); await p.locator('#goBtn').click();
  await p.waitForTimeout(400);
  assert.equal(await p.evaluate(() => typeof window.__dbg), 'undefined');
  assert.equal(await p.evaluate(() => !!window.THREE && document.querySelector('canvas').width > 0), true);
  assert.equal(await p.locator('#overlay').isHidden(), true);
  assert.deepEqual(errs, []); assert.deepEqual(external, []);
  await p.screenshot({ path: '/tmp/baseball-offline-playtest.png' });
  await p.close();
  console.log('✓ 単一HTMLの外部通信なし起動・音声読込・試合開始（HTTPで検証・デバッグフックなし）');
} finally { await b.close(); }
