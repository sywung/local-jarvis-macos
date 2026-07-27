<div align="center">
  <img src="src/jarvis_backend/assets/jarvis-character-reference.png" width="160" alt="AI Jarvis desktop pet">
  <h1>AI Jarvis · macOS</h1>
  <p><strong>本機優先的 macOS 桌面助手：螢幕感知、系統音訊、RD 開發陪伴與每日記憶</strong></p>
  <p>Apple Silicon · oMLX / MLX · Electron · FastAPI · on-device inference</p>
  <p><a href="#繁體中文">繁體中文</a> · <a href="#english">English</a></p>
</div>

> This repository is a macOS port of [LYiHub/pub-local-jarvis](https://github.com/LYiHub/pub-local-jarvis). See [`NOTICE.md`](NOTICE.md) for attribution and porting scope.

## 繁體中文

AI Jarvis 使用本機多模態模型理解螢幕、系統播放的聲音與工作情境，在適合的時機透過桌寵、對話、遊戲陪伴、課程記錄或每日記憶提供協助。

### Windows 與 macOS 差異

本專案是 macOS 移植版，不是把 Windows 執行檔直接搬到 Mac。兩個版本共用主要的 FastAPI 編排、記憶、課程與 Electron 介面，但底層擷取與推論方式不同。

| 項目 | Windows 上游版 | macOS 本專案 |
| --- | --- | --- |
| 螢幕擷取 | DXGI 原生擷取 | `screencapture`；需要螢幕錄製權限 |
| 系統音訊 | WASAPI loopback | BlackHole + `ffmpeg`；需建立多重輸出裝置 |
| 推論執行 | 內嵌 `llama.cpp-omni`，可使用 CUDA | 委派給本機 oMLX / MLX，使用 Apple Silicon Metal |
| 編譯需求 | C++、CMake、Visual Studio／CUDA 可能需要編譯 | 不需要 C++、CMake 或 CUDA |
| 模型管理 | 隨 Windows 執行環境或安裝流程處理 | 使用者自行在 oMLX 載入模型 |
| 桌寵與記憶 | 支援 | 支援；macOS 版新增繁體中文與 RD 開發者陪伴環境 |
| 快捷鍵 | Windows 鍵盤慣例 | `Cmd+M` 開啟桌寵對話 |
| 安裝便利性 | Windows 安裝程式整合度較高 | 需自行設定 Python、Node、oMLX、權限與音訊路由 |

#### macOS 優點

- 不需要編譯 Windows 原生 C++ worker 或 CUDA runtime。
- Apple Silicon 使用 Metal 進行本機推論，資料預設留在本機。
- 可使用不同模型分工：視覺模型負責感知、文字模型負責聊天與摘要、Whisper 負責語音轉文字。
- 適合 RD 工作流，可記錄開發環境、語言、框架、專案、測試、建置與除錯狀態。

#### macOS 取捨與限制

- 必須自行安裝並維護 oMLX 與模型，首次設定比 Windows 安裝程式複雜。
- 螢幕感知受 macOS TCC 螢幕錄製權限影響；從終端機與 `.app` 啟動時，授權對象可能不同。
- 系統音訊沒有簡單的官方 loopback，需安裝 BlackHole 並設定多重輸出裝置。
- 模型效能與可用記憶體取決於 Mac 型號與所載入的 MLX 模型；大型模型可能佔用大量統一記憶體。
- oMLX、MLX 模型或 macOS API 的相容性變更，可能需要額外調整設定。

### 功能

- **桌面感知**：使用本機視覺模型理解目前畫面與場景。
- **RD 開發者陪伴**：記錄 macOS、IDE、終端機、程式語言、框架、專案、測試、建置、除錯與阻塞點，並在完成里程碑或長時間卡住時提供具體鼓勵。
- **自然對話**：macOS 使用 `Cmd+M` 開啟桌寵對話；純文字聊天使用獨立文字模型。
- **自訂陪伴環境**：可建立 RD、遊戲或課程專屬提示方案。
- **每日記憶**：將穩定的活動感知整理成時間軸與繁體中文每日回顧。
- **隱私模式**：雙擊桌寵即可暫停或恢復感知。

### 系統需求

- macOS 13+、Apple Silicon Mac
- [oMLX](https://github.com/madskjeldgaard/oMLX) 或相容 OpenAI API 的本機模型服務，預設 `127.0.0.1:9999`
- Python 3.12+、Node.js LTS、`ffmpeg`
- `BlackHole 2ch`（需要系統音訊感知時）

### 快速開始

```bash
git clone <your-repository-url>
cd local-jarvis-macos
python3 -m venv .venv
.venv/bin/pip install -e ".[test]"
cp .env.example .env
# 編輯 .env，填入 JARVIS_OMLX_API_KEY 與模型名稱
cd desktop && npm install && cd ..
./run-macos.sh
```

完整模型、權限、音訊與疑難排解請看 [`SETUP-macos.md`](SETUP-macos.md)。

### 建議模型設定

```env
JARVIS_OMLX_VISION_MODEL=MiniCPM-o-4_5-5bit
JARVIS_OMLX_CHAT_MODEL=Qwen3.6-35B-A3B-MLX-4bit
JARVIS_OMLX_STT_MODEL=whisper-large-v3-turbo
```

視覺模型負責螢幕感知；文字模型負責 `Cmd+M` 對話與每日摘要；Whisper 負責語音轉文字。MiniCPM-o 目前不適合純文字聊天，請不要把 `JARVIS_OMLX_CHAT_MODEL` 設為 MiniCPM-o。

### 隱私

- 螢幕與系統音訊預設只用於即時本機推論，不會自動上傳雲端。
- 活動記憶只保存整理後的文字事件；原始畫面與音訊不寫入長期記憶。
- `memory/`、`.env`、模型、虛擬環境與快取均被 Git 忽略。
- 若自行設定第三方圖片生成 API，該請求會依你選用的服務處理。

### 開發與測試

```bash
./.venv/bin/ruff check .
./.venv/bin/pytest -q
(cd desktop && npm test)
```

請先閱讀 [`CONTRIBUTING.md`](CONTRIBUTING.md)。

## English

AI Jarvis is a local-first macOS desktop companion for screen awareness, system audio, developer focus, gaming, course notes, and daily memory. Perception and core inference stay on your machine through a local oMLX-compatible server.

### Highlights

- **Screen awareness** through a local vision model.
- **RD Developer companion** that records the verified environment, language, framework, project, task, tests, builds, debugging state, blockers, and progress, with restrained encouragement at meaningful moments.
- **Pet chat** via `Cmd+M` on macOS. Text chat uses a dedicated text model rather than the vision model.
- **Custom companion profiles** for developer work, games, and courses.
- **Daily memory** with an activity timeline and Traditional Chinese summaries.
- **Privacy mode** by double-clicking the pet.

### Quick start

```bash
python3 -m venv .venv
.venv/bin/pip install -e ".[test]"
cp .env.example .env
cd desktop && npm install && cd ..
./run-macos.sh
```

See [`SETUP-macos.md`](SETUP-macos.md) for model setup, permissions, audio routing, and troubleshooting.

### Credits and license

- Ported from [LYiHub/pub-local-jarvis](https://github.com/LYiHub/pub-local-jarvis).
- Source code is provided under the [MIT License](LICENSE).
- Third-party software and model terms are listed in [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).
