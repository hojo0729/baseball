#!/usr/bin/env bash
# 作業の締めに実行する確認：ビルドして docs/ が最新か、旧ユーザー名が混ざっていないかを見る。
# 使い方: bash tools/check.sh   （コミット前に実行。✗ が出たら直してから）
set -u
cd "$(dirname "$0")/.."
ok=1
node build.mjs >/dev/null 2>&1 || { echo "✗ node build.mjs が失敗"; exit 1; }
echo "✓ ビルド成功"
if [ -n "$(git status --porcelain docs)" ]; then echo "! docs/ に未コミットの変更あり（src を変えたなら正常。一緒にコミットすること）"; fi
for f in docs/index.html; do node -e "
const s=require('fs').readFileSync('$f','utf8');
const m=s.match(/<script>([\s\S]*)<\/script>/g)||[];
let bad=0;m.forEach(t=>{try{new Function(t.replace(/<\/?script>/g,''))}catch(e){bad=1;console.log('✗ 構文エラー:',e.message)}});
process.exit(bad)" || ok=0; done
[ $ok = 1 ] && echo "✓ docs/index.html の構文OK"
if git grep -qi "hojo0729" -- . ':!tools/check.sh'; then echo "✗ 旧ユーザー名が残っている"; ok=0; else echo "✓ 旧ユーザー名なし"; fi
if git grep -n "Math.random" -- src/js/08-commentary.js | grep -v "使うと\|/\*\|^[0-9]*: *//" | grep -q .; then echo "! 08-commentary.js に Math.random（実況は専用乱数を使う）"; fi
[ $ok = 1 ] && echo "完了。あとは tools/test/README.md のテスト（thr.js / hbp.js、オンラインなら tac7.js）を必要に応じて" || exit 1
