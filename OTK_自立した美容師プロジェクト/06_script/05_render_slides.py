# -*- coding: utf-8 -*-
"""
05_render_slides.py — pptx を LibreOffice で PDF 化し、
pdftoppm で 1920x1080 PNG に変換する。
出力: 05_assets/slides_png/slide-01.png 〜 slide-24.png
"""
import glob
import os
import shutil
import subprocess
import sys
import tempfile

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PPTX = os.path.join(BASE, "01_slide", "日本で一番自立した美容師が育つ会社.pptx")
OUTDIR = os.path.join(BASE, "05_assets", "slides_png")

os.makedirs(OUTDIR, exist_ok=True)
tmp = tempfile.mkdtemp(prefix="render_")
# LibreOffice は日本語ファイル名で失敗する環境があるため ASCII 名にコピー
deck = os.path.join(tmp, "deck.pptx")
shutil.copy(PPTX, deck)

soffice = shutil.which("soffice") or shutil.which("libreoffice")
subprocess.run(
    [soffice, "--headless",
     f"-env:UserInstallation=file://{tmp}/lo_profile",
     "--convert-to", "pdf", "--outdir", tmp, deck],
    check=True, capture_output=True, timeout=300)

pdf = os.path.join(tmp, "deck.pdf")
if not os.path.exists(pdf):
    sys.exit("PDF conversion failed")

for f in glob.glob(os.path.join(OUTDIR, "slide-*.png")):
    os.remove(f)
subprocess.run(
    ["pdftoppm", "-png", "-scale-to-x", "1920", "-scale-to-y", "1080",
     pdf, os.path.join(OUTDIR, "slide")],
    check=True, timeout=600)

pngs = sorted(glob.glob(os.path.join(OUTDIR, "slide-*.png")))
print(f"{len(pngs)} PNGs -> {OUTDIR}")
shutil.rmtree(tmp, ignore_errors=True)
