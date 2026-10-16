// Build: inline src/style.css, src/body.html and src/js/*.js (in file-name order) into one page.
//   docs/index.html  -> standalone page served by GitHub Pages
//   dist/artifact.html -> body-only variant for previewing inside Claude (its viewer adds <html>/<head>)
// Usage: node build.mjs
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';

const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.149.0/build/three.min.js';
const SUPABASE_URL = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js';
const FONTS = 'https://fonts.googleapis.com/css2?family=Dela+Gothic+One&family=DM+Mono:wght@400;500&family=Zen+Kaku+Gothic+New:wght@500;700&display=swap';

const css = readFileSync('src/style.css', 'utf8');
const body = readFileSync('src/body.html', 'utf8');
const parts = readdirSync('src/js').filter(f => f.endsWith('.js')).sort();
// The files share one scope: they are concatenated inside a single IIFE, which 01-core.js opens and 09-main.js closes.
const js = parts.map(f => `/* ---- ${f} ---- */\n` + readFileSync('src/js/' + f, 'utf8')).join('\n');

const scripts = `<script src="${THREE_URL}"></script>\n<script src="${SUPABASE_URL}"></script>\n<script>\n${js}\n</script>\n`;

const standalone = `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
<meta name="theme-color" content="#0a1815">
<title>ナイター対決</title>
<link rel="stylesheet" href="${FONTS}">
<style>
html { padding-top: env(safe-area-inset-top, 0px); padding-bottom: env(safe-area-inset-bottom, 0px); box-sizing: border-box; }
[hidden] { display: none !important; }
${css}</style>
</head>
<body>
${body}${scripts}</body>
</html>
`;

const artifact = `<meta name="claude:viewport-fit-sides" content="cover">
<title>ナイター対決</title>
<link rel="stylesheet" href="${FONTS}">
<style>
${css}</style>
${body}${scripts}`;

mkdirSync('docs', { recursive: true });
mkdirSync('dist', { recursive: true });
writeFileSync('docs/index.html', standalone);
writeFileSync('dist/artifact.html', artifact);
console.log(`built ${parts.length} script parts -> docs/index.html (${standalone.length} chars), dist/artifact.html`);
