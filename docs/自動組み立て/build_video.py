# -*- coding: utf-8 -*-
"""
BIG BAMBOO 幹部成長制度 ― 動画自動組み立てスクリプト

AivisSpeechで書き出した slide01.wav〜slide29.wav と、
スライド画像 slide01.png〜slide29.png から、動画（MP4）と字幕（SRT）を自動生成します。

■ 必要なもの
  - Python 3.8以上
  - ffmpeg（https://ffmpeg.org/ からインストールし、パスを通しておく）

■ 使い方
  1. このスクリプトと同じフォルダに以下を置く
       audio/slide01.wav 〜 slide29.wav   （AivisSpeechで書き出した音声）
       images/slide01.png 〜 slide29.png  （docs/スライド画像/ の中身をコピー）
  2. ターミナル（コマンドプロンプト）でこのフォルダに移動して実行
       python build_video.py
  3. 完成物
       幹部成長制度　基本.mp4
       BIG_BAMBOO_幹部成長制度_字幕_FINAL.srt

音声とスライドの対応・順番はファイル名の番号で決まります。
"""
import glob
import os
import re
import subprocess
import sys
import wave

LEAD = 0.9   # スライド頭の間（秒）
TAIL = 1.1   # スライド末の間（秒）

HERE = os.path.dirname(os.path.abspath(__file__))
AUDIO = os.path.join(HERE, "audio")
IMAGES = os.path.join(HERE, "images")
SEGS = os.path.join(HERE, "_segs")
OUT_MP4 = os.path.join(HERE, "幹部成長制度　基本.mp4")
OUT_SRT = os.path.join(HERE, "BIG_BAMBOO_幹部成長制度_字幕_FINAL.srt")

# 字幕用テキスト（ナレーション_AivisSpeech用/slideXX.txt をこのフォルダの text/ にコピーすると
# 文単位の字幕を自動生成します。無い場合は字幕をスライド単位で出します）
TEXT = os.path.join(HERE, "text")


def need(cmd):
    try:
        subprocess.run([cmd, "-version"], capture_output=True)
    except FileNotFoundError:
        sys.exit(f"エラー: {cmd} が見つかりません。ffmpegをインストールしてください。")


def wav_duration(path):
    with wave.open(path) as w:
        return w.getnframes() / w.getframerate()


def fmt_ts(sec):
    ms = int(round(sec * 1000))
    h, ms = divmod(ms, 3600000)
    m, ms = divmod(ms, 60000)
    s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def main():
    need("ffmpeg")
    wavs = sorted(glob.glob(os.path.join(AUDIO, "slide*.wav")))
    imgs = sorted(glob.glob(os.path.join(IMAGES, "slide*.png")))
    if not wavs:
        sys.exit("エラー: audio/slideXX.wav が見つかりません。")
    if len(wavs) != len(imgs):
        sys.exit(f"エラー: 音声{len(wavs)}本と画像{len(imgs)}枚の数が合いません。")

    os.makedirs(SEGS, exist_ok=True)
    srt, t_global, seg_files = [], 0.0, []

    for wav, img in zip(wavs, imgs):
        n = int(re.search(r"(\d+)", os.path.basename(wav)).group(1))
        dur = wav_duration(wav)
        total = LEAD + dur + TAIL
        seg = os.path.join(SEGS, f"seg{n:02d}.mp4")
        subprocess.run([
            "ffmpeg", "-y", "-loop", "1", "-i", img, "-i", wav,
            "-c:v", "libx264", "-tune", "stillimage", "-preset", "veryfast",
            "-crf", "27", "-r", "12", "-pix_fmt", "yuv420p",
            "-vf", "scale=1920:1080",
            "-af", f"adelay={int(LEAD*1000)}|{int(LEAD*1000)},apad=pad_dur={TAIL}",
            "-t", f"{total:.3f}",
            "-c:a", "aac", "-b:a", "128k", "-ar", "44100",
            seg,
        ], check=True, capture_output=True)
        seg_files.append(seg)

        # 字幕: text/slideXX.txt があれば文単位、無ければスライド単位
        txt_path = os.path.join(TEXT, f"slide{n:02d}.txt")
        if os.path.exists(txt_path):
            text = open(txt_path, encoding="utf-8").read().strip()
            sents = [s for s in re.split(r"(?<=[。？！])", text) if s.strip()]
            chars = sum(len(s) for s in sents)
            t = t_global + LEAD
            for s_ in sents:
                d = dur * len(s_) / chars
                srt.append((t, t + d, s_.strip()))
                t += d
        else:
            srt.append((t_global + LEAD, t_global + LEAD + dur, f"（スライド{n:02d}）"))

        t_global += total
        print(f"slide {n:02d}: {total:.1f}秒  累計 {t_global/60:.1f}分")

    lst = os.path.join(SEGS, "concat.txt")
    with open(lst, "w", encoding="utf-8") as f:
        for p in seg_files:
            f.write(f"file '{p}'\n")
    subprocess.run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", lst,
                    "-c", "copy", OUT_MP4], check=True, capture_output=True)

    with open(OUT_SRT, "w", encoding="utf-8") as f:
        for i, (a, b, txt) in enumerate(srt, 1):
            f.write(f"{i}\n{fmt_ts(a)} --> {fmt_ts(b)}\n{txt}\n\n")

    print(f"\n完成: {OUT_MP4}\n字幕: {OUT_SRT}\n全体尺: {t_global/60:.1f}分")


if __name__ == "__main__":
    main()
