# 動作確認スクリプト（ヘッドレスChromium）

`dist/artifact.html` をテスト用に加工（`window.__dbg` のデバッグ用フックを足し、Supabase をモックに差し替え）して、Playwright で動かす。
ゲーム本体には入らない（`tools/` はビルド対象外）。

## 準備（初回のみ）
    npm i three@0.149.0 playwright   # three は game.html が読む。playwright のブラウザは入れ済みの Chromium を使う
    # PLAYWRIGHT_BROWSERS_PATH が未設定なら: npx playwright install chromium

## 使い方
    node build.mjs                          # まず本体をビルド（dist/artifact.html ができる）
    python3 tools/test/make-test-page.py    # tools/test/game.html を作る（src を変えるたびにやり直す）
    node tools/test/thr.js                  # 送球先の選択（満塁・1塁・3塁など）
    node tools/test/hbp.js                  # デッドボール→乱闘→投手交代（スクショ bw-*.png）
    node tools/test/faces2.js               # 顔の表情の確認画像（f2-*.png）
    node tools/test/ingame.js               # 守備側の通常画面とホームラン（ig-*.png）
    node tools/test/ui.js                   # メニュー〜試合開始〜ホームラン〜守備のスクショ
    node tools/test/tac7.js                 # オンライン2タブの同期確認（SAME/DIFF。サイコロの乱数で時々ぶれる）

スクショは実行したフォルダに出る。`__dbg` のフックは `make-test-page.py` の先頭にある
（`hit(c)` で打球結果を強制、`pitch()` で1球投げる、`gopit()` で守備側で開始、`face(team, expr)` で顔の確認 など）。
THREE_JS 環境変数で three.min.js の場所を変えられる。
