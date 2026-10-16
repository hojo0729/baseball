// 実況セリフ → ElevenLabs 用のタグ付きプロンプト（id<TAB>prompt）を出す。node tools/voice-prompts.mjs
import { readFileSync } from 'node:fs';
const src = readFileSync(new URL('../src/js/08-commentary.js', import.meta.url), 'utf8');
const body = src.slice(src.indexOf('const LINES = {'), src.indexOf('};', src.indexOf('const LINES = {')) + 2);
const LINES = new Function(body + '; return LINES;')();
const TAG = { play: '[excited]', first: '[confident]', pitch: '[confident]', gou: '[excited] [shouting]', chg: '[surprised]',
  strike: '[shouting]', ball: '[calm]', miss: '[excited]', K: '[shouting]', KL: '[excited]', walk: '[calm]', foul: '[excited]',
  hit: '[excited]', hitBig: '[excited] [shouting]', single: '[excited]', double: '[excited] [shouting]',
  hr: '[shouting] [excited]', hr2: '[shouting] [excited]', hr3: '[shouting] [excited]', hr4: '[shouting] [excited]',
  gout: '[calm]', fout: '[calm]', dp: '[excited]', err: '[surprised]', steal: '[excited]', stealX: '[shouting]', pick: '[shouting]',
  bunt: '[calm]', squeeze: '[excited]', sac: '[excited]', change: '[calm]', relief: '[calm]', big: '[excited]', magic: '[excited]' };
for (const k in LINES) LINES[k].forEach((t, i) => console.log(`${k}_${i + 1}\t${TAG[k] || '[calm]'} ${t}`));
