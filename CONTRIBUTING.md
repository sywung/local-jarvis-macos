# Contributing

Thanks for your interest! This is a **macOS-only** port of
[LYiHub/pub-local-jarvis](https://github.com/LYiHub/pub-local-jarvis). Changes to
the Windows app belong upstream.

## Scope

- Keep the port **macOS-native**: no C++ worker, no `llama.cpp` build, no CUDA.
  All inference is delegated to a local oMLX server.
- The perception prompt in `src/jarvis_backend/native/mac_client.py` is ported
  verbatim from the upstream C++ worker. Keep it in sync unless you know why.

## Dev setup

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -e ".[test]" ruff
cd desktop && npm install && cd ..
cp .env.example .env   # set JARVIS_OMLX_API_KEY
```

See [SETUP-macos.md](SETUP-macos.md) for oMLX models, audio routing, and the
Screen Recording (TCC) permission.

## Before opening a PR

Run everything CI runs:

```bash
ruff check .
pytest -q
cd desktop && npm test
```

- Match the existing style; `ruff` enforces formatting/lint rules.
- Add or update tests for behavior changes.
- Never commit secrets. The oMLX API key comes from the environment / `.env`
  (gitignored), never from source.

## Commits

Conventional-commit style is appreciated (`feat:`, `fix:`, `docs:`, …), but
clear messages matter more than strict formatting.
