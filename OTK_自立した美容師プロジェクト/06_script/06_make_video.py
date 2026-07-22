# -*- coding: utf-8 -*-
"""
06_make_video.py — スライドPNG + ナレーション + BGM + 字幕 から MP4 を合成する。

- 各スライドはナレーションの長さに合わせて表示(フレーム単位で同期補正)
- 場面転換はフェードイン/アウト(0.5秒)
- BGM はごく小音量の自作アンビエントパッド(著作権フリー/自動生成)
- 字幕は画面下部に焼き込み(SRT は 07_source/字幕.srt)
- 最後に 2.5 秒の余韻

出力: 04_video/日本で一番自立した美容師が育つ会社.mp4
      05_assets/bgm.wav
"""
import glob
import json
import os
import shutil
import subprocess
import tempfile

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PNG_DIR = os.path.join(BASE, "05_assets", "slides_png")
NARR = os.path.join(BASE, "03_audio", "全編ナレーション.wav")
SRT = os.path.join(BASE, "07_source", "字幕.srt")
BGM = os.path.join(BASE, "05_assets", "bgm.wav")
OUT = os.path.join(BASE, "04_video", "日本で一番自立した美容師が育つ会社.mp4")

FPS = 30
FADE = 0.5
TAIL = 2.5          # 最終スライド後の余韻
BGM_GAIN = 0.12     # BGM 音量(ナレーションを邪魔しない控えめレベル)

with open(os.path.join(BASE, "06_script", "timings.json"), encoding="utf-8") as f:
    T = json.load(f)
slides = T["slides"]
total = T["total"] + TAIL

def run(args):
    subprocess.run(args, check=True, capture_output=True)

# ---- 1. BGM(静かなアンビエントパッド)を生成 ----
run(["ffmpeg", "-y",
     "-f", "lavfi", "-i", f"sine=frequency=110:sample_rate=48000:duration={total}",
     "-f", "lavfi", "-i", f"sine=frequency=164.81:sample_rate=48000:duration={total}",
     "-f", "lavfi", "-i", f"sine=frequency=220:sample_rate=48000:duration={total}",
     "-f", "lavfi", "-i", f"sine=frequency=329.63:sample_rate=48000:duration={total}",
     "-filter_complex",
     "[0:a]volume=0.9[a0];[1:a]volume=0.55[a1];[2:a]volume=0.4[a2];"
     "[3:a]volume=0.22,tremolo=f=0.13:d=0.5[a3];"
     "[a0][a1][a2][a3]amix=inputs=4:normalize=0,"
     "tremolo=f=0.1:d=0.3,lowpass=f=650,"
     f"volume={BGM_GAIN},afade=t=in:st=0:d=3,"
     f"afade=t=out:st={total-4}:d=4",
     "-ac", "1", "-ar", "48000", BGM])
print("BGM generated")

# ---- 2. スライドごとのセグメント動画(フェード付き) ----
tmp = tempfile.mkdtemp(prefix="vid_")
pngs = sorted(glob.glob(os.path.join(PNG_DIR, "slide-*.png")))
assert len(pngs) == len(slides), f"PNG {len(pngs)} != slides {len(slides)}"

concat_list = []
cum_frames = 0
cum_t = 0.0
for png, sl in zip(pngs, slides):
    d = sl["duration"] + (TAIL if sl["no"] == len(slides) else 0)
    cum_t += d
    frames = round(cum_t * FPS) - cum_frames   # 累積誤差をフレーム単位で補正
    cum_frames += frames
    seg_d = frames / FPS
    seg = os.path.join(tmp, f"seg{sl['no']:02d}.mp4")
    run(["ffmpeg", "-y", "-loop", "1", "-framerate", str(FPS), "-i", png,
         "-frames:v", str(frames),
         "-vf",
         f"fade=t=in:st=0:d={FADE},fade=t=out:st={seg_d-FADE:.3f}:d={FADE},"
         "format=yuv420p",
         "-c:v", "libx264", "-preset", "medium", "-tune", "stillimage",
         "-crf", "19", seg])
    concat_list.append(f"file '{seg}'\n")
    print(f"segment {sl['no']:02d}: {frames} frames")

listfile = os.path.join(tmp, "list.txt")
with open(listfile, "w") as f:
    f.writelines(concat_list)
silent = os.path.join(tmp, "silent.mp4")
run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", listfile,
     "-c", "copy", silent])

# ---- 3. 字幕焼き込み + 音声ミックス ----
subs = os.path.join(tmp, "subs.srt")   # 非ASCIIパス対策でコピー
shutil.copy(SRT, subs)
style = ("FontName=Noto Sans CJK JP,FontSize=16.5,PrimaryColour=&H00FFFFFF,"
         "OutlineColour=&H00101010,BorderStyle=1,Outline=1.4,Shadow=0.9,"
         "MarginV=32,Spacing=0.4")
os.makedirs(os.path.dirname(OUT), exist_ok=True)
run(["ffmpeg", "-y", "-i", silent, "-i", NARR, "-i", BGM,
     "-filter_complex",
     f"[0:v]subtitles={subs}:force_style='{style}'[v];"
     f"[1:a]apad=pad_dur={TAIL}[nar];"
     "[nar][2:a]amix=inputs=2:duration=first:normalize=0[a]",
     "-map", "[v]", "-map", "[a]",
     "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-r", str(FPS),
     "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
     "-movflags", "+faststart", "-shortest", OUT])

shutil.rmtree(tmp, ignore_errors=True)
size = os.path.getsize(OUT) / 1e6
print(f"video -> {OUT} ({size:.1f} MB, {total/60:.1f} min)")
