# AGENTS.md
このプロジェクトの構成と約束ごとは `CLAUDE.md`、引き継ぎ情報は `HANDOFF.md`、動作確認は `tools/test/README.md` にある。作業を始める前に3つとも読むこと。
最小限の約束：`src/` を変えたら `node build.mjs` して `docs/` ごとコミット／オンライン結果処理の乱数は `withSeed()` 内／見た目と音に `Math.random` を使わない。
共同開発のルールは `HANDOFF.md` の 11 章。始める前に `git pull`。初回（clone 後）は `git config core.hooksPath .githooks` を必ず実行して pre-push フックを有効にする（clone しただけでは有効にならない）。コミット・push 前に `node tools/check.mjs`（詳細テスト込みは `node tools/check.mjs --full`）を通すこと。
現在の運用はゆるい（HANDOFF.md「運用フェーズ」）：check が通れば main へ直接 push してよい。push 後に変更内容と未確認事項を Take へ報告する。ストア公開前に締める。
不具合・障害が起きたときは、直す前に `HANDOFF.md` の 12 章（障害対応）の手順で切り分ける。壊した変更は `git revert` で戻し、force push はしない。最後に動作確認できた版はブランチ `stable`。
