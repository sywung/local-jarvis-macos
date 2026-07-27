#!/usr/bin/env bash
#
# make-macos-app.sh — build a lightweight "AI Jarvis.app" launcher bundle.
#
# The bundle is a thin LSUIElement stub (no Dock icon) that runs
# run-macos.sh, which starts the Electron desktop app. Electron then shows its
# own menu-bar tray icon and desktop pet. Rebuild any time after moving the
# repo or changing the icon.
#
#   ./scripts/make-macos-app.sh            # installs to ~/Applications
#   APP_DIR=/Applications ./scripts/make-macos-app.sh
#
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_DIR="${APP_DIR:-$HOME/Applications}"
APP="$APP_DIR/AI Jarvis.app"
ICON_SRC="${ICON_SRC:-$REPO/desktop/assets/icon.png}"

mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"

# --- Info.plist -------------------------------------------------------------
cat > "$APP/Contents/Info.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>CFBundleName</key><string>AI Jarvis</string>
	<key>CFBundleDisplayName</key><string>AI Jarvis</string>
	<key>CFBundleIdentifier</key><string>com.sywung.aijarvis.launcher</string>
	<key>CFBundleVersion</key><string>0.1.2</string>
	<key>CFBundleShortVersionString</key><string>0.1.2</string>
	<key>CFBundlePackageType</key><string>APPL</string>
	<key>CFBundleExecutable</key><string>AI Jarvis</string>
	<key>CFBundleIconFile</key><string>AppIcon</string>
	<key>LSMinimumSystemVersion</key><string>13.0</string>
	<key>LSUIElement</key><true/>
	<key>NSHighResolutionCapable</key><true/>
</dict>
</plist>
PLIST

# --- launcher stub ----------------------------------------------------------
# GUI apps inherit a minimal PATH, so we restore volta/homebrew locations.
cat > "$APP/Contents/MacOS/AI Jarvis" <<EOF
#!/bin/bash
export PATH="\$HOME/.volta/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
REPO="$REPO"
if [[ ! -x "\$REPO/run-macos.sh" ]]; then
  osascript -e 'display alert "AI Jarvis" message "run-macos.sh not found in the repo"'
  exit 1
fi
cd "\$REPO" || exit 1
exec ./run-macos.sh
EOF
chmod +x "$APP/Contents/MacOS/AI Jarvis"

# --- icon -------------------------------------------------------------------
if [[ -f "$ICON_SRC" ]]; then
  ISET="$(mktemp -d)/AppIcon.iconset"; mkdir -p "$ISET"
  sips -s format png -z 1024 1024 "$ICON_SRC" --out "$ISET/base.png" >/dev/null
  for s in 16 32 128 256 512; do
    sips -z "$s" "$s" "$ISET/base.png" --out "$ISET/icon_${s}x${s}.png" >/dev/null
    sips -z "$((s*2))" "$((s*2))" "$ISET/base.png" --out "$ISET/icon_${s}x${s}@2x.png" >/dev/null
  done
  mv "$ISET/base.png" "$ISET/icon_512x512@2x.png"
  iconutil -c icns "$ISET" -o "$APP/Contents/Resources/AppIcon.icns"
fi

# --- register with Launch Services -----------------------------------------
LSREG="/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister"
[[ -x "$LSREG" ]] && "$LSREG" -f "$APP" || true
touch "$APP"

echo "Built: $APP"
echo "Launch with: open \"$APP\"  (or double-click in Finder)"
