# 実況音声の後処理：末尾（と先頭）に付く短い雑音を切り、無音を詰めて、ごく短いフェードを付ける
#   python3 tools/clean-voice.py docs/audio/*.mp3     （上書きする）
# Gemini TTS の出力は、言い終わりの無音のあとに 0.1 秒ほどの大きな雑音が付くことがある
import sys, subprocess, struct, math
SR = 24000; WIN = 240                      # 10 ms windows
def db(chunk):
    if not chunk: return -120
    r = math.sqrt(sum(x * x for x in chunk) / len(chunk)); return 20 * math.log10(r / 32768 + 1e-9)
def clean(path):
    raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', path, '-f', 's16le', '-ac', '1', '-ar', str(SR), '-'], capture_output=True, check=True).stdout
    a = list(struct.unpack('<%dh' % (len(raw) // 2), raw))
    W = [a[i:i + WIN] for i in range(0, len(a), WIN)]
    quiet = lambda w: db(w) < -50
    def stats(seg):
        m = sum(seg) / len(seg); r = math.sqrt(sum(x * x for x in seg) / len(seg)); return m, r
    # tail: the noise is a short loud run (< 0.3 s) after a pause, biased to one side as a whole; speech averages ~0
    end = len(W)
    while True:
        while end > 0 and quiet(W[end - 1]): end -= 1
        k = end
        while k > 0 and not quiet(W[k - 1]): k -= 1
        run = [x for w in W[k:end] for x in w]
        if not run or end - k > 30 or k == 0: break
        m, r = stats(run)
        if abs(m) > 0.2 * r: end = k                  # junk: drop it and look again
        else: break
    start = 0
    while start < end and quiet(W[start]): start += 1
    s0, s1 = max(0, start - 3) * WIN, min(len(a), (end + 8) * WIN)   # keep 30 ms before, 80 ms after
    b = a[s0:s1]
    if len(b) < SR * 0.3: return None
    fi, fo = int(SR * 0.008), int(SR * 0.06)
    for k in range(min(fi, len(b))): b[k] = int(b[k] * k / fi)
    for k in range(min(fo, len(b))): b[-1 - k] = int(b[-1 - k] * k / fo)
    pcm = struct.pack('<%dh' % len(b), *b)
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 's16le', '-ar', str(SR), '-ac', '1', '-i', '-', '-b:a', '64k', path], input=pcm, check=True)
    return (len(a) - len(b)) / SR
if __name__ == '__main__':
    for p in sys.argv[1:]:
        cut = clean(p); print(p, 'skipped' if cut is None else f'-{cut:.2f}s')
