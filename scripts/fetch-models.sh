#!/usr/bin/env bash
#
# Download the oMLX models AI Jarvis (macOS) needs, into ~/.omlx/models/, and
# patch the missing Whisper processor files.
#
# Why the patch: mlx-community/whisper-large-v3-turbo ships only config.json +
# weights.safetensors. mlx-audio needs the Hugging Face processor files
# (tokenizer / preprocessor / vocab / merges). We copy those from the original
# openai/whisper-large-v3-turbo repo into the SAME directory, without touching
# the MLX config.json or the weights. Otherwise oMLX reports "Processor not found".
#
# After running, RESTART oMLX (GUI) so it rescans ~/.omlx/models.
#
# Requires: huggingface-cli (installed with this project's backend deps:
#   pip install -e .   →   huggingface_hub provides `huggingface-cli`).
set -euo pipefail

MODELS_ROOT="${OMLX_MODELS_ROOT:-$HOME/.omlx/models}"
VISION_REPO="mlx-community/MiniCPM-o-4_5-4bit"
STT_REPO="mlx-community/whisper-large-v3-turbo"
STT_PROCESSOR_REPO="openai/whisper-large-v3-turbo"

if ! command -v huggingface-cli >/dev/null 2>&1; then
  echo "error: huggingface-cli not found. Install backend deps first:" >&2
  echo "       pip install -e .   (provides huggingface_hub / huggingface-cli)" >&2
  exit 1
fi

dl() { # repo, dest, [include globs...]
  local repo="$1" dest="$2"; shift 2
  local args=(download "$repo" --local-dir "$dest")
  for pat in "$@"; do args+=(--include "$pat"); done
  echo ">> $repo -> $dest ${*:+(only: $*)}"
  huggingface-cli "${args[@]}"
}

echo "== Vision model (~5.7G) =="
dl "$VISION_REPO" "$MODELS_ROOT/$VISION_REPO"

echo "== STT model (~1.5G) =="
dl "$STT_REPO" "$MODELS_ROOT/$STT_REPO"

echo "== Whisper processor patch (tokenizer/preprocessor only; not config/weights) =="
dl "$STT_PROCESSOR_REPO" "$MODELS_ROOT/$STT_REPO" \
  "tokenizer*.json" "vocab.json" "merges.txt" "preprocessor_config.json" \
  "special_tokens_map.json" "normalizer.json" "added_tokens.json" "generation_config.json"

echo
echo "Done. Now RESTART oMLX (GUI) so it picks up the new models."
echo "Verify:  curl -s http://127.0.0.1:9999/v1/models -H \"Authorization: Bearer \$JARVIS_OMLX_API_KEY\""
