#!/bin/zsh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BRIDGE_SCRIPT="$REPO_ROOT/bridges/apple-notes-bridge.js"
NODE_BIN="${NODE_BIN:-$(command -v node || true)}"

if [[ -z "$NODE_BIN" ]]; then
  echo "未找到 node，请先安装 Node.js 并确保 node 在 PATH 中可用。"
  exit 1
fi

if [[ ! -f "$BRIDGE_SCRIPT" ]]; then
  echo "未找到 bridge 脚本：$BRIDGE_SCRIPT"
  exit 1
fi

echo "使用 Node: $NODE_BIN"
echo "启动 Bridge: $BRIDGE_SCRIPT"

exec "$NODE_BIN" "$BRIDGE_SCRIPT"
