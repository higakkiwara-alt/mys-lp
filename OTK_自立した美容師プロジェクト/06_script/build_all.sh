#!/usr/bin/env bash
# =========================================================
# build_all.sh — すべての成果物をゼロから再生成するスクリプト
#
# 使い方:
#   cd 06_script && bash build_all.sh
#
# 必要環境 (Ubuntu/Debian の例):
#   sudo apt-get install -y ffmpeg poppler-utils libreoffice-impress \
#        fonts-noto-cjk fonts-noto-cjk-extra \
#        open-jtalk open-jtalk-mecab-naist-jdic hts-voice-nitech-jp-atr503-m001
#   pip3 install python-pptx
#
# macOS の場合:
#   brew install ffmpeg poppler open-jtalk libreoffice
#   (音声は 02_make_audio.py の tts() を macOS の `say -v Otoya` 等に
#    差し替えても動作します。README「音声変更方法」参照)
# =========================================================
set -euo pipefail
cd "$(dirname "$0")"

echo "== [1/6] スライド (pptx) 生成 =="
python3 01_make_slides.py

echo "== [2/6] ナレーション音声生成 (Open JTalk) =="
python3 02_make_audio.py

echo "== [3/6] 字幕 (SRT) 生成 =="
python3 03_make_srt.py

echo "== [4/6] 原稿・構成ドキュメント生成 =="
python3 04_make_docs.py

echo "== [5/6] スライド画像化 (1920x1080 PNG) =="
python3 05_render_slides.py

echo "== [6/6] 動画合成 (MP4) =="
python3 06_make_video.py

echo "== 品質チェック =="
python3 07_qc.py

echo ""
echo "完成: 04_video/日本で一番自立した美容師が育つ会社.mp4"
