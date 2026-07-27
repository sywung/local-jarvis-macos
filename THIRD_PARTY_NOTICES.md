# Third-party notices

AI Jarvis bundles third-party software under its respective licenses. This
notice is informational and does not replace the license texts shipped by the
individual components.

## Desktop runtime

- Electron, including Chromium and Node.js: MIT, BSD-style, and component
  licenses distributed with Electron.
- `ws`: MIT License.
- Lucide: ISC License.

## Python runtime

- FastAPI: MIT License.
- Uvicorn: BSD 3-Clause License.
- Pydantic and pydantic-settings: MIT License.
- Hugging Face Hub: Apache License 2.0.
- `hf-xet`: Apache License 2.0.
- tqdm: MPL 2.0 and MIT License.
- PyInstaller bootloader: GPL 2.0 or later with the PyInstaller bootloader
  exception.

## Inference runtime (macOS)

This macOS port does not bundle or build a native inference runtime. All
inference is delegated to a locally running **oMLX** server (an MLX model
server, engine = `mlx-vlm`) reached over its OpenAI-compatible HTTP API. oMLX
and the underlying `mlx` / `mlx-vlm` / `mlx-audio` projects remain subject to
their own licenses; install and run them separately.

## Model weights

Model weights are not included. You provide them to your local oMLX server:

- Vision / perception: `mlx-community/MiniCPM-o-4_5-4bit` (an MLX conversion of
  `openbmb/MiniCPM-o-4_5`).
- Speech-to-text: `mlx-community/whisper-large-v3-turbo`.

Those files remain subject to the respective model publishers' licenses and
usage terms.
