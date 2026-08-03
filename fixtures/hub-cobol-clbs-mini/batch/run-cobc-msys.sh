#!/usr/bin/env bash
set -euo pipefail
export PATH="/clangarm64/bin:/usr/bin:/bin:$PATH"
cobc --version
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SRC="$SCRIPT_DIR/CLBSMATH.cbl"
OUT="$SCRIPT_DIR/.chrysalis-cobc"
/usr/bin/mkdir -p "$OUT"
cobc -x -free -o "$OUT/CLBSMATH.exe" "$SRC"
"$OUT/CLBSMATH.exe"
