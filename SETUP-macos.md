# AI Jarvis macOS 設定指南

本文件說明從乾淨 clone 到可用的 macOS 設定。移植背景與授權資訊請閱讀 [`NOTICE.md`](NOTICE.md)。

## 需求

- macOS 13+、Apple Silicon
- Python 3.12+、Node.js LTS
- [oMLX](https://github.com/madskjeldgaard/oMLX) 或相容服務，API 預設 `http://127.0.0.1:9999`
- Homebrew、`ffmpeg`
- `BlackHole 2ch`（需要系統音訊時）

## 安裝

```bash
brew install ffmpeg
brew install blackhole-2ch
python3 -m venv .venv
.venv/bin/pip install -e ".[test]"
cp .env.example .env
cd desktop && npm install && cd ..
```

在 `.env` 設定：

```env
JARVIS_OMLX_BASE_URL=http://127.0.0.1:9999
JARVIS_OMLX_API_KEY=你的_oMLX_API_KEY
JARVIS_OMLX_VISION_MODEL=MiniCPM-o-4_5-5bit
JARVIS_OMLX_CHAT_MODEL=Qwen3.6-35B-A3B-MLX-4bit
JARVIS_OMLX_STT_MODEL=whisper-large-v3-turbo
JARVIS_AUDIO_DEVICE="BlackHole 2ch"
```

含空格的值必須保留引號。`.env` 已被 Git 忽略，請勿提交。

## 模型

在 oMLX 註冊並載入：

- `MiniCPM-o-4_5-5bit`：螢幕視覺感知
- `Qwen3.6-35B-A3B-MLX-4bit`：桌寵對話與文字摘要
- `whisper-large-v3-turbo`：系統音訊轉文字

確認 API 與模型：

```bash
curl -sS -H "Authorization: Bearer $JARVIS_OMLX_API_KEY" \
  http://127.0.0.1:9999/v1/models
```

MiniCPM-o 目前不適合純文字聊天，請將 `JARVIS_OMLX_CHAT_MODEL` 保持為文字模型。

## 系統音訊

若需要 duplex 系統音訊感知：

1. 開啟「音訊 MIDI 設定」。
2. 建立「多重輸出裝置」，同時勾選揚聲器與 `BlackHole 2ch`。
3. 將多重輸出裝置設為系統輸出。
4. 若名稱不同，設定 `JARVIS_AUDIO_DEVICE`。

確認裝置：

```bash
ffmpeg -f avfoundation -list_devices true -i ""
```

## 螢幕錄製權限

到「系統設定 → 隱私權與安全性 → 螢幕錄製」授權實際啟動 AI Jarvis 的程式：

- 從終端機啟動：授權你使用的終端機。
- 從 `.app` 啟動：授權 `AI Jarvis.app` 與 Electron app。

授權後完全退出並重新啟動 App。`screencapture` 錯誤通常代表 TCC 權限不足。

## 啟動與驗證

```bash
./run-macos.sh
curl -sS http://127.0.0.1:8900/api/v1/health
```

預期看到 `native_connected: true`。macOS 桌寵快捷鍵為 `Cmd+M`；雙擊桌寵可切換隱私模式。

## 疑難排解

| 症狀 | 處理方式 |
| --- | --- |
| oMLX connection refused | 開啟 oMLX，確認 API Server 監聽 `9999`。 |
| 401 Unauthorized | 檢查 `.env` 的 `JARVIS_OMLX_API_KEY`。 |
| pet chat 回覆失敗 | 確認聊天模型是 `Qwen3.6-35B-A3B-MLX-4bit`，不要使用 MiniCPM-o；重啟 App。 |
| `Processor not found` | 為 Whisper 模型補齊 tokenizer、vocab、merges 與 `preprocessor_config.json`。 |
| BlackHole 沒有聲音 | 確認系統輸出使用多重輸出裝置。 |
| `screencapture` 失敗 | 檢查螢幕錄製權限，授權實際負責啟動的 App。 |
| `2ch: command not found` | 將 `JARVIS_AUDIO_DEVICE` 寫成 `"BlackHole 2ch"`。 |
