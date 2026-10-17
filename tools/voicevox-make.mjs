// ※ このファイルは実況セリフ（src/js/08-commentary.js の LINES）を埋め込んで作ったもの。セリフを変えたら作り直す。
// どうぶつリーグ：VOICEVOX で実況の声をまとめて作るスクリプト（Node.js 18 以上）
// 1) VOICEVOX を起動しておく  2) このファイルを置いたフォルダで実行
//   声の聞き比べ:  node voicevox-make.mjs sample
//   全部作る:      node voicevox-make.mjs all 番号   （番号は sample で選んだ声。例: node voicevox-make.mjs all 70）
// できた voicevox-out フォルダを zip にして Claude に送ってください。
import { mkdirSync, writeFileSync } from 'node:fs';
const ENGINE = 'http://127.0.0.1:50021';
const LINES = [["play_1", "プレイボール！"], ["play_2", "さあ、試合開始です！"], ["play_3", "ナイターの幕が上がりました！"], ["first_1", "ピッチャー、振りかぶって…第一球、投げた！"], ["first_2", "バッターを迎えます。投げた！"], ["first_3", "サインにうなずいて…投げました！"], ["pitch_1", "投げた！"], ["pitch_2", "さあ、どうだ！"], ["pitch_3", "バッター、見ています！"], ["gou_1", "出た！剛速球！"], ["gou_2", "うなりをあげるストレート！"], ["gou_3", "速い！これは速い！"], ["chg_1", "ゆるい球！タイミングを外した！"], ["chg_2", "ふわっと来た！"], ["strike_1", "ストライク！"], ["strike_2", "見逃しストライク！"], ["strike_3", "いいコース！"], ["strike_4", "ズバッと決まった！"], ["ball_1", "ボール。"], ["ball_2", "ボール！見極めました。"], ["ball_3", "わずかに外れました。"], ["miss_1", "空振り！"], ["miss_2", "バットが空を切る！"], ["miss_3", "振った！当たらない！"], ["K_1", "三振！バットが止まりません！"], ["K_2", "空振り三振！気持ちよく仕留めた！"], ["K_3", "三振！見事なピッチング！"], ["KL_1", "見逃し三振！手が出ません！"], ["KL_2", "見逃し三振！際どいところに決まった！"], ["walk_1", "フォアボール。粘って出塁です。"], ["walk_2", "四球。制球が乱れました。"], ["foul_1", "ファウル！"], ["foul_2", "打った、ファウル！"], ["foul_3", "ファウルボール！粘ります！"], ["hit_1", "打った！"], ["hit_2", "カキーン！"], ["hit_3", "捉えた！"], ["hitBig_1", "完璧な当たり！"], ["hitBig_2", "いい打球だ！ぐんぐん伸びる！"], ["hitBig_3", "これは大きい！"], ["single_1", "ヒット！きれいに運びました！"], ["single_2", "ヒットです！"], ["single_3", "外野の間を抜けた！"], ["double_1", "ツーベース！ぐんぐん伸びてフェンス際！"], ["double_2", "長打！二塁へ到達！"], ["hr_1", "入った！ホームラン！"], ["hr_2", "ホームラン！豪快な一発！"], ["hr_3", "行ったー！特大のホームランです！"], ["hr2_1", "入ったー！2ランホームラン！"], ["hr3_1", "入ったー！3ランホームラン！"], ["hr4_1", "満塁ホームラン！グランドスラム！"], ["gout_1", "ゴロです。一塁へ送ってアウト。"], ["gout_2", "内野ゴロ、アウト。"], ["gout_3", "しっかり処理しました。"], ["fout_1", "フライ！捕りました、アウト。"], ["fout_2", "打ち上げた！野手が捕って、アウト。"], ["fout_3", "ライナー！捕られました！"], ["dp_1", "ゲッツー！助かりました！"], ["dp_2", "二つ取った！ダブルプレー！"], ["dp_3", "ゲッツー！ピンチを切り抜けた！"], ["err_1", "エラー！ボールがこぼれた！"], ["err_2", "ああっと、エラーです！"], ["steal_1", "スタートを切った！盗塁成功！"], ["steal_2", "盗塁セーフ！いい走りです！"], ["stealX_1", "盗塁失敗！タッチアウト！"], ["stealX_2", "刺した！ナイスなスローイング！"], ["pick_1", "牽制アウト！"], ["pick_2", "走者、戻れない！"], ["bunt_1", "バント成功。しっかり送りました。"], ["bunt_2", "送りバント。手堅く決めた！"], ["squeeze_1", "スクイズ成功！1点をもぎ取った！"], ["squeeze_2", "三塁走者が突っ込んだ！スクイズ決まった！"], ["sac_1", "犠牲フライ！三塁走者がタッチアップ！"], ["sac_2", "タッチアップ！1点追加！"], ["change_1", "スリーアウト、チェンジです。"], ["change_2", "ここでチェンジ。"], ["change_3", "攻守交代です。"], ["relief_1", "ピッチャー交代です。"], ["relief_2", "ここでマウンドを譲ります。"], ["big_1", "巨大バット登場！当たる範囲が大きいぞ！"], ["big_2", "来ました、巨大バット！"], ["magic_1", "魔球モード発動！打てるのか！"], ["magic_2", "魔球です！"], ["star_1", "スーパースター登場！球場がわいています！"], ["star_2", "来ました！二刀流のスーパースター！"], ["starP_1", "二刀流スターがマウンドへ！"], ["starP_2", "スター登板です！"], ["lefty_1", "サウスポーの登場です！"], ["lefty_2", "左腕がマウンドに上がります！"], ["crit_1", "会心の一振り！"], ["crit_2", "会心の当たりだ！"], ["vanish_1", "出た！消える魔球！"], ["vanish_2", "ボールが消えた！"], ["extra_1", "延長戦に突入です！"], ["extra_2", "決着は延長へ！"], ["dice_1", "さあ、運命のサイコロです！"], ["dice_2", "サイコロ！何が出るか！"], ["dice1_1", "残念、はずれです！"], ["dice2_1", "ミートアップ！次のバッターに注目！"], ["dice3_1", "パワーアップ！一発あるか！"], ["dice4_1", "ランナー一塁から始まります！"], ["dice5_1", "1点ボーナス！"], ["dice6_1", "なんと2点ボーナス！大きい！"]];
// 元気な女性の声の候補（番号はVOICEVOXの話者スタイル）
const CANDIDATES = [
  [93, 'ぞん子_実況風'], [70, '満別花丸_元気'], [8, '春日部つむぎ'], [24, 'WhiteCUL_たのしい'],
  [30, 'No7_アナウンス'], [16, '九州そら'], [2, '四国めたん']
];
const SAMPLE_IDS = ['play_1', 'hr_3', 'K_2', 'dice_1'];
// 実況らしく：少し速く、抑揚を強めに
const TUNE = { speedScale: 1.12, intonationScale: 1.3, volumeScale: 1.0, prePhonemeLength: 0.05, postPhonemeLength: 0.12 };

