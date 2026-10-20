# 動作確認スクリプト（ヘッドレス Chrome / Node.js のみ・Python 不要）

`dist/artifact.html` をテスト用に加工（`window.__dbg` のデバッグ用フックを足し、Supabase をモックに差し替え）して、`playwright-core`（システムの Chrome）と内蔵ローカル HTTP サーバー（`tools/test/lib.mjs`）で動かす。
ゲーム本体には入らない（`tools/` はビルド対象外）。

## 準備（初回のみ）
    npm install                              # devDependencies (playwright-core, three@0.149.0) を入れる（ブラウザのダウンロードはしない）
    git config core.hooksPath .githooks      # pre-push フックを有効化（clone しただけでは有効にならないため必ず実行）

## 使い方
    node tools/check.mjs                     # 推奨：ビルド → 構文・乱数チェック → game.html 生成 → smoke.mjs を一括実行
    node tools/check.mjs --full              # 上記に加えて thr.js / hbp.js / tac7.js も一括実行

### 個別に動かす場合
    node build.mjs                           # まず本体をビルド（dist/artifact.html ができる）
    node tools/test/make-test-page.mjs       # tools/test/game.html を作る（src を変えるたびにやり直す）
    node tools/test/smoke.mjs                # 起動スモーク＆全モード（メニュー・ストーリー全10話・CPU・練習・オンライン・整合・リセット漏れ）テスト
    node tools/test/thr.js                   # 送球先の選択（満塁・1塁・3塁など）
    node tools/test/hbp.js                   # デッドボール→乱闘→投手交代（スクショ bw-*.png）
    node tools/test/faces2.js                # 顔の表情の確認画像（f2-*.png）
    node tools/test/ingame.js                # 守備側の通常画面とホームラン（ig-*.png）
    node tools/test/ui.js                    # メニュー〜試合開始〜ホームラン〜守備のスクショ
    node tools/test/tac7.js                  # オンライン2タブの同期確認（SAME/DIFF）

スクショは実行したフォルダに出る。`__dbg` のフックは `tools/test/make-test-page.mjs` の先頭にある
（`hit(c)` で打球結果を強制、`pitch()` で1球投げる、`ff()` で投球・待機時間を即座に早送り、`gopit()` で守備側で開始、`face(team, expr)` で顔の確認 など）。
環境変数 `CHROME_PATH` で Chrome の実行ファイルパスを、`THREE_JS` で `three.min.js` の場所を変えられる。

`story.mjs` は smoke から実行される新ストーリーの回帰テストです。10話通し・探索の記録確認・救援の失点・延長引き分けからの再挑戦・ビーストモード・無音の終幕・旧セーブ分離・再読込・9種のモデルを確認します。画像は `/tmp/baseball-*.png` に出力します。実機の操作感とリアルタイムの外部オンライン対戦は別途確認が必要です。

実ポインター操作と配布用HTMLの確認：`node tools/build-preview.mjs` の後に `CHROME_PATH=/usr/bin/chromium node tools/test/presentation.mjs`。クラウドの管理ポリシーで file:// を開けないため、単一HTMLをHTTPで配信し他のHTTP通信を遮断して検証します。
