# 日本で一番、自立した美容師が育つ会社へ

美容室スタッフ教育用のスライド資料+ナレーション付き動画プロジェクト。

「今の日本や美容業界の状況を正しく理解し、独立・結婚・会社所属など、
どの道を選んでも他人任せにせず、自分で人生を選べる美容師になろう」
というメッセージを、危機感と希望の両方が伝わるトーンで構成しています。

## 制作物一覧

| ファイル | 内容 |
|---|---|
| `01_slide/日本で一番自立した美容師が育つ会社.pptx` | スライド資料(24枚 / 16:9 / 黒×白×ダークグレー×ゴールド) |
| `02_narration/ナレーション原稿.md` | 全スライドのナレーション原稿(文単位・尺付き) |
| `03_audio/全編ナレーション.wav` | 全編ナレーション音声(48kHz mono / 約13分) |
| `03_audio/slides/slide01〜24.wav` | スライドごとの分割音声 |
| `04_video/日本で一番自立した美容師が育つ会社.mp4` | 完成動画(1920x1080 / 30fps / 字幕焼き込み / BGM控えめ) |
| `05_assets/slides_png/` | 動画用スライド画像(1920x1080 PNG) |
| `05_assets/bgm.wav` | 自動生成した著作権フリーのアンビエントBGM |
| `06_script/` | 再生成用スクリプト一式(下記) |
| `07_source/スライド構成.md` | スライド構成(全24枚の内容定義) |
| `07_source/字幕.srt` | 字幕データ(151ブロック / 1文=1ブロック / 2行以内) |

## 使用したツール

- **Python 3.11** + **python-pptx** — スライド生成
- **Open JTalk**(nitech-jp-atr503-m001 男性音声)— 日本語ナレーション合成(完全ローカル・APIキー不要)
- **LibreOffice Impress** — pptx → PDF 変換
- **Poppler (pdftoppm)** — PDF → 1920x1080 PNG
- **ffmpeg** — BGM生成・フェード・字幕焼き込み・動画合成
- フォント: **Noto Serif CJK JP**(見出し)/ **Noto Sans CJK JP**(本文・字幕)

※ 制作環境では VOICEVOX / edge-tts はネットワーク制限で利用不可だったため、
完全ローカルで動く Open JTalk を採用。VOICEVOX が使える環境での差し替え方法は後述。

## 実行環境

Ubuntu 24.04 で動作確認。必要パッケージ:

```bash
sudo apt-get install -y ffmpeg poppler-utils libreoffice-impress \
     fonts-noto-cjk fonts-noto-cjk-extra \
     open-jtalk open-jtalk-mecab-naist-jdic hts-voice-nitech-jp-atr503-m001
pip3 install python-pptx
```

## 再生成手順

```bash
cd 06_script
bash build_all.sh        # 全工程を一括実行(スライド→音声→字幕→画像→動画→品質チェック)
```

個別に実行する場合(番号順に依存関係あり):

| スクリプト | 役割 |
|---|---|
| `slides_data.py` | **単一ソースデータ**(スライド内容+ナレーション原稿) |
| `01_make_slides.py` | pptx 生成 |
| `02_make_audio.py` | 文単位でTTS→スライド別WAV+全編WAV+`timings.json` |
| `03_make_srt.py` | `timings.json` から字幕SRT生成(実測時間なのでズレない) |
| `04_make_docs.py` | ナレーション原稿.md / スライド構成.md 生成 |
| `05_render_slides.py` | pptx → PDF → 1920x1080 PNG |
| `06_make_video.py` | BGM生成+フェード付き動画合成+字幕焼き込み |
| `07_qc.py` | 自動品質チェック(枚数・尺・字幕重複・再生可否など) |

## 内容の修正方法

### スライド・ナレーションの修正

**`06_script/slides_data.py` を編集するだけ**で、スライド・音声・字幕・動画のすべてに反映されます。
編集後に `bash build_all.sh` を実行してください。

- スライドの文言: 各 `dict()` の `title` / `lines` / `items` など
- ナレーション: `narration` リスト(1文=1字幕ブロック。1文44文字以内推奨)
- 色・フォント: ファイル冒頭の `COLOR` / `FONT_SERIF` / `FONT_SANS`

### ナレーション音声の差し替え方法