async function synth(text, speaker) {
  const q = await fetch(`${ENGINE}/audio_query?speaker=${speaker}&text=${encodeURIComponent(text)}`, { method: 'POST' });
  if (!q.ok) throw new Error('audio_query ' + q.status);
  const query = Object.assign(await q.json(), TUNE);
  const r = await fetch(`${ENGINE}/synthesis?speaker=${speaker}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(query) });
  if (!r.ok) throw new Error('synthesis ' + r.status);
  return Buffer.from(await r.arrayBuffer());
}
async function main() {
  try { const v = await fetch(ENGINE + '/version'); console.log('VOICEVOX', await v.text()); }
  catch (e) { console.error('VOICEVOX に接続できません。VOICEVOX を起動してから、もう一度実行してください。'); process.exit(1); }
  const [mode, sp] = process.argv.slice(2);
  const text = id => LINES.find(x => x[0] === id)[1];
  if (mode === 'sample') {
    mkdirSync('voicevox-out/samples', { recursive: true });
    for (const [speaker, name] of CANDIDATES) {
      for (const id of SAMPLE_IDS) {
        try { writeFileSync(`voicevox-out/samples/${speaker}_${name}_${id}.wav`, await synth(text(id), speaker)); }
        catch (e) { console.log(`  ${name}: 使えません（${e.message}）。VOICEVOX の設定でこの声が入っているか確認してください`); break; }
      }
      console.log('作成:', name);
    }
    console.log('\nvoicevox-out/samples の音を聞いて、気に入った声の番号（ファイル名の先頭の数字）を Claude に教えてください。');
  } else if (mode === 'all' && sp) {
    mkdirSync('voicevox-out/all', { recursive: true });
    let n = 0;
    for (const [id, t] of LINES) {
      writeFileSync(`voicevox-out/all/${id}.wav`, await synth(t, Number(sp)));
      n++; if (n % 10 === 0) console.log(`${n} / ${LINES.length}`);
    }
    writeFileSync('voicevox-out/all/speaker.txt', String(sp));
    console.log(`\n${n} 本できました。voicevox-out/all フォルダを zip にして Claude に送ってください。`);
  } else {
    console.log('使い方:\n  node voicevox-make.mjs sample      声の聞き比べ\n  node voicevox-make.mjs all 70      番号の声で全部作る');
  }
}
main();
