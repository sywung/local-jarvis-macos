# Bug Status

Last updated: 2026-07-27

## Fixed

- Historical daily memory generation now uses the selected date.
- Daily memory and pet messages are converted from Simplified Chinese to Traditional Chinese.
- Daily memory summaries are split into readable time-based paragraphs.
- macOS uses `Command+M`; other platforms use `Control+M`.
- Missing memory summaries no longer cause `jarvis:memory-status` to fail.
- The desktop pet supports the RD developer companion profile and records environment, language, project, tests, blockers, and progress.

## Configuration

- `JARVIS_OMLX_CHAT_MODEL` must point to a text-capable model for pet chat.
- `MiniCPM-o-4_5-5bit` is primarily a vision/audio model and may fail for text-only pet chat requests.
- Use a text model such as `Qwen3.6-27B-MLX-8bit` for `JARVIS_OMLX_CHAT_MODEL`.
- Keep local settings in `.env`; do not commit `.env` or runtime data.

## Needs Verification

- End-to-end pet chat with the selected local OMLX model.
- Traditional Chinese output from all generated pet speech and model responses.
- Daily memory paragraph layout across long multi-session days.

## Reporting a New Bug

Please include the macOS version, model name, relevant `.env` keys without secrets, application logs, and steps to reproduce.
