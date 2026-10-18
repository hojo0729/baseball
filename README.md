# どうぶつリーグ

スマホのブラウザで遊べる、どうぶつたちの3D野球アクション。

- **ストーリー**：柴犬チーム「しばいぬズ」で、どうぶつリーグ優勝を目指す（全5話）
- **フリー対戦**：CPU相手に打つ・投げる
- **オンライン対戦**：部屋番号で友達と1対1（3回表裏）

## 遊び方

- 打つ：ボールがミットに届く直前に、ボールが通る位置をタップ
- 投げる：指を弾く向きで球種、指を離した位置でコース、弾く速さで球速
- 作戦：投球前に画面下のボタンから盗塁・エンドラン・バント・スクイズ

## 開発

```
npm install                               # 初回のみ（開発・テスト用の依存を入れる）
git config core.hooksPath .githooks       # 初回のみ（pre-push フックを有効化。clone しただけでは有効にならない）
node build.mjs                            # src/ から docs/index.html と dist/artifact.html を作る
node tools/check.mjs                      # ビルド・構文・乱数検査＋起動スモーク＆全モード自動テスト
node tools/check.mjs --full               # 上記に加えて thr / hbp / tac7 の詳細テストも実行
```

> **注意**：`.githooks/pre-push`（`git push` 前に自動で `node tools/check.mjs` を走らせて失敗時に push を止める仕組み）は、`git clone` しただけでは有効になりません。クローン後に必ず `git config core.hooksPath .githooks` を1回実行してください。

公開は GitHub Pages（main ブランチの `/docs`）。構成と約束ごとは `CLAUDE.md` を参照。

## 実況の音声ファイル

実況は、`docs/audio/<id>.mp3` があればそのファイルを再生する（無いセリフは字幕だけ）。ファイルを足したら `node build.mjs` で一覧が更新される。
セリフの一覧は `node tools/export-voice-script.mjs` で `voice-script.csv`（id・セリフ・読み方）に出る。
AI音声などで作ったファイルを id の名前（例 `hr_1.mp3`）で `docs/audio/` に置いてコミットすればよい。

## スマホにアプリとして入れる

https://saboten-apps.github.io/baseball/ をスマホのブラウザで開き、Chrome なら メニュー → 「アプリをインストール」（または「ホーム画面に追加」）。iPhone の Safari は 共有 → 「ホーム画面に追加」。全画面で開き、一度開いたあとは電波が弱くても起動する（オンライン対戦は通信が必要）。

## クレジット

- 投球・打撃フォームは CMU Graphics Lab Motion Capture Database のデータをもとにしています。The data used in this project was obtained from mocap.cs.cmu.edu. The database was created with funding from NSF EIA-0196217.
- 効果音の一部は「効果音ラボ」（https://soundeffect-lab.info/）の素材です。
- 実況の声は Gemini TTS、曲は Lyria で生成しています。
