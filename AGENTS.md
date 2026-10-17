# AGENTS.md
このプロジェクトの構成と約束ごとは `CLAUDE.md`、引き継ぎ情報は `HANDOFF.md`、動作確認は `tools/test/README.md` にある。作業を始める前に3つとも読むこと。
最小限の約束：`src/` を変えたら `node build.mjs` して `docs/` ごとコミット／オンライン結果処理の乱数は `withSeed()` 内／見た目と音に `Math.random` を使わない。
共同開発のルールは `HANDOFF.md` の 11 章。コミット前に `bash tools/check.sh`、始める前に `git pull`。
