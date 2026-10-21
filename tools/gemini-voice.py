# Gemini TTS で実況の声を作る（声: Kore、元気な女性実況）
#   キー: 環境変数 GEMINI_API_KEY か ~/.gemini.key（リポジトリには入れない）
#   全部（既にあるファイルは飛ばす）: python3 tools/gemini-voice.py all Kore voice-script.csv <出力フォルダ>
#   1本の再生成: python3 tools/gemini-voice.py one Kore "バットが、くうをきる！" <出力.mp3>
#   注意: gemini-3.8-flash-tts は有料でも1日100回まで。1分あたりの上限もあるので、ゆっくり回る
#   確認: python3 tools/gemini-voice-check.py <フォルダ>  （文字起こしでセリフと照合。0.8未満を表示）
import json, base64, subprocess, sys, time, urllib.request, urllib.error, os
KEY = os.environ.get('GEMINI_API_KEY') or open(os.path.expanduser('~/.gemini.key')).read().strip()   # never commit the key
MODEL = os.environ.get('MODEL', 'gemini-3.8-flash-tts')
STYLE = os.environ.get('STYLE', '[excitedly, like an energetic female sports announcer] ')
READINGS = {'miss_2': 'バットが、くうをきる！'}  # 字幕は漢字のまま。音声だけ読みを固定する。
def tts(text, voice, out_mp3):
    body = {"contents": [{"parts": [{"text": STYLE + text}]}],
            "generationConfig": {"responseModalities": ["AUDIO"],
                                 "speechConfig": {"voiceConfig": {"prebuiltVoiceConfig": {"voiceName": voice}}}}}
    req = urllib.request.Request(f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent",
                                 data=json.dumps(body).encode(), headers={"Content-Type": "application/json", "x-goog-api-key": KEY})
    for attempt in range(6):
        try:
            d = json.load(urllib.request.urlopen(req, timeout=120)); break
        except urllib.error.HTTPError as e:
            msg = e.read().decode()[:300]
            if e.code in (429, 500, 503): print('  retry', e.code, msg[:120], flush=True); time.sleep(20 * (attempt + 1)); continue
            raise RuntimeError(f"{e.code} {msg}")
    else: raise RuntimeError('gave up')
    part = d['candidates'][0]['content']['parts'][0]['inlineData']
    pcm = base64.b64decode(part['data'])
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 's16le', '-ar', '24000', '-ac', '1', '-i', '-',
                    '-af', 'silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse',
                    '-ac', '1', '-b:a', '64k', out_mp3], input=pcm, check=True)
if __name__ == '__main__':
    mode = sys.argv[1]
    if mode == 'one':
        tts(sys.argv[3], sys.argv[2], sys.argv[4])
        print('ok', sys.argv[4], flush=True)
    if mode == 'sample':
        lines = [('hr_3', '行ったー！特大のホームランです！'), ('K_2', '空振り三振！気持ちよく仕留めた！')]
        os.makedirs('samples', exist_ok=True)
        for v in sys.argv[2:]:
            for lid, t in lines:
                out = f'samples/{v}_{lid}.mp3'
                if os.path.exists(out): continue
                tts(t, v, out); print('ok', out, flush=True); time.sleep(2)

def run_all(voice, csv_path, outdir):
    import csv
    os.makedirs(outdir, exist_ok=True)
    rows = list(csv.reader(open(csv_path, encoding='utf-8-sig')))[1:]
    for i, (lid, text, _) in enumerate(rows, 1):
        out = f'{outdir}/{lid}.mp3'
        if os.path.exists(out): continue
        for t in range(3):
            try: tts(READINGS.get(lid, text), voice, out); break
            except Exception as e: print('  err', lid, str(e)[:150], flush=True); time.sleep(10)
        print(f'{i}/{len(rows)} {lid}', flush=True); time.sleep(1)
    print('ALLDONE', flush=True)
if __name__ == '__main__' and sys.argv[1] == 'all':
    run_all(sys.argv[2], sys.argv[3], sys.argv[4])
