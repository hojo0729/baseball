# どうぶつリーグ (yakyu)　※旧名「ナイター対決」

スマホのブラウザで遊ぶ3D野球アクション。Three.js (r149, CDN) を使い、ビルド後は1枚のHTMLになる。

## 構成

- `src/style.css` — 画面のスタイル
- `src/body.html` — スコアボード、キャンバス、オーバーレイ、フッターのマークアップ
- `src/js/*.js` — ゲーム本体。**ファイル名順に連結して、1つのIIFEの中で同じスコープを共有する**
  （`01-core.js` が `(() => {` を開き、`09-main.js` が `})();` で閉じる。ES modules ではない）
  - `01-core.js` 定数、効果音、球種、試合状態、カウント/走塁ルール、当たり判定、投球、結果処理
  - `02-stadium.js` レンダラー、カメラ、球場、照明、ボール、マーカー
  - `03-motion.js` 投球フォームのモーションキャプチャ（CMU mocap 124_01。`tools/bvh-joints.py` → `tools/make-motion.py` で生成。手で編集しない）
  - `03-motion-bat.js` 打者の体の動き（CMU mocap 124_07 スイング・124_08 バント。`tools/make-bat-motion.py` で生成）。手とバットはスイング計画のまま
  - `03-players.js` 動物の選手モデル、ポーズ（打者・投手・野手）、バット
  - `04-story.js` ストーリーモード（全5話。第5話だけ `story.inn` の5回戦で、相手 `human`（ヒューマンズ）はストーリー専用のチーム。自軍の打順は `ALL_STAR_BAT`）、メニューと会話オーバーレイ
  - `05-tactics.js` 作戦（盗塁・エンドラン・バント・スクイズ）、牽制
  - `06-online.js` オンライン対戦（Supabase Realtime）
  - `07-roster.js` 各チームの打順・投手陣（ミート/パワー、球速/制球/変化/スタミナ、左右・両打ち、★スター、投手の持ち球 pt、走力 run・捕手の肩 arm・守護神 closer・代打の切り札 ph）、疲労、継投。G.bases は空=0、走者がいれば その走者の走力(1-5)。サイコロ（奇数の回）・ハプニング（回の頭に30%：風・雨・ウェーブ・照明トラブル。オンラインは共有シードで同じものが起きる）・技（会心・消える魔球）は 01-core。どうぶつ固有スキルは `TRAIT`（チーム単位の常時効果。ストーリーでは無効。`trT('bat'|'fld')` で参照）。ギミックのオン・オフは `OPT`（localStorage 'yakyu-opts'）を `opt(k)` で読む。オンラインはホストの設定を start メッセージで共有。盗塁（CPUが投げるとき）は `stealPress` で投手モーションの k からスタートの良し悪しを決め、早すぎると牽制。ゴロでランナーがいるとき（CPU対戦・守備側のみ、オンラインは対象外）は `thrWanted`→`thrStart` でスローになり、`pickThrow`/`thrResolve`（05-tactics 末尾）で送球先を選ぶ（`play.pend` の間は nextAt=Infinity。時間切れは `stepThrowPick`）。デッドボール：見逃した球が打者の体の位置（`hbpCheck`）に来ると `c.hbp`（オンラインは結果メッセージに載る）。同じ投手が2個目で乱闘（`brawl`、投手は `G.eject`→`applyEject` で退場・交代。ストーリーは退場なし）。打者のタイムは `timeOut`（オンラインは1試合3回、'time' メッセージ）。左投手・左打者は右用の動きを x 反転して描く
  - `08-commentary.js` 実況（画面下のテロップ + 録音音声 docs/audio。セリフ表は LINES）。乱数は専用生成器を使うこと（withSeed中に呼ばれてもずれない）
  - `09-main.js` 打球、毎フレーム更新、カメラ、入力、起動
- `docs/sfx/*.bin` — 効果音ラボの打球音・ミット音・スライディング音（`tools/make-sfx.py` が mp3 を XOR で固定化して作る。元の mp3 はコミットしない。サイトの規約: 商用可・クレジット不要・AI学習利用禁止・素材ファイルの再配布禁止）。`01-core.js` の `sfxLoad`/`playRec` で再生。音まわりに Math.random は使わず `sfxRnd` を使う
- `build.mjs` — `node build.mjs` で `docs/index.html`（GitHub Pages 公開用）と `dist/artifact.html`（Claude内プレビュー用）を作る
- `docs/` — GitHub Pages の公開フォルダ（ビルド結果をコミットする）。アプリ化（PWA）用の `manifest.webmanifest` と `sw.js` もビルドで作られる。`docs/icons/` のアイコンは `python3 tools/make-icons.py` で作る。`docs/audio/<id>.mp3` を置いてビルドすると、実況の声として自動で使われる（スマホの機械音声は使わない）

## 動作確認

- `tools/test/` にヘッドレスChromiumの確認スクリプトがある（手順は `tools/test/README.md`）。ロジックを変えたら `thr.js`・`hbp.js`、オンラインに関わるなら `tac7.js`（SAME/DIFF）を回す

## 約束ごと

- `src/` を編集したら必ず `node build.mjs` を実行して `docs/index.html` も更新してからコミットする
- 新しいファイルは連結順を意識して番号を付ける。トップレベルで他ファイルの `const` を使うと読み込み順の問題が出るので、関数の中で参照する
- ワールド座標はメートル。本塁前端が z=0、投手方向が -z、カメラ側が +z
- スマホ（特に Pixel 10 Pro）で描画が落ちたことがあるので、重い処理（影、大きなテクスチャ、メッシュ数）を増やすときは注意する
- オンライン対戦の判定は打者側の端末が行い、結果と乱数シードを相手に送る。結果処理の乱数は `withSeed()` の中で引くこと（両端末で同じ結果になる）
