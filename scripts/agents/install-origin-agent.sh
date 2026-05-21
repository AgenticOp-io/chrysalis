#!/usr/bin/env bash
# Install chrysalis-origin-scan on a legacy / origin host (local SSH session).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTALL_DIR="${CHRYSALIS_AGENT_DIR:-$HOME/.local/bin}"
TARGET="$INSTALL_DIR/chrysalis-origin-scan"

mkdir -p "$INSTALL_DIR"
cp "$SCRIPT_DIR/chrysalis-origin-scan.sh" "$TARGET"
chmod +x "$TARGET"

echo "Installed: $TARGET"
echo "Usage: chrysalis-origin-scan /var/www/my-app"
echo "Hub invokes via SSH when this binary is on the origin PATH."
