import assert from 'node:assert/strict';
import { openGame } from './lib.mjs';
import { playAwakeningOpening } from './story-opening.mjs';

const { b, p, errs, url } = await openGame();
try {
  await p.waitForFunction(() => window.__dbg);
  await p.evaluate(() => { window.__dbg.optOff(); localStorage.setItem('yakyu-bgm', '1'); });
  await p.click('#goBtn'); await p.click('#goBtn');
  async function theme(name, crowd = false) {
    await p.waitForFunction(([n, c]) => window.__dbg.bgm().music === n && window.__dbg.bgm().crowd === c, [name, crowd]);
    assert.equal(await p.evaluate(() => window.__dbg.bgm().crowd), crowd);
    const state = await p.evaluate(() => window.__dbg.musicState());
    assert.ok(state.duration > 25 && state.duration < 51);
    assert.equal(state.loop, true);
    assert.equal(state.channels, 2);
    assert.ok(state.rms > .08 && state.rms < .17, `${name}: decoded audio must have music energy`);
    assert.ok(state.peak < .95, `${name}: avoid clipping`);
  }
  await theme('storyHome');
  assert.equal(await p.evaluate(() => window.__dbg.bgm().loaded.includes('storyFinal')), false, 'Load chapter scores on demand');
  for (const idx of [2, 4, 6]) {
    await p.evaluate(i => window.__dbg.showStage(i), idx);
    await theme('storyMystery');
  }
  await p.evaluate(() => window.__dbg.showStage(5));
  await theme('storyInvasion');
  await p.click('#goBtn');
  await p.waitForFunction(() => !!document.querySelector('#story-movie'));
  await p.waitForTimeout(700);
  assert.ok(await p.evaluate(() => window.__dbg.musicState().output) < .06, 'Movie must duck background score');
  await p.click('#movie-skip');
  await p.evaluate(() => window.__dbg.showStage(7));
  await p.click('#go2'); await p.click('#goBtn');
  await theme('storyInvasion', true);
  await playAwakeningOpening(p);
  // Strain and roar build into the full awakening score.
  await p.click('#go2');
  await theme('storyAwakening');
  await p.click('#goBtn');
  await theme('storyAwakening', true);
  await p.evaluate(() => window.__dbg.showStage(8));
  await theme('storyFinal');
  await p.evaluate(() => window.__dbg.showStage(9));
  await theme('storyEpilogue');
  await p.click('#go2');
  assert.deepEqual(await p.evaluate(() => window.__dbg.audioState()), { silent: true, context: null, commentary: false });
  await p.evaluate(() => { window.__dbg.showStage(0); window.__dbg.gopit(); });
  await p.waitForFunction(() => window.__dbg.bgm().music === 'b');
  assert.equal(await p.evaluate(() => window.__dbg.bgm().crowd), true);
  await p.click('#bgmBtn');
  assert.equal(await p.evaluate(() => window.__dbg.bgm().music), null);
  await p.evaluate(() => window.__dbg.showStage(2));
  await p.waitForTimeout(300);
  assert.equal(await p.evaluate(() => window.__dbg.bgm().music), null, 'Music off persists across story chapters');
  if (process.argv.includes('--preview')) {
    // All six scores must decode from embedded bytes without an audio HTTP request.
    await p.route('**/*', route => new URL(route.request().url()).pathname === '/private-playtest.html'
      ? route.continue() : route.abort());
    await p.goto(new URL('/private-playtest.html', url).href);
    const decoded = await p.evaluate(async () => {
      const context = new OfflineAudioContext(2, 1, 22050), result = [];
      for (const name of ['home', 'mystery', 'invasion', 'awakening', 'final', 'epilogue']) {
        const bytes = await fetch('bgm/story_' + name + '.mp3').then(r => r.arrayBuffer());
        const buffer = await context.decodeAudioData(bytes);
        result.push({ name, channels: buffer.numberOfChannels, duration: buffer.duration });
      }
      return result;
    });
    assert.equal(decoded.length, 6);
    for (const track of decoded) { assert.equal(track.channels, 2); assert.ok(track.duration > 25); }
    console.log('✓ all six embedded MP3s decode with external asset requests blocked');
  }
  assert.deepEqual(errs, []);
  console.log('✓ six decoded stereo scores, lazy loading, chapter transitions, crowd, movie ducking, awakening, silent coda, practice reset and music off');
} finally { await b.close(); }
