#!/bin/zsh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BRIDGE_SCRIPT="$REPO_ROOT/bridges/apple-notes-bridge.js"
PLIST_TARGET="$HOME/Library/LaunchAgents/com.multilingual-check.apple-notes-bridge.plist"
NODE_BIN="$(command -v node || true)"
SERVICE_LABEL="com.multilingual-check.apple-notes-bridge"

if [[ -z "$NODE_BIN" ]]; then
  echo "未找到 node，请先安装 Node.js 并确保 node 在 PATH 中可用。"
  exit 1
fi

if [[ ! -f "$BRIDGE_SCRIPT" ]]; then
  echo "未找到 bridge 脚本：$BRIDGE_SCRIPT"
  exit 1
fi

mkdir -p "$HOME/Library/LaunchAgents"

cat > "$PLIST_TARGET" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>Label</key>
    <string>${SERVICE_LABEL}</string>

    <key>ProgramArguments</key>
    <array>
      <string>${NODE_BIN}</string>
      <string>${BRIDGE_SCRIPT}</string>
    </array>

    <key>EnvironmentVariables</key>
    <dict>
      <key>APPLE_NOTES_BRIDGE_PORT</key>
      <string>3894</string>
    </dict>

    <key>RunAtLoad</key>
    <true/>

    <key>KeepAlive</key>
    <true/>

    <key>WorkingDirectory</key>
    <string>${REPO_ROOT}</string>

    <key>StandardOutPath</key>
    <string>/tmp/multilingual-check-apple-notes-bridge.log</string>

    <key>StandardErrorPath</key>
    <string>/tmp/multilingual-check-apple-notes-bridge.err.log</string>
  </dict>
</plist>
EOF

launchctl bootout "gui/$(id -u)/${SERVICE_LABEL}" >/dev/null 2>&1 || true
launchctl bootstrap "gui/$(id -u)" "$PLIST_TARGET"
launchctl kickstart -k "gui/$(id -u)/${SERVICE_LABEL}"

echo "已安装并启动 ${SERVICE_LABEL}"
echo "plist: $PLIST_TARGET"
echo "node: $NODE_BIN"
echo "bridge: $BRIDGE_SCRIPT"
echo "stdout: /tmp/multilingual-check-apple-notes-bridge.log"
echo "stderr: /tmp/multilingual-check-apple-notes-bridge.err.log"
