#!/usr/bin/env bash
#
# run-macos.sh — launch the macOS port of AI Jarvis.
#
# Starts the Electron desktop app, which in turn spawns the Python backend
# (native.mode = "macos") from the local venv. All inference is delegated to a
# local oMLX server; there is no C++ worker on macOS.
#
# Prerequisites (one-time):
#   - oMLX running and serving on :9999 with a MiniCPM-o vision model and a
#     Whisper STT model registered under ~/.omlx/models.
#   - Python venv:   python3 -m venv .venv && ./.venv/bin/pip install -e .
#   - Desktop deps:  (cd desktop && npm install)   # needs Node LTS
#   - For system-audio duplex: BlackHole installed and routed into a
#     Multi-Output Device selected as the system output.
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

# --- Configuration (override via environment or a local .env) ---------------
# Load ~/git/local-jarvis-macos/.env if present (copy .env.example first).
if [ -f "$ROOT/.env" ]; then
  set -a
  . "$ROOT/.env"
  set +a
fi

export JARVIS_OMLX_BASE_URL="${JARVIS_OMLX_BASE_URL:-http://127.0.0.1:9999}"
export JARVIS_OMLX_API_KEY="${JARVIS_OMLX_API_KEY:-}"
export JARVIS_OMLX_VISION_MODEL="${JARVIS_OMLX_VISION_MODEL:-MiniCPM-o-4_5-5bit}"
# MiniCPM-o omni is for vision; text-only pet chat uses a dedicated text LLM.
export JARVIS_OMLX_CHAT_MODEL="${JARVIS_OMLX_CHAT_MODEL:-Qwen3.6-35B-A3B-MLX-4bit}"
export JARVIS_OMLX_STT_MODEL="${JARVIS_OMLX_STT_MODEL:-whisper-large-v3-turbo}"
export JARVIS_AUDIO_DEVICE="${JARVIS_AUDIO_DEVICE:-BlackHole 2ch}"
export JARVIS_PERCEPTION_INTERVAL="${JARVIS_PERCEPTION_INTERVAL:-6}"
export JARVIS_AUTO_START="${JARVIS_AUTO_START:-1}"

# --- Preflight checks -------------------------------------------------------
if [[ ! -x ".venv/bin/jarvis-backend" ]]; then
  echo "error: .venv not set up. Run:" >&2
  echo "       python3 -m venv .venv && ./.venv/bin/pip install -e ." >&2
  exit 1
fi

if [[ ! -d "desktop/node_modules/electron" ]]; then
  echo "error: desktop dependencies missing. Run: (cd desktop && npm install)" >&2
  exit 1
fi

if ! curl -fsS -m 3 -H "Authorization: Bearer ${JARVIS_OMLX_API_KEY}" \
     "${JARVIS_OMLX_BASE_URL}/v1/models" >/dev/null 2>&1; then
  echo "warning: oMLX not reachable at ${JARVIS_OMLX_BASE_URL}." >&2
  echo "         Start oMLX and ensure the vision + STT models are registered." >&2
fi

# Evict a stale jarvis-backend from a DIFFERENT checkout squatting on the dev
# port. In dev mode the backend listens on 127.0.0.1:8900 and desktop's
# backend-manager.js reuses ANY healthy backend already there — so a leftover
# backend from another repo (e.g. ~/git/local-jarvis) would hijack this app and
# read/write the wrong memory store. Our own backend is left alone (reuse is
# fine); non-jarvis processes are only reported, never killed.
DEV_PORT="${JARVIS_DEV_PORT:-8900}"
if command -v lsof >/dev/null 2>&1; then
  for pid in $(lsof -nP -iTCP:"${DEV_PORT}" -sTCP:LISTEN -t 2>/dev/null || true); do
    cmd="$(ps -p "${pid}" -o command= 2>/dev/null || true)"
    case "${cmd}" in
      "")
        ;;
      *jarvis-backend*)
        if [[ "${cmd}" != *"${ROOT}/"* ]]; then
          echo "notice: evicting foreign jarvis-backend on :${DEV_PORT} (pid ${pid})" >&2
          echo "        ${cmd}" >&2
          kill "${pid}" 2>/dev/null || true
          for _ in 1 2 3 4 5; do kill -0 "${pid}" 2>/dev/null || break; sleep 0.3; done
          if kill -0 "${pid}" 2>/dev/null; then kill -9 "${pid}" 2>/dev/null || true; fi
        fi
        ;;
      *)
        echo "warning: :${DEV_PORT} held by a non-jarvis process (pid ${pid}); leaving it alone." >&2
        echo "         ${cmd}" >&2
        ;;
    esac
  done
fi

echo "Launching AI Jarvis (macOS / oMLX)…"
echo "  vision=${JARVIS_OMLX_VISION_MODEL}  chat=${JARVIS_OMLX_CHAT_MODEL}  stt=${JARVIS_OMLX_STT_MODEL}"
echo "  audio=${JARVIS_AUDIO_DEVICE}  perception=${JARVIS_PERCEPTION_INTERVAL}s"

exec npm --prefix desktop start
