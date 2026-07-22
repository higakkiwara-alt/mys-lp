# -*- coding: utf-8 -*-
"""
02_make_audio.py — Open JTalk でナレーション音声を生成する。

文単位で合成 → スライドごとの WAV → 全編 WAV を作成し、
字幕・動画で使う正確なタイミング情報 (timings.json) を出力する。

出力:
  03_audio/slides/slide01.wav 〜 slide24.wav (48kHz mono)
  03_audio/全編ナレーション.wav
  06_script/timings.json
"""
import json
import os
import struct
import subprocess
import sys
import tempfile
import wave

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from slides_data import SLIDES

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AUDIO_DIR = os.path.join(BASE, "03_audio")
SLIDE_DIR = os.path.join(AUDIO_DIR, "slides")
os.makedirs(SLIDE_DIR, exist_ok=True)

# ---- Open JTalk 設定(落ち着いた男性音声) ----
DIC = "/var/lib/mecab/dic/open-jtalk/naist-jdic"
VOICE = "/usr/share/hts-voice/nitech-jp-atr503-m001/nitech_jp_atr503_m001.htsvoice"
RATE = 1.0        # 話速
HALFTONE = -2.0   # 声の高さ(低め=落ち着き)
ALPHA = 0.53      # 声質
POSTFILTER = 0.2  # こもり防止

SR = 48000        # サンプルレート(open_jtalk 出力に合わせる)

HEAD_SIL = 0.7    # スライド頭の無音(秒)
GAP_SIL = 0.38    # 文間の無音
TAIL_SIL = 1.15   # スライド末尾の無音

def tts(text, out_wav):
    with tempfile.NamedTemporaryFile("w", suffix=".txt", delete=False,
                                     encoding="utf-8") as f:
        f.write(text)
        tmp = f.name
    try:
        subprocess.run(
            ["open_jtalk", "-x", DIC, "-m", VOICE,
             "-r", str(RATE), "-fm", str(HALFTONE), "-a", str(ALPHA),
             "-b", str(POSTFILTER), "-ow", out_wav, tmp],
            check=True, capture_output=True)
    finally:
        os.unlink(tmp)

def read_wav(path):
    with wave.open(path, "rb") as w:
        assert w.getframerate() == SR and w.getnchannels() == 1
        return w.readframes(w.getnframes())

def silence(sec):
    return b"\x00\x00" * int(SR * sec)

def write_wav(path, frames):
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(frames)

def trim_edges(frames, thresh=250, keep=0.08):
    """合成音声の前後の無音を軽くトリムする(keep 秒は残す)。"""
    n = len(frames) // 2
    vals = struct.unpack(f"<{n}h", frames)
    start, end = 0, n
    for i, v in enumerate(vals):
        if abs(v) > thresh:
            start = max(0, i - int(SR * keep))
            break
    for i in range(n - 1, -1, -1):
        if abs(vals[i]) > thresh:
            end = min(n, i + int(SR * keep))
            break
    return frames[start * 2:end * 2]

def main():
    timings = []       # スライドごと
    global_t = 0.0
    all_frames = b""
    tmpdir = tempfile.mkdtemp(prefix="ojt_")

    for s in SLIDES:
        no = s["no"]
        frames = silence(HEAD_SIL)
        cues = []
        t = global_t + HEAD_SIL
        for i, sent in enumerate(s["narration"]):
            wav = os.path.join(tmpdir, f"s{no:02d}_{i:02d}.wav")
            tts(sent, wav)
            sf = trim_edges(read_wav(wav))
            dur = len(sf) / 2 / SR
            cues.append(dict(text=sent, start=round(t, 3),
                             end=round(t + dur, 3)))
            frames += sf
            t += dur
            if i < len(s["narration"]) - 1:
                frames += silence(GAP_SIL)
                t += GAP_SIL
        frames += silence(TAIL_SIL)
        slide_dur = len(frames) / 2 / SR
        out = os.path.join(SLIDE_DIR, f"slide{no:02d}.wav")
        write_wav(out, frames)
        timings.append(dict(no=no, start=round(global_t, 3),
                            duration=round(slide_dur, 3), cues=cues))
        all_frames += frames
        global_t += slide_dur
        print(f"slide {no:02d}: {slide_dur:6.2f}s  ({len(s['narration'])} 文)")

    full = os.path.join(AUDIO_DIR, "全編ナレーション.wav")
    write_wav(full, all_frames)
    total = len(all_frames) / 2 / SR
    with open(os.path.join(os.path.dirname(os.path.abspath(__file__)),
                           "timings.json"), "w", encoding="utf-8") as f:
        json.dump(dict(sample_rate=SR, total=round(total, 3),
                       slides=timings), f, ensure_ascii=False, indent=1)
    print(f"\n全編: {total/60:.1f} 分 ({total:.1f}s) -> {full}")

if __name__ == "__main__":
    main()
