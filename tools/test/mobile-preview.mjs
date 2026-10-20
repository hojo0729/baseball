// Touch-capable Chromium profiles; the iPhone-sized profile does not emulate WebKit.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, devices } from 'playwright-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../dist/mobile-preview');
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const server = http.createServer((req, res) => {
  const relative = new URL(req.url, 'http://localhost').pathname;
  const file = path.resolve(root, '.' + (relative === '/' ? '/index.html' : relative));
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(file).pipe(res);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const url = `http://localhost:${server.address().port}/`;
const browser = await chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : { channel: 'chrome' }),
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
try {
  for (const [name, device] of [['Android', devices['Pixel 7']], ['iPhone-size', devices['iPhone 13']]]) {
    const context = await browser.newContext({ viewport: device.viewport, deviceScaleFactor: 1,
      userAgent: device.userAgent, isMobile: true, hasTouch: true });
    await context.addInitScript(() => {
      if (!localStorage.getItem('yakyu-bgm')) localStorage.setItem('yakyu-bgm', '1');
      if (!localStorage.getItem('animal-baseball-story-v2')) localStorage.setItem('animal-baseball-story-v2', JSON.stringify({ version: 2, completed: 9 }));
    });
    const p = await context.newPage(), errors = [];
    p.on('pageerror', e => errors.push(e.message));
    await p.goto(url); await p.locator('#goBtn').waitFor();
    const manifest = await p.evaluate(async () => (await fetch('manifest.webmanifest')).json());
    assert.equal(manifest.display, 'standalone'); assert.match(manifest.name, /確認版/);
    await p.evaluate(() => navigator.serviceWorker.ready);
    await p.waitForFunction(() => !!navigator.serviceWorker.controller);
    await p.locator('#goBtn').tap(); assert.match(await p.locator('#od').textContent(), /第1話/); await p.locator('#go3').tap();
    await p.locator('#go3').tap(); await p.waitForTimeout(150);
    await p.screenshot({ path: `/tmp/baseball-mobile-${name}.png` });
    await p.locator('#go4').tap(); await p.locator('#go4').tap();
    await p.locator('#go2').tap(); await p.locator('#go3').tap();
    await p.locator('#goBtn').tap(); await p.locator('#mPit').tap(); await p.locator('#goBtn').tap();
    await p.locator('#bgmBtn').tap();
    assert.equal(await p.evaluate(() => localStorage.getItem('yakyu-bgm')), '1');
    assert.equal(await p.evaluate(() => localStorage.getItem('mobile-preview-yakyu-bgm')), '0');
    await p.evaluate(() => { window.__touchTrace = []; document.querySelector('#cv').addEventListener('pointermove', e => window.__touchTrace.push([e.type, e.clientX, e.clientY, performance.now()])); for(const type of ['pointerdown','pointerup','pointercancel']) document.querySelector('#cv').addEventListener(type, e => window.__touchTrace.push([e.type, e.clientX, e.clientY, performance.now()])); });
    const box = await p.locator('#cv').boundingBox();
    const x = box.x + box.width * 0.5, y = box.y + box.height * 0.85;
    const swipeDistance = Math.min(320, box.height * 0.7);
    const cdp = await context.newCDPSession(p);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    await Promise.all([1,2,3,4].map(i => cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y - i * swipeDistance / 4 }] })));
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await p.waitForFunction(() => /km\/h/.test(document.querySelector('#spd').textContent), null, {timeout: 5000}).catch(async e => { console.log(await p.evaluate(() => ({trace:window.__touchTrace,hint:document.querySelector('#hint').textContent,mode:document.querySelector('#mPit').className}))); await p.screenshot({path:'/tmp/baseball-touch-failure.png'}); throw e; });
    await p.screenshot({ path: `/tmp/baseball-mobile-pitch-${name}.png` });
    await context.setOffline(true); await p.reload();
    await p.locator('#goBtn').tap(); await p.locator('#goBtn').tap();
    await p.waitForFunction(() => { const im = document.querySelector('#story-art img'); return im && im.complete && im.naturalWidth > 0 && im.src.startsWith('data:image/webp'); });
    await p.locator('#go2').tap(); await p.locator('#goBtn').tap();
    assert.equal(await p.locator('#overlay').isHidden(), true);
    assert.deepEqual(errors, []);
    console.log(`✓ ${name}: タップでメニュー・モデル確認、スワイプで投球、PWAキャッシュからオフライン再起動・ストーリー開始`);
    await context.close();
  }
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
