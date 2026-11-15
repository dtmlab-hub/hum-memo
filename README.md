# 鼻歌メモ（hum-memo）

鼻歌を録音 → Basic Pitch で MIDI 化 → ピアノ風に再生 → `.mid` 書き出し。仕様は MVP開発仕様書 v0.2。

- すべて端末内で処理（音声・モデル要求とも外部へ送らない。モデルは `public/model/` に同梱）
- 録音停止 → **先に音声を IndexedDB へ保存** → その後に解析（解析が失敗しても音声は残る）
- MIDI は `raw`（Basic Pitch の推定そのまま）と `corrected`（補正版）を両方保存。補正版はRawから毎回作り直す
- 補正（`src/analysis/correctNotes.ts`）：強い音に重なった弱い音を消す → 60ms未満を消す → 150ms未満の断片だけ同じ音とつなぐ → 重なりを切って単旋律にする。スケールスナップはしない
- 画面：録音＋一覧（検索・並び順）／メモ詳細（原音・MIDI再生、補正版⇔Raw、タイトル・メモ編集、書き出し、削除）

## 動かす

```bash
cd apps/hum-memo
npm install
npm test            # 単体テスト
npm run dev         # PCブラウザで確認（http://localhost:5173）
npm run dev:iphone  # iPhoneで確認（HTTPS。同じWi-FiのiPhoneで https://<MacのIP>:5173 を開く）
```


iPhoneでは証明書の警告が出るので「詳細を表示 → このWebサイトを閲覧」で進む（自己署名のため）。

## 構成

| 場所 | 役割 |
|---|---|
| `src/audio/recorder.ts` | MediaRecorder。MIME type は `audio/mp4`→`webm` の順に対応形式を選ぶ |
| `src/audio/decode.ts` | デコード＋モノラル22050Hzへ変換（Basic Pitch入力） |
| `src/workers/transcription.worker.ts` | Basic Pitch 推論（WebGL→無理ならCPU） |
| `src/analysis/basicPitch.ts` | 推定パラメータ（Phase 2で調整）と NoteEvent 変換 |
| `src/midi/generateMidi.ts` | `.mid` 生成（テンポ推定なし・仮120BPM・秒位置を保持） |
| `src/midi/playMidi.ts` | MIDI再生（Tone.js シンセ。サンプル取得なし） |
| `src/storage/` | `MemoRepository` 抽象＋IndexedDB実装 |

## 公開（GitHub Pages）

`main` に push すると `.github/workflows/pages.yml` がテスト→ビルド→公開まで行う。公開先は `https://dtmlab-hub.github.io/hum-memo/`。
初回だけ、リポジトリの Settings → Pages → Source を「GitHub Actions」にする。

iPhoneのSafariで上のURLを開き、共有ボタン →「ホーム画面に追加」で入れる。一度開けば機内モードでも起動・解析できる。
