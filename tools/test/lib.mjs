import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

export const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(HERE, '../..');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav'
};

export function startServer() {
  return new Promise(resolve => {
    const srv = http.createServer((req, res) => {
      const u = new URL(req.url, 'http://localhost');
      let file;
      if (u.pathname === '/' || u.pathname === '/game.html') {
        file = path.join(HERE, 'game.html');
      } else if (u.pathname === '/node_modules/three/build/three.min.js') {
        file = process.env.THREE_JS || path.join(ROOT, 'node_modules/three/build/three.min.js');
      } else if (u.pathname.startsWith('/node_modules/')) {
        file = path.join(ROOT, u.pathname);
      } else if (u.pathname === '/favicon.ico') {
        file = path.join(ROOT, 'docs/icons/favicon.png');
      } else {
        file = path.join(ROOT, 'docs', u.pathname);
      }
      if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
      const ext = path.extname(file).toLowerCase();
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      fs.createReadStream(file).pipe(res);
    });
    srv.listen(0, '127.0.0.1', () => {
      const port = srv.address().port;
      resolve({ srv, port, url: `http://localhost:${port}/game.html` });
    });
  });
}

export function attachErrors(page, errs = [], prefix = '') {
  page.on('pageerror', e => errs.push(prefix + e.message));
  page.on('console', msg => {
    if (msg.type() === 'error') errs.push(prefix + 'console.error: ' + msg.text());
  });
  return errs;
}

export async function launchBrowser() {
  const { srv, port, url } = await startServer();
  const launchOpts = {
    args: [
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
      '--ignore-gpu-blocklist',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding'
    ],
    ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : { channel: 'chrome' })
  };
  const b = await chromium.launch(launchOpts);
  // 外部への通信（フォント・CDN）はスタブで返す：オフライン・制限のある環境でも、同じ結果になるように
  const stubExternal = page => page.route('**/*', r => {
    const u = r.request().url();
    if (/^(http:\/\/(localhost|127\.0\.0\.1)[:/]|data:|blob:)/.test(u)) return r.continue();
    return r.fulfill({ status: 200, contentType: /css/.test(u) ? 'text/css' : 'application/javascript', body: '' });
  });
  const patchPage = async page => {
    await stubExternal(page);
    page.click = async sel => {
      const done = await page.evaluate(s => {
        const el = document.querySelector(s);
        if (el && !el.hidden && el.offsetParent !== null) { el.click(); return true; }
        return false;
      }, sel);
      if (done) return;
      await page.waitForFunction(s => {
        const el = document.querySelector(s);
        return el && !el.hidden && el.offsetParent !== null;
      }, sel, { polling: 50, timeout: 10000 });
      await page.evaluate(s => document.querySelector(s).click(), sel);
    };
    page.fill = async (sel, val) => {
      await page.waitForFunction(s => !!document.querySelector(s), sel, { polling: 50, timeout: 10000 });
      await page.evaluate(([s, v]) => {
        const el = document.querySelector(s);
        el.value = v;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }, [sel, val]);
    };
    return page;
  };
  const origNewPage = b.newPage.bind(b);
  b.newPage = async (...args) => await patchPage(await origNewPage(...args));
  const origNewContext = b.newContext.bind(b);
  b.newContext = async (...args) => {
    const ctx = await origNewContext(...args);
    const ctxNewPage = ctx.newPage.bind(ctx);
    ctx.newPage = async (...pArgs) => await patchPage(await ctxNewPage(...pArgs));
    return ctx;
  };
  const origClose = b.close.bind(b);
  b.close = async () => {
    try { await origClose(); } finally { srv.close(); }
  };
  return { b, srv, port, url };
}

export async function openGame({ width = 390, height = 844 } = {}) {
  const { b, srv, port, url } = await launchBrowser();
  const p = await b.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  const errs = attachErrors(p);
  await p.goto(url);
  return { b, p, errs, url, srv, port };
}
