#!/usr/bin/env bash
# Prepare a legacy origin for Chrysalis hub workflows (run on origin via SSH).
# Installs chrysalis-origin-scan and lays down capture/trace instructions (no auto php.ini changes).
# Usage: chrysalis-origin-bootstrap.sh <app-root> [agents-dir]
set -euo pipefail

ROOT="${1:-.}"
AGENTS_DIR="${2:-$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)}"
OBSERVE_HOME="${CHRYSALIS_OBSERVE_HOME:-$HOME/.chrysalis}"
TRACE_DIR="${CHRYSALIS_TRACE_DIR:-/var/chrysalis-traces}"

mkdir -p "$OBSERVE_HOME/observe"
INSTALL_DIR="${CHRYSALIS_AGENT_DIR:-$HOME/.local/bin}"
mkdir -p "$INSTALL_DIR"

if [ -f "$AGENTS_DIR/install-origin-agent.sh" ]; then
  CHRYSALIS_AGENT_DIR="$INSTALL_DIR" bash "$AGENTS_DIR/install-origin-agent.sh"
fi

SCAN_AGENT="$INSTALL_DIR/chrysalis-origin-scan"
SCAN_OK=false
CHRYS_SCAN_OK=false
if [ -x "$SCAN_AGENT" ]; then
  CHRYS_SCAN_OK=true
fi

CHRYS_PHP_OK=false
PHP_LINE=""
if command -v php >/dev/null 2>&1; then
  CHRYS_PHP_OK=true
  PHP_LINE="$(php -v 2>/dev/null | head -1 || true)"
fi

mkdir -p "$TRACE_DIR" 2>/dev/null || TRACE_DIR="$OBSERVE_HOME/traces"
mkdir -p "$TRACE_DIR" 2>/dev/null || true

INSTRUCTIONS="$OBSERVE_HOME/observe/CAPTURE-ON-ORIGIN.md"
cat >"$INSTRUCTIONS" <<EOF
# Chrysalis observe on this host

Translation runs on the **hub server** (code is pulled via SSH). To record **real HTTP/SQL/session traffic**
from this PHP app, enable Oracle capture on a **staging** instance of this tree:

1. Copy \`packages/oracle-php\` from the Chrysalis repo to this host (or mount the same deploy tree).
2. Export a writable trace directory:

   export CHRYSALIS_TRACE_DIR=$TRACE_DIR

3. Start PHP with the bootstrap (from the Chrysalis repo root on this host):

   php -d auto_prepend_file=/path/to/chrysalis/packages/oracle-php/src/bootstrap.php \\
       -S 127.0.0.1:8080 -t $ROOT

4. Send traffic to that server; traces land under \`\$CHRYSALIS_TRACE_DIR\`.
5. Copy traces to the hub and run \`chrysalis verify\` against the emitted TypeScript project.

Hub cannot see live traffic without capture on a host where PHP executes requests.
EOF

if [ ! -f "$ROOT/chrysalis.observe.json" ] && [ -d "$ROOT" ]; then
  cat >"$ROOT/chrysalis.observe.json" <<'JSON'
{
  "rules": [
    { "path": "request.post.password", "kind": "mask" },
    { "path": "request.post.token", "kind": "mask" },
    { "path": "sql.row.password", "kind": "mask" }
  ]
}
JSON
fi

ENV_HINTS=""
if [ -f "$ROOT/.env" ]; then
  ENV_HINTS="$(grep -E '^(DB_|DATABASE_|REDIS_|CHRYSALIS_)' "$ROOT/.env" 2>/dev/null | head -20 | tr '\n' ';' || true)"
fi

export CHRYS_ROOT="$ROOT" CHRYS_SCAN_AGENT="$SCAN_AGENT" CHRYS_OBSERVE_HOME="$OBSERVE_HOME"
export CHRYS_TRACE_DIR="$TRACE_DIR" CHRYS_INSTRUCTIONS="$INSTRUCTIONS" CHRYS_ENV_HINTS="$ENV_HINTS"
export CHRYS_SCAN_OK="$CHRYS_SCAN_OK" CHRYS_PHP_OK="$CHRYS_PHP_OK" CHRYS_PHP_LINE="$PHP_LINE"
python3 - <<'PY'
import json, os
from datetime import datetime, timezone

root = os.environ.get("CHRYS_ROOT", ".")
app_root = os.path.abspath(root) if os.path.isdir(root) else root
observe_cfg = os.path.join(app_root, "chrysalis.observe.json") if os.path.isdir(root) else None

print(json.dumps({
  "kind": "chrysalis.origin.prep",
  "schemaVersion": 0,
  "scannedAt": datetime.now(timezone.utc).isoformat(),
  "appRoot": app_root,
  "scanAgentInstalled": os.environ.get("CHRYS_SCAN_OK") == "true",
  "scanAgentPath": os.environ.get("CHRYS_SCAN_AGENT", ""),
  "phpOnPath": os.environ.get("CHRYS_PHP_OK") == "true",
  "phpVersion": os.environ.get("CHRYS_PHP_LINE", ""),
  "observeHome": os.environ.get("CHRYS_OBSERVE_HOME", ""),
  "suggestedTraceDir": os.environ.get("CHRYS_TRACE_DIR", ""),
  "captureInstructions": os.environ.get("CHRYS_INSTRUCTIONS", ""),
  "observeConfigTemplate": observe_cfg,
  "envHints": os.environ.get("CHRYS_ENV_HINTS", ""),
}))
PY
