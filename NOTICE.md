# NOTICE

This project is a **macOS port** of AI Jarvis.

- Upstream: [LYiHub/pub-local-jarvis](https://github.com/LYiHub/pub-local-jarvis)
  — a Windows-only local desktop AI companion. Licensed under the MIT License;
  the original copyright notice is retained in [`LICENSE`](LICENSE).

## What this port changes

The upstream project relies on a Windows-native C++ worker (DXGI screen
capture + WASAPI system-audio loopback) and a bundled `llama.cpp-omni`
inference runtime. None of that is portable to macOS.

This port removes the entire native C++ / `llama.cpp` layer and replaces it
with a single pure-Python client (`src/jarvis_backend/native/mac_client.py`)
that:

- captures the screen via `screencapture` and delegates vision to a local
  **oMLX** server (MiniCPM-o), and
- captures system audio via BlackHole + `ffmpeg` and transcribes it via the
  oMLX Whisper endpoint.

The FastAPI backend, orchestration logic, and Electron desktop UI are reused
from upstream with macOS-specific wiring. Windows launch scripts, the native
C++ sources, and the vendored `llama.cpp-omni` tree have been removed.

Third-party components and model weights are listed in
[`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).
