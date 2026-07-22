# -*- coding: utf-8 -*-
"""
04_make_docs.py — slides_data.py からドキュメントを生成する。
出力:
  02_narration/ナレーション原稿.md
  07_source/スライド構成.md
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from slides_data import SLIDES

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TJ = os.path.join(BASE, "06_script", "timings.json")

timings = {}
if os.path.exists(TJ):
    with open(TJ, encoding="utf-8") as f:
        timings = {s["no"]: s for s in json.load(f)["slides"]}

def slide_title(s):
    return s.get("title") or s.get("message", "").split("\n")[0]

# ---- ナレーション原稿 ----
lines = ["# ナレーション原稿",
         "",
         "「日本で一番、自立した美容師が育つ会社へ」 スタッフ教育動画",
         "",
         "- 話者: 代表がスタッフへ語りかける想定(落ち着いた男性音声)",
         "- 音声合成: Open JTalk(nitech-jp-atr503-m001 / 低め・ゆったり設定)",
         ""]
total_chars = 0
for s in SLIDES:
    t = timings.get(s["no"])
    dur = f"(約{t['duration']:.0f}秒)" if t else ""
    lines.append(f"## Slide {s['no']:02d} {slide_title(s).replace(chr(10), ' ')} {dur}")
    lines.append("")
    for sent in s["narration"]:
        lines.append(sent)
    total_chars += len("".join(s["narration"]))
    lines.append("")
lines.append(f"---")
lines.append(f"総文字数: {total_chars}文字")
if timings:
    total = sum(t["duration"] for t in timings.values())
    lines.append(f"全編尺: 約{total/60:.1f}分")
with open(os.path.join(BASE, "02_narration", "ナレーション原稿.md"), "w",
          encoding="utf-8") as f:
    f.write("\n".join(lines))

# ---- スライド構成 ----
doc = ["# スライド構成",
       "",
       "「日本で一番、自立した美容師が育つ会社へ」 全24枚 / 16:9 / 1920x1080",
       "",
       "デザイン: 黒・白・ダークグレー・ゴールド/Noto Serif CJK JP(見出し)+ Noto Sans CJK JP(本文)",
       ""]
for s in SLIDES:
    doc.append(f"## Slide {s['no']:02d}(レイアウト: {s['layout']})")
    doc.append("")
    if s.get("kicker"):
        doc.append(f"- キッカー: {s['kicker']}")
    for key, label in [("title", "タイトル"), ("sub", "サブタイトル"),
                       ("message", "メッセージ"), ("definition", "定義"),
                       ("gold_line", "強調(ゴールド)"), ("big", "強調数値"),
                       ("note", "注記")]:
        if s.get(key):
            v = s[key]
            if isinstance(v, tuple):
                v = " ".join(v)
            doc.append(f"- {label}: {v.replace(chr(10), ' / ')}")
    for key, label in [("lines", "本文"), ("points", "ポイント"),
                       ("chips", "項目"), ("purposes", "使いみち"),
                       ("cycle", "循環図")]:
        if s.get(key):
            doc.append(f"- {label}: " + " / ".join(map(str, s[key])))
    if s.get("items"):
        doc.append("- カード: " + " / ".join(f"{h}({d})" for h, d in s["items"]))
    if s.get("stats"):
        doc.append("- 数値: " + " / ".join(f"{b}={l}" for b, l in s["stats"]))
    if s.get("table_rows"):
        doc.append("- 表: " + " / ".join(f"{m}→{a}" + ("★" if hl else "")
                                          for m, a, hl in s["table_rows"]))
    if s.get("milestones"):
        doc.append("- 積立: " + " / ".join(f"{y}={a}" for y, a in s["milestones"]))
    doc.append("")
with open(os.path.join(BASE, "07_source", "スライド構成.md"), "w",
          encoding="utf-8") as f:
    f.write("\n".join(doc))

print("docs written")
