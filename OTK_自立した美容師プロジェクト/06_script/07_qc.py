# -*- coding: utf-8 -*-
"""
07_qc.py — 成果物の自動品質チェック。
"""
import glob
import json
import os
import re
import subprocess
import sys
import wave

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ok = True

def check(name, cond, detail=""):
    global ok
    mark = "OK " if cond else "NG "
    print(f"[{mark}] {name}" + (f" — {detail}" if detail else ""))
    if not cond:
        ok = False

def probe_duration(path):
    r = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "csv=p=0", path], capture_output=True, text=True)
    return float(r.stdout.strip())

# 1. ファイルの存在
FILES = [
    "01_slide/日本で一番自立した美容師が育つ会社.pptx",
    "02_narration/ナレーション原稿.md",
    "03_audio/全編ナレーション.wav",
    "04_video/日本で一番自立した美容師が育つ会社.mp4",
    "07_source/スライド構成.md",
    "07_source/字幕.srt",
    "README.md",
]
for f in FILES:
    p = os.path.join(BASE, f)
    check(f"存在: {f}", os.path.exists(p) and os.path.getsize(p) > 0)

# 2. PowerPoint が開ける・枚数
try:
    from pptx import Presentation
    prs = Presentation(os.path.join(BASE, FILES[0]))
    n = len(prs.slides._sldIdLst)
    check("PowerPoint が正常に開ける", True)
    check("スライド枚数 18〜24", 18 <= n <= 24, f"{n}枚")
except Exception as e:
    check("PowerPoint が正常に開ける", False, str(e))

# 3. 日本語テキストの文字化けチェック(原稿に置換文字がない)
for f in ["02_narration/ナレーション原稿.md", "07_source/スライド構成.md",
          "07_source/字幕.srt"]:
    txt = open(os.path.join(BASE, f), encoding="utf-8").read()
    check(f"文字化けなし: {f}", "�" not in txt and "日" in txt or "、" in txt)

# 4. 音声
with open(os.path.join(BASE, "06_script", "timings.json"), encoding="utf-8") as fp:
    T = json.load(fp)
wavs = sorted(glob.glob(os.path.join(BASE, "03_audio", "slides", "slide*.wav")))
check("スライド別音声が全数ある", len(wavs) == len(T["slides"]),
      f"{len(wavs)}/{len(T['slides'])}")
for w in wavs:
    with wave.open(w) as f:
        d = f.getnframes() / f.getframerate()
    if d < 3:
        check(f"音声欠け: {os.path.basename(w)}", False, f"{d:.1f}s")
full_d = probe_duration(os.path.join(BASE, FILES[2]))
check("全編音声の尺が timings と一致", abs(full_d - T["total"]) < 0.5,
      f"{full_d:.1f}s vs {T['total']:.1f}s")

# 5. SRT 整合性(開始/終了の重複なし・2行以内)
srt = open(os.path.join(BASE, "07_source", "字幕.srt"), encoding="utf-8").read()
pat = re.compile(r"(\d+):(\d+):(\d+),(\d+) --> (\d+):(\d+):(\d+),(\d+)")
times = []
for m in pat.finditer(srt):
    g = list(map(int, m.groups()))
    st = g[0] * 3600 + g[1] * 60 + g[2] + g[3] / 1000
    en = g[4] * 3600 + g[5] * 60 + g[6] + g[7] / 1000
    times.append((st, en))
overlap = any(times[i][1] > times[i + 1][0] for i in range(len(times) - 1))
bad_order = any(st >= en for st, en in times)
check("字幕の開始/終了が重複していない", not overlap and not bad_order,
      f"{len(times)} blocks")
maxlines = max(b.count("\n") for b in re.split(r"\n\n", srt.strip()))
check("字幕は2行以内", maxlines <= 3)  # 番号+時刻+本文2行 = 4行未満

# 6. 動画
mp4 = os.path.join(BASE, FILES[3])
vid_d = probe_duration(mp4)
check("動画と音声の尺が合っている", abs(vid_d - (T["total"] + 2.5)) < 1.0,
      f"video {vid_d:.1f}s / audio+余韻 {T['total']+2.5:.1f}s")
r = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v",
                    "-show_entries", "stream=width,height,r_frame_rate",
                    "-of", "csv=p=0", mp4], capture_output=True, text=True)
check("解像度 1920x1080 / 30fps", "1920,1080,30/1" in r.stdout.strip(),
      r.stdout.strip())
r = subprocess.run(["ffmpeg", "-v", "error", "-i", mp4, "-t", "20",
                    "-f", "null", "-"], capture_output=True, text=True)
check("MP4 が正常デコードできる", r.returncode == 0 and not r.stderr.strip())

# 7. スライドPNG
pngs = glob.glob(os.path.join(BASE, "05_assets", "slides_png", "slide-*.png"))
check("スライドPNG 全数", len(pngs) == len(T["slides"]))

# 8. README に再生成手順
readme = open(os.path.join(BASE, "README.md"), encoding="utf-8").read()
check("README に再生成手順", "build_all" in readme and "再生成" in readme)

print()
print("=== ALL PASSED ===" if ok else "=== FAILURES FOUND ===")
sys.exit(0 if ok else 1)
