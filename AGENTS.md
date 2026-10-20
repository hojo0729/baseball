# AGENTS.md
このプロジェクトの構成と約束ごとは `CLAUDE.md`、引き継ぎ情報は `HANDOFF.md`、動作確認は `tools/test/README.md` にある。作業を始める前に3つとも読むこと。
最小限の約束：`src/` を変えたら `node build.mjs` して `docs/` ごとコミット／オンライン結果処理の乱数は `withSeed()` 内／見た目と音に `Math.random` を使わない。
共同開発のルールは `HANDOFF.md` の 11 章。作業前にブランチと差分を確認し、必要なら `git fetch` で参照情報を更新する。初回（clone 後）は `git config core.hooksPath .githooks` を必ず実行して pre-push フックを有効にする（clone しただけでは有効にならない）。コミット・push 前に `node tools/check.mjs`（詳細テスト込みは `node tools/check.mjs --full`）を通すこと。
現在は既存ユーザーがいる。本作の変更は作業ブランチに限定する。Take のプレイ確認後の明示的な指示まで、main の変更・push・merge・本番公開は行わない。新ストーリーは旧5話を置き換える全10話で、提供HTMLのマスコット造形を使う。
不具合・障害が起きたときは、直す前に `HANDOFF.md` の 12 章（障害対応）の手順で切り分ける。壊した変更は `git revert` で戻し、force push はしない。最後に動作確認できた版はブランチ `stable`。
