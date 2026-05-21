#!/usr/bin/env bash
# Chrysalis origin scan agent — run on the legacy host (local shell or via SSH).
# Prints one JSON object to stdout. No network calls; reads files only.
set -euo pipefail

ROOT="${1:-.}"
AGENT_VERSION="1"
MAX_FILES="${CHRYSALIS_SCAN_MAX_FILES:-8000}"

if ! command -v python3 >/dev/null 2>&1; then
  echo '{"error":"python3 required on origin for chrysalis-origin-scan"}' >&2
  exit 2
fi

export ROOT MAX_FILES AGENT_VERSION
exec python3 - "$ROOT" <<'PY'
import json, os, sys
from datetime import datetime, timezone

root = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else ".")
max_files = int(os.environ.get("MAX_FILES", "8000"))
agent_version = os.environ.get("AGENT_VERSION", "1")

EXT = {
    ".php": "php", ".phtml": "php",
    ".js": "javascript", ".jsx": "javascript", ".mjs": "javascript", ".cjs": "javascript",
    ".ts": "typescript", ".tsx": "typescript",
    ".vue": "vue", ".py": "python", ".java": "java", ".kt": "kotlin", ".go": "go",
    ".rb": "ruby", ".cs": "csharp", ".cpp": "cpp", ".c": "c", ".h": "c",
    ".rs": "rust", ".swift": "swift", ".scala": "scala", ".sql": "sql",
    ".html": "html", ".css": "css", ".scss": "scss",
}
SKIP_DIRS = {"node_modules", ".git", "vendor", ".svn", "__pycache__"}

paths = []
for dirpath, dirnames, filenames in os.walk(root):
    dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
    for name in filenames:
        paths.append(os.path.join(dirpath, name))
        if len(paths) >= max_files:
            break
    if len(paths) >= max_files:
        break

by_lang = {}
for p in paths:
    ext = os.path.splitext(p)[1].lower()
    lang = EXT.get(ext)
    if not lang:
        continue
    cur = by_lang.setdefault(lang, {"language": lang, "fileCount": 0, "sampleFiles": []})
    cur["fileCount"] += 1
    if len(cur["sampleFiles"]) < 8:
        cur["sampleFiles"].append(p)

languages = sorted(by_lang.values(), key=lambda x: (-x["fileCount"], x["language"]))

def read_env_hints(base):
    hints = {}
    env_path = os.path.join(base, ".env")
    if not os.path.isfile(env_path):
        return hints
    try:
        with open(env_path, "r", encoding="utf-8", errors="replace") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, _, v = line.partition("=")
                k = k.strip()
                v = v.strip().strip('"').strip("'")
                kl = k.upper()
                if kl in ("DATABASE_URL", "DB_URL", "MYSQL_URL", "POSTGRES_URL"):
                    hints["database"] = {"via": f"env:{k}", "hint": v[:200]}
                elif kl in ("DB_HOST", "MYSQL_HOST", "DATABASE_HOST"):
                    hints.setdefault("database", {})["host"] = v
                elif kl in ("DB_PORT", "MYSQL_PORT"):
                    hints.setdefault("database", {})["port"] = v
                elif kl in ("REDIS_URL", "REDIS_HOST"):
                    hints["redis"] = {"via": f"env:{k}", "hint": v[:200]}
    except OSError:
        pass
    return hints

services = read_env_hints(root)

out = {
    "scannedAt": datetime.now(timezone.utc).isoformat(),
    "source": "origin-agent",
    "agentVersion": agent_version,
    "pathCount": len(paths),
    "languages": languages,
    "truncated": len(paths) >= max_files,
    "services": services,
}
print(json.dumps(out))
PY
