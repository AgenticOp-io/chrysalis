#!/usr/bin/env bash
set -euo pipefail
cd ~/chrysalis-test
mkdir -p scripts/hub-ingest docs reports/prove
cp /tmp/hub-external-prove-corpus-smoke.mjs scripts/hub-ingest/
cp /tmp/hub-cobol-clbs-prove-smoke.mjs scripts/hub-ingest/
cp /tmp/cobol-pattern-lift.mjs scripts/hub-ingest/
cp /tmp/EXTERNAL-PROVE-CORPORA.md docs/
if ! grep -q 'hub:external-prove-corpus-smoke' package.json; then
  python3 - <<'PY'
import json
from pathlib import Path
p = Path("package.json")
data = json.loads(p.read_text())
data.setdefault("scripts", {})["hub:external-prove-corpus-smoke"] = (
    "node scripts/hub-ingest/hub-external-prove-corpus-smoke.mjs"
)
p.write_text(json.dumps(data, indent=2) + "\n")
print("package.json patched")
PY
fi
ls -d ~/COBOL-Legacy-Benchmark-Suite 2>/dev/null || echo "WARN: CLBS missing"
if [ ! -d "$HOME/legacycodebench/.git" ]; then
  git clone --depth 1 https://github.com/Kalmantic/legacycodebench.git "$HOME/legacycodebench"
else
  echo "legacycodebench already present"
  git -C "$HOME/legacycodebench" pull --ff-only || true
fi
export CHRYSALIS_COBOL_CLBS_ROOT="${CHRYSALIS_COBOL_CLBS_ROOT:-$HOME/COBOL-Legacy-Benchmark-Suite}"
export CHRYSALIS_LEGACYCODEBENCH_ROOT="${CHRYSALIS_LEGACYCODEBENCH_ROOT:-$HOME/legacycodebench}"
echo "roots: CLBS=$CHRYSALIS_COBOL_CLBS_ROOT LCB=$CHRYSALIS_LEGACYCODEBENCH_ROOT"
: > /tmp/external-prove-corpus.out
nohup bash -lc 'cd ~/chrysalis-test && export CHRYSALIS_COBOL_CLBS_ROOT="$HOME/COBOL-Legacy-Benchmark-Suite" CHRYSALIS_LEGACYCODEBENCH_ROOT="$HOME/legacycodebench" && pnpm run hub:external-prove-corpus-smoke >> /tmp/external-prove-corpus.out 2>&1; echo EXIT:$? >> /tmp/external-prove-corpus.out' >/dev/null 2>&1 &
echo "started pid $!"
sleep 3
head -n 40 /tmp/external-prove-corpus.out || true
