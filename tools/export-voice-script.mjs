// 実況セリフの一覧を出す: node tools/export-voice-script.mjs  → voice-script.csv（id,セリフ,読み方の指示）
// 録音/AI音声は docs/audio/<id>.mp3 に置く。足りないファイルがあれば一覧の最後に出す。
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
const src = readFileSync(new URL('../src/js/08-commentary.js', import.meta.url), 'utf8');
const body = src.slice(src.indexOf('const LINES = {'), src.indexOf('};', src.indexOf('const LINES = {')) + 2);
const LINES = new Function(body + '; return LINES;')();
const mood = { hr: '大興奮で叫ぶ', hr2: '大興奮で叫ぶ', hr3: '大興奮で叫ぶ', hr4: '大興奮で叫ぶ', gou: '驚きと興奮', K: '力強く', KL: '力強く', dp: '力強く', hit: '短く鋭く', hitBig: '興奮', big: '盛り上げる', magic: '盛り上げる', play: '明るく開幕', ball: '落ち着いて', strike: '力強く短く' };
const rows = [['id', 'セリフ', '読み方']]; const missing = [];
for (const k in LINES) LINES[k].forEach((t, i) => {
  const id = `${k}_${i + 1}`; rows.push([id, t, mood[k] || '実況アナウンサー調で、テンポよく']);
  if (!existsSync(new URL(`../docs/audio/${id}.mp3`, import.meta.url))) missing.push(id);
});
writeFileSync('voice-script.csv', '﻿' + rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n') + '\n');
console.log(`${rows.length - 1} lines -> voice-script.csv`);
console.log(missing.length ? `missing audio: ${missing.length}` : 'all audio files present');
