# -*- coding: utf-8 -*-
"""
03_make_srt.py — timings.json から SRT 字幕を生成する。
出力: 07_source/字幕.srt (1ブロック=1文、最大2行、1行26文字まで)
"""
import json
import os

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TJ = os.path.join(BASE, "06_script", "timings.json")
OUT = os.path.join(BASE, "07_source", "字幕.srt")

MAX_LINE = 26

def fmt(t):
    ms = int(round(t * 1000))
    h, ms = divmod(ms, 3600000)
    m, ms = divmod(ms, 60000)
    s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"

def wrap(text):
    """2行以内・読点優先で折り返す。"""
    if len(text) <= MAX_LINE:
        return text
    # 中央に近い読点で分割
    best, bestd = None, 10 ** 9
    for i, ch in enumerate(text):
        if ch in "、。ですがのにをはとで" and 0 < i < len(text) - 1:
            if ch in "、。":
                d = abs(i + 1 - len(text) / 2)
                if d < bestd:
                    best, bestd = i + 1, d
    if best is None or max(best, len(text) - best) > MAX_LINE:
        best = (len(text) + 1) // 2
    return text[:best] + "\n" + text[best:]

def main():
    with open(TJ, encoding="utf-8") as f:
        data = json.load(f)
    blocks = []
    n = 0
    prev_end = -1.0
    for sl in data["slides"]:
        for cue in sl["cues"]:
            n += 1
            start = max(cue["start"], prev_end + 0.001)  # 重複防止
            end = max(cue["end"], start + 0.3)
            prev_end = end
            blocks.append(f"{n}\n{fmt(start)} --> {fmt(end)}\n{wrap(cue['text'])}\n")
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        f.write("\n".join(blocks))
    print(f"{n} blocks -> {OUT}")

if __name__ == "__main__":
    main()