1. **声の調整だけ**なら `02_make_audio.py` 冒頭の定数を変更:
   `RATE`(話速)/ `HALFTONE`(声の高さ、マイナスで低く)/ `ALPHA`(声質)
2. **VOICEVOX に差し替える**場合: VOICEVOX Engine を起動し、`02_make_audio.py` の
   `tts()` 関数を `audio_query` → `synthesis` API 呼び出しに書き換える
   (出力を 48kHz mono WAV に変換すれば他工程は無変更)。
3. **macOS 標準音声**の場合: `tts()` を
   `say -v Otoya -o out.aiff テキスト` + `ffmpeg -i out.aiff -ar 48000 -ac 1 out.wav`
   に書き換える。
4. **収録音声に差し替える**場合: `03_audio/slides/slideNN.wav` を同名で置き換え、
   `02_make_audio.py` を飛ばして `06_make_video.py` を実行…はNG
   (timings.json とズレるため)。収録音声の場合は文単位でなくスライド単位の
   タイミングになるよう `02_make_audio.py` の合成部分を読み込みに変更してください。

### スライド修正方法(pptxを直接編集する場合)

`01_slide/*.pptx` を PowerPoint / Keynote で直接編集も可能です。
ただし再生成すると上書きされるため、恒久的な修正は `slides_data.py` 側を推奨。
直接編集した場合は `05_render_slides.py` → `06_make_video.py` の順で動画へ反映できます。

### 動画再出力方法

```bash
cd 06_script
python3 05_render_slides.py   # スライドを変えた場合のみ
python3 06_make_video.py
```

- フェード時間: `06_make_video.py` の `FADE`(既定0.5秒)
- 余韻: `TAIL`(既定2.5秒)
- BGM音量: `BGM_GAIN`(既定0.12 ≒ ナレーションより約16dB小さい)。BGM不要なら
  `amix` の行から `[2:a]` を外すか `BGM_GAIN=0` に
- 字幕の見た目: `style` 変数(フォントサイズ・縁取り・下マージン)

### フォント変更方法

1. `fc-list :lang=ja` で環境にある日本語フォントを確認
2. `slides_data.py` の `FONT_SERIF` / `FONT_SANS` を変更(スライド用)
3. `06_make_video.py` の `style` 内 `FontName=` を変更(字幕用)

日本語グリフのないフォントを指定すると文字化け(豆腐)になるため、
必ず `fc-list :lang=ja` に出るフォント名を使ってください。

## エラー時の対処

| 症状 | 対処 |
|---|---|
| `soffice: command not found` | `sudo apt-get install libreoffice-impress`(coreだけでは不可) |
| LibreOffice が「source file could not be loaded」 | Impress未導入か日本語パス問題。`05_render_slides.py` はASCII名にコピーして回避済み |
| `open_jtalk: command not found` | 実行環境の項のパッケージを導入 |
| 音声が無音/欠ける | `python3 07_qc.py` で欠損スライドを特定 → `02_make_audio.py` を再実行 |
| 字幕が文字化け | fonts-noto-cjk を導入し `fc-cache -f` |
| ffmpeg `tremolo` エラー | ffmpeg 4系以前の場合は `06_make_video.py` のBGM部分の `tremolo` を削除 |
| 動画と音声がズレる | `02_make_audio.py` 実行後に必ず `03_make_srt.py` と `06_make_video.py` を再実行(timings.json が基準) |
| pptx が開けない | `python3 07_qc.py` で検証。再生成は `01_make_slides.py` |

## 品質チェック

`python3 06_script/07_qc.py` で以下を自動確認します:

- 文字化けなし/スライド枚数18〜24/音声欠けなし
- 動画と音声の尺一致/字幕タイミングの重複なし
- MP4正常デコード/pptx正常オープン/全成果物の存在/READMEの再生成手順

## 数値に関する注記

- スライド中の報酬額(月25〜40万円、月50万円前後 等)は**社内の現状・目標値**であり、
  業界統計ではありません(2026年時点の社内目安)。
- 積立シミュレーション(年間100万円→10年で1,000万円 等)は**投資利益を含めない単純計算**です。
- 物価+20%→月40万円相当が月48万円という試算も**単純計算**であり、
  税・社会保険料や支出構造の変化までは含みません(スライド8に注記あり)。
