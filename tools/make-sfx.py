#!/usr/bin/env python3
"""Pack sound effects from 効果音ラボ (soundeffect-lab.info: free for commercial use, no credit needed,
redistribution of the files themselves is not allowed — they ask games to hide the files where possible).
The mp3s are scrambled (XOR) into docs/sfx/<name>.bin so they are not plain downloadable sound files;
01-core.js unscrambles them at load time. Keep the original mp3s out of the repository.
usage: python3 tools/make-sfx.py <folder with the downloaded mp3s>"""
import sys, os
KEY = b'dobutsu-league-sfx'
MAP = {'bat1': 'metal-bat1', 'bat2': 'metal-bat2', 'batHR': 'metal-bat-cheers1', 'mitt1': 'ball-mitt-catch1',
       'mitt2': 'ball-mitt-catch2', 'slide1': 'sliding1', 'slide2': 'sliding2'}
src = sys.argv[1]
os.makedirs('docs/sfx', exist_ok=True)
for name, f in MAP.items():
    data = open(os.path.join(src, f + '.mp3'), 'rb').read()
    out = bytes(b ^ KEY[i % len(KEY)] for i, b in enumerate(data))
    open(f'docs/sfx/{name}.bin', 'wb').write(out)
    print(name, len(out))
