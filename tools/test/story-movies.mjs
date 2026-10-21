import assert from 'node:assert/strict';
import { openGame } from './lib.mjs';

for (const [width, height] of [[320, 568], [390, 844], [1280, 800]]) {
  const { b, p, errs } = await openGame({ width, height });
  try {
    await p.waitForFunction(() => window.__dbg);
    await p.evaluate(() => { window.__dbg.optOff(); window.__dbg.showStage(5); });
    await p.locator('#goBtn').click();
    const video = p.locator('#story-movie video');
    await p.waitForFunction(() => {
      const v = document.querySelector('#story-movie video'); return v && v.readyState >= 2 && v.currentTime > .1;
    });
    assert.equal(await video.evaluate(v => v.playsInline && v.controls && !v.loop), true);
    assert.equal(await video.evaluate(v => v.videoWidth), 960);
    assert.equal(await video.evaluate(v => Math.abs(v.duration - 10) < .2), true);
    await p.screenshot({ path: `tools/test/story-movie-arrival-${width}.png` });
    const layout = await p.locator('#movie-skip').evaluate(n => {
      const r = n.getBoundingClientRect(), p = document.querySelector('#story-movie').getBoundingClientRect();
      return r.bottom <= p.bottom && r.left >= p.left && r.right <= p.right;
    });
    assert.equal(layout, true, 'Movie skip remains within phone viewport');
    await p.locator('#story-movie button[aria-pressed]').click();
    assert.equal(await video.evaluate(v => v.muted), true);
    await p.locator('#movie-skip').click();
    assert.equal(await p.locator('#story-movie').count(), 0);
    assert.match(await p.locator('#od').textContent(), /雲じゃない/);
    assert.equal(await p.locator('#overlay').evaluate(n => n.inert), false);

    // Complete real playback and verify the ended event advances exactly one line.
    await p.evaluate(() => window.__dbg.showStage(5)); await p.locator('#goBtn').click();
    await p.waitForFunction(() => {
      const v = document.querySelector('#story-movie video'); return v && v.readyState >= 2 && !v.paused;
    });
    await video.evaluate(v => { v.playbackRate = 4; });
    await p.waitForFunction(() => !document.querySelector('#story-movie'));
    assert.match(await p.locator('#od').textContent(), /雲じゃない/);

    // Follow the real first plate appearance into awakening; no forced debug event.
    await p.evaluate(() => window.__dbg.showStage(7));
    await p.locator('#go2').click(); await p.locator('#goBtn').click();
    await p.evaluate(() => {
      const d = window.__dbg; d.ff(); d.hit({ kind: 'play', q: .5, dir: 0, ev: 110, launch: 32, dist: 65, res: 'フライアウト', bases: 0 }); d.ff();
    });
    for (let n = 0; n < 3; n++) await p.locator('#goBtn').click();
    assert.equal(await p.locator('#goBtn').textContent(), '映像を見る');
    await p.locator('#goBtn').click();
    await p.waitForFunction(() => { const v = document.querySelector('#story-movie video'); return v && v.readyState >= 2 && !v.paused; });
    assert.equal(await video.evaluate(v => v.duration > 6.5 && v.duration < 7), true);
    await p.screenshot({ path: `tools/test/story-movie-awakening-${width}.png` });
    await video.evaluate(v => { v.playbackRate = 4; });
    await p.waitForFunction(() => !document.querySelector('#story-movie'));
    assert.match(await p.locator('#od').textContent(), /怖いよ/);
    assert.equal(await p.locator('#story-art').getAttribute('data-art'), 'story/awakening-roar.webp');
    await p.locator('#goBtn').click();
    assert.equal(await p.locator('#story-art').getAttribute('data-art'), 'story/beast.webp');
    for (let n = 0; n < 3; n++) await p.locator('#goBtn').click();
    assert.equal(await p.locator('#ot').textContent(), 'ぼくが選ぶ');
    await p.locator('#goBtn').click();
    assert.equal(await p.evaluate(() => window.__dbg.beastActive() && !window.__dbg.G.over), true);
    assert.equal(await p.evaluate(() => window.__dbg.clock().pausedAt), 0, 'Movie pause must not delay the resumed game');
    await p.waitForFunction(() => window.__dbg.phase === 'fly' || window.__dbg.G.b + window.__dbg.G.s > 0, null, { timeout: 8000 });

    // Sound-off setting is honored, and changing chapters cancels the old callback.
    await p.evaluate(() => { localStorage.setItem('yakyu-bgm', '0'); window.__dbg.showStage(5); });
    await p.locator('#goBtn').click();
    assert.equal(await video.evaluate(v => v.muted), true);
    await p.evaluate(() => window.__dbg.showStage(0));
    assert.equal(await p.locator('#story-movie').count(), 0);
    assert.equal(await p.locator('#story-art').getAttribute('data-art'), 'story/everyday.webp');
    assert.equal(await p.locator('#overlay').evaluate(n => n.inert), false);
    assert.deepEqual(errs, []);
    console.log(`✓ MP4 playback/end/skip, awakening handoff, sound preference and cleanup ${width}×${height}`);
  } finally { await b.close(); }
}

const { b, p } = await openGame();
try {
  await p.waitForFunction(() => window.__dbg);
  // No request failure is surfaced as a dead end: continue with the illustrations.
  await p.route('**/video/arrival.mp4', route => route.abort());
  await p.evaluate(() => window.__dbg.showStage(5)); await p.locator('#goBtn').click();
  await p.waitForFunction(() => !document.querySelector('#story-movie'));
  assert.match(await p.locator('#od').textContent(), /雲じゃない/);
  assert.equal(await p.locator('#overlay').evaluate(n => n.inert), false);
  console.log('✓ Failed movie load falls back to illustrated story');
} finally { await b.close(); }
