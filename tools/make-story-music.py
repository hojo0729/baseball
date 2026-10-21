"""Render original story scores. Requires numpy and an ffmpeg executable.

Usage: python tools/make-story-music.py --ffmpeg PATH
No samples, external compositions, API keys or network requests are used.
"""
import argparse
import json
import math
from pathlib import Path
import subprocess
import wave

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
SR = 22050
SCORES = {
    'home': (100, [48, 55, 57, 53, 48, 52, 53, 55], False, .45),
    'mystery': (88, [45, 41, 50, 52, 45, 48, 41, 52], True, .08),
    'invasion': (116, [36, 44, 41, 43, 36, 39, 44, 43], True, .65),
    'awakening': (124, [50, 46, 53, 48, 50, 46, 43, 45], True, .85),
    'final': (136, [48, 55, 57, 53, 48, 52, 53, 55], False, 1),
    'epilogue': (78, [48, 55, 57, 53, 48, 52, 53, 48], False, 0),
}


def render(name, bpm, roots, minor, drive):
    beat = 60 / bpm
    length = round(64 * beat * SR)
    mix = np.zeros((length, 2), dtype=np.float64)
    rng = np.random.default_rng(20261021)

    def add(y, start, volume, pan=0):
        ix = (np.arange(len(y)) + round(start * SR)) % length
        # Wrap release tails to make the musical boundary continuous.
        for ch, gain in enumerate([math.sqrt((1-pan)/2), math.sqrt((1+pan)/2)]):
            np.add.at(mix[:, ch], ix, y * volume * gain)

    def note(midi, start, dur, vol, voice='piano', pan=0):
        t = np.arange(round((dur + .7) * SR)) / SR
        freq = 440 * 2 ** ((midi - 69) / 12)
        if voice == 'pad':
            y = sum(np.sin(2*np.pi*freq*(1+d)*t + .07*np.sin(2*np.pi*4*t))
                    for d in [-.002, 0, .002]) / 3
            y += .16 * np.sin(4*np.pi*freq*t)
            env = np.minimum(t/.25, 1) * np.minimum(np.maximum((dur+.7-t)/.7, 0), 1)
        elif voice == 'bass':
            y = np.sin(2*np.pi*freq*t) + .2*np.sin(4*np.pi*freq*t)
            env = np.minimum(t/.015, 1) * np.exp(-t/1.0) * np.minimum(np.maximum((dur+.12-t)/.12, 0), 1)
        else:
            y = sum(a*np.sin(2*np.pi*freq*h*t)*np.exp(-t*(.7+h*.45))
                    for h, a in [(1, 1), (2, .32), (3, .15), (4, .06)])
            env = np.minimum(t/.008, 1) * np.minimum(np.maximum((dur+.5-t)/.5, 0), 1)
        add(y*env, start, vol, pan)

    def drum(start, kind, vol):
        t = np.arange(round(.24*SR))/SR
        if kind == 'kick':
            y = np.sin(2*np.pi*(45*t + 7*(1-np.exp(-t*28)))) * np.exp(-t*22)
        else:
            noise = rng.uniform(-1, 1, len(t))
            y = (noise - np.roll(noise, 1)) * np.exp(-t*(55 if kind=='hat' else 22))
            if kind == 'snare':
                y += .25*np.sin(2*np.pi*185*t)*np.exp(-t*25)
        add(y, start, vol, .15 if kind=='hat' else 0)

    for bar in range(16):
        root = roots[bar % 8]
        minor_roots = {'mystery': [45, 50], 'invasion': [36, 41], 'awakening': [50, 43]}.get(name, [57, 52])
        third = 3 if root in minor_roots else 4
        chord = [root+12, root+12+third, root+19, root+26]
        at = bar*4*beat
        for j, pitch in enumerate(chord):
            note(pitch, at, 3.6*beat, .055 if drive < .2 else .065, 'pad', (j-1.5)*.3)
        for q in range(4):
            note(root-12 if root >= 45 else root, at+q*beat, .8*beat, .14 if drive else .085, 'bass')
        # One shared rising phrase, reharmonized for each chapter's mood.
        melody = [0, 2, 4, 2, 1, 0, 2, 1][bar % 8]
        scale = [0, 2, 3 if minor else 4, 5, 7, 9 if not minor else 8, 10 if minor else 11]
        tonic = {'mystery':57, 'invasion':60, 'awakening':62}.get(name, 60)
        if name != 'invasion' or bar % 2 == 0:
            notes = [(0, melody, 1.25), (1.5, melody+1, .5), (2.5, melody+2, 1.2)]
            if bar % 4 == 3:
                notes = [(0, 4, 1), (1.5, 1, .5), (2.5, 0, 1.3)]
            for off, step, dur in notes:
                pitch = tonic + scale[step % 7] + (12 if bar >= 8 and drive > .7 else 0)
                note(pitch, at+off*beat, dur*beat, .13 if drive else .12, pan=-.12)
        # Rolling accompaniment leaves room for dialogue and commentary.
        count = 8 if drive >= .4 else 4
        for j in range(count):
            pitch = chord[[0, 2, 1, 3][j % 4]]
            note(pitch, at+j*4/count*beat, .45*beat, .045 if drive else .035, pan=.4)
        if drive:
            for q in range(4):
                drum(at+q*beat, 'kick' if q % 2 == 0 else 'snare', .16*drive)
                drum(at+(q+.5)*beat, 'hat', .035*drive)
            if bar % 4 == 3 and drive > .6:
                for off in [3, 3.5, 3.75]:
                    drum(at+off*beat, 'snare', .09*drive)

    # Short stereo room reflections, folded across the loop seam.
    dry = mix.copy()
    for delay, gain in [(.093, .12), (.177, .09), (.293, .065), (.419, .04)]:
        mix += np.roll(dry[:, ::-1], round(delay*SR), axis=0)*gain
    mix = np.tanh(mix*1.25)
    rms = np.sqrt(np.mean(mix**2))
    mix *= min(.12 / max(rms, 1e-9), .82 / max(np.max(np.abs(mix)), 1e-9))
    return mix


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--ffmpeg', required=True)
    args = parser.parse_args()
    tmp = ROOT/'dist/story-music'
    tmp.mkdir(parents=True, exist_ok=True)
    report = {}
    for name, settings in SCORES.items():
        samples = render(name, *settings)
        wav = tmp/f'{name}.wav'
        with wave.open(str(wav), 'wb') as out:
            out.setnchannels(2)
            out.setsampwidth(2)
            out.setframerate(SR)
            out.writeframes((samples*32767).astype('<i2').tobytes())
        dest = ROOT/f'docs/bgm/story_{name}.mp3'
        subprocess.run([args.ffmpeg, '-hide_banner', '-loglevel', 'error', '-y', '-i', str(wav),
                        '-codec:a', 'libmp3lame', '-b:a', '96k', '-ar', str(SR),
                        '-metadata', f'title=Animal Baseball - {name}', str(dest)], check=True)
        report[name] = {'seconds':round(len(samples)/SR, 3), 'bpm':settings[0],
                        'peak':round(float(np.max(np.abs(samples))), 4),
                        'rms':round(float(np.sqrt(np.mean(samples**2))), 4), 'bytes':dest.stat().st_size}
    (tmp/'report.json').write_text(json.dumps(report, indent=2)+'\n')
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    main()
